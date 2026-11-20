/* =========================================================
   Общий 3D-набор для демо-сайтов SiteCode (three.js r165)
   Сцена, загрузка моделей, ключевые кадры и прогресс прокрутки
   ========================================================= */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export { THREE };
export const small = window.matchMedia('(max-width: 760px)').matches;
export const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

/* Ключевые кадры: [[t, значение], ...], значение — число или массив чисел */
export function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1];
      const [t1, v1] = keys[i];
      const k = ease(clamp((t - t0) / Math.max(1e-6, t1 - t0)));
      return Array.isArray(v0) ? v0.map((a, j) => a + (v1[j] - a) * k) : v0 + (v1 - v0) * k;
    }
  }
  return keys[keys.length - 1][1];
}

/* Прогресс высокой секции с липким экраном: 0 — верх секции у верха окна, 1 — конец */
export function progressOf(section) {
  const r = section.getBoundingClientRect();
  return clamp(-r.top / Math.max(1, r.height - window.innerHeight));
}

/* Номер активной сцены по прогрессу и границам */
export function sceneAt(p, marks) {
  let i = 0;
  while (i < marks.length - 1 && p >= marks[i + 1]) i++;
  return i;
}

/* Сцена: рендерер, окружение-студия, камера, цикл кадров только пока холст виден */
export function createStage(canvas, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.maxDpr || (small ? 1.5 : 1.6)));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = opts.exposure ?? 1;
  if (opts.shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  if (opts.envIntensity != null) scene.environmentIntensity = opts.envIntensity;
  const camera = new THREE.PerspectiveCamera(opts.fov ?? 35, 1, 0.05, 300);

  const ticks = [];
  const resizers = [];
  const size = { w: 1, h: 1 };
  const resize = () => {
    size.w = canvas.clientWidth || window.innerWidth;
    size.h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(size.w, size.h, false);
    camera.aspect = size.w / size.h;
    camera.updateProjectionMatrix();
    resizers.forEach((f) => f(size));
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  // курсор в диапазоне −1..1, сглаженный
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, cx: -1, cy: -1, inside: false };
  window.addEventListener('pointermove', (e) => {
    pointer.tx = e.clientX / window.innerWidth * 2 - 1;
    pointer.ty = e.clientY / window.innerHeight * 2 - 1;
    pointer.cx = e.clientX;
    pointer.cy = e.clientY;
  }, { passive: true });

  let visible = true;
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { rootMargin: '120px 0px' }).observe(canvas);
  let last = performance.now();
  let time = 0;
  const loop = (now) => {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!visible || document.hidden) return;
    time += still ? 0 : dt;
    pointer.x = damp(pointer.x, pointer.tx, 4, dt);
    pointer.y = damp(pointer.y, pointer.ty, 4, dt);
    for (let i = 0; i < ticks.length; i++) ticks[i](dt, time);
    renderer.render(scene, camera);
  };
  requestAnimationFrame(loop);

  return {
    THREE, renderer, scene, camera, pointer, size,
    onTick: (f) => ticks.push(f),
    onResize: (f) => { resizers.push(f); f(size); },
    /* экранные координаты точки сцены — для подписей с линиями */
    toScreen(v, out = { x: 0, y: 0, behind: false }) {
      const p = v.clone().project(camera);
      out.x = (p.x * 0.5 + 0.5) * size.w;
      out.y = (-p.y * 0.5 + 0.5) * size.h;
      out.behind = p.z > 1;
      return out;
    }
  };
}

/* Загрузка GLB (со сжатием Draco) */
let loader = null;
export function loadModel(url) {
  if (!loader) {
    const draco = new DRACOLoader();
    draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/libs/draco/gltf/');
    loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
  }
  return loader.loadAsync(url);
}

/* Текстура из холста: подписи на кольце, этикетки, рисунок кожи */
export function canvasTexture(w, h, draw, opts = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opts.data ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (opts.repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(opts.repeat[0], opts.repeat[1]);
  }
  return t;
}

/* Мягкая тень-пятно под объектом */
export function blobShadow(radius = 1, opacity = 0.45) {
  const tex = canvasTexture(256, 256, (g, w, h) => {
    const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    r.addColorStop(0, 'rgba(0,0,0,1)');
    r.addColorStop(0.5, 'rgba(0,0,0,.45)');
    r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, w, h);
  });
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, depthWrite: false, toneMapped: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 1;
  return m;
}

/* Подписи с линиями, привязанные к точкам 3D-сцены */
export function callouts(stage, svg, items) {
  const pt = { x: 0, y: 0 };
  const lines = items.map(() => {
    const l = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svg.appendChild(l);
    return l;
  });
  return (alpha) => {
    const W = stage.size.w;
    items.forEach((it, i) => {
      stage.toScreen(it.anchor(), pt);
      const el = it.el;
      const bw = el.offsetWidth;
      const bh = el.offsetHeight;
      const dx = it.dx * (W < 760 ? 0.45 : 1);
      const dy = it.dy * (W < 760 ? 0.6 : 1);
      let lx = pt.x + dx;
      const ly = pt.y + dy;
      lx = Math.max(12 + (dx < 0 ? bw : 0), Math.min(W - 12 - (dx < 0 ? 0 : bw), lx));
      el.style.transform = 'translate(' + (dx < 0 ? lx - bw : lx).toFixed(1) + 'px,' + (ly - bh / 2).toFixed(1) + 'px)';
      el.style.opacity = alpha.toFixed(3);
      el.style.pointerEvents = alpha > 0.5 ? 'auto' : 'none';
      const ex = dx < 0 ? lx : lx;
      lines[i].setAttribute('d', 'M' + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1) + 'L' + ex.toFixed(1) + ' ' + ly.toFixed(1));
      lines[i].style.opacity = alpha.toFixed(3);
    });
  };
}
