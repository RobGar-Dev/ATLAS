/**
 * machines.mock.js
 * Datos de ejemplo con la MISMA forma que devolverá la API.
 * Contrato de identidad: cada elemento tiene un id `ATL-<TIPO>-<NNNN>`
 * (MCH, SEC, ASM, CMP). Ese id es el mismo que lleva el nodo 3D.
 */

const el = (id, type, parentId, name, extra = {}) => ({
    id, type, parentId, name,
    status: 'operativo',
    description: '',
    materialId: null,
    manufacturerId: null,
    partNumber: null,
    ...extra,
});

export const MOCK = {
    machines: [
        { id: 'ATL-MCH-0001', name: 'Prensa hidráulica PH-200', location: 'Nave 2', modelUrl: null },
    ],

    elements: [
        el('ATL-MCH-0001', 'machine', null, 'Prensa hidráulica PH-200',
            { description: 'Prensa de 200 t para formado de lámina.', manufacturerId: 'FAB-04' }),

        el('ATL-SEC-0001', 'section', 'ATL-MCH-0001', 'Sección de bastidor'),
        el('ATL-SEC-0002', 'section', 'ATL-MCH-0001', 'Sección hidráulica'),

        el('ATL-ASM-0001', 'assembly', 'ATL-SEC-0001', 'Conjunto de columnas'),
        el('ATL-ASM-0004', 'assembly', 'ATL-SEC-0001', 'Base y travesaño'),
        el('ATL-ASM-0002', 'assembly', 'ATL-SEC-0002', 'Grupo cilindro'),
        el('ATL-ASM-0003', 'assembly', 'ATL-SEC-0002', 'Unidad de potencia'),

        el('ATL-CMP-0001', 'component', 'ATL-ASM-0001', 'Columna izquierda',
            { materialId: 'MAT-02', manufacturerId: 'FAB-04', partNumber: 'COL-A36-3200', description: 'Columna rectificada Ø300.' }),
        el('ATL-CMP-0002', 'component', 'ATL-ASM-0001', 'Columna derecha',
            { materialId: 'MAT-02', manufacturerId: 'FAB-04', partNumber: 'COL-A36-3200', description: 'Columna rectificada Ø300.' }),
        el('ATL-CMP-0003', 'component', 'ATL-ASM-0004', 'Base',
            { materialId: 'MAT-01', manufacturerId: 'FAB-04', description: 'Base soldada y estabilizada.' }),
        el('ATL-CMP-0008', 'component', 'ATL-ASM-0004', 'Travesaño',
            { materialId: 'MAT-01', manufacturerId: 'FAB-04' }),
        el('ATL-CMP-0004', 'component', 'ATL-ASM-0002', 'Cilindro principal',
            { status: 'revision', materialId: 'MAT-03', manufacturerId: 'FAB-03', description: 'Cilindro de doble efecto Ø63.' }),
        el('ATL-CMP-0005', 'component', 'ATL-ASM-0002', 'Vástago',
            { materialId: 'MAT-02', manufacturerId: 'FAB-03' }),
        el('ATL-CMP-0006', 'component', 'ATL-ASM-0003', 'Motor eléctrico',
            { manufacturerId: 'FAB-02', partNumber: 'WEG-W22-15HP', description: 'Motor trifásico 15 HP.' }),
        el('ATL-CMP-0007', 'component', 'ATL-ASM-0003', 'Bomba hidráulica',
            { manufacturerId: 'FAB-01', partNumber: 'RX-A4VG-71', description: 'Bomba de pistones axiales.' }),
    ],

    materials: [
        { id: 'MAT-01', name: 'Acero ASTM A36', spec: 'Estructural, Fy 250 MPa' },
        { id: 'MAT-02', name: 'Acero 4140 cromado', spec: 'Templado y revenido' },
        { id: 'MAT-03', name: 'Hierro fundido GG25', spec: 'Fundición gris' },
    ],

    manufacturers: [
        { id: 'FAB-01', name: 'Bosch Rexroth' },
        { id: 'FAB-02', name: 'WEG' },
        { id: 'FAB-03', name: 'Parker' },
        { id: 'FAB-04', name: 'Fabricación interna' },
    ],

    // Lista de materiales por elemento (spare = es refacción)
    bom: [
        { elementId: 'ATL-CMP-0001', partNumber: 'COL-A36-3200', qty: 1, spare: false },
        { elementId: 'ATL-CMP-0002', partNumber: 'COL-A36-3200', qty: 1, spare: false },
        { elementId: 'ATL-CMP-0004', partNumber: 'PK-SEAL-KIT-63', qty: 1, spare: true },
        { elementId: 'ATL-CMP-0004', partNumber: 'TOR-M20-129', qty: 8, spare: false },
        { elementId: 'ATL-CMP-0006', partNumber: 'WEG-W22-15HP', qty: 1, spare: true },
        { elementId: 'ATL-CMP-0007', partNumber: 'RX-A4VG-71', qty: 1, spare: true },
    ],

    inventory: [
        { partNumber: 'COL-A36-3200', name: 'Columna acero Ø300', manufacturerId: 'FAB-04', stock: 1, min: 1, location: 'Almacén A-01' },
        { partNumber: 'PK-SEAL-KIT-63', name: 'Kit de sellos Ø63', manufacturerId: 'FAB-03', stock: 4, min: 2, location: 'Almacén A-02' },
        { partNumber: 'TOR-M20-129', name: 'Tornillo M20 grado 12.9', manufacturerId: 'FAB-04', stock: 40, min: 16, location: 'Almacén B-11' },
        { partNumber: 'WEG-W22-15HP', name: 'Motor W22 15 HP', manufacturerId: 'FAB-02', stock: 0, min: 1, location: 'Almacén C-01' },
        { partNumber: 'RX-A4VG-71', name: 'Bomba A4VG 71', manufacturerId: 'FAB-01', stock: 1, min: 1, location: 'Almacén C-03' },
    ],

    history: [
        { id: 'HIS-0001', elementId: 'ATL-CMP-0004', date: '2026-08-14', removedPart: 'PK-SEAL-KIT-63', installedPart: 'PK-SEAL-KIT-63', reason: 'Fuga en sellos', technician: 'J. Pérez' },
        { id: 'HIS-0002', elementId: 'ATL-CMP-0007', date: '2026-05-02', removedPart: 'RX-A4VG-71', installedPart: 'RX-A4VG-71', reason: 'Desgaste por horas de uso', technician: 'M. Ruiz' },
    ],

    // type: alimenta | acciona | soporta | depende  (from → to)
    relations: [
        { id: 'REL-0001', from: 'ATL-CMP-0006', to: 'ATL-CMP-0007', type: 'acciona' },
        { id: 'REL-0002', from: 'ATL-CMP-0007', to: 'ATL-CMP-0004', type: 'alimenta' },
        { id: 'REL-0003', from: 'ATL-CMP-0005', to: 'ATL-CMP-0004', type: 'depende' },
        { id: 'REL-0004', from: 'ATL-ASM-0001', to: 'ATL-ASM-0004', type: 'soporta' },
    ],

    docs: [
        { id: 'DOC-0001', elementId: 'ATL-MCH-0001', title: 'Manual de operación', type: 'Manual', url: '#' },
        { id: 'DOC-0002', elementId: 'ATL-CMP-0004', title: 'Ficha técnica del cilindro', type: 'Ficha técnica', url: '#' },
        { id: 'DOC-0003', elementId: 'ATL-CMP-0007', title: 'Plano de instalación', type: 'Plano', url: '#' },
    ],
};