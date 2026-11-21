/* =========================================================
   SiteCode — живые плитки «Что получает ваш бизнес»
   Каждая плитка показывает, как это работает, а не рассказывает
   ========================================================= */
(() => {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const watch = (el, cb, threshold = 0.3) => new IntersectionObserver((es) => cb(es[0].isIntersecting), { threshold }).observe(el);

  /* ---------- Свет под курсором на плитках и тарифах ---------- */
  if (fine) {
    $$('[data-spot]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
      });
    });
  }

  /* ---------- Плитки, которые оживают один раз ---------- */
  const once = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    once.unobserve(e.target);
  }), { threshold: 0.35 });
  $$('.t-page, .t-keys, .t-stats').forEach((el) => once.observe(el));

  /* ---------- Заявка с сайта летит в WhatsApp ---------- */
  const wa = $('.t-wa');
  if (wa) {
    const LEADS = [
      ['Айгерим', 'Стрижка и укладка', 'Сегодня, 18:30'],
      ['Данияр', 'Полировка и керамика', 'Завтра, 10:00'],
      ['Мадина', 'Чистка зубов', 'Пятница, 15:00'],
      ['Ержан', 'Раф навынос', 'Через 15 минут'],
      ['Алина', 'Маникюр и брови', 'Суббота, 12:00'],
      ['Тимур', 'Сумка «Агат»', 'Доставка завтра']
    ];
    const field = (k) => $('[data-f="' + k + '"]', wa);
    const send = $('.wa-send', wa);
    const chat = $('#waChat');
    const countEl = $('#waCount');
    const link = $('.wa-link', wa);
    const svg = $('.wa-pipe', wa);
    const path = $('.wa-path', wa);
    const dot = $('.wa-dot', wa);
    let count = Number(countEl.textContent) || 6;
    let next = 0;
    let running = false;
    let looping = false;

    const now = () => {
      const d = new Date();
      return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    };
    const addMsg = (lead, animate) => {
      const m = document.createElement('div');
      m.className = 'wa-msg';
      if (!animate) m.style.animation = 'none';
      const title = document.createElement('b');
      title.textContent = 'Новая заявка с сайта';
      const dl = document.createElement('dl');
      [['Имя', lead[0]], ['Услуга', lead[1]], ['Когда', lead[2]]].forEach(([k, v]) => {
        const dt = document.createElement('dt');
        dt.textContent = k;
        const dd = document.createElement('dd');
        dd.textContent = v;
        dl.append(dt, dd);
      });
      const t = document.createElement('time');
      t.textContent = now();
      m.append(title, dl, t);
      chat.appendChild(m);
      // старые сообщения уже уехали за верхний край — убираем их из разметки
      while (chat.children.length > 4) chat.firstElementChild.remove();
    };
    const type = async (el, text) => {
      el.classList.add('typing');
      el.textContent = '';
      for (const ch of text) {
        el.textContent += ch;
        await sleep(42);
      }
      el.classList.remove('typing');
    };
    // светящаяся точка бежит по линии от кнопки к телефону
    const fly = () => new Promise((resolve) => {
      if (!link || link.offsetParent === null) { resolve(); return; }
      const len = path.getTotalLength();
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / 720);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        const pt = path.getPointAtLength(e * len);
        const sr = svg.getBoundingClientRect();
        const lr = link.getBoundingClientRect();
        const x = sr.left - lr.left + pt.x / 200 * sr.width;
        const y = sr.top - lr.top + pt.y / 100 * sr.height;
        dot.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
        dot.style.opacity = String(k < 0.12 ? k / 0.12 : k > 0.88 ? (1 - k) / 0.12 : 1);
        if (k < 1) requestAnimationFrame(step); else resolve();
      };
      requestAnimationFrame(step);
    });
    const loop = async () => {
      if (looping) return;
      looping = true;
      while (running) {
        const lead = LEADS[next % LEADS.length];
        next += 1;
        await type(field('name'), lead[0]);
        field('service').textContent = lead[1];
        field('time').textContent = lead[2];
        await sleep(500);
        send.classList.add('press');
        await sleep(190);
        send.classList.remove('press');
        await fly();
        addMsg(lead, true);
        count += 1;
        countEl.textContent = String(count);
        countEl.classList.remove('bump');
        void countEl.offsetWidth;
        countEl.classList.add('bump');
        await sleep(2300);
      }
      looping = false;
    };

    // к моменту, когда посетитель долистал, пара заявок уже пришла
    addMsg(LEADS[4], false);
    addMsg(LEADS[5], false);
    if (!reduce) watch(wa, (v) => { running = v; if (v) loop(); });
  }

  /* ---------- Телефон: настоящий сайт листается сам, телефон наклоняется за курсором ---------- */
  const ph = $('.t-phone');
  if (ph) {
    const scr = $('.mp-screen', ph);
    const mp = $('.mini-phone', ph);
    const setH = () => ph.style.setProperty('--sh', scr.clientHeight + 'px');
    setH();
    window.addEventListener('resize', setH);
    watch(ph, (v) => ph.classList.toggle('in', v), 0.2);
    if (fine && !reduce) {
      ph.addEventListener('pointermove', (e) => {
        const r = ph.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        mp.style.setProperty('--ry', (x * 28).toFixed(1) + 'deg');
        mp.style.setProperty('--rx', (-y * 16).toFixed(1) + 'deg');
      });
      ph.addEventListener('pointerleave', () => {
        mp.style.removeProperty('--ry');
        mp.style.removeProperty('--rx');
      });
    }
  }

  /* ---------- Правки: цена в прайсе меняется на глазах ---------- */
  const ed = $('.t-edit');
  if (ed && !reduce) {
    const val = $('#edVal');
    const num = $('#edNum');
    const PRICES = ['5 000', '6 000', '5 500', '6 500'];
    let k = 0;
    let n = 3;
    let on = false;
    let busy = false;
    const run = async () => {
      if (busy) return;
      busy = true;
      while (on) {
        await sleep(1300);
        val.classList.add('sel');
        await sleep(650);
        k = (k + 1) % PRICES.length;
        val.classList.remove('sel');
        val.textContent = '';
        for (const ch of PRICES[k]) {
          val.textContent += ch;
          await sleep(95);
        }
        n += 1;
        num.textContent = '№' + n;
        await sleep(1500);
      }
      busy = false;
    };
    watch(ed, (v) => { on = v; if (v) run(); }, 0.4);
  }
})();
