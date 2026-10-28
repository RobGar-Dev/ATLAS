/* ==========================================================================
   Sidebar.js
   Comportamiento del menú lateral:
   - En móvil (≤768px) se abre con el botón [data-sidebar-toggle] y se cierra
     con el fondo oscuro, la tecla Escape o al elegir un link.
   - Marca el link activo (.active + aria-current).

   Requiere en el HTML: #sidebar, #sidebarOverlay y [data-sidebar-toggle].
   Estilos en usuario.css (sección Sidebar y Responsive).
   ========================================================================== */

const MOBILE_QUERY = '(max-width: 768px)';

export function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const toggle = document.querySelector('[data-sidebar-toggle]');
    if (!sidebar) return;

    const links = sidebar.querySelectorAll('.nav-link');
    const isMobile = window.matchMedia(MOBILE_QUERY);

    /* ---- Abrir / cerrar ---- */
    function isOpen() {
        return sidebar.classList.contains('is-open');
    }

    function open() {
        sidebar.classList.add('is-open');
        overlay?.classList.add('is-visible');
        document.body.classList.add('sidebar-open');
        toggle?.setAttribute('aria-expanded', 'true');
        sidebar.querySelector('.nav-link')?.focus({ preventScroll: true });
    }

    function close({ restoreFocus = false } = {}) {
        sidebar.classList.remove('is-open');
        overlay?.classList.remove('is-visible');
        document.body.classList.remove('sidebar-open');
        toggle?.setAttribute('aria-expanded', 'false');
        if (restoreFocus) toggle?.focus();
    }

    /* ---- Link activo ---- */
    function setActive(link) {
        links.forEach((item) => {
            const active = item === link;
            item.classList.toggle('active', active);
            if (active) {
                item.setAttribute('aria-current', 'page');
            } else {
                item.removeAttribute('aria-current');
            }
        });
    }

    /* ---- Eventos ---- */
    toggle?.addEventListener('click', () => (isOpen() ? close() : open()));
    overlay?.addEventListener('click', () => close());

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && isOpen()) close({ restoreFocus: true });
    });

    // Si la ventana crece a escritorio con el menú abierto, lo reinicia
    isMobile.addEventListener('change', (event) => {
        if (!event.matches) close();
    });

    links.forEach((link) => {
        link.addEventListener('click', (event) => {
            // Mientras los links sean "#" no navegan; cuando tengan ruta real, se respeta
            if (link.getAttribute('href') === '#') event.preventDefault();
            setActive(link);
            if (isMobile.matches) close();
        });
    });

    // Estado inicial
    const initial = sidebar.querySelector('.nav-link.active');
    if (initial) setActive(initial);
}