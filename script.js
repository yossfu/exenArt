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
    const db = firebase.database();

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
            const snapshot = await db.ref(`users/${deviceId}`).once('value');
            const userData = snapshot.val();
            if (userData && userData.username) {
                username = userData.username;
                if (document.querySelector('.profile-section')) {
                    userInfo.textContent = `Usuario: ${username}`;
                }
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
                    await db.ref(`users/${deviceId}`).set({ username: newUsername });
                    username = newUsername;
                    if (document.querySelector('.profile-section')) {
                        userInfo.textContent = `Usuario: ${username}`;
                    }
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

    function setupSearch() {
        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('search-btn');
        const resetBtn = document.getElementById('reset-btn');
        const searchToggle = document.getElementById('search-toggle');
        const searchContainer = document.getElementById('search-container');
        const body = document.body;

        if (searchToggle && searchContainer) {
            searchToggle.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Search toggle clicked');
                const isVisible = searchContainer.style.display === 'none' || searchContainer.style.display === '';
                searchContainer.style.display = isVisible ? 'flex' : 'none';
                body.classList.toggle('search-active', isVisible);
            });
        }

        if (searchBtn && searchInput) {
            searchBtn.addEventListener('click', () => {
                const query = searchInput.value.trim();
                if (query) {
                    if (document.querySelector('.gallery')) {
                        filterImages(query);
                    } else {
                        window.location.href = `index.html?search=${encodeURIComponent(query)}`;
                    }
                    searchContainer.style.display = 'none';
                    body.classList.remove('search-active');
                }
            });

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') searchBtn.click();
            });
        }

        if (resetBtn && searchInput) {
            resetBtn.addEventListener('click', () => {
                searchInput.value = '';
                if (document.querySelector('.gallery')) {
                    filteredImages = [...images];
                    loadedImages = 0;
                    renderGallery(true);
                } else {
                    window.location.href = 'index.html';
                }
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
                    db.ref('likes').once('value', snapshot => {
                        const likes = snapshot.val() || {};
                        const likedImages = images.filter(img => likes[img.id]?.[deviceId]);
                        likesList.innerHTML = '';
                        likedImages.forEach(img => {
                            const div = document.createElement('div');
                            div.innerHTML = `<img src="${img.url}" alt="${img.title}"><span>${img.title}</span>`;
                            div.addEventListener('click', () => window.location.href = `image-detail.html?id=${img.id}`);
                            likesList.appendChild(div);
                        });
                        if (likedImages.length === 0) {
                            likesList.innerHTML = '<p>No has dado like a ninguna imagen aún.</p>';
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
                const isLiked = btn.classList.contains('liked');

                const likeRef = db.ref(`likes/${id}/${deviceId}`);
                if (isLiked) {
                    likeRef.remove()
                        .then(() => {
                            btn.classList.remove('liked');
                            updateLikeCount(id, btn);
                            updateUserInteraction(id, { liked: false });
                            console.log(`Like removido por ${deviceId} en imagen ${id}`);
                        })
                        .catch(error => console.error('Error al quitar like:', error));
                } else {
                    likeRef.set(true)
                        .then(() => {
                            btn.classList.add('liked');
                            updateLikeCount(id, btn);
                            updateUserInteraction(id, { liked: true });
                            console.log(`Like añadido por ${deviceId} en imagen ${id}`);
                        })
                        .catch(error => console.error('Error al dar like:', error));
                }
            }
        });
    }

    function setupNotifications() {
        const notificationsToggle = document.getElementById('notifications-toggle');
        const notificationsList = document.getElementById('notifications-list');

        if (!notificationsToggle || !notificationsList) {
            console.error('Elementos de notificaciones no encontrados en el DOM');
            return;
        }

        console.log('Configurando notificaciones para deviceId:', deviceId);

        let allNotifications = {};

        db.ref(`notifications/${deviceId}`).on('value', snapshot => {
            allNotifications = { ...allNotifications, ...(snapshot.val() || {}) };
            console.log('Notificaciones personales cargadas:', snapshot.val());
            renderNotifications(allNotifications);
        }, error => {
            console.error('Error al cargar notificaciones personales:', error);
        });

        db.ref('system-notifications').once('value', snapshot => {
            const systemNotifications = snapshot.val() || {};
            console.log('Notificaciones del sistema cargadas:', systemNotifications);
            const viewedSystemNotifs = JSON.parse(localStorage.getItem('viewedSystemNotifs')) || [];

            Object.entries(systemNotifications).forEach(([key, notif]) => {
                if (!viewedSystemNotifs.includes(key)) {
                    db.ref(`notifications/${deviceId}`).push({
                        message: notif.message,
                        timestamp: notif.timestamp || new Date().toISOString(),
                        read: false,
                        type: "system"
                    }).then(() => {
                        viewedSystemNotifs.push(key);
                        localStorage.setItem('viewedSystemNotifs', JSON.stringify(viewedSystemNotifs));
                        console.log(`Notificación del sistema ${key} copiada a ${deviceId}`);
                    });
                }
            });
        }, error => {
            console.error('Error al cargar notificaciones del sistema:', error);
        });

        function renderNotifications(notificationsObj) {
            const notifications = Object.entries(notificationsObj).map(([key, notif]) => ({
                id: key,
                message: notif.message || 'Notificación sin mensaje',
                timestamp: notif.timestamp || new Date().toISOString(),
                read: notif.read || false,
                type: notif.type || 'unknown'
            }));
            console.log('Notificaciones combinadas para renderizar:', notifications);

            const unreadCount = notifications.filter(n => !n.read).length;
            if (unreadCount > 0) {
                notificationsToggle.classList.add('has-notifications');
                console.log('Notificaciones no leídas detectadas:', unreadCount);
            } else {
                notificationsToggle.classList.remove('has-notifications');
                console.log('No hay notificaciones no leídas');
            }

            notificationsToggle.onclick = (e) => {
                e.preventDefault();
                console.log('Botón de notificaciones clickeado');
                const isVisible = notificationsList.style.display === 'block';
                notificationsList.style.display = isVisible ? 'none' : 'block';

                if (!isVisible) {
                    notificationsList.innerHTML = notifications.length > 0 ? '' : '<p>No hay notificaciones.</p>';
                    notifications.forEach(notif => {
                        const div = document.createElement('div');
                        div.classList.add('notification');
                        const timeStr = new Date(notif.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                        div.innerHTML = `
                            <span>${notif.message} (${timeStr})</span>
                            <button class="close-btn" data-id="${notif.id}">✖</button>
                        `;
                        notificationsList.appendChild(div);
                    });

                    notifications.forEach(notif => {
                        if (!notif.read && notif.type !== 'system') {
                            db.ref(`notifications/${deviceId}/${notif.id}`).update({ read: true })
                                .then(() => console.log(`Notificación ${notif.id} marcada como leída`))
                                .catch(error => console.error('Error al marcar como leída:', error));
                        }
                    });
                    notificationsToggle.classList.remove('has-notifications');
                }
            };
        }

        notificationsList.addEventListener('click', (e) => {
            if (e.target.classList.contains('close-btn')) {
                const notifId = e.target.dataset.id;
                console.log('Intentando eliminar notificación:', notifId);
                db.ref(`notifications/${deviceId}/${notifId}`).remove()
                    .then(() => {
                        console.log(`Notificación ${notifId} eliminada`);
                        e.target.parentElement.remove();
                    })
                    .catch(error => console.error('Error al eliminar notificación:', error));
            }
        });
    }

    function setupCommentNotifications() {
        db.ref('comments').on('child_added', snapshot => {
            const comment = snapshot.val();
            const imageId = snapshot.ref.parent.key;
            console.log('Nuevo comentario detectado:', comment, 'en imagen:', imageId);

            if (comment.deviceId !== deviceId) {
                db.ref(`likes/${imageId}`).once('value', likesSnapshot => {
                    const likes = likesSnapshot.val() || {};
                    console.log('Likes actuales para imagen', imageId, ':', likes);
                    if (likes[deviceId]) {
                        fetch('imagenes.json')
                            .then(response => response.json())
                            .then(data => {
                                const image = data.find(img => img.id === Number(imageId));
                                if (image) {
                                    db.ref(`notifications/${deviceId}`).push({
                                        message: `${comment.username} comentó en la imagen "${image.title}" que te gusta`,
                                        timestamp: new Date().toISOString(),
                                        read: false,
                                        type: "comment",
                                        imageId: imageId
                                    }).then(() => console.log('Notificación de comentario enviada para:', deviceId));
                                } else {
                                    console.log('Imagen no encontrada en imagenes.json para ID:', imageId);
                                }
                            })
                            .catch(error => console.error('Error al cargar imagenes.json:', error));
                    } else {
                        console.log('Usuario actual no dio like a la imagen:', imageId);
                    }
                });
            } else {
                console.log('Comentario propio, no se genera notificación');
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

    function loadLikeState(id) {
        const btn = document.querySelector(`.like-btn[data-id="${id}"]`);
        if (btn) {
            db.ref(`likes/${id}`).once('value', snapshot => {
                const likes = snapshot.val() || {};
                const likeCount = Object.keys(likes).length;
                btn.innerHTML = `<img src="like.png" alt="Like" class="like-icon"><span class="like-count">${likeCount > 0 ? likeCount : ''}</span>`;
                if (likes[deviceId]) btn.classList.add('liked');
            });
        }
    }

    function updateLikeCount(id, btn) {
        db.ref(`likes/${id}`).once('value', snapshot => {
            const likes = snapshot.val() || {};
            const likeCount = Object.keys(likes).length;
            btn.innerHTML = `<img src="like.png" alt="Like" class="like-icon"><span class="like-count">${likeCount > 0 ? likeCount : ''}</span>`;
        });
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
        const tagScores = JSON.parse(localStorage.getItem('tagScores')) || {};
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
                    images = data.map(({ redirectUrl, ...rest }) => rest);
                    filteredImages = [...images];
                    console.log('Imágenes cargadas sin redirectUrl:', images);

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
                    setupNotifications();
                    setupCommentNotifications();
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
                loadLikeState(img.id);
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
            db.ref('likes').once('value', snapshot => {
                const likes = snapshot.val() || {};
                const sortedImages = images.map(img => ({
                    ...img,
                    likeCount: likes[img.id] ? Object.keys(likes[img.id]).length : 0
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

        let startTime = Date.now();
        window.addEventListener('beforeunload', () => {
            const timeSpent = Math.floor((Date.now() - startTime) / 1000);
            updateUserInteraction(imageId, { time: timeSpent });
        });

        fetch('imagenes.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('No se pudo cargar imagenes.json');
                }
                return response.json();
            })
            .then(data => {
                images = data.map(({ redirectUrl, ...rest }) => rest);
                console.log('Imágenes cargadas en image-detail:', images);
                const image = images.find(img => img.id === Number(imageId));
                const imageContainer = document.querySelector('.image-container');
                const details = document.querySelector('.details');
                const similarGallery = document.querySelector('.similar-gallery');

                if (image) {
                    console.log('Imagen encontrada:', image);
                    if (imageContainer) {
                        imageContainer.innerHTML = `<img src="${image.url}" alt="${image.title}">`;
                    }
                    if (details) {
                        details.innerHTML = `
                            <h2>${image.title}</h2>
                            <p>${image.description}</p>
                            <button class="like-btn detail-like-btn" data-id="${image.id}">
                                <img src="like.png" alt="Like" class="like-icon">
                                <span class="like-count"></span>
                            </button>
                        `;
                        loadLikeState(image.id);
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
                        similarImages = shuffleArray(similarImages).slice(0, 6);

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
                            loadLikeState(img.id);
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
                setupNotifications();
                setupCommentNotifications();
            })
            .catch(error => {
                console.error('Error al cargar imagenes.json en image-detail:', error);
                const details = document.querySelector('.details');
                if (details) {
                    details.innerHTML = '<p>Error al cargar los datos de la imagen</p>';
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
                    db.ref(`comments/${imageId}`).push(comment)
                        .then(() => {
                            document.getElementById('comment-text').value = '';
                            console.log('Comentario enviado:', comment);
                        })
                        .catch(error => console.error('Error al enviar comentario:', error));
                }
            });
        }

        if (commentsList) {
            db.ref(`comments/${imageId}`).on('value', snapshot => {
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

    if (document.querySelector('.profile-section')) {
        if (!username) {
            console.log('No hay nombre de usuario, redirigiendo a index.html');
            window.location.href = 'index.html';
            return;
        }

        const userInfoProfile = document.getElementById('user-info');
        if (userInfoProfile) {
            userInfoProfile.textContent = `Usuario: ${username}`;
        }

        loadProfile();

        function loadProfile() {
            fetch('imagenes.json')
                .then(response => response.json())
                .then(data => {
                    images = data.map(({ redirectUrl, ...rest }) => rest);
                    console.log('Imágenes cargadas para perfil:', images);

                    const profileInfo = document.getElementById('profile-info');
                    const stats = document.getElementById('stats');
                    const favoriteTags = document.getElementById('favorite-tags');
                    const recommendedImages = document.getElementById('recommended-images');
                    const recentActivity = document.getElementById('recent-activity');

                    profileInfo.innerHTML = `
                        <h3>${username}</h3>
                        <p>ID de Dispositivo: ${deviceId}</p>
                    `;

                    const interactions = JSON.parse(localStorage.getItem('userInteractions')) || {};
                    const totalImagesViewed = Object.keys(interactions).length;
                    const totalTimeSpent = Object.values(interactions).reduce((sum, img) => sum + (img.time || 0), 0);
                    const totalLikes = Object.values(interactions).reduce((sum, img) => sum + (img.likes || 0), 0);
                    stats.innerHTML = `
                        <p><strong>Imágenes Vistas:</strong> ${totalImagesViewed}</p>
                        <p><strong>Tiempo Total:</strong> ${Math.floor(totalTimeSpent / 60)} min ${totalTimeSpent % 60} seg</p>
                        <p><strong>Likes Dados:</strong> ${totalLikes}</p>
                    `;

                    const topTags = getTopTags(5);
                    favoriteTags.innerHTML = '<p><strong>Tus Tags Favoritos:</strong> ' + (topTags.length ? topTags.join(', ') : 'Aún no hay suficientes datos') + '</p>';

                    const interactedImageIds = Object.keys(interactions).map(id => Number(id));
                    const availableImages = images.filter(img => !interactedImageIds.includes(img.id));
                    if (availableImages.length > 0 && topTags.length > 0) {
                        const totalInteractions = Object.keys(interactions).length || 1;
                        const scoredImages = availableImages.map(img => ({
                            ...img,
                            score: calculateTagBasedScore(img, topTags) / totalInteractions + (Math.random() * 0.2)
                        })).sort((a, b) => b.score - a.score).slice(0, 3);

                        recommendedImages.innerHTML = '';
                        scoredImages.forEach(img => {
                            const div = document.createElement('div');
                            div.classList.add('gallery-item');
                            div.innerHTML = `
                                <img src="${img.url}" alt="${img.title}">
                                <span class="title">${img.title}</span>
                            `;
                            div.addEventListener('click', () => window.location.href = `image-detail.html?id=${img.id}`);
                            recommendedImages.appendChild(div);
                        });
                    } else {
                        recommendedImages.innerHTML = '<p>No hay suficientes datos para recomendaciones.</p>';
                    }

                    const recentImages = Object.entries(interactions)
                        .sort(([, a], [, b]) => b.lastInteraction - a.lastInteraction)
                        .slice(0, 3)
                        .map(([id]) => images.find(img => img.id === Number(id)));
                    recentActivity.innerHTML = '';
                    recentImages.forEach(img => {
                        if (img) {
                            const div = document.createElement('div');
                            div.classList.add('gallery-item');
                            div.innerHTML = `
                                <img src="${img.url}" alt="${img.title}">
                                <span class="title">${img.title}</span>
                            `;
                            div.addEventListener('click', () => window.location.href = `image-detail.html?id=${img.id}`);
                            recentActivity.appendChild(div);
                        }
                    });
                    if (recentImages.length === 0) {
                        recentActivity.innerHTML = '<p>No hay actividad reciente.</p>';
                    }

                    setupSearch();
                    setupLikes();
                    setupNotifications();
                    setupCommentNotifications();
                })
                .catch(error => console.error('Error al cargar imagenes.json en profile:', error));
        }
    }
});