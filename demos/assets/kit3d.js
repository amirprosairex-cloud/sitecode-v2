/* =========================================================
   Общий 3D-набор для демо-сайтов SiteCode (three.js r165)
   Сцена, загрузка моделей, ключевые кадры и прогресс прокрутки
   ========================================================= */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { small, still, damp } from './ui.js';

export { THREE };
export * from './ui.js';

/* Студия для отражений: тёмная комната и яркие софтбоксы — лак и хром получают «живые» блики */
export function studioScene(accent = 0xffffff) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(30, 24, 12), new THREE.MeshBasicMaterial({ color: 0x0b0b0d, side: THREE.BackSide })));
  const panel = (w, h, pos, rot, k, color = 0xffffff) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(pos[0], pos[1], pos[2]);
    m.rotation.set(rot[0], rot[1], rot[2]);
    s.add(m);
  };
  panel(16, 6, [0, 10, 0], [Math.PI / 2, 0, 0], 2.6);
  panel(1.6, 12, [-10, 4, 0], [0, Math.PI / 2, 0], 3.4);
  panel(1.6, 12, [10, 4, 0], [0, -Math.PI / 2, 0], 3.4);
  panel(14, 1.4, [0, 2.6, -12], [0, 0, 0], 2.2);
  panel(14, 1.4, [0, 2.6, 12], [0, Math.PI, 0], 1.6);
  panel(7, 1.2, [9, 0.8, -7], [0, -Math.PI / 3, 0], 2.4, accent);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ color: 0x202024 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.5;
  s.add(floor);
  return s;
}

/* Сцена: рендерер, окружение, камера, цикл кадров только пока холст виден.
   Рисовать начинает только после ready(): шейдеры собираются заранее, анимация не дёргается.
   Чёткость подстраивается под мощность устройства, чтобы держать плавные 60 кадров. */
export function createStage(canvas, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  // ?hq — полная чёткость без подстройки (для снимков-постеров)
  const hq = new URLSearchParams(location.search).has('hq');
  const maxDpr = hq ? (window.devicePixelRatio || 1) : Math.min(window.devicePixelRatio || 1, opts.maxDpr || (small ? 1.3 : 1.5));
  const minDpr = hq ? maxDpr : (opts.minDpr || 0.75);
  let dpr = maxDpr;
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = opts.exposure ?? 1;
  if (opts.shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
  const scene = new THREE.Scene();
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

  // окружение и предварительная сборка шейдеров
  let started = false;
  const ready = async () => {
    if (opts.env !== false) {
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(opts.envScene || new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
      if (opts.envIntensity != null) scene.environmentIntensity = opts.envIntensity;
    }
    try { await renderer.compileAsync(scene, camera); } catch (e) { /* старые браузеры соберут при первом кадре */ }
    started = true;
  };

  // подстройка чёткости по реальной скорости кадров
  let acc = 0;
  let frames = 0;
  let cool = 0;
  const adapt = (dt) => {
    acc += dt;
    frames += 1;
    cool = Math.max(0, cool - dt);
    if (acc < 1 || cool > 0) return;
    const avg = acc / frames;
    acc = 0;
    frames = 0;
    let next = dpr;
    if (avg > 0.024) next = Math.max(minDpr, dpr - 0.2);
    else if (avg < 0.0145 && dpr < maxDpr) next = Math.min(maxDpr, dpr + 0.1);
    if (next !== dpr) {
      dpr = next;
      renderer.setPixelRatio(dpr);
      resize();
      cool = 1.5;
    }
  };

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
    const raw = (now - last) / 1000;
    const dt = Math.min(0.05, raw);
    last = now;
    if (!visible || document.hidden || !started) return;
    time += still ? 0 : dt;
    pointer.x = damp(pointer.x, pointer.tx, 4, dt);
    pointer.y = damp(pointer.y, pointer.ty, 4, dt);
    for (let i = 0; i < ticks.length; i++) ticks[i](dt, time);
    renderer.render(scene, camera);
    if (raw < 0.2) adapt(raw);
  };
  requestAnimationFrame(loop);

  return {
    THREE, renderer, scene, camera, pointer, size, ready,
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

/* Загрузка GLB (со сжатием Draco): загрузчик подтягивается только там, где есть модели */
let loader = null;
export async function loadModel(url) {
  if (!loader) {
    const [{ GLTFLoader }, { DRACOLoader }] = await Promise.all([
      import('three/addons/loaders/GLTFLoader.js'),
      import('three/addons/loaders/DRACOLoader.js')
    ]);
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
