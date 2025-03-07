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

    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
        deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('deviceId', deviceId);
        console.log('Nuevo deviceId generado:', deviceId);
    } else {
        console.log('deviceId recuperado de localStorage:', deviceId);
    }

    let username = null;
    const userInfo = document.getElementById('user-info');
    const authContainer = document.getElementById('auth-container');

    async function loadUsername() {
        try {
            const snapshot = await dbRealtime.ref(`users/${deviceId}`).once('value');
            const userData = snapshot.val();
            if (userData && userData.username) {
                username = userData.username;
                userInfo.textContent = `Usuario: ${username}`;
                console.log('Nombre de usuario cargado desde Firebase:', username);
                if (authContainer) authContainer.style.display = 'none';
            } else {
                console.log('No se encontró nombre de usuario en Firebase');
                if (authContainer) authContainer.style.display = 'block';
            }
            return username;
        } catch (error) {
            console.error('Error al cargar nombre de usuario desde Firebase:', error);
            if (authContainer) authContainer.style.display = 'block';
            return null;
        }
    }

    if (document.getElementById('username-form')) {
        document.getElementById('username-form').addEventListener('submit', async function (e) {
            e.preventDefault();
            const newUsername = document.getElementById('username').value.trim();
            if (newUsername) {
                try {
                    await dbRealtime.ref(`users/${deviceId}`).set({ username: newUsername });
                    username = newUsername;
                    userInfo.textContent = `Usuario: ${username}`;
                    if (authContainer) authContainer.style.display = 'none';
                    console.log('Nombre de usuario guardado:', username);
                    if (document.querySelector('.gallery')) loadGallery();
                } catch (error) {
                    console.error('Error al guardar nombre de usuario:', error);
                }
            }
        });
    }

    await loadUsername();

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        const body = document.body;
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'night') {
            body.classList.add('night-mode');
            themeToggle.querySelector('i').classList.replace('fa-moon', 'fa-sun');
        }

        themeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            body.classList.toggle('night-mode');
            const isNightMode = body.classList.contains('night-mode');
            localStorage.setItem('theme', isNightMode ? 'night' : 'light');
            themeToggle.querySelector('i').classList.toggle('fa-moon', !isNightMode);
            themeToggle.querySelector('i').classList.toggle('fa-sun', isNightMode);
        });
    }

    const chatBackdrop = document.createElement('div');
    chatBackdrop.classList.add('chat-backdrop');
    document.body.appendChild(chatBackdrop);

    function setupSearch() {
        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('search-btn');
        const resetBtn = document.getElementById('reset-btn');
        const searchToggle = document.getElementById('search-toggle');
        const searchContainer = document.getElementById('search-container');
        const searchResults = document.getElementById('search-results');
        const body = document.body;

        if (!searchToggle || !searchContainer || !searchResults) {
            console.error('No se encontraron elementos del buscador:', { searchToggle, searchContainer, searchResults });
            return;
        }

        searchToggle.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Search toggle clicked');
            const isVisible = searchContainer.style.display === 'none' || searchContainer.style.display === '';
            searchContainer.style.display = isVisible ? 'flex' : 'none';
            body.classList.toggle('search-active', isVisible);
            if (isVisible) {
                searchInput.focus();
                searchResults.style.display = 'none';
            } else {
                searchResults.style.display = 'none';
            }
        });

        function displaySearchResults(query) {
            const results = images.filter(img => 
                img.title.toLowerCase().includes(query.toLowerCase()) || 
                img.description.toLowerCase().includes(query.toLowerCase()) || 
                img.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
            );

            searchResults.innerHTML = '';
            if (results.length > 0) {
                results.forEach(img => {
                    const div = document.createElement('div');
                    div.classList.add('result-item');
                    div.innerHTML = `
                        <img src="${img.url}" alt="${img.title}" style="width: 50px; height: 50px; object-fit: cover; margin-right: 10px;">
                        <span>${img.title}</span>
                    `;
                    div.addEventListener('click', () => {
                        window.location.href = `image-detail.html?id=${img.id}`;
                    });
                    searchResults.appendChild(div);
                });
                searchResults.style.display = 'block';
            } else {
                searchResults.innerHTML = '<p>No se encontraron resultados</p>';
                searchResults.style.display = 'block';
            }
        }

        if (searchBtn && searchInput) {
            searchBtn.addEventListener('click', () => {
                const query = searchInput.value.trim();
                if (query) {
                    console.log('Buscando:', query);
                    displaySearchResults(query);
                }
            });

            searchInput.addEventListener('input', () => {
                const query = searchInput.value.trim();
                if (query) {
                    displaySearchResults(query);
                } else {
                    searchResults.style.display = 'none';
                }
            });

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    searchBtn.click();
                }
            });
        } else {
            console.error('Faltan elementos de búsqueda:', { searchBtn, searchInput });
        }

        if (resetBtn && searchInput) {
            resetBtn.addEventListener('click', () => {
                searchInput.value = '';
                searchResults.style.display = 'none';
                searchContainer.style.display = 'none';
                body.classList.remove('search-active');
            });
        }
    }

    function setupLikes() {
        const likesToggle = document.getElementById('likes-toggle');
        const likesList = document.getElementById('likes-list');

        if (likesToggle && likesList) {
            likesToggle.addEventListener('click', (e) => {
                e.preventDefault();
                likesList.style.display = likesList.style.display === 'none' ? 'block' : 'none';
                if (likesList.style.display === 'block') {
                    dbRealtime.ref('likes').once('value', snapshot => {
                        const likesData = snapshot.val() || {};
                        const likedImages = images.filter(img => likesData[img.id] && Object.keys(likesData[img.id]).length > 0);
                        likesList.innerHTML = '';
                        likedImages.forEach(img => {
                            const div = document.createElement('div');
                            div.innerHTML = `<img src="${img.url}" alt="${img.title}"><span>${img.title}</span>`;
                            div.addEventListener('click', () => window.location.href = `image-detail.html?id=${img.id}`);
                            likesList.appendChild(div);
                        });
                        if (likedImages.length === 0) {
                            likesList.innerHTML = '<p>No hay imágenes con likes aún.</p>';
                        }
                    });
                }
            });
        }

        document.addEventListener('click', e => {
            if (e.target.closest('.like-btn')) {
                e.stopPropagation();
                const btn = e.target.closest('.like-btn');
                const id = btn.dataset.id;

                dbRealtime.ref(`likes/${id}/${deviceId}`).once('value', snapshot => {
                    const isLiked = snapshot.val() === true;
                    dbRealtime.ref(`likes/${id}/${deviceId}`).set(!isLiked)
                        .then(() => {
                            btn.classList.toggle('liked', !isLiked);
                            updateUserInteraction(id, { liked: !isLiked });
                        })
                        .catch(error => console.error('Error al actualizar like:', error));
                });
            }
        });
    }

    function setupChat() {
        const chatToggle = document.getElementById('chat-toggle');
        const chatWindow = document.getElementById('chat-window');
        const chatForm = document.getElementById('chat-form');
        const chatInput = document.getElementById('chat-input');
        const chatMessages = document.getElementById('chat-messages');
        const emojiBtn = document.getElementById('emoji-btn');
        const emojiPicker = document.getElementById('emoji-picker');
        const chatId = 'globalChat';
        const MESSAGE_LIFETIME = 24 * 60 * 60 * 1000;
        const body = document.body;

        const emojis = ['😀', '😂', '😍', '😢', '😡', '👍', '👎', '❤️', '🔥', '🎉', '✨', '💪', '🙌', '🤓', '😎'];

        console.log('Inicializando chat - username:', username, 'deviceId:', deviceId);

        if (chatToggle && chatWindow) {
            chatToggle.addEventListener('click', (e) => {
                e.preventDefault();
                const isVisible = chatWindow.style.display === 'none' || chatWindow.style.display === '';
                chatWindow.style.display = isVisible ? 'block' : 'none';
                body.classList.toggle('chat-active', isVisible);
                if (isVisible && !chatMessages.dataset.loaded) {
                    loadChatMessages();
                    chatMessages.dataset.loaded = 'true';
                }
            });
        }

        if (chatForm && chatInput) {
            chatForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const text = chatInput.value.trim();
                console.log('Enviando mensaje - username:', username, 'deviceId:', deviceId, 'text:', text);
                if (text && username && deviceId) {
                    try {
                        await dbFirestore.collection('messages').add({
                            chatId: chatId,
                            text: text,
                            timestamp: Date.now(),
                            userId: deviceId,
                            username: username
                        });
                        chatInput.value = '';
                        console.log('Mensaje enviado correctamente:', text);
                    } catch (error) {
                        console.error('Error detallado al enviar mensaje:', error);
                        chatMessages.innerHTML = `<p>Error al enviar mensaje: ${error.message}</p>`;
                    }
                } else {
                    chatMessages.innerHTML = '<p>Debes tener un nombre de usuario y deviceId para enviar mensajes.</p>';
                    console.log('Faltan datos - username:', username, 'deviceId:', deviceId);
                }
            });

            chatInput.addEventListener('focus', () => {
                if (window.innerWidth <= 600) {
                    chatWindow.classList.add('keyboard-active');
                    setTimeout(() => {
                        chatInput.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    }, 300);
                }
            });

            chatInput.addEventListener('blur', () => {
                if (window.innerWidth <= 600) {
                    chatWindow.classList.remove('keyboard-active');
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            });
        }

        if (emojiBtn && emojiPicker) {
            emojiPicker.innerHTML = emojis.map(emoji => `<span class="emoji">${emoji}</span>`).join('');
            emojiBtn.addEventListener('click', () => {
                emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'block' : 'none';
            });

            emojiPicker.addEventListener('click', (e) => {
                if (e.target.classList.contains('emoji')) {
                    chatInput.value += e.target.textContent;
                    emojiPicker.style.display = 'none';
                    chatInput.focus();
                }
            });

            document.addEventListener('click', (e) => {
                if (!emojiBtn.contains(e.target) && !emojiPicker.contains(e.target)) {
                    emojiPicker.style.display = 'none';
                }
            });
        }

        async function cleanOldMessages() {
            const now = Date.now();
            const cutoff = now - MESSAGE_LIFETIME;
            console.log('Limpiando mensajes anteriores a:', new Date(cutoff).toLocaleString());

            try {
                const oldMessagesQuery = dbFirestore.collection('messages')
                    .where('chatId', '==', chatId)
                    .where('timestamp', '<', cutoff);
                const snapshot = await oldMessagesQuery.get();

                if (snapshot.empty) {
                    console.log('No hay mensajes antiguos para eliminar');
                    return;
                }

                const batch = dbFirestore.batch();
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });

                await batch.commit();
                console.log(`Eliminados ${snapshot.size} mensajes antiguos`);
            } catch (error) {
                console.error('Error al eliminar mensajes antiguos:', error);
            }
        }

        function loadChatMessages() {
            console.log('Cargando mensajes para chatId:', chatId);
            cleanOldMessages().then(() => {
                dbFirestore.collection('messages')
                    .where('chatId', '==', chatId)
                    .orderBy('timestamp', 'desc')
                    .limit(20)
                    .onSnapshot(snapshot => {
                        chatMessages.innerHTML = '';
                        snapshot.forEach(doc => {
                            const data = doc.data();
                            const div = document.createElement('div');
                            div.classList.add('chat-message');
                            div.innerHTML = `
                                <p><strong>${data.username}</strong>: ${data.text}</p>
                                <p class="timestamp">${new Date(data.timestamp).toLocaleString()}</p>
                            `;
                            chatMessages.insertBefore(div, chatMessages.firstChild);
                        });
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                        console.log('Mensajes cargados:', snapshot.size);
                    }, error => {
                        console.error('Error detallado al cargar mensajes:', error);
                        chatMessages.innerHTML = `<p>Error al cargar el chat: ${error.message}</p>`;
                    });
            });
        }
    }

    function setupLikeListeners(entries, observer) {
        entries.forEach(entry => {
            const btn = entry.target;
            const id = btn.dataset.id;

            if (entry.isIntersecting) {
                dbRealtime.ref(`likes/${id}`).on('value', snapshot => {
                    const likesData = snapshot.val() || {};
                    const likeCount = Object.keys(likesData).length;
                    btn.querySelector('.like-count').textContent = likeCount > 0 ? likeCount : '';
                    const isLiked = likesData[deviceId] === true;
                    btn.classList.toggle('liked', isLiked);
                });
            } else {
                dbRealtime.ref(`likes/${id}`).off('value');
            }
        });
    }

    function filterImages(query) {
        filteredImages = images.filter(img => 
            img.title.toLowerCase().includes(query.toLowerCase()) || 
            img.description.toLowerCase().includes(query.toLowerCase()) || 
            img.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
        );
        loadedImages = 0;
        renderGallery(true);
    }

    function updateUserInteraction(imageId, interaction) {
        let interactions = JSON.parse(localStorage.getItem('userInteractions')) || {};
        const image = images.find(img => img.id === Number(imageId));
        if (!image) return;

        if (!interactions[imageId]) {
            interactions[imageId] = { time: 0, likes: 0, visits: 0, tags: image.tags, lastInteraction: 0 };
        }
        if (interaction.time) interactions[imageId].time += interaction.time;
        if (interaction.liked !== undefined) interactions[imageId].likes = interaction.liked ? 1 : 0;
        interactions[imageId].visits += 1;
        interactions[imageId].lastInteraction = Date.now();
        localStorage.setItem('userInteractions', JSON.stringify(interactions));

        updateTagScores(imageId);
    }

    function updateTagScores(imageId) {
        const interactions = JSON.parse(localStorage.getItem('userInteractions')) || {};
        const imageData = interactions[imageId];
        if (!imageData) return;

        let tagScores = JSON.parse(localStorage.getItem('tagScores')) || {};
        const isRecent = (Date.now() - imageData.lastInteraction) < 24 * 60 * 60 * 1000;
        const recencyMultiplier = isRecent ? 1.5 : 1;

        imageData.tags.forEach((tag, index) => {
            if (!tagScores[tag]) tagScores[tag] = { time: 0, likes: 0, visits: 0, score: 0 };
            const timeScore = (imageData.time / 5) * 2;
            const likeScore = imageData.likes * 10;
            const visitScore = imageData.visits * 5;
            const weight = index === 0 ? 1.5 : 1;
            const baseScore = (timeScore + likeScore + visitScore) * weight * recencyMultiplier;

            tagScores[tag].time += imageData.time;
            tagScores[tag].likes += imageData.likes;
            tagScores[tag].visits += imageData.visits;
            tagScores[tag].score += baseScore;
        });

        const sortedTags = Object.entries(tagScores)
            .sort(([, a], [, b]) => b.score - a.score)
            .slice(0, 10);
        tagScores = Object.fromEntries(sortedTags);

        localStorage.setItem('tagScores', JSON.stringify(tagScores));
    }

    function calculateTagBasedScore(image, topTags) {
        const tagScores = JSON.parse(localStorage.getItem('userInteractions')) || {};
        let totalScore = 0;
        image.tags.forEach((tag, index) => {
            const baseScore = tagScores[tag]?.score || 0;
            const weight = index === 0 && topTags.includes(tag) ? 1.2 : 1;
            totalScore += baseScore * weight;
        });
        return totalScore / image.tags.length;
    }

    function getTopTags(limit = 3) {
        const tagScores = JSON.parse(localStorage.getItem('tagScores')) || {};
        return Object.entries(tagScores)
            .sort(([, a], [, b]) => b.score - a.score)
            .slice(0, limit)
            .map(([tag]) => tag);
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    if (document.querySelector('.gallery')) {
        if (username) {
            loadGallery();
        }

        function loadGallery() {
            fetch('imagenes.json')
                .then(response => response.json())
                .then(data => {
                    images = data;
                    filteredImages = [...images];
                    console.log('Imágenes cargadas en index:', images);

                    const urlParams = new URLSearchParams(window.location.search);
                    const searchQuery = urlParams.get('search');
                    if (searchQuery) {
                        document.getElementById('search-input').value = searchQuery;
                        filterImages(searchQuery);
                    } else {
                        renderGallery(true);
                    }

                    renderForYou();
                    renderMostLiked();
                    setupSearch();
                    setupLikes();
                    setupChat();
                })
                .catch(error => console.error('Error al cargar imagenes.json en index:', error));
        }

        function renderGallery(reset = false) {
            const gallery = document.querySelector('.gallery');
            if (reset) {
                gallery.innerHTML = '';
                loadedImages = 0;
            }

            const nextImages = filteredImages.slice(loadedImages, loadedImages + itemsPerLoad);
            console.log(`Cargando imágenes: ${loadedImages} a ${loadedImages + nextImages.length} de ${filteredImages.length}`);
            nextImages.forEach(img => {
                const div = document.createElement('div');
                div.classList.add('gallery-item');
                div.innerHTML = `
                    <img src="${img.url}" alt="${img.title}">
                    <span class="title">${img.title}</span>
                    <button class="like-btn" data-id="${img.id}">
                        <img src="like.png" alt="Like" class="like-icon">
                        <span class="like-count"></span>
                    </button>
                `;
                div.addEventListener('click', (e) => {
                    if (!e.target.closest('.like-btn')) {
                        window.location.href = `image-detail.html?id=${img.id}`;
                    }
                });
                gallery.appendChild(div);
            });

            loadedImages += nextImages.length;

            let sentinel = document.getElementById('sentinel');
            if (!sentinel) {
                sentinel = document.createElement('div');
                sentinel.id = 'sentinel';
                gallery.appendChild(sentinel);
            } else {
                gallery.appendChild(sentinel);
            }

            const likeObserver = new IntersectionObserver(setupLikeListeners, { rootMargin: '200px' });
            document.querySelectorAll('.like-btn').forEach(btn => likeObserver.observe(btn));

            if (reset || !window.sentinelObserver) {
                if (window.sentinelObserver) window.sentinelObserver.disconnect();
                window.sentinelObserver = new IntersectionObserver((entries) => {
                    if (entries[0].isIntersecting && loadedImages < filteredImages.length) {
                        console.log('Centinela visible, cargando más imágenes...');
                        renderGallery(false);
                    }
                }, { rootMargin: '200px' });
                window.sentinelObserver.observe(sentinel);
            }
        }

        function renderForYou() {
            const forYou = document.querySelector('.for-you');
            const interactions = JSON.parse(localStorage.getItem('userInteractions')) || {};
            const interactedImageIds = Object.keys(interactions).map(id => Number(id));

            const availableImages = images.filter(img => !interactedImageIds.includes(img.id));
            if (availableImages.length === 0) {
                forYou.innerHTML = '<p>No hay nuevas imágenes para recomendar.</p>';
                return;
            }

            const topTags = getTopTags(3);
            if (topTags.length === 0) {
                const randomImages = shuffleArray([...availableImages]).slice(0, 3);
                forYou.innerHTML = '';
                randomImages.forEach(img => {
                    const div = document.createElement('div');
                    div.classList.add('gallery-item');
                    div.innerHTML = `
                        <img src="${img.url}" alt="${img.title}">
                        <span class="title">${img.title}</span>
                    `;
                    div.addEventListener('click', () => window.location.href = `image-detail.html?id=${img.id}`);
                    forYou.appendChild(div);
                });
                return;
            }

            const totalInteractions = Object.keys(interactions).length || 1;
            const scoredImages = availableImages.map(img => ({
                ...img,
                score: calculateTagBasedScore(img, topTags) / totalInteractions + (Math.random() * 0.2)
            })).sort((a, b) => b.score - a.score).slice(0, 3);

            forYou.innerHTML = '';
            scoredImages.forEach(img => {
                const div = document.createElement('div');
                div.classList.add('gallery-item');
                div.innerHTML = `
                    <img src="${img.url}" alt="${img.title}">
                    <span class="title">${img.title}</span>
                    `;
                div.addEventListener('click', () => window.location.href = `image-detail.html?id=${img.id}`);
                forYou.appendChild(div);
            });
        }

        function renderMostLiked() {
            const mostLiked = document.querySelector('.most-liked');
            dbRealtime.ref('likes').once('value', snapshot => {
                const likesData = snapshot.val() || {};
                const sortedImages = images.map(img => ({
                    ...img,
                    likeCount: likesData[img.id] ? Object.keys(likesData[img.id]).length : 0
                })).sort((a, b) => b.likeCount - a.likeCount).slice(0, 3);

                mostLiked.innerHTML = '';
                sortedImages.forEach(img => {
                    const div = document.createElement('div');
                    div.classList.add('gallery-item');
                    div.innerHTML = `
                        <img src="${img.url}" alt="${img.title}">
                        <span class="title">${img.title}</span>
                    `;
                    div.addEventListener('click', () => window.location.href = `image-detail.html?id=${img.id}`);
                    mostLiked.appendChild(div);
                });
            });
        }
    }

    if (document.querySelector('.image-container')) {
        console.log('Cargando image-detail.html');
        const urlParams = new URLSearchParams(window.location.search);
        const imageId = urlParams.get('id');

        if (!username) {
            console.log('No hay nombre de usuario, redirigiendo a index.html');
            window.location.href = 'index.html';
            return;
        }

        const userInfoDetail = document.getElementById('user-info');
        if (userInfoDetail) {
            userInfoDetail.textContent = `Usuario: ${username}`;
            console.log('Usuario mostrado en image-detail:', username);
        }

        let startTime = Date.now();
        window.addEventListener('beforeunload', () => {
            const timeSpent = Math.floor((Date.now() - startTime) / 1000);
            updateUserInteraction(imageId, { time: timeSpent });
        });

        fetch('imagenes.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error al cargar imagenes.json: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                images = data;
                console.log('Imágenes cargadas en image-detail:', images);
                const image = images.find(img => img.id === Number(imageId));
                const imageContainer = document.querySelector('.image-container');
                const details = document.querySelector('.details');
                const similarGallery = document.querySelector('.similar-gallery');

                if (image) {
                    console.log('Imagen encontrada:', image);
                    if (imageContainer) {
                        imageContainer.innerHTML = `
                            <img src="${image.url}" alt="${image.title}">
                            <button class="like-btn detail-like-btn" data-id="${image.id}">
                                <img src="like.png" alt="Like" class="like-icon">
                                <span class="like-count"></span>
                            </button>
                        `;
                        const imgElement = imageContainer.querySelector('img');
                        const likeBtn = imageContainer.querySelector('.detail-like-btn');
                        imgElement.addEventListener('click', () => {
                            imageContainer.classList.toggle('fullscreen');
                            if (imageContainer.classList.contains('fullscreen')) {
                                const closeBtn = document.createElement('button');
                                closeBtn.id = 'close-btn';
                                closeBtn.textContent = 'X';
                                closeBtn.addEventListener('click', (e) => {
                                    e.stopPropagation();
                                    imageContainer.classList.remove('fullscreen');
                                    closeBtn.remove();
                                });
                                imageContainer.appendChild(closeBtn);
                            } else {
                                const closeBtn = imageContainer.querySelector('#close-btn');
                                if (closeBtn) closeBtn.remove();
                            }
                        });
                    }
                    if (details) {
                        details.innerHTML = `
                            <h2>${image.title}</h2>
                            <p>${image.description}</p>
                        `;
                    }
                    let viewedImages = JSON.parse(localStorage.getItem('viewedImages')) || [];
                    if (!viewedImages.includes(image.id)) {
                        viewedImages.push(image.id);
                        localStorage.setItem('viewedImages', JSON.stringify(viewedImages));
                    }
                    console.log('Detalles de la imagen cargados:', image);

                    if (similarGallery) {
                        const topTags = image.tags.slice(0, 3);
                        let similarImages = images
                            .filter(img => img.id !== image.id && img.tags.some(tag => topTags.includes(tag)));
                        similarImages = shuffleArray(similarImages).slice(0, 9);

                        similarGallery.innerHTML = '';
                        similarImages.forEach(img => {
                            const div = document.createElement('div');
                            div.classList.add('gallery-item');
                            div.innerHTML = `
                                <img src="${img.url}" alt="${img.title}">
                                <span class="title">${img.title}</span>
                                <button class="like-btn" data-id="${img.id}">
                                    <img src="like.png" alt="Like" class="like-icon">
                                    <span class="like-count"></span>
                                </button>
                            `;
                            div.addEventListener('click', (e) => {
                                if (!e.target.closest('.like-btn')) {
                                    window.location.href = `image-detail.html?id=${img.id}`;
                                }
                            });
                            similarGallery.appendChild(div);
                        });
                        if (similarImages.length === 0) {
                            similarGallery.innerHTML = '<p>No se encontraron imágenes similares.</p>';
                        }
                    }
                } else {
                    console.log('Imagen no encontrada para id:', imageId);
                    if (details) {
                        details.innerHTML = '<p>Imagen no encontrada</p>';
                    }
                }

                setupSearch();
                setupLikes();
                setupChat();

                const likeObserver = new IntersectionObserver(setupLikeListeners, { rootMargin: '200px' });
                document.querySelectorAll('.like-btn').forEach(btn => likeObserver.observe(btn));
            })
            .catch(error => {
                console.error('Error al cargar imagenes.json en image-detail:', error);
                const details = document.querySelector('.details');
                if (details) {
                    details.innerHTML = `<p>Error al cargar los datos de la imagen: ${error.message}</p>`;
                }
            });

        const commentForm = document.getElementById('comment-form');
        const commentsList = document.getElementById('comments-list');

        if (commentForm) {
            commentForm.addEventListener('submit', function (e) {
                e.preventDefault();
                const commentText = document.getElementById('comment-text').value.trim();
                if (commentText && username) {
                    const comment = {
                        text: commentText,
                        timestamp: new Date().toISOString(),
                        username: username,
                        deviceId: deviceId
                    };
                    dbRealtime.ref(`comments/${imageId}`).push(comment)
                        .then(() => {
                            document.getElementById('comment-text').value = '';
                            console.log('Comentario enviado:', comment);
                        })
                        .catch(error => console.error('Error al enviar comentario:', error));
                }
            });
        }

        if (commentsList) {
            dbRealtime.ref(`comments/${imageId}`).on('value', snapshot => {
                commentsList.innerHTML = '';
                const comments = snapshot.val();
                if (comments) {
                    Object.values(comments).forEach(comment => {
                        const div = document.createElement('div');
                        div.classList.add('comment');
                        div.innerHTML = `
                            <p><strong>${comment.username}</strong>: ${comment.text}</p>
                            <p class="timestamp">${new Date(comment.timestamp).toLocaleString()}</p>
                        `;
                        commentsList.appendChild(div);
                    });
                    console.log('Comentarios cargados:', comments);
                } else {
                    commentsList.innerHTML = '<p>No hay comentarios aún.</p>';
                    console.log('No hay comentarios para esta imagen');
                }
            });
        }
    }
});