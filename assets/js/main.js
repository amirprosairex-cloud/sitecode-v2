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
  // буквы «Code» в большом слове: их заменяют кубики при прокрутке
  $$('.hero-word .ch').forEach((s, i) => { if (i >= 4) s.classList.add('cc'); });

  /* ---------- Интро: логотип пишется светом и тает в сайт ---------- */
  const shader = window.SCShader;
  // кубики начинают собираться, пока логотип стоит на месте, — без рывков в анимации
  const bootCubes = () => {
    if (window.__scBoot) return;
    window.__scBoot = true;
    window.dispatchEvent(new Event('sc:boot'));
  };
  function ready() {
    if (root.classList.contains('is-ready')) return;
    root.classList.add('is-ready');
    const title = $('.hero-title');
    if (title) title.classList.add('is-in');
    bootCubes();
    window.__scReady = true;
    window.dispatchEvent(new Event('sc:ready'));
    // живой фон первого экрана проявляется вместе с текстом
    const sky = $('.hero-sky');
    if (sky && shader && shader.ok) shader.sky(sky, $('.hero'));
  }

  function runIntro() {
    const intro = $('#intro');
    if (!intro) return ready();
    if (reduce || session.get('sc-intro') || !shader || !shader.ok) {
      intro.remove();
      return ready();
    }
    session.set('sc-intro', '1');
    root.classList.add('intro-on');
    const ctl = shader.intro(intro, {
      hold: bootCubes,
      out: () => {
        intro.classList.add('is-out');
        root.classList.remove('intro-on');
        ready();
      },
      done: () => intro.remove()
    });
    if (!ctl) {
      intro.remove();
      root.classList.remove('intro-on');
      return ready();
    }
    intro.addEventListener('pointerdown', ctl.skip);
    window.addEventListener('keydown', ctl.skip, { once: true });
    window.addEventListener('wheel', ctl.skip, { once: true, passive: true });
    window.addEventListener('touchmove', ctl.skip, { once: true, passive: true });
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

  let isDeep = false;
  function updateHeader(y) {
    header.classList.toggle('is-scrolled', y > 24);
    // ниже примеров сайт тёмный: шапка тоже темнеет, а фон под заявкой становится ночным,
    // пока тёмные разделы целиком закрывают экран — переключение не видно
    if (m.darkTop) {
      header.classList.toggle('on-dark', y > m.darkTop - 40);
      const deep = y > m.darkTop + 60;
      if (deep !== isDeep) { isDeep = deep; root.classList.toggle('deep', deep); }
    }
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
  const works = $('#works');
  const benefits = $$('.benefit');
  const darkStart = $('#benefits');
  const stepsEl = $('#steps');
  const stepItems = $$('.step');
  const marquee = $('.marquee-track');
  const night = $('#night');
  const anatomy = $('#anatomy');
  const storyStage = $('.story-stage');
  const m = { vh: window.innerHeight, storyTop: 0, storyH: 1, worksTop: 0, stepsTop: 0, stepsH: 1, mqW: 0, darkTop: 0 };
  const docTop = (el) => el.getBoundingClientRect().top + window.scrollY;

  function measureShifts() {
    $$('.cf-card').forEach((w) => {
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
    m.storyH = Math.max(1, story.offsetHeight);
    m.worksTop = docTop(works);
    m.darkTop = darkStart ? docTop(darkStart) : 0;
    m.stepsTop = docTop(stepsEl);
    m.stepsH = Math.max(1, stepsEl.offsetHeight);
    m.mqW = marquee ? marquee.scrollWidth / 2 : 0;
    if (night && storyStage) {
      night.style.setProperty('--gx', ((storyStage.offsetLeft + storyStage.offsetWidth / 2) / window.innerWidth * 100).toFixed(1) + '%');
      night.style.setProperty('--gy', ((storyStage.offsetTop + storyStage.offsetHeight / 2) / window.innerHeight * 100).toFixed(1) + '%');
    }
    measureShifts();
    placeAnatomy();
    lastNight = -1;
    dirty = true;
  }

  $$('.work-screen img').forEach((img) => {
    img.addEventListener('load', measureShifts);
    img.addEventListener('error', () => { img.style.visibility = 'hidden'; });
  });

  /* ---------- Сцена: тёмная панель истории поднимается снизу вместе с разделом ---------- */
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  let lastNight = -1;
  let lastClip = '';
  if (night) root.classList.add('night-ready');
  function updateScene(y) {
    if (!night) return;
    const vh = m.vh;
    const top = m.storyTop - y;
    const bottom = top + m.storyH;
    const t = clamp(top, 0, vh);
    const b = clamp(vh - bottom, 0, vh);
    // у верхнего края скругление, пока панель поднимается; на весь экран — без углов
    const r = Math.round((vh < 700 || window.innerWidth < 760 ? 28 : 44) * clamp(top / 90));
    const clip = 'inset(' + t.toFixed(0) + 'px 0 ' + b.toFixed(0) + 'px 0 round ' + r + 'px ' + r + 'px 0 0)';
    if (clip !== lastClip) {
      lastClip = clip;
      night.style.clipPath = clip;
    }
    const k = smooth(0.25, 1, 1 - t / vh);
    if (Math.abs(k - lastNight) < 0.004) return;
    lastNight = k;
    night.style.setProperty('--glow', k.toFixed(3));
  }

  /* ---------- Подписи «из чего состоит сайт» ---------- */
  const anats = anatomy ? $$('.anat', anatomy) : [];
  const anatSvg = $('#anatomyLines');
  let anchors = window.__scAnchors || null;
  window.addEventListener('sc:anchors', (e) => { anchors = e.detail; placeAnatomy(); });
  function placeAnatomy() {
    if (!anatomy || !anchors) return;
    const vw = window.innerWidth;
    // на средних экранах подписи слева не залезают на текст истории
    const off = vw >= 1240
      ? [[-20, -74], [-175, -40], [-175, 40], [40, -84], [0, 96]]
      : vw >= 901
        ? [[-10, -74], [-120, -44], [40, 74], [40, -84], [60, 104]]
        : [[0, -46], [-40, -28], [-30, 44], [10, -50], [0, 60]];
    let svg = '';
    anats.forEach((el, k) => {
      const a = anchors[Number(el.dataset.a)];
      if (!a || !Number.isFinite(a.x) || !Number.isFinite(a.y)) return;
      const b = $('b', el);
      const w = b.offsetWidth || 150;
      const lx = Math.min(vw - w / 2 - 10, Math.max(w / 2 + 10, a.x + off[k][0]));
      const ly = a.y + off[k][1];
      el.style.setProperty('--ax', a.x.toFixed(1) + 'px');
      el.style.setProperty('--ay', a.y.toFixed(1) + 'px');
      el.style.setProperty('--lx', lx.toFixed(1) + 'px');
      el.style.setProperty('--ly', ly.toFixed(1) + 'px');
      el.style.setProperty('--k', k);
      svg += '<line x1="' + a.x.toFixed(1) + '" y1="' + a.y.toFixed(1) + '" x2="' + lx.toFixed(1) + '" y2="' + ly.toFixed(1) + '"/>';
    });
    anatSvg.innerHTML = svg;
  }

  /* ---------- Прокрутка: история, преимущества, шаги ---------- */
  let dirty = true;
  window.addEventListener('scroll', () => { dirty = true; }, { passive: true });

  function onScroll(y) {
    updateHeader(y);
    updateScene(y);

    // история
    const s = (y - m.storyTop) / m.vh;
    const idx = s < 0.5 ? 0 : s < 1.5 ? 1 : 2;
    storySteps.forEach((el, i) => el.classList.toggle('is-active', i === idx));
    storyBars.forEach((b, i) => b.style.setProperty('--p', clamp(s + 0.5 - i).toFixed(3)));
    toast.classList.toggle('is-on', s > 1.55 && s < 3.1);
    if (anatomy) anatomy.classList.toggle('is-on', s > -0.02 && s < 0.48);

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

  /* ---------- 3D-карусель примеров ---------- */
  const cflow = $('#cflow');
  if (cflow) {
    const cards = $$('.cf-card', cflow);
    const n = cards.length;
    const text = $('.cf-text', cflow);
    const kindEl = $('#cfKind');
    const nameEl = $('#cfName');
    const descEl = $('#cfDesc');
    const tagsEl = $('#cfTags');
    const openEl = $('#cfOpen');
    const idxEl = $('#cfIndex');
    const stage = $('#cflowStage');
    // цвет текста на кнопке под цвет акцента
    const ACFG = { '#C9A35E': '#16120F', '#E2A43A': '#2A1B12', '#1A1A22': '#FFD84D', '#5BE6D6': '#053F3C', '#9FF5EA': '#0B2C31', '#F7B9C9': '#2E1F27', '#2A2610': '#F3E6A6' };
    const touch = window.matchMedia('(hover: none)').matches;
    let cur = 0;
    let timer = 0;
    let touched = false;
    let inView = false;

    const fill = (a) => {
      kindEl.textContent = a.kind;
      nameEl.textContent = a.name;
      descEl.textContent = a.desc;
      tagsEl.textContent = '';
      (a.tags || '').split('|').forEach((t) => {
        if (!t) return;
        const li = document.createElement('li');
        li.textContent = t;
        tagsEl.appendChild(li);
      });
      openEl.href = $('.work-frame', cards[cur]).getAttribute('href');
      openEl.setAttribute('aria-label', 'Открыть демо ' + a.name);
    };

    const render = (first) => {
      cards.forEach((c, i) => {
        let d = i - cur;
        if (d > n / 2) d -= n;
        if (d < -n / 2) d += n;
        const ad = Math.abs(d);
        c.style.setProperty('--d', d);
        c.style.setProperty('--ad', ad);
        c.style.zIndex = String(20 - ad);
        c.style.opacity = ad > 2 ? '0' : String(1 - ad * 0.22);
        c.style.pointerEvents = ad > 2 ? 'none' : 'auto';
        c.classList.toggle('is-active', d === 0);
        c.classList.toggle('is-playing', d === 0 && touch);
        c.setAttribute('aria-hidden', String(d !== 0));
        $('.work-frame', c).tabIndex = d === 0 ? 0 : -1;
      });
      const a = cards[cur].dataset;
      works.style.backgroundColor = a.bg;
      works.style.color = a.fg;
      works.style.setProperty('--wac', a.ac);
      works.style.setProperty('--wacfg', ACFG[a.ac] || '#FFFFFF');
      idxEl.textContent = String(cur + 1);
      if (first || reduce) { fill(a); return; }
      text.classList.add('swap');
      setTimeout(() => { fill(a); text.classList.remove('swap'); }, 260);
    };
    const go = (i) => { cur = (i + n) % n; render(false); };
    const stop = () => { touched = true; clearInterval(timer); };
    const auto = () => {
      clearInterval(timer);
      if (!touched && inView && !reduce) timer = setInterval(() => go(cur + 1), 5200);
    };

    // если карточка ушла за верх экрана, плавно возвращаем всю карусель в кадр
    const frame = () => {
      const top = stage.getBoundingClientRect().top;
      const bottom = $('.cflow-info').getBoundingClientRect().bottom;
      const head = 78;
      if (top < head || bottom > window.innerHeight) {
        const room = window.innerHeight - head - (bottom - top);
        window.scrollBy({ top: top - head - Math.max(0, room / 2), behavior: 'smooth' });
      }
    };
    $('#cfPrev').addEventListener('click', () => { stop(); go(cur - 1); frame(); });
    $('#cfNext').addEventListener('click', () => { stop(); go(cur + 1); frame(); });
    cards.forEach((c, i) => c.addEventListener('click', (e) => {
      if (i !== cur) { e.preventDefault(); stop(); go(i); }
    }));
    cflow.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { stop(); go(cur - 1); }
      if (e.key === 'ArrowRight') { stop(); go(cur + 1); }
    });

    // свайп и перетаскивание мышью
    let sx = 0;
    let sy0 = 0;
    let dragging = false;
    let swiped = false;
    stage.addEventListener('pointerdown', (e) => { dragging = true; swiped = false; sx = e.clientX; sy0 = e.clientY; });
    window.addEventListener('pointerup', (e) => {
      if (!dragging) return;
      dragging = false;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy0;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        swiped = true;
        stop();
        go(cur + (dx < 0 ? 1 : -1));
      }
    });
    stage.addEventListener('click', (e) => {
      if (swiped) { e.preventDefault(); e.stopPropagation(); swiped = false; }
    }, true);

    // сама листается, пока блок на экране и посетитель её не трогал
    new IntersectionObserver((es) => {
      inView = es[0].isIntersecting;
      if (inView) auto(); else clearInterval(timer);
    }, { threshold: 0.4 }).observe(stage);
    stage.addEventListener('pointerenter', () => clearInterval(timer));
    stage.addEventListener('pointerleave', auto);

    render(true);
  }

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
