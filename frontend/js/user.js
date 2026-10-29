/* ==========================================================================
   user.js
   Punto de entrada de la página de usuario. No contiene lógica propia:
   solo conecta los módulos con los elementos del HTML.

   Módulos:
   - Sections.js → navegación entre secciones (#preventivos, #bitacoras…)
   - Sidebar.js  → abrir/cerrar el menú lateral en móvil
   - Toast.js    → notificaciones
   - Session.js  → cerrar sesión
   ========================================================================== */

import { initSections } from './Sections.js';
import { initSidebar } from './Sidebar.js';
import { toast } from './Toast.js';
import { logout } from './Session.js';


/* ---- Cerrar sesión ---- */
function initLogout() {
    const button = document.getElementById('logoutButton');
    if (!button) return;

    button.addEventListener('click', async () => {
        button.disabled = true;   // evita doble clic mientras responde el servidor

        try {
            await logout();
        } catch (error) {
            console.error(error);
            toast.error('No se pudo cerrar la sesión. Inténtalo de nuevo.');
            button.disabled = false;
        }
    });
}


/* ---- Arranque ---- */
initSections();
initSidebar();
initLogout();