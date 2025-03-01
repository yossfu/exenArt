// Definimos funciones de búsqueda en un archivo separado
const app = window.app || {}; // Accedemos al objeto global

function filterBySearch(searchTerm) {
    if (!searchTerm) {
        app.resetFilters();
        return;
    }

    if (app.elements.loader && app.elements.imageGrid) {
        app.elements.loader.style.display = 'flex';
        app.elements.imageGrid.classList.add('fade');
        setTimeout(() => {
            if (app.activeTagButton && app.elements.tagsSection) app.activeTagButton.classList.remove('active');
            if (app.activeCategoryButton && app.elements.categories) app.activeCategoryButton.classList.remove('active');
            app.activeTagButton = null;
            app.activeCategoryButton = null;
            app.activeTag = null;
            app.activeCategory = null;

            const searchWords = searchTerm.toLowerCase().trim().split(/\s+/);

            app.filteredItems = app.imagesData
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

            app.isFiltered = true;
            app.currentPage = 1;
            app.renderImages(app.currentPage);
            if (app.elements.resetButton) app.elements.resetButton.classList.add('active');
            if (app.elements.resetTagButton) app.elements.resetTagButton.classList.remove('active');
            if (app.elements.resetCategoryButton) app.elements.resetCategoryButton.classList.remove('active');
            app.elements.imageGrid.classList.remove('fade');
            app.elements.loader.style.display = 'none';
            localStorage.setItem('lastFilter', searchTerm);
            localStorage.setItem('lastFilterType', 'search');
            app.updateFilterIndicator();
        }, 100);
    }
}

function showAutocomplete(suggestions) {
    let autocomplete = document.getElementById('autocomplete');
    if (!autocomplete) {
        autocomplete = document.createElement('div');
        autocomplete.id = 'autocomplete';
        autocomplete.className = 'autocomplete';
        app.elements.searchInput.parentNode.appendChild(autocomplete);
    }

    autocomplete.innerHTML = '';
    suggestions.slice(0, 5).forEach(suggestion => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.textContent = suggestion;
        item.addEventListener('click', () => {
            app.elements.searchInput.value = suggestion;
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
    if (!input || !app.imagesData.length) return [];
    const allTags = [...new Set(app.imagesData.flatMap(item => item.tags))];
    return allTags.filter(tag => tag.toLowerCase().includes(input.toLowerCase().trim()));
}

// Exportamos al objeto global
app.filterBySearch = filterBySearch;
app.showAutocomplete = showAutocomplete;
app.hideAutocomplete = hideAutocomplete;
app.getAutocompleteSuggestions = getAutocompleteSuggestions;