document.addEventListener('DOMContentLoaded', function() {
    fetch('imagenes.json')
        .then(response => response.json())
        .then(musicData => {
            const imageGrid = document.getElementById('image-grid');
            const itemsPerPage = 15;
            let currentPage = 1;

            function renderImages(page) {
                imageGrid.innerHTML = '';
                const startIndex = (page - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;

                musicData.slice(startIndex, endIndex).forEach(item => {
                    const card = document.createElement('div');
                    card.className = 'flex-item';
                    card.innerHTML = `
                        <img src="${item.coverUrl}" alt="${item.title}" class="card-image">
                        <p>${item.title} - ${item.artist}</p>
                    `;
                    imageGrid.appendChild(card);
                });

                renderPagination(musicData.length);
            }

            function renderPagination(totalItems) {
                const pagination = document.getElementById('pagination');
                pagination.innerHTML = '';
                const totalPages = Math.ceil(totalItems / itemsPerPage);

                for (let i = 1; i <= totalPages; i++) {
                    const button = document.createElement('button');
                    button.textContent = i;
                    button.onclick = () => {
                        currentPage = i;
                        renderImages(currentPage);
                    };
                    pagination.appendChild(button);
                }
            }

            renderImages(currentPage);

            document.getElementById('search').addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase().trim();
                const filteredItems = musicData.filter(item => {
                    const titleMatch = item.title.toLowerCase().includes(searchTerm);
                    const artistMatch = item.artist.toLowerCase().includes(searchTerm);
                    return titleMatch || artistMatch;
                });

                imageGrid.innerHTML = '';
                filteredItems.forEach(item => {
                    const card = document.createElement('div');
                    card.className = 'flex-item';
                    card.innerHTML = `
                        <img src="${item.coverUrl}" alt="${item.title}" class="card-image">
                        <p>${item.title} - ${item.artist}</p>
                    `;
                    imageGrid.appendChild(card);
                });

                if (searchTerm === '') {
                    renderImages(currentPage);
                }
            });

        })
        .catch(error => console.error('Error cargando el JSON:', error));
});
