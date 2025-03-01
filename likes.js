// Cargar scripts de Firebase secuencialmente
const firebaseAppScript = document.createElement('script');
firebaseAppScript.src = 'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js';
document.head.appendChild(firebaseAppScript);

firebaseAppScript.onload = () => {
    const firebaseDbScript = document.createElement('script');
    firebaseDbScript.src = 'https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js';
    document.head.appendChild(firebaseDbScript);

    firebaseDbScript.onload = () => {
        // Configuración de Firebase
        const firebaseConfig = {
            apiKey: "AIzaSyAtQKVStrkYWtda1RT_cjzqdoNN3wTTUdU",
            authDomain: "exengallerylikes.firebaseapp.com",
            databaseURL: "https://exengallerylikes-default-rtdb.firebaseio.com",
            projectId: "exengallerylikes",
            storageBucket: "exengallerylikes.firebasestorage.app",
            messagingSenderId: "865334459581",
            appId: "1:865334459581:web:5a770f57f12ef6a7aa4bd4"
        };

        // Inicializar Firebase
        firebase.initializeApp(firebaseConfig);
        const db = firebase.database();

        // Conectar con la página después de inicializar Firebase
        document.addEventListener('DOMContentLoaded', () => {
            const imageGrid = document.getElementById('image-grid');

            if (!imageGrid) {
                console.error('Elemento imageGrid no encontrado');
                return;
            }

            function addLikeFunctionality() {
                const imageItems = imageGrid.querySelectorAll('.flex-item');
                if (imageItems.length === 0) {
                    console.log('No se encontraron elementos .flex-item');
                    return;
                }

                imageItems.forEach(item => {
                    const link = item.querySelector('a');
                    if (!link) {
                        console.warn('Elemento <a> no encontrado en .flex-item', item);
                        return;
                    }
                    const photoId = link.getAttribute('href')?.split('id=')[1];
                    if (!photoId) {
                        console.warn('ID no encontrado en href', link.getAttribute('href'));
                        return;
                    }

                    if (!item.querySelector('.like-container')) {
                        const likeContainer = document.createElement('div');
                        likeContainer.className = 'like-container';
                        likeContainer.innerHTML = `
                            <button class="like-button" data-id="${photoId}">❤️</button>
                            <span class="like-count" data-id="${photoId}">0</span>
                        `;
                        item.appendChild(likeContainer);

                        // Cargar likes desde Firebase
                        const likeRef = db.ref(`likes/${photoId}`);
                        likeRef.on('value', (snapshot) => {
                            const likes = snapshot.val() || 0;
                            const likeCount = item.querySelector(`.like-count[data-id="${photoId}"]`);
                            if (likeCount) likeCount.textContent = likes;
                            else console.error('like-count no encontrado para photoId:', photoId);
                        });

                        // Añadir evento de clic
                        const likeButton = item.querySelector('.like-button');
                        if (likeButton) {
                            likeButton.addEventListener('click', () => {
                                const likeRef = db.ref(`likes/${photoId}`);
                                likeRef.transaction((currentLikes) => {
                                    return (currentLikes || 0) + 1;
                                });
                            });
                        } else {
                            console.error('like-button no encontrado para photoId:', photoId);
                        }
                    }
                });
                console.log('Likes añadidos a', imageItems.length, 'elementos');
            }

            // Observar cambios en el imageGrid para actualizar likes
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.addedNodes.length || mutation.type === 'childList') {
                        console.log('Detectado cambio en imageGrid');
                        addLikeFunctionality();
                    }
                });
            });

            observer.observe(imageGrid, { childList: true, subtree: true });

            // Inicializar al cargar y como respaldo
            addLikeFunctionality();
            setTimeout(addLikeFunctionality, 1000); // Reintento después de 1 segundo
            document.addEventListener('imagesRendered', addLikeFunctionality); // Escuchar evento de script.js
        });
    };
};

// Estilos para los likes
document.head.insertAdjacentHTML('beforeend', `
    <style>
        .like-container { display: flex; align-items: center; justify-content: center; gap: 5px; margin-top: 5px; }
        .like-button { background: none; border: none; cursor: pointer; font-size: 1rem; padding: 0; }
        .like-count { font-size: 0.85rem; color: #d32f2f; }
        .dark-theme .like-count { color: #ef5350; }
    </style>
`);