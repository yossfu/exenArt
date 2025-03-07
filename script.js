document.addEventListener('DOMContentLoaded', async function () {
    const firebaseConfig = {
        apiKey: "AIzaSyBB7y-V0P_gKPWH-shvwrmZxHbdq-ASmj8",
        authDomain: "exene-53e6b.firebaseapp.com",
        databaseURL: "https://exene-53e6b-default-rtdb.firebaseio.com",
        projectId: "exene-53e6b",
        storageBucket: "exene-53e6b.firebasestorage.app",
        messagingSenderId: "481369419867",
        appId: "1:481369419867:web:ac5db24c436344262c8f7e"
    };

    firebase.initializeApp(firebaseConfig);
    const dbRealtime = firebase.database();
    const dbFirestore = firebase.firestore();

    let images = [];
    let filteredImages = [];
    let loadedImages = 0;
    const itemsPerLoad = 15;

    let deviceId = localStorage.getItem('deviceId') || 'device_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('deviceId', deviceId);
    let username = null;

    let unreadMessages = 0;

    function getColorFromUserId(userId) {
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = userId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = hash % 360;
        return `hsl(${hue}, 70%, 50%)`;
    }

    function updateTagScores(tags, action, imageId) {
        let tagScores = JSON.parse(localStorage.getItem('tagScores')) || {};
        let interactedImages = JSON.parse(localStorage.getItem('interactedImages')) || {};

        // Registrar la imagen como interactuada
        if (imageId) {
            interactedImages[imageId] = true;
            localStorage.setItem('interactedImages', JSON.stringify(interactedImages));
        }

        if (action === 'view') {
            if (tags.length > 0) {
                tagScores[tags[0]] = (tagScores[tags[0]] || 0) + 5;
                tags.slice(1).forEach(tag => {
                    tagScores[tag] = (tagScores[tag] || 0) + 2;
                });
            }
        } else if (action === 'like') {
            tags.forEach(tag => {
                tagScores[tag] = (tagScores[tag] || 0) + 3;
            });
        } else if (action === 'time') {
            tags.forEach(tag => {
                tagScores[tag] = (tagScores[tag] || 0) + 0.3;
            });
        }

        localStorage.setItem('tagScores', JSON.stringify(tagScores));
    }

    async function loadUsername() {
        const snapshot = await dbRealtime.ref(`users/${deviceId}`).once('value');
        const userData = snapshot.val();
        if (userData && userData.username) {
            username = userData.username;
            document.querySelectorAll('#user-info').forEach(el => el.textContent = username);
            if (document.getElementById('auth-container')) document.getElementById('auth-container').style.display = 'none';
        } else if (document.getElementById('auth-container')) {
            document.getElementById('auth-container').style.display = 'block';
        }
    }

    if (document.getElementById('username-form')) {
        document.getElementById('username-form').addEventListener('submit', async e => {
            e.preventDefault();
            const newUsername = document.getElementById('username').value.trim();
            if (newUsername) {
                await dbRealtime.ref(`users/${deviceId}`).set({ username: newUsername });
                username = newUsername;
                document.querySelectorAll('#user-info').forEach(el => el.textContent = username);
                document.getElementById('auth-container').style.display = 'none';
                if (document.querySelector('.gallery')) loadGallery();
            }
        });
    }

    await loadUsername();

    function setupSearch() {
        const searchToggle = document.getElementById('search-toggle');
        const searchContainer = document.getElementById('search-container');
        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('search-btn');
        const resetBtn = document.getElementById('reset-btn');
        const searchResults = document.getElementById('search-results');

        searchToggle.addEventListener('click', e => {
            e.preventDefault();
            const isVisible = searchContainer.style.display === 'none';
            searchContainer.style.display = isVisible ? 'flex' : 'none';
            gsap.to(searchContainer, { y: isVisible ? 0 : -100, opacity: isVisible ? 1 : 0, duration: 0.5 });
            if (isVisible) searchInput.focus();
        });

        searchBtn.addEventListener('click', () => displaySearchResults(searchInput.value.trim()));
        searchInput.addEventListener('input', () => displaySearchResults(searchInput.value.trim()));
        resetBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchResults.style.display = 'none';
            searchContainer.style.display = 'none';
        });

        function displaySearchResults(query) {
            if (!query) {
                searchResults.style.display = 'none';
                return;
            }
            const results = images.filter(img => 
                img.title.toLowerCase().includes(query.toLowerCase()) || 
                img.description.toLowerCase().includes(query.toLowerCase()) || 
                img.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
            );
            searchResults.innerHTML = results.length ? 
                results.map(img => `<div class="result-item" onclick="window.location.href='image-detail.html?id=${img.id}'"><img src="${img.url}" alt="${img.title}"><span>${img.title}</span></div>`).join('') : 
                '<p>No hay resultados</p>';
            searchResults.style.display = 'block';
            if (results.length) gsap.from('.result-item', { opacity: 0, y: 20, stagger: 0.1, duration: 0.5 });
        }
    }

    function setupLikes() {
        const likesToggle = document.getElementById('likes-toggle');
        const likesList = document.getElementById('likes-list');

        likesToggle.addEventListener('click', e => {
            e.preventDefault();
            const isVisible = likesList.style.display === 'none';
            likesList.style.display = isVisible ? 'block' : 'none';
            if (isVisible) {
                dbRealtime.ref('likes').once('value', snapshot => {
                    const likesData = snapshot.val() || {};
                    const likedImages = images.filter(img => likesData[img.id] && Object.keys(likesData[img.id]).length > 0);
                    likesList.innerHTML = likedImages.length ? 
                        likedImages.map(img => `
                            <div onclick="window.location.href='image-detail.html?id=${img.id}'">
                                <img src="${img.url}" alt="${img.title}">
                                <span>${img.title}</span>
                            </div>
                        `).join('') : 
                        '<p>No hay likes aún</p>';
                    if (likedImages.length) gsap.from(likesList.children, { opacity: 0, y: 20, stagger: 0.1, duration: 0.5 });
                });
            }
        });

        document.addEventListener('click', e => {
            if (e.target.closest('.like-btn')) {
                const btn = e.target.closest('.like-btn');
                const id = btn.dataset.id;
                dbRealtime.ref(`likes/${id}/${deviceId}`).once('value', snapshot => {
                    const isLiked = snapshot.val() === true;
                    dbRealtime.ref(`likes/${id}/${deviceId}`).set(!isLiked).then(() => {
                        btn.classList.toggle('liked');
                        gsap.to(btn.querySelector('i'), { scale: 1.2, duration: 0.2, yoyo: true, repeat: 1 });
                        if (!isLiked) {
                            const img = images.find(i => i.id === Number(id));
                            if (img) updateTagScores(img.tags, 'like', img.id);
                        }
                    });
                });
            }
        });
    }

    function setupChat() {
        const chatToggle = document.getElementById('chat-toggle');
        const chatWindow = document.getElementById('chat-window');
        const chatCloseBtn = document.getElementById('chat-close-btn');
        const chatForm = document.getElementById('chat-form');
        const chatInput = document.getElementById('chat-input');
        const chatMessages = document.getElementById('chat-messages');
        const emojiBtn = document.getElementById('emoji-btn');
        const emojiPicker = document.getElementById('emoji-picker');
        const chatNotification = document.getElementById('chat-notification');
        const emojis = ['😀', '😂', '😍', '😢', '😡', '👍', '👎', '❤️', '🔥', '🎉'];

        let lastMessageCount = 0;

        chatToggle.addEventListener('click', e => {
            e.preventDefault();
            const isVisible = chatWindow.style.display === 'none';
            chatWindow.style.display = isVisible ? 'block' : 'none';
            gsap.to(chatWindow, { y: isVisible ? 0 : 100, opacity: isVisible ? 1 : 0, duration: 0.5 });
            if (isVisible && !chatMessages.dataset.loaded) {
                loadChatMessages();
                chatMessages.dataset.loaded = 'true';
            }
            if (isVisible) {
                unreadMessages = 0;
                updateNotificationBadge();
            }
        });

        chatCloseBtn.addEventListener('click', () => {
            chatWindow.style.display = 'none';
            gsap.to(chatWindow, { y: 100, opacity: 0, duration: 0.5 });
        });

        chatForm.addEventListener('submit', async e => {
            e.preventDefault();
            const text = chatInput.value.trim();
            if (text && username) {
                await dbFirestore.collection('messages').add({
                    chatId: 'globalChat',
                    text,
                    timestamp: Date.now(),
                    userId: deviceId,
                    username
                });
                chatInput.value = '';
            }
        });

        emojiBtn.addEventListener('click', () => {
            emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'block' : 'none';
            if (emojiPicker.innerHTML === '') {
                emojiPicker.innerHTML = emojis.map(e => `<span class="emoji">${e}</span>`).join('');
            }
        });

        emojiPicker.addEventListener('click', e => {
            if (e.target.classList.contains('emoji')) {
                chatInput.value += e.target.textContent;
                emojiPicker.style.display = 'none';
            }
        });

        function updateNotificationBadge() {
            if (unreadMessages > 0) {
                chatNotification.textContent = unreadMessages;
                chatNotification.style.display = 'flex';
                gsap.from(chatNotification, { scale: 0.8, opacity: 0, duration: 0.3 });
            } else {
                chatNotification.style.display = 'none';
            }
        }

        function loadChatMessages() {
            dbFirestore.collection('messages')
                .where('chatId', '==', 'globalChat')
                .orderBy('timestamp', 'desc')
                .limit(20)
                .onSnapshot(snapshot => {
                    const currentMessageCount = snapshot.size;
                    if (chatWindow.style.display === 'none' && currentMessageCount > lastMessageCount) {
                        unreadMessages += currentMessageCount - lastMessageCount;
                        updateNotificationBadge();
                    }
                    lastMessageCount = currentMessageCount;

                    chatMessages.innerHTML = '';
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        const div = document.createElement('div');
                        div.classList.add('chat-message');
                        if (data.userId === deviceId) {
                            div.classList.add('mine');
                        }
                        div.innerHTML = `
                            <p><strong>${data.username}</strong>: ${data.text}</p>
                            <span>${new Date(data.timestamp).toLocaleTimeString()}</span>
                        `;
                        if (data.userId !== deviceId) {
                            const userColor = getColorFromUserId(data.userId);
                            div.querySelector('p').style.backgroundColor = userColor;
                            div.querySelector('p').style.color = '#ffffff';
                        }
                        chatMessages.insertBefore(div, chatMessages.firstChild);
                    });
                    if (chatMessages.children.length) {
                        gsap.from('.chat-message', { opacity: 0, y: 10, stagger: 0.1, duration: 0.5 });
                    }
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                });
        }
    }

    function setupFilters() {
        const filterToggle = document.getElementById('filter-toggle');
        const filterWindow = document.getElementById('filter-window');
        const filterCloseBtn = document.getElementById('filter-close-btn');
        const resetFilterBtn = document.getElementById('reset-filter-btn');
        const filterCheckboxes = document.querySelectorAll('#filter-window input[type="checkbox"]');

        filterToggle.addEventListener('click', e => {
            e.preventDefault();
            const isVisible = filterWindow.style.display === 'none';
            filterWindow.style.display = 'block';
            if (isVisible) {
                filterWindow.classList.add('open');
                gsap.from(filterWindow, { x: -300, duration: 0.3, ease: 'power2.out' });
            } else {
                filterWindow.classList.remove('open');
                gsap.to(filterWindow, { x: -300, duration: 0.3, ease: 'power2.in', onComplete: () => filterWindow.style.display = 'none' });
            }
        });

        filterCloseBtn.addEventListener('click', () => {
            filterWindow.classList.remove('open');
            gsap.to(filterWindow, { x: -300, duration: 0.3, ease: 'power2.in', onComplete: () => filterWindow.style.display = 'none' });
        });

        filterCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', applyFilters);
        });

        resetFilterBtn.addEventListener('click', () => {
            filterCheckboxes.forEach(checkbox => checkbox.checked = false);
            applyFilters();
        });

        function applyFilters() {
            const selectedFilters = Array.from(filterCheckboxes)
                .filter(checkbox => checkbox.checked)
                .map(checkbox => checkbox.value.toLowerCase());

            if (selectedFilters.length === 0) {
                filteredImages = [...images];
            } else {
                filteredImages = images.filter(img => 
                    selectedFilters.some(filter => img.tags.some(tag => tag.toLowerCase() === filter))
                );
            }
            loadedImages = 0;
            renderGallery(true);
        }
    }

    function setupGalleryLikeListeners(entries) {
        entries.forEach(entry => {
            const btn = entry.target;
            const id = btn.dataset.id;
            const countElement = btn.nextElementSibling;
            if (entry.isIntersecting) {
                dbRealtime.ref(`likes/${id}`).on('value', snapshot => {
                    const likesData = snapshot.val() || {};
                    const count = Object.keys(likesData).length || 0;
                    if (countElement && countElement.classList.contains('like-count')) {
                        countElement.textContent = count;
                    }
                    btn.classList.toggle('liked', likesData[deviceId] === true);
                });
            } else {
                dbRealtime.ref(`likes/${id}`).off();
            }
        });
    }

    function loadLikesImmediately(container) {
        const likeButtons = container.querySelectorAll('.like-btn');
        likeButtons.forEach(btn => {
            const id = btn.dataset.id;
            const countElement = btn.nextElementSibling;
            dbRealtime.ref(`likes/${id}`).on('value', snapshot => {
                const likesData = snapshot.val() || {};
                const count = Object.keys(likesData).length || 0;
                if (countElement && countElement.classList.contains('like-count')) {
                    countElement.textContent = count;
                }
                btn.classList.toggle('liked', likesData[deviceId] === true);
            });
        });
    }

    if (document.querySelector('.gallery')) {
        if (username) loadGallery();

        function loadGallery() {
            fetch('imagenes.json')
                .then(response => response.json())
                .then(data => {
                    images = data;
                    filteredImages = [...images];
                    renderGallery(true);
                    renderForYou();
                    renderMostLiked();
                    setupSearch();
                    setupLikes();
                    setupChat();
                    setupFilters();

                    const sentinel = document.getElementById('sentinel');
                    const observer = new IntersectionObserver(entries => {
                        if (entries[0].isIntersecting && loadedImages < filteredImages.length) {
                            renderGallery(false);
                        }
                    }, { rootMargin: '200px' });
                    observer.observe(sentinel);
                })
                .catch(error => console.error('Error loading imagenes.json:', error));
        }

        function renderGallery(reset = false) {
            const gallery = document.querySelector('.gallery');
            if (reset) {
                gallery.innerHTML = '';
                loadedImages = 0;
            }
            const nextImages = filteredImages.slice(loadedImages, loadedImages + itemsPerLoad);
            nextImages.forEach(img => {
                const div = document.createElement('div');
                div.classList.add('grid-item');
                div.innerHTML = `
                    <img src="${img.url}" alt="${img.title}">
                    <div class="info">
                        <h3>${img.title}</h3>
                    </div>
                    <div class="like-section">
                        <button class="like-btn" data-id="${img.id}">
                            <i class="fas fa-heart"></i>
                        </button>
                        <span class="like-count">0</span>
                    </div>
                `;
                div.addEventListener('click', e => {
                    if (!e.target.closest('.like-btn')) window.location.href = `image-detail.html?id=${img.id}`;
                });
                gallery.appendChild(div);
            });
            loadedImages += nextImages.length;
            const observer = new IntersectionObserver(setupGalleryLikeListeners, { rootMargin: '100px' });
            gallery.querySelectorAll('.like-btn').forEach(btn => observer.observe(btn));
        }

        function renderForYou() {
            const forYou = document.querySelector('.for-you');
            const tagScores = JSON.parse(localStorage.getItem('tagScores')) || {};
            const interactedImages = JSON.parse(localStorage.getItem('interactedImages')) || {};

            forYou.innerHTML = ''; // Limpiar la sección

            if (Object.keys(tagScores).length === 0) {
                forYou.innerHTML = '<p>Aún no hay suficientes datos de interacción.</p>';
                return;
            }

            // Calcular puntaje por imagen, dando más peso al primer tag y excluyendo imágenes interactuadas
            const scoredImages = images
                .filter(img => !interactedImages[img.id]) // Excluir imágenes ya interactuadas
                .map(img => {
                    const score = img.tags.reduce((sum, tag, index) => {
                        const tagScore = tagScores[tag] || 0;
                        return sum + (index === 0 ? tagScore * 2 : tagScore); // Peso doble al primer tag
                    }, 0);
                    return { ...img, score };
                })
                .sort((a, b) => b.score - a.score) // Ordenar de mayor a menor puntaje
                .slice(0, Math.min(3, images.length)); // Tomar hasta 3 imágenes

            // Renderizar las imágenes seleccionadas
            scoredImages.forEach(img => {
                const div = document.createElement('div');
                div.classList.add('grid-item');
                div.innerHTML = `
                    <img src="${img.url}" alt="${img.title}">
                    <div class="info">
                        <h3>${img.title}</h3>
                    </div>
                    <div class="like-section">
                        <button class="like-btn" data-id="${img.id}">
                            <i class="fas fa-heart"></i>
                        </button>
                        <span class="like-count">0</span>
                    </div>
                `;
                div.addEventListener('click', e => {
                    if (!e.target.closest('.like-btn')) window.location.href = `image-detail.html?id=${img.id}`;
                });
                forYou.appendChild(div);
            });

            // Cargar los "Me Gusta" inmediatamente
            loadLikesImmediately(forYou);

            // Si no hay imágenes disponibles después de filtrar
            if (scoredImages.length === 0) {
                forYou.innerHTML = '<p>No hay nuevas imágenes relacionadas con tus intereses.</p>';
            }
        }

        function renderMostLiked() {
            const mostLiked = document.querySelector('.most-liked');
            dbRealtime.ref('likes').once('value', snapshot => {
                const likesData = snapshot.val() || {};
                const sortedImages = images.map(img => ({
                    ...img,
                    likeCount: likesData[img.id] ? Object.keys(likesData[img.id]).length : 0
                })).sort((a, b) => b.likeCount - a.likeCount).slice(0, 3);
                sortedImages.forEach(img => {
                    const div = document.createElement('div');
                    div.classList.add('grid-item');
                    div.innerHTML = `
                        <img src="${img.url}" alt="${img.title}">
                        <div class="info">
                            <h3>${img.title}</h3>
                        </div>
                        <div class="like-section">
                            <button class="like-btn" data-id="${img.id}">
                                <i class="fas fa-heart"></i>
                            </button>
                            <span class="like-count">0</span>
                        </div>
                    `;
                    div.addEventListener('click', e => {
                        if (!e.target.closest('.like-btn')) window.location.href = `image-detail.html?id=${img.id}`;
                    });
                    mostLiked.appendChild(div);
                });
                loadLikesImmediately(mostLiked);
            });
        }
    }

    if (document.querySelector('.image-container')) {
        const urlParams = new URLSearchParams(window.location.search);
        const imageId = urlParams.get('id');
        if (!username) window.location.href = 'index.html';

        document.querySelector('#user-info').textContent = username;

        fetch('imagenes.json')
            .then(response => response.json())
            .then(data => {
                images = data;
                const image = images.find(img => img.id === Number(imageId));
                const imageContainer = document.querySelector('.image-container');
                const imageViewer = document.getElementById('image-viewer');
                const likeBtn = imageContainer.querySelector('.like-btn');
                const details = document.querySelector('.details');
                const similarGallery = document.querySelector('.similar-gallery');

                if (image) {
                    imageViewer.innerHTML = `<img src="${image.url}" alt="${image.title}">`;
                    likeBtn.innerHTML = `
                        <i class="fas fa-heart"></i>
                    `;
                    likeBtn.insertAdjacentHTML('afterend', '<span class="like-count">0</span>');
                    likeBtn.dataset.id = image.id;
                    likeBtn.style.display = 'inline-block';
                    const viewer = new Viewer(imageViewer, {
                        inline: false,
                        navbar: false,
                        toolbar: {
                            zoomIn: 1,
                            zoomOut: 1,
                            oneToOne: 1,
                            reset: 1,
                            prev: 0,
                            play: 0,
                            next: 0,
                            rotateLeft: 1,
                            rotateRight: 1,
                            flipHorizontal: 1,
                            flipVertical: 1,
                        },
                        title: false,
                        viewed() {
                            viewer.zoomTo(1);
                        }
                    });
                    details.innerHTML = `
                        <h2>${image.title}</h2>
                        <p>${image.description}</p>
                    `;
                    const similarImages = shuffleArray(images.filter(img => img.id !== image.id)).slice(0, 9);
                    similarImages.forEach(img => {
                        const div = document.createElement('div');
                        div.classList.add('grid-item');
                        div.innerHTML = `
                            <img src="${img.url}" alt="${img.title}">
                            <div class="info">
                                <h3>${img.title}</h3>
                            </div>
                            <div class="like-section">
                                <button class="like-btn" data-id="${img.id}">
                                    <i class="fas fa-heart"></i>
                                </button>
                                <span class="like-count">0</span>
                            </div>
                        `;
                        div.addEventListener('click', e => {
                            if (!e.target.closest('.like-btn')) window.location.href = `image-detail.html?id=${img.id}`;
                        });
                        similarGallery.appendChild(div);
                    });

                    updateTagScores(image.tags, 'view', image.id);

                    let timeSpent = 0;
                    const interval = setInterval(() => {
                        timeSpent += 2;
                        updateTagScores(image.tags, 'time', image.id);
                    }, 2000);

                    window.addEventListener('beforeunload', () => clearInterval(interval));
                } else {
                    details.innerHTML = '<p>Imagen no encontrada</p>';
                }

                setupSearch();
                setupLikes();
                setupChat();
                setupFilters();

                const observer = new IntersectionObserver(setupGalleryLikeListeners, { rootMargin: '100px' });
                document.querySelectorAll('.like-btn').forEach(btn => observer.observe(btn));
            })
            .catch(error => {
                console.error('Error:', error);
                document.querySelector('.details').innerHTML = `<p>Error: ${error.message}</p>`;
            });

        document.getElementById('comment-form').addEventListener('submit', e => {
            e.preventDefault();
            const text = document.getElementById('comment-text').value.trim();
            if (text && username) {
                dbRealtime.ref(`comments/${imageId}`).push({
                    text,
                    timestamp: new Date().toISOString(),
                    username,
                    deviceId
                }).then(() => document.getElementById('comment-text').value = '');
            }
        });

        dbRealtime.ref(`comments/${imageId}`).on('value', snapshot => {
            const commentsList = document.getElementById('comments-list');
            const comments = snapshot.val();
            commentsList.innerHTML = comments ? 
                Object.values(comments).map(c => `<div class="comment"><strong>${c.username}</strong>: ${c.text}<span>${new Date(c.timestamp).toLocaleTimeString()}</span></div>`).join('') : 
                '<p>Sin comentarios</p>';
            if (commentsList.querySelectorAll('.comment').length) {
                gsap.from('.comment', { opacity: 0, y: 10, stagger: 0.1, duration: 0.5 });
            }
        });
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
});