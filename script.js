(async function () {
    document.addEventListener('DOMContentLoaded', async () => {
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
        let loadedImages = 9;
        const itemsPerLoad = 9;

        // Identificadores de usuario
        let deviceId = localStorage.getItem('deviceId') || 'device_' + Math.random().toString(36).substr(2, 9);
        let userUID = localStorage.getItem('userUID'); // Para sincronización entre dispositivos
        localStorage.setItem('deviceId', deviceId);
        let username = null;
        let unreadNotifications = 0;

        const homeBtn = document.getElementById('homeBtn');
        if (homeBtn) homeBtn.addEventListener('click', () => window.location.href = 'index.html');

        // Mostrar loader
        function showLoader(show = true) {
            const loader = document.getElementById('galleryLoader') || document.createElement('div');
            if (!loader.id) {
                loader.id = 'galleryLoader';
                loader.className = 'loader';
                loader.textContent = 'Cargando...';
                document.querySelector('.main-content')?.prepend(loader);
            }
            loader.style.display = show ? 'block' : 'none';
        }

        async function loadUsername() {
            const localPrefs = JSON.parse(localStorage.getItem('userPrefs') || '{}');
            username = localPrefs.username;
            const userRef = userUID ? db.ref(`users/${userUID}`) : db.ref(`users/${deviceId}`);
            const snapshot = await userRef.once('value');
            const userData = snapshot.val();
            if (userData && userData.username) {
                username = userData.username;
                localStorage.setItem('userPrefs', JSON.stringify({ username, lastTags: userData.lastTags || {} }));
                const authContainer = document.getElementById('authContainer');
                if (authContainer) authContainer.style.display = 'none';
            } else {
                const authContainer = document.getElementById('authContainer');
                if (authContainer) {
                    authContainer.style.display = 'block';
                    document.getElementById('overlay').style.display = 'block';
                }
            }
        }

        const usernameForm = document.getElementById('usernameForm');
        if (usernameForm) {
            usernameForm.addEventListener('submit', async e => {
                e.preventDefault();
                const newUsername = document.getElementById('username').value.trim();
                if (newUsername) {
                    const userRef = userUID ? db.ref(`users/${userUID}`) : db.ref(`users/${deviceId}`);
                    await userRef.set({ username: newUsername, lastTags: {} });
                    username = newUsername;
                    localStorage.setItem('userPrefs', JSON.stringify({ username, lastTags: {} }));
                    document.getElementById('authContainer').style.display = 'none';
                    document.getElementById('overlay').style.display = 'none';
                    loadGallery();
                }
            });
        }

        await loadUsername();

        function setupInteractions() {
            document.addEventListener('click', async e => {
                const likeBtn = e.target.closest('.like-btn');
                const likeCount = e.target.closest('.like-count'); // Nuevo: Detectar clic en "Me gusta"

                if (likeBtn || likeCount) {
                    const targetElement = likeBtn || likeCount; // Usar el botón o el texto
                    const postElement = targetElement.closest('.post, .post-detail');
                    const id = postElement.querySelector('.like-btn').dataset.id;
                    const isComment = targetElement.classList.contains('comment-like');
                    const ref = isComment ? `comments/${targetElement.dataset.imageId}/${id}/likes` : `likes/${id}`;
                    const countElement = postElement.querySelector('.like-count');

                    const snapshot = await db.ref(`${ref}/${deviceId}`).once('value');
                    const isLiked = snapshot.val() === true;
                    await db.ref(`${ref}/${deviceId}`).set(!isLiked);
                    postElement.querySelector('.like-btn').classList.toggle('liked', !isLiked);

                    const countSnapshot = await db.ref(ref).once('value');
                    const count = Object.keys(countSnapshot.val() || {}).length;
                    if (countElement) countElement.textContent = `${count} Me gusta`;

                    if (!isLiked && !isComment) {
                        const image = images.find(img => img.id === Number(id));
                        notifyUser(image.uploadedBy, `${username} dio me gusta a tu publicación`, id);
                        const userRef = userUID ? db.ref(`users/${userUID}/lastTags`) : db.ref(`users/${deviceId}/lastTags`);
                        image.tags.forEach(tag => {
                            userRef.child(tag).transaction(val => ({ count: (val?.count || 0) + 1, timestamp: Date.now() }));
                        });
                        localStorage.setItem('userPrefs', JSON.stringify({
                            username,
                            lastTags: Object.fromEntries(image.tags.map(tag => [tag, { count: 1, timestamp: Date.now() }]))
                        }));
                    }
                }

                const commentBtn = e.target.closest('.comment-btn');
                if (commentBtn) {
                    const id = commentBtn.closest('.post, .post-detail').querySelector('.like-btn').dataset.id;
                    window.location.href = `image-detail.html?id=${id}`;
                }

                const replyBtn = e.target.closest('.reply-btn');
                if (replyBtn) {
                    const commentItem = replyBtn.closest('li');
                    let replyForm = commentItem.querySelector('.reply-form');
                    if (!replyForm) {
                        replyForm = document.createElement('div');
                        replyForm.classList.add('reply-form');
                        replyForm.innerHTML = `<input type="text" placeholder="Responder...">`;
                        commentItem.appendChild(replyForm);
                        replyForm.querySelector('input').addEventListener('keypress', handleReplySubmit);
                    }
                    replyForm.style.display = replyForm.style.display === 'none' ? 'flex' : 'none';
                    if (replyForm.style.display === 'flex') replyForm.querySelector('input').focus();
                }

                const postImage = e.target.closest('.post-image');
                if (postImage && document.querySelector('.gallery')) {
                    const id = postImage.closest('.post').querySelector('.like-btn').dataset.id;
                    window.location.href = `image-detail.html?id=${id}`;
                    db.ref(`views/${id}/${deviceId}`).set(true);
                }
            });

            async function handleReplySubmit(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const replyForm = e.target.closest('.reply-form');
                    const text = e.target.value.trim();
                    const commentItem = replyForm.closest('li');
                    const imageId = commentItem.closest('.comments-section') ? new URLSearchParams(window.location.search).get('id') : commentItem.closest('.post').querySelector('.like-btn').dataset.id;
                    const commentId = commentItem.dataset.commentId;

                    if (text && username) {
                        const replyRef = await db.ref(`comments/${imageId}/${commentId}/replies`).push({
                            text,
                            timestamp: Date.now(),
                            username,
                            deviceId
                        });
                        replyForm.style.display = 'none';
                        e.target.value = '';
                        loadComments(imageId);
                        const commentAuthor = commentItem.querySelector('.comment-author').textContent;
                        if (commentAuthor !== username) {
                            notifyUser(commentAuthor, `${username} respondió a tu comentario`, imageId, replyRef.key);
                        }
                    }
                }
            }
        }

        async function notifyUser(targetUsername, message, imageId, replyId = null) {
            if (targetUsername && targetUsername !== username) {
                const snapshot = await db.ref('users').orderByChild('username').equalTo(targetUsername).once('value');
                const userData = snapshot.val();
                if (userData) {
                    const targetDeviceId = Object.keys(userData)[0];
                    await db.ref(`notifications/${targetDeviceId}`).push({
                        message,
                        imageId,
                        replyId,
                        timestamp: Date.now(),
                        read: false
                    });
                }
            }
        }

        async function loadLikesAndViews(id, post) {
            const likeBtn = post.querySelector('.like-btn');
            const likeCount = post.querySelector('.like-count');
            const viewCount = post.querySelector('.view-count');

            const likeSnapshot = await db.ref(`likes/${id}`).once('value');
            const likes = Object.keys(likeSnapshot.val() || {}).length;
            if (likeCount) likeCount.textContent = `${likes} Me gusta`;
            likeBtn.classList.toggle('liked', likeSnapshot.val()?.[deviceId] === true);
            likeBtn.dataset.id = id;

            if (viewCount) {
                const viewSnapshot = await db.ref(`views/${id}`).once('value');
                viewCount.textContent = `${Object.keys(viewSnapshot.val() || {}).length} Vistas`;
            }
        }

        async function loadCommentLikes(imageId, commentId, likeBtn, likeCount) {
            const snapshot = await db.ref(`comments/${imageId}/${commentId}/likes`).once('value');
            const likes = Object.keys(snapshot.val() || {}).length;
            likeCount.textContent = likes > 0 ? `${likes} Me gusta` : '';
            likeBtn.classList.toggle('liked', snapshot.val()?.[deviceId] === true);
            likeBtn.dataset.id = commentId;
            likeBtn.dataset.imageId = imageId;
        }

        async function loadGallery() {
            try {
                showLoader(true);
                const response = await fetch('imagenes.json');
                if (!response.ok) throw new Error('Error al cargar imágenes');
                images = await response.json();

                const userRef = userUID ? db.ref(`users/${userUID}/lastTags`) : db.ref(`users/${deviceId}/lastTags`);
                const tagsSnapshot = await userRef.once('value');
                const userTags = tagsSnapshot.val() || {};
                
                // Ordenamiento con factor de tiempo
                const now = Date.now();
                const decayFactor = 0.00000001; // Reduce peso con el tiempo (ajústalo según necesidad)
                images.sort((a, b) => {
                    const aScore = a.tags.reduce((sum, tag) => {
                        const tagData = userTags[tag] || { count: 0, timestamp: 0 };
                        const age = (now - tagData.timestamp) * decayFactor;
                        return sum + (tagData.count * (1 - age));
                    }, 0);
                    const bScore = b.tags.reduce((sum, tag) => {
                        const tagData = userTags[tag] || { count: 0, timestamp: 0 };
                        const age = (now - tagData.timestamp) * decayFactor;
                        return sum + (tagData.count * (1 - age));
                    }, 0);
                    return bScore - aScore;
                });

                filteredImages = [...images];
                renderGallery(true);
                setupInteractions();
                setupSearch();
                setupNotifications();

                const sentinel = document.getElementById('sentinel');
                if (sentinel) {
                    const observer = new IntersectionObserver((entries) => {
                        if (entries[0].isIntersecting && loadedImages < filteredImages.length) {
                            renderGallery(false);
                        }
                    }, { rootMargin: '100px' });
                    observer.observe(sentinel);
                }
            } catch (error) {
                console.error('Error en loadGallery:', error);
                document.getElementById('gallery').innerHTML = '<p>Error al cargar imágenes</p>';
            } finally {
                showLoader(false);
            }
        }

        function renderGallery(reset = false) {
            const gallery = document.getElementById('gallery');
            if (reset) {
                gallery.innerHTML = '';
                loadedImages = 0;
            }

            const nextImages = filteredImages.slice(loadedImages, loadedImages + itemsPerLoad);
            nextImages.forEach(img => {
                const post = document.createElement('div');
                post.classList.add('post');
                post.innerHTML = `
                    <div class="post-image"><img src="${img.url}" alt="${img.title}" loading="lazy"></div>
                    <div class="post-info">
                        <span class="post-title">${img.title}</span>
                        <div class="post-actions">
                            <button class="like-btn"><i class="far fa-thumbs-up"></i></button>
                            <span class="like-count"></span>
                        </div>
                    </div>
                `;
                gallery.appendChild(post);
                loadLikesAndViews(img.id, post);
                gsap.from(post, { opacity: 0, y: 20, duration: 0.5 });
            });
            loadedImages += nextImages.length;
        }

        function setupSearch() {
            const toggle = document.getElementById('searchToggle');
            const bar = document.getElementById('searchBar');
            const input = document.getElementById('searchInput');
            const btn = document.getElementById('searchBtn');
            const resultsWindow = document.getElementById('searchResultsWindow');
            const results = document.getElementById('searchResults');
            const closeBtn = document.getElementById('searchResultsCloseBtn');

            if (!toggle || !bar || !input || !btn || !resultsWindow || !results || !closeBtn) {
                console.error('Elementos del buscador no encontrados');
                return;
            }

            toggle.addEventListener('click', () => {
                bar.style.display = bar.style.display === 'none' ? 'flex' : 'none';
                if (bar.style.display === 'flex') input.focus();
            });

            btn.addEventListener('click', search);
            let timeout;
            input.addEventListener('input', () => {
                clearTimeout(timeout);
                timeout = setTimeout(search, 300); // Debounce de 300ms
            });

            closeBtn.addEventListener('click', () => {
                resultsWindow.style.display = 'none';
                document.getElementById('overlay').style.display = 'none';
                bar.style.display = 'none';
            });

            function search() {
                const query = input.value.trim().toLowerCase();
                if (!query) {
                    results.innerHTML = '<p>Ingresa un término de búsqueda</p>';
                    resultsWindow.style.display = 'block';
                    document.getElementById('overlay').style.display = 'block';
                    return;
                }

                if (!images.length) {
                    results.innerHTML = '<p>Cargando imágenes, intenta de nuevo</p>';
                    resultsWindow.style.display = 'block';
                    document.getElementById('overlay').style.display = 'block';
                    return;
                }

                const searchTerms = query.split(/\s+/);
                const filtered = images.filter(img => {
                    const title = img.title.toLowerCase();
                    const description = img.description.toLowerCase();
                    const tags = img.tags.map(tag => tag.toLowerCase());
                    return searchTerms.every(term => 
                        title.includes(term) || 
                        description.includes(term) || 
                        tags.some(tag => tag.includes(term))
                    );
                });

                results.innerHTML = filtered.map(img => `
                    <div class="result-item" data-id="${img.id}">
                        <img src="${img.url}" alt="${img.title}">
                        <span>${img.title}</span>
                    </div>
                `).join('') || '<p>No hay resultados</p>';
                resultsWindow.style.display = 'block';
                document.getElementById('overlay').style.display = 'block';
            }

            results.addEventListener('click', e => {
                const item = e.target.closest('.result-item');
                if (item) window.location.href = `image-detail.html?id=${item.dataset.id}`;
            });
        }

        function setupNotifications() {
            const toggle = document.getElementById('notificationsToggle');
            const window = document.getElementById('notificationsWindow');
            const list = document.getElementById('notificationsList');
            const badge = document.getElementById('notificationsBadge');
            const closeBtn = document.getElementById('notificationsCloseBtn');

            if (toggle) toggle.addEventListener('click', async () => {
                window.style.display = 'block';
                document.getElementById('overlay').style.display = 'block';
                const snapshot = await db.ref(`notifications/${deviceId}`).once('value');
                const notifs = snapshot.val();
                list.innerHTML = notifs ? Object.entries(notifs).map(([id, n]) => `
                    <div class="notification-item" data-id="${id}">${n.message}</div>
                `).join('') : '<p>No hay notificaciones</p>';
                unreadNotifications = notifs ? Object.values(notifs).filter(n => !n.read).length : 0;
                badge.textContent = unreadNotifications;
                badge.style.display = unreadNotifications > 0 ? 'inline-flex' : 'none';
            });

            if (closeBtn) closeBtn.addEventListener('click', () => {
                window.style.display = 'none';
                document.getElementById('overlay').style.display = 'none';
            });
        }

        if (document.querySelector('.gallery')) {
            if (username) loadGallery();
        }

        if (document.querySelector('.post-detail')) {
            const id = new URLSearchParams(window.location.search).get('id');
            if (!username) window.location.href = 'index.html';

            try {
                showLoader(true);
                const response = await fetch('imagenes.json');
                if (!response.ok) throw new Error('No se pudo cargar imagenes.json');
                images = await response.json();

                const img = images.find(i => i.id === Number(id));
                if (img) {
                    const post = document.querySelector('.post-detail');
                    post.querySelector('#imageViewer').innerHTML = `<img src="${img.url}" alt="${img.title}">`;
                    post.querySelector('.post-title').textContent = img.title;
                    post.querySelector('.post-description').textContent = img.description || 'Sin descripción';
                    loadLikesAndViews(id, post);
                    db.ref(`views/${id}/${deviceId}`).set(true);
                    new Viewer(document.getElementById('imageViewer'), { navbar: false });
                    loadComments(id);

                    const similarSection = document.createElement('section');
                    similarSection.classList.add('similar-section');
                    similarSection.innerHTML = '<h2>Similares</h2><div class="similar-gallery"></div>';
                    document.querySelector('.main-content').appendChild(similarSection);
                    const similarGallery = document.querySelector('.similar-gallery');
                    const similarImages = images
                        .filter(i => i.id !== Number(id) && i.tags.some(tag => img.tags.includes(tag)))
                        .sort(() => 0.5 - Math.random())
                        .slice(0, 6);
                    similarImages.forEach(i => {
                        const similarPost = document.createElement('div');
                        similarPost.classList.add('post');
                        similarPost.innerHTML = `<div class="post-image"><img src="${i.url}" alt="${i.title}" loading="lazy"></div>`;
                        similarPost.addEventListener('click', () => window.location.href = `image-detail.html?id=${i.id}`);
                        similarGallery.appendChild(similarPost);
                    });
                } else {
                    document.querySelector('.post-detail').innerHTML = '<p>Imagen no encontrada</p>';
                }

                setupInteractions();
                setupSearch();
                setupNotifications();

                const commentForm = document.getElementById('commentForm');
                if (commentForm) {
                    commentForm.addEventListener('submit', async e => {
                        e.preventDefault();
                        const text = document.getElementById('commentText').value.trim();
                        if (text && username) {
                            const commentRef = await db.ref(`comments/${id}`).push({
                                text,
                                timestamp: Date.now(),
                                username,
                                deviceId
                            });
                            document.getElementById('commentText').value = '';
                            loadComments(id);
                            notifyUser(img.uploadedBy, `${username} comentó tu publicación`, id, commentRef.key);
                        }
                    });
                }
            } catch (error) {
                console.error('Error al cargar detalles:', error);
                document.querySelector('.post-detail').innerHTML = '<p>Error al cargar la imagen</p>';
            } finally {
                showLoader(false);
            }

            async function loadComments(imageId) {
                const commentsList = document.getElementById('commentsList');
                const snapshot = await db.ref(`comments/${imageId}`).once('value');
                commentsList.innerHTML = '';

                const comments = snapshot.val();
                if (comments) {
                    const commentsArray = Object.entries(comments)
                        .map(([commentId, comment]) => ({
                            id: commentId,
                            ...comment
                        }))
                        .sort((a, b) => a.timestamp - b.timestamp);

                    commentsArray.forEach(comment => {
                        const commentItem = document.createElement('li');
                        commentItem.dataset.commentId = comment.id;
                        commentItem.innerHTML = `
                            <div class="comment-avatar"></div>
                            <div class="comment-content">
                                <span class="comment-author">${comment.username}</span>
                                <span class="comment-text">${comment.text}</span>
                                <div class="comment-actions">
                                    <button class="like-btn comment-like"><i class="far fa-thumbs-up"></i></button>
                                    <span class="like-count"></span>
                                    <a href="#" class="reply-btn">Responder</a>
                                </div>
                            </div>
                        `;
                        if (comment.replies) {
                            const repliesList = document.createElement('ul');
                            repliesList.classList.add('replies');
                            const repliesArray = Object.entries(comment.replies)
                                .map(([replyId, reply]) => ({
                                    id: replyId,
                                    ...reply
                                }))
                                .sort((a, b) => a.timestamp - b.timestamp);
                            repliesArray.forEach(reply => {
                                const replyItem = document.createElement('li');
                                replyItem.dataset.commentId = reply.id;
                                replyItem.innerHTML = `
                                    <div class="comment-avatar"></div>
                                    <div class="comment-content">
                                        <span class="comment-author">${reply.username}</span>
                                        <span class="comment-text">${reply.text}</span>
                                        <div class="comment-actions">
                                            <button class="like-btn comment-like"><i class="far fa-thumbs-up"></i></button>
                                            <span class="like-count"></span>
                                            <a href="#" class="reply-btn">Responder</a>
                                        </div>
                                    </div>
                                `;
                                repliesList.appendChild(replyItem);
                                loadCommentLikes(imageId, reply.id, replyItem.querySelector('.like-btn'), replyItem.querySelector('.like-count'));
                            });
                            commentItem.appendChild(repliesList);
                        }
                        commentsList.appendChild(commentItem);
                        loadCommentLikes(imageId, comment.id, commentItem.querySelector('.like-btn'), commentItem.querySelector('.like-count'));
                    });
                }
            }
        }
    });
})();