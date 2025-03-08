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
    let unreadComments = 0;
    let interactedImages = JSON.parse(localStorage.getItem('interactedImages')) || {};
    let tagScores = JSON.parse(localStorage.getItem('tagScores')) || {};
    let viewedNotifications = JSON.parse(localStorage.getItem('viewedNotifications')) || {};

    function getColorFromUserId(userId) {
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = userId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = hash % 360;
        return `hsl(${hue}, 70%, 50%)`;
    }

    function updateTagScores(tags, action, imageId) {
        if (imageId) {
            interactedImages[imageId] = true;
            localStorage.setItem('interactedImages', JSON.stringify(interactedImages));
        }
        if (action === 'view') {
            tags.forEach(tag => tagScores[tag] = (tagScores[tag] || 0) + 1);
        } else if (action === 'like') {
            tags.forEach(tag => tagScores[tag] = (tagScores[tag] || 0) + 3);
        }
        localStorage.setItem('tagScores', JSON.stringify(tagScores));
    }

    async function loadUsername() {
        const snapshot = await dbRealtime.ref(`users/${deviceId}`).once('value');
        const userData = snapshot.val();
        if (userData && userData.username) {
            username = userData.username;
            document.querySelectorAll('#user-info').forEach(el => el.textContent = username);
            const authContainer = document.getElementById('auth-container');
            if (authContainer) authContainer.style.display = 'none';
        } else {
            const authContainer = document.getElementById('auth-container');
            if (authContainer) authContainer.style.display = 'block';
        }
    }

    const usernameForm = document.getElementById('username-form');
    if (usernameForm) {
        usernameForm.addEventListener('submit', async e => {
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

    document.addEventListener('click', e => {
        const windows = [
            { toggle: '#search-toggle', window: '#search-container', anim: { y: -100, opacity: 0 } },
            { toggle: '#chat-toggle', window: '#chat-window', anim: { y: 100, opacity: 0 } },
            { toggle: '#notifications-toggle', window: '#notifications-window', anim: { y: -100, opacity: 0 } },
            { toggle: '#filter-toggle', window: '#filter-window', anim: { x: -300, onComplete: () => document.querySelector('#filter-window').style.display = 'none' } }
        ];
        windows.forEach(w => {
            const toggle = document.querySelector(w.toggle);
            const win = document.querySelector(w.window);
            if (win && toggle && !toggle.contains(e.target) && !win.contains(e.target) && win.style.display !== 'none') {
                win.classList.remove('open');
                gsap.to(win, { ...w.anim, duration: 0.3 });
                if (w.window !== '#filter-window') win.style.display = 'none';
            }
        });
    });

    function setupSearch() {
        const searchToggle = document.getElementById('search-toggle');
        const searchContainer = document.getElementById('search-container');
        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('search-btn');
        const resetBtn = document.getElementById('reset-btn');
        const searchResults = document.getElementById('search-results');

        if (searchToggle && searchContainer && searchInput && searchBtn && resetBtn && searchResults) {
            searchToggle.addEventListener('click', e => {
                e.preventDefault();
                const isVisible = searchContainer.style.display === 'none';
                searchContainer.style.display = isVisible ? 'flex' : 'none';
                gsap.to(searchContainer, { y: isVisible ? 0 : -100, opacity: isVisible ? 1 : 0, duration: 0.3 });
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
                if (results.length) gsap.from('.result-item', { opacity: 0, y: 20, stagger: 0.1, duration: 0.3 });
            }
        }
    }

    function setupLikesAndComments() {
        document.addEventListener('click', e => {
            if (e.target.closest('.like-btn')) {
                const btn = e.target.closest('.like-btn');
                const id = btn.dataset.id;
                const countElement = btn.nextElementSibling;

                dbRealtime.ref(`likes/${id}/${deviceId}`).once('value', snapshot => {
                    const isLiked = snapshot.val() === true;
                    dbRealtime.ref(`likes/${id}/${deviceId}`).set(!isLiked).then(() => {
                        btn.classList.toggle('liked', !isLiked);
                        gsap.to(btn.querySelector('i'), { scale: 1.2, duration: 0.2, yoyo: true, repeat: 1 });

                        dbRealtime.ref(`likes/${id}`).once('value', countSnapshot => {
                            const likesData = countSnapshot.val() || {};
                            const count = Object.keys(likesData).length || 0;
                            if (countElement && countElement.classList.contains('like-count')) countElement.textContent = count;
                            if (!isLiked) updateTagScores(images.find(img => img.id === Number(id)).tags, 'like', id);
                        });
                    });
                });
            } else if (e.target.closest('.comment-btn')) {
                const imageId = new URLSearchParams(window.location.search).get('id');
                if (imageId) document.getElementById('comment-text').focus();
            } else if (e.target.closest('.share-btn')) {
                const imageId = new URLSearchParams(window.location.search).get('id');
                if (imageId) {
                    const image = images.find(img => img.id === Number(imageId));
                    if (image && navigator.clipboard) {
                        const shareUrl = `${window.location.origin}/image-detail.html?id=${imageId}`;
                        navigator.clipboard.writeText(shareUrl)
                            .then(() => alert('¡Enlace copiado al portapapeles!'))
                            .catch(err => console.error('Error al copiar enlace:', err));
                    } else {
                        alert('No se pudo copiar el enlace. Intenta manualmente.');
                    }
                }
            }
        });

        document.querySelectorAll('.image-viewer img').forEach(img => {
            img.addEventListener('dblclick', () => {
                const likeBtn = img.closest('.image-container').querySelector('.like-btn');
                if (likeBtn && !likeBtn.classList.contains('liked')) {
                    likeBtn.click();
                    gsap.to(img, { scale: 1.1, duration: 0.2, yoyo: true, repeat: 1 });
                }
            });
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

        if (chatToggle && chatWindow && chatCloseBtn && chatForm && chatInput && chatMessages && emojiBtn && emojiPicker && chatNotification) {
            let lastMessageCount = 0;

            chatToggle.addEventListener('click', e => {
                e.preventDefault();
                const isVisible = chatWindow.style.display === 'none';
                chatWindow.style.display = isVisible ? 'block' : 'none';
                gsap.to(chatWindow, { y: isVisible ? 0 : 100, opacity: isVisible ? 1 : 0, duration: 0.3 });
                if (isVisible && !chatMessages.dataset.loaded) {
                    loadChatMessages();
                    chatMessages.dataset.loaded = 'true';
                }
                if (isVisible) {
                    unreadMessages = 0;
                    updateChatNotificationBadge();
                }
            });

            chatCloseBtn.addEventListener('click', () => {
                chatWindow.style.display = 'none';
                gsap.to(chatWindow, { y: 100, opacity: 0, duration: 0.3 });
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

            function updateChatNotificationBadge() {
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
                            updateChatNotificationBadge();
                        }
                        lastMessageCount = currentMessageCount;

                        chatMessages.innerHTML = '';
                        snapshot.forEach(doc => {
                            const data = doc.data();
                            const div = document.createElement('div');
                            div.classList.add('chat-message');
                            if (data.userId === deviceId) div.classList.add('mine');
                            div.innerHTML = `
                                <p><strong>${data.username}</strong>: ${data.text}</p>
                                <span>${new Date(data.timestamp).toLocaleTimeString()}</span>
                            `;
                            if (data.userId !== deviceId) {
                                div.querySelector('p').style.backgroundColor = getColorFromUserId(data.userId);
                                div.querySelector('p').style.color = '#fff';
                            }
                            chatMessages.insertBefore(div, chatMessages.firstChild);
                        });
                        gsap.from('.chat-message', { opacity: 0, y: 10, stagger: 0.1, duration: 0.3 });
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    });
            }
        }
    }

    function setupFilters() {
        const filterToggle = document.getElementById('filter-toggle');
        const filterWindow = document.getElementById('filter-window');
        const filterCloseBtn = document.getElementById('filter-close-btn');
        const resetFilterBtn = document.getElementById('reset-filter-btn');
        const filterCheckboxes = document.querySelectorAll('#filter-window input[type="checkbox"]');

        if (filterToggle && filterWindow && filterCloseBtn && resetFilterBtn) {
            filterToggle.addEventListener('click', e => {
                e.preventDefault();
                const isVisible = filterWindow.style.display === 'none';
                filterWindow.style.display = 'block';
                filterWindow.classList.toggle('open', isVisible);
                gsap.to(filterWindow, { x: isVisible ? 0 : -300, duration: 0.3, ease: 'power2.inOut', onComplete: () => !isVisible && (filterWindow.style.display = 'none') });
            });

            filterCloseBtn.addEventListener('click', () => {
                filterWindow.classList.remove('open');
                gsap.to(filterWindow, { x: -300, duration: 0.3, ease: 'power2.in', onComplete: () => filterWindow.style.display = 'none' });
            });

            filterCheckboxes.forEach(checkbox => checkbox.addEventListener('change', applyFilters));
            resetFilterBtn.addEventListener('click', () => {
                filterCheckboxes.forEach(checkbox => checkbox.checked = false);
                applyFilters();
            });

            function applyFilters() {
                const selectedFilters = Array.from(filterCheckboxes)
                    .filter(checkbox => checkbox.checked)
                    .map(checkbox => checkbox.value.toLowerCase());
                filteredImages = selectedFilters.length === 0 ? [...images] : images.filter(img => 
                    selectedFilters.some(filter => img.tags.some(tag => tag.toLowerCase() === filter))
                );
                loadedImages = 0;
                renderGallery(true);
            }
        }
    }

    function setupNotifications() {
        const notificationsToggle = document.getElementById('notifications-toggle');
        const notificationsWindow = document.getElementById('notifications-window');
        const notificationsCloseBtn = document.getElementById('notifications-close-btn');
        const notificationsList = document.getElementById('notifications-list');
        const notificationsBadge = document.getElementById('notifications-badge');

        if (notificationsToggle && notificationsWindow && notificationsCloseBtn && notificationsList && notificationsBadge) {
            notificationsToggle.addEventListener('click', e => {
                e.preventDefault();
                const isVisible = notificationsWindow.style.display === 'none';
                notificationsWindow.style.display = isVisible ? 'block' : 'none';
                gsap.to(notificationsWindow, { y: isVisible ? 0 : -100, opacity: isVisible ? 1 : 0, duration: 0.3 });
                if (isVisible) {
                    loadNotifications();
                }
            });

            notificationsCloseBtn.addEventListener('click', () => {
                notificationsWindow.style.display = 'none';
                gsap.to(notificationsWindow, { y: -100, opacity: 0, duration: 0.3 });
            });

            function updateNotificationsBadge() {
                notificationsBadge.textContent = unreadComments;
                notificationsBadge.style.display = unreadComments > 0 ? 'flex' : 'none';
                if (unreadComments > 0) gsap.from(notificationsBadge, { scale: 0.8, opacity: 0, duration: 0.3 });
            }

            function markNotificationAsViewed(imageId, commentId) {
                const key = `${imageId}-${commentId}`;
                if (!viewedNotifications[key]) {
                    viewedNotifications[key] = true;
                    unreadComments = Math.max(0, unreadComments - 1);
                    localStorage.setItem('viewedNotifications', JSON.stringify(viewedNotifications));
                    updateNotificationsBadge();
                }
            }

            function loadNotifications() {
                notificationsList.innerHTML = '';
                let newNotifications = 0;

                Object.keys(interactedImages).forEach(imageId => {
                    dbRealtime.ref(`comments/${imageId}`).once('value', snapshot => {
                        const comments = snapshot.val();
                        if (comments) {
                            Object.entries(comments).forEach(([commentId, comment]) => {
                                const key = `${imageId}-${commentId}`;
                                if (!viewedNotifications[key] && comment.deviceId !== deviceId) { // No notificar comentarios propios
                                    const div = document.createElement('div');
                                    div.classList.add('notification-item');
                                    div.dataset.commentId = commentId;
                                    div.dataset.imageId = imageId;
                                    div.innerHTML = `<span>${comment.username} comentó: "${comment.text}"</span>`;
                                    div.addEventListener('click', () => {
                                        markNotificationAsViewed(imageId, commentId);
                                        window.location.href = `image-detail.html?id=${imageId}`;
                                    });
                                    notificationsList.appendChild(div);
                                    newNotifications++;
                                }
                            });
                            gsap.from('.notification-item', { opacity: 0, y: 10, stagger: 0.1, duration: 0.3 });
                        }
                    });
                });

                // Actualizar el conteo solo si hay nuevas notificaciones
                if (newNotifications > unreadComments) {
                    unreadComments = newNotifications;
                    updateNotificationsBadge();
                }
            }

            // Escuchar nuevos comentarios en tiempo real
            Object.keys(interactedImages).forEach(imageId => {
                let lastCommentCount = 0;
                dbRealtime.ref(`comments/${imageId}`).on('value', snapshot => {
                    const comments = snapshot.val();
                    const currentCommentCount = comments ? Object.keys(comments).length : 0;
                    const urlParams = new URLSearchParams(window.location.search);
                    const currentImageId = urlParams.get('id');

                    if (currentImageId === imageId) {
                        // Si estamos en la página de la imagen, marcar los comentarios como vistos
                        if (comments) {
                            Object.entries(comments).forEach(([commentId]) => {
                                markNotificationAsViewed(imageId, commentId);
                            });
                        }
                    } else if (currentCommentCount > lastCommentCount) {
                        const newComments = Object.entries(comments || {}).slice(lastCommentCount);
                        newComments.forEach(([commentId, comment]) => {
                            const key = `${imageId}-${commentId}`;
                            if (!viewedNotifications[key] && comment.deviceId !== deviceId) {
                                unreadComments++;
                                updateNotificationsBadge();
                            }
                        });
                    }
                    lastCommentCount = currentCommentCount;
                });
            });
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
                    if (countElement && countElement.classList.contains('like-count')) countElement.textContent = count;
                    btn.classList.toggle('liked', likesData[deviceId] === true);
                });
            } else {
                dbRealtime.ref(`likes/${id}`).off();
            }
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
                    setupSearch();
                    setupLikesAndComments();
                    setupChat();
                    setupFilters();
                    setupNotifications();

                    const sentinel = document.getElementById('sentinel');
                    if (sentinel) {
                        const observer = new IntersectionObserver(entries => {
                            if (entries[0].isIntersecting && loadedImages < filteredImages.length) renderGallery(false);
                        }, { rootMargin: '200px' });
                        observer.observe(sentinel);
                    }
                })
                .catch(error => console.error('Error al cargar imagenes.json:', error));
        }

        function renderGallery(reset = false) {
            const gallery = document.querySelector('.gallery');
            if (reset) {
                gallery.innerHTML = '';
                loadedImages = 0;

                const topTags = Object.entries(tagScores).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag]) => tag);
                let topImages = images.filter(img => topTags.some(tag => img.tags.includes(tag)));
                topImages = topImages.sort(() => 0.5 - Math.random()).slice(0, 9);
                const remainingImages = images.filter(img => !topImages.some(t => t.id === img.id));
                filteredImages = [...topImages, ...remainingImages];
            }

            const nextImages = filteredImages.slice(loadedImages, loadedImages + itemsPerLoad);
            nextImages.forEach(img => {
                const div = document.createElement('div');
                div.classList.add('grid-item');
                div.innerHTML = `<img src="${img.url}" alt="${img.title}" loading="lazy">`;
                div.addEventListener('click', () => {
                    updateTagScores(img.tags, 'view', img.id);
                    window.location.href = `image-detail.html?id=${img.id}`;
                });
                gallery.appendChild(div);
            });
            loadedImages += nextImages.length;
        }
    }

    if (document.querySelector('.image-container')) {
        const urlParams = new URLSearchParams(window.location.search);
        const imageId = urlParams.get('id');
        if (!username) window.location.href = 'index.html';

        const userInfo = document.querySelector('#user-info');
        if (userInfo) userInfo.textContent = username;

        fetch('imagenes.json')
            .then(response => response.json())
            .then(data => {
                images = data;
                const image = images.find(img => img.id === Number(imageId));
                const imageContainer = document.querySelector('.image-container');
                const imageViewer = document.getElementById('image-viewer');
                const likeBtn = imageContainer.querySelector('.like-btn');
                const commentCount = document.querySelector('.comment-count');

                if (image) {
                    imageViewer.innerHTML = `<img src="${image.url}" alt="${image.title}">`;
                    likeBtn.dataset.id = image.id;
                    likeBtn.style.display = 'inline-block';
                    const viewer = new Viewer(imageViewer, {
                        inline: false,
                        navbar: false,
                        toolbar: { zoomOut: 1, oneToOne: 1, reset: 1, rotateLeft: 1, rotateRight: 1, flipHorizontal: 1, flipVertical: 1 },
                        title: false,
                        viewed() { viewer.zoomTo(1); }
                    });
                    document.querySelector('.post-meta .title').textContent = image.title;
                    document.querySelector('.post-meta .description').textContent = image.description || 'Sin descripción';
                    updateTagScores(image.tags, 'view', image.id);

                    const similarGallery = document.querySelector('.similar-gallery');
                    const similarImages = images
                        .filter(img => img.id !== image.id)
                        .map(img => ({ ...img, similarity: img.tags.reduce((sum, tag) => sum + (image.tags.includes(tag) ? 1 : 0), 0) }))
                        .sort((a, b) => b.similarity - a.similarity)
                        .slice(0, 9);
                    similarImages.forEach(img => {
                        const div = document.createElement('div');
                        div.classList.add('grid-item');
                        div.innerHTML = `<img src="${img.url}" alt="${img.title}" loading="lazy">`;
                        div.addEventListener('click', () => window.location.href = `image-detail.html?id=${img.id}`);
                        similarGallery.appendChild(div);
                    });

                    const observer = new IntersectionObserver(setupGalleryLikeListeners, { rootMargin: '100px' });
                    observer.observe(likeBtn);

                    dbRealtime.ref(`comments/${imageId}`).on('value', snapshot => {
                        const comments = snapshot.val();
                        const count = comments ? Object.keys(comments).length : 0;
                        if (commentCount) commentCount.textContent = `${count} comentarios`;
                    });
                } else {
                    imageContainer.innerHTML = '<p>Imagen no encontrada</p>';
                }

                setupSearch();
                setupLikesAndComments();
                setupChat();
                setupFilters();
                setupNotifications();
            })
            .catch(error => {
                console.error('Error al cargar imagenes.json:', error);
                document.querySelector('.image-container').innerHTML = `<p>Error: ${error.message}</p>`;
            });

        const commentForm = document.getElementById('comment-form');
        if (commentForm) {
            commentForm.addEventListener('submit', e => {
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
        }

        let allComments = [];
        let displayedComments = 0;
        const commentsPerPage = 10;

        function renderComments(commentsList, commentsArray, startIndex, endIndex) {
            for (let i = startIndex; i < endIndex && i < commentsArray.length; i++) {
                const [commentId, comment] = commentsArray[i];
                const commentDiv = document.createElement('div');
                commentDiv.classList.add('comment');
                commentDiv.dataset.commentId = commentId;
                commentDiv.innerHTML = `
                    <div class="content">
                        <strong>${comment.username}</strong> ${comment.text}
                        <span class="timestamp">${new Date(comment.timestamp).toLocaleTimeString()}</span>
                        <a href="#" class="reply-btn">Responder</a>
                    </div>
                    <div class="replies"></div>
                `;

                if (comment.replies) {
                    const repliesDiv = commentDiv.querySelector('.replies');
                    const repliesArray = Object.entries(comment.replies);
                    repliesArray.forEach(([replyId, reply]) => {
                        const replyDiv = document.createElement('div');
                        replyDiv.classList.add('comment', 'reply');
                        replyDiv.dataset.replyId = replyId;
                        replyDiv.innerHTML = `
                            <div class="content">
                                <strong>${reply.username}</strong> ${reply.text}
                                <span class="timestamp">${new Date(reply.timestamp).toLocaleTimeString()}</span>
                                <a href="#" class="reply-btn">Responder</a>
                            </div>
                        `;
                        repliesDiv.appendChild(replyDiv);
                        setupReplyForm(replyDiv, imageId, commentId);
                    });
                }

                setupReplyForm(commentDiv, imageId, commentId);
                commentsList.appendChild(commentDiv);
            }
            gsap.from(commentsList.querySelectorAll('.comment'), { opacity: 0, y: 10, stagger: 0.1, duration: 0.3 });
        }

        const commentsList = document.getElementById('comments-list');
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (commentsList) {
            dbRealtime.ref(`comments/${imageId}`).on('value', snapshot => {
                commentsList.innerHTML = '';
                displayedComments = 0;

                const comments = snapshot.val();
                if (comments) {
                    allComments = Object.entries(comments).sort((a, b) => new Date(b[1].timestamp) - new Date(a[1].timestamp));
                    renderComments(commentsList, allComments, 0, commentsPerPage);
                    displayedComments = commentsPerPage;
                    loadMoreBtn.style.display = allComments.length > commentsPerPage ? 'block' : 'none';
                } else {
                    commentsList.innerHTML = '<p>Sin comentarios</p>';
                    loadMoreBtn.style.display = 'none';
                }
            });
        }

        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                const nextEndIndex = displayedComments + commentsPerPage;
                renderComments(commentsList, allComments, displayedComments, nextEndIndex);
                displayedComments = nextEndIndex;
                loadMoreBtn.style.display = displayedComments >= allComments.length ? 'none' : 'block';
            });
        }

        function setupReplyForm(commentElement, imageId, parentCommentId) {
            const replyBtn = commentElement.querySelector('.reply-btn');
            let replyForm = commentElement.querySelector('.reply-form');

            if (replyBtn) {
                if (!replyForm) {
                    replyForm = document.createElement('div');
                    replyForm.classList.add('reply-form');
                    replyForm.innerHTML = `<input type="text" placeholder="Escribe una respuesta..." required>`;
                    commentElement.appendChild(replyForm);

                    replyForm.querySelector('input').addEventListener('keypress', e => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            const replyText = replyForm.querySelector('input').value.trim();
                            if (replyText && username) {
                                dbRealtime.ref(`comments/${imageId}/${parentCommentId}/replies`).push({
                                    text: replyText,
                                    timestamp: new Date().toISOString(),
                                    username,
                                    deviceId
                                }).then(() => {
                                    replyForm.querySelector('input').value = '';
                                    replyForm.style.display = 'none';
                                });
                            }
                        }
                    });
                }

                replyBtn.addEventListener('click', e => {
                    e.preventDefault();
                    replyForm.style.display = replyForm.style.display === 'none' ? 'block' : 'none';
                    if (replyForm.style.display === 'block') replyForm.querySelector('input').focus();
                });
            }
        }
    }
});