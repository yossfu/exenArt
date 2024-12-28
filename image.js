// Función para cargar imágenes desde imagen.txt
function loadImages() {
    fetch('imagen.txt')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            return response.text();
        })
        .then(data => {
            const lines = data.split('\n');
            const gallery = document.getElementById('gallery');

            // Almacenar todas las imágenes para filtrarlas más tarde
            const allImages = [];

            lines.forEach(line => {
                const [id, imgUrl, description, ...tags] = line.split(',');
                const thumbnail = document.createElement('div');
                thumbnail.className = 'thumbnail';
                thumbnail.innerHTML = `<a href="image.html?id=${id}"><img src="${imgUrl}" alt="${description}"></a>`;
                gallery.appendChild(thumbnail);

                // Guardar la información de la imagen
                allImages.push({ id, imgUrl, description, tags, element: thumbnail });
            });

            // Agregar evento al campo de búsqueda
            document.getElementById('search').addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase();
                filterImages(allImages, searchTerm);
            });
        })
        .catch(err => {
            console.error(`Fetch problem: ${err.message}`);
        });
}

// Función para filtrar imágenes según el término de búsqueda
function filterImages(allImages, searchTerm) {
    const gallery = document.getElementById('gallery');
    gallery.innerHTML = ''; // Limpiar la galería

    allImages.forEach(image => {
        // Verificar si el término de búsqueda está en los tags
        if (image.tags.some(tag => tag.toLowerCase().includes(searchTerm))) {
            gallery.appendChild(image.element); // Mostrar la imagen si coincide
        }
    });
}

// Llama a la función al cargar la página
document.addEventListener('DOMContentLoaded', loadImages);
