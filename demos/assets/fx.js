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
    const s = Math.min(Math.min(window.devicePixelRatio || 1, 1.5), Math.sqrt(maxPx / (size.w * size.h)));
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
