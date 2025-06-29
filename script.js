(async function () {
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

        // --- SISTEMA DE AUTENTICACIÓN Y FLUJO PRINCIPAL ---
        
        // Se configuran los listeners de los modales de autenticación desde el inicio.
        setupAuthEventListeners();

        auth.onAuthStateChanged(async (user) => {
            const authOverlay = document.getElementById('authOverlay');
            const appContent = document.getElementById('appContent');

            if (user) {
                currentUser = user;
                authOverlay.classList.add('hidden');
                appContent.classList.remove('hidden');
                
                // Solo inicializar si es la primera vez o no hay datos cargados
                if (Object.keys(currentUserData).length === 0) {
                   await initializeApp();
                }
            } else {
                currentUser = null;
                currentUserData = {};
                authOverlay.classList.remove('hidden');
                appContent.classList.add('hidden');
                // Asegurarse de que los modales también se oculten al cerrar sesión
                document.getElementById('loginModal').classList.add('hidden');
                document.getElementById('registerModal').classList.add('hidden');
            }
        });

        async function initializeApp() {
            showLoader(true);
            try {
                await Promise.all([loadAllImagesAndTags(), loadAllUserPosts()]);
                await loadUserData();
                renderFeaturedCarousel();
                sortPersonalizedFeed();
                await renderPersonalizedGallery(true);
                setupAppEventListeners();
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
                    img.tags.forEach(tag => allTags.add(tag));
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
                const scoreA = a.tags.reduce((s, tag) => s + (userInterests.has(tag) ? 5 : 0), 0) + Math.random();
                const scoreB = b.tags.reduce((s, tag) => s + (userInterests.has(tag) ? 5 : 0), 0) + Math.random();
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
                    const score = img.tags.reduce((currentScore, tag) => {
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
                autoplay: {
                    delay: 4000,
                    disableOnInteraction: false,
                },
                pagination: {
                    el: '.swiper-pagination',
                    clickable: true,
                },
                navigation: {
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
                },
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
            // ... (código sin cambios)
        }
        
        async function renderPopularGallery() {
            // ... (código sin cambios)
        }
        
        function renderSimilarImages(currentImage) {
            // ... (código sin cambios)
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
            favRef.once('value', snap => {
                document.getElementById('detailFavoriteBtn').classList.toggle('favorited', snap.exists());
            });

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
            // ... (código sin cambios)
        }

        async function showUserProfile(userId) {
            // ... (código sin cambios)
        }

        function renderUserPosts(userId, gridId, messageId) {
            // ... (código sin cambios)
        }
        
        async function renderFavorites(favoriteIds) {
            // ... (código sin cambios)
        }

        // --- EVENT LISTENERS ---

        function setupAuthEventListeners() {
            console.log("Setting up authentication listeners..."); // Log para depurar

            document.getElementById('showLoginModalBtn').addEventListener('click', () => {
                document.getElementById('loginModal').classList.remove('hidden');
            });
            document.getElementById('showRegisterModalBtn').addEventListener('click', () => {
                document.getElementById('registerModal').classList.remove('hidden');
            });

            document.getElementById('closeLoginModal').addEventListener('click', () => {
                document.getElementById('loginModal').classList.add('hidden');
            });
            document.getElementById('closeRegisterModal').addEventListener('click', () => {
                document.getElementById('registerModal').classList.add('hidden');
            });

            document.getElementById('registerForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('registerUsername').value;
                const email = document.getElementById('registerEmail').value;
                const password = document.getElementById('registerPassword').value;
                const confirmPassword = document.getElementById('registerPasswordConfirm').value;

                if (password !== confirmPassword) {
                    showToast("Las contraseñas no coinciden.");
                    return;
                }

                try {
                    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                    const user = userCredential.user;
                    await db.ref(`users/${user.uid}`).set({
                        username: username,
                        profile: {
                            avatar: `https://api.dicebear.com/8.x/initials/svg?seed=${username}`,
                            bio: '',
                            interests: []
                        }
                    });
                } catch (error) {
                    showToast(getFirebaseErrorMessage(error));
                }
            });

            document.getElementById('loginForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('loginEmail').value;
                const password = document.getElementById('loginPassword').value;
                try {
                    await auth.signInWithEmailAndPassword(email, password);
                } catch (error) {
                    showToast(getFirebaseErrorMessage(error));
                }
            });
        }
        
        function setupAppEventListeners() {
            document.getElementById('logoutBtn').addEventListener('click', async () => {
                await auth.signOut();
            });
            
            document.querySelectorAll('.nav-btn').forEach(btn => {
                if(btn.dataset.view) btn.addEventListener('click', () => navigateTo(btn.dataset.view));
            });

            document.getElementById('createPostBtn').addEventListener('click', () => {
                 document.getElementById('createPostModal').classList.remove('hidden');
            });
            document.getElementById('closeCreatePostModal').addEventListener('click', () => {
                 document.getElementById('createPostModal').classList.add('hidden');
            });
            document.getElementById('createPostForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const imageUrl = document.getElementById('postImageUrl').value.trim();
                const title = document.getElementById('postTitle').value.trim();
                
                if(!imageUrl || !title) {
                    showToast("Debes completar todos los campos.");
                    return;
                }

                const newPostRef = db.ref('posts').push();
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
                if (entries[0].isIntersecting && !isGalleryLoading) {
                    renderPersonalizedGallery(false);
                }
            }, { threshold: 0.5 });
            if(document.getElementById('sentinel')) {
                observer.observe(document.getElementById('sentinel'));
            }
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
            const tabs = document.querySelectorAll('.profile-tab');
            const tabContents = document.querySelectorAll('.profile-tab-content');
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    tabs.forEach(item => item.classList.remove('tab-active'));
                    tab.classList.add('tab-active');
                    const targetId = tab.id.replace('tab-', 'content-');
                    tabContents.forEach(content => {
                        content.classList.toggle('hidden', content.id !== targetId);
                    });
                });
            });
            document.getElementById('detailFavoriteBtn').addEventListener('click', function() {
                const id = this.dataset.id;
                const ref = db.ref(`favorites/${currentUser.uid}/${id}`);
                this.classList.toggle('favorited');
                ref.once('value', snap => {
                    ref.set(snap.exists() ? null : true);
                });
            });
            // ... (resto de listeners...)
        }
        
        // --- FUNCIONES AUXILIARES ---
        function getFirebaseErrorMessage(error) {
            switch (error.code) {
                case 'auth/invalid-email':
                    return 'El formato del correo electrónico no es válido.';
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    return 'Correo o contraseña incorrectos.';
                case 'auth/email-already-in-use':
                    return 'Este correo electrónico ya está registrado.';
                case 'auth/weak-password':
                    return 'La contraseña debe tener al menos 6 caracteres.';
                default:
                    return 'Ha ocurrido un error. Inténtalo de nuevo.';
            }
        }
        function showToast(message) {
            const toast = document.getElementById('toast');
            const toastMessage = document.getElementById('toastMessage');
            toastMessage.textContent = message;
            if (toastTimeout) clearTimeout(toastTimeout);
            toast.classList.add('show');
            toastTimeout = setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }
        // ... (resto de funciones auxiliares que ya tenías)
    });
})();

