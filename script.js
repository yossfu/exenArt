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
        let allTags = new Set();
        let loadedImagesCount = 0;
        const itemsPerLoad = 12;
        let deviceId = localStorage.getItem('deviceId');
        let username = localStorage.getItem('username');
        let currentUserData = {};
        let currentViewer = null;
        let lastView = 'galleryView'; 

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

        // --- CARGA DE DATOS ---
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
                // Asegurar que hay un autor, aunque sea de sistema.
                // Esto es crucial para evitar errores si el JSON no tiene 'authorDeviceId'.
                img.authorDeviceId = img.authorDeviceId || 'system_user_placeholder'; 
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

            // Actualizar estado visual de la barra de navegación
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

            // Cargar contenido específico de la vista
            if (viewId === 'popularView') renderPopularGallery();
            if (viewId === 'profileView') populateProfileView();
            if (viewId === 'userProfileView' && data) showUserProfile(data);
            
            // Animar vistas que se deslizan
            if (['detailView', 'userProfileView'].includes(viewId)) {
                requestAnimationFrame(() => targetView.classList.add('active'));
            } else {
                document.getElementById('detailView').classList.remove('active');
                document.getElementById('userProfileView').classList.remove('active');
            }
        }

        // --- RENDERIZADO DE GALERÍAS ---
        function renderImageGrid(container, imagesToRender) {
             container.innerHTML = '';
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
        
        async function renderPersonalizedGallery(reset = false) {
            const galleryContainer = document.getElementById('gallery');
            if (reset) {
                galleryContainer.innerHTML = '';
                loadedImagesCount = 0;
            }
            const userInterests = new Set(currentUserData.profile.interests);
            const sortedImages = [...allImages].sort((a, b) => {
                const scoreA = a.tags.reduce((s, tag) => s + (userInterests.has(tag) ? 5 : 0), 0) + (Math.random() * 0.1); // Puntuación alta por interés + aleatoriedad
                const scoreB = b.tags.reduce((s, tag) => s + (userInterests.has(tag) ? 5 : 0), 0) + (Math.random() * 0.1);
                return scoreB - scoreA;
            });
            const nextImages = sortedImages.slice(loadedImagesCount, loadedImagesCount + itemsPerLoad);
            renderImageGrid(galleryContainer, galleryContainer.innerHTML === '' ? nextImages : [...document.querySelectorAll('#gallery .portrait-aspect'), ...nextImages]);
            loadedImagesCount += nextImages.length;
        }

        async function renderPopularGallery() {
            const container = document.getElementById('popularGallery');
            container.innerHTML = `<div class="text-center p-8"><i class="fas fa-spinner fa-spin text-3xl text-indigo-400"></i></div>`;
            const likesSnapshot = await db.ref('likes').once('value');
            const likesData = likesSnapshot.val() || {};
            const popularImages = allImages
                .map(img => ({ ...img, score: Object.keys(likesData[img.id] || {}).length }))
                .sort((a, b) => b.score - a.score);
            renderImageGrid(container, popularImages.slice(0, 21));
        }

        // --- VISTAS ESPECÍFICAS (Detalle, Perfiles) ---
        async function showDetailView(imageId) {
            const img = allImages.find(i => i.id === Number(imageId));
            if (!img) return;

            if (currentViewer) currentViewer.destroy();
            
            document.getElementById('imageViewer').innerHTML = `<img src="${img.url}" alt="${img.title}">`;
            document.getElementById('detailTitle').textContent = img.title;
            document.getElementById('detailDescription').textContent = img.description;
            
            const authorRef = db.ref(`users/${img.authorDeviceId}`);
            const authorSnap = await authorRef.once('value');
            const authorData = authorSnap.val() || { username: 'Anónimo', profile: { avatar: `https://api.dicebear.com/8.x/initials/svg?seed=Anónimo` }};
            document.getElementById('detailAuthorUsername').textContent = authorData.username;
            document.getElementById('detailAuthorAvatar').src = authorData.profile ? authorData.profile.avatar : `https://api.dicebear.com/8.x/initials/svg?seed=Anónimo`;
            const authorInfoBtn = document.getElementById('detailAuthorInfo');
            authorInfoBtn.onclick = () => navigateTo('userProfileView', { userId: img.authorDeviceId });
            
            document.getElementById('detailLikeBtn').dataset.id = imageId;
            document.getElementById('commentForm').dataset.imageId = imageId;
            
            loadLikesAndViews(imageId);
            loadComments(imageId);
            db.ref(`views/${imageId}/${deviceId}`).set(true);
            
            navigateTo('detailView');
            currentViewer = new Viewer(document.getElementById('imageViewer'), { navbar: false, toolbar: false, button: true, title: false });
        }

        async function showUserProfile({ userId }) {
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

        // --- FUNCIONES DE CARGA ASÍNCRONA (Likes, Comentarios) ---
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
                if (snapshot.exists()) {
                    snapshot.forEach(childSnapshot => {
                        const comment = childSnapshot.val();
                        const li = document.createElement('li');
                        li.className = "flex space-x-3";
                        const commentAuthorAvatar = comment.userAvatar || `https://api.dicebear.com/8.x/initials/svg?seed=${comment.username}`;
                        li.innerHTML = `
                            <img src="${commentAuthorAvatar}" class="w-8 h-8 rounded-full flex-shrink-0 object-cover cursor-pointer" data-userid="${comment.deviceId}">
                            <div class="flex-1">
                                <div class="bg-gray-800 rounded-lg p-2">
                                    <span class="font-bold text-sm text-white cursor-pointer hover:underline" data-userid="${comment.deviceId}">${comment.username}</span>
                                    <p class="text-gray-300">${comment.text}</p>
                                </div>
                            </div>
                        `;
                        commentsList.prepend(li);
                    });
                     
                    commentsList.querySelectorAll('[data-userid]').forEach(el => {
                        el.addEventListener('click', (e) => {
                            e.stopPropagation();
                            navigateTo('userProfileView', { userId: el.dataset.userid });
                        });
                    });
                } else {
                    commentsList.innerHTML = `<p class="text-gray-500 text-center text-sm">Sé el primero en comentar.</p>`;
                }
            });
        }
        
        // --- LÓGICA DE TU PROPIO PERFIL ---
        function populateProfileView() {
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
                    if (!isCurrentlySelected && selectedCount >= INTEREST_LIMIT) {
                        return; 
                    }
                    tagEl.classList.toggle('bg-indigo-600');
                    tagEl.classList.toggle('text-white');
                    tagEl.classList.toggle('bg-gray-700');
                    tagEl.classList.toggle('text-gray-300');
                    updateInterestCounter();
                });
                interestsContainer.appendChild(tagEl);
            });
            updateInterestCounter();
        }
        
        function updateInterestCounter() {
            const count = document.querySelectorAll('#profileInterests .bg-indigo-600').length;
            const counterEl = document.getElementById('interestCounter');
            counterEl.textContent = `${count}/${INTEREST_LIMIT}`;
            counterEl.classList.toggle('text-red-500', count >= INTEREST_LIMIT);
        }

        // --- MANEJO DE EVENTOS ---
        function setupAllEventListeners() {
            document.querySelectorAll('.nav-btn').forEach(btn => {
                if(btn.dataset.view) btn.addEventListener('click', () => navigateTo(btn.dataset.view));
            });
            document.getElementById('detailBackBtn').addEventListener('click', () => navigateTo(lastView || 'galleryView'));
            document.getElementById('userProfileBackBtn').addEventListener('click', () => navigateTo(lastView || 'galleryView'));

            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && loadedImagesCount < allImages.length) {
                    renderPersonalizedGallery(false);
                }
            }, { rootMargin: '300px' });
            observer.observe(document.getElementById('sentinel'));

            document.getElementById('saveProfileBtn').addEventListener('click', async () => {
                const bio = document.getElementById('profileBio').value;
                const interests = Array.from(document.querySelectorAll('#profileInterests .bg-indigo-600')).map(el => el.dataset.tag);
                currentUserData.profile.bio = bio;
                currentUserData.profile.interests = interests;
                await db.ref(`users/${deviceId}/profile`).update({ bio, interests });
                alert('Perfil guardado');
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

            document.getElementById('detailLikeBtn').addEventListener('click', function() {
                const id = this.dataset.id;
                const ref = db.ref(`likes/${id}/${deviceId}`);
                ref.once('value', snap => ref.set(snap.exists() ? null : true));
            });

            document.getElementById('commentForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                const imageId = this.dataset.imageId;
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
        }

        masterInit();
    });
})();

