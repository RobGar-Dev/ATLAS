/**
 * Modals.js
 * Manejo de modals accesibles (abrir, cerrar, foco, Escape, clic fuera).
 *
 * Uso en HTML:
 *   <a href="#" data-modal-open="forgetPasswordModal">¿Olvidaste tu contraseña?</a>
 *   <a href="#" data-modal-open="createAccountModal">Crear una cuenta</a>
 *
 * Uso desde JS:
 *   Modals.open('createAccountModal');
 *   Modals.close();            // cierra el modal activo
 *   Modals.switchTo('otherId') // cierra el actual y abre otro
 */

(() => {
    'use strict';

    const OPEN_CLASS = 'is-open';
    const BODY_LOCK_CLASS = 'modal-open';
    const FOCUSABLE =
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
        'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    let activeModal = null;
    let lastTrigger = null;

    const getModal = (id) => document.getElementById(id);

    function open(id, trigger = null) {
        const modal = getModal(id);
        if (!modal) {
            console.warn(`[Modals] No existe el modal con id "${id}"`);
            return;
        }

        if (activeModal && activeModal !== modal) close(true);

        lastTrigger = trigger || document.activeElement;
        activeModal = modal;

        modal.classList.add(OPEN_CLASS);
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add(BODY_LOCK_CLASS);

        // Enfocar el primer campo del formulario (o el primer elemento enfocable)
        const target =
            modal.querySelector('input, select, textarea') ||
            modal.querySelector(FOCUSABLE);
        if (target) setTimeout(() => target.focus(), 50);
    }

    function close(skipFocusRestore = false) {
        if (!activeModal) return;

        activeModal.classList.remove(OPEN_CLASS);
        activeModal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove(BODY_LOCK_CLASS);

        const form = activeModal.querySelector('form');
        if (form) form.reset();

        activeModal = null;

        if (!skipFocusRestore && lastTrigger && typeof lastTrigger.focus === 'function') {
            lastTrigger.focus();
        }
        if (!skipFocusRestore) lastTrigger = null;
    }

    function switchTo(id, trigger = null) {
        const previousTrigger = lastTrigger;
        close(true);
        open(id, trigger || previousTrigger);
    }

    // Mantiene el foco dentro del modal con Tab / Shift+Tab
    function trapFocus(e) {
        if (!activeModal || e.key !== 'Tab') return;

        const items = [...activeModal.querySelectorAll(FOCUSABLE)].filter(
            (el) => el.offsetParent !== null
        );
        if (!items.length) return;

        const first = items[0];
        const last = items[items.length - 1];

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    function init() {
        // Abrir: cualquier elemento con data-modal-open="idDelModal"
        document.addEventListener('click', (e) => {
            const opener = e.target.closest('[data-modal-open]');
            if (opener) {
                e.preventDefault();
                open(opener.dataset.modalOpen, opener);
                return;
            }

            // Cambiar entre modals: data-modal-switch="idDelModal"
            const switcher = e.target.closest('[data-modal-switch]');
            if (switcher) {
                e.preventDefault();
                switchTo(switcher.dataset.modalSwitch, switcher);
                return;
            }

            // Cerrar: botón ×, data-modal-close, o clic en el fondo
            if (
                e.target.closest('.modal-close') ||
                e.target.closest('[data-modal-close]') ||
                e.target.classList.contains('modal')
            ) {
                close();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && activeModal) close();
            trapFocus(e);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // API pública
    window.Modals = { open, close, switchTo };
})();