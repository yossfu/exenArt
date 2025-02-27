document.addEventListener('DOMContentLoaded', () => {
    const imageGrid = document.getElementById('image-grid');
    const searchInput = document.getElementById('search');
    const pagination = document.getElementById('pagination');
    const sliderContainer = document.getElementById('slider-container');
    const tagsSection = document.getElementById('tags-section');
    const resetButton = document.getElementById('reset-button');
    const resetTagButton = document.getElementById('reset-tag');
    const resetCategoryButton = document.getElementById('reset-category');
    const ageVerification = document.getElementById('age-verification');
    const ageYes = document.getElementById('age-yes');
    const ageNo = document.getElementById('age-no');
    const header = document.getElementById('header');
    const mainContent = document.getElementById('main-content');
    const gallery = document.getElementById('gallery');
    const footer = document.querySelector('footer');
    const revokeAge = document.getElementById('revoke-age');
    const loader = document.getElementById('loader');
    const themeToggle = document.getElementById('theme-toggle');
    const filterCount = document.getElementById('filter-count');
    const filterIndicator = document.getElementById('filter-indicator');
    const scrollTopButton = document.getElementById('scroll-top');
    const featuredNotes = document.getElementById('featured-notes');
    const categories = document.getElementById('categories');
    const menuToggle = document.getElementById('menu-toggle');
    const menu = document.getElementById('menu');
    const menuClose = document.getElementById('menu-close');
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

    if (localStorage.getItem('darkTheme') === 'true') {
        document.body.classList.add('dark-theme');
    }

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        localStorage.setItem('darkTheme', document.body.classList.contains('dark-theme'));
    });

    if (localStorage.getItem('ageVerified') === 'true') {
        ageVerification.style.display = 'none';
        header.style.display = 'block';
        mainContent.style.display = 'block';
        gallery.style.display = 'block';
        pagination.style.display = 'block';
        footer.style.display = 'block';
        startPage();
    } else {
        ageYes.addEventListener('click', () => {
            localStorage.setItem('ageVerified', 'true');
            ageVerification.style.display = 'none';
            header.style.display = 'block';
            mainContent.style.display = 'block';
            gallery.style.display = 'block';
            pagination.style.display = 'block';
            footer.style.display = 'block';
            startPage();
        });

        ageNo.addEventListener('click', () => {
            window.location.href = 'https://m.kiddle.co/';
        });
    }

    revokeAge.addEventListener('click', () => {
        localStorage.removeItem('ageVerified');
        localStorage.removeItem('lastFilter');
        localStorage.removeItem('lastFilterType');
        location.reload();
    });

    scrollTopButton.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('scroll', () => {
        if (window.scrollY > 200) {
            scrollTopButton.classList.add('visible');
        } else {
            scrollTopButton.classList.remove('visible');
        }
    });

    // Manejo del menú
    function toggleMenu() {
        menu.classList.toggle('active');
        menuToggle.classList.toggle('open');
    }

    function closeMenu() {
        menu.classList.remove('active');
        menuToggle.classList.remove('open');
    }

    menuToggle.addEventListener('click', toggleMenu);
    menuClose.addEventListener('click', closeMenu);

    // Cerrar menú al hacer clic fuera
    document.addEventListener('click', (event) => {
        if (!menu.contains(event.target) && !menuToggle.contains(event.target) && menu.classList.contains('active')) {
            closeMenu();
        }
    });

    // Cerrar menú al seleccionar una opción
    const menuLinks = menu.querySelectorAll('.tab-button');
    menuLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    function startPage() {
        const slides = sliderContainer.children;
        const totalSlides = slides.length;
        const slideInterval = 5000;

        function updateSlide() {
            sliderContainer.style.transform = `translateX(-${currentSlide * 50}%)`;
        }

        function nextSlide() {
            currentSlide = (currentSlide + 1) % totalSlides;
            updateSlide();
        }

        setInterval(nextSlide, slideInterval);

        loader.style.display = 'flex';
        const cachedImages = localStorage.getItem('cachedImages');
        const cachedNotes = localStorage.getItem('cachedNotes');

        if (cachedImages) {
            imagesData = JSON.parse(cachedImages);
            renderImages(currentPage);
            generateRandomTags();
            generateCategories();
            addCategoryListeners();
            restoreFilter();
        }

        if (cachedNotes) {
            notesData = JSON.parse(cachedNotes);
            renderFeaturedNotes();
        }

        fetch('imagenes.json')
            .then(response => response.json())
            .then(data => {
                imagesData = data;
                localStorage.setItem('cachedImages', JSON.stringify(data));
                renderImages(currentPage);
                generateRandomTags();
                generateCategories();
                addCategoryListeners();
                restoreFilter();
            })
            .catch(error => {
                console.error('Error cargando imágenes:', error);
                if (!cachedImages) {
                    imageGrid.innerHTML = '<p style="text-align:center;color:#ff5722;">Error al cargar las imágenes.</p>';
                }
            })
            .finally(() => {
                // No ocultar loader aquí, esperar a que ambas peticiones terminen
            });

        fetch('notes.json')
            .then(response => response.json())
            .then(data => {
                notesData = data;
                localStorage.setItem('cachedNotes', JSON.stringify(data));
                renderFeaturedNotes();
            })
            .catch(error => {
                console.error('Error cargando notas destacadas:', error);
                if (!cachedNotes) {
                    featuredNotes.innerHTML = '<p style="text-align:center;color:#ff5722;">Error al cargar las notas destacadas.</p>';
                }
            })
            .finally(() => {
                loader.style.display = 'none';
            });

        resetTagButton.addEventListener('click', resetTagFilter);
        resetCategoryButton.addEventListener('click', resetCategoryFilter);
    }

    function restoreFilter() {
        const lastFilter = localStorage.getItem('lastFilter');
        const lastFilterType = localStorage.getItem('lastFilterType');
        if (lastFilter) {
            if (lastFilterType === 'search') {
                searchInput.value = lastFilter;
                filterBySearch(lastFilter);
            } else if (lastFilterType === 'tag') {
                const tagButton = Array.from(tagsSection.querySelectorAll('.tag-button')).find(btn => btn.textContent === lastFilter);
                if (tagButton) filterByTag(lastFilter, tagButton);
            } else if (lastFilterType === 'category') {
                const categoryButton = Array.from(categories.querySelectorAll('.category-button')).find(btn => btn.dataset.category === lastFilter);
                if (categoryButton) filterByCategory(lastFilter, categoryButton);
            }
        }
    }

    function renderFeaturedNotes() {
        featuredNotes.innerHTML = '';
        const shuffledNotes = [...notesData].sort(() => 0.5 - Math.random());
        const selectedNotes = shuffledNotes.slice(0, 4);

        selectedNotes.forEach(note => {
            const card = document.createElement('a');
            card.className = 'featured-card';
            card.href = `note.html?id=${note.id}`;
            card.innerHTML = `
                <img src="${note.image}" alt="${note.title}">
                <h3>${note.title}</h3>
                <p>${note.summary || note.content.substring(0, 100) + '...'}</p>
            `;
            featuredNotes.appendChild(card);
        });
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

        tagsSection.innerHTML = '';
        tagsSection.appendChild(resetButton);
        tagsSection.appendChild(resetTagButton);
        tagsSection.appendChild(resetCategoryButton);

        randomTags.forEach(tag => {
            const tagButton = document.createElement('button');
            tagButton.className = 'tag-button';
            tagButton.textContent = tag;
            tagButton.style.backgroundColor = tagColors[Math.floor(Math.random() * tagColors.length)];
            tagButton.addEventListener('click', () => {
                filterByTag(tag, tagButton);
                scrollToGallery();
            });
            tagsSection.appendChild(tagButton);
        });
    }

    function generateCategories() {
        categories.innerHTML = '';
        const predefinedCategories = Object.keys(categoryIcons);

        predefinedCategories.forEach((category, index) => {
            const categoryButton = document.createElement('button');
            categoryButton.className = 'category-button';
            categoryButton.dataset.category = category;
            categoryButton.innerHTML = `
                <img src="${categoryIcons[category]}" alt="${category}">
                <span>${category.charAt(0).toUpperCase() + category.slice(1)}</span>
            `;
            categoryButton.style.animationDelay = `${index * 0.1}s`;
            categories.appendChild(categoryButton);
        });
    }

    function addCategoryListeners() {
        const categoryButtons = categories.querySelectorAll('.category-button');
        categoryButtons.forEach(button => {
            button.addEventListener('click', () => {
                const category = button.dataset.category;
                filterByCategory(category, button);
            });
        });
    }

    function applyCombinedFilter() {
        imageGrid.classList.add('fade');
        setTimeout(() => {
            imageGrid.innerHTML = '';
            filteredItems = imagesData.filter(item => {
                const tagMatch = !activeTag || item.tags.includes(activeTag);
                const categoryMatch = !activeCategory || activeCategory === 'all' || item.tags.includes(activeCategory);
                return tagMatch && categoryMatch;
            });
            loadedItems = 0;
            loadMoreFilteredItems();
            isFiltered = activeTag || activeCategory;
            resetButton.classList.toggle('active', isFiltered);
            resetTagButton.classList.toggle('active', !!activeTag);
            resetCategoryButton.classList.toggle('active', !!activeCategory);
            imageGrid.classList.remove('fade');
            updateFilterCount();
            updateFilterIndicator();
            if (!activeTag) localStorage.setItem('lastFilter', activeCategory || '');
            else localStorage.setItem('lastFilter', activeTag);
            localStorage.setItem('lastFilterType', activeTag ? 'tag' : 'category');
            if (!activeTag) searchInput.value = '';
        }, 100);
    }

    function filterByTag(tag, button) {
        if (activeTagButton && activeTagButton !== button) activeTagButton.classList.remove('active');
        button.classList.add('active');
        activeTagButton = button;
        activeTag = tag;

        applyCombinedFilter();
        scrollToGallery();
    }

    function filterByCategory(category, button) {
        if (activeCategoryButton && activeCategoryButton !== button) activeCategoryButton.classList.remove('active');
        button.classList.add('active');
        activeCategoryButton = button;
        activeCategory = category;

        applyCombinedFilter();
    }

    function filterBySearch(searchTerm) {
        imageGrid.classList.add('fade');
        setTimeout(() => {
            imageGrid.innerHTML = '';
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
            loadMoreFilteredItems();
            isFiltered = true;
            resetButton.classList.add('active');
            resetTagButton.classList.remove('active');
            resetCategoryButton.classList.remove('active');
            imageGrid.classList.remove('fade');
            updateFilterCount();
            updateFilterIndicator();
            localStorage.setItem('lastFilter', searchTerm);
            localStorage.setItem('lastFilterType', 'search');
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

    function loadMoreFilteredItems() {
        const loadMoreButton = pagination.querySelector('.load-more-button');
        if (loadMoreButton) loadMoreButton.classList.add('loading');

        const startIndex = loadedItems;
        const endIndex = Math.min(startIndex + itemsPerPage, filteredItems.length);

        filteredItems.slice(startIndex, endIndex).forEach((item, index) => {
            const imageItem = document.createElement('div');
            imageItem.className = 'flex-item';
            imageItem.style.animationDelay = `${index * 0.1}s`;
            imageItem.innerHTML = `
                <a href="${item.redirectUrl}" aria-label="${item.title}">
                    <img src="${item.url}" alt="${item.title}">
                </a>
                <p>${item.title}</p>
            `;
            imageGrid.appendChild(imageItem);
        });

        loadedItems = endIndex;

        pagination.innerHTML = '';
        if (loadedItems < filteredItems.length) {
            const newLoadMoreButton = document.createElement('button');
            newLoadMoreButton.className = 'load-more-button';
            newLoadMoreButton.textContent = 'Cargar más';
            newLoadMoreButton.addEventListener('click', loadMoreFilteredItems);
            setTimeout(() => {
                pagination.appendChild(newLoadMoreButton);
                updateFilterCount();
            }, 500);
        } else {
            updateFilterCount();
        }
    }

    function updateFilterCount() {
        if (isFiltered) {
            filterCount.style.display = 'block';
            filterCount.textContent = `Mostrando ${loadedItems} de ${filteredItems.length} imágenes`;
        } else {
            filterCount.style.display = 'none';
            filterCount.textContent = '';
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
        filterIndicator.textContent = indicatorText ? `Filtro: ${indicatorText}` : '';
    }

    function resetFilters() {
        imageGrid.classList.add('fade');
        setTimeout(() => {
            if (activeTagButton) activeTagButton.classList.remove('active');
            if (activeCategoryButton) activeCategoryButton.classList.remove('active');
            activeTagButton = null;
            activeCategoryButton = null;
            activeTag = null;
            activeCategory = null;
            imageGrid.innerHTML = '';
            renderImages(currentPage);
            imageGrid.classList.remove('fade');
            isFiltered = false;
            resetButton.classList.remove('active');
            resetTagButton.classList.remove('active');
            resetCategoryButton.classList.remove('active');
            updateFilterCount();
            updateFilterIndicator();
            localStorage.removeItem('lastFilter');
            localStorage.removeItem('lastFilterType');
            searchInput.value = '';
        }, 100);
    }

    function renderImages(page) {
        imageGrid.innerHTML = '';
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, imagesData.length);

        imagesData.slice(startIndex, endIndex).forEach((item, index) => {
            const imageItem = document.createElement('div');
            imageItem.className = 'flex-item';
            imageItem.style.animationDelay = `${index * 0.1}s`;
            imageItem.innerHTML = `
                <a href="${item.redirectUrl}" aria-label="${item.title}">
                    <img src="${item.url}" alt="${item.title}">
                </a>
                <p>${item.title}</p>
            `;
            imageGrid.appendChild(imageItem);
        });

        renderPagination(imagesData.length, filterByPage);
        updateFilterCount();
        updateFilterIndicator();

        function filterByPage(newPage) {
            currentPage = newPage;
            renderImages(currentPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    function renderPagination(tot