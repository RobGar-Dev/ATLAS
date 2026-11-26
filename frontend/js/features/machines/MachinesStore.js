/**
 * MachinesStore.js
 * Estado de la máquina cargada + consultas (jerarquía, BOM, búsqueda).
 * No toca el DOM ni Three.js.
 */

export function createMachinesStore() {
    let raw = null;
    let byId = new Map();
    let childrenOf = new Map();
    let parts = new Map();
    let materials = new Map();
    let manufacturers = new Map();

    function set(bundle) {
        raw = bundle;
        byId = new Map(bundle.elements.map((e) => [e.id, e]));
        parts = new Map(bundle.inventory.map((p) => [p.partNumber, p]));
        materials = new Map(bundle.materials.map((m) => [m.id, m]));
        manufacturers = new Map(bundle.manufacturers.map((m) => [m.id, m]));

        childrenOf = new Map();
        for (const e of bundle.elements) {
            if (!e.parentId) continue;
            if (!childrenOf.has(e.parentId)) childrenOf.set(e.parentId, []);
            childrenOf.get(e.parentId).push(e);
        }
        for (const list of childrenOf.values()) list.sort((a, b) => a.id.localeCompare(b.id));
    }

    const element = (id) => byId.get(id);
    const children = (id) => childrenOf.get(id) ?? [];
    const root = () => raw?.elements.find((e) => !e.parentId) ?? null;
    const ids = () => [...byId.keys()];

    /** Ruta desde la raíz hasta el elemento (incluido). */
    function path(id) {
        const out = [];
        for (let e = byId.get(id); e; e = byId.get(e.parentId)) out.unshift(e);
        return out;
    }

    /** El elemento y todos sus descendientes. */
    function subtree(id) {
        const out = [id];
        for (const child of children(id)) out.push(...subtree(child.id));
        return out;
    }

    /** BOM agregada del elemento y sus descendientes. */
    function bom(id) {
        const scope = new Set(subtree(id));
        const rows = new Map();
        for (const b of raw.bom) {
            if (!scope.has(b.elementId)) continue;
            const row = rows.get(b.partNumber) ?? { partNumber: b.partNumber, qty: 0, spare: false };
            row.qty += b.qty;
            row.spare ||= b.spare;
            rows.set(b.partNumber, row);
        }
        return [...rows.values()].map((r) => ({ ...r, part: parts.get(r.partNumber) ?? null }));
    }

    function materialsUsed(id) {
        const out = new Map();
        for (const eid of subtree(id)) {
            const e = byId.get(eid);
            if (!e?.materialId) continue;
            const row = out.get(e.materialId) ?? { material: materials.get(e.materialId), items: [] };
            row.items.push(e.name);
            out.set(e.materialId, row);
        }
        return [...out.values()].filter((r) => r.material);
    }

    function history(id) {
        const scope = new Set(subtree(id));
        return raw.history
            .filter((h) => scope.has(h.elementId))
            .sort((a, b) => b.date.localeCompare(a.date));
    }

    function relations(id) {
        return raw.relations
            .filter((r) => r.from === id || r.to === id)
            .map((r) => ({
                id: r.id,
                type: r.type,
                outgoing: r.from === id,
                other: byId.get(r.from === id ? r.to : r.from),
            }))
            .filter((r) => r.other);
    }

    const docs = (id) => raw.docs.filter((d) => d.elementId === id);

    /** null si no hay búsqueda; si hay: elementos visibles (con ancestros) y coincidencias. */
    function search(query) {
        const term = query.trim().toLowerCase();
        if (!term) return null;

        const visible = new Set();
        const matches = new Set();
        for (const e of byId.values()) {
            const haystack = `${e.id} ${e.name} ${e.partNumber ?? ''}`.toLowerCase();
            if (!haystack.includes(term)) continue;
            matches.add(e.id);
            for (const p of path(e.id)) visible.add(p.id);
        }
        return { visible, matches };
    }

    return {
        set, element, children, root, ids, path, subtree, bom, materialsUsed, history, relations, docs, search,
        inventory: () => raw.inventory,
        part: (pn) => parts.get(pn) ?? null,
        material: (id) => materials.get(id) ?? null,
        manufacturer: (id) => manufacturers.get(id) ?? null,
    };
}