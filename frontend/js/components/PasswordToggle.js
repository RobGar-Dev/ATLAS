/* ==========================================================================
   PasswordToggle.js
   Muestra u oculta la contraseña.
   Uso: <button type="button" class="input-action" data-toggle-password="idDelInput">
   Los estilos de los iconos están en components.css (.input-action).
   ========================================================================== */

document.querySelectorAll('[data-toggle-password]').forEach((button) => {
    const input = document.getElementById(button.dataset.togglePassword);
    if (!input) return;

    button.addEventListener('click', () => {
        const show = input.type === 'password';

        input.type = show ? 'text' : 'password';
        button.classList.toggle('is-visible', show);
        button.setAttribute('aria-pressed', String(show));
        button.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
    });
});