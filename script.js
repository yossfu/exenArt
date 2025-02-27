document.addEventListener('DOMContentLoaded', () => {
    const elements = {
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
        menuClose: document.getElementById('menu-close')
    };

    const itemsPerPage = 15;
    let currentPage = 1;
    let imagesData = [];
    let notesData = [];
    let currentSlide = 0;
    let isFiltered = false;
    let filteredItems = [];
    let loadedItems = 0;
    let activeTagButton = null;
    let activeCategoryButton = null;
    let activeTag = null;
    let activeCategory = null;

    const tagColors = [
        '#ef5350', '#f06292', '#e57373', '#ff8a80', '#ffab91',
        '#ff8a65', '#ff7043', '#ff5722', '#f4511e', '#e64a19'
    ];

    const categoryIcons = {
        'all': 'https://cdn-icons-png.flaticon.com/512/1665/1665731.png',
        'furry': 'https://cdn-icons-png.flaticon.com/512/16781/16781787.png',
        'anime': 'https://cdn-icons-png.flaticon.com/512/1881/1881121.png',
        'realismo': 'https://cdn-icons-png.flaticon.com/512/11178/11178222.png',
        'angelical': 'https://cdn-icons-png.flaticon.com/512/10291/10291922.png',
        'evil': 'https://cdn-icons-png.flaticon.com/512/2855/2855658.png'
    };

    // Configuración inicial
    if (localStorage.getItem('darkTheme') === 'true') document.body.classList.add('dark-theme');
    elements.themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        localStorage.setItem('darkTheme', document.body.classList.contains('dark-theme'));
    });

    if (localStorage.getItem('ageVerified') === 'true') {
        showMainContent();
        startPage();
    } else {
        elements.ageYes.addEventListener('click', () => {
            localStorage.setItem('ageVerified', 'true');
            showMainContent();
            startPage();
        });
        elements.ageNo.addEventListener('click', () => window.location.href = 'https://m.kiddle.co/');
    }

    elements.revokeAge.addEventListener('click', () => {
        localStorage.clear();
        location.reload();
    });

    elements.scrollTopButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    window.addEventListener('scroll', () => {
        elements.scrollTopButton.classList.toggle('visible', window.scrollY > 200);
    });

    // Manejo del menú
    function toggleMenu() {
        elements.menu.classList.toggle('active');
        elements.menuToggle.classList.toggle('open');
    }

    function closeMenu() {
        elements.menu.classList.remove('active');
        elements.menuToggle.classList.remove('open');
    }

    elements.menuToggle.addEventListener('click', toggleMenu);
    elements.menuClose.addEventListener('click', closeMenu);
    document.addEventListener('click', (event) => {
        if (!elements.menu.contains(event.target) && !elements.menuToggle.contains(event.target) && elements.menu.classList.contains('active')) {
            closeMenu();
        }
    });
    elements.menu.querySelectorAll('.tab-button').forEach(link => link.addEventListener('click', closeMenu));

    // Funciones utilitarias
    function showMainContent() {
        elements.ageVerification.style.display = 'none';
        elements.header.style.display = 'block';
        elements.mainContent.style.display = 'block';
        elements.gallery.style.display = 'block';
        elements.pagination.style.display = 'block';
        elements.footer.style.display = 'block';
    }

    function fetchWithCache(url, cacheKey, fallbackElement, renderFn) {
        const version = 'v1';
        const cacheKeyWithVersion = `${cacheKey}_${version}`;
        const cachedData = localStorage.getItem(cacheKeyWithVersion);
        
        if (cachedData) {
            const data = JSON.parse(cachedData);
            renderFn(data);
            return Promise.resolve(data);
        }

        elements.loader.style.display = 'flex';
        return fetch(url)
            .then(response => response.json())
            .then(data => {
                localStorage.setItem(cacheKeyWithVersion, JSON.stringify(data));
                renderFn(data);
                return data;
            })
            .catch(error => {
                console.error(`Error cargando ${url}:`, error);
                if (!cachedData) {
                    fallbackElement.innerHTML = '<p style="text-align:center;color:#ff5722;">Error al cargar datos. <button onclick="startPage()">Reintentar</button></p>';
                }
            })
            .finally(() => elements.loader.style.display = 'none');
    }

    // Funciones principales
    function startPage() {
        const slides = elements.sliderContainer.children;
        const totalSlides = slides.length;
        setInterval(() => {
            currentSlide = (currentSlide + 1) % totalSlides;
            elements.sliderContainer.style.transform = `translateX(-${currentSlide * 50}%)`;
        }, 5000);

        Promise.all([
            fetchWithCache('imagenes.json', 'cachedImages', elements.imageGrid, data => {
                imagesData = data;
                renderImages(currentPage);
                generateRandomTags();
                generateCategories();
                addCategoryListeners();
                restoreFilter();
            }),
            fetchWithCache('notes.json', 'cachedNotes', elements.featuredNotes, data => {
                notesData = data;
                renderFeaturedNotes();
            })
        ]);
    }

    function renderImages(page) {
        const fragment = document.createDocumentFragment();
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, imagesData.length);

        imagesData.slice(startIndex, endIndex).forEach((item, index) => {
            const imageItem = document.createElement('div');
            imageItem.className = 'flex-item';
            imageItem.style.animationDelay = `${index * 0.1}s`;
            imageItem.innerHTML = `
                <a href="image-detail.html?id=${item.id}" aria-label="${item.title}">
                    <img src="${item.url}" alt="${item.title}" loading="lazy">
                </a>
                <p>${item.title}</p>
            `;
            fragment.appendChild(imageItem);
        });

        elements.imageGrid.innerHTML = '';
        elements.imageGrid.appendChild(fragment);
        renderPagination(imagesData.length, page => {
            currentPage = page;
            renderImages(currentPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        updateFilterCount();
        updateFilterIndicator();
    }

    function renderPagination(totalItems, pageHandler) {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const fragment = document.createDocumentFragment();

        for (let i = 1; i <= totalPages; i++) {
            const button = document.createElement('button');
            button.textContent = i;
            button.disabled = i === currentPage;
            button.addEventListener('click', () => pageHandler(i));
            fragment.appendChild(button);
        }
        elements.pagination.innerHTML = '';
        elements.pagination.appendChild(fragment);
        updateFilterCount();
    }

    function renderFeaturedNotes() {
        const fragment = document.createDocumentFragment();
        const shuffledNotes = [...notesData].sort(() => 0.5 - Math.random()).slice(0, 4);

        shuffledNotes.forEach(note => {
            const card = document.createElement('a');
            card.className = 'featured-card';
            card.href = `note.html?id=${note.id}`;
            card.innerHTML = `
                <img src="${note.image}" alt="${note.title}" loading="lazy">
                <h3>${note.title}</h3>
                <p>${note.summary || note.content.substring(0, 100) + '...'}</p>
            `;
            fragment.appendChild(card);
        });
        elements.featuredNotes.innerHTML = '';
        elements.featuredNotes.appendChild(fragment);
    }

    function generateRandomTags() {
        const allTags = [...new Set(imagesData.flatMap(item => item.tags))];
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

        elements.tagsSection.innerHTML = '';
        elements.tagsSection.appendChild(elements.resetButton);
        elements.tagsSection.appendChild(elements.resetTagButton);
        elements.tagsSection.appendChild(elements.resetCategoryButton);

        randomTags.forEach(tag => {
            const tagButton = document.createElement('button');
            tagButton.className = 'tag-button';
            tagButton.textContent = tag;
            tagButton.style.backgroundColor = tagColors[Math.floor(Math.random() * tagColors.length)];
            tagButton.addEventListener('click', () => {
                filterByTag(tag, tagButton);
                scrollToGallery();
            });
            elements.tagsSection.appendChild(tagButton);
        });
    }

    function generateCategories() {
        elements.categories.innerHTML = '';
        Object.keys(categoryIcons).forEach((category, index) => {
            const categoryButton = document.createElement('button');
            categoryButton.className = 'category-button';
            categoryButton.dataset.category = category;
            categoryButton.innerHTML = `
                <img src="${categoryIcons[category]}" alt="${category}" loading="lazy">
                <span>${category.charAt(0).toUpperCase() + category.slice(1)}</span>
            `;
            categoryButton.style.animationDelay = `${index * 0.1}s`;
            elements.categories.appendChild(categoryButton);
        });
    }

    function addCategoryListeners() {
        elements.categories.querySelectorAll('.category-button').forEach(button => {
            button.addEventListener('click', () => {
                const category = button.dataset.category;
                filterByCategory(category, button);
            });
        });
    }

    function filterByTag(tag, button) {
        if (activeTagButton) activeTagButton.classList.remove('active');
        button.classList.add('active');
        activeTagButton = button;
        activeTag = tag;
        applyCombinedFilter();
        scrollToGallery();
    }

    function filterByCategory(category, button) {
        if (activeCategoryButton) activeCategoryButton.classList.remove('active');
        button.classList.add('active');
        activeCategoryButton = button;
        activeCategory = category;
        applyCombinedFilter();
    }

    function applyCombinedFilter() {
        elements.loader.style.display = 'flex';
        elements.imageGrid.classList.add('fade');
        setTimeout(() => {
            const fragment = document.createDocumentFragment();
            filteredItems = imagesData.filter(item => {
                const tagMatch = !activeTag || item.tags.includes(activeTag);
                const categoryMatch = !activeCategory || activeCategory === 'all' || item.tags.includes(activeCategory);
                return tagMatch && categoryMatch;
            });
            loadedItems = 0;
            filteredItems.slice(0, itemsPerPage).forEach((item, index) => {
                const imageItem = document.createElement('div');
                imageItem.className = 'flex-item';
                imageItem.style.animationDelay = `${index * 0.1}s`;
                imageItem.innerHTML = `
                    <a href="image-detail.html?id=${item.id}" aria-label="${item.title}">
                        <img src="${item.url}" alt="${item.title}" loading="lazy">
                    </a>
                    <p>${item.title}</p>
                `;
                fragment.appendChild(imageItem);
            });
            elements.imageGrid.innerHTML = '';
            elements.imageGrid.appendChild(fragment);
            isFiltered = activeTag || activeCategory;
            elements.resetButton.classList.toggle('active', isFiltered);
            elements.resetTagButton.classList.toggle('active', !!activeTag);
            elements.resetCategoryButton.classList.toggle('active', !!activeCategory);
            elements.imageGrid.classList.remove('fade');
            elements.loader.style.display = 'none';
            updateFilterCount();
            updateFilterIndicator();
            localStorage.setItem('lastFilter', activeTag || activeCategory || '');
            localStorage.setItem('lastFilterType', activeTag ? 'tag' : 'category');
            if (!activeTag) elements.searchInput.value = '';
        }, 100);
    }

    function filterBySearch(searchTerm) {
        elements.loader.style.display = 'flex';
        elements.imageGrid.classList.add('fade');
        setTimeout(() => {
            const fragment = document.createDocumentFragment();
            if (activeTagButton) activeTagButton.classList.remove('active');
            if (activeCategoryButton) activeCategoryButton.classList.remove('active');
            activeTagButton = null;
            activeCategoryButton = null;
            activeTag = null;
            activeCategory = null;
            filteredItems = imagesData.filter(item => {
                const titleMatch = item.title.toLowerCase().includes(searchTerm);
                const descriptionMatch = item.description?.toLowerCase().includes(searchTerm);
                const tagsMatch = item.tags.some(tag => tag.toLowerCase().includes(searchTerm));
                return titleMatch || descriptionMatch || tagsMatch;
            });
            loadedItems = 0;
            filteredItems.slice(0, itemsPerPage).forEach((item, index) => {
                const imageItem = document.createElement('div');
                imageItem.className = 'flex-item';
                imageItem.style.animationDelay = `${index * 0.1}s`;
                imageItem.innerHTML = `
                    <a href="image-detail.html?id=${item.id}" aria-label="${item.title}">
                        <img src="${item.url}" alt="${item.title}" loading="lazy">
                    </a>
                    <p>${item.title}</p>
                `;
                fragment.appendChild(imageItem);
            });
            elements.imageGrid.innerHTML = '';
            elements.imageGrid.appendChild(fragment);
            isFiltered = true;
            elements.resetButton.classList.add('active');
            elements.resetTagButton.classList.remove('active');
            elements.resetCategoryButton.classList.remove('active');
            elements.imageGrid.classList.remove('fade');
            elements.loader.style.display = 'none';
            updateFilterCount();
            updateFilterIndicator();
            localStorage.setItem('lastFilter', searchTerm);
            localStorage.setItem('lastFilterType', 'search');
        }, 100);
    }

    function resetFilters() {
        elements.loader.style.display = 'flex';
        elements.imageGrid.classList.add('fade');
        setTimeout(() => {
            if (activeTagButton) activeTagButton.classList.remove('active');
            if (activeCategoryButton) activeCategoryButton.classList.remove('active');
            activeTagButton = null;
            activeCategoryButton = null;
            activeTag = null;
            activeCategory = null;
            elements.imageGrid.innerHTML = '';
            renderImages(currentPage);
            elements.imageGrid.classList.remove('fade');
            elements.loader.style.display = 'none';
            isFiltered = false;
            elements.resetButton.classList.remove('active');
            elements.resetTagButton.classList.remove('active');
            elements.resetCategoryButton.classList.remove('active');
            updateFilterCount();
            updateFilterIndicator();
            localStorage.removeItem('lastFilter');
            localStorage.removeItem('lastFilterType');
            elements.searchInput.value = '';
        }, 100);
    }

    function resetTagFilter() {
        if (activeTagButton) activeTagButton.classList.remove('active');
        activeTagButton = null;
        activeTag = null;
        applyCombinedFilter();
    }

    function resetCategoryFilter() {
        if (activeCategoryButton) activeCategoryButton.classList.remove('active');
        activeCategoryButton = null;
        activeCategory = null;
        applyCombinedFilter();
    }

    function updateFilterCount() {
        if (isFiltered) {
            elements.filterCount.style.display = 'block';
            elements.filterCount.textContent = `Mostrando ${loadedItems || itemsPerPage} de ${filteredItems.length} imágenes`;
        } else {
            elements.filterCount.style.display = 'none';
            elements.filterCount.textContent = '';
        }
    }

    function updateFilterIndicator() {
        let indicatorText = '';
        if (activeTag && activeCategory) {
            indicatorText = `${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} + ${activeTag}`;
        } else if (activeTag) {
            indicatorText = activeTag;
        } else if (activeCategory && activeCategory !== 'all') {
            indicatorText = activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1);
        }
        elements.filterIndicator.textContent = indicatorText ? `Filtro: ${indicatorText}` : '';
    }

    function scrollToGallery() {
        elements.gallery.scrollIntoView({ behavior: 'smooth' });
    }

    // Restaurar filtro
    function restoreFilter() {
        const lastFilter = localStorage.getItem('lastFilter');
        const lastFilterType = localStorage.getItem('lastFilterType');
        if (lastFilter) {
            if (lastFilterType === 'search') {
                elements.searchInput.value = lastFilter;
                filterBySearch(lastFilter);
            } else if (lastFilterType === 'tag') {
                const tagButton = Array.from(elements.tagsSection.querySelectorAll('.tag-button')).find(btn => btn.textContent === lastFilter);
                if (tagButton) filterByTag(lastFilter, tagButton);
            } else if (lastFilterType === 'category') {
                const categoryButton = Array.from(elements.categories.querySelectorAll('.category-button')).find(btn => btn.dataset.category === lastFilter);
                if (categoryButton) filterByCategory(lastFilter, categoryButton);
            }
        }
    }

    // Eventos
    let searchTimeout;
    elements.searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => filterBySearch(this.value.toLowerCase().trim()), 300);
    });

    elements.resetButton.addEventListener('click', resetFilters);
    elements.resetTagButton.addEventListener('click', resetTagFilter);
    elements.resetCategoryButton.addEventListener('click', resetCategoryFilter);
});