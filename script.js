document.addEventListener('DOMContentLoaded', () => {
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
    const auth = firebase.auth();

    // --- ESTADO Y VARIABLES GLOBALES ---
    let allImages = [];
    let allPosts = [];
    let sortedPersonalizedContent = [];
    let allTags = new Set();
    let loadedItemsCount = 0;
    const itemsPerLoad = 12;
    let currentUser = null;
    let currentUserData = {};
    let currentViewer = null;
    let lastView = 'galleryView';
    let isGalleryLoading = false;
    let toastTimeout;
    const ADMIN_USER_DATA = { uid: 'admin_exen', username: 'Exen', profile: { avatar: 'https://raw.githubusercontent.com/eacardenas/recursos-reales/main/logo-exene.png' } };
    const INTEREST_LIMIT = 10;
    let featuredSwiper = null;
    let appInitialized = false;

    // --- ELEMENTOS DEL DOM ---
    const ui = {
        authOverlay: document.getElementById('authOverlay'),
        appContent: document.getElementById('appContent'),
        modals: document.querySelectorAll('.modal-container'),
        views: document.querySelectorAll('#appContent .view'),
        navButtons: document.querySelectorAll('.nav-btn'),
        commentContainer: document.getElementById('comment-container'),
        toast: document.getElementById('toast'),
        toastMessage: document.getElementById('toastMessage'),
    };

    // --- FUNCIONES AUXILIARES ---
    function showModal(modalId) { document.getElementById(modalId).classList.remove('hidden'); }
    function showLoader(show) { document.getElementById('galleryLoader').classList.toggle('hidden', !show); }
    function showToast(message) {
        if (toastTimeout) clearTimeout(toastTimeout);
        ui.toastMessage.textContent = message;
        ui.toast.classList.add('show');
        toastTimeout = setTimeout(() => { ui.toast.classList.remove('show'); }, 3000);
    }
    function getFirebaseErrorMessage(error) {
        switch (error.code) {
            case 'auth/invalid-email': return 'El formato del correo es inválido.';
            case 'auth/user-not-found':
            case 'auth/wrong-password': return 'Correo o contraseña incorrectos.';
            case 'auth/email-already-in-use': return 'Este correo ya está registrado.';
            case 'auth/weak-password': return 'La contraseña debe tener al menos 6 caracteres.';
            default: console.error(error); return 'Ha ocurrido un error inesperado.';
        }
    }
    function closeSlideUpView(viewId) {
        const view = document.getElementById(viewId);
        view.classList.remove('active');
        setTimeout(() => navigateTo(lastView || 'galleryView'), 300);
    }
    function cancelReply() {
        const form = document.getElementById('commentForm');
        delete form.dataset.replyToCommentId;
        delete form.dataset.replyToUsername;
        delete form.dataset.replyToAuthorId;
        document.getElementById('replyingToBanner').classList.add('hidden');
        document.getElementById('commentText').placeholder = 'Escribe un comentario...';
    }
    function initiateReply(commentElement) {
        const form = document.getElementById('commentForm');
        form.dataset.replyToCommentId = commentElement.dataset.commentId;
        form.dataset.replyToUsername = commentElement.dataset.authorName;
        form.dataset.replyToAuthorId = commentElement.dataset.authorId;
        document.getElementById('replyingToUsername').textContent = commentElement.dataset.authorName;
        document.getElementById('replyingToBanner').classList.remove('hidden');
        document.getElementById('commentText').placeholder = `Respondiendo a ${commentElement.dataset.authorName}...`;
        document.getElementById('commentText').focus();
    }


    // --- FLUJO DE AUTENTICACIÓN ---
    setupAuthEventListeners();

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            if (!appInitialized) {
                initializeApp();
            }
            ui.authOverlay.classList.add('opacity-0', 'pointer-events-none');
            ui.appContent.classList.remove('hidden');
        } else {
            currentUser = null;
            currentUserData = {};
            appInitialized = false;
            ui.authOverlay.classList.remove('opacity-0', 'pointer-events-none');
            ui.appContent.classList.add('hidden');
            ui.modals.forEach(m => m.classList.add('hidden'));
        }
    });

    async function initializeApp() {
        showLoader(true);
        appInitialized = true;
        try {
            setupAppEventListeners();
            await loadUserData();
            await Promise.all([loadCuratedImages(), listenToPosts()]);
            
            sortPersonalizedFeed();
            renderFeaturedCarousel();
            renderPersonalizedGallery(true);
            listenToUserFavorites();
            listenToNotifications();
        } catch (error) {
            console.error("Error inicializando la app:", error);
            showToast("Error al cargar la aplicación");
        } finally {
            showLoader(false);
            navigateTo('galleryView');
        }
    }

    // --- LÓGICA DE DATOS ---
    async function loadUserData() {
        if (!currentUser) return;
        const userRef = db.ref(`users/${currentUser.uid}`);
        const snapshot = await userRef.once('value');
        currentUserData = snapshot.val() || { username: currentUser.email.split('@')[0] };
        currentUserData.profile = currentUserData.profile || {};
        const defaultAvatar = `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(currentUserData.username)}`;
        currentUserData.profile.avatar = currentUserData.profile.avatar || defaultAvatar;
        currentUserData.profile.interests = currentUserData.profile.interests || [];
        updateAllAvatars(currentUserData.profile.avatar);
    }
    
    async function loadCuratedImages() {
        try {
            const response = await fetch('imagenes.json');
            if (!response.ok) throw new Error('Network response was not ok');
            const images = await response.json();
            allImages = images.map(img => ({ ...img, isPost: false, authorUid: ADMIN_USER_DATA.uid }));
            allImages.forEach(img => (img.tags || []).forEach(tag => allTags.add(tag)));
        } catch (error) {
            console.error("Fallo al cargar imagenes.json:", error);
            showToast("No se pudieron cargar las imágenes curadas");
        }
    }

    function listenToPosts() {
        return new Promise((resolve) => {
            const postsRef = db.ref('posts');
            postsRef.on('value', snapshot => {
                allPosts = [];
                if(snapshot.exists()) {
                    snapshot.forEach(childSnapshot => {
                        allPosts.push({ ...childSnapshot.val(), id: childSnapshot.key, isPost: true });
                    });
                }
                if(appInitialized) {
                    sortPersonalizedFeed();
                    if(document.getElementById('galleryView').offsetParent !== null) {
                         renderPersonalizedGallery(true);
                    }
                    if(document.getElementById('profileView').offsetParent !== null) {
                        renderUserPosts(currentUser.uid, 'userPostsGrid', 'no-posts-message');
                    }
                }
                resolve();
            });
        });
    }

    // --- NAVEGACIÓN Y RENDERIZADO DE UI ---
    function navigateTo(viewId, data = null) {
        const currentActiveSlideView = document.querySelector('.view.slide-up.active');
        if (currentActiveSlideView && !data) {
            lastView = document.querySelector('.view:not(.hidden):not(.slide-up)')?.id || 'galleryView';
        }

        ui.views.forEach(v => v.classList.add('hidden'));
        const targetView = document.getElementById(viewId);
        if(!targetView) return;

        targetView.classList.remove('hidden');

        ui.commentContainer.classList.toggle('hidden', viewId !== 'detailView');
        if(viewId !== 'detailView') cancelReply();
        
        document.querySelectorAll('.nav-btn').forEach(btn => {
            const view = btn.dataset.view;
            if(view) {
                btn.classList.toggle('text-indigo-400', view === viewId);
                btn.classList.toggle('text-gray-400', view !== viewId);
            }
        });
        document.getElementById('navProfileAvatar').classList.toggle('border-indigo-500', viewId === 'profileView');
        document.getElementById('navProfileAvatar').classList.toggle('border-transparent', viewId !== 'profileView');
        
        if (viewId === 'popularView' && !targetView.dataset.loaded) { renderPopularGallery(); targetView.dataset.loaded = 'true'; }
        if (viewId === 'profileView') populateProfileView();
        if (viewId === 'userProfileView' && data) showUserProfile(data.userId);
        if (viewId === 'searchView') document.getElementById('searchInput').focus();

        if (targetView.classList.contains('slide-up')) {
            setTimeout(() => targetView.classList.add('active'), 10);
        }
    }

    // --- LÓGICA DE RENDERIZADO DE CONTENIDO ---
    
    function sortPersonalizedFeed() {
        const userInterests = new Set(currentUserData.profile?.interests || []);
        const combinedContent = [...allImages, ...allPosts];
        
        sortedPersonalizedContent = combinedContent.sort((a, b) => {
           const scoreA = (a.tags || []).reduce((s, tag) => s + (userInterests.has(tag) ? 5 : 0), 0) + Math.random();
           const scoreB = (b.tags || []).reduce((s, tag) => s + (userInterests.has(tag) ? 5 : 0), 0) + Math.random();
           return (b.timestamp || 0) - (a.timestamp || 0) || scoreB - scoreA;
       });
    }

    function renderPersonalizedGallery(reset = false) {
        if (isGalleryLoading) return;
        isGalleryLoading = true;
        showLoader(true);
        const galleryContainer = document.getElementById('gallery');
        if (reset) {
            galleryContainer.innerHTML = '';
            loadedItemsCount = 0;
        }
        const nextItems = sortedPersonalizedContent.slice(loadedItemsCount, loadedItemsCount + itemsPerLoad);
        if (nextItems.length > 0) {
            appendToImageGrid(galleryContainer, nextItems);
            loadedItemsCount += nextItems.length;
        } else if (reset && sortedPersonalizedContent.length === 0) {
            galleryContainer.innerHTML = `<p class="text-center text-gray-500 col-span-full py-8">No hay imágenes. ¡Explora y personaliza tus intereses!</p>`;
        }
        showLoader(false);
        isGalleryLoading = false;
    }
    
    function appendToImageGrid(container, itemsToRender) {
         itemsToRender.forEach(item => {
            const postCard = document.createElement('div');
            postCard.className = 'bg-gray-800 rounded-lg overflow-hidden cursor-pointer group portrait-aspect';
            const imageUrl = item.isPost ? item.imageUrl : item.url;
            postCard.innerHTML = `
                <img src="${imageUrl}" alt="${item.title}" loading="lazy" onerror="this.onerror=null;this.src='https://placehold.co/400x600/1f2937/a7a7a7?text=Error';" class="transition-transform duration-300 group-hover:scale-105">
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <h3 class="absolute bottom-0 left-0 p-2 text-white font-semibold text-sm truncate">${item.title}</h3>
            `;
            postCard.addEventListener('click', () => showDetailView(item.id, item.isPost));
            container.appendChild(postCard);
        });
    }

    function renderFeaturedCarousel() {
        const userInterests = new Set(currentUserData.profile?.interests || []);
        let featuredImages = allImages.filter(img => img.featured);

        if (userInterests.size > 0) {
            featuredImages.sort((a, b) => {
                const scoreA = (a.tags || []).reduce((s, tag) => s + (userInterests.has(tag) ? 5 : 0), 0) + Math.random();
                const scoreB = (b.tags || []).reduce((s, tag) => s + (userInterests.has(tag) ? 5 : 0), 0) + Math.random();
                return scoreB - scoreA;
            });
        }
        
        const wrapper = document.getElementById('featured-wrapper');
        wrapper.innerHTML = featuredImages.slice(0, 7).map(img => `
            <div class="swiper-slide">
                <img src="${img.url}" alt="${img.title}" data-id="${img.id}" data-is-post="false">
            </div>
        `).join('');

        if (featuredSwiper) featuredSwiper.destroy(true, true);
        featuredSwiper = new Swiper('.featured-carousel', {
            loop: featuredImages.length > 1,
            autoplay: { delay: 4000, disableOnInteraction: false },
            pagination: { el: '.swiper-pagination', clickable: true },
            navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
        });

        wrapper.querySelectorAll('img').forEach(img => {
             img.addEventListener('click', (e) => showDetailView(e.target.dataset.id, e.target.dataset.isPost === 'true'));
        });
    }

    // --- EVENT LISTENERS ---
    function setupAuthEventListeners() {
        document.getElementById('showLoginModalBtn').addEventListener('click', () => showModal('loginModal'));
        document.getElementById('showRegisterModalBtn').addEventListener('click', () => showModal('registerModal'));
        document.querySelectorAll('.close-modal-btn').forEach(btn => btn.addEventListener('click', (e) => e.target.closest('.modal-container').classList.add('hidden')));

        document.getElementById('registerForm').addEventListener('submit', async e => {
            e.preventDefault();
            const username = e.target.registerUsername.value.trim();
            const email = e.target.registerEmail.value.trim();
            const password = e.target.registerPassword.value;
            if (password !== e.target.registerPasswordConfirm.value) return showToast("Las contraseñas no coinciden.");

            try {
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                await db.ref(`users/${userCredential.user.uid}`).set({
                    username: username,
                    profile: { 
                        avatar: `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(username)}`,
                        bio: '',
                        interests: []
                    }
                });
                e.target.closest('.modal-container').classList.add('hidden');
            } catch (error) { showToast(getFirebaseErrorMessage(error)); }
        });

        document.getElementById('loginForm').addEventListener('submit', async e => {
            e.preventDefault();
            try {
                await auth.signInWithEmailAndPassword(e.target.loginEmail.value, e.target.loginPassword.value);
                e.target.closest('.modal-container').classList.add('hidden');
            } catch (error) { showToast(getFirebaseErrorMessage(error)); }
        });
    }

    function setupAppEventListeners() {
        if(document.body.dataset.appListenersAttached === 'true') return;
        
        document.getElementById('logoutBtn').addEventListener('click', () => auth.signOut());
        document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
            btn.addEventListener('click', () => navigateTo(btn.dataset.view));
        });

        document.getElementById('createPostBtn').addEventListener('click', () => showModal('createPostModal'));
        document.getElementById('navNotificationsBtn').addEventListener('click', () => showModal('notificationsWindow'));

        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && !isGalleryLoading && document.getElementById('galleryView').offsetParent !== null) {
                renderPersonalizedGallery(false);
            }
        }, { threshold: 0.1 });
        observer.observe(document.getElementById('sentinel'));

        setupProfileEventListeners();
        setupDetailViewEventListeners();
        setupCreatePostForm();

        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', e => renderSearchResults(e.target.value));
        document.getElementById('searchForm').addEventListener('submit', e => e.preventDefault());

        document.body.dataset.appListenersAttached = 'true';
    }

    function setupProfileEventListeners() {
        document.getElementById('saveProfileBtn').addEventListener('click', async () => {
            const bio = document.getElementById('profileBio').value;
            const interests = Array.from(document.querySelectorAll('#profileInterests .bg-indigo-600')).map(el => el.dataset.tag);
            try {
                await db.ref(`users/${currentUser.uid}/profile`).update({ bio, interests });
                await loadUserData();
                sortPersonalizedFeed();
                renderPersonalizedGallery(true);
                renderFeaturedCarousel();
                showToast('Perfil guardado');
            } catch (error) { console.error(error); showToast("Error al guardar el perfil."); }
        });

        document.getElementById('interestSearchInput').addEventListener('input', e => {
            const query = e.target.value.toLowerCase();
            document.querySelectorAll('#profileInterests button').forEach(btn => {
                btn.style.display = btn.textContent.toLowerCase().includes(query) ? '' : 'none';
            });
        });

        document.querySelectorAll('.profile-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.profile-tab').forEach(item => item.classList.remove('tab-active'));
                e.target.classList.add('tab-active');
                document.querySelectorAll('.profile-tab-content').forEach(content => {
                    content.classList.toggle('hidden', content.id !== `content-${e.target.id.substring(4)}`);
                });
            });
        });

        document.getElementById('changeAvatarBtn').addEventListener('click', () => {
            const selection = document.getElementById('avatarSelection');
            selection.innerHTML = '';
            for (let i = 0; i < 12; i++) {
                const seed = Math.random().toString(36).substring(7);
                const avatarUrl = `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${seed}`;
                selection.innerHTML += `<img src="${avatarUrl}" class="w-16 h-16 rounded-full cursor-pointer hover:ring-2 ring-indigo-500 object-cover" data-url="${avatarUrl}">`;
            }
            selection.querySelectorAll('img').forEach(img => img.addEventListener('click', (e) => updateAvatar(e.target.dataset.url)));
            showModal('avatarModal');
        });

        document.getElementById('avatarUrlForm').addEventListener('submit', e => {
            e.preventDefault();
            const input = document.getElementById('avatarUrlInput');
            if (input.value) updateAvatar(input.value.trim());
            input.value = '';
        });
    }

    function setupDetailViewEventListeners() {
         document.getElementById('detailBackBtn').addEventListener('click', () => closeSlideUpView('detailView'));
         document.getElementById('userProfileBackBtn').addEventListener('click', () => closeSlideUpView('userProfileView'));
        
        document.getElementById('detailLikeBtn').addEventListener('click', function() {
            const ref = db.ref(`likes/${this.dataset.id}/${currentUser.uid}`);
            ref.once('value', snap => ref.set(snap.exists() ? null : true));
        });
        
        document.getElementById('detailFavoriteBtn').addEventListener('click', function() {
            const ref = db.ref(`favorites/${currentUser.uid}/${this.dataset.id}`);
            ref.once('value', snap => ref.set(snap.exists() ? null : true));
        });
        
        document.getElementById('commentForm').addEventListener('submit', handleCommentSubmit);
        document.getElementById('focusCommentBtn').addEventListener('click', () => document.getElementById('commentText').focus());
        document.getElementById('cancelReplyBtn').addEventListener('click', cancelReply);
    }
    
    function setupCreatePostForm() {
        document.getElementById('createPostForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const imageUrl = document.getElementById('postImageUrl').value.trim();
            const title = document.getElementById('postTitle').value.trim();
            if(!imageUrl || !title) return showToast("Debes completar todos los campos.");
            
            const newPostRef = db.ref('posts').push();
            try {
                await newPostRef.set({ 
                    id: newPostRef.key, 
                    imageUrl, 
                    title, 
                    authorUid: currentUser.uid, 
                    timestamp: firebase.database.ServerValue.TIMESTAMP 
                });
                document.getElementById('createPostForm').reset();
                document.getElementById('createPostModal').classList.add('hidden');
                showToast("Publicación creada con éxito");
                navigateTo('profileView');
                document.getElementById('tab-posts').click();
            } catch (error) {
                console.error("Error creando post:", error);
                showToast("No se pudo crear la publicación.");
            }
        });
    }

    // --- LÓGICA DE VISTAS ESPECÍFICAS ---
    
    async function showDetailView(id, isPost = false) {
        document.querySelector('#detailView > main').scrollTop = 0;
        const item = isPost ? allPosts.find(p => p.id === id) : allImages.find(i => i.id == id);
        if (!item) return showToast('Contenido no encontrado');

        const dbId = String(item.id);
        
        const userSnapshot = item.authorUid === ADMIN_USER_DATA.uid ? null : await db.ref(`users/${item.authorUid}`).once('value');
        const authorData = item.authorUid === ADMIN_USER_DATA.uid ? ADMIN_USER_DATA : userSnapshot.val() || { username: 'Anónimo' };
        
        document.getElementById('detailAuthorUsername').textContent = authorData.username;
        document.getElementById('detailAuthorAvatar').src = authorData.profile?.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${authorData.username}`;
        const authorInfo = document.getElementById('detailAuthorInfo');
        authorInfo.onclick = () => {
            if (item.authorUid === ADMIN_USER_DATA.uid) return;
            item.authorUid === currentUser.uid ? navigateTo('profileView') : showUserProfile(item.authorUid);
        };
        
        document.getElementById('detailTitle').textContent = item.title;
        document.getElementById('detailDescription').textContent = item.description || '';
        
        if (currentViewer) currentViewer.destroy();
        const imageViewer = document.getElementById('imageViewer');
        imageViewer.innerHTML = `<img src="${item.isPost ? item.imageUrl : item.url}" alt="${item.title}" onerror="this.parentElement.innerHTML='<p class=\\'p-4 text-red-400\\'>Error al cargar imagen.</p>';">`;
        currentViewer = new Viewer(imageViewer, { navbar: false, toolbar: false, button: true, title: false });

        document.getElementById('detailLikeBtn').dataset.id = dbId;
        document.getElementById('detailFavoriteBtn').dataset.id = dbId;
        document.getElementById('commentForm').dataset.imageId = dbId;
        
        listenToLikesAndViews(dbId);
        listenToComments(dbId);

        if (!isPost) renderSimilarImages(item);
        else document.getElementById('similar-section').classList.add('hidden');
        
        db.ref(`views/${dbId}/${currentUser.uid}`).set(true);
        navigateTo('detailView', { id: dbId });
    }

    async function populateProfileView() {
        document.getElementById('profileAvatar').src = currentUserData.profile.avatar;
        document.getElementById('profileUsername').textContent = currentUserData.username;
        document.getElementById('profileBio').value = currentUserData.profile.bio || '';
        renderUserPosts(currentUser.uid, 'userPostsGrid', 'no-posts-message');
        renderFavorites();
        renderProfileInterests();
    }
    
    async function showUserProfile(userId) {
        if (userId === ADMIN_USER_DATA.uid) return;
        const snapshot = await db.ref(`users/${userId}`).once('value');
        if (!snapshot.exists()) return showToast('Usuario no encontrado');
        
        const userData = snapshot.val();
        const profile = userData.profile || {};
        
        document.getElementById('userProfileHeaderUsername').textContent = `Perfil de ${userData.username}`;
        document.getElementById('userProfileAvatar').src = profile.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${userData.username}`;
        document.getElementById('userProfileUsername').textContent = userData.username;
        document.getElementById('userProfileBio').textContent = profile.bio || 'Este usuario aún no ha escrito una biografía.';
        renderUserPosts(userId, 'visitingUserPostsGrid', 'no-visiting-posts-message');
        navigateTo('userProfileView', { userId });
    }

    // --- LÓGICA DE COMENTARIOS, LIKES, NOTIFICACIONES ---
    
    function listenToLikesAndViews(id) {
        db.ref(`likes/${id}`).on('value', snap => {
            const data = snap.val() || {};
            if(document.getElementById('detailLikeCount')) {
                document.getElementById('detailLikeCount').textContent = `${Object.keys(data).length} Me gusta`;
                document.getElementById('detailLikeBtn').classList.toggle('liked', !!(currentUser && data[currentUser.uid]));
            }
        });
        db.ref(`views/${id}`).on('value', snap => {
            if(document.getElementById('detailViewCount')) {
                document.getElementById('detailViewCount').textContent = `${Object.keys(snap.val() || {}).length} Vistas`;
            }
        });
    }

    function listenToComments(imageId) {
        db.ref(`comments/${imageId}`).orderByChild('timestamp').on('value', snapshot => {
            const list = document.getElementById('commentsList');
            if(!list) return;
            list.innerHTML = '';
            if (!snapshot.exists()) return list.innerHTML = `<p class="text-gray-500 text-center text-sm">Sé el primero en comentar.</p>`;
            
            const comments = [];
            snapshot.forEach(s => comments.push({ id: s.key, ...s.val() }));
            comments.reverse().forEach(c => list.appendChild(createCommentElement(c, imageId)));
        });
    }

    function createCommentElement(commentData, imageId) {
        const li = document.createElement('li');
        li.className = 'comment-item';
        li.dataset.commentId = commentData.id;
        li.dataset.authorId = commentData.authorUid; 
        li.dataset.authorName = commentData.username;
        
        const avatar = commentData.userAvatar || `https://api.dicebear.com/8.x/initials/svg?seed=${commentData.username}`;
        
        li.innerHTML = `
            <img src="${avatar}" class="w-8 h-8 rounded-full flex-shrink-0 object-cover cursor-pointer" data-userid="${commentData.authorUid}">
            <div class="comment-content">
                <div class="bg-gray-800/50 rounded-lg p-2">
                    <span class="font-bold text-sm text-white cursor-pointer hover:underline" data-userid="${commentData.authorUid}">${commentData.username}</span>
                    <p class="text-gray-300 mt-1 break-words">${commentData.text}</p>
                </div>
                <div class="text-xs text-gray-500 mt-1 pl-2">
                    <button class="hover:underline reply-btn">Responder</button>
                </div>
            </div>`;

        li.querySelector('.reply-btn').addEventListener('click', e => initiateReply(e.currentTarget.closest('li')));
        li.querySelectorAll('[data-userid]').forEach(el => el.addEventListener('click', e => {
            e.stopPropagation();
            closeSlideUpView('detailView');
            setTimeout(() => {
                 if(el.dataset.userid === currentUser.uid) navigateTo('profileView');
                 else showUserProfile(el.dataset.userid);
            }, 300)
        }));

        if (commentData.replies) {
            const repliesList = document.createElement('ul');
            repliesList.className = 'pl-10 mt-3 space-y-3 border-l-2 border-gray-700';
            Object.values(commentData.replies).sort((a,b) => a.timestamp - b.timestamp).forEach(reply => {
                const replyAvatar = reply.userAvatar || `https://api.dicebear.com/8.x/initials/svg?seed=${reply.username}`;
                repliesList.innerHTML += `<li class="comment-item"><img src="${replyAvatar}" class="w-8 h-8 rounded-full flex-shrink-0 object-cover"><div class="comment-content"><div class="bg-gray-800/50 rounded-lg p-2"><strong class="font-bold text-sm text-white">${reply.username}</strong><p class="text-gray-300 mt-1 break-words">${reply.text}</p></div></div></li>`;
            });
            li.querySelector('.comment-content').appendChild(repliesList);
        }
        return li;
    }

    async function handleCommentSubmit(e) {
        e.preventDefault();
        const textInput = document.getElementById('commentText');
        const text = textInput.value.trim();
        const imageId = e.target.dataset.imageId;
        if (!text || !imageId) return;
        
        const replyToCommentId = e.target.dataset.replyToCommentId;
        const commentData = { 
            text, 
            timestamp: firebase.database.ServerValue.TIMESTAMP, 
            username: currentUserData.username, 
            authorUid: currentUser.uid, 
            userAvatar: currentUserData.profile.avatar 
        };

        try {
            if (replyToCommentId) {
                await db.ref(`comments/${imageId}/${replyToCommentId}/replies`).push(commentData);
                sendReplyNotification(e.target.dataset.replyToAuthorId, imageId);
                cancelReply();
            } else {
                await db.ref(`comments/${imageId}`).push(commentData);
            }
            textInput.value = '';
        } catch (error) { console.error(error); showToast("No se pudo enviar el comentario."); }
    }

    function sendReplyNotification(targetUserId, imageId) {
        if (targetUserId && targetUserId !== currentUser.uid) {
            const message = `${currentUserData.username} respondió a tu comentario.`;
            db.ref(`notifications/${targetUserId}`).push({
                message, imageId,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                read: false,
                fromUsername: currentUserData.username
            });
        }
    }

    function listenToNotifications() {
        const ref = db.ref(`notifications/${currentUser.uid}`);
        ref.on('value', snapshot => {
            const list = document.getElementById('notificationsList');
            const badge = document.getElementById('navNotificationsBadge');
            list.innerHTML = '';
            if(!snapshot.exists()) {
                badge.classList.add('hidden');
                return list.innerHTML = `<p class="text-gray-500 text-center">No tienes notificaciones.</p>`;
            }

            const notifications = Object.entries(snapshot.val()).map(([id, data]) => ({id, ...data}));
            badge.classList.toggle('hidden', notifications.filter(n => !n.read).length === 0);

            notifications.reverse().forEach(n => {
                const el = document.createElement('div');
                el.className = `p-3 rounded-lg hover:bg-gray-700 cursor-pointer ${n.read ? 'opacity-60' : 'bg-indigo-900/30'}`;
                el.innerHTML = `<p>${n.message}</p><p class="text-xs text-gray-500 mt-1">${new Date(n.timestamp).toLocaleString()}</p>`;
                el.onclick = () => {
                    document.getElementById('notificationsWindow').classList.add('hidden');
                    const isPost = allPosts.some(p => p.id === n.imageId);
                    showDetailView(n.imageId, isPost);
                    ref.child(n.id).child('read').set(true);
                };
                list.appendChild(el);
            });
        });
    }

    // --- FUNCIONES AUXILIARES DE RENDERIZADO ---
    function renderUserPosts(userId, gridId, messageId) {
        const container = document.getElementById(gridId);
        const message = document.getElementById(messageId);
        container.innerHTML = '';
        const userPosts = allPosts.filter(p => p.authorUid === userId).reverse();
        message.classList.toggle('hidden', userPosts.length > 0);
        if(userPosts.length > 0) appendToImageGrid(container, userPosts); 
    }
    
    function renderFavorites() {
        listenToUserFavorites((favoriteItems) => {
            const container = document.getElementById('favoritesGrid');
            const message = document.getElementById('no-favorites-message');
            container.innerHTML = '';
            message.classList.toggle('hidden', favoriteItems.length > 0);
            if(favoriteItems.length > 0) appendToImageGrid(container, favoriteItems.reverse());
        });
    }

    function listenToUserFavorites(callback) {
        if(!currentUser) return;
        db.ref(`favorites/${currentUser.uid}`).on('value', snap => {
            const favoriteIds = Object.keys(snap.val() || {});
            const favoriteItems = [...allImages, ...allPosts].filter(item => favoriteIds.includes(String(item.id)));
            if(callback) callback(favoriteItems);
        });
    }
    
    function updateAllAvatars(url) {
        document.getElementById('profileAvatar').src = url;
        document.getElementById('navProfileAvatar').src = url;
        document.getElementById('commentFormAvatar').src = url;
    }

    async function updateAvatar(url) {
        try {
            // Simple check to see if it's a plausible image URL before setting
            const response = await fetch(url, { mode: 'no-cors' });
            currentUserData.profile.avatar = url;
            updateAllAvatars(url);
            await db.ref(`users/${currentUser.uid}/profile/avatar`).set(url);
            document.getElementById('avatarModal').classList.add('hidden');
            showToast("Avatar actualizado");
        } catch (error) {
            showToast("La URL de la imagen no parece ser válida.");
        }
    }

    function renderSearchResults(query) {
        query = query.toLowerCase().trim();
        const resultsContainer = document.getElementById('searchResults');
        const countEl = document.getElementById('searchResultCount');
        resultsContainer.innerHTML = '';

        if (!query) {
            countEl.textContent = '';
            return;
        }

        const results = [...allImages, ...allPosts].filter(item => {
            const titleMatch = item.title.toLowerCase().includes(query);
            const tagMatch = (item.tags || []).some(tag => tag.toLowerCase().includes(query));
            return titleMatch || tagMatch;
        });

        countEl.textContent = `${results.length} resultado(s) encontrado(s).`;
        if (results.length > 0) {
            appendToImageGrid(resultsContainer, results);
        } else {
            resultsContainer.innerHTML = `<p class="text-center text-gray-500 col-span-full py-8">No se encontraron resultados.</p>`;
        }
    }

    function renderProfileInterests() {
        const container = document.getElementById('profileInterests');
        container.innerHTML = '';
        const userInterests = new Set(currentUserData.profile?.interests || []);
        Array.from(allTags).sort().forEach(tag => {
            const isSelected = userInterests.has(tag);
            const tagEl = document.createElement('button');
            tagEl.textContent = tag;
            tagEl.dataset.tag = tag;
            tagEl.className = `px-3 py-1 text-sm rounded-full cursor-pointer transition-colors ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300'}`;
            tagEl.addEventListener('click', () => {
                const selectedCount = container.querySelectorAll('.bg-indigo-600').length;
                if (!tagEl.classList.contains('bg-indigo-600') && selectedCount >= INTEREST_LIMIT) {
                    showToast(`Puedes elegir hasta ${INTEREST_LIMIT} intereses.`);
                    return;
                }
                tagEl.classList.toggle('bg-indigo-600');
                tagEl.classList.toggle('text-white');
                tagEl.classList.toggle('bg-gray-700');
                tagEl.classList.toggle('text-gray-300');
                updateInterestCounter();
            });
            container.appendChild(tagEl);
        });
        updateInterestCounter();
    }

    function updateInterestCounter() {
        const count = document.querySelectorAll('#profileInterests .bg-indigo-600').length;
        const counterEl = document.getElementById('interestCounter');
        counterEl.textContent = `${count}/${INTEREST_LIMIT}`;
        counterEl.classList.toggle('text-red-500', count >= INTEREST_LIMIT);
    }
    
    async function renderPopularGallery() {
        const container = document.getElementById('popularGallery');
        container.innerHTML = `<div class="col-span-full text-center p-8"><i class="fas fa-spinner fa-spin text-3xl text-indigo-400"></i></div>`;
        const combinedContent = [...allImages, ...allPosts];
        const likesPromises = combinedContent.map(item => db.ref(`likes/${item.id}`).once('value'));
        const likesSnapshots = await Promise.all(likesPromises);
        const popularContent = combinedContent
            .map((item, index) => ({ ...item, score: likesSnapshots[index].numChildren() }))
            .sort((a, b) => b.score - a.score);
        container.innerHTML = '';
        appendToImageGrid(container, popularContent.slice(0, 24));
    }
    
    function renderSimilarImages(currentImage) {
        const section = document.getElementById('similar-section');
        const container = document.getElementById('similar-images-grid');
        container.innerHTML = '';
        const currentTags = new Set(currentImage.tags || []);
        if (currentTags.size === 0) { section.classList.add('hidden'); return; }
        const similarImages = allImages
            .filter(img => img.id !== currentImage.id)
            .map(img => ({ ...img, score: (img.tags || []).filter(tag => currentTags.has(tag)).length }))
            .filter(img => img.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 6);
            
        if (similarImages.length > 0) {
            section.classList.remove('hidden');
            appendToImageGrid(container, similarImages);
        } else {
            section.classList.add('hidden');
        }
    }
});

