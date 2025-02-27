document.addEventListener('DOMContentLoaded', () => {
    const imageGrid = document.getElementById('image-grid');
    const searchInput = document.getElementById('search');
    const pagination = document.getElementById('pagination');
    const sliderContainer = document.getElementById('slider-container');
    const tagsSection = document.getElementById('tags-section');
    const resetButton = document.getElementById('reset-button');
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
    const scrollTopButton = document.getElementById('scroll-top');
    const itemsPerPage = 15;
    let currentPage = 1;
    let imagesData = [];
    let currentSlide = 0;
    let isFiltered = false;
    let filteredItems = [];
    let loadedItems = 0;
    let activeTagButton = null;

    const tagColors = [
        '#ef5350', '#f06292', '#e57373', '#ff8a80', '#ffab91',
        '#ff8a65', '#ff7043', '#ff5722', '#f4511e', '#e64a19'
    ];

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
        const cachedData = localStorage.getItem('cachedImages');
        if (cachedData) {
            imagesData = JSON.parse(cachedData);
            renderImages(currentPage);
            generateRandomTags();
            loader.style.display = 'none';
            restoreFilter();
        }

        fetch('imagenes.json')
            .then(response => response.json())
            .then(data => {
                imagesData = data;
                localStorage.setItem('cachedImages', JSON.stringify(data)); // Guardar para modo offline
                renderImages(currentPage);
                generateRandomTags();
                loader.style.display = 'none';
                restoreFilter();
            })
            .catch(error => {
                console.error('Error cargando el JSON:', error);
                if (!cachedData) {
                    imageGrid.innerHTML = '<p style="text-align:center;color:#ff5722;">Error al cargar las imágenes. Por favor, intenta de nuevo más tarde.</p>';
                }
                loader.style.display = 'none';
            });
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
            }
        }
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

        randomTags.forEach(tag => {
            const tagButton = document.createElement('button');
            tagButton.className = 'tag-button';
            tagButton.textContent = tag;
            tagButton.style.backgroundColor = tagColors[Math.floor(Math.random() * tagColors.length)];
            tagButton.addEventListener('click', () => filterByTag(tag, tagButton));
            tagsSection.appendChild(tagButton);
        });
    }

    function filterByTag(tag, button) {
        if (activeTagButton) activeTagButton.classList.remove('active');
        button.classList.add('active');
        activeTagButton = button;

        imageGrid.classList.add('fade');
        setTimeout(() => {
            imageGrid.innerHTML = '';
            filteredItems = imagesData.filter(item => item.tags.includes(tag));
            loadedItems = 0;
            loadMoreFilteredItems();
            isFiltered = true;
            resetButton.classList.add('active');
            imageGrid.classList.remove('fade');
            updateFilterCount();
            localStorage.setItem('lastFilter', tag);
            localStorage.setItem('lastFilterType', 'tag');
            searchInput.value = '';
        }, 100);
    }

    function filterBySearch(searchTerm) {
        imageGrid.classList.add('fade');
        setTimeout(() => {
            imageGrid.innerHTML = '';
            if (activeTagButton) activeTagButton.classList.remove('active');
            activeTagButton = null;
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
            imageGrid.classList.remove('fade');
            updateFilterCount();
            localStorage.setItem('lastFilter', searchTerm);
            localStorage.setItem('lastFilterType', 'search');
        }, 100);
    }

    function loadMoreFilteredItems() {
        const loadMoreButton = pagination.querySelector('.load-more-button');
        if (loadMoreButton) loadMoreButton.classList.add('loading');

        const startIndex = loadedItems;
        const endIndex = Math.min(startIndex + itemsPerPage, filteredItems.length);

        filteredItems.slice(startIndex, endIndex).forEach((item, index) => {
            const imageItem = document.createElement('div');
            imageItem.className = 'flex-item';
            imageItem.style.animationDelay = `${index * 0.1}s`; // Retraso escalonado
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

    function resetFilters() {
        imageGrid.classList.add('fade');
        setTimeout(() => {
            if (activeTagButton) activeTagButton.classList.remove('active');
            activeTagButton = null;
            imageGrid.innerHTML = '';
            renderImages(currentPage);
            imageGrid.classList.remove('fade');
            isFiltered = false;
            resetButton.classList.remove('active');
            updateFilterCount();
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
            imageItem.style.animationDelay = `${index * 0.1}s`; // Retraso escalonado
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

        function filterByPage(newPage) {
            currentPage = newPage;
            renderImages(currentPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    function renderPagination(totalItems, pageHandler) {
        pagination.innerHTML = '';
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        for (let i = 1; i <= totalPages; i++) {
            const button = document.createElement('button');
            button.textContent = i;
            button.disabled = i === currentPage;
            button.addEventListener('click', () => {
                pageHandler(i);
            });
            pagination.appendChild(button);
        }
        updateFilterCount();
    }

    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        filterBySearch(searchTerm);
    });

    resetButton.addEventListener('click', resetFilters);
});