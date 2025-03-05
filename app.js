// app.js
document.addEventListener('DOMContentLoaded', () => {
    const app = window.app = window.app || {};

    const firebaseConfig = {
        apiKey: "AIzaSyDlfzg7BsGPKvqi7XLICoWSFU02tfzATew",
        authDomain: "likesparati-2af8a.firebaseapp.com",
        projectId: "likesparati-2af8a",
        storageBucket: "likesparati-2af8a.firebasestorage.app",
        messagingSenderId: "97227020218",
        appId: "1:97227020218:web:8e64d8a325405ea85faf83",
        measurementId: "G-T4KWYCP8QH"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();

    app.elements = {
        imageGrid: document.getElementById('image-grid'),
        searchInput: document.getElementById('search'),
        searchButton: document.getElementById('search-button'),
        clearSearch: document.getElementById('clear-search'),
        searchResults: document.getElementById('search-results'),
        sortOrder: document.getElementById('sort-order'),
        tagSuggestions: document.getElementById('tag-suggestions'),
        pagination: document.getElementById('pagination'),
        tagsSection: document.getElementById('tags-section'),
        resetButton: document.getElementById('reset-button'),
        resetTagButton: document.getElementById('reset-tag'),
        resetCategoryButton: document.getElementById('reset-category'),
        header: document.getElementById('header'),
        mainContent: document.getElementById('main-content'),
        gallery: document.getElementById('gallery'),
        footer: document.querySelector('footer'),
        loader: document.getElementById('loader'),
        themeToggle: document.getElementById('theme-toggle'),
        filterCount: document.getElementById('filter-count'),
        filterIndicator: document.getElementById('filter-indicator'),
        scrollTopButton: document.getElementById('scroll-top'),
        forYouGrid: document.getElementById('for-you-grid'),
        topLikedGrid: document.getElementById('top-liked-grid'),
        categories: document.getElementById('categories'),
        menuToggle: document.getElementById('menu-toggle'),
        menu: document.getElementById('menu'),
        menuClose: document.getElementById('menu-close'),
        chatToggle: document.getElementById('chat-toggle'),
        chatPopup: document.getElementById('chat-popup'),
        chatClose: document.getElementById('chat-close'),
        imageTitle: document.getElementById('image-title'),
        fullImage: document.getElementById('full-image'),
        imageDescription: document.getElementById('image-description'),
        similarImagesGrid: document.getElementById('similar-images-grid'),
        utterancesContainer: document.getElementById('utterances-container'),
        themesToggle: document.getElementById('themes-toggle'),
        themesMenu: document.getElementById('themes-menu')
    };

    app.config = {
        itemsPerPage: 15,
        tagColors: ['#ef5350', '#f06292', '#e57373', '#ff8a80', '#ffab91', '#ff8a65', '#ff7043', '#ff5722', '#f4511e', '#e64a19'],
        categoryIcons: {
            'all': 'https://cdn-icons-png.flaticon.com/512/1665/1665731.png',
            'furry': 'https://cdn-icons-png.flaticon.com/512/16781/16781787.png',
            'anime': 'https://cdn-icons-png.flaticon.com/512/1881/1881121.png',
            'realismo': 'https://cdn-icons-png.flaticon.com/512/11178/11178222.png',
            'angelical': 'https://cdn-icons-png.flaticon.com/512/10291/10291922.png',
            'evil': 'https://cdn-icons-png.flaticon.com/512/2855/2855658.png'
        }
    };

    app.state = {
        currentPage: 1,
        imagesData: [],
        tagMap: new Map(),
        tagRelationships: {},
        isFiltered: false,
        filteredItems: [],
        activeTagButton: null,
        activeCategoryButton: null,
        activeTag: null,
        activeCategory: null,
        filterCache: new Map(),
        currentTheme: 'dark',
        likedImages: new Set(),
        userId: null
    };

    app.utils = {
        getLocalStorage: (key) => JSON.parse(localStorage.getItem(key)) || null,
        setLocalStorage: (key, value) => localStorage.setItem(key, JSON.stringify(value instanceof Map || value instanceof Set ? Array.from(value.entries()) : value)),
        fetchWithCache: (url, cacheKey, fallbackElement, renderFn) => {
            const fetchUrl = `${url}?t=${new Date().getTime()}`;
            const cacheKeyWithVersion = `${cacheKey}_v1`;
            const lastModifiedKey = `${cacheKey}_lastModified`;
            const cachedData = localStorage.getItem(cacheKeyWithVersion);
            const cachedLastModified = localStorage.getItem(lastModifiedKey);

            const fetchData = () => {
                app.elements.loader.style.display = 'flex';
                return fetch(fetchUrl, { cache: 'no-store' })
                    .then(response => {
                        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                        const lastModified = response.headers.get('Last-Modified') || Date.now().toString();
                        return response.json().then(data => ({ data, lastModified }));
                    })
                    .then(({ data, lastModified }) => {
                        localStorage.setItem(cacheKeyWithVersion, JSON.stringify(data));
                        localStorage.setItem(lastModifiedKey, lastModified);
                        renderFn(data);
                        return data;
                    })
                    .catch(error => {
                        console.error(`Error cargando ${fetchUrl}:`, error);
                        if (cachedData) {
                            renderFn(JSON.parse(cachedData));
                            return JSON.parse(cachedData);
                        }
                        if (fallbackElement) {
                            fallbackElement.innerHTML = '<p style="text-align:center;color:#ff5722;">Error al cargar datos. <button onclick="window.app.core.startPage()">Reintentar</button></p>';
                        }
                        return null;
                    })
                    .finally(() => app.elements.loader.style.display = 'none');
            };

            if (!cachedData) return fetchData();

            return fetch(fetchUrl, { method: 'HEAD' })
                .then(response => {
                    const serverLastModified = response.headers.get('Last-Modified') || Date.now().toString();
                    if (!cachedLastModified || new Date(serverLastModified) > new Date(cachedLastModified)) {
                        return fetchData();
                    }
                    const data = JSON.parse(cachedData);
                    renderFn(data);
                    return data;
                })
                .catch(error => {
                    console.error(`Error verificando cambios en ${fetchUrl}:`, error);
                    const data = JSON.parse(cachedData);
                    renderFn(data);
                    return data;
                });
        },
        debounce: (fn, wait) => {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => fn(...args), wait);
            };
        },
        lazyLoadImages: (container = document) => {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.classList.remove('lazy', 'loading');
                        }
                        observer.unobserve(img);
                    }
                });
            }, { rootMargin: '0px 0px 200px 0px' });
            container.querySelectorAll('.lazy').forEach(img => observer.observe(img));
        },
        generateUUID: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        })
    };

    app.theme = {
        init: () => {
            const savedTheme = localStorage.getItem('currentTheme') || 'dark';
            app.state.currentTheme = savedTheme;
            document.body.classList.add(`${savedTheme}-theme`);
            app.elements.themeToggle.addEventListener('click', () => {
                const newTheme = app.state.currentTheme === 'dark' ? 'light' : 'dark';
                document.body.classList.remove(`${app.state.currentTheme}-theme`);
                document.body.classList.add(`${newTheme}-theme`);
                app.state.currentTheme = newTheme;
                localStorage.setItem('currentTheme', newTheme);
            });
        }
    };

    app.likes = {
        init: () => {
            let userId = localStorage.getItem('userId');
            if (!userId) {
                userId = app.utils.generateUUID();
                localStorage.setItem('userId', userId);
            }
            app.state.userId = userId;
            const likedImages = app.utils.getLocalStorage('likedImages') || [];
            app.state.likedImages = new Set(likedImages);
        },
        toggleLike: (itemId) => {
            const ref = db.ref(`likes/${itemId}`);
            const userId = app.state.userId;
            const userLiked = app.state.likedImages.has(itemId);

            ref.once('value', (snapshot) => {
                const data = snapshot.val() || { users: {}, count: 0 };
                const users = data.users || {};

                if (userLiked && users[userId]) {
                    ref.transaction(currentData => {
                        if (!currentData) return { users: {}, count: 0 };
                        delete currentData.users[userId];
                        currentData.count = (currentData.count || 1) - 1;
                        if (currentData.count < 0) currentData.count = 0;
                        return currentData;
                    }).then(() => {
                        app.state.likedImages.delete(itemId);
                        app.utils.setLocalStorage('likedImages', Array.from(app.state.likedImages));
                    });
                } else if (!userLiked && !users[userId]) {
                    ref.transaction(currentData => {
                        if (!currentData) return { users: { [userId]: true }, count: 1 };
                        currentData.users[userId] = true;
                        currentData.count = (currentData.count || 0) + 1;
                        return currentData;
                    }).then(() => {
                        app.state.likedImages.add(itemId);
                        app.utils.setLocalStorage('likedImages', Array.from(app.state.likedImages));
                    });
                }
            });
        },
        updateLikeUI: (itemId, button, counter) => {
            const ref = db.ref(`likes/${itemId}`);
            ref.on('value', (snapshot) => {
                const data = snapshot.val() || { users: {}, count: 0 };
                counter.textContent = data.count || 0;
                button.classList.toggle('liked', data.users?.[app.state.userId] === true);
            });
        }
    };

    app.ui = {
        showMainContent: () => {
            app.elements.header.style.display = 'block';
            app.elements.mainContent.style.display = 'block';
            if (app.elements.gallery) app.elements.gallery.style.display = 'block';
            if (app.elements.pagination) app.elements.pagination.style.display = 'block';
            app.elements.footer.style.display = 'block';
        },
        updateFilterCount: () => {
            if (app.state.isFiltered) {
                app.elements.filterCount.style.display = 'block';
                app.elements.filterCount.textContent = `Mostrando ${Math.min(app.config.itemsPerPage, app.state.filteredItems.length)} de ${app.state.filteredItems.length} imágenes`;
            } else {
                app.elements.filterCount.style.display = 'none';
            }
        },
        updateFilterIndicator: () => {
            let text = '';
            if (app.state.activeTag && app.state.activeCategory) text = `${app.state.activeCategory.charAt(0).toUpperCase() + app.state.activeCategory.slice(1)} + ${app.state.activeTag}`;
            else if (app.state.activeTag) text = app.state.activeTag;
            else if (app.state.activeCategory) text = app.state.activeCategory.charAt(0).toUpperCase() + app.state.activeCategory.slice(1);
            else if (app.state.isFiltered && app.elements.searchInput?.value) text = `Búsqueda: ${app.elements.searchInput.value}`;
            app.elements.filterIndicator.textContent = text ? `Filtro: ${text}` : '';
        }
    };

    app.core = {
        startPage: () => {
            const path = window.location.pathname;
            app.ui.showMainContent();
            if (path.includes('index.html') || path === '/') {
                app.state.currentPage = parseInt(localStorage.getItem('currentPage') || 1, 10);
                Promise.all([
                    app.utils.fetchWithCache('imagenes.json', 'cachedImages', app.elements.imageGrid, data => {
                        if (data) {
                            app.state.imagesData = data;
                            app.tags.initTagMap();
                            app.gallery.render();
                            app.tags.generate();
                            app.categories.generate();
                            app.forYou.render();
                            app.topLiked.render();
                            app.filter.restore();
                            app.autocomplete.updateSuggestions();
                        }
                    }),
                    app.utils.fetchWithCache('tags.json', 'cachedTags', null, data => {
                        if (data) app.state.tagRelationships = data.relationships;
                    })
                ]).catch(error => console.error('Error crítico en la carga de datos:', error));
            } else if (path.includes('image-detail.html')) {
                app.imageDetail.init();
            }
        }
    };

    app.gallery = {
        render: () => {
            const startIndex = (app.state.currentPage - 1) * app.config.itemsPerPage;
            const endIndex = Math.min(startIndex + app.config.itemsPerPage, app.state.isFiltered ? app.state.filteredItems.length : app.state.imagesData.length);
            const itemsToRender = app.state.isFiltered ? app.state.filteredItems : app.state.imagesData;
            const newItems = itemsToRender.slice(startIndex, endIndex);

            const fragment = document.createDocumentFragment();
            newItems.forEach((item, index) => {
                const imageWrapper = document.createElement('div');
                imageWrapper.className = 'image-wrapper';
                imageWrapper.innerHTML = `
                    <div class="flex-item" style="animation-delay: ${index * 0.05}s;">
                        <a href="image-detail.html?id=${item.id}" aria-label="${item.title}" data-id="${item.id}">
                            <img data-src="${item.url}" alt="${item.title}" class="lazy loading">
                        </a>
                        <p>${item.title}</p>
                    </div>
                    <div class="like-container">
                        <button class="heart-button" data-id="${item.id}">
                            <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                        </button>
                        <span class="heart-count" data-id="${item.id}">0</span>
                    </div>
                `;
                fragment.appendChild(imageWrapper);
            });

            app.elements.imageGrid.innerHTML = '';
            app.elements.imageGrid.appendChild(fragment);
            app.utils.lazyLoadImages(app.elements.imageGrid);
            app.pagination.render();
            app.ui.updateFilterCount();
            app.ui.updateFilterIndicator();
            localStorage.setItem('currentPage', app.state.currentPage);

            newItems.forEach(item => {
                const button = app.elements.imageGrid.querySelector(`.heart-button[data-id="${item.id}"]`);
                const counter = app.elements.imageGrid.querySelector(`.heart-count[data-id="${item.id}"]`);
                app.likes.updateLikeUI(item.id, button, counter);
                button.addEventListener('click', () => app.likes.toggleLike(item.id));
            });
        }
    };

    app.pagination = {
        render: () => {
            const totalItems = app.state.isFiltered ? app.state.filteredItems.length : app.state.imagesData.length;
            const totalPages = Math.ceil(totalItems / app.config.itemsPerPage);
            const fragment = document.createDocumentFragment();

            for (let i = 1; i <= totalPages; i++) {
                const button = document.createElement('button');
                button.textContent = i;
                button.disabled = i === app.state.currentPage;
                button.addEventListener('click', () => {
                    app.state.currentPage = i;
                    app.gallery.render();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });
                fragment.appendChild(button);
            }
            app.elements.pagination.innerHTML = '';
            app.elements.pagination.appendChild(fragment);
        }
    };

    app.forYou = {
        render: () => {
            if (!app.state.imagesData.length) return;
            const viewedIds = app.utils.getLocalStorage('viewedIds') || [];
            const fragment = document.createDocumentFragment();
            const recommendedItems = app.state.imagesData
                .filter(item => !viewedIds.includes(item.id.toString()))
                .sort(() => 0.5 - Math.random())
                .slice(0, 3);

            recommendedItems.forEach((item, index) => {
                const recommendedItem = document.createElement('div');
                recommendedItem.className = 'image-wrapper';
                recommendedItem.innerHTML = `
                    <div class="flex-item" style="animation-delay: ${index * 0.05}s;">
                        <a href="image-detail.html?id=${item.id}" aria-label="${item.title}" data-id="${item.id}">
                            <img data-src="${item.url}" alt="${item.title}" class="lazy loading">
                        </a>
                        <p>${item.title}</p>
                    </div>
                    <div class="like-container">
                        <button class="heart-button" data-id="${item.id}">
                            <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                        </button>
                        <span class="heart-count" data-id="${item.id}">0</span>
                    </div>
                `;
                fragment.appendChild(recommendedItem);
            });

            app.elements.forYouGrid.innerHTML = '';
            app.elements.forYouGrid.appendChild(fragment);
            app.utils.lazyLoadImages(app.elements.forYouGrid);

            recommendedItems.forEach(item => {
                const button = app.elements.forYouGrid.querySelector(`.heart-button[data-id="${item.id}"]`);
                const counter = app.elements.forYouGrid.querySelector(`.heart-count[data-id="${item.id}"]`);
                app.likes.updateLikeUI(item.id, button, counter);
                button.addEventListener('click', () => app.likes.toggleLike(item.id));
            });
        }
    };

    app.topLiked = {
        render: () => {
            if (!app.state.imagesData.length) return;
            const fragment = document.createDocumentFragment();
            const likesRef = db.ref('likes');

            likesRef.once('value', (snapshot) => {
                const likesData = snapshot.val() || {};
                const imagesWithLikes = app.state.imagesData
                    .map(item => ({ item, count: likesData[item.id]?.count || 0 }))
                    .sort((a, b) => b.count - a.count || 0.5 - Math.random())
                    .slice(0, 3);

                imagesWithLikes.forEach((entry, index) => {
                    const item = entry.item;
                    const topLikedItem = document.createElement('div');
                    topLikedItem.className = 'image-wrapper';
                    topLikedItem.innerHTML = `
                        <div class="flex-item" style="animation-delay: ${index * 0.05}s;">
                            <a href="image-detail.html?id=${item.id}" aria-label="${item.title}" data-id="${item.id}">
                                <img data-src="${item.url}" alt="${item.title}" class="lazy loading">
                            </a>
                            <p>${item.title}</p>
                        </div>
                        <div class="like-container">
                            <button class="heart-button" data-id="${item.id}">
                                <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                            </button>
                            <span class="heart-count" data-id="${item.id}">0</span>
                        </div>
                    `;
                    fragment.appendChild(topLikedItem);
                });

                app.elements.topLikedGrid.innerHTML = '';
                app.elements.topLikedGrid.appendChild(fragment);
                app.utils.lazyLoadImages(app.elements.topLikedGrid);

                imagesWithLikes.forEach(entry => {
                    const item = entry.item;
                    const button = app.elements.topLikedGrid.querySelector(`.heart-button[data-id="${item.id}"]`);
                    const counter = app.elements.topLikedGrid.querySelector(`.heart-count[data-id="${item.id}"]`);
                    app.likes.updateLikeUI(item.id, button, counter);
                    button.addEventListener('click', () => app.likes.toggleLike(item.id));
                });
            });
        }
    };

    app.tags = {
        initTagMap: () => {
            const allTags = [...new Set(app.state.imagesData.flatMap(item => item.tags))];
            const storedTagMap = app.utils.getLocalStorage('tagMap') || new Map();
            app.state.tagMap = new Map(storedTagMap);
            allTags.forEach(tag => {
                if (!app.state.tagMap.has(tag)) {
                    app.state.tagMap.set(tag, { weight: 0, related: app.state.tagRelationships[tag] || [], isFavorite: false });
                }
            });
            app.utils.setLocalStorage('tagMap', app.state.tagMap);
        },
        generate: () => {
            const allTags = [...new Set(app.state.imagesData.flatMap(item => item.tags))];
            let topTags = [...app.state.tagMap.entries()]
                .sort((a, b) => (b[1].isFavorite ? 1000 : 0) + b[1].weight - (a[1].isFavorite ? 1000 : 0) - a[1].weight)
                .slice(0, 5)
                .map(entry => entry[0]);

            if (topTags.length < 5) {
                const additionalTags = allTags.filter(tag => !topTags.includes(tag)).sort(() => 0.5 - Math.random()).slice(0, 5 - topTags.length);
                topTags = [...topTags, ...additionalTags];
            }

            app.elements.tagsSection.innerHTML = '';
            app.elements.tagsSection.appendChild(app.elements.resetButton);
            app.elements.tagsSection.appendChild(app.elements.resetTagButton);
            app.elements.tagsSection.appendChild(app.elements.resetCategoryButton);

            topTags.forEach(tag => {
                const tagButton = document.createElement('button');
                tagButton.className = 'tag-button';
                tagButton.textContent = tag;
                tagButton.style.backgroundColor = app.config.tagColors[Math.floor(Math.random() * app.config.tagColors.length)];
                app.elements.tagsSection.appendChild(tagButton);
            });
        }
    };

    app.categories = {
        generate: () => {
            app.elements.categories.innerHTML = '';
            Object.keys(app.config.categoryIcons).forEach((category, index) => {
                const button = document.createElement('button');
                button.className = 'category-button';
                button.dataset.category = category;
                button.innerHTML = `
                    <img data-src="${app.config.categoryIcons[category]}" alt="${category}" class="lazy">
                    <span>${category.charAt(0).toUpperCase() + category.slice(1)}</span>
                `;
                button.style.animationDelay = `${index * 0.1}s`;
                app.elements.categories.appendChild(button);
            });
            app.utils.lazyLoadImages(app.elements.categories);
        }
    };

    app.filter = {
        byTag: (tag, button) => {
            if (app.state.activeTagButton) app.state.activeTagButton.classList.remove('active');
            button.classList.add('active');
            app.state.activeTagButton = button;
            app.state.activeTag = tag;
            app.state.currentPage = 1;
            app.filter.applyCombined();
            app.tags.generate();
        },
        byCategory: (category, button) => {
            if (app.state.activeCategoryButton) app.state.activeCategoryButton.classList.remove('active');
            button.classList.add('active');
            app.state.activeCategoryButton = button;
            app.state.activeCategory = category === 'all' ? null : category;
            app.state.currentPage = 1;
            app.filter.applyCombined();
            app.tags.generate();
        },
        applyCombined: () => {
            const cacheKey = `${app.state.activeTag || ''}_${app.state.activeCategory || ''}`;
            if (app.state.filterCache.has(cacheKey)) {
                app.state.filteredItems = app.state.filterCache.get(cacheKey);
            } else {
                app.state.filteredItems = app.state.imagesData.filter(item => {
                    const tagMatch = !app.state.activeTag || item.tags.includes(app.state.activeTag);
                    const categoryMatch = !app.state.activeCategory || item.tags.includes(app.state.activeCategory);
                    return tagMatch && categoryMatch;
                });
                app.state.filterCache.set(cacheKey, app.state.filteredItems);
            }
            app.state.isFiltered = app.state.activeTag || app.state.activeCategory;
            app.gallery.render();
            app.elements.resetButton.classList.toggle('active', app.state.isFiltered);
            app.elements.resetTagButton.classList.toggle('active', !!app.state.activeTag);
            app.elements.resetCategoryButton.classList.toggle('active', !!app.state.activeCategory);
            localStorage.setItem('lastFilter', app.state.activeTag || app.state.activeCategory || '');
            localStorage.setItem('lastFilterType', app.state.activeTag ? 'tag' : app.state.activeCategory ? 'category' : '');
        },
        bySearch: (searchTerm) => {
            if (!searchTerm) return app.filter.reset();
            app.state.activeTagButton?.classList.remove('active');
            app.state.activeCategoryButton?.classList.remove('active');
            app.state.activeTagButton = null;
            app.state.activeCategoryButton = null;
            app.state.activeTag = null;
            app.state.activeCategory = null;

            const searchWords = searchTerm.toLowerCase().trim().split(/\s+/);
            app.state.filteredItems = app.state.imagesData
                .map(item => {
                    const title = item.title.toLowerCase();
                    const description = item.description?.toLowerCase() || '';
                    const tags = item.tags.map(tag => tag.toLowerCase());
                    const matches = searchWords.reduce((count, word) => {
                        return count + (title.includes(word) ? 2 : 0) + (description.includes(word) ? 1 : 0) + (tags.some(tag => tag.includes(word)) ? 3 : 0);
                    }, 0);
                    return { item, matches };
                })
                .filter(entry => entry.matches > 0)
                .sort((a, b) => app.elements.sortOrder.value === 'title' ? a.item.title.localeCompare(b.item.title) : b.matches - a.matches)
                .map(entry => entry.item);

            app.state.isFiltered = true;
            app.state.currentPage = 1;
            app.gallery.render();
            app.elements.resetButton.classList.add('active');
            app.elements.resetTagButton.classList.remove('active');
            app.elements.resetCategoryButton.classList.remove('active');
            localStorage.setItem('lastFilter', searchTerm);
            localStorage.setItem('lastFilterType', 'search');
            app.ui.updateFilterIndicator();
            app.elements.searchResults.textContent = app.state.filteredItems.length ? `Resultados: ${app.state.filteredItems.length}` : 'No se encontraron imágenes';
        },
        reset: () => {
            app.state.activeTagButton?.classList.remove('active');
            app.state.activeCategoryButton?.classList.remove('active');
            app.state.activeTagButton = null;
            app.state.activeCategoryButton = null;
            app.state.activeTag = null;
            app.state.activeCategory = null;
            app.state.filteredItems = [];
            app.state.isFiltered = false;
            app.state.currentPage = 1;
            app.gallery.render();
            app.elements.resetButton.classList.remove('active');
            app.elements.resetTagButton.classList.remove('active');
            app.elements.resetCategoryButton.classList.remove('active');
            localStorage.removeItem('lastFilter');
            localStorage.removeItem('lastFilterType');
            app.elements.searchInput.value = '';
            app.elements.searchResults.textContent = '';
            app.tags.generate();
        },
        resetTag: () => {
            app.state.activeTagButton?.classList.remove('active');
            app.state.activeTagButton = null;
            app.state.activeTag = null;
            app.state.currentPage = 1;
            app.filter.applyCombined();
        },
        resetCategory: () => {
            app.state.activeCategoryButton?.classList.remove('active');
            app.state.activeCategoryButton = null;
            app.state.activeCategory = null;
            app.state.currentPage = 1;
            app.filter.applyCombined();
        },
        restore: () => {
            const lastFilter = localStorage.getItem('lastFilter');
            const lastFilterType = localStorage.getItem('lastFilterType');
            if (lastFilter) {
                if (lastFilterType === 'search') {
                    app.elements.searchInput.value = lastFilter;
                    app.filter.bySearch(lastFilter);
                } else if (lastFilterType === 'tag') {
                    const tagButton = Array.from(app.elements.tagsSection.querySelectorAll('.tag-button')).find(btn => btn.textContent === lastFilter);
                    if (tagButton) app.filter.byTag(lastFilter, tagButton);
                } else if (lastFilterType === 'category') {
                    const categoryButton = Array.from(app.elements.categories.querySelectorAll('.category-button')).find(btn => btn.dataset.category === lastFilter);
                    if (categoryButton) app.filter.byCategory(lastFilter, categoryButton);
                }
            }
        }
    };

    app.autocomplete = {
        updateSuggestions: () => {
            const allTags = [...new Set(app.state.imagesData.flatMap(item => item.tags))];
            const fragment = document.createDocumentFragment();
            allTags.forEach(tag => {
                const option = document.createElement('option');
                option.value = tag;
                fragment.appendChild(option);
            });
            app.elements.tagSuggestions.innerHTML = '';
            app.elements.tagSuggestions.appendChild(fragment);
        }
    };

    app.imageDetail = {
        init: () => {
            if (!window.location.pathname.includes('image-detail.html')) return;
            app.ui.showMainContent();
            const urlParams = new URLSearchParams(window.location.search);
            const imageId = urlParams.get('id') || '62';

            app.elements.loader.style.display = 'flex';
            app.utils.fetchWithCache('imagenes.json', 'cachedImages', app.elements.imageTitle, (data) => {
                app.state.imagesData = data;
                const currentItem = data.find(img => img.id.toString() === imageId.toString());
                if (currentItem) {
                    app.elements.imageTitle.textContent = currentItem.title;
                    app.elements.fullImage.src = currentItem.url;
                    app.elements.fullImage.alt = currentItem.title;
                    app.elements.imageDescription.innerHTML = `
                        <p>${currentItem.description || 'Sin descripción disponible'}</p>
                        <div class="like-container">
                            <button class="heart-button" data-id="${currentItem.id}">
                                <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                            </button>
                            <span class="heart-count" data-id="${currentItem.id}">0</span>
                        </div>
                    `;
                    app.imageDetail.loadSimilarImages(currentItem.tags, data);
                    app.utils.lazyLoadImages(document);

                    const button = app.elements.imageDescription.querySelector(`.heart-button[data-id="${currentItem.id}"]`);
                    const counter = app.elements.imageDescription.querySelector(`.heart-count[data-id="${currentItem.id}"]`);
                    app.likes.updateLikeUI(currentItem.id, button, counter);
                    button.addEventListener('click', () => app.likes.toggleLike(currentItem.id));
                } else {
                    app.elements.imageTitle.textContent = "Imagen no encontrada";
                    app.elements.imageDescription.textContent = "No se encontró la imagen solicitada.";
                    app.elements.fullImage.style.display = 'none';
                }
            }).finally(() => app.elements.loader.style.display = 'none');
        },
        loadSimilarImages: (tags, allImages) => {
            const fragment = document.createDocumentFragment();
            const similarImages = allImages
                .filter(item => item.id.toString() !== new URLSearchParams(window.location.search).get('id') && item.tags.some(tag => tags.includes(tag)))
                .sort((a, b) => b.tags.filter(tag => tags.includes(tag)).length - a.tags.filter(tag => tags.includes(tag)).length)
                .slice(0, 6);

            similarImages.forEach(item => {
                const imageElement = document.createElement('div');
                imageElement.className = 'image-wrapper';
                imageElement.innerHTML = `
                    <div class="similar-note-item">
                        <a href="image-detail.html?id=${item.id}" aria-label="${item.title}" data-id="${item.id}">
                            <div style="position: relative;">
                                <img data-src="${item.url}" alt="${item.title}" class="lazy">
                                <div class="watermark">@exeneqiel</div>
                            </div>
                            <h3>${item.title}</h3>
                        </a>
                    </div>
                    <div class="like-container">
                        <button class="heart-button" data-id="${item.id}">
                            <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                        </button>
                        <span class="heart-count" data-id="${item.id}">0</span>
                    </div>
                `;
                fragment.appendChild(imageElement);
            });

            app.elements.similarImagesGrid.innerHTML = '';
            app.elements.similarImagesGrid.appendChild(fragment);
            app.utils.lazyLoadImages(app.elements.similarImagesGrid);

            similarImages.forEach(item => {
                const button = app.elements.similarImagesGrid.querySelector(`.heart-button[data-id="${item.id}"]`);
                const counter = app.elements.similarImagesGrid.querySelector(`.heart-count[data-id="${item.id}"]`);
                app.likes.updateLikeUI(item.id, button, counter);
                button.addEventListener('click', () => app.likes.toggleLike(item.id));
            });
        }
    };

    app.events = {
        init: () => {
            app.elements.scrollTopButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
            window.addEventListener('scroll', () => app.elements.scrollTopButton.classList.toggle('visible', window.scrollY > 200));

            app.elements.menuToggle.addEventListener('click', () => {
                app.elements.menu.classList.toggle('active');
                app.elements.menuToggle.classList.toggle('open');
                app.elements.menuToggle.setAttribute('aria-expanded', app.elements.menu.classList.contains('active'));
            });
            app.elements.menuClose.addEventListener('click', () => {
                app.elements.menu.classList.remove('active');
                app.elements.menuToggle.classList.remove('open');
                app.elements.menuToggle.setAttribute('aria-expanded', 'false');
            });
            document.addEventListener('click', (e) => {
                if (!app.elements.menu.contains(e.target) && !app.elements.menuToggle.contains(e.target) && app.elements.menu.classList.contains('active')) {
                    app.elements.menu.classList.remove('active');
                    app.elements.menuToggle.classList.remove('open');
                    app.elements.menuToggle.setAttribute('aria-expanded', 'false');
                }
            });

            app.elements.resetButton.addEventListener('click', app.filter.reset);
            app.elements.resetTagButton.addEventListener('click', app.filter.resetTag);
            app.elements.resetCategoryButton.addEventListener('click', app.filter.resetCategory);

            app.elements.tagsSection.addEventListener('click', (e) => {
                const tagButton = e.target.closest('.tag-button');
                if (tagButton) app.filter.byTag(tagButton.textContent, tagButton);
            });

            app.elements.categories.addEventListener('click', (e) => {
                const categoryButton = e.target.closest('.category-button');
                if (categoryButton) {
                    const category = categoryButton.dataset.category;
                    if (category === 'all') app.filter.reset();
                    else app.filter.byCategory(category, categoryButton);
                }
            });

            app.elements.searchButton.addEventListener('click', () => app.filter.bySearch(app.elements.searchInput.value));
            app.elements.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') app.filter.bySearch(app.elements.searchInput.value);
            });
            app.elements.clearSearch.addEventListener('click', () => {
                app.elements.searchInput.value = '';
                app.filter.reset();
            });
            app.elements.sortOrder.addEventListener('change', () => {
                if (app.elements.searchInput.value) app.filter.bySearch(app.elements.searchInput.value);
            });

            ['imageGrid', 'forYouGrid', 'topLikedGrid', 'similarImagesGrid'].forEach(gridId => {
                const grid = app.elements[gridId];
                if (grid) {
                    grid.addEventListener('click', (e) => {
                        const link = e.target.closest('a[data-id]');
                        if (link) {
                            const imageId = link.dataset.id;
                            const viewedIds = app.utils.getLocalStorage('viewedIds') || [];
                            if (!viewedIds.includes(imageId)) {
                                viewedIds.unshift(imageId);
                                if (viewedIds.length > 10) viewedIds.pop();
                                app.utils.setLocalStorage('viewedIds', viewedIds);
                            }
                        }
                    });
                }
            });
        }
    };

    app.theme.init();
    app.likes.init();
    app.events.init();
    app.core.startPage();
});