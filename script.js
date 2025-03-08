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
            tags.forEach(tag => {
                tagScores[tag] = (tagScores[tag] || 0) + 1;
            });
        } else if (action === 'like') {
            tags.forEach(tag => {
                tagScores[tag] = (tagScores[tag] || 0) + 3;
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
                            if (countElement && countElement.classList.contains('like-count')) {
                                countElement.textContent = count;
                            }
                            if (!isLiked) updateTagScores(images.find(img => img.id === Number(id)).tags, 'like', id);
                        });
                    });
                });
            } else if (e.target.closest('.comment-btn')) {
                const imageId = new URLSearchParams(window.location.search).get('id');
                if (imageId) {
                    const commentText = document.getElementById('comment-text');
                    if (commentText) commentText.focus();
                }
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

        if (chatToggle && chatWindow && chatCloseBtn && chatForm && chatInput && chatMessages && emojiBtn && emojiPicker && chatNotification) {
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
                    updateChatNotificationBadge();
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

            chatInput.addEventListener('focus', () => {
                setTimeout(() => {
                    chatInput.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    chatWindow.style.maxHeight = '50vh'; // Reduce altura para teclado
                }, 300);
            });

            chatInput.addEventListener('blur', () => {
                chatWindow.style.maxHeight = '80vh'; // Restaura altura
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
                gsap.to(notificationsWindow, { y: isVisible ? 0 : -100, opacity: isVisible ? 1 : 0, duration: 0.5 });
                if (isVisible) {
                    loadNotifications();
                    unreadComments = 0;
                    updateNotificationsBadge();
                }
            });

            notificationsCloseBtn.addEventListener('click', () => {
                notificationsWindow.style.display = 'none';
                gsap.to(notificationsWindow, { y: -100, opacity: 0, duration: 0.5 });
            });

            function updateNotificationsBadge() {
                if (unreadComments > 0) {
                    notificationsBadge.textContent = unreadComments;
                    notificationsBadge.style.display = 'flex';
                    gsap.from(notificationsBadge, { scale: 0.8, opacity: 0, duration: 0.3 });
                } else {
                    notificationsBadge.style.display = 'none';
                }
            }

            function loadNotifications() {
                notificationsList.innerHTML = '';
                Object.keys(interactedImages).forEach(imageId => {
                    dbRealtime.ref(`comments/${imageId}`).on('value', snapshot => {
                        const comments = snapshot.val();
                        if (comments) {
                            const commentArray = Object.entries(comments);
                            commentArray.forEach(([commentId, comment]) => {
                                const div = document.createElement('div');
                                div.classList.add('notification-item');
                                div.innerHTML = `
                                    <span>${comment.username} comentó en una imagen que viste: "${comment.text}"</span>
                                `;
                                div.addEventListener('click', () => window.location.href = `image-detail.html?id=${imageId}`);
                                notificationsList.appendChild(div);
                            });
                            gsap.from('.notification-item', { opacity: 0, y: 10, stagger: 0.1, duration: 0.5 });
                        }
                    });
                });
            }

            Object.keys(interactedImages).forEach(imageId => {
                let lastCommentCount = 0;
                dbRealtime.ref(`comments/${imageId}`).on('value', snapshot => {
                    const comments = snapshot.val();
                    const currentCommentCount = comments ? Object.keys(comments).length : 0;
                    const urlParams = new URLSearchParams(window.location.search);
                    const currentImageId = urlParams.get('id');

                    if (currentImageId !== imageId && currentCommentCount > lastCommentCount) {
                        unreadComments += currentCommentCount - lastCommentCount;
                        updateNotificationsBadge();
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
                            if (entries[0].isIntersecting && loadedImages < filteredImages.length) {
                                renderGallery(false);
                            }
                        }, { rootMargin: '200px' });
                        observer.observe(sentinel);
                    }
                })
                .catch(error => console.error('Error loading imagenes.json:', error));
        }

        function renderGallery(reset = false) {
            const gallery = document.querySelector('.gallery');
            if (reset) {
                gallery.innerHTML = '';
                loadedImages = 0;

                const sortedImages = images.map(img => {
                    const score = img.tags.reduce((sum, tag) => sum + (tagScores[tag] || 0), 0);
                    return { ...img, score };
                }).sort((a, b) => b.score - a.score);
                filteredImages = sortedImages.slice(0, 9).concat(images.filter(img => !sortedImages.slice(0, 9).some(s => s.id === img.id)));
            }

            const nextImages = filteredImages.slice(loadedImages, loadedImages + itemsPerLoad);
            nextImages.forEach(img => {
                const div = document.createElement('div');
                div.classList.add('grid-item');
                div.innerHTML = `
                    <img src="${img.url}" alt="${img.title}">
                `;
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
                const details = document.querySelector('.details');
                const similarGallery = document.querySelector('.similar-gallery');

                if (image) {
                    imageViewer.innerHTML = `<img src="${image.url}" alt="${image.title}">`;
                    likeBtn.dataset.id = image.id;
                    likeBtn.style.display = 'inline-block';
                    const viewer = new Viewer(imageViewer, {
                        inline: false,
                        navbar: false,
                        toolbar: {
                            zoomIn: 0,
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
                        <h2>${username}</h2>
                        <p>${image.description || 'Sin descripción disponible'}</p>
                    `;
                    updateTagScores(image.tags, 'view', image.id);

                    const similarImages = images
                        .filter(img => img.id !== image.id)
                        .map(img => ({
                            ...img,
                            similarity: img.tags.reduce((sum, tag) => sum + (image.tags.includes(tag) ? 1 : 0), 0)
                        }))
                        .sort((a, b) => b.similarity - a.similarity)
                        .slice(0, 9);
                    similarImages.forEach(img => {
                        const div = document.createElement('div');
                        div.classList.add('grid-item');
                        div.innerHTML = `<img src="${img.url}" alt="${img.title}">`;
                        div.addEventListener('click', () => window.location.href = `image-detail.html?id=${img.id}`);
                        similarGallery.appendChild(div);
                    });

                    const observer = new IntersectionObserver(setupGalleryLikeListeners, { rootMargin: '100px' });
                    observer.observe(likeBtn);
                } else {
                    details.innerHTML = '<p>Imagen no encontrada</p>';
                }

                setupSearch();
                setupLikesAndComments();
                setupChat();
                setupFilters();
                setupNotifications();
            })
            .catch(error => {
                console.error('Error loading imagenes.json:', error);
                const details = document.querySelector('.details');
                if (details) details.innerHTML = `<p>Error: ${error.message}</p>`;
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
        let sortOrder = 'desc';

        function renderComments(commentsList, commentsArray, startIndex, endIndex) {
            for (let i = startIndex; i < endIndex && i < commentsArray.length; i++) {
                const [commentId, comment] = commentsArray[i];
                const commentDiv = document.createElement('div');
                commentDiv.classList.add('comment');
                commentDiv.dataset.commentId = commentId;
                commentDiv.innerHTML = `
                    <div class="content">
                        <strong>${comment.username}</strong>
                        <span class="text">${comment.text}</span>
                        <div class="timestamp">${new Date(comment.timestamp).toLocaleTimeString()}</div>
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
                                <strong>${reply.username}</strong>
                                <span class="text">${reply.text}</span>
                                <div class="timestamp">${new Date(reply.timestamp).toLocaleTimeString()}</div>
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

            gsap.from(commentsList.querySelectorAll('.comment'), { opacity: 0, y: 10, stagger: 0.1, duration: 0.5 });
        }

        const commentsList = document.getElementById('comments-list');
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (commentsList) {
            dbRealtime.ref(`comments/${imageId}`).on('value', snapshot => {
                commentsList.innerHTML = '';
                displayedComments = 0;

                const comments = snapshot.val();
                if (comments) {
                    allComments = Object.entries(comments).map(([id, data]) => [id, data]);
                    allComments.sort((a, b) => sortOrder === 'desc' 
                        ? new Date(b[1].timestamp) - new Date(a[1].timestamp) 
                        : new Date(a[1].timestamp) - new Date(b[1].timestamp));

                    renderComments(commentsList, allComments, 0, commentsPerPage);
                    displayedComments = commentsPerPage;

                    if (loadMoreBtn) {
                        if (allComments.length > commentsPerPage) {
                            loadMoreBtn.style.display = 'block';
                        } else {
                            loadMoreBtn.style.display = 'none';
                        }
                    }
                } else {
                    commentsList.innerHTML = '<p>Sin comentarios</p>';
                    if (loadMoreBtn) loadMoreBtn.style.display = 'none';
                }
            });
        }

        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                const nextEndIndex = displayedComments + commentsPerPage;
                renderComments(commentsList, allComments, displayedComments, nextEndIndex);
                displayedComments = nextEndIndex;

                if (displayedComments >= allComments.length) {
                    loadMoreBtn.style.display = 'none';
                }
            });
        }

        const sortBtn = document.getElementById('sort-btn');
        if (sortBtn) {
            sortBtn.addEventListener('click', () => {
                sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
                sortBtn.innerHTML = `Ordenar por <i class="fas fa-sort${sortOrder === 'desc' ? '-down' : '-up'}"></i>`;
                commentsList.innerHTML = '';
                displayedComments = 0;

                allComments.sort((a, b) => sortOrder === 'desc' 
                    ? new Date(b[1].timestamp) - new Date(a[1].timestamp) 
                    : new Date(a[1].timestamp) - new Date(b[1].timestamp));

                renderComments(commentsList, allComments, 0, commentsPerPage);
                displayedComments = commentsPerPage;

                if (loadMoreBtn) {
                    if (allComments.length > commentsPerPage) {
                        loadMoreBtn.style.display = 'block';
                    } else {
                        loadMoreBtn.style.display = 'none';
                    }
                }
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
                    if (replyForm.style.display === 'block') {
                        replyForm.querySelector('input').focus();
                    }
                });
            }
        }
    }
});