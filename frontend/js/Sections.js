/* ==========================================================================
   Sections.js
   Navegación entre secciones sin recargar la página.

   Cómo funciona:
   - Cada link del sidebar lleva  href="#nombre"  y  data-section="nombre".
   - Cada sección del HTML lleva  id="section-nombre"  y  data-title="Título".
   - La sección visible se guarda en la URL (#nombre): funcionan el botón
     "atrás" del navegador, recargar la página y compartir el enlace.

   Al cambiar de sección este módulo:
   1. Muestra esa sección (.active) y oculta las demás.
   2. Marca el link correspondiente del sidebar (.active + aria-current).
   3. Actualiza el título del topbar y el de la pestaña.
   4. Sube el scroll y mueve el foco al encabezado (accesibilidad).
   5. Avisa con el evento `sectionchange` para que otros módulos reaccionen.

   Para cargar datos solo la primera vez que se entra a una sección:
     document.addEventListener('sectionchange', (event) => {
         const { name, section, firstVisit } = event.detail;
         if (name === 'preventivos' && firstVisit) cargarPreventivos();
     });
   (registra el listener ANTES de llamar a initSections)
   ========================================================================== */

const SECTION_PREFIX = 'section-';
const ACTIVE_CLASS = 'active';
const APP_NAME = 'ATLAS';

export function initSections() {
    const sections = [...document.querySelectorAll('.page-section')];
    if (!sections.length) return;

    const links = [...document.querySelectorAll('.nav-link[data-section]')];
    const topbarTitle = document.querySelector('.topbar-title');

    const nameOf = (section) => section.id.slice(SECTION_PREFIX.length);
    const byName = new Map(sections.map((section) => [nameOf(section), section]));
    const visited = new Set();

    // Sección por defecto: la que venga con .active en el HTML, o la primera
    const defaultName = nameOf(
        sections.find((section) => section.classList.contains(ACTIVE_CLASS)) ?? sections[0]
    );

    function show(name, { focus = false } = {}) {
        const section = byName.get(name);
        if (!section) return;

        // 1. Secciones
        sections.forEach((item) => item.classList.toggle(ACTIVE_CLASS, item === section));

        // 2. Sidebar
        links.forEach((link) => {
            const isCurrent = link.dataset.section === name;
            link.classList.toggle(ACTIVE_CLASS, isCurrent);
            if (isCurrent) {
                link.setAttribute('aria-current', 'page');
            } else {
                link.removeAttribute('aria-current');
            }
        });

        // 3. Títulos
        const title = section.dataset.title;
        if (title) {
            if (topbarTitle) topbarTitle.textContent = title;
            document.title = `${title} - ${APP_NAME}`;
        }

        // 4. Scroll y foco
        window.scrollTo({ top: 0 });
        if (focus) section.querySelector('h2')?.focus({ preventScroll: true });

        // 5. Aviso a otros módulos
        const firstVisit = !visited.has(name);
        visited.add(name);
        document.dispatchEvent(new CustomEvent('sectionchange', {
            detail: { name, section, firstVisit },
        }));
    }

    function showFromHash({ focus }) {
        const name = window.location.hash.slice(1);

        if (byName.has(name)) {
            show(name, { focus });
            return;
        }

        // Hash que no existe (#algo-raro): vuelve a la sección por defecto
        if (name) history.replaceState(null, '', `#${defaultName}`);
        show(defaultName, { focus });
    }

    window.addEventListener('hashchange', () => showFromHash({ focus: true }));
    showFromHash({ focus: false });   // carga inicial: sin mover el foco
}

/* Para navegar desde código:  goToSection('preventivos') */
export function goToSection(name) {
    window.location.hash = name;
}