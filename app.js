// app.js
document.addEventListener('DOMContentLoaded', () => {
    const app = window.app = window.app || {};

    // Configuración de Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyDlfzg7BsGPKvqi7XLICoWSFU02tfzATew",
        authDomain: "likesparati-2af8a.firebaseapp.com",
        projectId: "likesparati-2af8a",
        storageBucket: "likesparati-2af8a.firebasestorage.app",
        messagingSenderId: "97227020218",
        appId: "1:97227020218:web:8e64d8a325405ea85faf83",
        measurementId: "G-T4KWYCP8QH"
    };

    // Inicializar Firebase
    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();

    // Elementos del DOM
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
        ageVerification: document.getElementById('age-verification'),
        ageYes: document.getElementById('age-yes'),
        ageNo: document.getElementById('age-no'),
        header: document.getElementById('header'),
        mainContent: document.getElementById('main-content'),
        gallery: document.getElementById('gallery'),
        footer: document.querySelector('footer'),
        revokeAge: document.getElementById('revoke-age'),
        loader: document.getElementById('loader'),
        themeToggle: document.getElementById('theme-toggle'),
        filterCount: document.getElementById('filter-count'),
        filterIndicator: document.getElementById('filter-indicator'),
        scrollTopButton: document.getElementById('scroll-top'),
        featuredNotes: document.getElementById('featured-notes'),
        noteBanner: document.getElementById('note-banner'),
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
        noteTitle: document.getElementById('note-title'),
        noteImage: document.getElementById('note-image'),
        noteContent: document.getElementById('note-content'),
        noteEmbed: document.getElementById('note-embed'),
        noteAudio: document.getElementById('note-audio'),
        audioTitle: document.querySelector('.audio-title'),
        playButton: document.querySelector('.custom-play-button'),
        audioPlayer: document.getElementById('plyr-audio'),
        similarNotesGrid: document.getElementById('similar-notes-grid'),
        themesToggle: document.getElementById('themes-toggle'),
        themesMenu: document.getElementById('themes-menu')
    };

    // Configuración global
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

    // Estado global
    app.state = {
        currentPage: 1,
        imagesData: [],
        notesData: [],
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
        likedNotes: new Set(),
        userId: null
    };

    // Utilidades
    app.utils = {
        getLocalStorage: (key) => {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : null;
        },
        setLocalStorage: (key, value) => {
            if (value instanceof Map || value instanceof Set) {
                localStorage.setItem(key, JSON.stringify(Array.from(value.entries())));
            } else {
                localStorage.setItem(key, JSON.stringify(value));
            }
        },
        fetchWithCache: (url, cacheKey, fallbackElement, renderFn, forceRefresh = false) => {
            // Forzar recarga para imagenes.json y agregar timestamp para evitar caché
            let fetchUrl = url;
            const alwaysRefresh = url === 'imagenes.json' || forceRefresh;
            if (url === 'imagenes.json') {
                fetchUrl = `${url}?t=${new Date().getTime()}`; // Añade un timestamp único
            }
            const cacheKeyWithVersion = `${cacheKey}_v1`;
            const cachedData = alwaysRefresh ? null : localStorage.getItem(cacheKeyWithVersion);

            if (cachedData && !alwaysRefresh) {
                const data = JSON.parse(cachedData);
                renderFn(data);
                return Promise.resolve(data);
            }

            app.elements.loader.style.display = 'flex';
            return fetch(fetchUrl, { cache: 'no-store' }) // Evitar caché del navegador
                .then(response => {
                    if (!response.ok) throw new Error('Network response was not ok');
                    return response.json();
                })
                .then(data => {
                    // Solo almacenar en caché si no es imagenes.json o si no se fuerza recarga
                    if (!alwaysRefresh) {
                        localStorage.setItem(cacheKeyWithVersion, JSON.stringify(data));
                    }
                    renderFn(data);
                    return data;
                })
                .catch(error => {
                    console.error(`Error cargando ${fetchUrl}:`, error);
                    if (!cachedData && fallbackElement) {
                        fallbackElement.innerHTML = '<p style="text-align:center;color:#ff5722;">Error al cargar datos. <button onclick="location.reload()">Reintentar</button></p>';
                    }
                })
                .finally(() => app.elements.loader.style.display = 'none');
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
        formatTime: (seconds) => {
            const minutes = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
        },
        loadExternalCSS: (url, callback) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            link.onload = callback;
            document.head.appendChild(link);
        },
        generateUUID: () => {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
    };

    // Módulo de Tema
    app.theme = {
        init: () => {
            const savedTheme = localStorage.getItem('currentTheme') || 'dark';
            app.state.currentTheme = savedTheme;
            app.theme.applyTheme(savedTheme);

            app.elements.themeToggle.addEventListener('click', () => {
                const newTheme = app.state.currentTheme === 'dark' ? 'light' : 'dark';
                app.theme.applyTheme(newTheme);
            });

            if (app.elements.themesToggle && app.elements.themesMenu) {
                app.elements.themesToggle.addEventListener('click', () => {
                    const isVisible = app.elements.themesMenu.style.display === 'block';
                    app.elements.themesMenu.style.display = isVisible ? 'none' : 'block';
                });

                app.elements.themesMenu.addEventListener('click', (e) => {
                    const themeOption = e.target.closest('.theme-option');
                    if (themeOption) {
                        const theme = themeOption.dataset.theme;
                        app.theme.applyTheme(theme);
                        app.elements.themesMenu.style.display = 'none';
                    }
                });

                document.addEventListener('click', (e) => {
                    if (!app.elements.menu.contains(e.target) && app.elements.themesMenu.style.display === 'block') {
                        app.elements.themesMenu.style.display = 'none';
                    }
                });
            }
        },
        applyTheme: (theme) => {
            document.body.classList.remove('dark-theme', 'materialize-theme', 'bootstrap-theme');
            app.state.currentTheme = theme;
            localStorage.setItem('currentTheme', theme);

            switch (theme) {
                case 'dark':
                    document.body.classList.add('dark-theme');
                    app.theme.removeExternalStyles();
                    break;
                case 'materialize':
                    app.theme.loadMaterialize();
                    document.body.classList.add('materialize-theme');
                    break;
                case 'bootstrap':
                    app.theme.loadBootstrap();
                    document.body.classList.add('bootstrap-theme');
                    break;
                default:
                    app.theme.removeExternalStyles();
                    break;
            }

            if (app.imageDetail.updateUtterancesTheme) app.imageDetail.updateUtterancesTheme();
            if (app.note.updateUtterancesTheme) app.note.updateUtterancesTheme();
            if (app.note.updatePlyrTheme) app.note.updatePlyrTheme();
        },
        loadMaterialize: () => {
            const existing = document.querySelector('link[href="https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css"]');
            if (!existing) {
                app.utils.loadExternalCSS('https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css', () => {
                    console.log('Materialize CSS cargado');
                });
            }
        },
        loadBootstrap: () => {
            const existing = document.querySelector('link[href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"]');
            if (!existing) {
                app.utils.loadExternalCSS('https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css', () => {
                    console.log('Bootstrap CSS cargado');
                });
            }
        },
        removeExternalStyles: () => {
            const links = document.querySelectorAll('link[href^="https://cdnjs.cloudflare.com"], link[href^="https://cdn.jsdelivr.net"]');
            links.forEach(link => link.remove());
        }
    };

    // Módulo de Likes
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
            const likedNotes = app.utils.getLocalStorage('likedNotes') || [];
            app.state.likedNotes = new Set(likedNotes);
        },
        toggleLike: (itemId, type = 'image') => {
            const ref = db.ref(`${type === 'note' ? 'noteLikes' : 'likes'}/${itemId}`);
            const userId = app.state.userId;
            const userLiked = (type === 'note' ? app.state.likedNotes : app.state.likedImages).has(itemId);
            const likedSet = type === 'note' ? app.state.likedNotes : app.state.likedImages;

            ref.once('value', (snapshot) => {
                const data = snapshot.val() || { users: {}, count: 0 };
                const users = data.users || {};

                if (userLiked && users[userId]) {
                    ref.transaction((currentData) => {
                        if (!currentData) return { users: {}, count: 0 };
                        delete currentData.users[userId];
                        currentData.count = (currentData.count || 1) - 1;
                        if (currentData.count < 0) currentData.count = 0;
                        return currentData;
                    }).then(() => {
                        likedSet.delete(itemId);
                        app.utils.setLocalStorage(type === 'note' ? 'likedNotes' : 'likedImages', Array.from(likedSet));
                    }).catch(error => console.error(`Error al quitar like ${type}:`, error));
                } else if (!userLiked && !users[userId]) {
                    ref.transaction((currentData) => {
                        if (!currentData) return { users: { [userId]: true }, count: 1 };
                        currentData.users[userId] = true;
                        currentData.count = (currentData.count || 0) + 1;
                        return currentData;
                    }).then(() => {
                        likedSet.add(itemId);
                        app.utils.setLocalStorage(type === 'note' ? 'likedNotes' : 'likedImages', Array.from(likedSet));
                    }).catch(error => console.error(`Error al dar like ${type}:`, error));
                }
            });
        },
        updateLikeUI: (itemId, button, counter, type = 'image') => {
            const ref = db.ref(`${type === 'note' ? 'noteLikes' : 'likes'}/${itemId}`);
            ref.on('value', (snapshot) => {
                const data = snapshot.val() || { users: {}, count: 0 };
                const count = data.count || 0;
                const users = data.users || {};
                counter.textContent = count;
                button.classList.toggle('liked', users[app.state.userId] === true);
                button.disabled = users[app.state.userId] === true;
            }, (error) => {
                console.error(`Error al escuchar cambios en Firebase para ${type}:`, error);
            });
        }
    };

    // Módulo de Verificación de Edad
    app.ageVerification = {
        init: () => {
            if (!app.elements.ageVerification) return;
            if (localStorage.getItem('ageVerified') === 'true') {
                app.ui.showMainContent();
                app.core.startPage();
            } else {
                app.ui.showAgeVerification();
                app.elements.ageYes.addEventListener('click', () => {
                    localStorage.setItem('ageVerified', 'true');
                    app.ui.showMainContent();
                    app.core.startPage();
                });
                app.elements.ageNo.addEventListener('click', () => window.location.href = 'https://m.kiddle.co/');
            }
            app.elements.revokeAge.addEventListener('click', () => {
                localStorage.removeItem('ageVerified');
                app.ui.hideMainContent();
                app.ui.showAgeVerification();
            });
        }
    };

    // Módulo de UI
    app.ui = {
        showMainContent: () => {
            if (app.elements.ageVerification) app.elements.ageVerification.style.display = 'none';
            app.elements.header.style.display = 'block';
            app.elements.mainContent.style.display = 'block';
            if (app.elements.gallery) app.elements.gallery.style.display = 'block';
            if (app.elements.pagination) app.elements.pagination.style.display = 'block';
            app.elements.footer.style.display = 'block';
        },
        hideMainContent: () => {
            app.elements.header.style.display = 'none';
            app.elements.mainContent.style.display = 'none';
            if (app.elements.gallery) app.elements.gallery.style.display = 'none';
            if (app.elements.pagination) app.elements.pagination.style.display = 'none';
            app.elements.footer.style.display = 'none';
        },
        showAgeVerification: () => {
            if (app.elements.ageVerification) {
                app.elements.ageVerification.style.display = 'flex';
                app.elements.ageVerification.classList.add('active');
            }
        },
        updateFilterCount: () => {
            if (!app.elements.filterCount) return;
            if (app.state.isFiltered) {
                app.elements.filterCount.style.display = 'block';
                app.elements.filterCount.textContent = `Mostrando ${Math.min(app.config.itemsPerPage, app.state.filteredItems.length)} de ${app.state.filteredItems.length} imágenes`;
            } else {
                app.elements.filterCount.style.display = 'none';
            }
        },
        updateFilterIndicator: () => {
            if (!app.elements.filterIndicator) return;
            let text = '';
            if (app.state.activeTag && app.state.activeCategory) {
                text = `${app.state.activeCategory.charAt(0).toUpperCase() + app.state.activeCategory.slice(1)} + ${app.state.activeTag}`;
            } else if (app.state.activeTag) {
                text = app.state.activeTag;
            } else if (app.state.activeCategory) {
                text = app.state.activeCategory.charAt(0).toUpperCase() + app.state.activeCategory.slice(1);
            } else if (app.state.isFiltered && app.elements.searchInput && app.elements.searchInput.value) {
                text = `Búsqueda: ${app.elements.searchInput.value}`;
            }
            app.elements.filterIndicator.textContent = text ? `Filtro: ${text}` : '';
        }
    };

    // Módulo Principal
    app.core = {
        startPage: () => {
            const path = window.location.pathname;
            if (path.includes('index.html') || path === '/') {
                app.state.currentPage = parseInt(localStorage.getItem('currentPage') || 1, 10);
                Promise.all([
                    app.utils.fetchWithCache('imagenes.json', 'cachedImages', app.elements.imageGrid, data => {
                        app.state.imagesData = data;
                        app.tags.initTagMap();
                        app.gallery.render();
                        app.tags.generate();
                        app.categories.generate();
                        app.forYou.render();
                        app.topLiked.render();
                        app.filter.restore();
                        app.autocomplete.updateSuggestions();
                    }),
                    app.utils.fetchWithCache('notes.json', 'cachedNotes', app.elements.noteBanner, data => {
                        app.state.notesData = data;
                        app.notes.render();
                    }, true),
                    app.utils.fetchWithCache('tags.json', 'cachedTags', null, data => {
                        app.state.tagRelationships = data.relationships;
                    })
                ]);
            } else if (path.includes('image-detail.html')) {
                app.imageDetail.init();
            } else if (path.includes('note.html')) {
                app.note.init();
            }
        }
    };

    // Módulo de Galería
    app.gallery = {
        render: () => {
            if (!app.elements.imageGrid) return;
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

    // Módulo de Paginación
    app.pagination = {
        render: () => {
            if (!app.elements.pagination) return;
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

    // Módulo de Notas
    app.notes = {
        render: () => {
            if (!app.elements.noteBanner) return;

            // Calcular puntajes basados en preferencias de tags
            const notesWithScores = app.state.notesData.map(note => {
                const score = note.tags.reduce((sum, tag) => {
                    const tagData = app.state.tagMap.get(tag) || { weight: 0, isFavorite: false };
                    return sum + (tagData.weight || 0) + (tagData.isFavorite ? 10 : 0);
                }, 0);
                return { note, score };
            });

            // Seleccionar una nota aleatoriamente con peso basado en el puntaje
            const totalScore = notesWithScores.reduce((sum, item) => sum + item.score, 0);
            let random = Math.random() * totalScore;
            let selectedNote = null;

            for (let item of notesWithScores) {
                random -= item.score;
                if (random <= 0) {
                    selectedNote = item.note;
                    break;
                }
            }
            if (!selectedNote) selectedNote = notesWithScores[Math.floor(Math.random() * notesWithScores.length)].note;

            // Establecer la imagen como fondo del banner
            app.elements.noteBanner.style.backgroundImage = `url(${selectedNote.image})`;
            app.elements.noteBanner.style.backgroundSize = 'cover';
            app.elements.noteBanner.style.backgroundPosition = 'center';

            // Hacer el banner clickeable y mover los likes a la esquina inferior derecha
            app.elements.noteBanner.innerHTML = `
                <a href="note.html?id=${selectedNote.id}" style="display: block; width: 100%; height: 100%; text-decoration: none; position: relative;">
                    <div class="banner-content">
                        <h3>${selectedNote.title}</h3>
                        <p>${selectedNote.content.substring(0, 150) + (selectedNote.content.length > 150 ? '...' : '')}</p>
                    </div>
                    <div class="like-container-banner">
                        <button class="heart-button" data-id="${selectedNote.id}" data-type="note">
                            <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                        </button>
                        <span class="heart-count" data-id="${selectedNote.id}" data-type="note">0</span>
                    </div>
                </a>
            `;

            app.utils.lazyLoadImages(app.elements.noteBanner);

            // Actualizar UI de likes
            const button = app.elements.noteBanner.querySelector('.heart-button');
            const counter = app.elements.noteBanner.querySelector('.heart-count');
            app.likes.updateLikeUI(selectedNote.id, button, counter, 'note');
            button.addEventListener('click', (e) => {
                e.preventDefault(); // Evita que el clic en el botón navegue inmediatamente
                app.likes.toggleLike(selectedNote.id, 'note');
            });
        }
    };

    // Módulo "Para ti"
    app.forYou = {
        render: () => {
            if (!app.elements.forYouGrid || !app.state.imagesData.length) return;

            const viewedIds = app.utils.getLocalStorage('viewedIds') || [];
            const searchHistory = app.utils.getLocalStorage('searchHistory') || [];
            const fragment = document.createDocumentFragment();
            let recommendedItems = [];

            if (app.state.tagMap.size > 0) {
                recommendedItems = app.state.imagesData
                    .filter(item => !viewedIds.includes(item.id.toString()))
                    .map(item => {
                        const score = item.tags.reduce((sum, tag) => {
                            const tagData = app.state.tagMap.get(tag) || { weight: 0, isFavorite: false };
                            return sum + (tagData.weight || 0) + (tagData.isFavorite ? 10 : 0);
                        }, 0);
                        return { item, score };
                    })
                    .sort((a, b) => b.score - a.score)
                    .map(entry => entry.item);
            }

            if (searchHistory.length && recommendedItems.length < 3) {
                const searchWords = [...new Set(searchHistory.flatMap(term => term.toLowerCase().split(/\s+/)))];
                const searchBasedItems = app.state.imagesData
                    .filter(item => !viewedIds.includes(item.id.toString()) && !recommendedItems.some(r => r.id === item.id))
                    .map(item => {
                        const title = item.title.toLowerCase();
                        const description = item.description?.toLowerCase() || '';
                        const tags = item.tags.map(tag => tag.toLowerCase());
                        const matches = searchWords.reduce((count, word) => {
                            return count + (title.includes(word) ? 2 : 0) +
                                   (description.includes(word) ? 1 : 0) +
                                   (tags.some(tag => tag.includes(word)) ? 3 : 0);
                        }, 0);
                        return { item, score: matches };
                    })
                    .filter(entry => entry.score > 0)
                    .sort((a, b) => b.score - a.score)
                    .map(entry => entry.item);
                recommendedItems = [...recommendedItems, ...searchBasedItems];
            }

            if (recommendedItems.length < 3) {
                const remainingItems = app.state.imagesData
                    .filter(item => !viewedIds.includes(item.id.toString()) && !recommendedItems.some(r => r.id === item.id))
                    .map(item => {
                        const score = item.tags.reduce((sum, tag) => {
                            const tagData = app.state.tagMap.get(tag) || { weight: 0, isFavorite: false };
                            return sum + (tagData.weight || 0) + (tagData.isFavorite ? 10 : 0);
                        }, 0);
                        return { item, score };
                    })
                    .sort((a, b) => b.score - a.score || 0.5 - Math.random())
                    .map(entry => entry.item);
                recommendedItems = [...recommendedItems, ...remainingItems];
            }

            recommendedItems.slice(0, 3).forEach((item, index) => {
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

            recommendedItems.slice(0, 3).forEach(item => {
                const button = app.elements.forYouGrid.querySelector(`.heart-button[data-id="${item.id}"]`);
                const counter = app.elements.forYouGrid.querySelector(`.heart-count[data-id="${item.id}"]`);
                app.likes.updateLikeUI(item.id, button, counter);
                button.addEventListener('click', () => app.likes.toggleLike(item.id));
            });
        }
    };

    // Módulo "Lo más gustado"
    app.topLiked = {
        render: () => {
            if (!app.elements.topLikedGrid || !app.state.imagesData.length) return;

            const fragment = document.createDocumentFragment();
            const likesRef = db.ref('likes');

            likesRef.once('value', (snapshot) => {
                const likesData = snapshot.val() || {};
                const imagesWithLikes = app.state.imagesData
                    .map(item => {
                        const likeData = likesData[item.id] || { count: 0 };
                        return { item, count: likeData.count || 0 };
                    })
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
            }).catch(error => {
                console.error("Error al cargar datos de likes desde Firebase:", error);
                app.elements.topLikedGrid.innerHTML = '<p style="text-align:center;color:#ff5722;">Error al cargar lo más gustado.</p>';
            });
        }
    };

    // Módulo de Tags
    app.tags = {
        initTagMap: () => {
            const allTags = [...new Set([...app.state.imagesData.flatMap(item => item.tags), ...app.state.notesData.flatMap(note => note.tags)])];
            const storedTagMap = app.utils.getLocalStorage('tagMap');
            if (storedTagMap) {
                app.state.tagMap = new Map(storedTagMap);
            } else {
                allTags.forEach(tag => {
                    if (!app.state.tagMap.has(tag)) {
                        app.state.tagMap.set(tag, { weight: 0, related: app.state.tagRelationships[tag] || [], isFavorite: false });
                    }
                });
                app.utils.setLocalStorage('tagMap', app.state.tagMap);
            }
        },
        generate: () => {
            if (!app.elements.tagsSection) return;

            const allTags = [...new Set([...app.state.imagesData.flatMap(item => item.tags), ...app.state.notesData.flatMap(note => note.tags)])];
            let topTags = [];

            if (app.state.isFiltered && app.elements.searchInput.value) {
                const searchWords = app.elements.searchInput.value.toLowerCase().split(/\s+/);
                topTags = allTags
                    .filter(tag => searchWords.some(word => tag.toLowerCase().includes(word)))
                    .concat(
                        allTags.filter(tag => 
                            searchWords.some(word => 
                                app.state.tagRelationships[word]?.includes(tag.toLowerCase())
                            )
                        )
                    )
                    .slice(0, 5);
            } else if (app.state.activeTag || app.state.activeCategory) {
                const activeFilter = app.state.activeTag || app.state.activeCategory;
                topTags = allTags
                    .filter(tag => tag === activeFilter || app.state.tagRelationships[activeFilter]?.includes(tag.toLowerCase()))
                    .slice(0, 5);
            } else {
                topTags = [...app.state.tagMap.entries()]
                    .sort((a, b) => (b[1].isFavorite ? 1000 : 0) + b[1].weight - (a[1].isFavorite ? 1000 : 0) - a[1].weight)
                    .slice(0, 5)
                    .map(entry => entry[0]);
            }

            if (topTags.length < 5) {
                const additionalTags = allTags
                    .filter(tag => !topTags.includes(tag))
                    .sort(() => 0.5 - Math.random())
                    .slice(0, 5 - topTags.length);
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

                const star = document.createElement('span');
                star.className = 'favorite-star';
                star.textContent = '★';
                const tagData = app.state.tagMap.get(tag);
                if (tagData && tagData.isFavorite) star.classList.add('favorited');
                star.addEventListener('click', (e) => {
                    e.stopPropagation();
                    app.favorites.toggle(tag);
                    star.classList.toggle('favorited');
                });

                tagButton.appendChild(star);
                app.elements.tagsSection.appendChild(tagButton);
            });
        }
    };

    // Módulo de Favoritos
    app.favorites = {
        toggle: (tag) => {
            const tagData = app.state.tagMap.get(tag) || { weight: 0, related: app.state.tagRelationships[tag] || [], isFavorite: false };
            tagData.isFavorite = !tagData.isFavorite;
            tagData.weight += tagData.isFavorite ? 10 : -10;
            app.state.tagMap.set(tag, tagData);
            app.utils.setLocalStorage('tagMap', app.state.tagMap);
            app.forYou.render();
            app.tags.generate();
        }
    };

    // Módulo de Autocompletado
    app.autocomplete = {
        updateSuggestions: () => {
            if (!app.elements.tagSuggestions || !app.state.imagesData.length) return;

            const allTags = [...new Set([...app.state.imagesData.flatMap(item => item.tags), ...app.state.notesData.flatMap(note => note.tags)])];
            const fragment = document.createDocumentFragment();

            allTags.forEach(tag => {
                const option = document.createElement('option');
                option.value = tag;
                fragment.appendChild(option);

                if (app.state.tagRelationships[tag]) {
                    app.state.tagRelationships[tag].forEach(relatedTag => {
                        if (!allTags.includes(relatedTag)) {
                            const relatedOption = document.createElement('option');
                            relatedOption.value = relatedTag;
                            fragment.appendChild(relatedOption);
                        }
                    });
                }
            });

            app.elements.tagSuggestions.innerHTML = '';
            app.elements.tagSuggestions.appendChild(fragment);
        }
    };

    // Módulo de Categorías
    app.categories = {
        generate: () => {
            if (!app.elements.categories) return;
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

    // Módulo de Filtros
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
            if (!app.elements.imageGrid) return;
            const cacheKey = `${app.state.activeTag || ''}_${app.state.activeCategory || ''}`;
            if (app.state.filterCache.has(cacheKey)) {
                app.state.filteredItems = app.state.filterCache.get(cacheKey);
                app.gallery.render();
                return;
            }

            app.elements.loader.style.display = 'flex';
            app.elements.imageGrid.classList.add('fade');
            setTimeout(() => {
                app.state.filteredItems = app.state.imagesData.filter(item => {
                    const tagMatch = !app.state.activeTag || item.tags.includes(app.state.activeTag);
                    const categoryMatch = !app.state.activeCategory || item.tags.includes(app.state.activeCategory);
                    return tagMatch && categoryMatch;
                });
                app.state.filterCache.set(cacheKey, app.state.filteredItems);
                app.state.isFiltered = app.state.activeTag || app.state.activeCategory;
                app.gallery.render();
                app.elements.resetButton.classList.toggle('active', app.state.isFiltered);
                app.elements.resetTagButton.classList.toggle('active', !!app.state.activeTag);
                app.elements.resetCategoryButton.classList.toggle('active', !!app.state.activeCategory);
                app.elements.imageGrid.classList.remove('fade');
                app.elements.loader.style.display = 'none';
                localStorage.setItem('lastFilter', app.state.activeTag || app.state.activeCategory || '');
                localStorage.setItem('lastFilterType', app.state.activeTag ? 'tag' : app.state.activeCategory ? 'category' : '');
            }, 200);
        },
        bySearch: (searchTerm) => {
            if (!app.elements.imageGrid) return;
            if (!searchTerm) {
                app.filter.reset();
                return;
            }
            app.elements.loader.style.display = 'flex';
            app.elements.imageGrid.classList.add('fade');
            setTimeout(() => {
                if (app.state.activeTagButton) app.state.activeTagButton.classList.remove('active');
                if (app.state.activeCategoryButton) app.state.activeCategoryButton.classList.remove('active');
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
                            return count + (title.includes(word) ? 2 : 0) +
                                   (description.includes(word) ? 1 : 0) +
                                   (tags.some(tag => tag.includes(word)) ? 3 : 0);
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
                app.elements.imageGrid.classList.remove('fade');
                app.elements.loader.style.display = 'none';
                localStorage.setItem('lastFilter', searchTerm);
                localStorage.setItem('lastFilterType', 'search');
                app.ui.updateFilterIndicator();
                app.elements.searchResults.textContent = app.state.filteredItems.length ? `Resultados: ${app.state.filteredItems.length}` : 'No se encontraron imágenes';

                const searchHistory = app.utils.getLocalStorage('searchHistory') || [];
                if (!searchHistory.includes(searchTerm)) {
                    searchHistory.unshift(searchTerm);
                    if (searchHistory.length > 10) searchHistory.pop();
                    app.utils.setLocalStorage('searchHistory', searchHistory);
                }
                searchWords.forEach(word => {
                    const tagData = app.state.tagMap.get(word) || { weight: 0, related: app.state.tagRelationships[word] || [], isFavorite: false };
                    tagData.weight += 3;
                    app.state.tagMap.set(word, tagData);
                });
                app.utils.setLocalStorage('tagMap', app.state.tagMap);

                app.forYou.render();
                app.topLiked.render();
                app.tags.generate();
                app.autocomplete.updateSuggestions();

                if (app.elements.gallery) {
                    app.elements.gallery.scrollIntoView({ behavior: 'smooth' });
                }
            }, 200);
        },
        reset: () => {
            if (!app.elements.imageGrid) return;
            app.elements.loader.style.display = 'flex';
            app.elements.imageGrid.classList.add('fade');
            setTimeout(() => {
                if (app.state.activeTagButton) app.state.activeTagButton.classList.remove('active');
                if (app.state.activeCategoryButton) app.state.activeCategoryButton.classList.remove('active');
                app.state.activeTagButton = null;
                app.state.activeCategoryButton = null;
                app.state.activeTag = null;
                app.state.activeCategory = null;
                app.state.filteredItems = [];
                app.state.isFiltered = false;
                app.state.currentPage = 1;
                app.gallery.render();
                app.elements.imageGrid.classList.remove('fade');
                app.elements.loader.style.display = 'none';
                app.elements.resetButton.classList.remove('active');
                app.elements.resetTagButton.classList.remove('active');
                app.elements.resetCategoryButton.classList.remove('active');
                localStorage.removeItem('lastFilter');
                localStorage.removeItem('lastFilterType');
                if (app.elements.searchInput) app.elements.searchInput.value = '';
                if (app.elements.searchResults) app.elements.searchResults.textContent = '';
                app.tags.generate();
            }, 200);
        },
        resetTag: () => {
            if (app.state.activeTagButton) app.state.activeTagButton.classList.remove('active');
            app.state.activeTagButton = null;
            app.state.activeTag = null;
            app.state.currentPage = 1;
            app.filter.applyCombined();
        },
        resetCategory: () => {
            if (app.state.activeCategoryButton) app.state.activeCategoryButton.classList.remove('active');
            app.state.activeCategoryButton = null;
            app.state.activeCategory = null;
            app.state.currentPage = 1;
            app.filter.applyCombined();
        },
        restore: () => {
            if (!app.elements.searchInput) return;
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

    // Módulo de Detalle de Imagen
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
                    app.imageDetail.loadUtterances(imageId);
                    app.utils.lazyLoadImages(document);

                    const button = app.elements.imageDescription.querySelector(`.heart-button[data-id="${currentItem.id}"]`);
                    const counter = app.elements.imageDescription.querySelector(`.heart-count[data-id="${currentItem.id}"]`);
                    if (button && counter) {
                        app.likes.updateLikeUI(currentItem.id, button, counter);
                        button.addEventListener('click', () => app.likes.toggleLike(currentItem.id));
                    } else {
                        console.error("No se encontraron elementos de 'like' en el DOM");
                    }

                    const viewedIds = app.utils.getLocalStorage('viewedIds') || [];
                    if (!viewedIds.includes(imageId)) {
                        viewedIds.unshift(imageId);
                        if (viewedIds.length > 10) viewedIds.pop();
                        app.utils.setLocalStorage('viewedIds', viewedIds);

                        currentItem.tags.forEach(tag => {
                            const tagData = app.state.tagMap.get(tag) || { weight: 0, related: app.state.tagRelationships[tag] || [], isFavorite: false };
                            tagData.weight += 1;
                            app.state.tagMap.set(tag, tagData);
                        });
                        app.utils.setLocalStorage('tagMap', app.state.tagMap);
                    }

                    let timeSpent = 0;
                    const startTime = Date.now();
                    window.addEventListener('beforeunload', () => {
                        timeSpent = Math.floor((Date.now() - startTime) / 1000);
                        if (timeSpent > 5) {
                            currentItem.tags.forEach(tag => {
                                const tagData = app.state.tagMap.get(tag);
                                tagData.weight += Math.min(timeSpent / 60, 5);
                                app.state.tagMap.set(tag, tagData);
                            });
                            app.utils.setLocalStorage('tagMap', app.state.tagMap);
                        }
                    });
                } else {
                    console.error("Imagen no encontrada para el ID:", imageId);
                    app.elements.imageTitle.textContent = "Imagen no encontrada";
                    app.elements.imageDescription.textContent = "No se encontró la imagen solicitada.";
                    app.elements.fullImage.style.display = 'none';
                }
            })
            .catch(error => {
                console.error("Error al cargar imagenes.json:", error);
                app.elements.imageTitle.textContent = "Error al cargar";
                app.elements.imageDescription.textContent = "Hubo un problema al cargar los datos. Intenta de nuevo más tarde.";
                app.elements.fullImage.style.display = 'none';
            })
            .finally(() => {
                app.elements.loader.style.display = 'none';
            });
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
        },
        loadUtterances: (imageId) => {
            app.elements.utterancesContainer.innerHTML = '';
            const script = document.createElement('script');
            script.src = 'https://utteranc.es/client.js';
            script.setAttribute('repo', 'yossfu/Gesti-n-de-comentarios');
            script.setAttribute('issue-term', `image-${imageId}`);
            script.setAttribute('theme', document.body.classList.contains('dark-theme') ? 'dark-blue' : 'github-light');
            script.setAttribute('crossorigin', 'anonymous');
            script.async = true;
            script.onload = () => app.elements.loader.style.display = 'none';
            app.elements.utterancesContainer.appendChild(script);
        },
        updateUtterancesTheme: () => {
            setTimeout(() => {
                const iframe = app.elements.utterancesContainer.querySelector('iframe');
                if (iframe) {
                    iframe.contentWindow.postMessage({
                        type: 'set-theme',
                        theme: document.body.classList.contains('dark-theme') ? 'dark-blue' : 'github-light'
                    }, 'https://utteranc.es');
                }
            }, 100);
        }
    };

    // Módulo de Nota
    app.note = {
        init: () => {
            if (!window.location.pathname.includes('note.html')) return;
            app.ui.showMainContent();
            const urlParams = new URLSearchParams(window.location.search);
            const noteId = urlParams.get('id') || '1';

            app.elements.loader.style.display = 'flex';
            app.utils.fetchWithCache('notes.json', 'cachedNotes', app.elements.noteTitle, (data) => {
                app.state.notesData = data;
                const currentNote = data.find(note => note.id === parseInt(noteId));
                if (currentNote) {
                    app.elements.noteTitle.textContent = currentNote.title;
                    if (currentNote.image) {
                        app.elements.noteImage.dataset.src = currentNote.image;
                        app.elements.noteImage.alt = currentNote.title;
                        app.elements.noteImage.style.display = 'block';
                    }
                    app.elements.noteContent.textContent = currentNote.content;
                    if (currentNote.embed) {
                        app.elements.noteEmbed.innerHTML = currentNote.embed;
                        app.elements.noteEmbed.style.display = 'block';
                    }
                    if (currentNote.audio) {
                        app.note.setupAudio(currentNote.audio, currentNote.title);
                    }
                    app.note.loadSimilarNotes(currentNote.tags, data, noteId);
                    app.note.loadUtterances(noteId);
                    app.utils.lazyLoadImages();

                    // Añadir likes a la nota en detail
                    app.elements.noteContent.insertAdjacentHTML('afterend', `
                        <div class="like-container">
                            <button class="heart-button" data-id="${currentNote.id}" data-type="note">
                                <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                            </button>
                            <span class="heart-count" data-id="${currentNote.id}" data-type="note">0</span>
                        </div>
                    `);
                    const button = app.elements.noteContent.nextElementSibling.querySelector('.heart-button');
                    const counter = app.elements.noteContent.nextElementSibling.querySelector('.heart-count');
                    app.likes.updateLikeUI(currentNote.id, button, counter, 'note');
                    button.addEventListener('click', () => app.likes.toggleLike(currentNote.id, 'note'));
                } else {
                    console.error(`Nota no encontrada para el ID: ${noteId}`);
                    app.elements.noteTitle.textContent = "Nota no encontrada";
                    app.elements.noteContent.innerHTML = `
                        <p>No se encontró la nota con ID ${noteId}. Puede que no exista o haya un error en la URL.</p>
                        <button onclick="window.location.href='index.html'">Volver al inicio</button>
                    `;
                }
            }).catch(error => {
                console.error("Error al cargar notes.json:", error);
                app.elements.noteTitle.textContent = "Error al cargar la nota";
                app.elements.noteContent.innerHTML = `
                    <p>Hubo un problema al cargar los datos de la nota. Verifica tu conexión o la ubicación de notes.json.</p>
                    <button onclick="location.reload()">Reintentar</button>
                `;
            }).finally(() => {
                app.elements.loader.style.display = 'none';
            });
        },
        setupAudio: (audioUrl, title) => {
            app.elements.noteAudio.style.display = 'block';
            app.elements.audioPlayer.querySelector('source').src = audioUrl;
            app.elements.audioPlayer.load();

            const player = new Plyr('#plyr-audio', {
                controls: ['play', 'progress', 'current-time', 'mute', 'volume'],
                invertTime: false,
                volume: 0.5
            });

            app.elements.audioPlayer.addEventListener('loadedmetadata', () => {
                app.elements.audioTitle.textContent = `${title} (${app.utils.formatTime(app.elements.audioPlayer.duration)})`;
            });

            app.elements.playButton.addEventListener('click', () => player.play());

            player.on('playing', () => {
                app.elements.playButton.classList.add('playing');
                app.elements.playButton.querySelector('.play-icon').style.display = 'none';
                app.elements.playButton.querySelector('.pause-icon').style.display = 'block';
            });
            player.on('pause', () => {
                app.elements.playButton.classList.remove('playing');
                app.elements.playButton.querySelector('.play-icon').style.display = 'block';
                app.elements.playButton.querySelector('.pause-icon').style.display = 'none';
            });

            app.note.updatePlyrTheme();
        },
        loadSimilarNotes: (tags, allNotes, currentNoteId) => {
            if (!app.elements.similarNotesGrid) {
                console.error("Elemento similar-notes-grid no encontrado");
                return;
            }
            const fragment = document.createDocumentFragment();
            const similarNotes = allNotes
                .filter(note => note.id != currentNoteId)
                .filter(note => note.tags && tags && note.tags.some(tag => tags.includes(tag)))
                .sort((a, b) => {
                    const aMatches = a.tags ? a.tags.filter(tag => tags.includes(tag)).length : 0;
                    const bMatches = b.tags ? b.tags.filter(tag => tags.includes(tag)).length : 0;
                    return bMatches - aMatches;
                })
                .slice(0, 4);

            if (similarNotes.length === 0) {
                app.elements.similarNotesGrid.innerHTML = '<p>No hay notas similares disponibles.</p>';
                return;
            }

            similarNotes.forEach(note => {
                const noteElement = document.createElement('div');
                noteElement.className = 'similar-note-item';
                noteElement.innerHTML = `
                    <a href="note.html?id=${note.id}" aria-label="${note.title}">
                        <img data-src="${note.image || 'https://via.placeholder.com/150'}" alt="${note.title}" class="lazy">
                        <h3>${note.title}</h3>
                    </a>
                    <div class="like-container">
                        <button class="heart-button" data-id="${note.id}" data-type="note">
                            <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                        </button>
                        <span class="heart-count" data-id="${note.id}" data-type="note">0</span>
                    </div>
                `;
                fragment.appendChild(noteElement);
            });

            app.elements.similarNotesGrid.innerHTML = '';
            app.elements.similarNotesGrid.appendChild(fragment);
            app.utils.lazyLoadImages(app.elements.similarNotesGrid);

            similarNotes.forEach(note => {
                const button = noteElement.querySelector('.heart-button');
                const counter = noteElement.querySelector('.heart-count');
                app.likes.updateLikeUI(note.id, button, counter, 'note');
                button.addEventListener('click', () => app.likes.toggleLike(note.id, 'note'));
            });
        },
        loadUtterances: (noteId) => {
            if (!app.elements.utterancesContainer) {
                console.error("Elemento utterances-container no encontrado");
                return;
            }
            app.elements.utterancesContainer.innerHTML = '';
            const script = document.createElement('script');
            script.src = 'https://utteranc.es/client.js';
            script.setAttribute('repo', 'yossfu/Gesti-n-de-comentarios');
            script.setAttribute('issue-term', `note-${noteId}`);
            script.setAttribute('theme', document.body.classList.contains('dark-theme') ? 'dark-blue' : 'github-light');
            script.setAttribute('crossorigin', 'anonymous');
            script.async = true;
            script.onload = () => {
                app.elements.loader.style.display = 'none';
                console.log(`Utterances cargado para note-${noteId}`);
            };
            script.onerror = () => console.error("Error al cargar Utterances");
            app.elements.utterancesContainer.appendChild(script);
        },
        updateUtterancesTheme: () => {
            setTimeout(() => {
                const iframe = app.elements.utterancesContainer.querySelector('iframe');
                if (iframe) {
                    iframe.contentWindow.postMessage({
                        type: 'set-theme',
                        theme: document.body.classList.contains('dark-theme') ? 'dark-blue' : 'github-light'
                    }, 'https://utteranc.es');
                }
            }, 100);
        },
        updatePlyrTheme: () => {
            const plyrControls = document.querySelector('.plyr__controls');
            if (plyrControls) {
                plyrControls.style.background = document.body.classList.contains('dark-theme') ? '#b71c1c' : '#d32f2f';
            }
        }
    };

    // Módulo de Eventos
    app.events = {
        init: () => {
            if (app.elements.scrollTopButton) {
                app.elements.scrollTopButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
                window.addEventListener('scroll', () => app.elements.scrollTopButton.classList.toggle('visible', window.scrollY > 200));
            }

            if (app.elements.menuToggle && app.elements.menu && app.elements.menuClose) {
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
                app.elements.menu.querySelectorAll('.tab-button:not(.themes-button)').forEach(link => link.addEventListener('click', () => {
                    app.elements.menu.classList.remove('active');
                    app.elements.menuToggle.classList.remove('open');
                    app.elements.menuToggle.setAttribute('aria-expanded', 'false');
                }));
            }

            if (app.elements.resetButton) app.elements.resetButton.addEventListener('click', app.filter.reset);
            if (app.elements.resetTagButton) app.elements.resetTagButton.addEventListener('click', app.filter.resetTag);
            if (app.elements.resetCategoryButton) app.elements.resetCategoryButton.addEventListener('click', app.filter.resetCategory);

            if (app.elements.tagsSection) {
                app.elements.tagsSection.addEventListener('click', (e) => {
                    const tagButton = e.target.closest('.tag-button');
                    if (tagButton && !e.target.classList.contains('favorite-star')) {
                        app.filter.byTag(tagButton.textContent.split('★')[0].trim(), tagButton);
                        if (app.elements.gallery) app.elements.gallery.scrollIntoView({ behavior: 'smooth' });
                    }
                });
            }

            if (app.elements.categories) {
                app.elements.categories.addEventListener('click', (e) => {
                    const categoryButton = e.target.closest('.category-button');
                    if (categoryButton) {
                        const category = categoryButton.dataset.category;
                        if (category === 'all') app.filter.reset();
                        else app.filter.byCategory(category, categoryButton);
                        if (app.elements.gallery) app.elements.gallery.scrollIntoView({ behavior: 'smooth' });
                    }
                });
            }

            if (app.elements.searchButton) app.elements.searchButton.addEventListener('click', () => app.filter.bySearch(app.elements.searchInput.value));
            if (app.elements.searchInput) app.elements.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') app.filter.bySearch(app.elements.searchInput.value);
            });
            if (app.elements.clearSearch) app.elements.clearSearch.addEventListener('click', () => {
                app.elements.searchInput.value = '';
                app.filter.reset();
            });
            if (app.elements.sortOrder) app.elements.sortOrder.addEventListener('change', () => {
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

                                const item = app.state.imagesData.find(i => i.id.toString() === imageId);
                                if (item) {
                                    item.tags.forEach(tag => {
                                        const tagData = app.state.tagMap.get(tag) || { weight: 0, related: app.state.tagRelationships[tag] || [], isFavorite: false };
                                        tagData.weight += 2;
                                        app.state.tagMap.set(tag, tagData);
                                    });
                                    app.utils.setLocalStorage('tagMap', app.state.tagMap);
                                }
                            }
                        }
                    });
                }
            });

            if (app.elements.chatToggle && app.elements.chatPopup && app.elements.chatClose) {
                let chatLoaded = false;
                const toggleChat = () => {
                    app.elements.chatPopup.style.display = app.elements.chatPopup.style.display === 'flex' ? 'none' : 'flex';
                    if (!chatLoaded && app.elements.chatPopup.style.display === 'flex') {
                        const script = document.createElement('script');
                        script.src = 'https://minnit.chat/js/embed.js?c=1740011833';
                        script.defer = true;
                        script.onload = () => {
                            const chatSpan = document.createElement('span');
                            chatSpan.className = 'minnit-chat-sembed';
                            chatSpan.style.display = 'block';
                            chatSpan.dataset.chatname = 'https://organizations.minnit.chat/862394129979837/Chat?embed';
                            chatSpan.dataset.style = 'width:100%; height:100%; max-height:100%;';
                            chatSpan.textContent = 'Chat';
                            app.elements.chatPopup.querySelector('.chat-content').appendChild(chatSpan);
                        };
                        document.head.appendChild(script);
                        chatLoaded = true;
                    }
                };
                app.elements.chatToggle.addEventListener('click', toggleChat);
                app.elements.chatClose.addEventListener('click', () => app.elements.chatPopup.style.display = 'none');
                document.addEventListener('click', (e) => {
                    if (!app.elements.chatPopup.contains(e.target) && !app.elements.chatToggle.contains(e.target) && app.elements.chatPopup.style.display === 'flex') {
                        app.elements.chatPopup.style.display = 'none';
                    }
                });
            }
        }
    };

    // Inicialización
    app.theme.init();
    app.ageVerification.init();
    app.likes.init();
    app.events.init();
    app.core.startPage();

    // Estilos adicionales
    document.head.insertAdjacentHTML('beforeend', `
        <style>
            .lazy { opacity: 0; transition: opacity 0.3s; }
            .lazy[src] { opacity: 1; }
            .social-icon { width: 30px; height: 30px; transition: transform 0.3s ease; }
            .social-icon:hover { transform: scale(1.1); }
        </style>
    `);
});
