// app.js
document.addEventListener('DOMContentLoaded', () => {
    const app = window.app = window.app || {};

    // Elementos del DOM
    app.elements = {
        imageGrid: document.getElementById('image-grid'),
        searchInput: document.getElementById('search'),
        searchButton: document.getElementById('search-button'),
        clearSearch: document.getElementById('clear-search'),
        searchResults: document.getElementById('search-results'),
        sortOrder: document.getElementById('sort-order'),
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
        notesSlider: document.getElementById('notes-slider'),
        forYouGrid: document.getElementById('for-you-grid'),
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
        similarNotesGrid: document.getElementById('similar-notes-grid')
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
        isFiltered: false,
        filteredItems: [],
        activeTagButton: null,
        activeCategoryButton: null,
        activeTag: null,
        activeCategory: null,
        filterCache: new Map()
    };

    // Utilidades
    app.utils = {
        getLocalStorage: (key) => {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : null;
        },
        setLocalStorage: (key, value) => {
            localStorage.setItem(key, JSON.stringify(value));
        },
        fetchWithCache: (url, cacheKey, fallbackElement, renderFn, forceRefresh = false) => {
            const cacheKeyWithVersion = `${cacheKey}_v1`;
            const cachedData = localStorage.getItem(cacheKeyWithVersion);
            if (cachedData && !forceRefresh) {
                const data = JSON.parse(cachedData);
                renderFn(data);
                return Promise.resolve(data);
            }
            app.elements.loader.style.display = 'flex';
            return fetch(url)
                .then(response => response.json())
                .then(data => {
                    localStorage.setItem(cacheKeyWithVersion, JSON.stringify(data));
                    renderFn(data);
                    return data;
                })
                .catch(error => {
                    console.error(`Error cargando ${url}:`, error);
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
        }
    };

    // Módulo de Tema
    app.theme = {
        init: () => {
            if (localStorage.getItem('darkTheme') === 'true') document.body.classList.add('dark-theme');
            app.elements.themeToggle.addEventListener('click', () => {
                document.body.classList.toggle('dark-theme');
                localStorage.setItem('darkTheme', document.body.classList.contains('dark-theme'));
                if (app.imageDetail.updateUtterancesTheme) app.imageDetail.updateUtterancesTheme();
                if (app.note.updateUtterancesTheme) app.note.updateUtterancesTheme();
                if (app.note.updatePlyrTheme) app.note.updatePlyrTheme();
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
                        app.gallery.render();
                        app.tags.generate();
                        app.categories.generate();
                        app.forYou.render();
                        app.filter.restore();
                    }),
                    app.utils.fetchWithCache('notes.json', 'cachedNotes', app.elements.notesSlider, data => {
                        app.state.notesData = data;
                        app.notes.render();
                    }, true)
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
                const imageItem = document.createElement('div');
                imageItem.className = 'flex-item';
                imageItem.style.animationDelay = `${index * 0.05}s`;
                imageItem.innerHTML = `
                    <a href="image-detail.html?id=${item.id}" aria-label="${item.title}" data-id="${item.id}">
                        <img data-src="${item.url}" alt="${item.title}" class="lazy loading">
                    </a>
                    <p>${item.title}</p>
                `;
                fragment.appendChild(imageItem);
            });

            app.elements.imageGrid.innerHTML = '';
            app.elements.imageGrid.appendChild(fragment);
            app.utils.lazyLoadImages(app.elements.imageGrid);
            app.pagination.render();
            app.ui.updateFilterCount();
            app.ui.updateFilterIndicator();
            localStorage.setItem('currentPage', app.state.currentPage);
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
            if (!app.elements.notesSlider) return;
            const fragment = document.createDocumentFragment();
            const shuffledNotes = [...app.state.notesData].sort(() => 0.5 - Math.random());
            shuffledNotes.forEach(note => {
                const card = document.createElement('a');
                card.className = 'featured-card';
                card.href = `note.html?id=${note.id}`;
                card.innerHTML = `
                    <img data-src="${note.image}" alt="${note.title}" class="lazy">
                    <h3>${note.title}</h3>
                    <p>${note.summary || note.content.substring(0, 100) + '...'}</p>
                `;
                fragment.appendChild(card);
            });
            app.elements.notesSlider.innerHTML = '';
            app.elements.notesSlider.appendChild(fragment);
            app.utils.lazyLoadImages(app.elements.notesSlider);
        }
    };

    // Módulo "Para ti" (Recomendaciones personalizadas con peso de intereses y interacción avanzada)
    app.forYou = {
        render: () => {
            if (!app.elements.forYouGrid || !app.state.imagesData.length) return;

            const viewedIds = app.utils.getLocalStorage('viewedIds') || [];
            const searchHistory = app.utils.getLocalStorage('searchHistory') || [];
            const tagWeights = app.utils.getLocalStorage('tagWeights') || {};
            const fragment = document.createDocumentFragment();
            let recommendedItems = [];

            // Calcular pesos de tags desde imágenes vistas
            if (viewedIds.length) {
                const viewedImages = app.state.imagesData.filter(item => viewedIds.includes(item.id.toString()));
                viewedImages.forEach(item => {
                    item.tags.forEach(tag => {
                        tagWeights[tag] = (tagWeights[tag] || 0) + 1; // Incrementar peso por vista
                    });
                });
                recommendedItems = app.state.imagesData
                    .filter(item => !viewedIds.includes(item.id.toString()))
                    .map(item => {
                        const score = item.tags.reduce((sum, tag) => sum + (tagWeights[tag] || 0), 0);
                        return { item, score };
                    })
                    .sort((a, b) => b.score - a.score)
                    .map(entry => entry.item);
            }

            // Si hay búsquedas, añadir imágenes relacionadas con palabras buscadas
            if (searchHistory.length && recommendedItems.length < 6) {
                const searchWords = [...new Set(searchHistory.flatMap(term => term.toLowerCase().split(/\s+/)))];
                const searchBasedItems = app.state.imagesData
                    .filter(item => !viewedIds.includes(item.id.toString()) && !recommendedItems.some(r => r.id === item.id))
                    .map(item => {
                        const title = item.title.toLowerCase();
                        const description = item.description?.toLowerCase() || '';
                        const tags = item.tags.map(tag => tag.toLowerCase());
                        const matches = searchWords.reduce((count, word) => {
                            return count + (title.includes(word) ? 2 : 0) + // Mayor peso por título
                                   (description.includes(word) ? 1 : 0) +
                                   (tags.some(tag => tag.includes(word)) ? 3 : 0); // Mayor peso por tags
                        }, 0);
                        return { item, score: matches };
                    })
                    .filter(entry => entry.score > 0)
                    .sort((a, b) => b.score - a.score)
                    .map(entry => entry.item);
                recommendedItems = [...recommendedItems, ...searchBasedItems];
            }

            // Si hay menos de 6 items, añadir aleatorios no vistos con peso básico
            if (recommendedItems.length < 6) {
                const remainingItems = app.state.imagesData
                    .filter(item => !viewedIds.includes(item.id.toString()) && !recommendedItems.some(r => r.id === item.id))
                    .map(item => {
                        const score = item.tags.reduce((sum, tag) => sum + (tagWeights[tag] || 0), 0);
                        return { item, score };
                    })
                    .sort((a, b) => b.score - a.score || 0.5 - Math.random()) // Ordenar por peso, desempatar aleatoriamente
                    .map(entry => entry.item);
                recommendedItems = [...recommendedItems, ...remainingItems];
            }

            recommendedItems.slice(0, 6).forEach((item, index) => {
                const recommendedItem = document.createElement('div');
                recommendedItem.className = 'flex-item';
                recommendedItem.style.animationDelay = `${index * 0.05}s`;
                recommendedItem.innerHTML = `
                    <a href="image-detail.html?id=${item.id}" aria-label="${item.title}" data-id="${item.id}">
                        <img data-src="${item.url}" alt="${item.title}" class="lazy loading">
                    </a>
                    <p>${item.title}</p>
                `;
                fragment.appendChild(recommendedItem);
            });

            app.elements.forYouGrid.innerHTML = '';
            app.elements.forYouGrid.appendChild(fragment);
            app.utils.lazyLoadImages(app.elements.forYouGrid);

            // Guardar pesos actualizados
            app.utils.setLocalStorage('tagWeights', tagWeights);
        }
    };

    // Módulo de Tags
    app.tags = {
        generate: () => {
            if (!app.elements.tagsSection) return;
            const allTags = [...new Set(app.state.imagesData.flatMap(item => item.tags))];
            const randomTags = [];
            const usedIndices = new Set();
            while (randomTags.length < Math.min(5, allTags.length)) {
                const randomIndex = Math.floor(Math.random() * allTags.length);
                if (!usedIndices.has(randomIndex)) {
                    usedIndices.add(randomIndex);
                    randomTags.push(allTags[randomIndex]);
                }
            }

            app.elements.tagsSection.innerHTML = '';
            app.elements.tagsSection.appendChild(app.elements.resetButton);
            app.elements.tagsSection.appendChild(app.elements.resetTagButton);
            app.elements.tagsSection.appendChild(app.elements.resetCategoryButton);

            randomTags.forEach(tag => {
                const tagButton = document.createElement('button');
                tagButton.className = 'tag-button';
                tagButton.textContent = tag;
                tagButton.style.backgroundColor = app.config.tagColors[Math.floor(Math.random() * app.config.tagColors.length)];
                app.elements.tagsSection.appendChild(tagButton);
            });
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
        },
        byCategory: (category, button) => {
            if (app.state.activeCategoryButton) app.state.activeCategoryButton.classList.remove('active');
            button.classList.add('active');
            app.state.activeCategoryButton = button;
            app.state.activeCategory = category === 'all' ? null : category;
            app.state.currentPage = 1;
            app.filter.applyCombined();
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
                            return count + (title.includes(word) ? 2 : 0) + // Mayor peso por título
                                   (description.includes(word) ? 1 : 0) +
                                   (tags.some(tag => tag.includes(word)) ? 3 : 0); // Mayor peso por tags
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

                // Guardar historial de búsqueda en localStorage
                const searchHistory = app.utils.getLocalStorage('searchHistory') || [];
                if (!searchHistory.includes(searchTerm)) {
                    searchHistory.unshift(searchTerm);
                    if (searchHistory.length > 10) searchHistory.pop(); // Limitar a 10 búsquedas
                    app.utils.setLocalStorage('searchHistory', searchHistory);
                }

                // Actualizar pesos de tags desde la búsqueda
                const tagWeights = app.utils.getLocalStorage('tagWeights') || {};
                searchWords.forEach(word => {
                    tagWeights[word] = (tagWeights[word] || 0) + 3; // Peso por búsqueda
                });
                app.utils.setLocalStorage('tagWeights', tagWeights);

                app.forYou.render();

                // Desplazar al área de imágenes
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
            const imageId = urlParams.get('id') || '30';

            app.elements.loader.style.display = 'flex';
            app.utils.fetchWithCache('imagenes.json', 'cachedImages', app.elements.imageTitle, (data) => {
                app.state.imagesData = data;
                const currentItem = data.find(img => img.id == imageId);
                if (currentItem) {
                    app.elements.imageTitle.textContent = currentItem.title;
                    app.elements.fullImage.dataset.src = currentItem.url;
                    app.elements.fullImage.alt = currentItem.title;
                    app.elements.imageDescription.textContent = currentItem.description || 'Sin descripción disponible';
                    app.imageDetail.loadSimilarImages(currentItem.tags, data);
                    app.imageDetail.loadUtterances(imageId);
                    app.utils.lazyLoadImages();

                    // Guardar ID de imagen vista en localStorage con interacción avanzada
                    const viewedIds = app.utils.getLocalStorage('viewedIds') || [];
                    const tagWeights = app.utils.getLocalStorage('tagWeights') || {};
                    if (!viewedIds.includes(imageId)) {
                        viewedIds.unshift(imageId);
                        if (viewedIds.length > 10) viewedIds.pop();
                        app.utils.setLocalStorage('viewedIds', viewedIds);

                        // Incrementar peso de tags por vista
                        currentItem.tags.forEach(tag => {
                            tagWeights[tag] = (tagWeights[tag] || 0) + 1;
                        });
                        app.utils.setLocalStorage('tagWeights', tagWeights);
                    }

                    // Registrar tiempo en página como interacción avanzada
                    let timeSpent = 0;
                    const startTime = Date.now();
                    window.addEventListener('beforeunload', () => {
                        timeSpent = Math.floor((Date.now() - startTime) / 1000); // Tiempo en segundos
                        if (timeSpent > 5) { // Solo si pasa más de 5 segundos
                            currentItem.tags.forEach(tag => {
                                tagWeights[tag] = (tagWeights[tag] || 0) + Math.min(timeSpent / 60, 5); // Máximo 5 puntos por minuto
                            });
                            app.utils.setLocalStorage('tagWeights', tagWeights);
                        }
                    });
                } else {
                    console.error("Imagen no encontrada");
                    app.elements.imageTitle.textContent = "Imagen no encontrada";
                }
            }).finally(() => app.elements.loader.style.display = 'none');
        },
        loadSimilarImages: (tags, allImages) => {
            const fragment = document.createDocumentFragment();
            const similarImages = allImages
                .filter(item => item.id != new URLSearchParams(window.location.search).get('id') && item.tags.some(tag => tags.includes(tag)))
                .sort((a, b) => b.tags.filter(tag => tags.includes(tag)).length - a.tags.filter(tag => tags.includes(tag)).length)
                .slice(0, 6);

            similarImages.forEach(item => {
                const imageElement = document.createElement('div');
                imageElement.className = 'similar-note-item';
                imageElement.innerHTML = `
                    <a href="image-detail.html?id=${item.id}" aria-label="${item.title}" data-id="${item.id}">
                        <div style="position: relative;">
                            <img data-src="${item.url}" alt="${item.title}" class="lazy">
                            <div class="watermark">@exeneqiel</div>
                        </div>
                        <h3>${item.title}</h3>
                    </a>`;
                fragment.appendChild(imageElement);
            });

            app.elements.similarImagesGrid.innerHTML = '';
            app.elements.similarImagesGrid.appendChild(fragment);
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
                const currentNote = data.find(note => note.id == noteId);
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
                } else {
                    console.error("Nota no encontrada");
                    app.elements.noteTitle.textContent = "Nota no encontrada";
                    app.elements.noteContent.textContent = "No se encontró la nota solicitada.";
                }
            }).finally(() => app.elements.loader.style.display = 'none');
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
                    </a>`;
                fragment.appendChild(noteElement);
            });

            app.elements.similarNotesGrid.innerHTML = '';
            app.elements.similarNotesGrid.appendChild(fragment);
            app.utils.lazyLoadImages(app.elements.similarNotesGrid);
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
                app.elements.menu.querySelectorAll('.tab-button').forEach(link => link.addEventListener('click', () => {
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
                    if (tagButton) {
                        app.filter.byTag(tagButton.textContent, tagButton);
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

            // Evento para registrar imágenes vistas en la galería o "Para ti" con interacción avanzada
            ['imageGrid', 'forYouGrid', 'similarImagesGrid'].forEach(gridId => {
                const grid = app.elements[gridId];
                if (grid) {
                    grid.addEventListener('click', (e) => {
                        const link = e.target.closest('a[data-id]');
                        if (link) {
                            const imageId = link.dataset.id;
                            const viewedIds = app.utils.getLocalStorage('viewedIds') || [];
                            const tagWeights = app.utils.getLocalStorage('tagWeights') || {};
                            if (!viewedIds.includes(imageId)) {
                                viewedIds.unshift(imageId);
                                if (viewedIds.length > 10) viewedIds.pop();
                                app.utils.setLocalStorage('viewedIds', viewedIds);

                                // Incrementar peso de tags por clic
                                const item = app.state.imagesData.find(i => i.id.toString() === imageId);
                                if (item) {
                                    item.tags.forEach(tag => {
                                        tagWeights[tag] = (tagWeights[tag] || 0) + 2; // Peso por clic
                                    });
                                    app.utils.setLocalStorage('tagWeights', tagWeights);
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