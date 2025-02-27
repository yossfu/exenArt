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

    // Verificación de edad persistente
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

        fetch('imagenes.json')
            .then(response => response.json())
            .then(data => {
                imagesData = data;
                renderImages(currentPage);
                generateRandomTags();
            })
            .catch(error => {
                console.error('Error cargando el JSON:', error);
                imageGrid.innerHTML = '<p style="text-align:center;color:#ff5722;">Error al cargar las imágenes. Por favor, intenta de nuevo más tarde.</p>';
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
        }, 250);
    }

    function loadMoreFilteredItems() {
        const loadingText = document.createElement('div');
        loadingText.className = 'loading-text active';
        loadingText.textContent = 'Cargando...';
        pagination.innerHTML = '';
        pagination.appendChild(loadingText);

        setTimeout(() => {
            const startIndex = loadedItems;
            const endIndex = Math.min(startIndex + itemsPerPage, filteredItems.length);

            filteredItems.slice(startIndex, endIndex).forEach(item => {
                const imageItem = document.createElement('div');
                imageItem.className = 'flex-item';
                imageItem.innerHTML = `
                    <a href="${item.redirectUrl}" aria-label="${item.title}">
                        <img src="${item.url}" alt="${item.title}">
                    </a>
                    <p>${item.title}</p>
                `;
                imageGrid.appendChild(imageItem);
            });

            loadedItems = endIndex;
            loadingText.classList.remove('active');

            const loadMoreButton = document.querySelector('.load-more-button');
            if (loadMoreButton) loadMoreButton.remove();

            if (loadedItems < filteredItems.length) {
                const newLoadMoreButton = document.createElement('button');
                newLoadMoreButton.className = 'load-more-button';
                newLoadMoreButton.textContent = 'Cargar más';
                newLoadMoreButton.addEventListener('click', loadMoreFilteredItems);
                pagination.innerHTML = '';
                pagination.appendChild(newLoadMoreButton);
            } else {
                pagination.innerHTML = '';
            }
        }, 500);
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
        }, 250);
    }

    function renderImages(page) {
        imageGrid.innerHTML = '';
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, imagesData.length);

        imagesData.slice(startIndex, endIndex).forEach(item => {
            const imageItem = document.createElement('div');
            imageItem.className = 'flex-item';
            imageItem.innerHTML = `
                <a href="${item.redirectUrl}" aria-label="${item.title}">
                    <img src="${item.url}" alt="${item.title}">
                </a>
                <p>${item.title}</p>
            `;
            imageGrid.appendChild(imageItem);
        });

        renderPagination(imagesData.length, filterByPage);

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
    }

    let debounceTimer;
    searchInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const searchTerm = this.value.toLowerCase().trim();
            imageGrid.classList.add('fade');
            setTimeout(() => {
                imageGrid.innerHTML = '';

                if (!searchTerm) {
                    renderImages(currentPage);
                    isFiltered = false;
                    resetButton.classList.remove('active');
                } else {
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
                }
                imageGrid.classList.remove('fade');
            }, 250);
        }, 300);
    });

    resetButton.addEventListener('click', resetFilters);
});