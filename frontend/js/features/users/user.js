/* ==========================================================================
   user.js
   Punto de entrada de la página de usuario. Solo conecta módulos.

   - Sections.js       → navegación entre secciones
   - Sidebar.js        → menú lateral en móvil
   - Toast.js          → notificaciones
   - Session.js        → cerrar sesión
   - Home.js           → tablero de Inicio
   - RemindersView.js  → Recordatorios y Alarmas
   - Reminders.js      → datos y programador de alarmas
   ========================================================================== */

import { initSections } from './../../shared/Sections.js';
import { initSidebar } from './../../components/Sidebar.js';
import { toast } from './../../components/Toast.js';
import { logout } from './../../features/sessions/Session.js';
import { initHome } from './../../components/Home.js';
import { initRemindersView } from './../../features/reminder/RemindersView.js';
import { startAlarmScheduler } from './../../features/reminder/Reminders.js';


/* ---- Cerrar sesión ---- */
function initLogout() {
    const button = document.getElementById('logoutButton');
    if (!button) return;

    button.addEventListener('click', async () => {
        button.disabled = true;

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
initHome();
initRemindersView();
startAlarmScheduler();