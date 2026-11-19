/* =========================================================
   SiteCode — интерфейс главной страницы
   Контакты для заявок меняются в объекте SITE
   ========================================================= */
(() => {
  'use strict';

  const SITE = {
    whatsapp: '77789697305', // номер для заявок, без + и пробелов
    telegram: 'Go_Lumi'
  };

  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const waLink = (text) => 'https://wa.me/' + SITE.whatsapp + '?text=' + encodeURIComponent(text);
  const money = (n) => Math.round(n).toLocaleString('ru-RU').replace(/\s/g, ' ') + ' ₸';
  const session = {
    get(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) { /* приватный режим */ } }
  };

  /* ---------- Ссылки на WhatsApp ---------- */
  $$('[data-wa]').forEach((a) => {
    a.href = waLink(a.dataset.wa);
    a.target = '_blank';
    a.rel = 'noopener';
  });

  /* Если 3D не запустилось (нет интернета до CDN, старый браузер), показываем запасные картинки */
  setTimeout(() => {
    if (!root.classList.contains('cubes-on')) root.classList.add('no-cubes');
  }, 6000);

  /* ---------- Разбивка текста для анимаций ---------- */
  function splitWords(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach((word, i) => {
      const outer = document.createElement('span');
      outer.className = 'w';
      const inner = document.createElement('span');
      inner.style.setProperty('--i', i);
      inner.textContent = word;
      outer.appendChild(inner);
      el.appendChild(outer);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  }
  function splitChars(el) {
    const text = el.textContent.trim();
    el.textContent = '';
    Array.from(text).forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.style.setProperty('--i', i);
      s.textContent = ch;
      el.appendChild(s);
    });
  }

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        revealObserver.unobserve(e.target);
      }
    });
  }, { rootMargin: '0px 0px -12% 0px' });

  $$('[data-split]').forEach((el) => {
    splitWords(el);
    if (!el.closest('.hero')) revealObserver.observe(el);
  });
  $$('.hero-word, .footer-word').forEach(splitChars);

  /* ---------- Интро ---------- */
  function ready() {
    if (root.classList.contains('is-ready')) return;
    root.classList.add('is-ready');
    const title = $('.hero-title');
    if (title) title.classList.add('is-in');
    window.__scReady = true;
    window.dispatchEvent(new Event('sc:ready'));
  }

  function runIntro() {
    const intro = $('#intro');
    if (!intro) return ready();
    if (reduce || session.get('sc-intro')) {
      intro.remove();
      return ready();
    }
    session.set('sc-intro', '1');
    root.classList.add('intro-on');

    const sign = $('.sign-text', intro);
    const rect = $('#signRect', intro);
    const line = $('.sign-line', intro);
    const pen = $('.intro-pen', intro);
    const cursor = $('.intro-cursor', intro);
    const penTool = $('.tool-pen', intro);
    const board = $('.intro-board', intro);
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    let finished = false;
    let raf = 0;

    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      intro.classList.add('is-out');
      root.classList.remove('intro-on');
      ready();
      setTimeout(() => intro.remove(), 1200);
    };
    intro.addEventListener('pointerdown', finish);
    window.addEventListener('keydown', finish, { once: true });
    window.addEventListener('wheel', finish, { once: true, passive: true });

    const start = () => {
      if (finished) return;
      const t0 = performance.now();
      let box = null;
      try { box = sign.getBBox(); } catch (e) { box = { x: 80, y: 40, width: 480, height: 140 }; }
      const svg = sign.ownerSVGElement;

      setTimeout(() => intro.classList.add('is-tools'), 40);
      setTimeout(() => {
        const r = penTool.getBoundingClientRect();
        cursor.style.opacity = '1';
        cursor.style.transform = 'translate(' + (r.left + r.width * 0.5) + 'px,' + (r.top + r.height * 0.55) + 'px)';
      }, 280);
      setTimeout(() => penTool.classList.add('is-active'), 760);

      const tick = (now) => {
        const t = now - t0;
        const p = clamp((t - 800) / 1300);
        const e = ease(p);
        rect.setAttribute('width', (box.x + box.width * e + 16).toFixed(1));
        sign.style.strokeDashoffset = (900 * (1 - clamp((t - 760) / 1450))).toFixed(1);
        sign.style.fillOpacity = clamp((t - 1650) / 600).toFixed(3);
        line.style.strokeDashoffset = (1 - ease(clamp((t - 1950) / 450))).toFixed(3);

        if (p > 0 && p < 1) {
          const m = svg.getScreenCTM();
          const b = board.getBoundingClientRect();
          if (m) {
            const pt = new DOMPoint(box.x + box.width * e, box.y + box.height * (0.56 + 0.2 * Math.sin(p * 27))).matrixTransform(m);
            pen.style.opacity = '1';
            pen.style.transform = 'translate(' + (pt.x - b.left) + 'px,' + (pt.y - b.top) + 'px)';
          }
          cursor.style.opacity = '0';
        } else if (p >= 1) {
          pen.style.opacity = '0';
        }
        if (t > 2650) { finish(); return; }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const fontReady = document.fonts && document.fonts.load
      ? Promise.race([document.fonts.load('176px Sacramento'), new Promise((r) => setTimeout(r, 900))])
      : Promise.resolve();
    fontReady.then(start, start);
  }
  runIntro();

  /* ---------- Шапка и мобильное меню ---------- */
  const header = $('#header');
  const burger = $('#burger');
  const mnav = $('#mnav');
  let menuOpen = false;
  let lastY = window.scrollY;

  function setMenu(open) {
    menuOpen = open;
    burger.setAttribute('aria-expanded', String(open));
    mnav.classList.toggle('is-open', open);
    mnav.inert = !open;
    root.classList.toggle('menu-open', open);
    if (open) header.classList.remove('is-hidden');
  }
  burger.addEventListener('click', () => setMenu(!menuOpen));
  $$('a', mnav).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) setMenu(false); });

  function updateHeader(y) {
    header.classList.toggle('is-scrolled', y > 24);
    if (menuOpen) return;
    if (y > lastY + 6 && y > 420) header.classList.add('is-hidden');
    else if (y < lastY - 6 || y < 420) header.classList.remove('is-hidden');
    lastY = y;
  }

  /* ---------- Магнитные кнопки ---------- */
  if (finePointer && !reduce) {
    $$('[data-magnetic]').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        b.style.transform = 'translate(' + (x * 0.18).toFixed(1) + 'px,' + (y * 0.3).toFixed(1) + 'px)';
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
  }

  /* ---------- Замеры для анимаций при прокрутке ---------- */
  const story = $('#story');
  const storySteps = $$('.story-step');
  const storyBars = $$('.story-bars i');
  const toast = $('#leadToast');
  const pin = $('#worksPin');
  const track = $('#worksTrack');
  const worksBar = $('.works-progress i');
  const benefits = $$('.benefit');
  const stepsEl = $('#steps');
  const stepItems = $$('.step');
  const marquee = $('.marquee-track');
  const wideQuery = window.matchMedia('(min-width: 901px)');
  const m = { vh: window.innerHeight, storyTop: 0, trackScroll: 0, pinTop: 0, pinLen: 1, stepsTop: 0, stepsH: 1, mqW: 0 };
  const docTop = (el) => el.getBoundingClientRect().top + window.scrollY;

  function measureShifts() {
    $$('.work').forEach((w) => {
      const img = $('.work-screen img', w);
      const screen = $('.work-screen', w);
      if (!img || !img.naturalWidth) return;
      const h = screen.clientWidth * img.naturalHeight / img.naturalWidth;
      w.style.setProperty('--shift', Math.max(0, h - screen.clientHeight).toFixed(0) + 'px');
    });
  }

  function measure() {
    m.vh = window.innerHeight;
    m.storyTop = docTop(story);
    if (wideQuery.matches) {
      const ts = Math.max(0, track.scrollWidth - window.innerWidth);
      pin.style.setProperty('--track-scroll', ts + 'px');
      m.trackScroll = ts;
      m.pinTop = docTop(pin);
      m.pinLen = Math.max(1, pin.offsetHeight - m.vh);
    } else {
      pin.style.removeProperty('--track-scroll');
      track.style.transform = '';
      m.trackScroll = 0;
    }
    m.stepsTop = docTop(stepsEl);
    m.stepsH = Math.max(1, stepsEl.offsetHeight);
    m.mqW = marquee ? marquee.scrollWidth / 2 : 0;
    measureShifts();
    dirty = true;
  }

  $$('.work-screen img').forEach((img) => {
    img.addEventListener('load', measureShifts);
    img.addEventListener('error', () => { img.style.visibility = 'hidden'; });
  });

  /* ---------- Прокрутка: история, примеры, преимущества, шаги ---------- */
  let dirty = true;
  window.addEventListener('scroll', () => { dirty = true; }, { passive: true });

  function onScroll(y) {
    updateHeader(y);

    // история
    const s = (y - m.storyTop) / m.vh;
    const idx = s < 0.5 ? 0 : s < 1.5 ? 1 : 2;
    storySteps.forEach((el, i) => el.classList.toggle('is-active', i === idx));
    storyBars.forEach((b, i) => b.style.setProperty('--p', clamp(s + 0.5 - i).toFixed(3)));
    toast.classList.toggle('is-on', s > 1.55 && s < 3.1);

    // горизонтальная лента примеров
    if (m.trackScroll) {
      const p = clamp((y - m.pinTop) / m.pinLen);
      track.style.transform = 'translate3d(' + (-p * m.trackScroll).toFixed(1) + 'px,0,0)';
      worksBar.style.setProperty('--p', p.toFixed(4));
    }

    // преимущества: подсвечиваем строку в центре экрана
    const vh = m.vh;
    benefits.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) return;
      const c = r.top + r.height / 2;
      const f = reduce ? 1 : 1 - clamp(Math.abs(c - vh * 0.5) / (vh * 0.42));
      el.style.setProperty('--f', f.toFixed(3));
    });

    // линия шагов
    const pr = clamp((y + vh * 0.72 - m.stepsTop) / (m.stepsH * 0.85));
    stepsEl.style.setProperty('--p', pr.toFixed(3));
    stepItems.forEach((el, i) => el.classList.toggle('is-on', pr >= i / stepItems.length + 0.03));
  }

  /* ---------- Бегущая строка (ускоряется при прокрутке) ---------- */
  let mqX = 0;
  let mqVisible = false;
  let prevY = window.scrollY;
  let vel = 0;
  if (marquee) {
    new IntersectionObserver((e) => { mqVisible = e[0].isIntersecting; }).observe(marquee);
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const y = window.scrollY;
    if (dirty) { dirty = false; onScroll(y); }
    vel += ((y - prevY) - vel) * 0.12;
    prevY = y;
    if (marquee && mqVisible && !reduce && m.mqW) {
      mqX -= (55 + Math.min(1100, Math.abs(vel) * 22)) * dt;
      if (mqX <= -m.mqW) mqX += m.mqW;
      marquee.style.transform = 'translate3d(' + mqX.toFixed(1) + 'px,0,0)';
    }
    requestAnimationFrame(loop);
  }

  /* На телефоне сайт в рамке листается сам, когда карточка на экране */
  const playObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => e.target.classList.toggle('is-playing', e.isIntersecting && !wideQuery.matches));
  }, { threshold: 0.65 });
  $$('.work').forEach((w) => playObserver.observe(w));

  /* ---------- Калькулятор ---------- */
  const calc = $('#calc');
  if (calc) {
    const pages = $('#cpages');
    const pagesOut = $('#cpagesOut');
    const list = $('#receiptLines');
    const totalEl = $('#receiptTotal');
    const send = $('#calcSend');
    let shown = 15000;
    let anim = 0;
    let prevKeys = new Set();

    const animateTotal = (to) => {
      cancelAnimationFrame(anim);
      const from = shown;
      const t0 = performance.now();
      const dur = reduce ? 1 : 650;
      const step = (now) => {
        const p = clamp((now - t0) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        shown = from + (to - from) * e;
        totalEl.textContent = money(Math.round(shown / 100) * 100);
        if (p < 1) anim = requestAnimationFrame(step);
      };
      anim = requestAnimationFrame(step);
    };

    const compute = () => {
      const type = $('input[name="ctype"]:checked', calc);
      const urg = $('input[name="curg"]:checked', calc);
      const n = Number(pages.value);
      pagesOut.textContent = n;
      pages.style.setProperty('--fill', ((n - 1) / 29 * 100).toFixed(1) + '%');

      const items = [[type.dataset.name, Number(type.value)]];
      if (n > 5) items.push(['Ещё страниц: ' + (n - 5), (n - 5) * 900]);
      $$('.calc-extras input:checked', calc).forEach((x) => items.push([x.dataset.name, Number(x.value)]));
      const sum = items.reduce((a, it) => a + it[1], 0);
      const k = Number(urg.value);
      if (k > 1) items.push([urg.dataset.name, sum * (k - 1)]);
      const total = Math.round(sum * k / 100) * 100;

      const keys = new Set(items.map((it) => it[0].replace(/\d+/g, '')));
      list.textContent = '';
      items.forEach(([name, value]) => {
        const li = document.createElement('li');
        if (!prevKeys.has(name.replace(/\d+/g, ''))) li.className = 'is-new';
        const a = document.createElement('span');
        a.textContent = name;
        const b = document.createElement('span');
        b.textContent = money(Math.round(value / 100) * 100);
        li.append(a, b);
        list.appendChild(li);
      });
      prevKeys = keys;
      animateTotal(total);

      const text = 'Здравствуйте! Посчитал сайт в калькуляторе:\n'
        + items.map(([name, value]) => '— ' + name + ': ' + money(Math.round(value / 100) * 100)).join('\n')
        + '\nИтого примерно: ' + money(total) + '\nХочу обсудить.';
      send.href = waLink(text);
      send.target = '_blank';
      send.rel = 'noopener';
    };
    calc.addEventListener('input', compute);
    calc.addEventListener('change', compute);
    compute();
  }

  /* ---------- Вопросы ---------- */
  $$('.faq-item').forEach((item) => {
    const q = $('.faq-q', item);
    q.addEventListener('click', () => {
      const open = !item.classList.contains('is-open');
      item.classList.toggle('is-open', open);
      q.setAttribute('aria-expanded', String(open));
    });
  });

  /* ---------- Форма заявки ---------- */
  const form = $('#leadForm');
  if (form) {
    const nameInput = $('#fName');
    const nameField = $('#fNameField');
    const nameErr = $('#fNameErr');
    const status = $('#formStatus');
    nameInput.addEventListener('input', () => {
      nameField.classList.remove('has-error');
      nameErr.hidden = true;
      nameInput.removeAttribute('aria-invalid');
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = nameInput.value.trim();
      if (!name) {
        nameField.classList.add('has-error');
        nameErr.hidden = false;
        nameInput.setAttribute('aria-invalid', 'true');
        nameInput.focus();
        return;
      }
      const biz = ($('input[name="biz"]:checked', form) || {}).value || 'не указан';
      const need = ($('input[name="need"]:checked', form) || {}).value || 'Пока не знаю';
      const note = $('#fNote').value.trim();
      const text = 'Здравствуйте! Меня зовут ' + name + '.\nБизнес: ' + biz + '.\nНужно: ' + need + '.'
        + (note ? '\nКомментарий: ' + note : '');
      window.open(waLink(text), '_blank', 'noopener');
      status.textContent = 'Открываем WhatsApp — осталось нажать «Отправить».';
    });
  }

  /* ---------- Старт ---------- */
  let rT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rT);
    rT = setTimeout(measure, 150);
  });
  window.addEventListener('load', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  if ('ResizeObserver' in window) {
    let roT = 0;
    new ResizeObserver(() => { clearTimeout(roT); roT = setTimeout(measure, 200); }).observe(document.body);
  }
  measure();
  requestAnimationFrame(loop);
})();
