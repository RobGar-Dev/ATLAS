/* ==========================================================================
   Sidebar.js
   Comportamiento del menú lateral en móvil (≤768px):
   - Se abre con el botón [data-sidebar-toggle].
   - Se cierra con el fondo oscuro, la tecla Escape o al elegir un link.

   El link activo y el cambio de sección NO se manejan aquí: eso es de
   Sections.js. Este módulo solo se ocupa de abrir y cerrar el menú.

   Requiere en el HTML: #sidebar, #sidebarOverlay y [data-sidebar-toggle].
   Estilos en user.css (sección Sidebar y Responsive).
   ========================================================================== */

const MOBILE_QUERY = '(max-width: 768px)';

export function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const toggle = document.querySelector('[data-sidebar-toggle]');
    if (!sidebar) return;

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

    // En móvil, elegir un link cierra el menú (Sections.js muestra la sección)
    sidebar.querySelectorAll('.nav-link, .sidebar-header a').forEach((link) => {
        link.addEventListener('click', () => {
            if (isMobile.matches) close();
        });
    });
}