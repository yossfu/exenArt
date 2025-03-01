// Configuración de Firebase (usar secreto de GitHub o valor temporal local)
const firebaseConfig = JSON.parse(process.env.FIREBASE_API_KEY || '{}');
    authDomain: "likesparati-2af8a.firebaseapp.com",
    databaseURL: "https://likesparati-2af8a-default-rtdb.firebaseio.com", // Corrección del URL
    projectId: "likesparati-2af8a",
    storageBucket: "likesparati-2af8a.firebasestorage.app",
    messagingSenderId: "97227020218",
    appId: "1:97227020218:web:8e64d8a325405ea85faf83",
    measurementId: "G-T4KWYCP8QH"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

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
        menuClose: document.getElementById('menu-close'),
        chatToggle: document.getElementById('chat-toggle'),
        chatPopup: document.getElementById('chat-popup'),
        chatClose: document.getElementById('chat-close')
    };

    const itemsPerPage = 15;
    let currentPage = 1;
    let imagesData = [];
    let notesData = [];
    let sliderData = [];
    let currentSlide = 0;
    let isFiltered = false;
    let filteredItems = [];
    let loadedItems = 0;
    let activeTagButton = null;
    let activeCategoryButton = null;
    let activeTag = null;
    let activeCategory = null;
    let filterCache = new Map();

    const tagColors = ['#ef5350', '#f06292', '#e57373', '#ff8a80', '#ffab91', '#ff8a65', '#ff7043', '#ff5722', '#f4511e', '#e64a19'];
    const categoryIcons = {
        'all': 'https://cdn-icons-png.flaticon.com/512/1665/1665731.png',
        'furry': 'https://cdn-icons-png.flaticon.com/512/16781/16781787.png',
        'anime': 'https://cdn-icons-png.flaticon.com/512/1881/1881121.png',
        'realismo': 'https://cdn-icons-png.flaticon.com/512/11178/11178222.png',
        'angelical': 'https://cdn-icons-png.flaticon.com/512/10291/10291922.png',
        'evil': 'https://cdn-icons-png.flaticon.com/512/2855/2855658.png'
    };

    if (localStorage.getItem('darkTheme') === 'true') document.body.classList.add('dark-theme');
    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            localStorage.setItem('darkTheme', document.body.classList.contains('dark-theme'));
            if (typeof updateUtterancesTheme === 'function') updateUtterancesTheme();
        });
    }

    if (elements.ageVerification) {
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
    }

    if (elements.revokeAge) {
        elements.revokeAge.addEventListener('click', () => {
            localStorage.clear();
            location.reload();
        });
    }

    if (elements.scrollTopButton) {
        elements.scrollTopButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        window.addEventListener('scroll', () => {
            elements.scrollTopButton.classList.toggle('visible', window.scrollY > 200);
        });
    }

    function toggleMenu() {
        if (elements.menu && elements.menuToggle) {
            elements.menu.classList.toggle('active');
            elements.menuToggle.classList.toggle('open');
        }
    }

    function closeMenu() {
        if (elements.menu && elements.menuToggle) {
            elements.menu.classList.remove('active');
            elements.menuToggle.classList.remove('open');
        }
    }

    if (elements.menuToggle && elements.menu && elements.menuClose) {
        elements.menuToggle.addEventListener('click', toggleMenu);
        elements.menuClose.addEventListener('click', closeMenu);
        document.addEventListener('click', (event) => {
            if (elements.menu && elements.menuToggle && !elements.menu.contains(event.target) && !elements.menuToggle.contains(event.target) && elements.menu.classList.contains('active')) {
                closeMenu();
            }
        });
        if (elements.menu) {
            elements.menu.querySelectorAll('.tab-button').forEach(link => link.addEventListener('click', closeMenu));
        }
    }

    function showMainContent() {
        if (elements.ageVerification) elements.ageVerification.style.display = 'none';
        if (elements.header) elements.header.style.display = 'block';
        if (elements.mainContent) elements.mainContent.style.display = 'block';
        if (elements.gallery) elements.gallery.style.display = 'block';
        if (elements.pagination) elements.pagination.style.display = 'block';
        if (elements.footer) elements.footer.style.display = 'block';
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

        if (elements.loader) elements.loader.style.display = 'flex';
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
            .finally(() => { if (elements.loader) elements.loader.style.display = 'none'; });
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
        if (elements.sliderContainer) {
            elements.sliderContainer.innerHTML = '';
            elements.sliderContainer.appendChild(fragment);
            lazyLoadImages(elements.sliderContainer);
        }
    }

    function startSlider() {
        if (elements.sliderContainer) {
            const slides = elements.sliderContainer.children;
            const totalSlides = slides.length;
            elements.sliderContainer.style.setProperty('--total-slides', totalSlides);
            setInterval(() => {
                currentSlide = (currentSlide + 1) % totalSlides;
                elements.sliderContainer.style.transform = `translateX(-${currentSlide * (100 / totalSlides)}%)`;
            }, 5000);
        }
    }

    function startPage() {
        Promise.all([
            fetchWithCache('slider.json', 'cachedSlider', elements.sliderContainer, data => {
                sliderData = data;
                renderSlider(sliderData);
                startSlider();
            }),
            fetchWithCache('imagenes.json', 'cachedImages', elements.imageGrid, data => {
                imagesData = data;
                renderImages(currentPage);
                generateRandomTags();
                generateCategories();
                restoreFilter();
            }),
            fetchWithCache('notes.json', 'cachedNotes', elements.featuredNotes, data => {
                notesData = data;
                renderFeaturedNotes();
            })
        ]).catch(error => console.error('Error en startPage:', error));
    }

    function renderImages(page) {
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, isFiltered ? filteredItems.length : imagesData.length);
        const itemsToRender = isFiltered ? filteredItems : imagesData;
        const newItems = itemsToRender.slice(startIndex, endIndex);
        const currentItems = Array.from(elements.imageGrid?.children || []);

        if (currentItems.length === newItems.length && 
            currentItems.every((item, i) => item.querySelector('img').dataset.src === newItems[i].url)) {
            return;
        }

        const fragment = document.createDocumentFragment();
        newItems.forEach((item, index) => {
            const imageItem = document.createElement('div');
            imageItem.className = 'flex-item';
            imageItem.style.animationDelay = `${index * 0.1}s`;
            imageItem.innerHTML = `
                <a href="image-detail.html?id=${item.id}" aria-label="${item.title}">
                    <img data-src="${item.url}" alt="${item.title}" class="lazy">
                </a>
                <p>${item.title}</p>
                <div class="like-container">
                    <button class="like-button" data-id="${item.id}">❤️</button>
                    <span class="like-count" data-id="${item.id}">0</span>
                </div>
            `;
            fragment.appendChild(imageItem);

            // Cargar likes desde Firebase
            const likeRef = db.ref(`likes/${item.id}`);
            likeRef.on('value', (snapshot) => {
                const likes = snapshot.val() || 0;
                const likeCount = imageItem.querySelector(`.like-count[data-id="${item.id}"]`);
                if (likeCount) likeCount.textContent = likes;
                else console.error('like-count no encontrado para photoId:', item.id);
            });
        });

        if (elements.imageGrid) {
            elements.imageGrid.innerHTML = '';
            elements.imageGrid.appendChild(fragment);
            lazyLoadImages(elements.imageGrid);
            renderPagination(isFiltered ? filteredItems.length : imagesData.length, page => {
                currentPage = page;
                renderImages(currentPage);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            updateFilterCount();
            updateFilterIndicator();
            addLikeListeners();
        }
    }

    function addLikeListeners() {
        document.querySelectorAll('.like-button').forEach(button => {
            button.addEventListener('click', () => {
                const photoId = button.dataset.id;
                const likeRef = db.ref(`likes/${photoId}`);
                likeRef.transaction((currentLikes) => {
                    return (currentLikes || 0) + 1;
                }, (error, committed, snapshot) => {
                    if (error) console.error('Error en transacción:', error);
                    else if (committed) {
                        const newLikes = snapshot.val();
                        button.nextElementSibling.textContent = newLikes;
                    }
                });
            });
        });
    }

    function renderPagination(totalItems, pageHandler) {
        if (elements.pagination) {
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
    }

    function renderFeaturedNotes() {
        if (elements.featuredNotes) {
            const fragment = document.createDocumentFragment();
            const shuffledNotes = [...notesData].sort(() => 0.5 - Math.random()).slice(0, 4);

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
            elements.featuredNotes.innerHTML = '';
            elements.featuredNotes.appendChild(fragment);
            lazyLoadImages(elements.featuredNotes);
        }
    }

    function generateRandomTags() {
        if (elements.tagsSection && imagesData.length > 0) {
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
                elements.tagsSection.appendChild(tagButton);
            });
        }
    }

    function generateCategories() {
        if (elements.categories) {
            elements.categories.innerHTML = '';
            Object.keys(categoryIcons).forEach((category, index) => {
                const categoryButton = document.createElement('button');
                categoryButton.className = 'category-button';
                categoryButton.dataset.category = category;
                categoryButton.innerHTML = `
                    <img data-src="${categoryIcons[category]}" alt="${category}" class="lazy">
                    <span>${category.charAt(0).toUpperCase() + category.slice(1)}</span>
                `;
                categoryButton.style.animationDelay = `${index * 0.1}s`;
                elements.categories.appendChild(categoryButton);
            });
            lazyLoadImages(elements.categories);
        }
    }

    function filterByTag(tag, button) {
        if (activeTagButton && elements.tagsSection) activeTagButton.classList.remove('active');
        if (button && elements.tagsSection) button.classList.add('active');
        activeTagButton = button;
        activeTag = tag;
        currentPage = 1;
        applyCombinedFilter();
        scrollToGallery();
    }

    function filterByCategory(category, button) {
        if (activeCategoryButton && elements.categories) activeCategoryButton.classList.remove('active');
        if (button && elements.categories) button.classList.add('active');
        activeCategoryButton = button;
        activeCategory = category === 'all' ? null : category;
        currentPage = 1;
        applyCombinedFilter();
        scrollToGallery();
    }

    function applyCombinedFilter() {
        const cacheKey = `${activeTag || ''}_${activeCategory || ''}`;
        if (filterCache.has(cacheKey) && elements.imageGrid) {
            filteredItems = filterCache.get(cacheKey);
            renderImages(currentPage);
            return;
        }

        if (elements.loader && elements.imageGrid) {
            elements.loader.style.display = 'flex';
            elements.imageGrid.classList.add('fade');
            setTimeout(() => {
                filteredItems = imagesData.filter(item => {
                    const tagMatch = !activeTag || item.tags.includes(activeTag);
                    const categoryMatch = !activeCategory || item.tags.includes(activeCategory);
                    return tagMatch && categoryMatch;
                });
                filterCache.set(cacheKey, filteredItems);
                isFiltered = activeTag || activeCategory;
                renderImages(currentPage);
                if (elements.resetButton) elements.resetButton.classList.toggle('active', isFiltered);
                if (elements.resetTagButton) elements.resetTagButton.classList.toggle('active', !!activeTag);
                if (elements.resetCategoryButton) elements.resetCategoryButton.classList.toggle('active', !!activeCategory);
                elements.imageGrid.classList.remove('fade');
                elements.loader.style.display = 'none';
                localStorage.setItem('lastFilter', activeTag || activeCategory || '');
                localStorage.setItem('lastFilterType', activeTag ? 'tag' : activeCategory ? 'category' : '');
                if (!activeTag && elements.searchInput) elements.searchInput.value = '';
            }, 100);
        }
    }

    function filterBySearch(searchTerm) {
        if (elements.loader && elements.imageGrid) {
            elements.loader.style.display = 'flex';
            elements.imageGrid.classList.add('fade');
            setTimeout(() => {
                if (activeTagButton && elements.tagsSection) activeTagButton.classList.remove('active');
                if (activeCategoryButton && elements.categories) activeCategoryButton.classList.remove('active');
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
                isFiltered = true;
                currentPage = 1;
                renderImages(currentPage);
                if (elements.resetButton) elements.resetButton.classList.add('active');
                if (elements.resetTagButton) elements.resetTagButton.classList.remove('active');
                if (elements.resetCategoryButton) elements.resetCategoryButton.classList.remove('active');
                elements.imageGrid.classList.remove('fade');
                elements.loader.style.display = 'none';
                localStorage.setItem('lastFilter', searchTerm);
                localStorage.setItem('lastFilterType', 'search');
            }, 100);
        }
    }

    function resetFilters() {
        if (elements.loader && elements.imageGrid) {
            elements.loader.style.display = 'flex';
            elements.imageGrid.classList.add('fade');
            setTimeout(() => {
                if (activeTagButton && elements.tagsSection) activeTagButton.classList.remove('active');
                if (activeCategoryButton && elements.categories) activeCategoryButton.classList.remove('active');
                activeTagButton = null;
                activeCategoryButton = null;
                activeTag = null;
                activeCategory = null;
                filteredItems = [];
                isFiltered = false;
                currentPage = 1;
                renderImages(currentPage);
                elements.imageGrid.classList.remove('fade');
                elements.loader.style.display = 'none';
                if (elements.resetButton) elements.resetButton.classList.remove('active');
                if (elements.resetTagButton) elements.resetTagButton.classList.remove('active');
                if (elements.resetCategoryButton) elements.resetCategoryButton.classList.remove('active');
                updateFilterCount();
                updateFilterIndicator();
                localStorage.removeItem('lastFilter');
                localStorage.removeItem('lastFilterType');
                if (elements.searchInput) elements.searchInput.value = '';
            }, 100);
        }
    }

    function resetTagFilter() {
        if (activeTagButton && elements.tagsSection) activeTagButton.classList.remove('active');
        activeTagButton = null;
        activeTag = null;
        currentPage = 1;
        applyCombinedFilter();
    }

    function resetCategoryFilter() {
        if (activeCategoryButton && elements.categories) activeCategoryButton.classList.remove('active');
        activeCategoryButton = null;
        activeCategory = null;
        currentPage = 1;
        applyCombinedFilter();
    }

    function updateFilterCount() {
        if (elements.filterCount && isFiltered) {
            elements.filterCount.style.display = 'block';
            elements.filterCount.textContent = `Mostrando ${Math.min(itemsPerPage, filteredItems.length)} de ${filteredItems.length} imágenes`;
        } else if (elements.filterCount) {
            elements.filterCount.style.display = 'none';
            elements.filterCount.textContent = '';
        }
    }

    function updateFilterIndicator() {
        if (elements.filterIndicator) {
            let indicatorText = '';
            if (activeTag && activeCategory) {
                indicatorText = `${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} + ${activeTag}`;
            } else if (activeTag) {
                indicatorText = activeTag;
            } else if (activeCategory) {
                indicatorText = activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1);
            }
            elements.filterIndicator.textContent = indicatorText ? `Filtro: ${indicatorText}` : '';
        }
    }

    function scrollToGallery() {
        if (elements.gallery) {
            elements.gallery.scrollIntoView({ behavior: 'smooth' });
        }
    }

    function restoreFilter() {
        const lastFilter = localStorage.getItem('lastFilter');
        const lastFilterType = localStorage.getItem('lastFilterType');
        if (lastFilter && elements.searchInput) {
            if (lastFilterType === 'search') {
                elements.searchInput.value = lastFilter;
                filterBySearch(lastFilter);
            } else if (lastFilterType === 'tag') {
                const tagButton = Array.from(elements.tagsSection?.querySelectorAll('.tag-button') || []).find(btn => btn.textContent === lastFilter);
                if (tagButton) filterByTag(lastFilter, tagButton);
            } else if (lastFilterType === 'category') {
                const categoryButton = Array.from(elements.categories?.querySelectorAll('.category-button') || []).find(btn => btn.dataset.category === lastFilter);
                if (categoryButton) filterByCategory(lastFilter, categoryButton);
            }
        }
    }

    let searchTimeout;
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => filterBySearch(this.value.toLowerCase().trim()), 300);
        });
    }

    if (elements.resetButton) elements.resetButton.addEventListener('click', resetFilters);
    if (elements.resetTagButton) elements.resetTagButton.addEventListener('click', resetTagFilter);
    if (elements.resetCategoryButton) elements.resetCategoryButton.addEventListener('click', resetCategoryFilter);

    if (elements.tagsSection) {
        elements.tagsSection.addEventListener('click', (e) => {
            const tagButton = e.target.closest('.tag-button');
            if (tagButton) {
                const tag = tagButton.textContent;
                filterByTag(tag, tagButton);
                scrollToGallery();
            }
        });
    }

    if (elements.categories) {
        elements.categories.addEventListener('click', (e) => {
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

    if (window.location.pathname.endsWith('index.html') && elements.chatToggle && elements.chatPopup && elements.chatClose) {
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

                    const chatContent = elements.chatPopup.querySelector('.chat-content');
                    chatContent.innerHTML = '';
                    chatContent.appendChild(chatSpan);
                };
                document.head.appendChild(script);

                chatLoaded = true;
            }
        }

        function toggleChat() {
            if (elements.chatPopup.style.display === 'flex') {
                elements.chatPopup.style.display = 'none';
            } else {
                elements.chatPopup.style.display = 'flex';
                initializeChat();
            }
        }

        function closeChat() {
            elements.chatPopup.style.display = 'none';
        }

        elements.chatToggle.addEventListener('click', toggleChat);
        elements.chatClose.addEventListener('click', closeChat);

        document.addEventListener('click', (event) => {
            if (!elements.chatPopup.contains(event.target) && !elements.chatToggle.contains(event.target) && elements.chatPopup.style.display === 'flex') {
                closeChat();
            }
        });
    }
});

document.head.insertAdjacentHTML('beforeend', `
    <style>
        .lazy { opacity: 0; transition: opacity 0.3s; }
        .lazy[src] { opacity: 1; }
        .social-icon { width: 30px; height: 30px; transition: transform 0.3s ease; }
        .social-icon:hover { transform: scale(1.1); }
        .like-container { display: flex; align-items: center; justify-content: center; gap: 5px; margin-top: 5px; }
        .like-button { background: none; border: none; cursor: pointer; font-size: 1rem; padding: 0; }
        .like-count { font-size: 0.85rem; color: #d32f2f; }
        .dark-theme .like-count { color: #ef5350; }
    </style>
    <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"></script>
    <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js"></script>
`);