/**
 * MachinesApi.js
 * ÚNICO punto de acceso a datos de la sección. Hoy usa el mock; para pasar
 * al backend pon USE_MOCK = false y cambia http() por tu apiFetch().
 *
 * Endpoints sugeridos:
 *   GET  /api/maquinas                         → lista de máquinas
 *   GET  /api/maquinas/:id                     → bundle (ver getMachineBundle)
 *   POST /api/maquinas/elementos/:id/sustituciones
 */

import { MOCK } from './../mocks/machines.mock.js';

const USE_MOCK = true;
const API_BASE = '/api/maquinas';

const db = structuredClone(MOCK);
const delay = (value, ms = 150) => new Promise((resolve) => setTimeout(() => resolve(value), ms));

async function http(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function getMachines() {
    if (!USE_MOCK) return http('');
    return delay(structuredClone(db.machines));
}

/**
 * Todo lo necesario para pintar una máquina:
 * { machine, elements, materials, manufacturers, bom, inventory, history, relations, docs }
 */
export async function getMachineBundle(machineId) {
    if (!USE_MOCK) return http(`/${encodeURIComponent(machineId)}`);

    const machine = db.machines.find((m) => m.id === machineId);
    if (!machine) throw new Error('Máquina no encontrada');

    const { machines, ...rest } = db;
    return delay(structuredClone({ machine, ...rest }));
}

export async function registerReplacement(payload) {
    if (!USE_MOCK) {
        return http(`/elementos/${encodeURIComponent(payload.elementId)}/sustituciones`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    const part = db.inventory.find((p) => p.partNumber === payload.installedPart);
    if (!part || part.stock < 1) throw new Error('No hay existencias de la pieza a instalar.');

    part.stock -= 1;
    const entry = { id: `HIS-${String(db.history.length + 1).padStart(4, '0')}`, ...payload };
    db.history.push(entry);
    return delay(structuredClone(entry));
}