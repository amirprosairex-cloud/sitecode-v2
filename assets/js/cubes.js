/* =========================================================
   SiteCode — 3D-кубики
   Кубики собираются в шар, потом в сайт, телефон и логотип,
   в зависимости от того, где сейчас прокрутка.
   ========================================================= */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const root = document.documentElement;
const canvas = document.getElementById('cubes');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (e) {
    return false;
  }
}

// сцена собирается по сигналу: во время заставки — пока логотип стоит, без неё — сразу
let booted = false;
const go = () => {
  if (booted) return;
  booted = true;
  try {
    boot();
  } catch (err) {
    console.warn('[cubes]', err);
    root.classList.add('no-cubes');
    root.classList.remove('cubes-on');
  }
};
if (!canvas || reduceMotion || !hasWebGL()) {
  root.classList.add('no-cubes');
} else if (window.__scBoot || window.__scReady) {
  go();
} else {
  window.addEventListener('sc:boot', go, { once: true });
  window.addEventListener('sc:ready', go, { once: true });
}

function boot() {
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const easeIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);

  /* ---------- Цвета кубиков ---------- */
  const HEX = {
    w: '#F4F6FB', // белый
    n: '#16215A', // тёмно-синий
    b: '#2E62FF', // фирменный синий
    l: '#B5C8FF', // светло-голубой
    s: '#FFC233', // жёлтый
    g: '#D4DAE6', // серый
    r: '#FF5F57', // красная точка окна
    y: '#FEBC2E', // жёлтая точка окна
    e: '#25C35A', // зелёный (WhatsApp)
    k: '#0F1733', // почти чёрный
    m: '#8B9FDB', // приглушённый синий
    v: '#2348D6', // насыщенный синий для слова Code
    x: '#2E62FF', // скобки логотипа — зависят от темы
    z: '#16215A'  // черта логотипа — зависит от темы
  };
  const PAL = {};
  Object.keys(HEX).forEach((k) => { PAL[k] = new THREE.Color(HEX[k]); });
  // логотип как иконка: на светлом фоне синие скобки и тёмная черта, на ночном — белые скобки и синяя черта
  const logoColors = () => {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    PAL.x.set(dark ? '#F4F6FB' : '#2E62FF');
    PAL.z.set(dark ? '#2E62FF' : '#16215A');
  };
  logoColors();
  window.addEventListener('sc:theme', logoColors);

  const small = window.innerWidth < 760;
  const N = small ? 460 : 960;
  const DMAX = 0.38;

  /* ---------- Случайные числа (одинаковые при каждой загрузке) ---------- */
  let seed = 20261119;
  const rnd = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const R1 = new Float32Array(N);
  const R2 = new Float32Array(N);
  const R3 = new Float32Array(N);
  const R4 = new Float32Array(N);
  const delay = new Float32Array(N);
  const arc = new Float32Array(N);
  const axis = [];
  for (let i = 0; i < N; i++) {
    R1[i] = rnd(); R2[i] = rnd(); R3[i] = rnd(); R4[i] = rnd();
    axis.push(new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize());
    delay[i] = rnd() * DMAX;
    arc[i] = 0.8 + rnd() * 2.6;
  }

  /* ---------- Сцена ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  // чёткость: на старте умеренная, дальше подстраивается под скорость кадров
  const maxDpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75);
  let dpr = maxDpr;
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping !== undefined ? THREE.NeutralToneMapping : THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 300);
  camera.position.set(0, 0, 34);

  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(-8, 12, 14);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xc9d6ff, 0.6);
  rim.position.set(10, -6, 6);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, 0.2));

  const geometry = new RoundedBoxGeometry(1, 1, 1, 3, 0.16);
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.32, metalness: 0.02, envMapIntensity: 0.85 });
  const mesh = new THREE.InstancedMesh(geometry, material, N);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  const startColor = new THREE.Color(1, 1, 1);
  for (let i = 0; i < N; i++) mesh.setColorAt(i, startColor);
  mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);

  /* ---------- Общие временные объекты ---------- */
  const V = new THREE.Vector3();
  const NRM = new THREE.Vector3();
  const ZAXIS = new THREE.Vector3(0, 0, 1);
  const view = { w: 1, h: 1, W: 1, H: 1 };

  /* ---------- Облако: кубики, которые сейчас не нужны, висят далеко сзади ---------- */
  const cloud = (() => {
    const base = new Float32Array(N * 3);
    const size = new Float32Array(N);
    return {
      layout() {
        for (let i = 0; i < N; i++) {
          base[i * 3] = (R1[i] - (view.w < 900 ? 0.5 : 0.32)) * view.W * 1.6;
          base[i * 3 + 1] = (R2[i] - 0.5) * view.H * 1.6;
          base[i * 3 + 2] = -18 - R3[i] * 36;
          // видна только часть кубиков, остальные тают вдали
          const shown = view.w < 900 ? i % 12 === 0 : i % 9 < 2;
          size[i] = shown ? (0.16 + R4[i] * 0.26) * view.H / 15 : 0.0001;
        }
      },
      frame() {},
      target(i, t, p, q) {
        p.set(
          base[i * 3] + Math.sin(t * 0.2 + R1[i] * 9) * 0.9,
          base[i * 3 + 1] + Math.cos(t * 0.16 + R2[i] * 9) * 0.9,
          base[i * 3 + 2]
        );
        q.setFromAxisAngle(axis[i], t * 0.25 + R3[i] * 6.283);
        return size[i];
      },
      key(i) { return sphere.keys[i]; }
    };
  })();

  /* ---------- Шар на главном экране ---------- */
  const sphere = (() => {
    const unit = new Float32Array(N * 3);
    const rot = new Float32Array(N * 3);
    const push = new Float32Array(N);
    const keys = new Array(N);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const a = i * golden;
      unit[i * 3] = Math.cos(a) * r;
      unit[i * 3 + 1] = y;
      unit[i * 3 + 2] = Math.sin(a) * r;
      const q = R4[i];
      keys[i] = q < 0.4 ? 'b' : q < 0.6 ? 'n' : q < 0.9 ? 'w' : 's';
    }
    const e = new THREE.Euler();
    const gq = new THREE.Quaternion();
    return {
      keys, cx: 0, cy: 0, R: 4, size: 0.5,
      layout(z) {
        this.R = Math.min(z.w, z.h) * 0.44;
        this.cx = z.cx;
        this.cy = z.cy - z.h * 0.03;
        this.size = this.R * Math.sqrt(4 * Math.PI / N) * 0.8;
      },
      frame(t, ptr) {
        e.set(-0.32 + ptr.y * 0.3, t * 0.16 + ptr.x * 0.55, 0.1);
        gq.setFromEuler(e);
        const reach = this.R * 0.9;
        for (let i = 0; i < N; i++) {
          V.set(unit[i * 3], unit[i * 3 + 1], unit[i * 3 + 2]).applyQuaternion(gq);
          rot[i * 3] = V.x; rot[i * 3 + 1] = V.y; rot[i * 3 + 2] = V.z;
          let target = 0;
          if (ptr.active && V.z > -0.1) {
            const d = Math.hypot(this.cx + V.x * this.R - ptr.wx, this.cy + V.y * this.R - ptr.wy);
            if (d < reach) {
              const f = 1 - d / reach;
              target = f * f * this.R * 0.6;
            }
          }
          push[i] += (target - push[i]) * 0.12;
        }
      },
      target(i, t, p, q) {
        const x = rot[i * 3], y = rot[i * 3 + 1], z = rot[i * 3 + 2];
        const r = this.R * (1 + 0.02 * Math.sin(t * 1.3 + i * 0.37)) + push[i];
        p.set(this.cx + x * r, this.cy + y * r, z * r);
        NRM.set(x, y, z);
        q.setFromUnitVectors(ZAXIS, NRM);
        return this.size;
      },
      key(i) { return keys[i]; }
    };
  })();

  /* ---------- Картинки из кубиков (сайт, телефон, логотип) ----------
     Буква = цвет, число = сколько кубиков подряд, точка = пусто */
  const decode = (spec) => spec.map((row) => row.replace(/([a-z.])(\d+)/g, (_, ch, n) => ch.repeat(Number(n))));

  function makeGrid(spec, opt) {
    const rows = decode(spec);
    const RW = rows.length;
    const CL = Math.max.apply(null, rows.map((r) => r.length));
    const cells = [];
    rows.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) if (row[c] !== '.') cells.push({ c, r, k: row[c] });
    });
    const M = Math.min(cells.length, N);
    const slot = new Int32Array(N).fill(-1);
    for (let k = 0; k < M; k++) slot[Math.floor(k * N / M)] = k;
    const pos = new Float32Array(M * 2);
    const e = new THREE.Euler();
    const gq = new THREE.Quaternion();
    return {
      C: CL, R: RW, M, slot, cx: 0, cy: 0, cs: 0.5, shake: 0, extra: null, yaw: opt.yaw || 0,
      // точка на картинке (колонка, строка) → мировые координаты в покое
      cellPoint(c, r, out) {
        out.set((c - (CL - 1) / 2) * this.cs, -(r - (RW - 1) / 2) * this.cs, 0);
        e.set(0, this.yaw, 0);
        gq.setFromEuler(e);
        out.applyQuaternion(gq);
        out.x += this.cx;
        out.y += this.cy;
        return out;
      },
      layout(z) {
        this.cs = Math.min(z.w * opt.fitW / CL, z.h * opt.fitH / RW);
        this.cx = z.cx;
        this.cy = z.cy;
        for (let k = 0; k < M; k++) {
          pos[k * 2] = (cells[k].c - (CL - 1) / 2) * this.cs;
          pos[k * 2 + 1] = -(cells[k].r - (RW - 1) / 2) * this.cs;
        }
        if (this.extra) this.extra.layout(this);
      },
      frame(t, ptr) {
        e.set(ptr.y * 0.18 + Math.sin(t * 0.5) * 0.035, (opt.yaw || 0) + ptr.x * 0.28 + Math.sin(t * 0.33) * 0.07, 0);
        gq.setFromEuler(e);
        if (this.extra) this.extra.frame(t);
      },
      target(i, t, p, q) {
        const k = slot[i];
        if (k < 0) return this.extra ? this.extra.target(i, t, p, q) : cloud.target(i, t, p, q);
        const x = pos[k * 2], y = pos[k * 2 + 1];
        const wave = Math.sin(t * 1.6 + x * 0.5 + y * 0.35) * this.cs * 0.16;
        p.set(x, y, wave).applyQuaternion(gq);
        p.x += this.cx + this.shake;
        p.y += this.cy;
        q.copy(gq);
        return this.cs * 0.84;
      },
      key(i) {
        const k = slot[i];
        if (k < 0) return this.extra ? this.extra.key(i) : cloud.key(i);
        return cells[k].k;
      }
    };
  }

  /* Кольцо вокруг логотипа */
  function makeRing(grid, count) {
    const idx = new Int32Array(N).fill(-1);
    let j = 0;
    for (let i = 0; i < N && j < count; i++) if (grid.slot[i] < 0 && i % 3 === 1) idx[i] = j++;
    const total = Math.max(1, j);
    const e = new THREE.Euler();
    const rq = new THREE.Quaternion();
    const RK = ['w', 's', 'l', 'w', 'b'];
    return {
      cx: 0, cy: 0, r: 4, cs: 0.4,
      layout(g) { this.cx = g.cx; this.cy = g.cy; this.r = g.C * g.cs * 0.66; this.cs = g.cs; },
      frame(t) { e.set(1.12 + Math.sin(t * 0.4) * 0.05, 0, 0.32); rq.setFromEuler(e); },
      target(i, t, p, q) {
        const k = idx[i];
        if (k < 0) return cloud.target(i, t, p, q);
        const a = (k / total) * Math.PI * 2 + t * 0.3;
        const rr = this.r * (1 + 0.06 * Math.sin(k * 2.7));
        p.set(Math.cos(a) * rr, Math.sin(a) * rr, Math.sin(k * 1.9) * this.cs * 0.8).applyQuaternion(rq);
        p.x += this.cx;
        p.y += this.cy;
        q.setFromAxisAngle(axis[i], t * 0.9 + k);
        return this.cs * (0.38 + R4[i] * 0.22);
      },
      key(i) { const k = idx[i]; return k < 0 ? cloud.key(i) : RK[k % RK.length]; }
    };
  }

  const BROWSER_WIDE = [
    'g1r1y1e1g4w14g8',
    'w1k2w14g2w1g2w1g2w1s2w2',
    'b30',
    'b2w11b4l11b2',
    'b2w8b7l7s2l2b2',
    'b17l7s2l2b2',
    'b2l9b6l3w1l7b2',
    'b2l6b9l2w3l4w1l1b2',
    'b17l1w5l2w3b2',
    'b2s5b10w11b2',
    'b30',
    'w30',
    'w1l8w2l8w2l8w1',
    'w1l8w2l3s2l3w2l8w1',
    'w1g8w2g8w2g8w1',
    'w1k5g3w2k5g3w2k5g3w1',
    'w1m6g2w2m6g2w2m6g2w1',
    'w1g8w2g8w2g8w1',
    'w30'
  ];
  const BROWSER_NARROW = [
    'g1r1y1e1g2w12g4',
    'w1k2w11g2w1g2w1s2',
    'b22',
    'b2w8b3l8b1',
    'b2w6b5l4s2l2b1',
    'b2l7b4l2w1l5b1',
    'b2s4b7w4l1w3b1',
    'b22',
    'w22',
    'w1l9w2l9w1',
    'w1l4s2l3w2l9w1',
    'w1k5g4w2k5g4w1',
    'w1m7g2w2m7g2w1',
    'w22'
  ];
  // рамка телефона серебристая: история идёт на тёмном фоне
  const PHONE = [
    '.1g9.1',
    'g1w3k3w3g1',
    'g1w1k2w4g2g1',
    'g1b9g1',
    'g1b1w6b2g1',
    'g1b1w4b4g1',
    'g1b9g1',
    'g1b1l6b2g1',
    'g1b9g1',
    'g1b1s4b4g1',
    'g1b9g1',
    'g1w9g1',
    'g1w1l7w1g1',
    'g1w1l3s2l2w1g1',
    'g1w1l7w1g1',
    'g1w1k5g2w1g1',
    'g1w1m5g2w1g1',
    'g1w9g1',
    'g1w1e7w1g1',
    'g1w9g1',
    '.1g9.1'
  ];
  // логотип {/}: x — скобки, z — черта; цвета подставляются под тему
  const LOGO = [
    '.2x3.1.5z2.1x3.2',
    '.1x2.2.1.5z2.1.2x2.1',
    '.1x2.2.1.4z2.1.1.2x2.1',
    '.1x2.2.1.4z2.1.1.2x2.1',
    '.1x2.2.1.3z2.2.1.2x2.1',
    'x2.3.1.3z2.2.1.3x2',
    '.1x2.2.1.2z2.3.1.2x2.1',
    '.1x2.2.1.2z2.3.1.2x2.1',
    '.1x2.2.1.1z2.4.1.2x2.1',
    '.1x2.2.1.1z2.4.1.2x2.1',
    '.2x3.1z2.5.1x3.2'
  ];

  const browser = makeGrid(small ? BROWSER_NARROW : BROWSER_WIDE, { fitW: 0.94, fitH: 0.8, yaw: small ? 0 : -0.2 });
  const phone = makeGrid(PHONE, { fitW: 0.9, fitH: 0.86, yaw: small ? 0 : -0.14 });
  const logo = makeGrid(LOGO, { fitW: 0.72, fitH: 0.6, yaw: 0 });
  logo.extra = makeRing(logo, small ? 110 : 180);

  /* Откуда кубики прилетают при загрузке */
  const scatter = {
    target(i, t, p, q) {
      const a = R1[i] * Math.PI * 2;
      const b = Math.acos(2 * R2[i] - 1);
      const r = Math.max(view.W, view.H) * (0.75 + R3[i] * 0.5);
      p.set(Math.sin(b) * Math.cos(a) * r, Math.cos(b) * r * 0.8, 6 + Math.sin(b) * Math.sin(a) * r * 0.4);
      q.setFromAxisAngle(axis[i], R4[i] * 6.283 + t * 0.6);
      return 0;
    }
  };

  /* Слово «Code» из кубиков. Клетки берутся из настоящих букв большого слова на первом экране,
     поэтому кубики ложатся ровно на место текста и дальше едут вместе со страницей. */
  const codeWord = (() => {
    let cells = [];
    const slot = new Int32Array(N).fill(-1);
    const e = new THREE.Euler();
    const gq = new THREE.Quaternion();
    let minX = 0;
    let spanX = 1;
    return {
      at: 0, shift: 0, size: 0.3,
      set(list, size, at) {
        cells = list;
        this.size = size;
        this.at = at;
        slot.fill(-1);
        const M = Math.min(list.length, N);
        for (let k = 0; k < M; k++) slot[Math.floor(k * N / M)] = k;
        minX = Infinity;
        let maxX = -Infinity;
        list.forEach((c) => { if (c.x < minX) minX = c.x; if (c.x > maxX) maxX = c.x; });
        spanX = Math.max(0.001, maxX - minX);
      },
      layout() {},
      frame(t, ptr) {
        // Слово приклеено к тексту: берём настоящую прокрутку, без сглаживания,
        // поэтому оно не отстаёт и не «догоняет» страницу.
        this.shift = (window.scrollY - this.at) * view.H / view.h;
        e.set(ptr.y * 0.08, ptr.x * 0.12, 0);
        gq.setFromEuler(e);
      },
      // буквы вписываются слева направо
      delayFor(i) {
        const k = slot[i];
        if (k < 0) return delay[i];
        return 0.02 + ((cells[k].x - minX) / spanX) * 0.34;
      },
      target(i, t, p, q) {
        const k = slot[i];
        if (k < 0) {
          // лишние кубики растворяются вдали, чтобы слово читалось чисто
          cloud.target(i, t, p, q);
          return 0;
        }
        const c = cells[k];
        p.set(c.x, c.y + this.shift, Math.sin(t * 1.8 + c.x * 0.5) * this.size * 0.08);
        q.copy(gq);
        return this.size;
      },
      key(i) { const k = slot[i]; return k < 0 ? cloud.key(i) : cells[k].k; }
    };
  })();

  /* Рисуем буквы «Code» в скрытом холсте тем же шрифтом и собираем из них сетку клеток */
  const heroWord = document.querySelector('.hero-word');
  function buildCodeCells() {
    if (!heroWord) return null;
    const chars = heroWord.querySelectorAll('.ch.cc');
    if (!chars.length) return null;
    const first = chars[0];
    const last = chars[chars.length - 1];
    const cs = getComputedStyle(first);
    const fontSize = parseFloat(cs.fontSize);
    const padX = fontSize * 0.08;
    const padY = fontSize * 0.08;
    const pt = parseFloat(cs.paddingTop) || 0;
    const pb = parseFloat(cs.paddingBottom) || 0;
    const pl = parseFloat(cs.paddingLeft) || 0;
    const wr = heroWord.getBoundingClientRect();
    const left = wr.left + first.offsetLeft + pl - padX;
    const docTop = wr.top + window.scrollY + first.offsetTop + pt - padY;
    const boxH = first.offsetHeight - pt - pb;
    const W = Math.ceil(last.offsetLeft + last.offsetWidth - first.offsetLeft + padX * 2);
    const H = Math.ceil(boxH + padY * 2);
    if (W < 20 || H < 10) return null;
    const cnv = document.createElement('canvas');
    cnv.width = W;
    cnv.height = H;
    const ctx = cnv.getContext('2d', { willReadFrequently: true });
    ctx.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#000';
    const m = ctx.measureText('Code');
    const fA = m.fontBoundingBoxAscent || fontSize * 0.95;
    const fD = m.fontBoundingBoxDescent || fontSize * 0.25;
    const base = padY + (boxH - (fA + fD)) / 2 + fA;
    chars.forEach((ch) => ctx.fillText(ch.textContent, padX + ch.offsetLeft - first.offsetLeft, base));
    const data = ctx.getImageData(0, 0, W, H).data;
    const alpha = (x, y) => data[(Math.min(H - 1, y | 0) * W + Math.min(W - 1, x | 0)) * 4 + 3];
    let cell = Math.max(3, fontSize / (view.w < 900 ? 14 : 22));
    for (let tries = 0; tries < 8; tries++) {
      const cols = Math.floor(W / cell);
      const rows = Math.floor(H / cell);
      const ox = (W - cols * cell) / 2;
      const oy = (H - rows * cell) / 2;
      const pts = [];
      let minY = Infinity;
      let maxY = -Infinity;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let hit = 0;
          for (let sy = 0; sy < 3; sy++) {
            for (let sx = 0; sx < 3; sx++) {
              if (alpha(ox + (c + (sx + 0.5) / 3) * cell, oy + (r + (sy + 0.5) / 3) * cell) > 127) hit++;
            }
          }
          if (hit >= 5) {
            const py = oy + (r + 0.5) * cell;
            pts.push([left + ox + (c + 0.5) * cell, docTop + py]);
            if (py < minY) minY = py;
            if (py > maxY) maxY = py;
          }
        }
      }
      if (pts.length <= N * 0.8) {
        if (pts.length < 12) return null;
        const top = docTop + minY;
        const span = Math.max(1, maxY - minY);
        // сверху светлее, книзу темнее — как градиент у текста
        pts.forEach((pt) => {
          const tt = (pt[1] - top) / span;
          pt.push(tt < 0.4 ? 'b' : tt < 0.72 ? 'v' : 'n');
        });
        return { pts, cellPx: cell, docCenter: docTop + H / 2 };
      }
      cell *= 1.18;
    }
    return null;
  }
  const codeFade = { on: false, from: 0, to: 1, last: -1 };

  /* ---------- Раскладка по экрану ---------- */
  const heroOrb = document.querySelector('.hero-orb');
  const stage = document.querySelector('.story-stage');
  const contactOrb = document.querySelector('.contact-orb');
  const storyEl = document.getElementById('story');
  const worksEl = document.getElementById('works');
  const contactEl = document.getElementById('contact');
  let stations = [];
  const lead = { from: Infinity, to: -Infinity };

  function zone(left, top, width, height) {
    return {
      cx: ((left + width / 2) / view.w - 0.5) * view.W,
      cy: (0.5 - (top + height / 2) / view.h) * view.H,
      w: width / view.w * view.W,
      h: height / view.h * view.H
    };
  }

  const PV = new THREE.Vector3();
  function project(x, y) {
    PV.set(x, y, 0).project(camera);
    return { x: (PV.x + 1) / 2 * view.w, y: (1 - PV.y) / 2 * view.h };
  }

  /* Точки для подписей «из чего состоит сайт» на окне браузера из кубиков */
  const ANCHORS_WIDE = [[1.5, 1], [7, 3.5], [4, 9], [22, 5.5], [14.5, 13.5]];
  const ANCHORS_NARROW = [[1.5, 1], [5.5, 3.5], [3.5, 6], [16.5, 4.5], [10.5, 10]];
  const AV = new THREE.Vector3();
  function publishAnchors() {
    const list = (browser.C >= 30 ? ANCHORS_WIDE : ANCHORS_NARROW).map(([c, r]) => {
      browser.cellPoint(c, r, AV);
      AV.project(camera);
      return { x: (AV.x + 1) / 2 * view.w, y: (1 - AV.y) / 2 * view.h };
    });
    if (!list.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))) return;
    window.__scAnchors = list;
    window.dispatchEvent(new CustomEvent('sc:anchors', { detail: list }));
  }

  function publishPhone() {
    const hw = phone.C * phone.cs / 2;
    const hh = phone.R * phone.cs / 2;
    const l = project(phone.cx - hw, phone.cy + hh);
    const r = project(phone.cx + hw, phone.cy + hh);
    storyEl.style.setProperty('--phone-cx', ((l.x + r.x) / 2).toFixed(0) + 'px');
    storyEl.style.setProperty('--phone-top', l.y.toFixed(0) + 'px');
    storyEl.style.setProperty('--phone-w', (r.x - l.x).toFixed(0) + 'px');
  }

  function layout() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    view.w = w;
    view.h = h;
    view.H = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    view.W = view.H * camera.aspect;

    const y = window.scrollY;
    const vh = window.innerHeight;
    const top = (el) => el.getBoundingClientRect().top + y;
    const sTop = top(storyEl);
    const wTop = top(worksEl);
    const cTop = top(contactEl);
    const logoAt = cTop - vh * 0.12;

    // шар → слово «Code» на месте текста → окно сайта
    const code = buildCodeCells();
    let codeOn = false;
    let sCode = 0;
    let sHold = 0;
    if (code) {
      sCode = Math.min(Math.max(code.docCenter - vh * 0.6, vh * 0.14), sTop - vh * 0.45);
      sHold = Math.min(sCode + vh * 0.24, sTop - vh * 0.28);
      if (sHold > sCode + 20) {
        codeOn = true;
        const unit = view.W / view.w;
        codeWord.set(code.pts.map((pt) => ({
          x: (pt[0] / view.w - 0.5) * view.W,
          y: (0.5 - (pt[1] - sCode) / view.h) * view.H,
          k: pt[2]
        })), code.cellPx * unit * 0.86, sCode);
      }
    }
    codeFade.on = codeOn;
    codeFade.from = sCode * 0.5;
    codeFade.to = sCode * 0.94;

    stations = [{ f: sphere, at: 0 }];
    if (codeOn) stations.push({ f: codeWord, at: sCode, win: [0.1, 0.96] }, { f: codeWord, at: sHold });
    stations.push(
      // без слова шар держит форму дольше и только потом собирается в сайт
      { f: browser, at: sTop, win: codeOn ? [0.1, 0.94] : [0.34, 0.94] },
      { f: phone, at: sTop + vh },
      { f: phone, at: sTop + vh * 2 },
      { f: cloud, at: wTop - vh * 0.1 },
      { f: cloud, at: cTop - vh * 0.95 },
      { f: logo, at: logoAt }
    );
    if (w < 900) stations.push({ f: cloud, at: cTop + vh * 0.85 });
    lead.from = sTop + vh * 1.5;
    lead.to = wTop - vh * 0.35;

    cloud.layout();
    const hr = heroOrb.getBoundingClientRect();
    sphere.layout(zone(hr.left, hr.top + y, hr.width, hr.height));
    const sz = zone(stage.offsetLeft, stage.offsetTop, stage.offsetWidth, stage.offsetHeight);
    browser.layout(sz);
    phone.layout(sz);
    const cr = contactOrb.getBoundingClientRect();
    logo.layout(zone(cr.left, cr.top + y - logoAt, cr.width, cr.height));
    publishPhone();
    publishAnchors();
  }

  /* ---------- Мышь ---------- */
  const ptr = { x: 0, y: 0, tx: 0, ty: 0, px: -9999, py: -9999, wx: 9999, wy: 9999, active: false };
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    ptr.tx = e.clientX / window.innerWidth * 2 - 1;
    ptr.ty = -(e.clientY / window.innerHeight * 2 - 1);
    ptr.px = e.clientX;
    ptr.py = e.clientY;
    ptr.active = true;
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => {
    ptr.active = false;
    ptr.tx = 0;
    ptr.ty = 0;
  });

  /* ---------- Рисуем только когда кубики видны ---------- */
  let visible = true;
  const seen = new Set();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) seen.add(en.target); else seen.delete(en.target); });
    visible = seen.size > 0;
  }, { rootMargin: '15% 0px' });
  document.querySelectorAll('[data-cubes-zone]').forEach((z) => io.observe(z));

  /* ---------- Главный цикл ---------- */
  const P = new THREE.Vector3();
  const PA = new THREE.Vector3();
  const PB = new THREE.Vector3();
  const Q = new THREE.Quaternion();
  const QA = new THREE.Quaternion();
  const QB = new THREE.Quaternion();
  const QT = new THREE.Quaternion();
  const SPIN = new THREE.Quaternion();
  const S = new THREE.Vector3();
  const MAT = new THREE.Matrix4();
  const COL = new THREE.Color();
  let sy = window.scrollY;
  let time = 0;
  let last = performance.now();
  let enter = 0;
  let started = false;
  let lastRaw = performance.now();
  // если кадры тяжёлые, снижаем чёткость; когда легко — возвращаем
  let acc = 0;
  let frames = 0;
  let cool = 0;
  const adapt = (raw) => {
    if (raw > 0.2) return;
    acc += raw;
    frames += 1;
    cool = Math.max(0, cool - raw);
    if (acc < 1 || cool > 0) return;
    const avg = acc / frames;
    acc = 0;
    frames = 0;
    let next = dpr;
    if (avg > 0.022) next = Math.max(1, dpr - 0.25);
    else if (avg < 0.0135 && dpr < maxDpr) next = Math.min(maxDpr, dpr + 0.125);
    if (next !== dpr) {
      dpr = next;
      renderer.setPixelRatio(dpr);
      renderer.setSize(view.w, view.h, false);
      cool = 1.5;
    }
  };

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!visible || document.hidden) return;
    time += dt;
    adapt((now - lastRaw) / 1000);
    lastRaw = now;

    const target = window.scrollY;
    sy += (target - sy) * (1 - Math.exp(-dt * 7));
    if (Math.abs(target - sy) < 0.5) sy = target;
    ptr.x += (ptr.tx - ptr.x) * (1 - Math.exp(-dt * 3));
    ptr.y += (ptr.ty - ptr.y) * (1 - Math.exp(-dt * 3));
    ptr.wx = (ptr.px / view.w - 0.5) * view.W;
    ptr.wy = (0.5 - ptr.py / view.h) * view.H;

    let s = 0;
    while (s < stations.length - 2 && sy >= stations[s + 1].at) s++;
    const A = stations[s];
    const B = stations[s + 1];
    const tt = clamp((sy - A.at) / Math.max(1, B.at - A.at));
    const win = B.win || [0.16, 0.82];
    const u = clamp((tt - win[0]) / (win[1] - win[0]));
    const fa = A.f;
    const fb = B.f;
    const same = fa === fb;
    fa.frame(time, ptr, sy);
    if (!same) fb.frame(time, ptr, sy);

    // текст «Code» в большом слове растворяется, когда на его место прилетают кубики
    const fade = codeFade.on ? clamp((window.scrollY - codeFade.from) / Math.max(1, codeFade.to - codeFade.from)) : 0;
    if (Math.abs(fade - codeFade.last) > 0.004) {
      codeFade.last = fade;
      root.style.setProperty('--code-fade', fade.toFixed(3));
    }

    // телефон вибрирует, когда приходит заявка
    const leadOn = sy > lead.from && sy < lead.to;
    const pulse = Math.pow(Math.max(0, Math.sin(time * 2.2)), 12);
    phone.shake = leadOn ? Math.sin(time * 75) * phone.cs * 0.12 * pulse : 0;

    if (started && enter < 2) enter = Math.min(2, enter + dt / 1.5);

    // после последней остановки логотип уезжает вместе со страницей, а не залезает под подвал
    const lastSt = stations[stations.length - 1];
    const lift = B === lastSt && lastSt.f === logo && sy > lastSt.at ? (sy - lastSt.at) * view.H / view.h : 0;

    for (let i = 0; i < N; i++) {
      let sc;
      const dl = !same && fb.delayFor ? fb.delayFor(i) : delay[i];
      const local = same ? 0 : easeIO(clamp((u - dl) / (1 - DMAX)));
      if (local <= 0) {
        sc = fa.target(i, time, P, Q);
        COL.copy(PAL[fa.key(i)]);
      } else if (local >= 1) {
        sc = fb.target(i, time, P, Q);
        COL.copy(PAL[fb.key(i)]);
      } else {
        const sa = fa.target(i, time, PA, QA);
        const sb = fb.target(i, time, PB, QB);
        const bump = Math.sin(Math.PI * local);
        P.lerpVectors(PA, PB, local);
        P.z += bump * arc[i];
        Q.slerpQuaternions(QA, QB, local);
        SPIN.setFromAxisAngle(axis[i], bump * 2.2);
        Q.multiply(SPIN);
        sc = (sa + (sb - sa) * local) * (1 + 0.06 * bump);
        // цвет меняется быстро в середине полёта, без грязных промежуточных оттенков
        const cm = clamp((local - 0.38) / 0.24);
        COL.copy(PAL[fa.key(i)]).lerp(PAL[fb.key(i)], cm * cm * (3 - 2 * cm));
      }
      if (enter < 2) {
        const ek = easeOut(clamp((enter - delay[i] * 1.6) / 0.9));
        if (ek < 1) {
          scatter.target(i, time, PB, QB);
          P.lerpVectors(PB, P, ek);
          QT.copy(Q);
          Q.copy(QB).slerp(QT, ek);
          sc *= ek;
        }
      }
      if (lift) P.y += lift;
      S.setScalar(Math.max(sc, 0.0001));
      MAT.compose(P, Q, S);
      mesh.setMatrixAt(i, MAT);
      mesh.setColorAt(i, COL);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    renderer.render(scene, camera);
  }

  /* ---------- Пересчёт при изменении размеров ---------- */
  let rT = 0;
  let lastW = window.innerWidth;
  let lastH = window.innerHeight;
  const relayout = () => { clearTimeout(rT); rT = setTimeout(layout, 160); };
  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w !== lastW || Math.abs(h - lastH) > 120) {
      lastW = w;
      lastH = h;
      relayout();
    }
  });
  if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(document.body);
  window.addEventListener('load', relayout);
  // буквы для слова «Code» берутся из шрифта, поэтому пересчитываем, когда шрифты догрузятся
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    root.classList.add('no-cubes');
    root.classList.remove('cubes-on');
  });

  /* ---------- Старт: шейдеры собираются заранее, первый кадр без рывка ---------- */
  layout();
  const kick = () => {
    root.classList.add('cubes-on');
    root.classList.remove('no-cubes');
    last = performance.now();
    lastRaw = last;
    if (window.__scReady) started = true;
    else window.addEventListener('sc:ready', () => { started = true; }, { once: true });
    requestAnimationFrame(frame);
  };
  if (renderer.compileAsync) renderer.compileAsync(scene, camera).then(kick, kick);
  else kick();
}
