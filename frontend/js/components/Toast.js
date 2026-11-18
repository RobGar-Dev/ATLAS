/* ==========================================================================
   Toast.js
   Notificaciones emergentes. Solo se encarga de mostrarlas; no sabe nada
   de la lógica de la página.

   Requiere en el HTML:  <div class="toast-container" id="toast-container"></div>
   Estilos en components.css (sección Toast).

   Uso:
     import { toast } from './Toast.js';
     toast.success('Guardado');
     toast.error('Algo salió mal', { duration: 6000 });
     toast.info('Aviso', { duration: 0 });   // 0 = no se cierra solo
   ========================================================================== */

const CONTAINER_ID = 'toast-container';
const DEFAULT_DURATION = 4000;   // ms
const LEAVE_DURATION = 250;      // ms, igual a --transition-normal

export function showToast(message, { type = 'info', duration = DEFAULT_DURATION } = {}) {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return null;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

    const text = document.createElement('p');
    text.className = 'toast-message';
    text.textContent = message;   // textContent: nunca interpreta HTML

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'toast-close';
    close.setAttribute('aria-label', 'Cerrar notificación');
    close.textContent = '×';

    toast.append(text, close);
    container.append(toast);

    let timer;

    const remove = () => {
        clearTimeout(timer);
        if (toast.classList.contains('is-leaving')) return;
        toast.classList.add('is-leaving');
        setTimeout(() => toast.remove(), LEAVE_DURATION);
    };

    const startTimer = () => {
        if (duration > 0) timer = setTimeout(remove, duration);
    };

    close.addEventListener('click', remove);
    toast.addEventListener('mouseenter', () => clearTimeout(timer));   // pausa al pasar el mouse
    toast.addEventListener('mouseleave', startTimer);
    startTimer();

    return toast;
}

export const toast = {
    success: (message, options) => showToast(message, { ...options, type: 'success' }),
    error: (message, options) => showToast(message, { ...options, type: 'error' }),
    warning: (message, options) => showToast(message, { ...options, type: 'warning' }),
    info: (message, options) => showToast(message, { ...options, type: 'info' }),
};