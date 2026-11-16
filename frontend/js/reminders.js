/**
 * Reminders.js
 * Almacén de recordatorios, ajustes de correo y registro de alarmas.
 * Hoy guarda en localStorage; para pasar a MySQL, cambia solo read()/write()
 * por llamadas a la API (el resto de la app no cambia).
 */

const KEYS = {
    items: 'atlas.recordatorios',
    counter: 'atlas.recordatorios.contador',
    alarms: 'atlas.alarmas',
    settings: 'atlas.alarmas.ajustes'
};

