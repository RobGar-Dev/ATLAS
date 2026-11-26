/**
 * MachinesView.js
 * UI de "Máquinas y materiales": árbol, buscador, panel de información,
 * sustituciones. Orquesta Store + Api + Viewer3D.
 */

import * as api from './../api/MachinesApi.js';
import { createMachinesStore } from './../features/machines/MachinesStore.js';
import { esc } from './../shared/Html.js';
import { toast } from './../components/Toast.js';   // ajusta la ruta

const $ = (id) => document.getElementById(id);

const TYPE = {
    machine: { label: 'Máquina', icon: '🏭' },
    section: { label: 'Sección', icon: '🧩' },
    assembly: { label: 'Conjunto', icon: '⚙️' },
    component: { label: 'Componente', icon: '🔩' },
};

const STATUS = {
    operativo: { label: 'Operativo', color: '--color-success' },
    revision: { label: 'En revisión', color: '--color-warning' },
    fuera_servicio: { label: 'Fuera de servicio', color: '--color-danger' },
};

const REL = {
    alimenta: ['Alimenta a', 'Alimentado por'],
    acciona: ['Acciona a', 'Accionado por'],
    soporta: ['Soporta a', 'Soportado por'],
    depende: ['Depende de', 'Es requerido por'],
};

const TABS = [
    ['general', 'General'], ['materiales', 'Materiales'], ['bom', 'BOM'],
    ['historial', 'Historial'], ['inventario', 'Inventario'],
    ['relaciones', 'Relaciones'], ['docs', 'Documentos'],
];

const store = createMachinesStore();
const ui = { selectedId: null, tab: 'general', expanded: new Set(), query: '' };

let viewer = null;
let loadToken = 0;
let currentMachineId = null;
let replacementTarget = null;

/* ---------------------------------------------------------------
   Helpers de render
   --------------------------------------------------------------- */
const fmtDay = (d) => new Date(`${d}T00:00`).toLocaleDateString('es-MX', { dateStyle: 'medium' });
const empty = (text) => `<p class="panel-empty">${text}</p>`;

const table = (heads, rows) => rows.length
    ? `<div class="table-wrap"><table class="data-table">
        <thead><tr>${heads.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
       </table></div>`
    : '';

const statusBadge = (status) => {
    const s = STATUS[status] ?? STATUS.operativo;
    return `<span class="badge" style="--estado-color:var(${s.color})">${s.label}</span>`;
};

const stockTag = (part, needed = 0) => {
    if (!part) return '<span class="tag-error">Sin registro</span>';
    const low = part.stock < part.min || part.stock < needed;
    return `<span class="${low ? 'tag-error' : 'tag-ok'}">${part.stock}</span>`;
};

const safeUrl = (url) => (/^(https?:\/\/|\/|#)/.test(url) ? url : '#');

/* ---------------------------------------------------------------
   Árbol de estructura
   --------------------------------------------------------------- */
function renderTree() {
    const host = $('machTree');
    const root = store.root();
    const found = store.search(ui.query);

    if (!root) { host.innerHTML = ''; return; }
    if (found && !found.matches.size) { host.innerHTML = empty('Sin resultados.'); return; }

    const node = (el) => {
        if (found && !found.visible.has(el.id)) return '';

        const kids = store.children(el.id);
        const open = found ? true : ui.expanded.has(el.id);
        const selected = el.id === ui.selectedId;

        return `<li>
            <div class="tree-row">
                ${kids.length
                ? `<button type="button" class="tree-caret${open ? ' is-open' : ''}" data-toggle="${el.id}"
                        aria-expanded="${open}" aria-label="${open ? 'Contraer' : 'Expandir'}">▸</button>`
                : '<span class="tree-caret-spacer"></span>'}
                <button type="button" class="tree-item${selected ? ' is-selected' : ''}${found?.matches.has(el.id) ? ' is-match' : ''}"
                    data-select="${el.id}" aria-current="${selected}">
                    <span aria-hidden="true">${TYPE[el.type].icon}</span>
                    <span class="tree-name">${esc(el.name)}</span>
                    <span class="tree-code">${esc(el.id.slice(4))}</span>
                </button>
            </div>
            ${open && kids.length ? `<ul>${kids.map(node).join('')}</ul>` : ''}
        </li>`;
    };

    host.innerHTML = `<ul class="tree">${node(root)}</ul>`;
}

/* ---------------------------------------------------------------
   Panel de información
   --------------------------------------------------------------- */
const TAB_BODY = {
    general(el) {
        const mat = store.material(el.materialId);
        const mfr = store.manufacturer(el.manufacturerId);
        const rows = [
            ['Código', el.id],
            ['Descripción', el.description || '—'],
            ['Material', mat ? `${mat.name} (${mat.spec})` : '—'],
            ['Fabricante', mfr?.name ?? '—'],
            ['Nº de parte', el.partNumber ?? '—'],
        ];
        const missing = viewer && !viewer.has(el.id)
            ? '<p class="form-hint">Este registro no tiene un nodo en el modelo 3D.</p>' : '';

        return `<dl class="detail-list">${rows.map(([k, v]) =>
            `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>${missing}`;
    },

    materiales(el) {
        const rows = store.materialsUsed(el.id).map((r) =>
            [esc(r.material.name), esc(r.material.spec), esc(r.items.join(', '))]);
        return rows.length ? table(['Material', 'Especificación', 'Usado en'], rows) : empty('Sin materiales asignados.');
    },

    bom(el) {
        const rows = store.bom(el.id).map((r) => [
            esc(r.partNumber),
            esc(r.part?.name ?? '—'),
            r.qty,
            r.spare ? 'Sí' : '—',
            stockTag(r.part, r.qty),
        ]);
        return rows.length
            ? table(['Nº parte', 'Descripción', 'Cant.', 'Refacción', 'Stock'], rows)
            : empty('Sin lista de materiales.');
    },

    historial(el) {
        const rows = store.history(el.id).map((h) => [
            fmtDay(h.date), esc(h.removedPart), esc(h.installedPart), esc(h.reason), esc(h.technician),
        ]);
        const action = el.type === 'component'
            ? '<button type="button" class="btn btn-accent btn-sm" data-replace>+ Registrar sustitución</button>' : '';
        return `${action}${rows.length
            ? table(['Fecha', 'Retirada', 'Instalada', 'Motivo', 'Técnico'], rows)
            : empty('Sin sustituciones registradas.')}`;
    },

    inventario() {
        const rows = store.inventory().map((p) => [
            esc(p.partNumber), esc(p.name), esc(store.manufacturer(p.manufacturerId)?.name ?? '—'),
            `${stockTag(p)} / ${p.min}`, esc(p.location),
        ]);
        return table(['Nº parte', 'Pieza', 'Fabricante', 'Stock / mín.', 'Ubicación'], rows);
    },

    relaciones(el) {
        const items = store.relations(el.id).map((r) => `
            <li><button type="button" data-select="${r.other.id}">
                ${REL[r.type]?.[r.outgoing ? 0 : 1] ?? r.type} <strong>${esc(r.other.name)}</strong>
                <small>${TYPE[r.other.type].label} · ${esc(r.other.id)}</small>
            </button></li>`);
        return items.length ? `<ul class="mach-list">${items.join('')}</ul>` : empty('Sin relaciones registradas.');
    },

    docs(el) {
        const items = store.docs(el.id).map((d) => `
            <li><a class="link link-sm" href="${esc(safeUrl(d.url))}" target="_blank" rel="noopener">${esc(d.title)}</a>
            <small>${esc(d.type)}</small></li>`);
        return items.length ? `<ul class="mach-list">${items.join('')}</ul>` : empty('Sin documentación.');
    },
};

function renderInfo() {
    const host = $('machInfo');
    const el = store.element(ui.selectedId);

    if (!el) {
        host.innerHTML = `<h3 class="panel-title">Información</h3>
            ${empty('Selecciona un elemento en el modelo 3D o en la estructura.')}`;
        return;
    }

    const crumbs = store.path(el.id).slice(0, -1)
        .map((p) => `<button type="button" class="link link-sm link-muted" data-select="${p.id}">${esc(p.name)}</button>`)
        .join(' › ');

    host.innerHTML = `
        ${crumbs ? `<div class="mach-crumbs">${crumbs}</div>` : ''}
        <h3 class="mach-info-title">${esc(el.name)}</h3>
        <div class="mach-info-meta">
            <span class="badge">${TYPE[el.type].label}</span>${statusBadge(el.status)}
        </div>
        <div class="mach-tabs" role="tablist">
            ${TABS.map(([key, label]) => `<button type="button" role="tab" class="mach-tab${key === ui.tab ? ' is-active' : ''}"
                data-tab="${key}" aria-selected="${key === ui.tab}">${label}</button>`).join('')}
        </div>
        <div class="mach-tab-body" role="tabpanel">${TAB_BODY[ui.tab](el)}</div>`;
}

function renderChip() {
    const chip = $('machChip');
    const el = store.element(ui.selectedId);
    chip.hidden = !el;
    if (!el) return;

    chip.innerHTML = `<strong>${esc(el.name)}</strong>
        <button type="button" data-info>Detalle</button>
        <button type="button" data-clear aria-label="Quitar selección">✕</button>`;
}

const renderAll = () => { renderTree(); renderInfo(); renderChip(); };

/* ---------------------------------------------------------------
   Selección
   --------------------------------------------------------------- */
function select(id, { focus = false } = {}) {
    if (id && !store.element(id)) {
        toast.info(`El objeto ${id} del modelo no tiene registro en la base de datos.`);
        id = null;
    }

    ui.selectedId = id;
    if (id) for (const p of store.path(id).slice(0, -1)) ui.expanded.add(p.id);

    viewer?.select(id);
    if (focus && id) viewer?.focus(id);
    renderAll();
}

/* ---------------------------------------------------------------
   Carga de datos y modelo
   --------------------------------------------------------------- */
function setLoading(on) { $('machLoading').hidden = !on; }

function showNotice(text) {
    const box = $('machNotice');
    box.textContent = text ?? '';
    box.hidden = !text;
}

/** Compara los IDs del modelo 3D con los registros de la BD. */
function checkConsistency() {
    if (!viewer) return;
    const model = new Set(viewer.ids);
    const db = new Set(store.ids());
    const orphans = [...model].filter((id) => !db.has(id));
    const missing = [...db].filter((id) => !model.has(id));

    if (!orphans.length && !missing.length) { showNotice(null); return; }

    console.warn('[Máquinas] Modelo ↔ BD', { nodosSinRegistro: orphans, registrosSinNodo: missing });
    showNotice(`Modelo ↔ BD: ${orphans.length} nodo(s) 3D sin registro y ${missing.length} registro(s) sin nodo 3D.`);
}

async function loadMachine(id) {
    const token = ++loadToken;
    currentMachineId = id;
    setLoading(true);

    try {
        const bundle = await api.getMachineBundle(id);
        if (token !== loadToken) return;

        store.set(bundle);
        ui.selectedId = null;
        ui.tab = 'general';
        ui.query = '';
        $('machineSearch').value = '';
        ui.expanded = new Set([store.root().id, ...store.children(store.root().id).map((c) => c.id)]);
        renderAll();

        await viewer?.load(bundle.machine.modelUrl);
        if (token !== loadToken) return;
        checkConsistency();
    } catch (error) {
        console.error(error);
        toast.error('No se pudo cargar la máquina.');
    } finally {
        if (token === loadToken) setLoading(false);
    }
}

/** Recarga solo los datos (el modelo 3D no se toca). */
async function refreshData() {
    store.set(await api.getMachineBundle(currentMachineId));
    renderAll();
}

/* ---------------------------------------------------------------
   Sustituciones
   --------------------------------------------------------------- */
function openReplacement() {
    const el = store.element(ui.selectedId);
    if (!el) return;

    const bom = store.bom(el.id);
    if (!bom.length) { toast.info('Este componente no tiene piezas en su BOM.'); return; }

    replacementTarget = el.id;
    const form = $('replacementForm');
    $('replacementSubtitle').textContent = `${el.name} · ${el.id}`;
    $('rpRemoved').innerHTML = bom.map((r) =>
        `<option value="${esc(r.partNumber)}">${esc(r.partNumber)} — ${esc(r.part?.name ?? 'Sin registro')}</option>`).join('');
    $('rpInstalled').innerHTML = store.inventory().map((p) =>
        `<option value="${esc(p.partNumber)}">${esc(p.partNumber)} — ${esc(p.name)} (stock ${p.stock})</option>`).join('');

    Modals.open('replacementModal');
    form.elements.date.value = new Date().toISOString().slice(0, 10);
}

async function onReplacement(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));

    try {
        await api.registerReplacement({
            elementId: replacementTarget,
            removedPart: f.removedPart,
            installedPart: f.installedPart,
            date: f.date,
            reason: f.reason.trim(),
            technician: f.technician.trim(),
        });
        Modals.close();
        toast.success('Sustitución registrada.');
        await refreshData();
    } catch (error) {
        toast.error(error.message || 'No se pudo registrar la sustitución.');
    }
}

/* ---------------------------------------------------------------
   Arranque (diferido: solo al abrir la sección)
   --------------------------------------------------------------- */
async function start() {
    bindEvents();

    try {
        const { Viewer3D } = await import('./Viewer3D.js');
        viewer = new Viewer3D($('machViewerHost'), { onSelect: (id) => select(id) });
    } catch (error) {
        console.error(error);
        showNotice('No se pudo iniciar el visor 3D. Se muestra solo la información.');
    }

    try {
        const machines = await api.getMachines();
        $('machineSelect').innerHTML = machines.map((m) =>
            `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('');
        if (machines.length) await loadMachine(machines[0].id);
    } catch (error) {
        console.error(error);
        toast.error('No se pudo cargar la lista de máquinas.');
    }
}

function bindEvents() {
    $('machTree').addEventListener('click', (e) => {
        const toggle = e.target.closest('[data-toggle]');
        if (toggle) {
            const id = toggle.dataset.toggle;
            ui.expanded.has(id) ? ui.expanded.delete(id) : ui.expanded.add(id);
            renderTree();
            return;
        }
        const item = e.target.closest('[data-select]');
        if (item) select(item.dataset.select, { focus: true });
    });

    $('machInfo').addEventListener('click', (e) => {
        const tab = e.target.closest('[data-tab]');
        if (tab) { ui.tab = tab.dataset.tab; renderInfo(); return; }

        const item = e.target.closest('[data-select]');
        if (item) { select(item.dataset.select, { focus: true }); return; }

        if (e.target.closest('[data-replace]')) openReplacement();
    });

    $('machChip').addEventListener('click', (e) => {
        if (e.target.closest('[data-clear]')) select(null);
        if (e.target.closest('[data-info]')) $('machInfo').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    let timer;
    $('machineSearch').addEventListener('input', (e) => {
        clearTimeout(timer);
        timer = setTimeout(() => { ui.query = e.target.value; renderTree(); }, 150);
    });

    $('machineSelect').addEventListener('change', (e) => loadMachine(e.target.value));
    $('machResetView').addEventListener('click', () => viewer?.resetView());
    $('replacementForm').addEventListener('submit', onReplacement);
}

export function initMachines() {
    const section = $('section-maquinas');
    if (!section) return;

    let started = false;
    const boot = () => {
        if (started || !section.classList.contains('active')) return;
        started = true;
        observer.disconnect();
        start();
    };

    // Independiente de cómo Sections.js active la sección: observa su clase
    const observer = new MutationObserver(boot);
    observer.observe(section, { attributes: true, attributeFilter: ['class'] });
    boot();
}