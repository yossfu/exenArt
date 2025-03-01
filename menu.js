// menu.js
const app = window.app || {}; // Accedemos al objeto global

function toggleMenu() {
    if (app.elements.menu && app.elements.menuToggle) {
        app.elements.menu.classList.toggle('active');
        app.elements.menuToggle.classList.toggle('open');
    }
}

function closeMenu() {
    if (app.elements.menu && app.elements.menuToggle) {
        app.elements.menu.classList.remove('active');
        app.elements.menuToggle.classList.remove('open');
    }
}

if (app.elements.menuToggle && app.elements.menu && app.elements.menuClose) {
    app.elements.menuToggle.addEventListener('click', toggleMenu);
    app.elements.menuClose.addEventListener('click', closeMenu);

    document.addEventListener('click', (event) => {
        const isClickInsideMenu = app.elements.menu.contains(event.target);
        const isClickOnToggle = app.elements.menuToggle.contains(event.target);
        if (!isClickInsideMenu && !isClickOnToggle && app.elements.menu.classList.contains('active')) {
            closeMenu();
        }
    });

    if (app.elements.menu) {
        app.elements.menu.querySelectorAll('.tab-button').forEach(link => {
            link.addEventListener('click', closeMenu);
        });
    }
}

// Exportamos al objeto global
app.toggleMenu = toggleMenu;
app.closeMenu = closeMenu;