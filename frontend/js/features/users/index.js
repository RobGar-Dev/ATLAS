/* ==========================================================================
   index.js
   Punto de entrada de la página de login. Conecta los formularios con la
   lógica (Auth.js) y muestra el resultado con notificaciones (Toast.js).

   Módulos:
   - Auth.js   → habla con el servidor (login, registro, recuperar contraseña)
   - Toast.js  → notificaciones
   - Flash.js  → mensajes que llegan desde otra página (ej. "Sesión cerrada")

   Si este script no carga, los formularios siguen funcionando con el envío
   normal del navegador (action + method).

   ESTADO ACTUAL: el manejo de formularios está APAGADO porque todavía no
   hay backend. Cuando conectes la base de datos, cambia BACKEND_READY a true
   (y revisa las rutas en Auth.js). Mientras tanto los formularios se envían
   de forma normal y Toast.js queda disponible para cualquier otro uso.
   ========================================================================== */

import { toast } from '../../components/Toast.js';
import { consumeFlash } from './Flash.js';
import { login, register, requestPasswordReset } from './Auth.js';

// Interruptor: false = formularios sin interceptar (aún no hay backend)
const BACKEND_READY = false;

const FALLBACK_ERROR = 'Ocurrió un error inesperado. Inténtalo de nuevo.';


/* ---- Utilidades de interfaz ---- */

/* Bloquea el botón mientras responde el servidor. Devuelve la función que lo restaura. */
function setLoading(button, text) {
    if (!button) return () => { };

    const originalContent = button.innerHTML;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.textContent = text;

    return () => {
        button.disabled = false;
        button.removeAttribute('aria-busy');
        button.innerHTML = originalContent;
    };
}

/* Cierra el modal usando su propio botón ×, así respeta lo que haga Modals.js */
function closeModalOf(form) {
    form.closest('.modal')?.querySelector('.modal-close')?.click();
}


/* ---- Manejo genérico de un formulario ---- */

function bindForm(form, { action, loadingText, onSuccess, onError }) {
    form.addEventListener('submit', async (event) => {
        event.preventDefault();   // la validación nativa (required, email) ya corrió antes de este evento

        const restore = setLoading(form.querySelector('[type="submit"]'), loadingText);
        let leavingPage = false;

        try {
            const result = await action(form);
            leavingPage = onSuccess(result, form) === true;
        } catch (error) {
            toast.error(error.message || FALLBACK_ERROR);
            onError?.(form, error);
        } finally {
            if (!leavingPage) restore();   // si la página se va, el botón queda bloqueado
        }
    });
}


/* ---- Formularios de la página ---- */

const loginForm = document.getElementById('loginForm');

const forms = [
    {
        id: 'loginForm',
        action: login,
        loadingText: 'Iniciando sesión…',
        onSuccess: ({ redirectTo }) => {
            window.location.href = redirectTo;
            return true;   // true = la página se va, no restaurar el botón
        },
        onError: (form) => {
            // Contraseña incorrecta: la borra y deja el cursor listo para reintentar
            form.elements.password.value = '';
            form.elements.password.focus();
        },
    },
    {
        id: 'registerForm',
        action: register,
        loadingText: 'Creando cuenta…',
        onSuccess: ({ message }, form) => {
            toast.success(message);

            // Deja el usuario recién creado listo en el login
            if (loginForm) loginForm.elements.username.value = form.elements.username.value;

            form.reset();
            closeModalOf(form);
        },
    },
    {
        id: 'forgotPasswordForm',
        action: requestPasswordReset,
        loadingText: 'Enviando…',
        onSuccess: ({ message }, form) => {
            toast.success(message);
            form.reset();
            closeModalOf(form);
        },
    },
];

if (BACKEND_READY) {
    forms.forEach(({ id, ...config }) => {
        const form = document.getElementById(id);
        if (form) bindForm(form, config);
    });
}


/* ---- Mensaje que viene de otra página (ej. "Sesión cerrada") ---- */

const flash = consumeFlash();
if (flash) toast[flash.type](flash.message);