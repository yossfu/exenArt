document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        loader: document.getElementById('loader'),
        header: document.getElementById('header'),
        mainContent: document.getElementById('main-content'),
        footer: document.querySelector('footer'),
        themeToggle: document.getElementById('theme-toggle'),
        menuToggle: document.getElementById('menu-toggle'),
        menu: document.getElementById('menu'),
        menuClose: document.getElementById('menu-close'),
        imageTitle: document.getElementById('image-title'),
        fullImage: document.getElementById('full-image'),
        imageDescription: document.getElementById('image-description'),
        similarImagesGrid: document.getElementById('similar-images-grid'),
        utterancesContainer: document.getElementById('utterances-container'),
        chatToggle: document.getElementById('chat-toggle'),
        chatPopup: document.getElementById('chat-popup'),
        chatClose: document.getElementById('chat-close'),
        chatIframe: document.getElementById('chat-iframe')
    };

    elements.header.style.display = 'block';
    elements.mainContent.style.display = 'block';
    elements.footer.style.display = 'block';

    if (localStorage.getItem('darkTheme') === 'true') {
        document.body.classList.add('dark-theme');
    }
    elements.themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        localStorage.setItem('darkTheme', document.body.classList.contains('dark-theme'));
        updateUtterancesTheme();
    });

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

    const urlParams = new URLSearchParams(window.location.search);
    const imageId = urlParams.get('id') || 30;

    function fetchWithCache(url, cacheKey) {
        const version = 'v1';
        const cacheKeyWithVersion = `${cacheKey}_${version}`;
        const cachedData = localStorage.getItem(cacheKeyWithVersion);
        
        if (cachedData) {
            return Promise.resolve(JSON.parse(cachedData));
        }

        elements.loader.style.display = 'flex';
        return fetch(url)
            .then(response => response.json())
            .then(data => {
                localStorage.setItem(cacheKeyWithVersion, JSON.stringify(data));
                return data;
            })
            .catch(err => {
                console.error(`Fetch problem: ${err.message}`);
                elements.imageTitle.textContent = "Error al cargar la imagen";
                throw err;
            })
            .finally(() => elements.loader.style.display = 'none');
    }

    function lazyLoadImages() {
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        }, { rootMargin: '0px 0px 200px 0px' });
        document.querySelectorAll('.lazy').forEach(img => observer.observe(img));
    }

    elements.loader.style.display = 'flex';
    fetchWithCache('imagenes.json', 'cachedImages')
        .then(data => {
            const currentItem = data.find(img => img.id == imageId);
            if (currentItem) {
                elements.imageTitle.textContent = currentItem.title;
                elements.fullImage.dataset.src = currentItem.url;
                elements.fullImage.alt = currentItem.title;
                elements.imageDescription.textContent = currentItem.description || 'Sin descripción disponible';
                loadSimilarImages(currentItem.tags, data);
                loadUtterances(imageId);
                lazyLoadImages();
            } else {
                console.error("Imagen no encontrada");
                elements.imageTitle.textContent = "Imagen no encontrada";
            }
        })
        .finally(() => elements.loader.style.display = 'none');

    function loadSimilarImages(tags, allImages) {
        const fragment = document.createDocumentFragment();
        let similarImages = allImages
            .filter(item => item.id != imageId && item.tags.some(tag => tags.includes(tag)))
            .sort((a, b) => b.tags.filter(tag => tags.includes(tag)).length - a.tags.filter(tag => tags.includes(tag)).length)
            .slice(0, 6);

        similarImages.forEach(item => {
            const imageElement = document.createElement('div');
            imageElement.className = 'similar-note-item';
            imageElement.innerHTML = `
                <a href="image-detail.html?id=${item.id}">
                    <div style="position: relative;">
                        <img data-src="${item.url}" alt="${item.title}" class="lazy">
                        <div class="watermark">@exeneqiel</div>
                    </div>
                    <h3>${item.title}</h3>
                </a>`;
            fragment.appendChild(imageElement);
        });

        elements.similarImagesGrid.innerHTML = '';
        elements.similarImagesGrid.appendChild(fragment);
    }

    function loadUtterances(imageId) {
        elements.utterancesContainer.innerHTML = '';
        const script = document.createElement('script');
        script.src = 'https://utteranc.es/client.js';
        script.setAttribute('repo', 'yossfu/Gesti-n-de-comentarios');
        script.setAttribute('issue-term', `image-${imageId}`);
        script.setAttribute('theme', document.body.classList.contains('dark-theme') ? 'dark-blue' : 'github-light');
        script.setAttribute('crossorigin', 'anonymous');
        script.async = true;
        script.onload = () => elements.loader.style.display = 'none';
        elements.utterancesContainer.appendChild(script);
    }

    function updateUtterancesTheme() {
        setTimeout(() => {
            const iframe = elements.utterancesContainer.querySelector('iframe');
            if (iframe) {
                iframe.contentWindow.postMessage({
                    type: 'set-theme',
                    theme: document.body.classList.contains('dark-theme') ? 'dark-blue' : 'github-light'
                }, 'https://utteranc.es');
            }
        }, 100);
    }

    // Lógica del chat flotante con iframe
    let chatLoaded = false;

    function openChat() {
        elements.chatPopup.style.display = 'flex';
        if (!chatLoaded) {
            elements.chatIframe.src = 'https://html5-chat.com/chat/51441/67647612ece05';
            chatLoaded = true;
        }
    }

    function closeChat() {
        elements.chatPopup.style.display = 'none';
        elements.chatIframe.src = ''; // Limpiar el iframe al cerrar
        chatLoaded = false; // Reiniciar para recargar al abrir de nuevo
    }

    elements.chatToggle.addEventListener('click', openChat);
    elements.chatClose.addEventListener('click', closeChat);

    document.addEventListener('click', (event) => {
        if (!elements.chatPopup.contains(event.target) && !elements.chatToggle.contains(event.target) && elements.chatPopup.style.display === 'flex') {
            closeChat();
        }
    });
});