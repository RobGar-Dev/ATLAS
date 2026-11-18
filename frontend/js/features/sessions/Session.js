/* ==========================================================================
   Session.js
   Lógica de sesión. No toca el DOM: solo habla con el servidor y redirige.
   Quien la llame decide cómo mostrar errores (ver usuario.js).

   AJUSTA estas dos constantes a las rutas reales de tu backend.
   ========================================================================== */

const LOGOUT_URL = '/logout';   // endpoint que cierra la sesión (POST)
const LOGIN_URL = '/';          // a dónde enviar al usuario después de salir

export async function logout() {
    const response = await fetch(LOGOUT_URL, {
        method: 'POST',
        credentials: 'same-origin',
    });

    if (!response.ok) {
        throw new Error(`No se pudo cerrar la sesión (${response.status})`);
    }

    window.location.href = LOGIN_URL;
}