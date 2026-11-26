/**
 * DemoModel.js
 * Modelo procedural con IDs ATL-* para probar el visor sin un .glb.
 * Cuando una máquina tenga `modelUrl`, este archivo ya no se usa.
 */

import * as THREE from 'three';

export function buildDemoModel() {
    const steel = new THREE.MeshStandardMaterial({ color: 0x8fa3a0, metalness: 0.6, roughness: 0.45 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2f4a4a, metalness: 0.4, roughness: 0.6 });
    const teal = new THREE.MeshStandardMaterial({ color: 0x3d8fa3, metalness: 0.5, roughness: 0.4 });

    const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
    const cyl = (r, h) => new THREE.CylinderGeometry(r, r, h, 32);

    const part = (id, geometry, material, [x, y, z], rotZ = 0) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = id;
        mesh.userData.atlas_id = id;
        mesh.position.set(x, y, z);
        mesh.rotation.z = rotZ;
        return mesh;
    };

    const group = (id, ...children) => {
        const g = new THREE.Group();
        g.name = id;
        g.userData.atlas_id = id;
        g.add(...children);
        return g;
    };

    const column = cyl(0.15, 3.2); // geometría compartida entre ambas columnas

    return group('ATL-MCH-0001',
        group('ATL-SEC-0001',
            group('ATL-ASM-0001',
                part('ATL-CMP-0001', column, steel, [-1.6, 2.0, 0]),
                part('ATL-CMP-0002', column, steel, [1.6, 2.0, 0])),
            group('ATL-ASM-0004',
                part('ATL-CMP-0003', box(4.4, 0.4, 3), dark, [0, 0.2, 0]),
                part('ATL-CMP-0008', box(4.4, 0.4, 1.2), dark, [0, 3.8, 0]))),
        group('ATL-SEC-0002',
            group('ATL-ASM-0002',
                part('ATL-CMP-0004', cyl(0.45, 1.2), teal, [0, 4.6, 0]),
                part('ATL-CMP-0005', cyl(0.12, 1.4), steel, [0, 3.3, 0])),
            group('ATL-ASM-0003',
                part('ATL-CMP-0006', cyl(0.35, 1), teal, [3.2, 0.35, 0.6], Math.PI / 2),
                part('ATL-CMP-0007', box(0.7, 0.7, 0.7), dark, [3.2, 0.35, -0.6]))));
}