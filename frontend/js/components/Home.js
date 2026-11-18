/**
 * Home.js
 * Tablero de Inicio: recordatorios en columnas por estado.
 * Click en una tarjeta → modal de solo lectura.
 */

import { ESTADOS, esc, dueDate, formatDate, listReminders, getReminder } from './../features/reminder/Reminders.js';

const $ = (id) => document.getElementById(id);

function column(estado, items) {
    return `
    <section class="board-column"
        style="--estado-color:var(--color-status-${estado});--estado-soft:var(--color-status-${estado}-soft)">
        <h3 class="board-title">${ESTADOS[estado].plural}
            <span class="board-count">${items.length}</span>
        </h3>
        ${items.length
            ? items.map((r) => `
                <button type="button" class="board-card" data-id="${r.id}">
                    <span class="board-card-folio">${esc(r.folio)}</span>
                    <span class="board-card-title">${esc(r.titulo)}</span>
                    <span class="board-card-due">Termina: ${formatDate(dueDate(r))}</span>
                </button>`).join('')
            : '<p class="board-empty">Sin recordatorios</p>'}
    </section>`;
}

function renderBoard() {
    const all = listReminders();

    $('board').innerHTML = Object.keys(ESTADOS)
        .map((estado) => column(estado, all.filter((r) => r.estado === estado)))
        .join('');

    const stat = document.querySelector('[data-stat="recordatorios"] .stat-value');
    if (stat) stat.textContent = all.filter((r) => r.estado !== 'completado').length;
}

function openDetail(id) {
    const r = getReminder(id);
    if (!r) return;

    $('detailTitle').textContent = r.titulo;
    $('detailFolio').textContent = `${r.folio} · ${ESTADOS[r.estado].label}`;
    $('detailBody').innerHTML = `
        <div><dt>Descripción de la actividad</dt><dd>${esc(r.descripcion)}</dd></div>
        <div><dt>Debe terminar</dt><dd>${formatDate(dueDate(r))}</dd></div>`;

    Modals.open('detailModal');
}

export function initHome() {
    if (!$('board')) return;

    renderBoard();
    document.addEventListener('reminders:changed', renderBoard);

    $('board').addEventListener('click', (e) => {
        const card = e.target.closest('.board-card');
        if (card) openDetail(card.dataset.id);
    });
}