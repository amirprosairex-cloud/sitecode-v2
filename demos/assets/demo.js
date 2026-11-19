/* =========================================================
   Общие скрипты демо-сайтов SiteCode
   ========================================================= */
(() => {
  'use strict';

  const SITECODE_WA = '77789697305';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const body = document.body;
  const brand = body.dataset.brand || 'Демо';
  const money = (n) => Math.round(n).toLocaleString('ru-RU').replace(/\s/g, ' ') + ' ₸';
  const scLink = (text) => 'https://wa.me/' + SITECODE_WA + '?text=' + encodeURIComponent(text);

  /* ---------- Появление при прокрутке ---------- */
  // Элемент, полностью скрытый через clip-path, браузер считает невидимым,
  // поэтому для «шторок» следим за их родителем.
  const selfTargets = new WeakSet();
  const clipKids = new Map();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      if (selfTargets.has(el)) el.classList.add('in');
      (clipKids.get(el) || []).forEach((k) => k.classList.add('in'));
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
  $$('[data-r], .lines, .zoom-in, [data-count]').forEach((el) => {
    if (el.hasAttribute('data-now')) return;
    const mode = el.getAttribute('data-r');
    if ((mode === 'clip' || mode === 'wipe') && el.parentElement) {
      const host = el.parentElement;
      if (!clipKids.has(host)) clipKids.set(host, []);
      clipKids.get(host).push(el);
      io.observe(host);
      return;
    }
    selfTargets.add(el);
    io.observe(el);
  });
  $$('.lines').forEach((el) => $$('.ln > span', el).forEach((s, i) => s.style.setProperty('--i', i)));
  window.addEventListener('load', () => {
    requestAnimationFrame(() => $$('[data-now]').forEach((el) => el.classList.add('in')));
  });
  setTimeout(() => $$('[data-now]').forEach((el) => el.classList.add('in')), 900);

  /* ---------- Счётчики ---------- */
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      const el = e.target;
      const to = Number(el.dataset.count);
      const dur = reduce ? 1 : 1600;
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        const v = to * (1 - Math.pow(1 - p, 4));
        el.textContent = Math.round(v).toLocaleString('ru-RU');
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => countIO.observe(el));

  /* ---------- Шапка, меню, параллакс ---------- */
  const header = $('[data-header]');
  const burger = $('[data-burger]');
  const menu = $('[data-menu]');
  if (burger && menu) {
    burger.addEventListener('click', () => {
      const open = burger.getAttribute('aria-expanded') !== 'true';
      burger.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('open', open);
      body.classList.toggle('modal-open', open);
    });
    $$('a', menu).forEach((a) => a.addEventListener('click', () => {
      burger.setAttribute('aria-expanded', 'false');
      menu.classList.remove('open');
      body.classList.remove('modal-open');
    }));
  }

  const par = $$('[data-speed]');
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = window.scrollY;
    if (header) header.classList.toggle('scrolled', y > 30);
    if (reduce) return;
    const vh = window.innerHeight;
    par.forEach((el) => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const c = r.top + r.height / 2 - vh / 2;
      el.style.transform = 'translate3d(0,' + (c * Number(el.dataset.speed)).toFixed(1) + 'px,0)';
    });
    document.documentElement.style.setProperty('--scroll', y.toFixed(0));
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- Вкладки ---------- */
  $$('[data-tabs]').forEach((wrap) => {
    const btns = $$('[data-tab]', wrap);
    const panels = $$('[data-panel]', wrap);
    btns.forEach((b) => b.addEventListener('click', () => {
      btns.forEach((x) => x.setAttribute('aria-selected', String(x === b)));
      panels.forEach((p) => {
        const on = p.dataset.panel === b.dataset.tab;
        p.hidden = !on;
        if (on) {
          $$('[data-r]', p).forEach((el, i) => {
            el.classList.remove('in');
            el.style.setProperty('--d', (i * 0.06) + 's');
            requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
          });
        }
      });
    }));
  });

  /* ---------- До / после ---------- */
  $$('.ba').forEach((ba) => {
    const r = $('input[type="range"]', ba);
    if (!r) return;
    const set = () => ba.style.setProperty('--pos', r.value + '%');
    r.addEventListener('input', set);
    set();
    // лёгкая подсказка: слайдер сам качнётся, когда появится на экране
    if (!reduce) {
      const hint = new IntersectionObserver((e) => {
        if (!e[0].isIntersecting) return;
        hint.disconnect();
        const t0 = performance.now();
        const anim = (now) => {
          const p = Math.min(1, (now - t0) / 1600);
          r.value = String(50 + Math.sin(p * Math.PI * 2) * 18 * (1 - p));
          set();
          if (p < 1) requestAnimationFrame(anim);
        };
        requestAnimationFrame(anim);
      }, { threshold: 0.6 });
      hint.observe(ba);
    }
  });

  /* ---------- Картинка за курсором ---------- */
  const hoverItems = $$('[data-hover-img]');
  if (hoverItems.length && fine && !reduce) {
    const fl = document.createElement('div');
    fl.className = 'd-float';
    const img = document.createElement('img');
    img.alt = '';
    fl.appendChild(img);
    body.appendChild(fl);
    let x = 0, y = 0, cx = 0, cy = 0, raf = 0, on = false;
    const loop = () => {
      cx += (x - cx) * 0.16;
      cy += (y - cy) * 0.16;
      fl.style.left = cx + 'px';
      fl.style.top = cy + 'px';
      if (on || Math.abs(x - cx) > 0.5) raf = requestAnimationFrame(loop);
    };
    hoverItems.forEach((it) => {
      it.addEventListener('pointerenter', (e) => {
        img.src = it.dataset.hoverImg;
        x = cx = e.clientX; y = cy = e.clientY;
        on = true;
        fl.classList.add('on');
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(loop);
      });
      it.addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; });
      it.addEventListener('pointerleave', () => { on = false; fl.classList.remove('on'); });
    });
    window.addEventListener('scroll', () => { if (on) { on = false; fl.classList.remove('on'); } }, { passive: true });
  }

  /* ---------- Наклон карточек за мышью ---------- */
  if (fine && !reduce) {
    $$('[data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(900px) rotateY(' + (px * 10).toFixed(2) + 'deg) rotateX(' + (-py * 10).toFixed(2) + 'deg)';
        el.style.setProperty('--gx', ((px + 0.5) * 100).toFixed(1) + '%');
        el.style.setProperty('--gy', ((py + 0.5) * 100).toFixed(1) + '%');
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- Окна и формы записи ---------- */
  let lastFocus = null;
  function openModal(id, preset) {
    const m = document.getElementById(id);
    if (!m) return;
    lastFocus = document.activeElement;
    const sheet = $('.d-sheet', m);
    if (sheet.dataset.original) sheet.innerHTML = sheet.dataset.original;
    else sheet.dataset.original = sheet.innerHTML;
    bindForm(m);
    if (preset) {
      Object.keys(preset).forEach((name) => {
        const inp = $$('[name="' + name + '"]', m).find((i) => i.value === preset[name]);
        if (inp) inp.checked = true;
      });
    }
    m.classList.add('open');
    body.classList.add('modal-open');
    m.setAttribute('aria-hidden', 'false');
    setTimeout(() => {
      const first = $('input:not([type="radio"]):not([type="checkbox"]), select, textarea', m) || $('button', m);
      if (first && fine) first.focus();
    }, 350);
    window.dispatchEvent(new CustomEvent('demo:modal', { detail: { id, modal: m } }));
  }
  function closeModal(m) {
    m.classList.remove('open');
    body.classList.remove('modal-open');
    m.setAttribute('aria-hidden', 'true');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $$('.d-modal').forEach((m) => {
    m.setAttribute('aria-hidden', 'true');
    m.addEventListener('click', (e) => {
      if (e.target === m || e.target.closest('[data-close]')) closeModal(m);
    });
  });
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const m = $('.d-modal.open');
    if (m) closeModal(m);
  });
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-open]');
    if (!t) return;
    e.preventDefault();
    let preset = null;
    if (t.dataset.preset) { try { preset = JSON.parse(t.dataset.preset); } catch (err) { preset = null; } }
    openModal(t.dataset.open, preset);
  });

  function collect(form) {
    const rows = [];
    $$('[data-label]', form).forEach((el) => {
      let v = '';
      if (el.tagName === 'FIELDSET') v = $$('input:checked', el).map((i) => i.value).join(', ');
      else v = (el.value || '').trim();
      if (v) rows.push([el.dataset.label, v]);
    });
    return rows;
  }

  function validate(form) {
    let ok = true;
    $$('[data-required]', form).forEach((el) => {
      const field = el.closest('.d-field');
      let good;
      if (el.tagName === 'FIELDSET') good = !!$('input:checked', el);
      else if (el.type === 'tel') good = (el.value.match(/\d/g) || []).length >= 10;
      else good = el.value.trim().length > 0;
      if (field) field.classList.toggle('err', !good);
      if (!good && ok) {
        ok = false;
        const f = el.tagName === 'FIELDSET' ? $('input', el) : el;
        if (f) f.focus();
      }
    });
    return ok;
  }

  function showResult(sheet, title, rows) {
    const now = new Date();
    const time = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    sheet.textContent = '';
    const close = document.createElement('button');
    close.className = 'd-close';
    close.type = 'button';
    close.setAttribute('data-close', '');
    close.setAttribute('aria-label', 'Закрыть');
    close.textContent = '×';
    const wrap = document.createElement('div');
    wrap.className = 'd-result';
    const h = document.createElement('h3');
    h.textContent = 'Готово! Так заявка придёт владельцу';
    const p = document.createElement('p');
    p.className = 'd-note';
    p.textContent = 'Сразу в WhatsApp, без звонков и потерянных сообщений. Это демо-сайт, поэтому сообщение никуда не отправлено.';
    const chat = document.createElement('div');
    chat.className = 'd-chat';
    chat.innerHTML = '<div class="d-chat-head"><span class="d-chat-ava"></span><div><b></b><small>WhatsApp Business</small></div></div><div class="d-chat-body"><div class="d-bubble"></div></div>';
    $('.d-chat-ava', chat).textContent = brand.charAt(0);
    $('.d-chat-head b', chat).textContent = brand;
    const bubble = $('.d-bubble', chat);
    const bt = document.createElement('b');
    bt.textContent = title;
    bubble.appendChild(bt);
    rows.forEach(([k, v]) => {
      const row = document.createElement('div');
      row.className = 'row';
      const s = document.createElement('span');
      s.textContent = k + ': ';
      row.appendChild(s);
      row.appendChild(document.createTextNode(v));
      bubble.appendChild(row);
    });
    const tm = document.createElement('time');
    tm.textContent = time + ' ✓✓';
    bubble.appendChild(tm);
    const actions = document.createElement('div');
    actions.className = 'd-actions';
    const sc = document.createElement('a');
    sc.className = 'd-sc';
    sc.href = scLink('Здравствуйте! Посмотрел демо-сайт ' + brand + '. Хочу такой сайт для своего бизнеса.');
    sc.target = '_blank';
    sc.rel = 'noopener';
    sc.textContent = 'Хочу такой сайт для своего бизнеса';
    const back = document.createElement('button');
    back.className = 'd-ghost';
    back.type = 'button';
    back.setAttribute('data-close', '');
    back.textContent = 'Вернуться на сайт';
    actions.append(sc, back);
    wrap.append(h, chat, p, actions);
    sheet.append(close, wrap);
  }

  function bindForm(m) {
    const form = $('form[data-wa-form]', m);
    if (!form || form.dataset.bound) return;
    form.dataset.bound = '1';
    form.addEventListener('input', (e) => {
      const f = e.target.closest('.d-field');
      if (f) f.classList.remove('err');
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validate(form)) return;
      const rows = (window.DemoExtraRows ? window.DemoExtraRows(form) : []).concat(collect(form));
      showResult($('.d-sheet', m), form.dataset.waForm, rows);
      window.dispatchEvent(new CustomEvent('demo:sent', { detail: { form } }));
    });
  }
  // встроенные (не во всплывающем окне) формы
  $$('form[data-wa-form]').forEach((form) => {
    if (form.closest('.d-modal')) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validate(form)) return;
      const m = document.getElementById('demoResult');
      if (!m) return;
      lastFocus = document.activeElement;
      showResult($('.d-sheet', m), form.dataset.waForm, collect(form));
      m.classList.add('open');
      body.classList.add('modal-open');
      m.setAttribute('aria-hidden', 'false');
    });
    form.addEventListener('input', (e) => {
      const f = e.target.closest('.d-field');
      if (f) f.classList.remove('err');
    });
  });

  /* Дни для записи: сегодня, завтра и т.д. */
  const DAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  function fillDays(container, name, count) {
    const d = new Date();
    for (let i = 0; i < count; i++) {
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
      const label = i === 0 ? 'Сегодня' : i === 1 ? 'Завтра' : DAYS[day.getDay()] + ', ' + day.getDate();
      const value = (i === 0 ? 'сегодня, ' : i === 1 ? 'завтра, ' : '') + day.getDate() + ' ' + MONTHS[day.getMonth()];
      const l = document.createElement('label');
      l.className = 'd-chip';
      l.innerHTML = '<input type="radio"><span></span>';
      const inp = $('input', l);
      inp.name = name;
      inp.value = value;
      if (i === 0) inp.checked = true;
      $('span', l).textContent = label;
      container.appendChild(l);
    }
  }
  window.addEventListener('demo:modal', (e) => {
    $$('[data-days]', e.detail.modal).forEach((c) => {
      if (!c.children.length) fillDays(c, c.dataset.days, Number(c.dataset.n || 6));
    });
  });
  $$('[data-days]').forEach((c) => {
    if (!c.closest('.d-modal') && !c.children.length) fillDays(c, c.dataset.days, Number(c.dataset.n || 6));
  });

  /* ---------- Плашка «Демо от SiteCode» ---------- */
  let hidden = false;
  try { hidden = window.sessionStorage.getItem('sc-badge-hidden') === '1'; } catch (e) { hidden = false; }
  if (!hidden) {
    const badge = document.createElement('div');
    badge.className = 'd-badge';
    badge.innerHTML = '<a class="home" href="../index.html#works">Демо от SiteCode</a><a class="want" target="_blank" rel="noopener">Хочу такой сайт</a><button type="button" aria-label="Скрыть">×</button>';
    $('.want', badge).href = scLink('Здравствуйте! Посмотрел демо-сайт ' + brand + '. Хочу такой сайт для своего бизнеса.');
    $('button', badge).addEventListener('click', () => {
      badge.classList.remove('show');
      try { window.sessionStorage.setItem('sc-badge-hidden', '1'); } catch (e) { /* ничего */ }
    });
    body.appendChild(badge);
    setTimeout(() => badge.classList.add('show'), 1800);
  }

  window.Demo = { openModal, money, scLink, $, $$ };
})();
