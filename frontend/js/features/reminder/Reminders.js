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

//Endpoint del backend que envia el correo (Se ajusta al API)
const ALARM_ENDPOINT = '/api/alarmas/enviar';

export const ESTADOS = {
    incompleto: { label: 'Incompleto', plural: 'Incompletas' },
    proceso: { label: 'En proceso', plural: 'En proceso' },
    completado: { label: 'Completado', plural: 'Completados' },
    externo: { label: 'Externo', plural: 'Externo' }
};

const DEFAULT_SETTINGS = { email: '', antelacionMin: 0, activas: false };

/* ---- Utilidades ---- */
const read = (key, fallback) => {
    try {
        return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
        return fallback;
    }
};

const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const notify = () => document.dispatchEvent(new CustomEvent('reminders:changed'));

export const esc = (text = '') =>
    String(text).replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const dueDate = (r) => new Date(`${r.fechaTermino}T${r.hora || '23:59'}`);

export const formatDate = (iso) =>
    new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

export const formatDay = (day) =>
    new Date(`${day}T00:00`).toLocaleDateString('es-MX', { dateStyle: 'medium' });

export const isOverdue = (r) =>
    (r.estado === 'incompleto' || r.estado === 'proceso') && dueDate(r) < new Date();

const pick = (d) => ({
    titulo: d.titulo.trim(),
    descripcion: d.descripcion.trim(),
    fechaInicio: d.fechaInicio,
    fechaTermino: d.fechaTermino,
    hora: d.hora,
    estado: ESTADOS[d.estado] ? d.estado : 'incompleto',
});

/* ---- CRUD ---- */
export const listReminders = () =>
    read(KEYS.items, []).sort((a, b) => dueDate(a) - dueDate(b));

export const getReminder = (id) => read(KEYS.items, []).find((r) => r.id === id);

export function createReminder(data) {
    const n = read(KEYS.counter, 0) + 1;
    write(KEYS.counter, n);

    const item = {
        id: crypto.randomUUID(),
        folio: `REC-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`,
        ...pick(data),
        alarmaEnviada: false,
        creado: new Date().toISOString(),
    };
    write(KEYS.items, [...read(KEYS.items, []), item]);
    notify();
    return item;
}

export function updateReminder(id, data) {
    const items = read(KEYS.items, []).map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...pick(data) };
        // Si cambia la fecha/hora de término, la alarma vuelve a quedar pendiente
        if (next.fechaTermino !== r.fechaTermino || next.hora !== r.hora) {
            next.alarmaEnviada = false;
        }
        return next;
    });
    write(KEYS.items, items);
    notify();
}

export function removeReminder(id) {
    write(KEYS.items, read(KEYS.items, []).filter((r) => r.id !== id));
    notify();
}

/* ---- Ajustes de correo ---- */
export const getSettings = () => ({ ...DEFAULT_SETTINGS, ...read(KEYS.settings, {}) });

export function saveSettings(settings) {
    write(KEYS.settings, { ...getSettings(), ...settings });
    notify();
}

/* ---- Alarmas ---- */
export const listAlarms = () =>
    read(KEYS.alarms, []).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

export function clearAlarms() {
    write(KEYS.alarms, []);
    notify();
}

export async function sendAlarm(reminder) {
    const settings = getSettings();

    // Se marca antes de enviar para no duplicar si el ciclo se repite
    write(KEYS.items, read(KEYS.items, []).map((r) =>
        r.id === reminder.id ? { ...r, alarmaEnviada: true } : r));

    const entry = {
        id: crypto.randomUUID(),
        folio: reminder.folio,
        titulo: reminder.titulo,
        email: settings.email,
        fecha: new Date().toISOString(),
        resultado: 'enviada',
    };

    try {
        const res = await fetch(ALARM_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: settings.email,
                folio: reminder.folio,
                titulo: reminder.titulo,
                descripcion: reminder.descripcion,
                fechaTermino: reminder.fechaTermino,
                hora: reminder.hora,
            }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (error) {
        console.error('[Alarmas]', error);
        entry.resultado = 'error';
    }

    write(KEYS.alarms, [...read(KEYS.alarms, []), entry]);
    notify();
    return entry;
}

/** Recordatorios cuya alarma aún no se envía (y que sí se enviará). */
export const pendingAlarms = () =>
    listReminders().filter((r) => !r.alarmaEnviada && (r.estado === 'incompleto' || r.estado === 'proceso'));

async function checkAlarms() {
    const settings = getSettings();
    if (!settings.activas || !settings.email) return;

    const now = Date.now();
    for (const r of pendingAlarms()) {
        if (dueDate(r).getTime() - settings.antelacionMin * 60000 <= now) {
            await sendAlarm(r);
        }
    }
}

export function startAlarmScheduler() {
    checkAlarms();
    setInterval(checkAlarms, 60 * 1000);
}