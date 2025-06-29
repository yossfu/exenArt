(function () {
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
        let sortedPersonalizedImages = [];
        let allTags = new Set();
        let loadedImagesCount = 0;
        const itemsPerLoad = 12;
        let currentUser = null;
        let currentUserData = {};
        let currentViewer = null;
        let lastView = 'galleryView';
        let isGalleryLoading = false;
        let toastTimeout;
        const ADMIN_USER_DATA = { uid: 'admin_exen', username: 'Exen', profile: { avatar: 'logo.png' } };
        const INTEREST_LIMIT = 10;
        let featuredSwiper = null;
        let appInitialized = false;

        // --- SISTEMA DE AUTENTICACIÓN Y FLUJO PRINCIPAL ---
        
        setupAuthEventListeners();

        auth.onAuthStateChanged(async (user) => {
            const authOverlay = document.getElementById('authOverlay');
            const appContent = document.getElementById('appContent');

            if (user) {
                currentUser = user;
                authOverlay.classList.add('hidden');
                appContent.classList.remove('hidden');
                
                if (!appInitialized) {
                   await initializeApp();
                   appInitialized = true;
                }
            } else {
                currentUser = null;
                currentUserData = {};
                appInitialized = false;
                authOverlay.classList.remove('hidden');
                appContent.classList.add('hidden');
                document.getElementById('loginModal').classList.add('hidden');
                document.getElementById('registerModal').classList.add('hidden');
            }
        });

        async function initializeApp() {
            showLoader(true);
            try {
                setupAppEventListeners();
                await Promise.all([loadAllImagesAndTags(), loadAllUserPosts()]);
                await loadUserData();
                renderFeaturedCarousel();
                sortPersonalizedFeed();
                await renderPersonalizedGallery(true);
            } catch (error) {
                console.error("Error inicializando la app:", error);
                showToast("Error al cargar la aplicación");
            } finally {
                showLoader(false);
            }
            navigateTo('galleryView');
        }
        
        function showLoader(show) {
            document.getElementById('galleryLoader').classList.toggle('hidden', !show);
        }

        // --- LÓGICA DE DATOS ---
        async function loadUserData() {
            if (!currentUser) return;
            const userRef = db.ref(`users/${currentUser.uid}`);
            const snapshot = await userRef.once('value');
            currentUserData = snapshot.val() || { username: 'Nuevo Usuario' };
            currentUserData.profile = currentUserData.profile || {};
            const defaultAvatar = `https://api.dicebear.com/8.x/initials/svg?seed=${currentUserData.username}`;
            currentUserData.profile.avatar = currentUserData.profile.avatar || defaultAvatar;
            currentUserData.profile.interests = currentUserData.profile.interests || [];
            
            document.getElementById('navProfileAvatar').src = currentUserData.profile.avatar;
            document.getElementById('commentFormAvatar').src = currentUserData.profile.avatar;
        }

        async function loadAllImagesAndTags() {
            try {
                const response = await fetch('imagenes.json');
                if (!response.ok) throw new Error('Error al cargar imágenes');
                allImages = await response.json();
                allImages.forEach(img => {
                    (img.tags || []).forEach(tag => allTags.add(tag));
                    img.authorUid = ADMIN_USER_DATA.uid;
                    img.isCurated = true;
                });
            } catch (error) {
                console.error("Fallo al cargar imagenes.json:", error);
                showToast("No se pudieron cargar las imágenes");
            }
        }
        
        async function loadAllUserPosts() {
            const postsRef = db.ref('posts');
            const snapshot = await postsRef.once('value');
            allPosts = [];
            if(snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    allPosts.push({ ...childSnapshot.val(), id: childSnapshot.key });
                });
            }
        }
        
        function sortPersonalizedFeed() {
             const userInterests = new Set(currentUserData.profile.interests);
             sortedPersonalizedImages = [...allImages].sort((a, b) => {
                const scoreA = (a.tags || []).reduce((s, tag) => s + (userInterests.has(tag) ? 5 : 0), 0) + Math.random();
                const scoreB = (b.tags || []).reduce((s, tag) => s + (userInterests.has(tag) ? 5 : 0), 0) + Math.random();
                return scoreB - scoreA;
            });
        }
        
        // --- NAVEGACIÓN Y UI ---
        function navigateTo(viewId, data = null) {
            const commentContainer = document.getElementById('comment-container');
            const currentActiveView = document.querySelector('#appContent .view:not(.hidden)');
            if (currentActiveView && !['detailView', 'userProfileView'].includes(currentActiveView.id)) {
                lastView = currentActiveView.id;
            }
            
            document.querySelectorAll('#appContent .view').forEach(v => v.classList.add('hidden'));
            const targetView = document.getElementById(viewId);
            if(targetView) {
                targetView.classList.remove('hidden');
                if (!['detailView', 'userProfileView'].includes(viewId)) {
                    document.getElementById('detailView').classList.remove('active');
                    document.getElementById('userProfileView').classList.remove('active');
                }
            }

            if (viewId === 'detailView') {
                commentContainer.classList.remove('hidden');
            } else {
                commentContainer.classList.add('hidden');
                cancelReply();
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
            if (viewId === 'userProfileView' && data) showUserProfile(data.userId);
            if (viewId === 'searchView') document.getElementById('searchInput').focus();
            
            if (['detailView', 'userProfileView'].includes(viewId)) {
                 setTimeout(() => targetView.classList.add('active'), 10);
            }
        }
        
        // --- RENDERIZADO DE CONTENIDO ---
        function renderFeaturedCarousel() {
             let featuredImages = [];
            const userInterests = new Set(currentUserData.profile.interests || []);

            if (userInterests.size === 0) {
                featuredImages = allImages.filter(img => img.featured);
            } else {
                const scoredImages = allImages.map(img => {
                    const score = (img.tags || []).reduce((currentScore, tag) => {
                        return userInterests.has(tag) ? currentScore + 1 : currentScore;
                    }, 0);
                    return { ...img, relevanceScore: score };
                });
                featuredImages = scoredImages
                    .sort((a, b) => b.relevanceScore - a.relevanceScore)
                    .slice(0, 7);
            }

            const wrapper = document.getElementById('featured-wrapper');
            wrapper.innerHTML = ''; 

            if (featuredImages.length === 0) {
                document.querySelector('.featured-carousel').style.display = 'none';
                return;
            } else {
                 document.querySelector('.featured-carousel').style.display = 'block';
            }

            featuredImages.forEach(img => {
                const slide = document.createElement('div');
                slide.className = 'swiper-slide';
                slide.innerHTML = `<img src="${img.url}" alt="${img.title}">`;
                slide.addEventListener('click', () => showDetailView(img.id, false));
                wrapper.appendChild(slide);
            });
            
            if (featuredSwiper) {
                featuredSwiper.destroy(true, true);
            }
            featuredSwiper = new Swiper('.featured-carousel', {
                loop: featuredImages.length > 1,
                autoplay: { delay: 4000, disableOnInteraction: false },
                pagination: { el: '.swiper-pagination', clickable: true },
                navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
            });
        }
        
        function appendToImageGrid(container, imagesToRender, isPost = false) {
             imagesToRender.forEach(img => {
                const postCard = document.createElement('div');
                postCard.className = 'bg-gray-800 rounded-lg overflow-hidden cursor-pointer group portrait-aspect';
                const imageUrl = isPost ? img.imageUrl : img.url;
                postCard.innerHTML = `
                    <img src="${imageUrl}" alt="${img.title}" loading="lazy" onerror="this.onerror=null;this.src='https://placehold.co/400x600/1f2937/a7a7a7?text=Error';" class="transition-transform duration-300 group-hover:scale-105">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <h3 class="absolute bottom-0 left-0 p-2 text-white font-semibold text-sm truncate">${img.title}</h3>
                `;
                postCard.addEventListener('click', () => showDetailView(img.id, isPost));
                container.appendChild(postCard);
            });
        }
        
        async function renderPersonalizedGallery(reset = false) {
            if (isGalleryLoading) return;
            isGalleryLoading = true;
            showLoader(true);
            const galleryContainer = document.getElementById('gallery');
            if (reset) { galleryContainer.innerHTML = ''; loadedImagesCount = 0; }
            const nextImages = sortedPersonalizedImages.slice(loadedImagesCount, loadedImagesCount + itemsPerLoad);
            if (nextImages.length > 0) {
                appendToImageGrid(galleryContainer, nextImages, false);
                loadedImagesCount += nextImages.length;
            }
            showLoader(false);
            isGalleryLoading = false;
        }

        async function renderPopularGallery() {
            const container = document.getElementById('popularGallery');
            container.innerHTML = `<div class="text-center p-8"><i class="fas fa-spinner fa-spin text-3xl text-indigo-400"></i></div>`;
            const combinedContent = [...allImages, ...allPosts];
            const likesPromises = combinedContent.map(item => db.ref(`likes/${item.id}`).once('value'));
            const likesSnapshots = await Promise.all(likesPromises);
            
            const popularContent = combinedContent
                .map((item, index) => {
                    const likesData = likesSnapshots[index].val() || {};
                    return { ...item, score: Object.keys(likesData).length };
                })
                .sort((a, b) => b.score - a.score);
            
            container.innerHTML = '';
            popularContent.slice(0, 21).forEach(item => {
                const isPost = !!item.authorUid && item.authorUid !== ADMIN_USER_DATA.uid;
                appendToImageGrid(container, [item], isPost);
            });
        }
        
        function renderSimilarImages(currentImage) {
            const section = document.getElementById('similar-section');
            const container = document.getElementById('similar-images-grid');
            container.innerHTML = '';
            const currentTags = new Set(currentImage.tags || []);
            if (currentTags.size === 0) { section.classList.add('hidden'); return; }
            const similarImages = allImages
                .map(img => {
                    if (img.id === currentImage.id) return { ...img, score: -1 };
                    const sharedTagsCount = (img.tags || []).filter(tag => currentTags.has(tag)).length;
                    return { ...img, score: sharedTagsCount };
                })
                .filter(img => img.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, 6);
            if (similarImages.length > 0) {
                section.classList.remove('hidden');
                appendToImageGrid(container, similarImages, false);
            } else {
                section.classList.add('hidden');
            }
        }

        async function showDetailView(id, isPost = false) {
            const detailViewScroller = document.querySelector('#detailView > main');
            if (detailViewScroller) detailViewScroller.scrollTop = 0;

            const item = isPost ? allPosts.find(p => p.id === id) : allImages.find(i => i.id === Number(id));
            if (!item) return;
            
            const imageUrl = isPost ? item.imageUrl : item.url;
            const title = item.title;
            const description = item.description || '';
            const authorUid = item.authorUid;

            if (currentViewer) currentViewer.destroy();
            
            document.getElementById('imageViewer').innerHTML = `<img src="${imageUrl}" alt="${title}" onerror="this.onerror=null;this.parentElement.innerHTML='<p class=\'p-4 text-center text-red-400\'>No se pudo cargar la imagen.</p>';">`;
            document.getElementById('detailTitle').textContent = title;
            document.getElementById('detailDescription').textContent = description;
            
            let authorData;
            if (authorUid === ADMIN_USER_DATA.uid) {
                authorData = ADMIN_USER_DATA;
            } else {
                const userSnapshot = await db.ref(`users/${authorUid}`).once('value');
                authorData = { ...userSnapshot.val(), uid: authorUid };
            }
            document.getElementById('detailAuthorUsername').textContent = authorData.username;
            document.getElementById('detailAuthorAvatar').src = authorData.profile.avatar;
            document.getElementById('detailAuthorInfo').onclick = () => navigateTo('userProfileView', { userId: authorUid });

            const dbId = item.id;
            document.getElementById('detailLikeBtn').dataset.id = dbId;
            document.getElementById('detailFavoriteBtn').dataset.id = dbId;
            document.getElementById('commentForm').dataset.imageId = dbId;
            
            const favRef = db.ref(`favorites/${currentUser.uid}/${dbId}`);
            favRef.on('value', snap => { document.getElementById('detailFavoriteBtn').classList.toggle('favorited', snap.exists()); });
            loadLikesAndViews(dbId);
            loadComments(dbId);
            if(!isPost) renderSimilarImages(item);
            else document.getElementById('similar-section').classList.add('hidden');
            db.ref(`views/${dbId}/${currentUser.uid}`).set(true);
            navigateTo('detailView');
            currentViewer = new Viewer(document.getElementById('imageViewer'), { navbar: false, toolbar: false, button: true, title: false });
        }
        
        // --- LÓGICA DE PERFIL Y DE USUARIOS ---
        async function populateProfileView() {
            document.getElementById('profileAvatar').src = currentUserData.profile.avatar;
            document.getElementById('profileUsername').textContent = currentUserData.username;
            document.getElementById('profileBio').value = currentUserData.profile.bio || '';
            
            const interestsContainer = document.getElementById('profileInterests');
            interestsContainer.innerHTML = '';
            const userInterests = new Set(currentUserData.profile.interests);
            Array.from(allTags).sort().forEach(tag => {
                const tagEl = document.createElement('button');
                tagEl.textContent = tag;
                tagEl.dataset.tag = tag;
                const isSelected = userInterests.has(tag);
                tagEl.className = `px-3 py-1 text-sm rounded-full cursor-pointer transition-colors ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300'}`;
                tagEl.addEventListener('click', () => {
                    const selectedCount = interestsContainer.querySelectorAll('.bg-indigo-600').length;
                    const isCurrentlySelected = tagEl.classList.contains('bg-indigo-600');
                    if (!isCurrentlySelected && selectedCount >= INTEREST_LIMIT) { showToast(`Puedes elegir hasta ${INTEREST_LIMIT} intereses.`); return; }
                    tagEl.classList.toggle('bg-indigo-600');
                    tagEl.classList.toggle('text-white');
                    tagEl.classList.toggle('bg-gray-700');
                    tagEl.classList.toggle('text-gray-300');
                    updateInterestCounter();
                });
                interestsContainer.appendChild(tagEl);
            });
            updateInterestCounter();
            
            const favRef = db.ref(`favorites/${currentUser.uid}`);
            favRef.on('value', (snap) => {
                const favoriteIds = snap.exists() ? Object.keys(snap.val()) : [];
                renderFavorites(favoriteIds);
            });
            
            const postRef = db.ref('posts');
            postRef.on('value', (snap) => {
                loadAllUserPosts().then(() => { renderUserPosts(currentUser.uid, 'userPostsGrid', 'no-posts-message'); });
            });
        }

        async function showUserProfile(userId) {
            if (userId === ADMIN_USER_DATA.uid) { showToast("Este es el perfil del administrador."); return; }
            const userRef = db.ref(`users/${userId}`);
            const snapshot = await userRef.once('value');
            const userData = snapshot.val();
            if (!userData) { showToast('Usuario no encontrado'); return; }
            const profile = userData.profile || {};
            const avatar = profile.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${userData.username}`;
            document.getElementById('userProfileHeaderUsername').textContent = `Perfil de ${userData.username}`;
            document.getElementById('userProfileAvatar').src = avatar;
            document.getElementById('userProfileUsername').textContent = userData.username;
            document.getElementById('userProfileBio').textContent = profile.bio || 'Este usuario aún no ha escrito una biografía.';
            renderUserPosts(userId, 'visitingUserPostsGrid', 'no-visiting-posts-message');
            navigateTo('userProfileView', { userId });
        }

        function renderUserPosts(userId, gridId, messageId) {
            const container = document.getElementById(gridId);
            const message = document.getElementById(messageId);
            container.innerHTML = '';
            const userPosts = allPosts.filter(p => p.authorUid === userId).reverse();
            if(userPosts.length > 0) { message.classList.add('hidden'); appendToImageGrid(container, userPosts, true); } 
            else { message.classList.remove('hidden'); }
        }
        
        async function renderFavorites(favoriteIds) {
            const container = document.getElementById('favoritesGrid');
            const noFavsMessage = document.getElementById('no-favorites-message');
            container.innerHTML = '';
            if(favoriteIds.length === 0) { noFavsMessage.classList.remove('hidden'); return; }
            noFavsMessage.classList.add('hidden');
            const favoriteItems = [ ...allImages.filter(img => favoriteIds.includes(String(img.id))), ...allPosts.filter(post => favoriteIds.includes(post.id)) ];
            favoriteItems.reverse().forEach(item => {
                const isPost = !!item.authorUid && item.authorUid !== ADMIN_USER_DATA.uid;
                appendToImageGrid(container, [item], isPost);
            });
        }
        
        async function updateAvatar(url) {
            currentUserData.profile.avatar = url;
            document.getElementById('profileAvatar').src = url;
            document.getElementById('navProfileAvatar').src = url;
            document.getElementById('commentFormAvatar').src = url;
            await db.ref(`users/${currentUser.uid}/profile/avatar`).set(url);
            document.getElementById('avatarModal').classList.add('hidden');
            showToast("Avatar actualizado");
        }

        // --- EVENT LISTENERS ---
        function setupAuthEventListeners() {
            document.getElementById('showLoginModalBtn').addEventListener('click', () => { document.getElementById('loginModal').classList.remove('hidden'); });
            document.getElementById('showRegisterModalBtn').addEventListener('click', () => { document.getElementById('registerModal').classList.remove('hidden'); });
            document.getElementById('closeLoginModal').addEventListener('click', () => { document.getElementById('loginModal').classList.add('hidden'); });
            document.getElementById('closeRegisterModal').addEventListener('click', () => { document.getElementById('registerModal').classList.add('hidden'); });

            document.getElementById('registerForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('registerUsername').value;
                const email = document.getElementById('registerEmail').value;
                const password = document.getElementById('registerPassword').value;
                const confirmPassword = document.getElementById('registerPasswordConfirm').value;
                if (password !== confirmPassword) { showToast("Las contraseñas no coinciden."); return; }
                try {
                    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                    const user = userCredential.user;
                    await db.ref(`users/${user.uid}`).set({
                        username: username,
                        profile: { avatar: `https://api.dicebear.com/8.x/initials/svg?seed=${username}`, bio: '', interests: [] }
                    });
                    document.getElementById('registerModal').classList.add('hidden');
                } catch (error) { showToast(getFirebaseErrorMessage(error)); }
            });

            document.getElementById('loginForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('loginEmail').value;
                const password = document.getElementById('loginPassword').value;
                try { 
                    await auth.signInWithEmailAndPassword(email, password);
                    document.getElementById('loginModal').classList.add('hidden');
                } catch (error) { showToast(getFirebaseErrorMessage(error)); }
            });
        }
        
        function setupAppEventListeners() {
            if(document.body.dataset.appListenersAttached === 'true') return;

            document.getElementById('logoutBtn').addEventListener('click', async () => { await auth.signOut(); });
            document.querySelectorAll('.nav-btn').forEach(btn => { if(btn.dataset.view) btn.addEventListener('click', () => navigateTo(btn.dataset.view)); });
            document.getElementById('createPostBtn').addEventListener('click', () => { document.getElementById('createPostModal').classList.remove('hidden'); });
            document.getElementById('closeCreatePostModal').addEventListener('click', () => { document.getElementById('createPostModal').classList.add('hidden'); });
            document.getElementById('createPostForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const imageUrl = document.getElementById('postImageUrl').value.trim();
                const title = document.getElementById('postTitle').value.trim();
                if(!imageUrl || !title) { showToast("Debes completar todos los campos."); return; }
                const newPostRef = db.ref('posts').push();
                await newPostRef.set({ id: newPostRef.key, imageUrl, title, authorUid: currentUser.uid, timestamp: firebase.database.ServerValue.TIMESTAMP });
                document.getElementById('createPostForm').reset();
                document.getElementById('createPostModal').classList.add('hidden');
                showToast("Publicación creada con éxito");
                await loadAllUserPosts();
                navigateTo('profileView');
                document.getElementById('tab-posts').click();
            });
            document.getElementById('detailBackBtn').addEventListener('click', () => {
                const view = document.getElementById('detailView');
                view.classList.remove('active');
                setTimeout(() => navigateTo(lastView || 'galleryView'), 300);
            });
            document.getElementById('userProfileBackBtn').addEventListener('click', () => {
                const view = document.getElementById('userProfileView');
                view.classList.remove('active');
                setTimeout(() => navigateTo(lastView || 'galleryView'), 300);
            });
            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && !isGalleryLoading) { renderPersonalizedGallery(false); }
            }, { threshold: 0.5 });
            if(document.getElementById('sentinel')) { observer.observe(document.getElementById('sentinel')); }
            
            document.getElementById('saveProfileBtn').addEventListener('click', async () => {
                const bio = document.getElementById('profileBio').value;
                const interests = Array.from(document.querySelectorAll('#profileInterests .bg-indigo-600')).map(el => el.dataset.tag);
                await db.ref(`users/${currentUser.uid}/profile`).update({ bio, interests });
                await loadUserData();
                showToast('Perfil guardado');
                sortPersonalizedFeed();
                renderPersonalizedGallery(true);
                renderFeaturedCarousel();
            });

            document.getElementById('interestSearchInput').addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                document.querySelectorAll('#profileInterests button').forEach(btn => {
                    btn.style.display = btn.textContent.toLowerCase().includes(query) ? '' : 'none';
                });
            });

            const tabs = document.querySelectorAll('.profile-tab');
            const tabContents = document.querySelectorAll('.profile-tab-content');
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    tabs.forEach(item => item.classList.remove('tab-active'));
                    tab.classList.add('tab-active');
                    const targetId = tab.id.replace('tab-', 'content-');
                    tabContents.forEach(content => { content.classList.toggle('hidden', content.id !== targetId); });
                });
            });

            document.getElementById('detailFavoriteBtn').addEventListener('click', function() {
                const id = this.dataset.id;
                const ref = db.ref(`favorites/${currentUser.uid}/${id}`);
                this.classList.toggle('favorited');
                ref.once('value', snap => { ref.set(snap.exists() ? null : true); });
            });
            
            document.getElementById('changeAvatarBtn').addEventListener('click', () => {
                const modal = document.getElementById('avatarModal');
                const selection = document.getElementById('avatarSelection');
                selection.innerHTML = '';
                for (let i = 0; i < 16; i++) {
                    const seed = Math.random().toString(36).substring(7);
                    const avatarUrl = `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${seed}`;
                    const img = document.createElement('img');
                    img.src = avatarUrl;
                    img.className = 'w-16 h-16 rounded-full cursor-pointer hover:ring-2 ring-indigo-500 object-cover';
                    img.onclick = () => updateAvatar(avatarUrl);
                    selection.appendChild(img);
                }
                modal.classList.remove('hidden');
            });
            document.getElementById('avatarUrlForm').addEventListener('submit', (e) => {
                e.preventDefault();
                const input = document.getElementById('avatarUrlInput');
                const url = input.value.trim();
                const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
                if (url && validExtensions.some(ext => url.toLowerCase().endsWith(ext))) {
                    updateAvatar(url);
                    input.value = '';
                } else {
                    showToast('Por favor, introduce una URL de imagen válida.');
                }
            });
            document.getElementById('closeAvatarModal').addEventListener('click', () => document.getElementById('avatarModal').classList.add('hidden'));

            document.body.dataset.appListenersAttached = 'true';
        }
        
        // --- FUNCIONES AUXILIARES ---
        // (El resto de funciones auxiliares que ya tenías)
        function getFirebaseErrorMessage(error) {
            switch (error.code) {
                case 'auth/invalid-email': return 'El formato del correo electrónico no es válido.';
                case 'auth/user-not-found': case 'auth/wrong-password': return 'Correo o contraseña incorrectos.';
                case 'auth/email-already-in-use': return 'Este correo electrónico ya está registrado.';
                case 'auth/weak-password': return 'La contraseña debe tener al menos 6 caracteres.';
                default: return 'Ha ocurrido un error. Inténtalo de nuevo.';
            }
        }
        function showToast(message) {
            const toast = document.getElementById('toast');
            const toastMessage = document.getElementById('toastMessage');
            toastMessage.textContent = message;
            if (toastTimeout) clearTimeout(toastTimeout);
            toast.classList.add('show');
            toastTimeout = setTimeout(() => { toast.classList.remove('show'); }, 3000);
        }
        function cancelReply() {
            const commentForm = document.getElementById('commentForm');
            const replyingToBanner = document.getElementById('replyingToBanner');
            const commentText = document.getElementById('commentText');

            delete commentForm.dataset.replyToCommentId;
            delete commentForm.dataset.replyToUsername;
            delete commentForm.dataset.replyToAuthorId;

            replyingToBanner.classList.add('hidden');
            commentText.placeholder = 'Escribe un comentario...';
        }
        function updateInterestCounter() {
            const count = document.querySelectorAll('#profileInterests .bg-indigo-600').length;
            const counterEl = document.getElementById('interestCounter');
            counterEl.textContent = `${count}/${INTEREST_LIMIT}`;
            counterEl.classList.toggle('text-red-500', count >= INTEREST_LIMIT);
        }
        async function loadLikesAndViews(id) {
            const likeBtn = document.getElementById('detailLikeBtn');
            const likeCountEl = document.getElementById('detailLikeCount');
            const viewCountEl = document.getElementById('detailViewCount');
            db.ref(`likes/${id}`).on('value', snap => {
                const data = snap.val() || {};
                likeCountEl.textContent = `${Object.keys(data).length} Me gusta`;
                likeBtn.classList.toggle('liked', currentUser && data[currentUser.uid] === true);
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
                        const repliesList = document.createElement('ul');
                        repliesList.className = 'pl-6 mt-3 space-y-3';
                        Object.entries(comment.replies).sort((a,b) => a[1].timestamp - b[1].timestamp).forEach(([replyId, reply]) => {
                            const replyLi = createCommentElement(replyId, reply, imageId, true, comment.username);
                            repliesList.appendChild(replyLi);
                        });
                        li.querySelector('.comment-content').appendChild(repliesList);
                    }
                    commentsList.prepend(li);
                });
            });
        }
        function createCommentElement(id, data, imageId, isReply = false, replyingTo = '') {
            const li = document.createElement('li');
            li.className = 'comment-item';
            li.dataset.commentId = id;
            li.dataset.authorId = data.authorUid; 
            li.dataset.authorName = data.username;
            const avatar = data.userAvatar || `https://api.dicebear.com/8.x/initials/svg?seed=${data.username}`;
            li.innerHTML = `
                <img src="${avatar}" class="w-8 h-8 rounded-full flex-shrink-0 object-cover cursor-pointer" data-userid="${data.authorUid}">
                <div class="comment-content">
                    <div class="bg-gray-800/50 rounded-lg p-2">
                        <span class="font-bold text-sm text-white cursor-pointer hover:underline" data-userid="${data.authorUid}">${data.username}</span>
                        ${replyingTo ? `<span class="text-sm text-indigo-400"> en respuesta a ${replyingTo}</span>` : ''}
                        <p class="text-gray-300 mt-1">${data.text}</p>
                    </div>
                    <div class="text-xs text-gray-500 mt-1 pl-2">
                        <button class="hover:underline reply-btn">Responder</button>
                    </div>
                </div>
            `;
            li.querySelector('.reply-btn').addEventListener('click', (e) => initiateReply(e.currentTarget.closest('li')));
            li.querySelectorAll('[data-userid]').forEach(el => {
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showUserProfile(el.dataset.userid);
                });
            });
            return li;
        }
    });
})();

