/**
 * RemindersView.js
 * Sección Recordatorios (CRUD + búsqueda + ajustes de correo) y sección Alarmas.
 */

import {
    ESTADOS, esc, dueDate, formatDate, formatDay, isOverdue,
    listReminders, getReminder, createReminder, updateReminder, removeReminder,
    getSettings, saveSettings, listAlarms, clearAlarms, sendAlarm, pendingAlarms,
} from './Reminders.js';
import { toast } from './../../components/Toast.js';

const $ = (id) => document.getElementById(id);
const filters = { q: '', estado: 'todos' };
let deleteId = null;

const estadoVars = (estado) =>
    `--estado-color:var(--color-status-${estado});--estado-soft:var(--color-status-${estado}-soft)`;

/* ---------------------------------------------------------------
   Recordatorios
   --------------------------------------------------------------- */
function matches(r) {
    if (filters.estado !== 'todos' && r.estado !== filters.estado) return false;
    const q = filters.q.trim().toLowerCase();
    if (!q) return true;
    return [r.folio, r.titulo, r.descripcion].some((v) => v.toLowerCase().includes(q));
}

function reminderCard(r) {
    const overdue = isOverdue(r);
    return `
    <article class="reminder-card" style="${estadoVars(r.estado)}" data-id="${r.id}">
        <div class="reminder-head">
            <span class="reminder-folio">${esc(r.folio)}</span>
            <span class="badge">${ESTADOS[r.estado].label}</span>
        </div>
        <h3 class="reminder-title">${esc(r.titulo)}</h3>
        <p class="reminder-desc">${esc(r.descripcion)}</p>
        <div class="reminder-dates">
            <span>Inicio: ${formatDay(r.fechaInicio)}</span>
            <span>Término: ${formatDay(r.fechaTermino)} · ${esc(r.hora)}</span>
            ${overdue ? '<span class="reminder-overdue">Vencido</span>' : ''}
        </div>
        <div class="reminder-actions">
            <button type="button" class="btn btn-outline btn-sm" data-action="edit">Editar</button>
            <button type="button" class="btn btn-ghost btn-sm" data-action="delete">Eliminar</button>
        </div>
    </article>`;
}

function renderReminders() {
    const list = $('reminderList');
    const items = listReminders().filter(matches);

    list.innerHTML = items.length
        ? items.map(reminderCard).join('')
        : '<p class="panel-empty" style="grid-column:1/-1">No hay recordatorios que coincidan.</p>';
}

/* ---- Crear / editar ---- */
function openForm(reminder = null) {
    const form = $('reminderForm');
    $('reminderModalTitle').textContent = reminder ? 'Editar recordatorio' : 'Nuevo recordatorio';
    $('reminderFolio').textContent = reminder ? `Folio: ${reminder.folio}` : 'El folio se genera al guardar.';

    Modals.open('reminderModal');

    const today = new Date().toISOString().slice(0, 10);
    form.elements.id.value = reminder?.id ?? '';
    form.elements.titulo.value = reminder?.titulo ?? '';
    form.elements.descripcion.value = reminder?.descripcion ?? '';
    form.elements.fechaInicio.value = reminder?.fechaInicio ?? today;
    form.elements.fechaTermino.value = reminder?.fechaTermino ?? '';
    form.elements.hora.value = reminder?.hora ?? '';
    form.elements.estado.value = reminder?.estado ?? 'incompleto';
}

function onSubmitReminder(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));

    if (data.fechaTermino < data.fechaInicio) {
        toast.error('La fecha de término no puede ser anterior a la de inicio.');
        return;
    }

    if (data.id) {
        updateReminder(data.id, data);
        toast.success('Recordatorio actualizado.');
    } else {
        const item = createReminder(data);
        toast.success(`Recordatorio creado con folio ${item.folio}.`);
    }
    Modals.close();
}

/* ---- Eliminar ---- */
function askDelete(reminder) {
    deleteId = reminder.id;
    $('deleteText').textContent = `Se eliminará "${reminder.titulo}" (${reminder.folio}). Esta acción no se puede deshacer.`;
    Modals.open('deleteModal');
}

function confirmDelete() {
    if (!deleteId) return;
    removeReminder(deleteId);
    deleteId = null;
    Modals.close();
    toast.success('Recordatorio eliminado.');
}

/* ---- Ajuste rápido de correo ---- */
function openSettings() {
    const form = $('settingsForm');
    const s = getSettings();
    Modals.open('settingsModal');
    form.elements.email.value = s.email;
    form.elements.antelacionMin.value = String(s.antelacionMin);
    form.elements.activas.checked = s.activas;
}

function onSubmitSettings(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = form.elements.email.value.trim();
    const activas = form.elements.activas.checked;

    if (activas && !email) {
        toast.error('Indica un correo para activar las alarmas.');
        return;
    }

    saveSettings({
        email,
        activas,
        antelacionMin: Number(form.elements.antelacionMin.value),
    });
    Modals.close();
    toast.success('Ajustes de correo guardados.');
}

/* ---------------------------------------------------------------
   Alarmas
   --------------------------------------------------------------- */
function renderAlarms() {
    const settings = getSettings();
    const pending = pendingAlarms();
    const log = listAlarms();

    $('alarmPending').innerHTML = pending.length
        ? `<div class="table-wrap"><table class="data-table">
            <thead><tr><th>Folio</th><th>Recordatorio</th><th>Vence</th></tr></thead>
            <tbody>${pending.map((r) => `
                <tr>
                    <td>${esc(r.folio)}</td>
                    <td>${esc(r.titulo)}</td>
                    <td>${formatDay(r.fechaTermino)} · ${esc(r.hora)}</td>
                </tr>`).join('')}</tbody></table></div>
           ${settings.activas ? '' : '<p class="form-hint" style="margin-top:12px">Las alarmas están desactivadas. Actívalas en "Ajuste de correo".</p>'}`
        : '<p class="panel-empty">No hay alarmas pendientes.</p>';

    $('alarmLog').innerHTML = log.length
        ? `<div class="table-wrap"><table class="data-table">
            <thead><tr><th>Fecha</th><th>Folio</th><th>Recordatorio</th><th>Destino</th><th>Estado</th><th></th></tr></thead>
            <tbody>${log.map((a) => `
                <tr>
                    <td>${formatDate(a.fecha)}</td>
                    <td>${esc(a.folio)}</td>
                    <td>${esc(a.titulo)}</td>
                    <td>${esc(a.email)}</td>
                    <td class="${a.resultado === 'enviada' ? 'tag-ok' : 'tag-error'}">
                        ${a.resultado === 'enviada' ? 'Enviada' : 'Error'}</td>
                    <td>${a.resultado === 'error'
                ? `<button type="button" class="btn btn-ghost btn-sm" data-retry="${esc(a.folio)}">Reintentar</button>`
                : ''}</td>
                </tr>`).join('')}</tbody></table></div>`
        : '<p class="panel-empty">Aún no se ha enviado ninguna alarma.</p>';
}

async function retryAlarm(folio) {
    const reminder = listReminders().find((r) => r.folio === folio);
    if (!reminder) return;
    const entry = await sendAlarm(reminder);
    entry.resultado === 'enviada'
        ? toast.success('Alarma enviada.')
        : toast.error('No se pudo enviar la alarma.');
}

/* ---------------------------------------------------------------
   Arranque
   --------------------------------------------------------------- */
export function initRemindersView() {
    if (!$('reminderList')) return;

    const render = () => {
        renderReminders();
        renderAlarms();
    };
    render();
    document.addEventListener('reminders:changed', render);

    $('reminderSearch').addEventListener('input', (e) => {
        filters.q = e.target.value;
        renderReminders();
    });
    $('reminderFilter').addEventListener('change', (e) => {
        filters.estado = e.target.value;
        renderReminders();
    });

    $('newReminder').addEventListener('click', () => openForm());
    $('openSettings').addEventListener('click', openSettings);
    $('reminderForm').addEventListener('submit', onSubmitReminder);
    $('settingsForm').addEventListener('submit', onSubmitSettings);
    $('confirmDelete').addEventListener('click', confirmDelete);

    $('reminderList').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const reminder = getReminder(btn.closest('.reminder-card').dataset.id);
        if (!reminder) return;
        btn.dataset.action === 'edit' ? openForm(reminder) : askDelete(reminder);
    });

    $('clearAlarms').addEventListener('click', () => {
        clearAlarms();
        toast.info('Registro limpiado.');
    });
    $('alarmLog').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-retry]');
        if (btn) retryAlarm(btn.dataset.retry);
    });
}