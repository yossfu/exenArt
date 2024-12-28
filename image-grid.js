fetch('imagen.txt')
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        return response.text();
    })
    .then(data => {
        const lines = data.split('\n').map(line => line.split(','));
        const imageGrid = document.getElementById('image-grid');

        lines.forEach(line => {
            const [id, imgUrl, title] = line; // Obtén solo los campos necesarios
            const imageItem = document.createElement('div');
            imageItem.className = 'grid-item';
            const redirectUrl = line[6]; // La nueva URL de redirección es el séptimo elemento

            imageItem.innerHTML = `
                <a href="${redirectUrl}"> <!-- Usa la nueva URL aquí -->
                    <img src="${imgUrl}" alt="${title}">
                </a>
                <p>${title}</p>
            `;
            imageGrid.appendChild(imageItem);
        });
    })
    .catch(err => {
        console.error(`Fetch problem: ${err.message}`);
    });
