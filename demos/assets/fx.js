/* =========================================================
   Лёгкие шейдерные эффекты для демо-сайтов SiteCode
   Чистый WebGL без three.js: стартуют сразу, рисуют только пока видны
   ========================================================= */
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const HEAD = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';
const VERT = 'attribute vec2 aPos; varying vec2 vUv; void main() { vUv = aPos * .5 + .5; gl_Position = vec4(aPos, 0., 1.); }';

function setup(canvas, fs) {
  const opts = { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' };
  let gl = null;
  try { gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts); } catch (e) { gl = null; }
  if (!gl) return null;
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('[fx]', gl.getShaderInfoLog(s)); return null; }
    return s;
  };
  const vs = sh(gl.VERTEX_SHADER, VERT);
  const f = sh(gl.FRAGMENT_SHADER, HEAD + fs);
  if (!vs || !f) return null;
  const pr = gl.createProgram();
  gl.attachShader(pr, vs);
  gl.attachShader(pr, f);
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  const u = (n) => (n in U ? U[n] : (U[n] = gl.getUniformLocation(pr, n)));
  return { gl, u };
}

/* Общий цикл: размер буфера с потолком пикселей, пауза вне экрана и во фоне */
function run(canvas, S, opts, draw) {
  const { gl, u } = S;
  const maxPx = opts.maxPx || 5e5;
  const size = { w: 1, h: 1, W: 1, H: 1 };
  const resize = () => {
    size.w = canvas.clientWidth || window.innerWidth;
    size.h = canvas.clientHeight || window.innerHeight;
    const s = Math.min(Math.min(window.devicePixelRatio || 1, opts.maxDpr || 1.5), Math.sqrt(maxPx / (size.w * size.h)));
    size.W = Math.max(1, Math.round(size.w * s));
    size.H = Math.max(1, Math.round(size.h * s));
    if (canvas.width !== size.W || canvas.height !== size.H) { canvas.width = size.W; canvas.height = size.H; }
    gl.viewport(0, 0, size.W, size.H);
    gl.uniform2f(u('uRes'), size.W, size.H);
    if (reduce) draw(performance.now(), 0);
  };
  new ResizeObserver(resize).observe(canvas);
  resize();
  const t0 = performance.now();
  let last = t0;
  let on = false;
  let raf = 0;
  const loop = (now) => {
    if (!on) { raf = 0; return; }
    raf = requestAnimationFrame(loop);
    if (document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    draw(now, dt, (now - t0) / 1000);
  };
  if (reduce) { draw(performance.now(), 0, 8); return size; }
  new IntersectionObserver((es) => {
    on = es[0].isIntersecting;
    if (on && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
  }, { rootMargin: '80px 0px' }).observe(opts.zone || canvas);
  return size;
}

/* ---------- Рифлёное стекло: горячий свет давит с краёв, каждое ребро преломляет его ---------- */
const FLUTE_FS = `
  uniform vec2 uRes;
  uniform float uTime;
  uniform float uHeat;
  uniform float uN;
  uniform vec3 uHot;
  uniform vec2 uMouse;
  uniform vec2 uCenter;
  varying vec2 vUv;
  float blob(vec2 p, vec2 c, float r) { vec2 d = p - c; return exp(-dot(d, d) / (r * r)); }
  void main() {
    vec2 uv = vUv;
    float asp = uRes.x / uRes.y;
    float fx = uv.x * uN;
    float f = fract(fx) - .5;
    float bulge = 1. - 4. * f * f;
    // каждое ребро стекла — маленькая линза: показывает свет из соседнего места, перевёрнутым
    vec2 q = vec2((floor(fx) + .5 - f * 1.7) / uN, uv.y + f * .035);
    float t = uTime * .22;
    float h = 0.;
    h += smoothstep(.56, 1.1, q.x + .12 * sin(q.y * 3.1 + t * 1.3) + .04 * sin(t * .7));
    h += smoothstep(.36, -.08, q.y + .07 * sin(q.x * 4. - t)) * .5;
    h += blob(q, vec2(.94 + .04 * sin(t), .3 + .1 * cos(t * .8)), .3) * .85;
    h += blob(q, vec2(.12 + .05 * cos(t * .6), .9), .22) * .25;
    h += blob(q, uMouse * .5 + .5, .2) * .3;
    h = clamp(h, 0., 1.7);
    vec2 c = (uv - uCenter) * vec2(asp, 1.);
    vec3 base = mix(vec3(.14, .14, .16), vec3(.027, .027, .031), smoothstep(0., .9, length(c)));
    vec3 hot = mix(uHot, vec3(1., .86, .62), smoothstep(1.15, 1.8, h));
    vec3 col = base + hot * h * (.26 + .6 * bulge) * uHeat * .82;
    col *= .8 + .2 * smoothstep(.5, .37, abs(f));
    col += pow(bulge, 28.) * .025 * uHeat;
    col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + uTime) * 43758.5453) - .5) * .02;
    gl_FragColor = vec4(col, 1.);
  }
`;

export function fluteGlow(canvas, opts = {}) {
  const S = setup(canvas, FLUTE_FS);
  if (!S) return null;
  const { gl, u } = S;
  const st = { heat: opts.heat ?? 1, th: opts.heat ?? 1, hot: (opts.hot || [0.95, 0.32, 0.08]).slice(), tc: (opts.hot || [0.95, 0.32, 0.08]).slice(), mx: 0, my: 0, tx: 0, ty: 0, cx: (opts.center || [0.66, 0.6])[0], cy: (opts.center || [0.66, 0.6])[1] };
  window.addEventListener('pointermove', (e) => {
    st.tx = e.clientX / window.innerWidth * 2 - 1;
    st.ty = -(e.clientY / window.innerHeight * 2 - 1);
  }, { passive: true });
  run(canvas, S, opts, (now, dt, time) => {
    const k = 1 - Math.exp(-(dt || 0.016) * 2.5);
    st.heat += (st.th - st.heat) * k;
    for (let i = 0; i < 3; i++) st.hot[i] += (st.tc[i] - st.hot[i]) * k;
    st.mx += (st.tx - st.mx) * k;
    st.my += (st.ty - st.my) * k;
    gl.uniform1f(u('uTime'), time || 0);
    gl.uniform1f(u('uHeat'), st.heat);
    gl.uniform1f(u('uN'), Math.max(16, Math.min(64, Math.round((canvas.clientWidth || window.innerWidth) / 30))));
    gl.uniform3f(u('uHot'), st.hot[0], st.hot[1], st.hot[2]);
    gl.uniform2f(u('uMouse'), st.mx, st.my);
    gl.uniform2f(u('uCenter'), st.cx, st.cy);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  });
  return {
    // сила света и его цвет (0..1 по каналам) — меняются плавно
    set(heat, rgb) {
      if (heat != null) st.th = heat;
      if (rgb) { st.tc[0] = rgb[0]; st.tc[1] = rgb[1]; st.tc[2] = rgb[2]; }
    },
    center(x, y) { st.cx = x; st.cy = y; }
  };
}

/* ---------- Мазок кисти: новый цвет фона закрашивает экран широкими мазками с рваным краем ---------- */
export function brushWipe(canvas) {
  const ctx = canvas.getContext('2d');
  let W = 1;
  let H = 1;
  let anim = null;
  const size = () => {
    const r = 0.6;
    W = canvas.width = Math.max(1, Math.round((canvas.clientWidth || window.innerWidth) * r));
    H = canvas.height = Math.max(1, Math.round((canvas.clientHeight || window.innerHeight) * r));
  };
  new ResizeObserver(size).observe(canvas);
  size();
  // шесть мазков сверху вниз, через один — справа налево; к концу закрывают весь экран
  const STROKES = [0.06, 0.22, 0.38, 0.54, 0.7, 0.86, 1.0].map((y, k) => ({ y, dir: k % 2 ? -1 : 1, tilt: (k % 3 - 1) * 0.05, delay: k * 0.07 }));
  const rnd = (i) => { const x = Math.sin(i * 127.1) * 43758.5453; return x - Math.floor(x); };
  const drawStroke = (s, f, seed) => {
    const thick = H * 0.24;
    const steps = Math.ceil(W / (thick * 0.18));
    const n = Math.floor(steps * f);
    for (let i = 0; i <= n; i++) {
      const u = i / steps;
      const x = s.dir > 0 ? -0.08 * W + u * 1.16 * W : 1.08 * W - u * 1.16 * W;
      const y = (s.y + s.tilt * (u - 0.5) + Math.sin(u * 7 + seed) * 0.012) * H;
      const r = thick * 0.5 * (0.86 + 0.14 * rnd(i + seed * 31));
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.15, r, 0, 0, Math.PI * 2);
      ctx.fill();
      // ворс кисти по краям мазка
      for (let b = 0; b < 3; b++) {
        const a = rnd(i * 3 + b + seed) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.95, r * (0.08 + 0.1 * rnd(i + b * 7 + seed)), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };
  return {
    paint(color, done) {
      if (anim) { cancelAnimationFrame(anim.raf); const d = anim.done; anim = null; if (d) d(); }
      if (reduce) { ctx.clearRect(0, 0, W, H); if (done) done(); return; }
      const t0 = performance.now();
      const seed = Math.random() * 10;
      const a = { raf: 0, done };
      const step = (now) => {
        const t = Math.min(1, (now - t0) / 820);
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = color;
        STROKES.forEach((s, k) => {
          const f = Math.min(1, Math.max(0, (t - s.delay) / 0.5));
          if (f > 0) drawStroke(s, 1 - Math.pow(1 - f, 2), seed + k);
        });
        if (t < 1) { a.raf = requestAnimationFrame(step); return; }
        anim = null;
        if (done) done();
        requestAnimationFrame(() => ctx.clearRect(0, 0, W, H));
      };
      a.raf = requestAnimationFrame(step);
      anim = a;
    }
  };
}

/* ---------- Ленты света: мягкие полосы тёплого света медленно текут, как в титрах кино ---------- */
const RIBBON_FS = `
  uniform vec2 uRes;
  uniform float uTime;
  uniform vec3 uCol;
  uniform vec3 uBase;
  varying vec2 vUv;
  float band(vec2 p, float y0, float amp, float fr, float ph, float w) {
    float y = y0 + amp * sin(p.x * fr + ph) + amp * .45 * sin(p.x * fr * 2.3 - ph * 1.4);
    float d = p.y - y;
    return exp(-d * d / (w * w));
  }
  void main() {
    float asp = uRes.x / uRes.y;
    vec2 p = vec2(vUv.x * asp, vUv.y);
    float t = uTime * .12;
    vec3 col = uBase;
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float b = band(p, .28 + fi * .16, .07 + fi * .015, 1.4 + fi * .35, t * (1. + fi * .3) + fi * 1.7, .012 + fi * .006);
      float glow = band(p, .28 + fi * .16, .07 + fi * .015, 1.4 + fi * .35, t * (1. + fi * .3) + fi * 1.7, .09 + fi * .02);
      // по ленте бежит яркое пятно
      float run = exp(-pow(mod(p.x - t * (1.6 + fi * .4) * asp * .5, asp + .8) - .4, 2.) * 6.);
      col += uCol * (b * (.35 + .9 * run) + glow * .07) * (.55 + .15 * fi);
    }
    col *= .65 + .35 * smoothstep(1.2, .2, length((vUv - vec2(.5, .45)) * vec2(asp, 1.)));
    col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + uTime) * 43758.5453) - .5) * .02;
    gl_FragColor = vec4(col, 1.);
  }
`;

export function lightRibbons(canvas, opts = {}) {
  const S = setup(canvas, RIBBON_FS);
  if (!S) return null;
  const { gl, u } = S;
  const col = opts.color || [0.79, 0.64, 0.37];
  const base = opts.base || [0.06, 0.055, 0.05];
  run(canvas, S, { maxPx: opts.maxPx || 4e5, zone: opts.zone }, (now, dt, time) => {
    gl.uniform1f(u('uTime'), time || 0);
    gl.uniform3f(u('uCol'), col[0], col[1], col[2]);
    gl.uniform3f(u('uBase'), base[0], base[1], base[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  });
  return true;
}

/* ---------- Стеклянная линза над фото: увеличивает, преломляет края и показывает улыбку после отбеливания ---------- */
const LENS_FS = `
  uniform vec2 uRes;
  uniform vec2 uImg;
  uniform vec2 uPos;
  uniform sampler2D uTex;
  uniform vec2 uLens;
  uniform float uR;
  uniform float uShow;
  uniform float uWhite;
  uniform float uLensWhite;
  uniform float uMag;
  varying vec2 vUv;
  // кадрирование как у object-fit: cover с точкой фокуса
  vec2 cover(vec2 uv) {
    float ca = uRes.x / uRes.y;
    float ia = uImg.x / uImg.y;
    vec2 s = ca > ia ? vec2(1., ia / ca) : vec2(ca / ia, 1.);
    return (1. - s) * vec2(uPos.x, 1. - uPos.y) + uv * s;
  }
  vec3 tex(vec2 uv) { return texture2D(uTex, cover(uv)).rgb; }
  // эмаль: светлые и малонасыщенные тёплые пиксели — зубы; кожа и губы почти не задеваются
  vec3 enamel(vec3 c, float amt) {
    float lum = dot(c, vec3(.299, .587, .114));
    float mx = max(c.r, max(c.g, c.b));
    float mn = min(c.r, min(c.g, c.b));
    float sat = mx > .001 ? (mx - mn) / mx : 0.;
    float m = smoothstep(.42, .68, lum) * (1. - smoothstep(.15, .33, sat));
    m *= mix(.45, 1., smoothstep(-.01, .09, (c.r + c.g) * .5 - c.b));
    vec3 white = vec3(min(1., lum * 1.1 + .06)) * vec3(.985, 1., 1.03);
    vec3 stain = c * vec3(1.03, .95, .76);
    return amt >= 0. ? mix(c, white, m * amt) : mix(c, stain, m * -amt);
  }
  void main() {
    vec2 px = vUv * uRes;
    vec2 d = px - uLens;
    float R = max(uR, 1.);
    float r = length(d) / R;
    vec3 base = enamel(tex(vUv), uWhite);
    if (uShow < .002 || r > 1.4) { gl_FragColor = vec4(base, 1.); return; }
    // мягкая тень от стекла чуть ниже линзы
    float sh = smoothstep(1.36, .96, length((d - vec2(0., -R * .16)) / R)) * (1. - smoothstep(.97, 1., r));
    vec3 outC = base * (1. - .3 * sh * uShow);
    // в центре увеличение, к краю стекло сжимает и преломляет картинку
    float rr = min(r, 1.);
    float f = mix(1. / uMag, 1., pow(rr, 2.4)) + .2 * smoothstep(.7, 1., rr);
    float edge = smoothstep(.55, 1., rr);
    vec2 c0 = uLens / uRes;
    vec2 dir = d / uRes * f;
    float ab = .022 * edge;
    vec3 inC = vec3(tex(c0 + dir * (1. + ab)).r, tex(c0 + dir).g, tex(c0 + dir * (1. - ab)).b);
    inC = enamel(inC, uLensWhite);
    // жидкое стекло: светлый ободок, блик сверху слева, тонкая холодная кромка
    vec2 n = d / R;
    float light = max(0., dot(normalize(n + 1e-5), normalize(vec2(-.55, .83))));
    float rim = smoothstep(.84, .985, rr) * (1. - smoothstep(.985, 1., r));
    inC += rim * (.1 + .6 * light * light);
    inC += smoothstep(.46, 0., length(n - vec2(-.36, .44))) * .14;
    inC *= 1. - .16 * smoothstep(.82, 1., rr) * (1. - light);
    inC = mix(inC, inC * vec3(.97, 1.01, 1.05), .55);
    float inside = 1. - smoothstep(.985, 1., r);
    gl_FragColor = vec4(mix(outC, inC, inside * uShow), 1.);
  }
`;

/*
  photoLens(canvas, { img, pos: [x, y], lens: true, zone, tag, aim: [x, y], swing: [ax, ay], radius(w, h) })
  img — <img crossorigin="anonymous">: та же картинка видна, пока WebGL не готов.
  pos — точка фокуса кадра (как object-position); aim — где на фото улыбка (доли фото),
  swing — насколько линза гуляет вокруг неё (тоже в долях фото), на любом экране она найдёт улыбку сама.
  Возвращает { setWhite(v) }: v от −1 (желтизна) до 1 (отбеленная эмаль) для всего фото.
*/
export function photoLens(canvas, opts = {}) {
  const S = setup(canvas, LENS_FS);
  if (!S) return null;
  const { gl, u } = S;
  const img = opts.img;
  const pos = opts.pos || [0.5, 0.5];
  const lens = opts.lens !== false;
  const zone = opts.zone || canvas;
  const tag = opts.tag || null;
  const aim = opts.aim || [0.5, 0.6];
  const swing = opts.swing || [0.04, 0.02];
  const st = { x: 0.5, y: 0.6, tx: 0.5, ty: 0.6, show: 0, white: opts.white || 0, tw: opts.white || 0, user: -1e9, placed: false };
  // точка на фото → доли холста с тем же кадрированием, что и в шейдере
  const fit = (W, H) => {
    const ca = W / H;
    const ia = img.naturalWidth / img.naturalHeight;
    const sx = ca > ia ? 1 : ca / ia;
    const sy = ca > ia ? ia / ca : 1;
    return { sx, sy, ox: (1 - sx) * pos[0], oy: (1 - sy) * pos[1] };
  };
  let ready = false;
  let size = null;

  const tex = gl.createTexture();
  const upload = () => {
    try {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    } catch (e) { return; }
    gl.uniform2f(u('uImg'), img.naturalWidth, img.naturalHeight);
    gl.uniform2f(u('uPos'), pos[0], pos[1]);
    gl.uniform1f(u('uMag'), opts.mag || 1.35);
    gl.uniform1f(u('uLensWhite'), opts.lensWhite === undefined ? 1 : opts.lensWhite);
    ready = true;
  };
  if (img.complete && img.naturalWidth) upload(); else img.addEventListener('load', upload, { once: true });

  // курсор ведёт линзу; без курсора (телефон) она сама гуляет по улыбке, нажатие переносит её
  if (lens && !reduce) {
    const toLocal = (e) => {
      const r = canvas.getBoundingClientRect();
      return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
    };
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      const [x, y] = toLocal(e);
      if (x < -0.1 || x > 1.1 || y < -0.1 || y > 1.1) return;
      st.tx = x;
      st.ty = y;
      st.user = performance.now();
    }, { passive: true });
    zone.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') return;
      const [x, y] = toLocal(e);
      if (x < 0 || x > 1 || y < 0 || y > 1) return;
      st.tx = x;
      st.ty = y;
      st.user = performance.now();
    }, { passive: true });
    zone.addEventListener('pointerleave', () => { st.user = performance.now() - 1800; });
  }

  let shown = false;
  const draw = (now, dt, time) => {
    if (!ready || !size) return;
    const W = size.w;
    const H = size.h;
    const k = 1 - Math.exp(-(dt || 0.016) * 7);
    if (lens) {
      const fr = fit(W, H);
      const cx = (aim[0] - fr.ox) / fr.sx;
      const cy = (aim[1] - fr.oy) / fr.sy;
      if (!st.placed) { st.placed = true; st.x = st.tx = cx; st.y = st.ty = cy; }
      if (reduce || now - st.user > 2600) {
        const t = reduce ? 0 : (time || 0) * 0.32;
        st.tx = cx + Math.sin(t * 1.3) * swing[0] / fr.sx;
        st.ty = cy + Math.sin(t * 2.1 + 0.7) * swing[1] / fr.sy;
      }
      st.x += (st.tx - st.x) * (reduce ? 1 : k);
      st.y += (st.ty - st.y) * (reduce ? 1 : k);
      st.show = reduce ? 1 : Math.min(1, st.show + (dt || 0.016) * 1.4);
    }
    st.white += (st.tw - st.white) * (reduce ? 1 : 1 - Math.exp(-(dt || 0.016) * 6));
    const R = opts.radius ? opts.radius(W, H) : Math.min(W, H) * 0.18;
    const e = 1 - Math.pow(1 - st.show, 3);
    const pop = st.show < 1 ? e + Math.sin(st.show * Math.PI) * 0.12 : 1;
    const sc = size.W / W;
    gl.uniform2f(u('uLens'), st.x * W * sc, (1 - st.y) * H * sc);
    gl.uniform1f(u('uR'), R * pop * sc);
    gl.uniform1f(u('uShow'), lens ? Math.min(1, st.show * 3) : 0);
    gl.uniform1f(u('uWhite'), st.white);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (tag && lens) {
      // подпись справа над линзой, но не за краем экрана
      const tw = tag.offsetWidth || 150;
      let tx = st.x * W + R * 0.62;
      if (tx + tw > W - 10) tx = Math.max(10, st.x * W - R * 0.62 - tw);
      tag.style.transform = 'translate(' + tx.toFixed(0) + 'px,' + Math.max(8, st.y * H - R * 1.02).toFixed(0) + 'px)';
    }
    if (!shown) {
      shown = true;
      canvas.classList.add('ready');
      if (tag) tag.classList.add('on');
    }
  };
  size = run(canvas, S, { maxPx: opts.maxPx || 2.2e6, maxDpr: opts.maxDpr || 2, zone }, draw);
  // картинка могла догрузиться позже первого кадра — рисуем сразу, не дожидаясь прокрутки
  const kick = () => requestAnimationFrame(() => draw(performance.now(), 0.016, 0));
  if (ready) kick(); else img.addEventListener('load', kick, { once: true });

  return {
    setWhite(v) {
      st.tw = Math.max(-1, Math.min(1, v));
      if (reduce) { st.white = st.tw; draw(performance.now(), 0, 0); }
    }
  };
}
