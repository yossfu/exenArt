// Script ahora es un módulo para poder usar imports.
// Se importa la nueva sintaxis modular de Firebase v11.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    sendPasswordResetEmail, 
    signOut 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getDatabase, 
    ref, 
    onValue, 
    set, 
    push, 
    serverTimestamp, 
    get, 
    query, 
    orderByChild,
    remove
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

document.addEventListener('DOMContentLoaded', () => {
    // La configuración de Firebase no cambia
    const firebaseConfig = {
        apiKey: "AIzaSyBB7y-V0P_gKPWH-shvwrmZxHbdq-ASmj8",
        authDomain: "exene-53e6b.firebaseapp.com",
        databaseURL: "https://exene-53e6b-default-rtdb.firebaseio.com",
        projectId: "exene-53e6b",
        storageBucket: "exene-53e6b.firebasestorage.app",
        messagingSenderId: "481369419867",
        appId: "1:481369419867:web:ac5db24c436344262c8f7e"
    };

    // Inicialización de Firebase con la nueva sintaxis
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    const auth = getAuth(app);
    
    // Las variables globales se mantienen para la lógica de la app
    let allImages = [], allPosts = [], sortedCuratedContent = [];
    let loadedCuratedCount = 0, loadedFeedCount = 0;
    const itemsPerLoad = 12;
    let currentUser = null, currentUserData = {};
    let isCurrentUserAdmin = false;
    let usersCache = {};
    let currentViewer = null;
    let lastView = 'galleryView';
    let isGalleryLoading = false, isFeedLoading = false;
    let toastTimeout;
    const ADMIN_USER_DATA = { uid: 'admin_exen', username: 'Exen', profile: { avatar: 'https://files.catbox.moe/n86yjv.png' } };
    const INTEREST_LIMIT = 10;
    let featuredSwiper = null;
    let appInitialized = false;
    let activeDetailListeners = {};

    // --- FUNCIONES AUXILIARES ---
    const showModal = (modalId) => document.getElementById(modalId).classList.remove('hidden');
    const hideModal = (modalId) => document.getElementById(modalId).classList.add('hidden');
    const showLoader = (loaderId, show) => document.getElementById(loaderId).classList.toggle('hidden', !show);
    const showToast = (message) => {
        const toast = document.getElementById('toast');
        if (toastTimeout) clearTimeout(toastTimeout);
        document.getElementById('toastMessage').textContent = message;
        toast.classList.add('show');
        toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
    };
    const getFirebaseErrorMessage = (error) => {
        switch (error.code) {
            case 'auth/invalid-email': return 'El formato del correo es inválido.';
            case 'auth/user-not-found': return 'No se encontró ningún usuario con este correo.';
            case 'auth/wrong-password': return 'Correo o contraseña incorrectos.';
            case 'auth/email-already-in-use': return 'Este correo ya está registrado.';
            case 'auth/weak-password': return 'La contraseña debe tener al menos 6 caracteres.';
            default: console.error(error); return 'Ha ocurrido un error inesperado.';
        }
    };
    const closeSlideUpView = (viewId) => {
        const view = document.getElementById(viewId);
        view.classList.remove('active');
        if (viewId === 'detailView') detachDetailViewListeners();
        setTimeout(() => triggerView(lastView || 'galleryView'), 300);
    };
    const cancelReply = () => {
        const form = document.getElementById('commentForm');
        delete form.dataset.replyToPath;
        delete form.dataset.replyToUsername;
        document.getElementById('replyingToBanner').classList.add('hidden');
        document.getElementById('commentText').placeholder = 'Escribe un comentario...';
    };
    const initiateReply = (commentElement) => {
        const form = document.getElementById('commentForm');
        form.dataset.replyToPath = commentElement.dataset.commentPath;
        form.dataset.replyToUsername = commentElement.dataset.authorName;
        document.getElementById('replyingToUsername').textContent = commentElement.dataset.authorName;
        document.getElementById('replyingToBanner').classList.remove('hidden');
        document.getElementById('commentText').focus();
    };
    
    // --- LÓGICA DE DATOS CON FIREBASE V11 ---

    const detachDetailViewListeners = () => {
        if (activeDetailListeners.likes) activeDetailListeners.likes.unsubscribe();
        if (activeDetailListeners.views) activeDetailListeners.views.unsubscribe();
        if (activeDetailListeners.comments) activeDetailListeners.comments.unsubscribe();
        activeDetailListeners = {};
    };

    const getAuthorData = async (uid) => {
        if (uid === ADMIN_USER_DATA.uid) return ADMIN_USER_DATA;
        if (usersCache[uid]) return usersCache[uid];
        const snapshot = await get(ref(db, `users/${uid}`));
        if (snapshot.exists()) {
            usersCache[uid] = snapshot.val();
            return usersCache[uid];
        }
        return { username: 'Anónimo', profile: {} };
    };

    async function loadUserData() {
        if (!currentUser) return;
        isCurrentUserAdmin = currentUser.uid === ADMIN_USER_DATA.uid;
        const data = await getAuthorData(currentUser.uid);
        currentUserData = data || { username: currentUser.email.split('@')[0], profile: {} };
        const defaultAvatar = `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(currentUserData.username)}`;
        currentUserData.profile.avatar = currentUserData.profile.avatar || defaultAvatar;
        updateAllAvatars(currentUserData.profile.avatar);
    }
    
    async function loadCuratedImages() {
        try {
            const response = await fetch('imagenes.json');
            if (!response.ok) throw new Error('Network response was not ok');
            const images = await response.json();
            allImages = images.map(img => ({ ...img, isPost: false, authorUid: ADMIN_USER_DATA.uid }));
            let allTagsSet = new Set();
            allImages.forEach(img => (img.tags || []).forEach(tag => allTagsSet.add(tag.trim().toLowerCase())));
            window.allTags = Array.from(allTagsSet);
        } catch (error) { console.error("Fallo al cargar imagenes.json:", error); showToast("No se pudieron cargar las imágenes curadas"); }
    }

    function listenToPosts() {
        return new Promise((resolve) => {
            const postsRef = ref(db, 'posts');
            onValue(postsRef, snapshot => {
                allPosts = [];
                if (snapshot.exists()) {
                    snapshot.forEach(childSnapshot => {
                        allPosts.push({ ...childSnapshot.val(), id: childSnapshot.key, isPost: true });
                    });
                }
                allPosts.sort((a, b) => b.timestamp - a.timestamp);
                if (appInitialized) {
                    renderUserPostCarousel();
                    const currentVisibleView = document.querySelector('.view:not(.hidden)');
                    if (currentVisibleView?.id === 'feedView') renderUserFeed(true);
                    if (currentVisibleView?.id === 'profileView') renderUserPosts(currentUser.uid, 'userPostsGrid', 'no-posts-message');
                }
                resolve();
            });
        });
    }

    // --- NAVEGACIÓN Y RENDERIZADO ---
    function navigateTo(viewId) {
        const currentView = document.querySelector('.view:not(.hidden)');
        if (currentView && !currentView.classList.contains('slide-up')) {
            lastView = currentView.id;
        } else if (currentView && currentView.classList.contains('slide-up') && document.querySelectorAll('.slide-up.active').length <= 1) {
            lastView = document.querySelector('.view:not(.hidden):not(.slide-up)')?.id || 'galleryView';
        }
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        const targetView = document.getElementById(viewId);
        if (!targetView) return;
        targetView.classList.remove('hidden');
        document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
            btn.classList.toggle('text-indigo-400', btn.dataset.view === viewId);
            btn.classList.toggle('text-gray-400', btn.dataset.view !== viewId);
        });
        document.getElementById('navProfileAvatar').classList.toggle('border-indigo-500', viewId === 'profileView');
        document.getElementById('navProfileAvatar').classList.toggle('border-transparent', viewId !== 'profileView');
        if (targetView.classList.contains('slide-up')) {
            setTimeout(() => targetView.classList.add('active'), 10);
        }
    }
    
    function triggerView(viewId) {
        switch(viewId) {
            case 'galleryView': navigateTo(viewId); break;
            case 'feedView': renderUserFeed(true); navigateTo(viewId); break;
            case 'popularView': renderPopularGallery(); navigateTo(viewId); break;
            case 'profileView': populateProfileView(); break; 
            case 'searchView': navigateTo(viewId); document.getElementById('searchInput').focus(); break;
        }
    }

    async function appendToImageGrid(container, itemsToRender) {
        for (const item of itemsToRender) {
            const card = document.createElement('div');
            card.className = 'bg-gray-800 rounded-lg overflow-hidden cursor-pointer group portrait-aspect';
            const imageUrl = item.isPost ? item.imageUrl : item.url;
            
            let authorOverlay = '';
            let adminControls = '';

            if (item.isPost) {
                const authorData = await getAuthorData(item.authorUid);
                const isVerified = item.authorUid === ADMIN_USER_DATA.uid;
                authorOverlay = `
                    <div class="card-author-overlay">
                        <img src="${authorData.profile?.avatar || ''}" alt="${authorData.username}" class="bg-gray-700">
                        <span class="text-white text-sm font-semibold truncate">${authorData.username}</span>
                        ${isVerified ? '<i class="fas fa-check-circle text-blue-400 text-sm ml-1"></i>' : ''}
                    </div>
                `;
                if (isCurrentUserAdmin) {
                    adminControls = `<button class="admin-delete-btn" data-post-id="${item.id}" title="Eliminar publicación"><i class="fas fa-trash-alt"></i></button>`;
                }
            }
            card.innerHTML = `${authorOverlay}${adminControls}<img src="${imageUrl}" alt="${item.title}" loading="lazy" onerror="this.onerror=null;this.src='https://placehold.co/400x600/1f2937/a7a7a7?text=Error';" class="transition-transform duration-300 group-hover:scale-105"><div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div><h3 class="absolute bottom-0 left-0 p-2 text-white font-semibold text-sm truncate w-full">${item.title}</h3>`;
            
            card.querySelector('img, h3').addEventListener('click', () => showDetailView(item.id, item.isPost));
            
            const deleteBtn = card.querySelector('.admin-delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handleDeletePost(e.currentTarget.dataset.postId);
                });
            }

            container.appendChild(card);
        }
    }
    async function renderUserPostCarousel() {
        const wrapper = document.getElementById('featured-wrapper');
        const carouselContainer = wrapper.closest('.featured-carousel');
        if (allPosts.length === 0) {
            carouselContainer.style.display = 'none';
            return;
        }
        carouselContainer.style.display = 'block';
        const postsForCarousel = [...allPosts].sort(() => 0.5 - Math.random()).slice(0, 7);
        let slidesHtml = '';
        for (const post of postsForCarousel) {
            const authorData = await getAuthorData(post.authorUid);
            const isVerified = post.authorUid === ADMIN_USER_DATA.uid;
            slidesHtml += `<div class="swiper-slide"><img src="${post.imageUrl}" alt="${post.title}" data-id="${post.id}" data-is-post="true"><div class="slide-author-overlay"><img src="${authorData.profile?.avatar}" alt="${authorData.username}" class="bg-gray-700"><span class="text-white font-bold">${authorData.username}</span>${isVerified ? '<i class="fas fa-check-circle text-blue-400 ml-1"></i>' : ''}</div></div>`;
        }
        wrapper.innerHTML = slidesHtml;
        if (featuredSwiper) featuredSwiper.destroy(true, true);
        featuredSwiper = new Swiper('.featured-carousel', { loop: postsForCarousel.length > 1, autoplay: { delay: 4000, disableOnInteraction: false }, pagination: { el: '.swiper-pagination', clickable: true }, navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' } });
        wrapper.querySelectorAll('img').forEach(img => {
            img.addEventListener('click', (e) => showDetailView(e.target.dataset.id, e.target.dataset.isPost === 'true'));
        });
    }
    function sortCuratedFeed() {
        const userInterests = new Set(currentUserData.profile?.interests || []);
        sortedCuratedContent = [...allImages].sort((a, b) => {
           const scoreA = (a.tags || []).reduce((s, tag) => s + (userInterests.has(tag) ? 5 : 0), 0) + Math.random();
           const scoreB = (b.tags || []).reduce((s, tag) => s + (userInterests.has(tag) ? 5 : 0), 0) + Math.random();
           return scoreB - scoreA;
        });
    }
    function renderCuratedFeed(reset = false) {
        if (isGalleryLoading) return;
        isGalleryLoading = true;
        showLoader('galleryLoader', true);
        const galleryContainer = document.getElementById('gallery');
        if (reset) { galleryContainer.innerHTML = ''; loadedCuratedCount = 0; }
        const nextItems = sortedCuratedContent.slice(loadedCuratedCount, loadedCuratedCount + itemsPerLoad);
        if (nextItems.length > 0) {
            appendToImageGrid(galleryContainer, nextItems);
            loadedCuratedCount += nextItems.length;
        } else if (reset && sortedCuratedContent.length === 0) {
            galleryContainer.innerHTML = `<p class="col-span-full text-center text-gray-500 py-8">No hay contenido oficial para mostrar.</p>`;
        }
        showLoader('galleryLoader', false);
        isGalleryLoading = false;
    }
    function renderUserFeed(reset = false) {
        if (isFeedLoading) return;
        isFeedLoading = true;
        showLoader('feedLoader', true);
        const feedContainer = document.getElementById('feedGrid');
        if (reset) { feedContainer.innerHTML = ''; loadedFeedCount = 0; }
        const nextItems = allPosts.slice(loadedFeedCount, loadedFeedCount + itemsPerLoad);
        if (nextItems.length > 0) {
            appendToImageGrid(feedContainer, nextItems);
            loadedFeedCount += nextItems.length;
        } else if (reset && allPosts.length === 0) {
            feedContainer.innerHTML = `<p class="col-span-full text-center text-gray-500 py-8">Aún no hay publicaciones de la comunidad. ¡Sé el primero!</p>`;
        }
        showLoader('feedLoader', false);
        isFeedLoading = false;
    }

    // --- EVENT LISTENERS ---
    
    function setupAuthEventListeners() {
        document.getElementById('showLoginModalBtn').addEventListener('click', () => showModal('loginModal'));
        document.getElementById('showRegisterModalBtn').addEventListener('click', () => showModal('registerModal'));
        document.querySelectorAll('.close-modal-btn').forEach(btn => btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal-container');
            if (modal) modal.classList.add('hidden');
        }));
        document.getElementById('showForgotPasswordModalBtn').addEventListener('click', () => { hideModal('loginModal'); showModal('forgotPasswordModal'); });
        
        document.getElementById('forgotPasswordForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('forgotPasswordEmail').value;
            try {
                await sendPasswordResetEmail(auth, email);
                showToast('Correo de restablecimiento enviado. Revisa tu bandeja de entrada.');
                hideModal('forgotPasswordModal');
            } catch (error) { showToast(getFirebaseErrorMessage(error)); }
        });

        document.getElementById('registerForm').addEventListener('submit', async e => {
            e.preventDefault();
            const username = e.target.registerUsername.value.trim();
            const email = e.target.registerEmail.value.trim();
            const password = e.target.registerPassword.value;
            if (password !== e.target.registerPasswordConfirm.value) return showToast("Las contraseñas no coinciden.");
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await set(ref(db, `users/${userCredential.user.uid}`), {
                    username: username,
                    profile: { avatar: `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(username)}`, bio: '', interests: [] }
                });
                hideModal('registerModal');
            } catch (error) { showToast(getFirebaseErrorMessage(error)); }
        });

        document.getElementById('loginForm').addEventListener('submit', async e => {
            e.preventDefault();
            try {
                await signInWithEmailAndPassword(auth, e.target.loginEmail.value, e.target.loginPassword.value);
                hideModal('loginModal');
            } catch (error) { showToast(getFirebaseErrorMessage(error)); }
        });
    }

    function setupAppEventListeners() {
        if(document.body.dataset.appListenersAttached === 'true') return;
        document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth));
        document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
            btn.addEventListener('click', () => triggerView(btn.dataset.view));
        });
        document.getElementById('createPostBtn').addEventListener('click', () => showModal('createPostModal'));
        const notificationsBtn = document.getElementById('navNotificationsBtn');
        const notificationsPanel = document.getElementById('notificationsWindow');
        notificationsBtn.addEventListener('click', (e) => { e.stopPropagation(); notificationsPanel.classList.toggle('active'); });
        document.addEventListener('click', (e) => {
            if (!notificationsPanel.contains(e.target) && !notificationsBtn.contains(e.target)) {
                notificationsPanel.classList.remove('active');
            }
        });
        new IntersectionObserver(entries => { if (entries[0].isIntersecting && !isGalleryLoading && document.getElementById('galleryView').offsetParent !== null) renderCuratedFeed(false); }, { threshold: 0.1 }).observe(document.getElementById('curated-sentinel'));
        new IntersectionObserver(entries => { if (entries[0].isIntersecting && !isFeedLoading && document.getElementById('feedView').offsetParent !== null) renderUserFeed(false); }, { threshold: 0.1 }).observe(document.getElementById('feed-sentinel'));
        setupProfileEventListeners();
        setupDetailViewEventListeners();
        setupCreatePostForm();
        setupLegalModalsListeners();
        document.getElementById('searchForm').addEventListener('submit', e => e.preventDefault());
        document.getElementById('searchInput').addEventListener('input', e => renderSearchResults(e.target.value));
        document.body.dataset.appListenersAttached = 'true';
    }

    function setupProfileEventListeners() {
        document.getElementById('saveProfileBtn').addEventListener('click', async () => {
            const bio = document.getElementById('profileBio').value;
            const interests = Array.from(document.querySelectorAll('#profileInterests .bg-indigo-600')).map(el => el.dataset.tag);
            try {
                await set(ref(db, `users/${currentUser.uid}/profile`), { bio, interests }, { merge: true });
                await loadUserData();
                sortCuratedFeed();
                renderCuratedFeed(true);
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
        
        document.getElementById('detailLikeBtn').addEventListener('click', async function() {
            if (!this.dataset.id || !currentUser) return;
            const likeRef = ref(db, `likes/${this.dataset.id}/${currentUser.uid}`);
            const snap = await get(likeRef);
            set(likeRef, snap.exists() ? null : true);
        });

        document.getElementById('detailFavoriteBtn').addEventListener('click', async function() {
            if (!this.dataset.id || !currentUser) return;
            const favRef = ref(db, `favorites/${currentUser.uid}/${this.dataset.id}`);
            const snap = await get(favRef);
            set(favRef, snap.exists() ? null : true);
        });

        document.getElementById('commentForm').addEventListener('submit', handleCommentSubmit);
        document.getElementById('focusCommentBtn').addEventListener('click', () => document.getElementById('commentText').focus());
        document.getElementById('cancelReplyBtn').addEventListener('click', cancelReply);
        document.getElementById('adminDeletePostBtn').addEventListener('click', function() {
            handleDeletePost(this.dataset.postId);
        });
    }
    
    function setupCreatePostForm() {
        document.getElementById('createPostForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const imageUrl = document.getElementById('postImageUrl').value.trim();
            const title = document.getElementById('postTitle').value.trim();
            const tagsInput = document.getElementById('postTags').value.trim();
            if (!imageUrl || !title) return showToast("La URL y el título son obligatorios.");
            const tags = tagsInput.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag !== '');
            
            const newPostRef = push(ref(db, 'posts'));
            try {
                await set(newPostRef, {
                    id: newPostRef.key, imageUrl, title, tags,
                    authorUid: currentUser.uid,
                    timestamp: serverTimestamp()
                });
                document.getElementById('createPostForm').reset();
                hideModal('createPostModal');
                showToast("Publicación creada con éxito");
                triggerView('feedView');
            } catch (error) { console.error("Error creando post:", error); showToast("No se pudo crear la publicación."); }
        });
    }

    // --- VISTAS DETALLADAS Y LÓGICA DE VISUALIZACIÓN ---

    async function showDetailView(id, isPost = false) {
        detachDetailViewListeners();
        navigateTo('detailView');
        document.querySelector('#detailView > main').scrollTop = 0;
        const item = isPost ? allPosts.find(p => String(p.id) === String(id)) : allImages.find(i => String(i.id) === String(id));
        if (!item) { showToast('Contenido no encontrado.'); closeSlideUpView('detailView'); return; };
        
        const dbId = String(item.id);
        const authorData = await getAuthorData(item.authorUid);
        const isVerified = item.authorUid === ADMIN_USER_DATA.uid;
        
        document.getElementById('detailAuthorUsername').textContent = authorData.username;
        document.getElementById('detailAuthorAvatar').src = authorData.profile?.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${authorData.username}`;
        document.getElementById('detailAuthorVerifiedBadge').innerHTML = isVerified ? '<i class="fas fa-check-circle text-blue-400"></i>' : '';
        document.getElementById('detailAuthorInfo').onclick = () => { if (item.authorUid !== ADMIN_USER_DATA.uid) showUserProfile(item.authorUid); };
        document.getElementById('detailTitle').textContent = item.title;
        document.getElementById('detailDescription').textContent = item.description || '';
        
        if (currentViewer) currentViewer.destroy();
        const imageViewer = document.getElementById('imageViewer');
        imageViewer.innerHTML = `<img src="${item.isPost ? item.imageUrl : item.url}" alt="${item.title}" onerror="this.parentElement.innerHTML='<p class=\\'p-4 text-red-400\\'>Error al cargar imagen.</p>';">`;
        currentViewer = new Viewer(imageViewer, { navbar: false, toolbar: false, button: true, title: false });
        
        document.getElementById('detailLikeBtn').dataset.id = dbId;
        document.getElementById('detailFavoriteBtn').dataset.id = dbId;
        document.getElementById('commentForm').dataset.imageId = dbId;
        delete document.getElementById('commentForm').dataset.replyToPath;
        
        const adminDeleteBtn = document.getElementById('adminDeletePostBtn');
        if (isCurrentUserAdmin && isPost) {
            adminDeleteBtn.classList.remove('hidden');
            adminDeleteBtn.dataset.postId = dbId;
        } else {
            adminDeleteBtn.classList.add('hidden');
        }

        listenToLikesAndViews(dbId);
        listenToComments(dbId);
        if (!isPost) renderSimilarImages(item);
        else document.getElementById('similar-section').classList.add('hidden');
        
        set(ref(db, `views/${dbId}/${currentUser.uid}`), true);
    }
    
    async function populateProfileView() {
        if (!currentUserData.profile) return;
        navigateTo('profileView');
        document.getElementById('profileAvatar').src = currentUserData.profile.avatar;
        document.getElementById('profileUsername').textContent = currentUserData.username;
        document.getElementById('profileBio').value = currentUserData.profile.bio || '';
        renderUserPosts(currentUser.uid, 'userPostsGrid', 'no-posts-message');
        renderFavorites();
        renderProfileInterests();
    }
    
    async function showUserProfile(userId) {
        if (userId === ADMIN_USER_DATA.uid) return;
        navigateTo('userProfileView');
        const userData = await getAuthorData(userId);
        const profile = userData.profile || {};
        document.getElementById('userProfileHeaderUsername').textContent = `Perfil de ${userData.username}`;
        document.getElementById('userProfileAvatar').src = profile.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${userData.username}`;
        document.getElementById('userProfileUsername').textContent = userData.username;
        document.getElementById('userProfileBio').textContent = profile.bio || 'Este usuario aún no ha escrito una biografía.';
        renderUserPosts(userId, 'visitingUserPostsGrid', 'no-visiting-posts-message');
    }

    function listenToLikesAndViews(id) {
        const likesRef = ref(db, `likes/${id}`);
        const viewsRef = ref(db, `views/${id}`);
        
        const likesUnsubscribe = onValue(likesRef, snap => {
            const likeCountEl = document.getElementById('detailLikeCount');
            if (!likeCountEl) return;
            const data = snap.val() || {};
            likeCountEl.textContent = `${Object.keys(data).length} Me gusta`;
            document.getElementById('detailLikeBtn').classList.toggle('liked', !!(currentUser && data[currentUser.uid]));
        });
        
        const viewsUnsubscribe = onValue(viewsRef, snap => {
            const viewCountEl = document.getElementById('detailViewCount');
            if (viewCountEl) viewCountEl.textContent = `${Object.keys(snap.val() || {}).length} Vistas`;
        });
        
        activeDetailListeners.likes = { unsubscribe: likesUnsubscribe };
        activeDetailListeners.views = { unsubscribe: viewsUnsubscribe };
    }
    
    function listenToComments(imageId) {
        const commentsQuery = query(ref(db, `comments/${imageId}`), orderByChild('timestamp'));
        
        const commentsUnsubscribe = onValue(commentsQuery, snapshot => {
            const list = document.getElementById('commentsList');
            if (!list) return;
            list.innerHTML = '';
            if (!snapshot.exists()) return list.innerHTML = `<p class="text-gray-500 text-center text-sm py-4">Sé el primero en comentar.</p>`;
            
            const comments = [];
            snapshot.forEach(commentSnapshot => {
                comments.push({ id: commentSnapshot.key, ...commentSnapshot.val() });
            });

            comments.sort((a, b) => b.timestamp - a.timestamp).forEach(commentData => {
                const path = `comments/${imageId}/${commentData.id}`;
                list.appendChild(createCommentElement(commentData, path));
            });
        });
        
        activeDetailListeners.comments = { unsubscribe: commentsUnsubscribe };
    }
    
    function createCommentElement(commentData, path) {
        const li = document.createElement('li');
        li.className = 'comment-item';
        li.dataset.commentPath = path;
        li.dataset.authorName = commentData.username;
        const isVerified = commentData.authorUid === ADMIN_USER_DATA.uid;

        const adminDeleteButton = isCurrentUserAdmin ? `<button class="admin-delete-comment-btn" title="Eliminar comentario"><i class="fas fa-trash-alt"></i></button>` : '';

        li.innerHTML = `
            <img src="${commentData.userAvatar || ''}" class="w-8 h-8 rounded-full flex-shrink-0 object-cover bg-gray-700 cursor-pointer" data-userid="${commentData.authorUid}">
            <div class="comment-content">
                <div class="comment-body">
                    <div class="comment-text-content bg-gray-800/50 rounded-lg p-2">
                        <span class="font-bold text-sm text-white cursor-pointer hover:underline flex items-center gap-2" data-userid="${commentData.authorUid}">${commentData.username}${isVerified ? '<i class="fas fa-check-circle text-blue-400 text-xs ml-1"></i>' : ''}</span>
                        <p class="text-gray-300 mt-1 break-words">${commentData.text}</p>
                    </div>
                </div>
                <div class="comment-actions">
                    <button class="hover:underline reply-btn">Responder</button>
                    ${adminDeleteButton}
                </div>
                <div class="replies-container"></div>
            </div>`;
        li.querySelector('.reply-btn').addEventListener('click', e => initiateReply(e.currentTarget.closest('li')));
        
        const adminBtn = li.querySelector('.admin-delete-comment-btn');
        if (adminBtn) {
            adminBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleDeleteComment(path);
            });
        }

        li.querySelectorAll('[data-userid]').forEach(el => {
            el.addEventListener('click', e => {
                e.stopPropagation();
                if (el.dataset.userid === currentUser.uid) { 
                    const activeSlideUp = document.querySelector('.view.slide-up.active');
                    if(activeSlideUp) closeSlideUpView(activeSlideUp.id); 
                    setTimeout(() => triggerView('profileView'), 300); 
                }
                else { showUserProfile(el.dataset.userid); }
            });
        });
        if (commentData.replies) {
            const repliesContainer = li.querySelector('.replies-container');
            Object.entries(commentData.replies).sort((a, b) => a[1].timestamp - b[1].timestamp).forEach(([replyId, replyData]) => {
                const replyPath = `${path}/replies/${replyId}`;
                repliesContainer.appendChild(createCommentElement(replyData, replyPath));
            });
        }
        return li;
    }
    
    async function handleCommentSubmit(e) {
        e.preventDefault();
        const textInput = document.getElementById('commentText');
        const text = textInput.value.trim();
        const imageId = document.getElementById('commentForm').dataset.imageId;
        if (!text || !imageId) return;
        const replyToPath = document.getElementById('commentForm').dataset.replyToPath;
        const commentData = { text, timestamp: serverTimestamp(), username: currentUserData.username, authorUid: currentUser.uid, userAvatar: currentUserData.profile.avatar };
        try {
            const refPath = replyToPath ? `${replyToPath}/replies` : `comments/${imageId}`;
            await set(push(ref(db, refPath)), commentData);
            cancelReply();
            textInput.value = '';
        } catch (error) { console.error(error); showToast("No se pudo enviar el comentario."); }
    }
    
    function listenToNotifications() {
        if (!currentUser) return;
        const notificationsRef = ref(db, `notifications/${currentUser.uid}`);
        onValue(notificationsRef, snapshot => {
            const list = document.getElementById('notificationsList');
            const badge = document.getElementById('navNotificationsBadge');
            const panel = document.getElementById('notificationsWindow');
            list.innerHTML = '';
            if(!snapshot.exists()) {
                badge.classList.add('hidden');
                return list.innerHTML = `<p class="p-4 text-center text-gray-500">No tienes notificaciones.</p>`;
            }
            const notifications = Object.entries(snapshot.val()).map(([id, data]) => ({id, ...data}));
            badge.classList.toggle('hidden', notifications.filter(n => !n.read).length === 0);
            notifications.reverse().forEach(n => {
                const el = document.createElement('div');
                el.className = `px-4 py-3 hover:bg-gray-700 cursor-pointer ${n.read ? 'opacity-60' : 'font-semibold'}`;
                el.innerHTML = `<p>${n.message || 'Nueva notificación'}</p><p class="text-xs text-gray-500 mt-1 font-normal">${new Date(n.timestamp).toLocaleString()}</p>`;
                el.onclick = () => {
                    panel.classList.remove('active');
                    const isPost = allPosts.some(p => p.id === n.imageId);
                    showDetailView(n.imageId, isPost);
                    set(ref(db, `notifications/${currentUser.uid}/${n.id}/read`), true);
                };
                list.appendChild(el);
            });
        });
    }

    // --- FUNCIONES DE PERFIL Y BÚSQUEDA ---
    function renderUserPosts(userId, gridId, messageId) {
        const container = document.getElementById(gridId);
        const message = document.getElementById(messageId);
        container.innerHTML = '';
        const userPosts = allPosts.filter(p => p.authorUid === userId);
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
        onValue(ref(db, `favorites/${currentUser.uid}`), snap => {
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
            await fetch(url, { mode: 'no-cors' });
            currentUserData.profile.avatar = url;
            updateAllAvatars(url);
            await set(ref(db, `users/${currentUser.uid}/profile/avatar`), url);
            hideModal('avatarModal');
            showToast("Avatar actualizado");
        } catch (error) { showToast("La URL de la imagen no parece ser válida."); }
    }
    
    function renderSearchResults(query) {
        query = query.toLowerCase().trim();
        const resultsContainer = document.getElementById('searchResults');
        const countEl = document.getElementById('searchResultCount');
        resultsContainer.innerHTML = '';
        if (!query) { countEl.textContent = ''; return; }
        const results = [...allImages, ...allPosts].filter(item => {
            const titleMatch = item.title.toLowerCase().includes(query);
            const tagMatch = (item.tags || []).some(tag => tag.toLowerCase().includes(query));
            return titleMatch || tagMatch;
        });
        countEl.textContent = `${results.length} resultado(s) encontrado(s).`;
        if (results.length > 0) appendToImageGrid(resultsContainer, results);
        else resultsContainer.innerHTML = `<p class="col-span-full text-center text-gray-500 py-8">No se encontraron resultados.</p>`;
    }

    function renderProfileInterests() {
        const container = document.getElementById('profileInterests');
        container.innerHTML = '';
        const userInterests = new Set(currentUserData.profile?.interests || []);
        (window.allTags || []).forEach(tag => {
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
        
        const likesSnapshot = await get(ref(db, 'likes'));
        const allLikes = likesSnapshot.val() || {};

        const combinedContent = [...allImages, ...allPosts];
        const popularContent = combinedContent
            .map(item => ({ ...item, score: allLikes[item.id] ? Object.keys(allLikes[item.id]).length : 0 }))
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
            .filter(img => String(img.id) !== String(currentImage.id))
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

    function renderMostVotedSection() {
        const likesRef = ref(db, 'likes');
        onValue(likesRef, async (snapshot) => {
            const allLikes = snapshot.val() || {};
            const container = document.getElementById('leaderboard');
            
            if (!allPosts || allPosts.length === 0) {
                 container.innerHTML = `<p class="text-center text-gray-500 text-sm col-span-3">Aún no hay publicaciones para mostrar.</p>`;
                 return;
            }

            const rankedPosts = allPosts
                .map(post => ({
                    ...post,
                    likeCount: allLikes[post.id] ? Object.keys(allLikes[post.id]).length : 0
                }))
                .sort((a, b) => b.likeCount - a.likeCount);

            const topPosts = rankedPosts.slice(0, 3);
            
            container.innerHTML = '';

            if (topPosts.length === 0 || topPosts[0].likeCount === 0) {
                container.innerHTML = `<p class="text-center text-gray-500 text-sm col-span-3">Aún no hay publicaciones populares. ¡Vota por tus favoritas!</p>`;
                return;
            }

            for (let i = 0; i < topPosts.length; i++) {
                const post = topPosts[i];
                const rank = i + 1;
                const authorInfo = await getAuthorData(post.authorUid);

                const item = document.createElement('div');
                item.className = `most-voted-item rank-${rank} cursor-pointer group`;
                item.innerHTML = `
                    <img src="${post.imageUrl}" alt="${post.title}" class="post-image transition-transform duration-300 group-hover:scale-105" onerror="this.onerror=null;this.src='https://placehold.co/300x500/1f2937/a7a7a7?text=Error';">
                    <div class="rank-badge">${rank}</div>
                    <div class="author-overlay">
                        <img src="${authorInfo.profile?.avatar || ''}" alt="${authorInfo.username}">
                        <span class="truncate">${authorInfo.username}</span>
                    </div>
                `;
                item.addEventListener('click', () => showDetailView(post.id, true));
                container.appendChild(item);
            }
        });
    }

    // --- LÓGICA DE ADVERTENCIAS Y LEGALES ---
    function setupLegalModalsListeners() {
        const links = [
            { id: 'ageModalTermsLink', modal: 'termsModal' },
            { id: 'registerTermsLink', modal: 'termsModal' },
            { id: 'registerPrivacyLink', modal: 'privacyModal' },
            { id: 'createPostTermsLink', modal: 'termsModal' },
            { id: 'createPostPrivacyLink', modal: 'privacyModal' },
        ];
        links.forEach(link => {
            document.getElementById(link.id).addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // Evita que se cierren otros modales
                showModal(link.modal);
            });
        });
    }

    function handleAgeVerification() {
        if (localStorage.getItem('ageVerified') === 'true') {
            document.getElementById('authOverlay').classList.remove('hidden');
            return true;
        }

        document.getElementById('authOverlay').classList.add('hidden');
        showModal('ageVerificationModal');

        document.getElementById('confirmAgeBtn').addEventListener('click', () => {
            localStorage.setItem('ageVerified', 'true');
            hideModal('ageVerificationModal');
            document.getElementById('authOverlay').classList.remove('hidden');
            onAuthStateChanged(auth, onAuthChange);
        });

        document.getElementById('exitBtn').addEventListener('click', () => {
            document.body.innerHTML = `<div class="w-screen h-screen bg-gray-900 flex items-center justify-center text-white text-xl p-4 text-center">Debes ser mayor de edad para acceder a este sitio.</div>`;
            document.body.className = 'bg-gray-900';
        });
        return false;
    }

    // --- LÓGICA DE ADMINISTRACIÓN ---
    function showConfirmationModal(title, message, onConfirm) {
        document.getElementById('confirmationTitle').textContent = title;
        document.getElementById('confirmationMessage').textContent = message;
        showModal('confirmationModal');

        const confirmBtn = document.getElementById('confirmActionBtn');
        const cancelBtn = document.getElementById('cancelActionBtn');

        const confirmHandler = () => {
            onConfirm();
            hideModal('confirmationModal');
            cleanup();
        };

        const cancelHandler = () => {
            hideModal('confirmationModal');
            cleanup();
        };

        const cleanup = () => {
            confirmBtn.removeEventListener('click', confirmHandler);
            cancelBtn.removeEventListener('click', cancelHandler);
        };
        
        confirmBtn.addEventListener('click', confirmHandler);
        cancelBtn.addEventListener('click', cancelHandler);
    }

    async function handleDeletePost(postId) {
        showConfirmationModal('Eliminar Publicación', '¿Seguro que quieres eliminar esta publicación y todos sus datos (likes, comentarios)?', async () => {
            try {
                // Eliminar la publicación y sus datos asociados
                await remove(ref(db, `posts/${postId}`));
                await remove(ref(db, `likes/${postId}`));
                await remove(ref(db, `comments/${postId}`));
                await remove(ref(db, `views/${postId}`));
                
                // Nota: Eliminar de favoritos de todos los usuarios es complejo y costoso.
                // Al eliminar el post, ya no aparecerá en las listas de favoritos.

                showToast('Publicación eliminada con éxito.');
                // Si estamos en la vista de detalle, ciérrala
                const detailView = document.getElementById('detailView');
                if (!detailView.classList.contains('hidden')) {
                    closeSlideUpView('detailView');
                }
            } catch (error) {
                console.error("Error eliminando la publicación:", error);
                showToast('No se pudo eliminar la publicación.');
            }
        });
    }

    async function handleDeleteComment(commentPath) {
        showConfirmationModal('Eliminar Comentario', '¿Seguro que quieres eliminar este comentario?', async () => {
            try {
                await remove(ref(db, commentPath));
                showToast('Comentario eliminado.');
            } catch (error) {
                console.error("Error eliminando el comentario:", error);
                showToast('No se pudo eliminar el comentario.');
            }
        });
    }

    // --- INICIALIZACIÓN DE LA APP ---

    async function initializeAppLogic() {
        showLoader('galleryLoader', true);
        appInitialized = true;
        try {
            setupAppEventListeners();
            await loadUserData();
            await Promise.all([loadCuratedImages(), listenToPosts()]);
            sortCuratedFeed();
            renderCuratedFeed(true);
            listenToUserFavorites();
            listenToNotifications();
            renderMostVotedSection();
        } catch (error) {
            console.error("Error inicializando la app:", error);
            showToast("Error al cargar la aplicación");
        } finally {
            showLoader('galleryLoader', false);
            triggerView('galleryView');
        }
    }

    function onAuthChange(user) {
        const authOverlay = document.getElementById('authOverlay');
        const appContent = document.getElementById('appContent');
        if (user) {
            currentUser = user;
            if (!appInitialized) {
                initializeAppLogic();
            } else {
                // Si ya está inicializado, solo actualiza los datos del usuario
                loadUserData();
            }
            authOverlay.classList.add('opacity-0', 'pointer-events-none');
            appContent.classList.remove('hidden');
        } else {
            currentUser = null;
            currentUserData = {};
            isCurrentUserAdmin = false;
            appInitialized = false;
            authOverlay.classList.remove('opacity-0', 'pointer-events-none');
            appContent.classList.add('hidden');
            document.querySelectorAll('.modal-container, .notifications-panel').forEach(m => {
                m.classList.add('hidden');
                m.classList.remove('active');
            });
        }
    }
    
    setupAuthEventListeners();
    if (handleAgeVerification()) {
        onAuthStateChanged(auth, onAuthChange);
    }
});

