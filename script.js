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
    let currentPage = 1;
    const itemsPerPage = 15;
    let filteredImages = [];

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
                    await db.ref(`users/${deviceId}`).set({ username: newUsername });
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

    function setupSearch() {
        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('search-btn');
        const resetBtn = document.getElementById('reset-btn');
        const searchToggle = document.getElementById('search-toggle');
        const searchContainer = document.getElementById('search-container');

        if (searchToggle && searchContainer) {
            searchToggle.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Search toggle clicked');
                searchContainer.style.display = searchContainer.style.display === 'none' || searchContainer.style.display === '' ? 'flex' : 'none';
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
                    currentPage = 1;
                    renderGallery();
                } else {
                    window.location.href = 'index.html';
                }
                searchContainer.style.display = 'none';
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
                        const likedImages = images.filter(img => likes[img.id] > 0);
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
                const isLiked = btn.classList.contains('liked');

                db.ref(`likes/${id}`).transaction(likes => {
                    const currentLikes = likes || 0;
                    const newLikes = isLiked ? currentLikes - 1 : currentLikes + 1;
                    return newLikes >= 0 ? newLikes : 0;
                }).then((result) => {
                    const newCount = result.snapshot.val();
                    btn.classList.toggle('liked');
                    btn.innerHTML = `<img src="like.png" alt="Like" class="like-icon"><span class="like-count">${newCount > 0 ? newCount : ''}</span>`;
                }).catch(error => console.error('Error al actualizar like:', error));
            }
        });
    }

    function setupNotifications() {
        const notificationsToggle = document.getElementById('notifications-toggle');
        const notificationsList = document.getElementById('notifications-list');

        if (notificationsToggle && notificationsList) {
            fetch('notificaciones.json')
                .then(response => response.json())
                .then(notifications => {
                    if (notifications.length > 0) {
                        notificationsToggle.classList.add('has-notifications');
                    }

                    notificationsToggle.addEventListener('click', (e) => {
                        e.preventDefault();
                        notificationsList.style.display = notificationsList.style.display === 'none' ? 'block' : 'none';
                        if (notificationsList.style.display === 'block') {
                            notificationsList.innerHTML = '';
                            notifications.forEach(notif => {
                                const div = document.createElement('div');
                                div.classList.add('notification');
                                div.textContent = notif.message;
                                notificationsList.appendChild(div);
                            });
                            notificationsToggle.classList.remove('has-notifications');
                        }
                    });
                })
                .catch(error => console.error('Error al cargar notificaciones.json:', error));
        }
    }

    function filterImages(query) {
        filteredImages = images.filter(img => 
            img.title.toLowerCase().includes(query.toLowerCase()) || 
            img.description.toLowerCase().includes(query.toLowerCase()) || 
            img.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
        );
        currentPage = 1;
        renderGallery();
    }

    function loadLikeState(id) {
        const btn = document.querySelector(`.like-btn[data-id="${id}"]`);
        if (btn) {
            db.ref(`likes/${id}`).once('value', snapshot => {
                const likes = snapshot.val() || 0;
                btn.innerHTML = `<img src="like.png" alt="Like" class="like-icon"><span class="like-count">${likes > 0 ? likes : ''}</span>`;
                if (likes > 0) btn.classList.add('liked');
            });
        }
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
                        renderGallery();
                    }

                    renderForYou();
                    renderMostLiked();
                    setupSearch();
                    setupLikes();
                    setupNotifications();
                })
                .catch(error => console.error('Error al cargar imagenes.json en index:', error));
        }

        function renderGallery() {
            const gallery = document.querySelector('.gallery');
            gallery.innerHTML = '';
            const start = (currentPage - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const paginatedImages = filteredImages.slice(start, end);

            paginatedImages.forEach(img => {
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

            renderPagination();
        }

        function renderPagination() {
            const pagination = document.getElementById('pagination');
            pagination.innerHTML = '';
            const totalPages = Math.ceil(filteredImages.length / itemsPerPage);
            const maxVisiblePages = 10;
            let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

            if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }

            if (startPage > 1) {
                const firstBtn = document.createElement('button');
                firstBtn.textContent = '1';
                firstBtn.addEventListener('click', () => {
                    currentPage = 1;
                    renderGallery();
                });
                pagination.appendChild(firstBtn);
                if (startPage > 2) {
                    pagination.appendChild(document.createTextNode(' ... '));
                }
            }

            for (let i = startPage; i <= endPage; i++) {
                const btn = document.createElement('button');
                btn.textContent = i;
                if (i === currentPage) btn.classList.add('active');
                btn.addEventListener('click', () => {
                    currentPage = i;
                    renderGallery();
                });
                pagination.appendChild(btn);
            }

            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    pagination.appendChild(document.createTextNode(' ... '));
                }
                const lastBtn = document.createElement('button');
                lastBtn.textContent = totalPages;
                lastBtn.addEventListener('click', () => {
                    currentPage = totalPages;
                    renderGallery();
                });
                pagination.appendChild(lastBtn);
            }
        }

        function renderForYou() {
            const forYou = document.querySelector('.for-you');
            let viewedImages = JSON.parse(localStorage.getItem('viewedImages')) || [];
            const filteredImages = images.filter(img => viewedImages.includes(img.id)).slice(0, 3);

            forYou.innerHTML = '';
            filteredImages.forEach(img => {
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
                    likeCount: likes[img.id] || 0
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

        fetch('imagenes.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('No se pudo cargar imagenes.json');
                }
                return response.json();
            })
            .then(data => {
                images = data;
                console.log('Imágenes cargadas en image-detail:', data);
                const image = data.find(img => img.id === Number(imageId));
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
                        loadLikeState(image.id); // Cargar estado del like para el botón en detalles
                    }
                    let viewedImages = JSON.parse(localStorage.getItem('viewedImages')) || [];
                    if (!viewedImages.includes(image.id)) {
                        viewedImages.push(image.id);
                        localStorage.setItem('viewedImages', JSON.stringify(viewedImages));
                    }
                    console.log('Detalles de la imagen cargados:', image);

                    if (similarGallery) {
                        const similarImages = images
                            .filter(img => img.id !== image.id && img.tags.some(tag => image.tags.includes(tag)))
                            .slice(0, 6);
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
});