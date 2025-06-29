(async function () {
    document.addEventListener('DOMContentLoaded', async () => {
        // --- CONFIGURACIÓN DE FIREBASE ---
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

        // --- ESTADO Y VARIABLES GLOBALES ---
        let allImages = [];
        let sortedPersonalizedImages = [];
        let allTags = new Set();
        let loadedImagesCount = 0;
        const itemsPerLoad = 12;
        let deviceId = localStorage.getItem('deviceId');
        let username = localStorage.getItem('username');
        let currentUserData = {};
        let currentViewer = null;
        let lastView = 'galleryView';
        let isGalleryLoading = false;
        const ADMIN_USER_DATA = { deviceId: 'admin_exen', username: 'Exen', profile: { avatar: 'logo.png' } };
        const INTEREST_LIMIT = 10;

        // --- INICIALIZACIÓN Y AUTENTICACIÓN ---
        async function masterInit() {
            if (!deviceId) {
                deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('deviceId', deviceId);
            }
            if (!username) {
                document.getElementById('authOverlay').classList.remove('hidden');
            } else {
                await initializeApp();
            }
        }

        document.getElementById('usernameForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('username');
            const newUsername = input.value.trim();
            if (newUsername) {
                username = newUsername;
                localStorage.setItem('username', newUsername);
                document.getElementById('authOverlay').classList.add('hidden');
                await db.ref(`users/${deviceId}/username`).set(newUsername);
                await initializeApp();
            }
        });

        async function initializeApp() {
            showLoader(true);
            try {
                await loadAllImagesAndTags();
                await loadUserData();
                sortPersonalizedFeed();
                await renderPersonalizedGallery(true);
                setupAllEventListeners();
                navigateTo('galleryView');
            } catch (error) {
                console.error("Error inicializando la app:", error);
            } finally {
                showLoader(false);
            }
        }
        
        function showLoader(show) {
            document.getElementById('galleryLoader').classList.toggle('hidden', !show);
        }

        // --- LÓGICA DE DATOS Y ORDENAMIENTO ---
        async function loadUserData() {
            const userRef = db.ref(`users/${deviceId}`);
            const snapshot = await userRef.once('value');
            currentUserData = snapshot.val() || { username };
            currentUserData.profile = currentUserData.profile || {};
            const defaultAvatar = `https://api.dicebear.com/8.x/initials/svg?seed=${currentUserData.username}`;
            currentUserData.profile.avatar = currentUserData.profile.avatar || defaultAvatar;
            currentUserData.profile.interests = currentUserData.profile.interests || [];
            
            document.getElementById('navProfileAvatar').src = currentUserData.profile.avatar;
            document.getElementById('commentFormAvatar').src = currentUserData.profile.avatar;
        }

        async function loadAllImagesAndTags() {
            const response = await fetch('imagenes.json');
            if (!response.ok) throw new Error('Error al cargar imágenes');
            allImages = await response.json();
            allImages.forEach(img => {
                img.tags.forEach(tag => allTags.add(tag));
                img.authorDeviceId = ADMIN_USER_DATA.deviceId;
            });
        }
        
        function sortPersonalizedFeed() {
             const userInterests = new Set(currentUserData.profile.interests);
             sortedPersonalizedImages = [...allImages].sort((a, b) => {
                const scoreA = a.tags.reduce((s, tag) => s + (userInterests.has(tag) ? 5 : 0), 0) + Math.random();
                const scoreB = b.tags.reduce((s, tag) => s + (userInterests.has(tag) ? 5 : 0), 0) + Math.random();
                return scoreB - scoreA;
            });
        }

        // --- NAVEGACIÓN ---
        function navigateTo(viewId, data = null) {
            const currentActiveView = document.querySelector('.view:not(.hidden)');
            if (currentActiveView && !['detailView', 'userProfileView'].includes(currentActiveView.id)) {
                lastView = currentActiveView.id;
            }
            
            document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
            const targetView = document.getElementById(viewId);
            if(targetView) {
                targetView.classList.remove('hidden');
            }

            document.querySelectorAll('.nav-btn').forEach(btn => {
                const isForCurrentView = btn.dataset.view === viewId;
                btn.classList.toggle('text-indigo-400', isForCurrentView);
                btn.classList.toggle('text-gray-400', !isForCurrentView);
            });
            const navProfileBtn = document.getElementById('navProfileAvatar').parentElement;
            const isProfileActive = viewId === 'profileView';
            navProfileBtn.classList.toggle('text-indigo-400', isProfileActive);
            navProfileBtn.classList.toggle('text-gray-400', !isProfileActive);
            document.getElementById('navProfileAvatar').classList.toggle('border-indigo-500', isProfileActive);
            document.getElementById('navProfileAvatar').classList.toggle('border-transparent', !isProfileActive);

            if (viewId === 'popularView') renderPopularGallery();
            if (viewId === 'profileView') populateProfileView();
            if (viewId === 'userProfileView' && data) showUserProfile(data);
            if (viewId === 'searchView') document.getElementById('searchInput').focus();
            
            if (['detailView', 'userProfileView'].includes(viewId)) {
                requestAnimationFrame(() => targetView.classList.add('active'));
            } else {
                document.getElementById('detailView').classList.remove('active');
                document.getElementById('userProfileView').classList.remove('active');
            }
        }
        
        // --- RENDERIZADO DE GALERÍAS ---
        function appendToImageGrid(container, imagesToRender) {
             imagesToRender.forEach(img => {
                const postCard = document.createElement('div');
                postCard.className = 'bg-gray-800 rounded-lg overflow-hidden cursor-pointer group portrait-aspect';
                postCard.innerHTML = `
                    <img src="${img.url}" alt="${img.title}" loading="lazy" class="transition-transform duration-300 group-hover:scale-105">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <h3 class="absolute bottom-0 left-0 p-2 text-white font-semibold text-sm truncate">${img.title}</h3>
                `;
                postCard.addEventListener('click', () => showDetailView(img.id));
                container.appendChild(postCard);
            });
        }
        
        function renderPersonalizedGallery(reset = false) {
            if (isGalleryLoading) return;
            isGalleryLoading = true;
            showLoader(true);

            const galleryContainer = document.getElementById('gallery');
            if (reset) {
                galleryContainer.innerHTML = '';
                loadedImagesCount = 0;
            }
            
            const nextImages = sortedPersonalizedImages.slice(loadedImagesCount, loadedImagesCount + itemsPerLoad);
            
            if (nextImages.length > 0) {
                appendToImageGrid(galleryContainer, nextImages);
                loadedImagesCount += nextImages.length;
            }

            showLoader(false);
            isGalleryLoading = false;
        }

        async function renderPopularGallery() {
            const container = document.getElementById('popularGallery');
            container.innerHTML = `<div class="text-center p-8"><i class="fas fa-spinner fa-spin text-3xl text-indigo-400"></i></div>`;
            const likesSnapshot = await db.ref('likes').once('value');
            const likesData = likesSnapshot.val() || {};
            const popularImages = allImages
                .map(img => ({ ...img, score: Object.keys(likesData[img.id] || {}).length }))
                .sort((a, b) => b.score - a.score);
            
            container.innerHTML = '';
            appendToImageGrid(container, popularImages.slice(0, 21));
        }

        // --- VISTAS ESPECÍFICAS ---
        async function showDetailView(imageId) {
            const img = allImages.find(i => i.id === Number(imageId));
            if (!img) return;

            if (currentViewer) currentViewer.destroy();
            
            document.getElementById('imageViewer').innerHTML = `<img src="${img.url}" alt="${img.title}">`;
            document.getElementById('detailTitle').textContent = img.title;
            document.getElementById('detailDescription').textContent = img.description;
            
            const authorData = ADMIN_USER_DATA;
            document.getElementById('detailAuthorUsername').textContent = authorData.username;
            document.getElementById('detailAuthorAvatar').src = authorData.profile.avatar;
            document.getElementById('detailAuthorInfo').onclick = () => alert("Este es el perfil del administrador.");
            
            document.getElementById('detailLikeBtn').dataset.id = imageId;
            document.getElementById('commentForm').dataset.imageId = imageId;
            
            loadLikesAndViews(imageId);
            loadComments(imageId);
            db.ref(`views/${imageId}/${deviceId}`).set(true);
            
            navigateTo('detailView');
            currentViewer = new Viewer(document.getElementById('imageViewer'), { navbar: false, toolbar: false, button: true, title: false });
        }

        async function showUserProfile({ userId }) {
            if (userId === ADMIN_USER_DATA.deviceId) {
                alert("Este es el perfil del administrador.");
                return;
            }
            const userRef = db.ref(`users/${userId}`);
            const snapshot = await userRef.once('value');
            const userData = snapshot.val();

            if (!userData) {
                alert('Usuario no encontrado');
                navigateTo(lastView);
                return;
            }
            
            const profile = userData.profile || {};
            const avatar = profile.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${userData.username}`;
            document.getElementById('userProfileHeaderUsername').textContent = `Perfil de ${userData.username}`;
            document.getElementById('userProfileAvatar').src = avatar;
            document.getElementById('userProfileUsername').textContent = userData.username;
            document.getElementById('userProfileBio').textContent = profile.bio || 'Este usuario aún no ha escrito una biografía.';
            
            const interestsContainer = document.getElementById('userProfileInterests');
            interestsContainer.innerHTML = '';
            if (profile.interests && profile.interests.length > 0) {
                 profile.interests.forEach(tag => {
                    const tagEl = document.createElement('span');
                    tagEl.className = 'px-3 py-1 text-sm rounded-full bg-indigo-600 text-white';
                    tagEl.textContent = tag;
                    interestsContainer.appendChild(tagEl);
                 });
            } else {
                interestsContainer.innerHTML = `<p class="text-sm text-gray-500">Sin intereses seleccionados.</p>`;
            }
        }
        
        function renderSearchResults(query) {
            const resultsContainer = document.getElementById('searchResults');
            const resultCountEl = document.getElementById('searchResultCount');
            
            resultsContainer.innerHTML = ''; // Limpiar resultados anteriores
            if (query.length < 2) {
                resultCountEl.textContent = 'Escribe al menos 2 caracteres para buscar.';
                return;
            }
            const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
            
            const scoredResults = allImages.map(img => {
                let score = 0;
                const title = img.title.toLowerCase();
                const description = img.description.toLowerCase();
                const tags = img.tags.map(tag => tag.toLowerCase());

                searchTerms.forEach(term => {
                    if (title.includes(term)) score += 3;
                    if (tags.some(tag => tag.includes(term))) score += 2;
                    if (description.includes(term)) score += 1;
                });

                return { ...img, score };
            }).filter(img => img.score > 0).sort((a, b) => b.score - a.score);

            resultCountEl.textContent = `${scoredResults.length} resultado(s) encontrado(s).`;
            
            if (scoredResults.length > 0) {
                appendToImageGrid(resultsContainer, scoredResults);
            } else {
                resultsContainer.innerHTML = '<p class="text-gray-500 text-center col-span-full">No se encontraron resultados.</p>';
            }
        }

        // --- LÓGICA DE COMENTARIOS Y RESPUESTAS ---
        async function loadLikesAndViews(id) {
            const likeBtn = document.getElementById('detailLikeBtn');
            const likeCountEl = document.getElementById('detailLikeCount');
            const viewCountEl = document.getElementById('detailViewCount');
            db.ref(`likes/${id}`).on('value', snap => {
                const data = snap.val() || {};
                likeCountEl.textContent = `${Object.keys(data).length} Me gusta`;
                likeBtn.classList.toggle('liked', data[deviceId] === true);
            });
            db.ref(`views/${id}`).on('value', snap => {
                viewCountEl.textContent = `${Object.keys(snap.val() || {}).length} Vistas`;
            });
        }

        async function loadComments(imageId) {
            const commentsList = document.getElementById('commentsList');
            db.ref(`comments/${imageId}`).orderByChild('timestamp').on('value', snapshot => {
                commentsList.innerHTML = '';
                if (!snapshot.exists()) {
                    commentsList.innerHTML = `<p class="text-gray-500 text-center text-sm">Sé el primero en comentar.</p>`;
                    return;
                }

                snapshot.forEach(commentSnapshot => {
                    const commentId = commentSnapshot.key;
                    const comment = commentSnapshot.val();
                    const li = createCommentElement(commentId, comment, imageId);
                    
                    if (comment.replies) {
                        const repliesList = li.querySelector('.replies-list');
                        Object.entries(comment.replies).forEach(([replyId, reply]) => {
                            const replyLi = createCommentElement(replyId, reply, imageId, true, comment.username);
                            repliesList.appendChild(replyLi);
                        });
                    }
                    commentsList.prepend(li);
                });
            });
        }
        
        function createCommentElement(id, data, imageId, isReply = false, replyingTo = '') {
            const li = document.createElement('li');
            li.className = `flex space-x-3 ${isReply ? 'ml-6' : ''}`;
            li.dataset.commentId = id;
            li.dataset.authorId = data.deviceId;
            li.dataset.authorName = data.username;

            const avatar = data.userAvatar || `https://api.dicebear.com/8.x/initials/svg?seed=${data.username}`;
            
            li.innerHTML = `
                <img src="${avatar}" class="w-8 h-8 rounded-full flex-shrink-0 object-cover cursor-pointer" data-userid="${data.deviceId}">
                <div class="flex-1">
                    <div class="bg-gray-800 rounded-lg p-2">
                        <span class="font-bold text-sm text-white cursor-pointer hover:underline" data-userid="${data.deviceId}">${data.username}</span>
                        ${replyingTo ? `<span class="text-sm text-indigo-400"> en respuesta a ${replyingTo}</span>` : ''}
                        <p class="text-gray-300 mt-1">${data.text}</p>
                    </div>
                    <div class="text-xs text-gray-500 mt-1">
                        <button class="hover:underline reply-btn">Responder</button>
                    </div>
                    <div class="reply-form-container hidden mt-2"></div>
                    <ul class="replies-list mt-2 space-y-3"></ul>
                </div>
            `;
            
            li.querySelector('.reply-btn').addEventListener('click', (e) => showReplyForm(e.currentTarget.closest('li')));
            li.querySelectorAll('[data-userid]').forEach(el => {
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    navigateTo('userProfileView', { userId: el.dataset.userid });
                });
            });
            return li;
        }

        function showReplyForm(commentElement) {
            const container = commentElement.querySelector('.reply-form-container');
            if (container.innerHTML !== '') {
                container.innerHTML = '';
                container.classList.add('hidden');
                return;
            }
            container.classList.remove('hidden');

            const form = document.createElement('form');
            form.className = 'flex items-center space-x-2';
            form.innerHTML = `
                <img src="${currentUserData.profile.avatar}" class="w-6 h-6 rounded-full object-cover">
                <input type="text" placeholder="Escribe una respuesta..." class="flex-1 bg-gray-700 text-white rounded-full px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
                <button type="submit" class="text-indigo-400"><i class="fas fa-paper-plane"></i></button>
            `;
            container.appendChild(form);
            form.querySelector('input').focus();
            
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const imageId = document.getElementById('commentForm').dataset.imageId;
                const parentCommentId = commentElement.dataset.commentId;
                const textInput = form.querySelector('input');
                const text = textInput.value.trim();

                if (text) {
                    const replyData = {
                        text,
                        timestamp: firebase.database.ServerValue.TIMESTAMP,
                        username: currentUserData.username,
                        deviceId,
                        userAvatar: currentUserData.profile.avatar
                    };
                    await db.ref(`comments/${imageId}/${parentCommentId}/replies`).push(replyData);
                    
                    const parentAuthorId = commentElement.dataset.authorId;
                    const parentAuthorName = commentElement.dataset.authorName;
                    sendReplyNotification(parentAuthorId, parentAuthorName, imageId);
                    
                    container.innerHTML = '';
                    container.classList.add('hidden');
                }
            });
        }
        
        // --- NOTIFICACIONES ---
        function setupNotificationsListener() {
            const notificationsRef = db.ref(`notifications/${deviceId}`);
            const badge = document.getElementById('navNotificationsBadge');
            const list = document.getElementById('notificationsList');
            
            notificationsRef.on('value', snapshot => {
                const notifications = snapshot.val() || {};
                const unreadCount = Object.values(notifications).filter(n => !n.read).length;
                badge.style.display = unreadCount > 0 ? 'block' : 'none';
                
                list.innerHTML = '';
                if(Object.keys(notifications).length === 0) {
                    list.innerHTML = '<p class="text-gray-500 text-center">No tienes notificaciones.</p>';
                    return;
                }

                Object.entries(notifications).reverse().forEach(([id, n]) => {
                    const notifEl = document.createElement('div');
                    notifEl.className = `p-2 rounded-lg hover:bg-gray-700 cursor-pointer ${n.read ? 'opacity-60' : ''}`;
                    notifEl.innerHTML = `<p>${n.message}</p><p class="text-xs text-gray-500">${new Date(n.timestamp).toLocaleString()}</p>`;
                    notifEl.onclick = () => {
                        const notificationsWindow = document.getElementById('notificationsWindow');
                        notificationsWindow.classList.remove('active');
                        setTimeout(() => notificationsWindow.classList.add('hidden'), 300);
                        showDetailView(n.imageId);
                        db.ref(`notifications/${deviceId}/${id}/read`).set(true);
                    };
                    list.appendChild(notifEl);
                });
            });
        }

        async function sendReplyNotification(targetUserId, targetUsername, imageId) {
            if (targetUserId && targetUserId !== deviceId) {
                const message = `${currentUserData.username} respondió a tu comentario.`;
                await db.ref(`notifications/${targetUserId}`).push({
                    message,
                    imageId,
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    read: false,
                    fromUser: currentUserData.username
                });
            }
        }

        // --- MANEJO DE EVENTOS ---
        function setupAllEventListeners() {
            // Navegación
            document.querySelectorAll('.nav-btn').forEach(btn => {
                if(btn.dataset.view) btn.addEventListener('click', () => navigateTo(btn.dataset.view));
            });
            document.getElementById('detailBackBtn').addEventListener('click', () => navigateTo(lastView || 'galleryView'));
            document.getElementById('userProfileBackBtn').addEventListener('click', () => navigateTo(lastView || 'galleryView'));

            // Scroll infinito
            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && !isGalleryLoading) {
                    renderPersonalizedGallery(false);
                }
            }, { threshold: 0.5 });
            observer.observe(document.getElementById('sentinel'));
            
            // Búsqueda
            document.getElementById('searchForm').addEventListener('submit', (e) => {
                e.preventDefault();
                renderSearchResults(document.getElementById('searchInput').value);
            });

            // Perfil
            document.getElementById('saveProfileBtn').addEventListener('click', async () => {
                const bio = document.getElementById('profileBio').value;
                const interests = Array.from(document.querySelectorAll('#profileInterests .bg-indigo-600')).map(el => el.dataset.tag);
                await db.ref(`users/${deviceId}/profile`).update({ bio, interests });
                await loadUserData(); 
                alert('Perfil guardado');
                sortPersonalizedFeed();
                await renderPersonalizedGallery(true);
            });
            document.getElementById('interestSearchInput').addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                document.querySelectorAll('#profileInterests button').forEach(btn => {
                    btn.style.display = btn.textContent.toLowerCase().includes(query) ? '' : 'none';
                });
            });
            document.getElementById('changeAvatarBtn').addEventListener('click', () => {
                const modal = document.getElementById('avatarModal');
                const selection = document.getElementById('avatarSelection');
                selection.innerHTML = '';
                for (let i = 0; i < 8; i++) {
                    const seed = Math.random().toString(36).substring(7);
                    const avatarUrl = `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${seed}`;
                    const img = document.createElement('img');
                    img.src = avatarUrl;
                    img.className = 'w-16 h-16 rounded-full cursor-pointer hover:ring-2 ring-indigo-500 object-cover';
                    img.onclick = async () => {
                        currentUserData.profile.avatar = avatarUrl;
                        document.getElementById('profileAvatar').src = avatarUrl;
                        document.getElementById('navProfileAvatar').src = avatarUrl;
                        await db.ref(`users/${deviceId}/profile/avatar`).set(avatarUrl);
                        modal.classList.add('hidden');
                    };
                    selection.appendChild(img);
                }
                modal.classList.remove('hidden');
            });
            document.getElementById('closeAvatarModal').addEventListener('click', () => document.getElementById('avatarModal').classList.add('hidden'));

            // Notificaciones Modal
            const notificationsWindow = document.getElementById('notificationsWindow');
            document.getElementById('navNotificationsBtn').addEventListener('click', () => {
                notificationsWindow.classList.remove('hidden');
                requestAnimationFrame(() => notificationsWindow.classList.add('active'));
            });
            document.getElementById('notificationsCloseBtn').addEventListener('click', () => {
                 notificationsWindow.classList.remove('active');
                 setTimeout(() => notificationsWindow.classList.add('hidden'), 300);
            });
            notificationsWindow.addEventListener('click', (e) => {
                if(e.target.hasAttribute('data-close-modal')) {
                    notificationsWindow.classList.remove('active');
                    setTimeout(() => notificationsWindow.classList.add('hidden'), 300);
                }
            });

            // Interacciones de detalle
            document.getElementById('detailLikeBtn').addEventListener('click', function() {
                const id = this.dataset.id;
                const ref = db.ref(`likes/${id}/${deviceId}`);
                ref.once('value', snap => ref.set(snap.exists() ? null : true));
            });

            document.getElementById('commentForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                const imageId = Number(this.dataset.imageId);
                const textInput = document.getElementById('commentText');
                if (textInput.value.trim() && imageId) {
                    await db.ref(`comments/${imageId}`).push({
                        text: textInput.value.trim(),
                        timestamp: firebase.database.ServerValue.TIMESTAMP,
                        username: currentUserData.username,
                        deviceId: deviceId,
                        userAvatar: currentUserData.profile.avatar
                    });
                    textInput.value = '';
                }
            });
            
            document.getElementById('focusCommentBtn').addEventListener('click', () => {
                document.getElementById('commentText').focus();
            });
            setupNotificationsListener();
        }

        masterInit();
    });
})();

