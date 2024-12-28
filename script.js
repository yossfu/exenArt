// Función para cargar alertas
function loadAlerts() {
     fetch('alerta.txt')
         .then(response => {
             if (!response.ok) {
                 throw new Error(`HTTP error : ${response.status}`);
             }
             return response.text();
         })
         .then(data => {
             const alertContainer = document.getElementById('alert-container');
             if (data.trim() === 'onn') { // Verifica si el texto es "onn"
                 // Crea una alerta
                 const alert = document.createElement('div');
                 alert.className = 'alert';
                 alert.textContent = '¡Esta es una alerta!'; // Puedes personalizar el texto
                 alertContainer.appendChild(alert);

                 // Oculta la alerta después de 5 segundos
                 setTimeout(() => {
                     alertContainer.removeChild(alert);
                 }, 5000);
             }
         })
         .catch(err => {
             console.error(`Fetch problem : ${err.message}`);
         });
}

// Llama a la función al cargar la página
document.addEventListener('DOMContentLoaded', loadAlerts);

// Resto del script.js...
fetch('imagen.txt')
.then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error : ${response.status}`);
        }
        return response.text();
})
.then(data => {
        const lines = data.split('\n');
        const gallery = document.getElementById('gallery');
        const searchInput = document.getElementById('search');
        const tagButtonsContainer = document.getElementById('tag-buttons');
        const loader = document.getElementById('loader');

        const images = lines.map(line => {
            const [imgUrl, redirectUrl, ...tags] = line.split(',');
            return { imgUrl, redirectUrl, tags };
        });

        // Obtener todas las etiquetas únicas
        const allTags = new Set();
        images.forEach(image => {
            image.tags.forEach(tag => allTags.add(tag));
        });

        // Convertir el Set a un Array y seleccionar hasta 5 etiquetas aleatorias
        const uniqueTagsArray = Array.from(allTags);
        const limitedTags = uniqueTagsArray.sort(() => Math.random() - Math.random()).slice(0, 5); // Aleatorio y limitado a 5

        // Crear botones para cada etiqueta limitada
        limitedTags.forEach(tag => {
            const button = document.createElement('button');
            button.textContent = tag;
            button.className = 'tag-button';
            button.onclick = () => filterByTag(tag);
            tagButtonsContainer.appendChild(button);
        });

        // Botón "Todas"
        const allButton = document.createElement('button');
        allButton.textContent = 'Todas';
        allButton.className = 'tag-button';
        allButton.onclick = () => displayImages(images);
        tagButtonsContainer.appendChild(allButton);

        // Mostrar todas las imágenes inicialmente
        displayImages(images);

        function displayImages(filteredImages) {
            gallery.innerHTML = '';
            filteredImages.forEach(({ imgUrl, redirectUrl }) => {
                const thumbnail = document.createElement('div');
                thumbnail.className = 'thumbnail';
                thumbnail.innerHTML = `<a href="${redirectUrl}"><img class="lazyload" data-src="${imgUrl}" alt="Imagen"></a>`;
                gallery.appendChild(thumbnail);
            });
            loader.style.display = 'none'; // Ocultar loader después de mostrar imágenes
        }

        function filterByTag(tag) {
            loader.style.display = 'flex'; // Mostrar loader al filtrar
            const filteredImages = images.filter(image =>
                image.tags.includes(tag)
            );
            displayImages(filteredImages);
        }

        searchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') { // Mostrar loader al presionar Enter
                loader.style.display = 'flex'; // Mostrar loader
                
                // Agregar clase de animación
                gallery.classList.add('animate-search');

                setTimeout(() => {
                    gallery.classList.remove('animate-search'); // Remover clase después de la animación
                }, 500); // Duración de la animación en milisegundos

                const searchTerm = searchInput.value.toLowerCase().trim();
                
                if (searchTerm === '') { // Si no hay búsqueda, mostrar todas las imágenes
                    displayImages(images);
                } else { // Filtrar por término de búsqueda
                    const filteredImages = images.filter(image =>
                        image.tags.some(tag => tag.toLowerCase().includes(searchTerm))
                    );
                    displayImages(filteredImages);
                }
            }
        });

})
.catch(err => {
     console.error(`Fetch problem : ${err.message}`);
});
// Función para cargar alertas
function loadAlerts() {
    fetch('alerta.txt')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            return response.text();
        })
        .then(data => {
            const lines = data.split('\n');
            const status = lines[0].trim(); // Primer línea: estado (onn/off)
            const alertMessage = lines[1] ? lines[1].trim() : ''; // Segunda línea: mensaje de alerta

            const alertContainer = document.getElementById('alert-container');
            if (status === 'onn') { // Verifica si el texto es "onn"
                // Crea una alerta
                const alert = document.createElement('div');
                alert.className = 'alert';
                alert.textContent = alertMessage; // Usa el mensaje del archivo
                alertContainer.appendChild(alert);

                // Oculta la alerta después de 5 segundos
                setTimeout(() => {
                    alertContainer.removeChild(alert);
                }, 5000);
            }
        })
        .catch(err => {
            console.error(`Fetch problem: ${err.message}`);
        });
}

// Llama a la función al cargar la página
document.addEventListener('DOMContentLoaded', loadAlerts);
// Función para obtener parámetros de la URL
function getParameterByName(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Función para cargar los detalles de la imagen
function loadImageDetails() {
    const imageId = getParameterByName('id'); // Obtiene el ID de la imagen desde la URL

    fetch('imagen.txt')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            return response.text();
        })
        .then(data => {
            const lines = data.split('\n');
            for (const line of lines) {
                const [id, imgUrl, description] = line.split(',');
                if (id === imageId) { // Verifica si el ID coincide
                    // Cargar datos en la página
                    document.getElementById('main-image').src = imgUrl;
                    document.getElementById('main-image').alt = "Imagen Principal";
                    document.getElementById('image-title').textContent = "Título de la Imagen"; // Puedes personalizar esto
                    document.getElementById('image-description').textContent = description;

                    // Cargar imágenes similares
                    loadSimilarImages(line.split(',').slice(3)); // Pasa los tags a loadSimilarImages
                    break; // Salir del bucle una vez que se encuentra el ID
                }
            }
        })
        .catch(err => {
            console.error(`Fetch problem: ${err.message}`);
        });
}

// Función para cargar imágenes similares basadas en tags
function loadSimilarImages(tags) {
    fetch('imagen.txt')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            return response.text();
        })
        .then(data => {
            const lines = data.split('\n');
            const similarImagesContainer = document.getElementById('similar-images');
            
            lines.forEach(line => {
                const [id, imgUrl, redirectUrl, ...imageTags] = line.split(',');
                if (tags.some(tag => imageTags.includes(tag))) { // Si tiene algún tag similar
                    const thumbnail = document.createElement('div');
                    thumbnail.className = 'thumbnail';
                    thumbnail.innerHTML = `<a href="${redirectUrl}"><img class="lazyload" data-src="${imgUrl}" alt="Imagen Similar"></a>`;
                    similarImagesContainer.appendChild(thumbnail);
                }
            });
        })
        .catch(err => {
            console.error(`Fetch problem: ${err.message}`);
        });
}

// Llama a la función al cargar la página
document.addEventListener('DOMContentLoaded', loadImageDetails);
