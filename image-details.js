function displaySimilarImages(images) {
    const similarImagesContainer = document.getElementById('similar-images');
    
    // Limitar a las primeras seis imágenes similares
    images.slice(0, 6).forEach(imageData => {
        const [id, imgUrl] = imageData; // Solo necesitamos ID y URL para las imágenes similares
        const redirectUrl = imageData[6]; // La nueva URL de redirección es el séptimo elemento

        const imageItem = document.createElement('div');
        imageItem.className = 'similar-image-item';
        imageItem.innerHTML = `
            <a href="${redirectUrl}"> <!-- Usa la nueva URL aquí -->
                <img src="${imgUrl}" alt="Imagen Similar ${id}">
            </a>
        `;
        similarImagesContainer.appendChild(imageItem);
    });
}
