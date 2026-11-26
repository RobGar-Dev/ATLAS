/**
 * Viewer3D.js
 * Visor Three.js desacoplado de la app: recibe un contenedor y callbacks.
 *
 * Contrato de identidad: un nodo 3D es "de negocio" si tiene
 *   userData.atlas_id  (en Blender: custom property `atlas_id`, exportada
 *                        como glTF extras), o
 *   un `name` con formato ATL-XXX-0000.
 *
 * Rendimiento:
 *  - Render bajo demanda (cero GPU en reposo, cuida batería en teléfonos).
 *  - Pixel ratio limitado a 2.
 *  - Geometrías/materiales se liberan en dispose().
 *  - Soporta GLB comprimido con Draco.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { buildDemoModel } from './DemoModel.js';

const ATLAS_ID = /^ATL-[A-Z]{3}-\d{4,}$/;
const DRACO_PATH = 'https://www.gstatic.com/draco/versions/draco1_5_0/'; // mejor alojarlo local
const CLICK_TOLERANCE = 5; // px: más que esto cuenta como arrastre
const SELECT_COLOR = 0x2a835f;
const HOVER_COLOR = 0x3d8fa3;

const idOf = (obj) => obj.userData?.atlas_id ?? (ATLAS_ID.test(obj.name) ? obj.name : null);

export class Viewer3D {
    #host;
    #cb;
    #renderer;
    #scene = new THREE.Scene();
    #camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    #controls;
    #raycaster = new THREE.Raycaster();
    #pointer = new THREE.Vector2();
    #observer;

    #model = null;
    #nodes = new Map();
    #meshes = [];
    #home = null;

    #selectBox = new THREE.Box3Helper(new THREE.Box3(), SELECT_COLOR);
    #hoverBox = new THREE.Box3Helper(new THREE.Box3(), HOVER_COLOR);
    #selectedId = null;
    #hoveredId = null;

    #frame = 0;
    #hoverFrame = 0;
    #tween = null;
    #down = null;
    #disposed = false;

    /**
     * @param {HTMLElement} host
     * @param {{ onSelect?: (id: string|null) => void }} callbacks
     */
    constructor(host, callbacks = {}) {
        this.#host = host;
        this.#cb = callbacks;

        this.#renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        host.appendChild(this.#renderer.domElement);

        this.#scene.add(new THREE.HemisphereLight(0xffffff, 0x445555, 1.1));
        const sun = new THREE.DirectionalLight(0xffffff, 1.6);
        sun.position.set(5, 10, 7);
        this.#scene.add(sun);

        const grid = new THREE.GridHelper(20, 20, 0x7b8b88, 0xc8d9d2);
        grid.material.transparent = true;
        grid.material.opacity = 0.5;
        this.#scene.add(grid);

        this.#selectBox.visible = false;
        this.#hoverBox.visible = false;
        this.#scene.add(this.#selectBox, this.#hoverBox);

        this.#controls = new OrbitControls(this.#camera, this.#renderer.domElement);
        this.#controls.screenSpacePanning = true;
        this.#controls.addEventListener('change', this.#request);

        const canvas = this.#renderer.domElement;
        canvas.addEventListener('pointerdown', this.#onDown);
        canvas.addEventListener('pointerup', this.#onUp);
        canvas.addEventListener('pointermove', this.#onMove);
        canvas.addEventListener('pointerleave', () => this.#setHover(null));

        // Se redimensiona solo, incluso cuando la sección pasa de oculta a visible
        this.#observer = new ResizeObserver(this.#resize);
        this.#observer.observe(host);
        this.#resize();
    }

    /* ---------------------------------------------------------------
       API pública
       --------------------------------------------------------------- */

    /** IDs de negocio presentes en el modelo cargado. */
    get ids() {
        return [...this.#nodes.keys()];
    }

    has(id) {
        return this.#nodes.has(id);
    }

    /** Carga un .glb (con o sin Draco). Sin url usa el modelo de demostración. */
    async load(url) {
        this.#clearModel();

        let root;
        if (url) {
            const loader = new GLTFLoader();
            const draco = new DRACOLoader();
            draco.setDecoderPath(DRACO_PATH);
            loader.setDRACOLoader(draco);
            try {
                root = (await loader.loadAsync(url)).scene;
            } finally {
                draco.dispose();
            }
        } else {
            root = buildDemoModel();
        }
        if (this.#disposed) return;

        this.#model = root;
        this.#scene.add(root);
        this.#index(root);
        this.#frameModel();
    }

    select(id) {
        this.#selectedId = id;
        const node = id ? this.#nodes.get(id) : null;

        if (node) {
            this.#selectBox.box.setFromObject(node);
            this.#selectBox.visible = true;
        } else {
            this.#selectBox.visible = false;
        }
        this.#setHover(this.#hoveredId); // refresca para no duplicar con el hover
        this.#request();
        return Boolean(node);
    }

    focus(id) {
        const node = this.#nodes.get(id);
        if (!node) return;

        const box = new THREE.Box3().setFromObject(node);
        const center = box.getCenter(new THREE.Vector3());
        const radius = box.getBoundingSphere(new THREE.Sphere()).radius;
        const distance = Math.max(radius * 2.8, 1);

        const dir = this.#camera.position.clone().sub(this.#controls.target).normalize();
        this.#animateTo(center.clone().add(dir.multiplyScalar(distance)), center);
    }

    resetView() {
        if (this.#home) this.#animateTo(this.#home.position.clone(), this.#home.target.clone());
    }

    dispose() {
        this.#disposed = true;
        cancelAnimationFrame(this.#frame);
        cancelAnimationFrame(this.#hoverFrame);
        this.#observer.disconnect();
        this.#controls.dispose();
        this.#clearModel();
        this.#renderer.dispose();
        this.#renderer.domElement.remove();
    }

    /* ---------------------------------------------------------------
       Internos
       --------------------------------------------------------------- */

    #index(root) {
        root.updateMatrixWorld(true);
        root.traverse((obj) => {
            const id = idOf(obj);
            if (id) {
                if (this.#nodes.has(id)) console.warn(`[Viewer3D] ID duplicado en el modelo: ${id}`);
                else this.#nodes.set(id, obj);
            }
            if (obj.isMesh) this.#meshes.push(obj);
        });
    }

    #frameModel() {
        const box = new THREE.Box3().setFromObject(this.#model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const fov = THREE.MathUtils.degToRad(this.#camera.fov);
        const distance = (maxDim / (2 * Math.tan(fov / 2))) * 1.8;

        this.#camera.position.copy(center).add(new THREE.Vector3(1, 0.7, 1).normalize().multiplyScalar(distance));
        this.#camera.near = distance / 100;
        this.#camera.far = distance * 100;
        this.#camera.updateProjectionMatrix();
        this.#controls.target.copy(center);
        this.#controls.update();

        this.#home = { position: this.#camera.position.clone(), target: center.clone() };
        this.#request();
    }

    #clearModel() {
        this.select(null);
        this.#hoveredId = null;
        this.#hoverBox.visible = false;

        if (this.#model) {
            this.#scene.remove(this.#model);
            this.#model.traverse((obj) => {
                if (!obj.isMesh) return;
                obj.geometry?.dispose();
                const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                for (const m of mats) {
                    for (const v of Object.values(m)) if (v?.isTexture) v.dispose();
                    m.dispose();
                }
            });
        }
        this.#model = null;
        this.#nodes.clear();
        this.#meshes.length = 0;
    }

    #pick(e) {
        const rect = this.#renderer.domElement.getBoundingClientRect();
        this.#pointer.set(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1,
        );
        this.#raycaster.setFromCamera(this.#pointer, this.#camera);

        const hit = this.#raycaster.intersectObjects(this.#meshes, false)[0];
        if (!hit) return null;

        for (let o = hit.object; o; o = o.parent) {
            const id = idOf(o);
            if (id) return id;
        }
        return null;
    }

    #setHover(id) {
        this.#hoveredId = id;
        const node = id && id !== this.#selectedId ? this.#nodes.get(id) : null;
        if (node) {
            this.#hoverBox.box.setFromObject(node);
            this.#hoverBox.visible = true;
        } else {
            this.#hoverBox.visible = false;
        }
        this.#renderer.domElement.style.cursor = id ? 'pointer' : '';
        this.#request();
    }

    #onDown = (e) => {
        this.#down = { x: e.clientX, y: e.clientY };
    };

    #onUp = (e) => {
        if (!this.#down || e.button !== 0) return;
        const moved = Math.hypot(e.clientX - this.#down.x, e.clientY - this.#down.y);
        this.#down = null;
        if (moved > CLICK_TOLERANCE) return; // fue un arrastre (rotar/mover)

        this.#cb.onSelect?.(this.#pick(e));
    };

    #onMove = (e) => {
        if (e.pointerType !== 'mouse' || e.buttons || this.#hoverFrame) return;
        this.#hoverFrame = requestAnimationFrame(() => {
            this.#hoverFrame = 0;
            const id = this.#pick(e);
            if (id !== this.#hoveredId) this.#setHover(id);
        });
    };

    #resize = () => {
        const { clientWidth: w, clientHeight: h } = this.#host;
        if (!w || !h) return; // sección oculta
        this.#renderer.setSize(w, h, false);
        this.#camera.aspect = w / h;
        this.#camera.updateProjectionMatrix();
        this.#request();
    };

    #animateTo(position, target) {
        this.#tween = {
            t0: performance.now(),
            duration: 450,
            p0: this.#camera.position.clone(),
            c0: this.#controls.target.clone(),
            p1: position,
            c1: target,
        };
        this.#request();
    }

    #request = () => {
        if (!this.#frame && !this.#disposed) this.#frame = requestAnimationFrame(this.#render);
    };

    #render = () => {
        this.#frame = 0;
        if (this.#disposed) return;

        if (this.#tween) {
            const t = this.#tween;
            const k = Math.min((performance.now() - t.t0) / t.duration, 1);
            const eased = 1 - Math.pow(1 - k, 3);
            this.#camera.position.lerpVectors(t.p0, t.p1, eased);
            this.#controls.target.lerpVectors(t.c0, t.c1, eased);
            this.#controls.update();
            if (k >= 1) this.#tween = null;
            else this.#request();
        }

        this.#renderer.render(this.#scene, this.#camera);
    };
}