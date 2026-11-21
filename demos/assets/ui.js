/* =========================================================
   Лёгкая часть демо: прокрутка, сцены, математика.
   Без three.js — работает сразу, пока 3D ещё грузится.
   ========================================================= */
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

/* Дождаться, пока браузер нарисует страницу: тяжёлое 3D не должно задерживать первый кадр */
export const afterPaint = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 40))));

/* Сцены липкого экрана: карточки, большое слово, полоски прогресса и подсказка.
   Работает с первой секунды, независимо от загрузки 3D. */
export function scrollScenes(section, o) {
  let cur = -1;
  let timer = 0;
  const run = () => {
    const p = progressOf(section);
    const i = sceneAt(p, o.marks);
    if (i !== cur) {
      cur = i;
      o.scenes.forEach((s, k) => s.classList.toggle('on', k === i));
      if (o.word && o.words) {
        o.word.classList.add('swap');
        clearTimeout(timer);
        timer = setTimeout(() => { o.word.textContent = o.words[cur]; o.word.classList.remove('swap'); }, 260);
      }
      if (o.onScene) o.onScene(i);
    }
    if (o.bars) o.bars.forEach((b, k) => b.style.setProperty('--f', clamp((p - o.marks[k]) / ((o.marks[k + 1] ?? 1) - o.marks[k])).toFixed(3)));
    if (o.hint) o.hint.style.opacity = p > 0.03 ? '0' : '1';
    if (o.onProgress) o.onProgress(p);
  };
  window.addEventListener('scroll', run, { passive: true });
  window.addEventListener('resize', run);
  run();
  return run;
}
