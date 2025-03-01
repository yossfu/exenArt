// search.js
function filterBySearch(searchTerm) {
    if (!searchTerm) {
        window.app.resetFilters();
        document.getElementById('search-results').textContent = '';
        return;
    }

    if (window.app.elements.loader && window.app.elements.imageGrid) {
        window.app.elements.loader.style.display = 'flex';
        window.app.elements.imageGrid.classList.add('fade');
        setTimeout(() => {
            if (window.app.activeTagButton && window.app.elements.tagsSection) window.app.activeTagButton.classList.remove('active');
            if (window.app.activeCategoryButton && window.app.elements.categories) window.app.activeCategoryButton.classList.remove('active');
            window.app.activeTagButton = null;
            window.app.activeCategoryButton = null;
            window.app.activeTag = null;
            window.app.activeCategory = null;

            const searchWords = searchTerm.toLowerCase().trim().split(/\s+/);

            window.app.filteredItems = window.app.imagesData
                .map(item => {
                    const title = item.title.toLowerCase();
                    const description = item.description?.toLowerCase() || '';
                    const tags = item.tags.map(tag => tag.toLowerCase());
                    const matches = searchWords.reduce((count, word) => {
                        return count + (title.includes(word) ? 1 : 0) +
                               (description.includes(word) ? 1 : 0) +
                               (tags.some(tag => tag.includes(word)) ? 1 : 0);
                    }, 0);
                    return { item, matches };
                })
                .filter(entry => entry.matches > 0)
                .sort((a, b) => b.matches - a.matches)
                .map(entry => entry.item);

            window.app.isFiltered = true;
            window.app.currentPage = 1;
            window.app.renderImages(window.app.currentPage);
            if (window.app.elements.resetButton) window.app.elements.resetButton.classList.add('active');
            if (window.app.elements.resetTagButton) window.app.elements.resetTagButton.classList.remove('active');
            if (window.app.elements.resetCategoryButton) window.app.elements.resetCategoryButton.classList.remove('active');
            window.app.elements.imageGrid.classList.remove('fade');
            window.app.elements.loader.style.display = 'none';
            localStorage.setItem('lastFilter', searchTerm);
            localStorage.setItem('lastFilterType', 'search');
            window.app.updateFilterIndicator();
            document.getElementById('search-results').textContent = `Resultados: ${window.app.filteredItems.length}`;
        }, 200); // Aumentamos a 200ms para que el loader sea más visible
    }
}

function showAutocomplete(suggestions) {
    let autocomplete = document.getElementById('autocomplete');
    if (!autocomplete) {
        autocomplete = document.createElement('div');
        autocomplete.id = 'autocomplete';
        autocomplete.className = 'autocomplete';
        window.app.elements.searchInput.parentNode.appendChild(autocomplete);
    }

    autocomplete.innerHTML = '';
    suggestions.slice(0, 5).forEach(suggestion => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.textContent = suggestion;
        item.addEventListener('click', () => {
            window.app.elements.searchInput.value = suggestion;
            filterBySearch(suggestion);
            hideAutocomplete();
        });
        autocomplete.appendChild(item);
    });

    autocomplete.style.display = suggestions.length ? 'block' : 'none';
}

function hideAutocomplete() {
    const autocomplete = document.getElementById('autocomplete');
    if (autocomplete) autocomplete.style.display = 'none';
}

function getAutocompleteSuggestions(input) {
    if (!input || !window.app.imagesData.length) return [];
    const allTags = [...new Set(window.app.imagesData.flatMap(item => item.tags))];
    return allTags.filter(tag => tag.toLowerCase().includes(input.toLowerCase().trim()));
}

// Esperamos a que app.elements esté listo
function initializeSearch() {
    if (window.app && window.app.elements && window.app.elements.searchInput) {
        const searchButton = document.getElementById('search-button');
        if (searchButton) {
            searchButton.addEventListener('click', () => {
                const value = window.app.elements.searchInput.value;
                filterBySearch(value);
                showAutocomplete(getAutocompleteSuggestions(value));
            });
        }

        document.addEventListener('click', (event) => {
            if (!window.app.elements.searchInput.contains(event.target) && !document.getElementById('autocomplete')?.contains(event.target)) {
                hideAutocomplete();
            }
        });
    } else {
        console.error("Esperando a que core.js inicialice app.elements...");
        setTimeout(initializeSearch, 100); // Reintenta cada 100ms hasta que esté listo
    }
}

// Iniciamos la búsqueda cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    initializeSearch();
});

// Exportamos al objeto global
window.app = window.app || {};
window.app.filterBySearch = filterBySearch;
window.app.showAutocomplete = showAutocomplete;
window.app.hideAutocomplete = hideAutocomplete;
window.app.getAutocompleteSuggestions = getAutocompleteSuggestions;