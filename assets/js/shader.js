/* =========================================================
   SiteCode — шейдеры первого экрана
   1) заставка «жидкий свет»: логотип пишется светом и тает в сайт
   2) живой фон первого экрана: мягкий градиент тянется за курсором
   Чистый WebGL без библиотек: запускается мгновенно и не тормозит
   ========================================================= */
(() => {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const HEAD = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';
  // гладкий симплекс-шум (Ian McEwan, Ashima Arts, MIT) — без квадратных артефактов
  const NOISE = `
    vec3 mod289(vec3 x) { return x - floor(x * (1. / 289.)) * 289.; }
    vec2 mod289(vec2 x) { return x - floor(x * (1. / 289.)) * 289.; }
    vec3 permute(vec3 x) { return mod289(((x * 34.) + 1.) * x); }
    float snoise(vec2 v) {
      const vec4 C = vec4(.211324865405187, .366025403784439, -.577350269189626, .024390243902439);
      vec2 i = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1., 0.) : vec2(0., 1.);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute(permute(i.y + vec3(0., i1.y, 1.)) + i.x + vec3(0., i1.x, 1.));
      vec3 m = max(.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.);
      m = m * m;
      m = m * m;
      vec3 x = 2. * fract(p * C.www) - 1.;
      vec3 h = abs(x) - .5;
      vec3 ox = floor(x + .5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - .85373472095314 * (a0 * a0 + h * h);
      vec3 g;
      g.x = a0.x * x0.x + h.x * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130. * dot(m, g);
    }
    float noise(vec2 p) { return snoise(p) * .5 + .5; }
    float fbm(vec2 p) {
      float v = 0.;
      float a = .5;
      for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.02 + 17.1; a *= .5; }
      return v;
    }
    float grain(float t) { return fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + t) * 43758.5453) - .5; }
  `;
  const VERT = 'attribute vec2 aPos; varying vec2 vUv; void main() { vUv = aPos * .5 + .5; gl_Position = vec4(aPos, 0., 1.); }';

  // заставка: тёмная глубина, по ней течёт свет фирменных цветов
  const INTRO_FS = HEAD + NOISE + `
    uniform vec2 uRes;
    uniform float uTime;
    uniform float uReveal;
    uniform float uOut;
    uniform vec2 uMouse;
    uniform sampler2D uText;
    uniform vec4 uRect;
    varying vec2 vUv;
    vec3 pal(float t) {
      vec3 c = mix(vec3(.03, .045, .15), vec3(.16, .36, 1.), smoothstep(.28, .6, t));
      c = mix(c, vec3(.5, .38, 1.), smoothstep(.55, .7, t) * .5);
      c = mix(c, vec3(.62, .78, 1.), smoothstep(.66, .78, t) * .6);
      return mix(c, vec3(1., .78, .25), smoothstep(.74, .88, t));
    }
    void main() {
      float asp = uRes.x / uRes.y;
      vec2 p = (vUv - .5) * vec2(asp, 1.);
      float t = uTime * .09;
      vec2 q = vec2(fbm(p * .75 + t), fbm(p * .75 - t + 3.1));
      vec2 r = vec2(fbm(p * 1.05 + q * 1.6 + vec2(1.7, 9.2) + t * 1.3), fbm(p * 1.05 + q * 1.6 + vec2(8.3, 2.8) - t));
      float f = fbm(p * .9 + r * 1.5 + uMouse * .2);
      vec3 col = pal(f) * (.5 + .5 * smoothstep(1.25, .15, length(p)));
      // логотип: маска из текстуры, внутри течёт тот же свет
      vec2 tuv = (vUv - uRect.xy) / (uRect.zw * 2.) + .5;
      float inside = step(0., tuv.x) * step(tuv.x, 1.) * step(0., tuv.y) * step(tuv.y, 1.);
      vec2 tw = tuv + (r - .5) * .006;
      float txt = texture2D(uText, tw).r * inside;
      float halo = texture2D(uText, tw, 5.).r * inside;
      float edge = uReveal * 1.25 - .12 + (noise(vec2(tuv.y * 9., uTime * 2.)) - .5) * .1;
      float shown = smoothstep(edge + .015, edge - .05, tuv.x);
      float rim = smoothstep(.06, 0., abs(tuv.x - edge)) * step(.001, uReveal) * step(uReveal, .999);
      vec3 ink = mix(vec3(1.), pal(f * .55 + .48), .3) + .3 * pow(f, 3.);
      col *= 1. - halo * shown * .45;
      col += halo * shown * vec3(.25, .4, 1.) * .35;
      col = mix(col, ink, txt * shown);
      col += rim * (txt * 1.4 + halo * .8) * vec3(1., .86, .5);
      col += grain(uTime) * .035;
      // уход: экран тает снизу вверх, по краю бежит свечение
      float d = vUv.y + (fbm(vUv * vec2(3.2, 4.) + t * 3.) - .5) * .34;
      float th = uOut * 1.55 - .28;
      float a = smoothstep(th - .015, th + .035, d);
      float glow = uOut > 0. ? smoothstep(.08, 0., abs(d - th)) * (1. - uOut * .5) : 0.;
      col = mix(col, vec3(.6, .74, 1.), glow * .8);
      float alpha = max(a, glow * .85);
      gl_FragColor = vec4(col * alpha, alpha);
    }
  `;

  // живой фон: светлая бумага, по ней плывут голубые и солнечные пятна; в тёмной теме — ночь с синими облаками
  const SKY_FS = HEAD + NOISE + `
    uniform vec2 uRes;
    uniform float uTime;
    uniform vec2 uMouse;
    uniform float uFade;
    uniform float uDark;
    varying vec2 vUv;
    void main() {
      float asp = uRes.x / uRes.y;
      vec2 p = (vUv - .5) * vec2(asp, 1.);
      float t = uTime * .045;
      vec2 q = vec2(fbm(p * .9 + t), fbm(p * .9 - t + 4.));
      float f = fbm(p * 1.05 + q * 1.7 + uMouse * .12);
      float g = fbm(p * 1.3 - q * 1.2 + 7. + t);
      vec2 m = uMouse * vec2(asp, 1.) * .5;
      float near = exp(-dot(p - m, p - m) * 5.);
      vec3 paper = vec3(.906, .922, .945);
      vec3 col = mix(paper, vec3(.74, .8, 1.), smoothstep(.42, .78, f) * .7);
      col = mix(col, vec3(.18, .38, 1.), smoothstep(.6, .92, f) * .13);
      col = mix(col, vec3(1., .82, .45), smoothstep(.55, .85, g) * .22);
      col += vec3(.06, .06, .09) * near;
      vec3 night = vec3(.024, .039, .114);
      vec3 dk = mix(night, vec3(.09, .15, .44), smoothstep(.42, .8, f) * .8);
      dk = mix(dk, vec3(.22, .42, 1.), smoothstep(.62, .92, f) * .24);
      dk = mix(dk, vec3(1., .76, .34), smoothstep(.58, .88, g) * .08);
      dk += vec3(.05, .08, .2) * near;
      vec3 base = mix(paper, night, uDark);
      col = mix(col, dk, uDark) + grain(uTime) * mix(.018, .012, uDark);
      gl_FragColor = vec4(mix(base, col, uFade), 1.);
    }
  `;
  const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';

  const ok = (() => {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  })();

  function setup(canvas, fs) {
    const opts = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' };
    const gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
    if (!gl) return null;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('[shader]', gl.getShaderInfoLog(s)); return null; }
      return s;
    };
    const vs = sh(gl.VERTEX_SHADER, VERT);
    const f = sh(gl.FRAGMENT_SHADER, fs);
    if (!vs || !f) return null;
    const pr = gl.createProgram();
    gl.attachShader(pr, vs);
    gl.attachShader(pr, f);
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);
    // один большой треугольник закрывает весь экран
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {};
    const u = (n) => (n in U ? U[n] : (U[n] = gl.getUniformLocation(pr, n)));
    return { gl, u };
  }

  // размер буфера: ограничиваем число пикселей, чтобы слабые видеокарты не задыхались
  function fit(canvas, gl, maxPx, cap) {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    const s = Math.min(Math.min(window.devicePixelRatio || 1, cap), Math.sqrt(maxPx / (w * h)));
    const W = Math.max(1, Math.round(w * s));
    const H = Math.max(1, Math.round(h * s));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    gl.viewport(0, 0, W, H);
    return [W, H];
  }

  /* ---------- Заставка ---------- */
  function intro(host, cb) {
    const canvas = document.createElement('canvas');
    canvas.className = 'intro-gl';
    host.prepend(canvas);
    const S = setup(canvas, INTRO_FS);
    if (!S) { canvas.remove(); return null; }
    const { gl, u } = S;

    // текстура логотипа: белые буквы на чёрном
    const TW = 2048;
    const TH = 512;
    const tc = document.createElement('canvas');
    tc.width = TW;
    tc.height = TH;
    const g2 = tc.getContext('2d');
    const tex = gl.createTexture();
    const font = (size) => {
      g2.font = '800 ' + size + 'px Unbounded, "Arial Black", sans-serif';
      if ('letterSpacing' in g2) g2.letterSpacing = (-0.05 * size).toFixed(1) + 'px';
    };
    const drawText = () => {
      g2.fillStyle = '#000';
      g2.fillRect(0, 0, TW, TH);
      let size = 330;
      font(size);
      size *= Math.min(1, TW * 0.9 / g2.measureText('SiteCode').width);
      font(size);
      g2.textAlign = 'center';
      g2.textBaseline = 'middle';
      g2.fillStyle = '#ffffff';
      g2.fillText('SiteCode', TW / 2, TH / 2 + size * 0.05);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tc);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      // уровни детализации дают мягкое свечение букв без размытия на процессоре
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.uniform1i(u('uText'), 0);
    };
    // пустая текстура до загрузки шрифта
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    const rect = [0.5, 0.5, 0.37, 0.09];
    const layout = () => {
      const [W, H] = fit(canvas, gl, 1.6e6, 2);
      const cw = canvas.clientWidth || window.innerWidth;
      const ch = canvas.clientHeight || window.innerHeight;
      const tw = Math.min(cw * (cw < 760 ? 0.94 : 0.76), 1400);
      rect[2] = tw / cw / 2;
      rect[3] = tw * (TH / TW) / ch / 2;
      gl.uniform2f(u('uRes'), W, H);
    };
    layout();
    window.addEventListener('resize', layout);

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e) => {
      mouse.tx = e.clientX / window.innerWidth * 2 - 1;
      mouse.ty = -(e.clientY / window.innerHeight * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    const REVEAL = 1.1;
    const HOLD = 0.8;
    const t0 = performance.now();
    let textAt = -1;
    let outAt = -1;
    let outDur = 0.95;
    let held = false;
    let done = false;
    let first = true;

    const fontReady = document.fonts && document.fonts.load
      ? Promise.race([document.fonts.load('800 100px Unbounded'), new Promise((r) => setTimeout(r, 900))])
      : Promise.resolve();
    fontReady.then(() => {
      if (done) return;
      drawText();
      textAt = Math.max(0.25, (performance.now() - t0) / 1000);
    }, () => {});

    const hold = () => { if (held) return; held = true; if (cb.hold) cb.hold(); };
    const startOut = (fast) => {
      if (outAt >= 0 || done) return;
      outAt = performance.now();
      outDur = fast ? 0.7 : 0.95;
      hold();
      if (cb.out) cb.out();
    };
    const finish = () => {
      if (done) return;
      done = true;
      window.removeEventListener('resize', layout);
      window.removeEventListener('pointermove', onMove);
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      if (cb.done) cb.done();
    };

    const frame = (now) => {
      if (done) return;
      requestAnimationFrame(frame);
      const t = (now - t0) / 1000;
      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;
      let rev = 0;
      if (textAt >= 0) {
        rev = ease(clamp((t - textAt) / REVEAL));
        if (rev >= 1) hold();
        if (t - textAt > REVEAL + HOLD) startOut(false);
      }
      let out = 0;
      if (outAt >= 0) {
        out = clamp((now - outAt) / 1000 / outDur);
        if (out >= 1) { finish(); return; }
      }
      gl.uniform1f(u('uTime'), t);
      gl.uniform1f(u('uReveal'), rev);
      gl.uniform1f(u('uOut'), out);
      gl.uniform2f(u('uMouse'), mouse.x, mouse.y);
      gl.uniform4f(u('uRect'), rect[0], rect[1], rect[2], rect[3]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (first) { first = false; host.classList.add('gl-on'); }
    };
    requestAnimationFrame(frame);
    // страховка: если вкладка была скрыта, заставка не должна висеть
    setTimeout(() => startOut(true), 6000);

    return { skip: () => startOut(true) };
  }

  /* ---------- Живой фон первого экрана ---------- */
  function sky(canvas, zone) {
    const S = setup(canvas, SKY_FS);
    if (!S) return;
    const { gl, u } = S;
    // фон мягкий: на телефоне хватает меньшего разрешения, так легче держать 60 кадров рядом с кубиками
    const maxPx = window.matchMedia('(pointer: coarse)').matches ? 2.6e5 : 4.2e5;
    const resize = () => {
      const [W, H] = fit(canvas, gl, maxPx, 1);
      gl.uniform2f(u('uRes'), W, H);
      if (reduce) draw(performance.now());
    };
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      mouse.tx = e.clientX / window.innerWidth * 2 - 1;
      mouse.ty = -(e.clientY / window.innerHeight * 2 - 1);
    }, { passive: true });
    const t0 = performance.now();
    let last = t0;
    let fade = reduce ? 1 : 0;
    let on = false;
    let raf = 0;
    let dark = isDark() ? 1 : 0;
    function draw(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      fade = Math.min(1, fade + dt / 1.4);
      mouse.x += (mouse.tx - mouse.x) * (1 - Math.exp(-dt * 2.5));
      mouse.y += (mouse.ty - mouse.y) * (1 - Math.exp(-dt * 2.5));
      gl.uniform1f(u('uTime'), reduce ? 12 : (now - t0) / 1000);
      gl.uniform1f(u('uFade'), fade);
      gl.uniform1f(u('uDark'), dark);
      gl.uniform2f(u('uMouse'), mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    // тема меняется сразу: переход делает круг, который раскрывается от кнопки
    window.addEventListener('sc:theme', () => {
      dark = isDark() ? 1 : 0;
      if (reduce || !on) draw(performance.now());
    });
    const loop = (now) => {
      if (!on) { raf = 0; return; }
      raf = requestAnimationFrame(loop);
      if (!document.hidden) draw(now);
    };
    new ResizeObserver(resize).observe(canvas);
    resize();
    if (reduce) return;
    // один фон может стоять за несколькими разделами: рисуем, пока на экране хоть один из них
    const zones = [].concat(zone || canvas).filter(Boolean);
    const seen = new Set();
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) seen.add(e.target); else seen.delete(e.target); });
      on = seen.size > 0;
      if (on && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
    });
    zones.forEach((z) => io.observe(z));
  }

  window.SCShader = { ok, intro, sky };
})();
