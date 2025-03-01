document.addEventListener('DOMContentLoaded', () => {
    const app = window.app = window.app || {}; // Creamos objeto global

    // Elementos del DOM
    app.elements = {
        imageGrid: document.getElementById('image-grid'),
        searchInput: document.getElementById('search'),
        pagination: document.getElementById('pagination'),
        sliderContainer: document.getElementById('slider-container'),
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
        categories: document.getElementById('categories'),
        menuToggle: document.getElementById('menu-toggle'),
        menu: document.getElementById('menu'),
        menuClose: document.getElementById('menu-close'),
        chatToggle: document.getElementById('chat-toggle'),
        chatPopup: document.getElementById('chat-popup'),
        chatClose: document.getElementById('chat-close')
    };

    // Variables globales
    app.itemsPerPage = 15;
    app.currentPage = 1;
    app.imagesData = [];
    app.notesData = [];
    app.sliderData = [];
    app.currentSlide = 0;
    app.isFiltered = false;
    app.filteredItems = [];
    app.loadedItems = 0;
    app.activeTagButton = null;
    app.activeCategoryButton = null;
    app.activeTag = null;
    app.activeCategory = null;
    app.filterCache = new Map();

    app.tagColors = ['#ef5350', '#f06292', '#e57373', '#ff8a80', '#ffab91', '#ff8a65', '#ff7043', '#ff5722', '#f4511e', '#e64a19'];
    app.categoryIcons = {
        'all': 'https://cdn-icons-png.flaticon.com/512/1665/1665731.png',
        'furry': 'https://cdn-icons-png.flaticon.com/512/16781/16781787.png',
        'anime': 'https://cdn-icons-png.flaticon.com/512/1881/1881121.png',
        'realismo': 'https://cdn-icons-png.flaticon.com/512/11178/11178222.png',
        'angelical': 'https://cdn-icons-png.flaticon.com/512/10291/10291922.png',
        'evil': 'https://cdn-icons-png.flaticon.com/512/2855/2855658.png'
    };

    // Inicialización del tema
    if (localStorage.getItem('darkTheme') === 'true') document.body.classList.add('dark-theme');
    if (app.elements.themeToggle) {
        app.elements.themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            localStorage.setItem('darkTheme', document.body.classList.contains('dark-theme'));
            if (typeof updateUtterancesTheme === 'function') updateUtterancesTheme();
        });
    }

    // Verificación de edad
    if (app.elements.ageVerification) {
        if (localStorage.getItem('ageVerified') === 'true') {
            showMainContent();
            startPage();
        } else {
            showAgeVerification();
            app.elements.ageYes.addEventListener('click', () => {
                localStorage.setItem('ageVerified', 'true');
                showMainContent();
                startPage();
            });
            app.elements.ageNo.addEventListener('click', () => window.location.href = 'https://m.kiddle.co/');
        }
    }

    if (app.elements.revokeAge) {
        app.elements.revokeAge.addEventListener('click', () => {
            localStorage.removeItem('ageVerified');
            hideMainContent();
            showAgeVerification();
        });
    }

    // Botón de scroll
    if (app.elements.scrollTopButton) {
        app.elements.scrollTopButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        window.addEventListener('scroll', () => {
            app.elements.scrollTopButton.classList.toggle('visible', window.scrollY > 200);
        });
    }

    // Funciones del menú
    function toggleMenu() {
        if (app.elements.menu && app.elements.menuToggle) {
            app.elements.menu.classList.toggle('active');
            app.elements.menuToggle.classList.toggle('open');
        }
    }

    function closeMenu() {
        if (app.elements.menu && app.elements.menuToggle) {
            app.elements.menu.classList.remove('active');
            app.elements.menuToggle.classList.remove('open');
        }
    }

    if (app.elements.menuToggle && app.elements.menu && app.elements.menuClose) {
        app.elements.menuToggle.addEventListener('click', toggleMenu);
        app.elements.menuClose.addEventListener('click', closeMenu);

        document.addEventListener('click', (event) => {
            const isClickInsideMenu = app.elements.menu.contains(event.target);
            const isClickOnToggle = app.elements.menuToggle.contains(event.target);
            if (!isClickInsideMenu && !isClickOnToggle && app.elements.menu.classList.contains('active')) {
                closeMenu();
            }
        });

        if (app.elements.menu) {
            app.elements.menu.querySelectorAll('.tab-button').forEach(link => {
                link.addEventListener('click', closeMenu);
            });
        }
    }

    // Funciones de visibilidad
    function showMainContent() {
        if (app.elements.ageVerification) app.elements.ageVerification.style.display = 'none';
        if (app.elements.header) app.elements.header.style.display = 'block';
        if (app.elements.mainContent) app.elements.mainContent.style.display = 'block';
        if (app.elements.gallery) app.elements.gallery.style.display = 'block';
        if (app.elements.pagination) app.elements.pagination.style.display = 'block';
        if (app.elements.footer) app.elements.footer.style.display = 'block';
    }

    function hideMainContent() {
        if (app.elements.header) app.elements.header.style.display = 'none';
        if (app.elements.mainContent) app.elements.mainContent.style.display = 'none';
        if (app.elements.gallery) app.elements.gallery.style.display = 'none';
        if (app.elements.pagination) app.elements.pagination.style.display = 'none';
        if (app.elements.footer) app.elements.footer.style.display = 'none';
    }

    function showAgeVerification() {
        if (app.elements.ageVerification) {
            app.elements.ageVerification.style.display = 'flex';
            app.elements.ageVerification.classList.add('active');
        }
    }

    // Funciones de utilidad
    function fetchWithCache(url, cacheKey, fallbackElement, renderFn) {
        const version = 'v1';
        const cacheKeyWithVersion = `${cacheKey}_${version}`;
        const cachedData = localStorage.getItem(cacheKeyWithVersion);
        
        if (cachedData) {
            const data = JSON.parse(cachedData);
            renderFn(data);
            return Promise.resolve(data);
        }

        if (app.elements.loader) app.elements.loader.style.display = 'flex';
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
            .finally(() => { if (app.elements.loader) app.elements.loader.style.display = 'none'; });
    }

    function lazyLoadImages(container = document) {
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                    }
                    observer.unobserve(img);
                }
            });
        }, { rootMargin: '0px 0px 200px 0px' });
        container.querySelectorAll('.lazy').forEach(img => observer.observe(img));
    }

    // Funciones del slider
    function renderSlider(slides) {
        const fragment = document.createDocumentFragment();
        slides.forEach((slide, index) => {
            const slideElement = document.createElement('div');
            slideElement.className = 'slide' + (index === 0 ? ' active' : '');
            if (slide.backgroundImage) {
                slideElement.style.backgroundImage = `url('${slide.backgroundImage}')`;
                slideElement.style.backgroundSize = 'cover';
                slideElement.style.backgroundPosition = 'center';
            }
            slideElement.innerHTML = `
                <div class="slide-content">
                    <h1>${slide.title}</h1>
                    ${slide.text ? `<p>${slide.text}</p>` : ''}
                    ${slide.socialLinks ? `
                        <div class="social-bar">
                            ${slide.socialLinks.map(link => `
                                <a href="${link.url}" target="_blank" aria-label="${link.alt}">
                                    <img data-src="${link.image}" alt="${link.alt}" class="lazy social-icon">
                                </a>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
            fragment.appendChild(slideElement);
        });
        if (app.elements.sliderContainer) {
            app.elements.sliderContainer.innerHTML = '';
            app.elements.sliderContainer.appendChild(fragment);
            lazyLoadImages(app.elements.sliderContainer);
        }
    }

    function startSlider() {
        if (app.elements.sliderContainer) {
            const slides = app.elements.sliderContainer.children;
            const totalSlides = slides.length;
            app.elements.sliderContainer.style.setProperty('--total-slides', totalSlides);
            setInterval(() => {
                app.currentSlide = (app.currentSlide + 1) % totalSlides;
                app.elements.sliderContainer.style.transform = `translateX(-${app.currentSlide * (100 / totalSlides)}%)`;
            }, 5000);
        }
    }

    // Inicio de la página
    function startPage() {
        Promise.all([
            fetchWithCache('slider.json', 'cachedSlider', app.elements.sliderContainer, data => {
                app.sliderData = data;
                renderSlider(app.sliderData);
                startSlider();
            }),
            fetchWithCache('imagenes.json', 'cachedImages', app.elements.imageGrid, data => {
                app.imagesData = data;
                renderImages(app.currentPage);
                generateRandomTags();
                generateCategories();
                restoreFilter();
            }),
            fetchWithCache('notes.json', 'cachedNotes', app.elements.featuredNotes, data => {
                app.notesData = data;
                renderFeaturedNotes();
            })
        ]);
    }

    // Funciones de la galería
    function renderImages(page) {
        const startIndex = (page - 1) * app.itemsPerPage;
        const endIndex = Math.min(startIndex + app.itemsPerPage, app.isFiltered ? app.filteredItems.length : app.imagesData.length);
        const itemsToRender = app.isFiltered ? app.filteredItems : app.imagesData;
        const newItems = itemsToRender.slice(startIndex, endIndex);
        const currentItems = Array.from(app.elements.imageGrid?.children || []);

        if (currentItems.length === newItems.length && 
            currentItems.every((item, i) => item.querySelector('img').dataset.src === newItems[i].url)) {
            return;
        }

        const fragment = document.createDocumentFragment();
        newItems.forEach((item, index) => {
            const imageItem = document.createElement('div');
            imageItem.className = 'flex-item';
            imageItem.style.animationDelay = `${index * 0.05}s`;
            imageItem.innerHTML = `
                <a href="image-detail.html?id=${item.id}" aria-label="${item.title}">
                    <img data-src="${item.url}" alt="${item.title}" class="lazy">
                </a>
                <p>${item.title}</p>
            `;
            fragment.appendChild(imageItem);
        });

        if (app.elements.imageGrid) {
            app.elements.imageGrid.innerHTML = '';
            app.elements.imageGrid.appendChild(fragment);
            lazyLoadImages(app.elements.imageGrid);
            renderPagination(app.isFiltered ? app.filteredItems.length : app.imagesData.length, page => {
                app.currentPage = page;
                renderImages(app.currentPage);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            updateFilterCount();
            updateFilterIndicator();
        }
    }

    function renderPagination(totalItems, pageHandler) {
        if (app.elements.pagination) {
            const totalPages = Math.ceil(totalItems / app.itemsPerPage);
            const fragment = document.createDocumentFragment();

            for (let i = 1; i <= totalPages; i++) {
                const button = document.createElement('button');
                button.textContent = i;
                button.disabled = i === app.currentPage;
                button.addEventListener('click', () => pageHandler(i));
                fragment.appendChild(button);
            }
            app.elements.pagination.innerHTML = '';
            app.elements.pagination.appendChild(fragment);
            updateFilterCount();
        }
    }

    // Funciones de notas destacadas
    function renderFeaturedNotes() {
        if (app.elements.featuredNotes) {
            const fragment = document.createDocumentFragment();
            const shuffledNotes = [...app.notesData].sort(() => 0.5 - Math.random()).slice(0, 4);

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
            app.elements.featuredNotes.innerHTML = '';
            app.elements.featuredNotes.appendChild(fragment);
            lazyLoadImages(app.elements.featuredNotes);
        }
    }

    // Funciones de tags y categorías
    function generateRandomTags() {
        if (app.elements.tagsSection && app.imagesData.length > 0) {
            const allTags = [...new Set(app.imagesData.flatMap(item => item.tags))];
            const numTags = Math.min(5, allTags.length);
            const randomTags = [];
            const usedIndices = new Set();

            while (randomTags.length < numTags) {
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
                tagButton.style.backgroundColor = app.tagColors[Math.floor(Math.random() * app.tagColors.length)];
                app.elements.tagsSection.appendChild(tagButton);
            });
        }
    }

    function generateCategories() {
        if (app.elements.categories) {
            app.elements.categories.innerHTML = '';
            Object.keys(app.categoryIcons).forEach((category, index) => {
                const categoryButton = document.createElement('button');
                categoryButton.className = 'category-button';
                categoryButton.dataset.category = category;
                categoryButton.innerHTML = `
                    <img data-src="${app.categoryIcons[category]}" alt="${category}" class="lazy">
                    <span>${category.charAt(0).toUpperCase() + category.slice(1)}</span>
                `;
                categoryButton.style.animationDelay = `${index * 0.1}s`;
                app.elements.categories.appendChild(categoryButton);
            });
            lazyLoadImages(app.elements.categories);
        }
    }

    function filterByTag(tag, button) {
        if (app.activeTagButton && app.elements.tagsSection) app.activeTagButton.classList.remove('active');
        if (button && app.elements.tagsSection) button.classList.add('active');
        app.activeTagButton = button;
        app.activeTag = tag;
        app.currentPage = 1;
        applyCombinedFilter();
        scrollToGallery();
    }

    function filterByCategory(category, button) {
        if (app.activeCategoryButton && app.elements.categories) app.activeCategoryButton.classList.remove('active');
        if (button && app.elements.categories) button.classList.add('active');
        app.activeCategoryButton = button;
        app.activeCategory = category === 'all' ? null : category;
        app.currentPage = 1;
        applyCombinedFilter();
        scrollToGallery();
    }

    function applyCombinedFilter() {
        const cacheKey = `${app.activeTag || ''}_${app.activeCategory || ''}`;
        if (app.filterCache.has(cacheKey) && app.elements.imageGrid) {
            app.filteredItems = app.filterCache.get(cacheKey);
            renderImages(app.currentPage);
            return;
        }

        if (app.elements.loader && app.elements.imageGrid) {
            app.elements.loader.style.display = 'flex';
            app.elements.imageGrid.classList.add('fade');
            setTimeout(() => {
                app.filteredItems = app.imagesData.filter(item => {
                    const tagMatch = !app.activeTag || item.tags.includes(app.activeTag);
                    const categoryMatch = !app.activeCategory || item.tags.includes(app.activeCategory);
                    return tagMatch && categoryMatch;
                });
                app.filterCache.set(cacheKey, app.filteredItems);
                app.isFiltered = app.activeTag || app.activeCategory;
                renderImages(app.currentPage);
                if (app.elements.resetButton) app.elements.resetButton.classList.toggle('active', app.isFiltered);
                if (app.elements.resetTagButton) app.elements.resetTagButton.classList.toggle('active', !!app.activeTag);
                if (app.elements.resetCategoryButton) app.elements.resetCategoryButton.classList.toggle('active', !!app.activeCategory);
                app.elements.imageGrid.classList.remove('fade');
                app.elements.loader.style.display = 'none';
                localStorage.setItem('lastFilter', app.activeTag || app.activeCategory || '');
                localStorage.setItem('lastFilterType', app.activeTag ? 'tag' : app.activeCategory ? 'category' : '');
                if (!app.activeTag && app.elements.searchInput) app.elements.searchInput.value = '';
            }, 100);
        }
    }

    function resetFilters() {
        if (app.elements.loader && app.elements.imageGrid) {
            app.elements.loader.style.display = 'flex';
            app.elements.imageGrid.classList.add('fade');
            setTimeout(() => {
                if (app.activeTagButton && app.elements.tagsSection) app.activeTagButton.classList.remove('active');
                if (app.activeCategoryButton && app.elements.categories) app.activeCategoryButton.classList.remove('active');
                app.activeTagButton = null;
                app.activeCategoryButton = null;
                app.activeTag = null;
                app.activeCategory = null;
                app.filteredItems = [];
                app.isFiltered = false;
                app.currentPage = 1;
                renderImages(app.currentPage);
                app.elements.imageGrid.classList.remove('fade');
                app.elements.loader.style.display = 'none';
                if (app.elements.resetButton) app.elements.resetButton.classList.remove('active');
                if (app.elements.resetTagButton) app.elements.resetTagButton.classList.remove('active');
                if (app.elements.resetCategoryButton) app.elements.resetCategoryButton.classList.remove('active');
                updateFilterCount();
                updateFilterIndicator();
                localStorage.removeItem('lastFilter');
                localStorage.removeItem('lastFilterType');
                if (app.elements.searchInput) app.elements.searchInput.value = '';
                app.hideAutocomplete();
            }, 100);
        }
    }

    function resetTagFilter() {
        if (app.activeTagButton && app.elements.tagsSection) app.activeTagButton.classList.remove('active');
        app.activeTagButton = null;
        app.activeTag = null;
        app.currentPage = 1;
        applyCombinedFilter();
    }

    function resetCategoryFilter() {
        if (app.activeCategoryButton && app.elements.categories) app.activeCategoryButton.classList.remove('active');
        app.activeCategoryButton = null;
        app.activeCategory = null;
        app.currentPage = 1;
        applyCombinedFilter();
    }

    function updateFilterCount() {
        if (app.elements.filterCount && app.isFiltered) {
            app.elements.filterCount.style.display = 'block';
            app.elements.filterCount.textContent = `Mostrando ${Math.min(app.itemsPerPage, app.filteredItems.length)} de ${app.filteredItems.length} imágenes`;
        } else if (app.elements.filterCount) {
            app.elements.filterCount.style.display = 'none';
            app.elements.filterCount.textContent = '';
        }
    }

    function updateFilterIndicator() {
        if (app.elements.filterIndicator) {
            let indicatorText = '';
            if (app.activeTag && app.activeCategory) {
                indicatorText = `${app.activeCategory.charAt(0).toUpperCase() + app.activeCategory.slice(1)} + ${app.activeTag}`;
            } else if (app.activeTag) {
                indicatorText = app.activeTag;
            } else if (app.activeCategory) {
                indicatorText = app.activeCategory.charAt(0).toUpperCase() + app.activeCategory.slice(1);
            } else if (app.isFiltered && app.elements.searchInput.value) {
                indicatorText = `Búsqueda: ${app.elements.searchInput.value}`;
            }
            app.elements.filterIndicator.textContent = indicatorText ? `Filtro: ${indicatorText}` : '';
        }
    }

    function scrollToGallery() {
        if (app.elements.gallery) {
            app.elements.gallery.scrollIntoView({ behavior: 'smooth' });
        }
    }

    function restoreFilter() {
        const lastFilter = localStorage.getItem('lastFilter');
        const lastFilterType = localStorage.getItem('lastFilterType');
        if (lastFilter && app.elements.searchInput) {
            if (lastFilterType === 'search') {
                app.elements.searchInput.value = lastFilter;
                app.filterBySearch(lastFilter);
            } else if (lastFilterType === 'tag') {
                const tagButton = Array.from(app.elements.tagsSection?.querySelectorAll('.tag-button') || []).find(btn => btn.textContent === lastFilter);
                if (tagButton) filterByTag(lastFilter, tagButton);
            } else if (lastFilterType === 'category') {
                const categoryButton = Array.from(app.elements.categories?.querySelectorAll('.category-button') || []).find(btn => btn.dataset.category === lastFilter);
                if (categoryButton) filterByCategory(lastFilter, categoryButton);
            }
        }
    }

    // Eventos de búsqueda (conectados a search.js)
    let searchTimeout;
    if (app.elements.searchInput) {
        app.elements.searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const value = this.value;
            searchTimeout = setTimeout(() => {
                app.filterBySearch(value);
                app.showAutocomplete(app.getAutocompleteSuggestions(value));
            }, 150);
        });

        document.addEventListener('click', (event) => {
            if (!app.elements.searchInput.contains(event.target) && !document.getElementById('autocomplete')?.contains(event.target)) {
                app.hideAutocomplete();
            }
        });
    }

    // Eventos de filtros
    if (app.elements.resetButton) app.elements.resetButton.addEventListener('click', resetFilters);
    if (app.elements.resetTagButton) app.elements.resetTagButton.addEventListener('click', resetTagFilter);
    if (app.elements.resetCategoryButton) app.elements.resetCategoryButton.addEventListener('click', resetCategoryFilter);

    if (app.elements.tagsSection) {
        app.elements.tagsSection.addEventListener('click', (e) => {
            const tagButton = e.target.closest('.tag-button');
            if (tagButton) {
                const tag = tagButton.textContent;
                filterByTag(tag, tagButton);
                scrollToGallery();
            }
        });
    }

    if (app.elements.categories) {
        app.elements.categories.addEventListener('click', (e) => {
            const categoryButton = e.target.closest('.category-button');
            if (categoryButton) {
                const category = categoryButton.dataset.category;
                if (category === 'all') {
                    resetFilters();
                } else {
                    filterByCategory(category, categoryButton);
                }
            }
        });
    }

    // Lógica del chat flotante
    if (window.location.pathname.endsWith('index.html') && app.elements.chatToggle && app.elements.chatPopup && app.elements.chatClose) {
        let chatLoaded = false;

        function initializeChat() {
            if (!chatLoaded) {
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

                    const chatContent = app.elements.chatPopup.querySelector('.chat-content');
                    chatContent.innerHTML = '';
                    chatContent.appendChild(chatSpan);
                };
                document.head.appendChild(script);

                chatLoaded = true;
            }
        }

        function toggleChat() {
            if (app.elements.chatPopup.style.display === 'flex') {
                app.elements.chatPopup.style.display = 'none';
            } else {
                app.elements.chatPopup.style.display = 'flex';
                initializeChat();
            }
        }

        function closeChat() {
            app.elements.chatPopup.style.display = 'none';
        }

        app.elements.chatToggle.addEventListener('click', toggleChat);
        app.elements.chatClose.addEventListener('click', closeChat);

        document.addEventListener('click', (event) => {
            if (!app.elements.chatPopup.contains(event.target) && !app.elements.chatToggle.contains(event.target) && app.elements.chatPopup.style.display === 'flex') {
                closeChat();
            }
        });
    }

    // Exportamos funciones al objeto global
    app.showMainContent = showMainContent;
    app.hideMainContent = hideMainContent;
    app.showAgeVerification = showAgeVerification;
    app.fetchWithCache = fetchWithCache;
    app.lazyLoadImages = lazyLoadImages;
    app.renderSlider = renderSlider;
    app.startSlider = startSlider;
    app.startPage = startPage;
    app.renderImages = renderImages;
    app.renderPagination = renderPagination;
    app.renderFeaturedNotes = renderFeaturedNotes;
    app.generateRandomTags = generateRandomTags;
    app.generateCategories = generateCategories;
    app.filterByTag = filterByTag;
    app.filterByCategory = filterByCategory;
    app.applyCombinedFilter = applyCombinedFilter;
    app.resetFilters = resetFilters;
    app.resetTagFilter = resetTagFilter;
    app.resetCategoryFilter = resetCategoryFilter;
    app.updateFilterCount = updateFilterCount;
    app.updateFilterIndicator = updateFilterIndicator;
    app.scrollToGallery = scrollToGallery;
    app.restoreFilter = restoreFilter;
});

document.head.insertAdjacentHTML('beforeend', `
    <style>
        .lazy { opacity: 0; transition: opacity 0.3s; }
        .lazy[src] { opacity: 1; }
        .social-icon { width: 30px; height: 30px; transition: transform 0.3s ease; }
        .social-icon:hover { transform: scale(1.1); }
        .autocomplete {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background-color: #fff;
            border: 1px solid #d32f2f;
            border-radius: 5px;
            max-height: 150px;
            overflow-y: auto;
            z-index: 10;
            box-shadow: 0 4px 8px rgba(211, 47, 47, 0.3);
            display: none;
        }
        .dark-theme .autocomplete {
            background-color: #424242;
            border-color: #ef5350;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }
        .autocomplete-item {
            padding: 8px 12px;
            cursor: pointer;
            color: #d32f2f;
            transition: background-color 0.3s ease;
        }
        .dark-theme .autocomplete-item {
            color: #ef5350;
        }
        .autocomplete-item:hover {
            background-color: #ef5350;
            color: #fff;
        }
    </style>
`);