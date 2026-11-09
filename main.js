(() => {
  const hero = document.querySelector('[data-hero]');
  const img = document.querySelector('[data-parallax]');
  const burger = document.querySelector('[data-burger]');
  const drawer = document.querySelector('[data-drawer]');

  // ===== Прелоадер → анімація появи першого екрану =====
  const root = document.documentElement;
  const pre = document.querySelector('[data-preloader]');
  const bar = document.querySelector('[data-pre-bar]');
  const count = document.querySelector('[data-pre-count]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const reveal = () => requestAnimationFrame(() => root.classList.add('is-loaded'));

  if (!pre) {
    if (img.complete) reveal(); else { img.addEventListener('load', reveal); img.addEventListener('error', reveal); }
  } else {
    const MIN = reduceMotion ? 300 : 2400;          // мінімальний час, щоб анімація ліхтаря встигла програтись
    const MAX = 8000;                               // запобіжник: не тримаємо екран довше
    const t0 = performance.now();
    let ready = false;

    const imgReady = img.complete ? Promise.resolve() : new Promise((r) => { img.addEventListener('load', r); img.addEventListener('error', r); });
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    Promise.all([imgReady, fontsReady]).then(() => { ready = true; });
    setTimeout(() => { ready = true; }, MAX);

    let shown = 0;
    const ease = (x) => 1 - Math.pow(1 - x, 3);
    const tick = (now) => {
      const t = Math.min((now - t0) / MIN, 1);
      // поки ресурси не готові — повзе до 90%, після готовності добігає до 100%
      const target = ready ? ease(t) * 100 : Math.min(ease(t) * 100, 90);
      shown += (target - shown) * 0.18;
      const v = Math.min(100, Math.round(shown));
      count.textContent = v;
      bar.style.transform = `scaleX(${(shown / 100).toFixed(3)})`;

      if (ready && t >= 1 && v >= 100) {
        count.textContent = 100;
        bar.style.transform = 'scaleX(1)';
        setTimeout(() => {
          pre.classList.add('is-done');
          root.classList.remove('is-preloading');
          setTimeout(reveal, reduceMotion ? 0 : 280);  // хіро починає зʼявлятися під шторкою
          pre.addEventListener('transitionend', (e) => { if (e.target === pre) pre.remove(); });
          setTimeout(() => pre.remove(), 1600);
        }, 240);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // М'який паралакс фото при скролі
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, hero.offsetHeight);
        // фото відстає від скролу (зсув униз) — низ ховається під overflow, без сірої смуги між блоками
        img.style.translate = `0 ${(y * 0.24).toFixed(1)}px`;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Мобільне меню
  const toggle = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
    drawer.hidden = !open;
  };
  burger.addEventListener('click', () => toggle(drawer.hidden));
  drawer.addEventListener('click', (e) => { if (e.target.closest('a')) toggle(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggle(false); });
})();

// ===== Про нас: дві прокрутки у протилежні боки =====
(() => {
  const section = document.querySelector('[data-about]');
  if (!section) return;
  const media = section.querySelector('[data-track="media"]');
  const text = section.querySelector('[data-track="text"]');
  const n = section.querySelectorAll('.chapter').length;
  const count = section.querySelector('[data-count]');
  const mq = window.matchMedia('(max-width: 900px)');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let target = 0, current = 0, active = -1, raf = null;

  const measure = () => {
    const r = section.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    target = total > 0 ? Math.min(Math.max(-r.top / total, 0), 1) : 0;
  };

  const render = () => {
    current += (target - current) * (reduce ? 1 : 0.12);
    if (Math.abs(target - current) < 0.0005) current = target;

    const vh = window.innerHeight;
    const dist = (n - 1) * vh;
    // фото їдуть вгору (разом зі сторінкою), текст — назустріч, униз
    media.style.transform = `translate3d(0, ${(-current * dist).toFixed(1)}px, 0)`;
    text.style.transform = `translate3d(0, ${(-dist + current * dist).toFixed(1)}px, 0)`;

    const idx = Math.min(n - 1, Math.round(current * (n - 1)));
    if (idx !== active) {
      active = idx;
      count.textContent = String(idx + 1).padStart(2, '0');
    }
    raf = current !== target ? requestAnimationFrame(render) : null;
  };

  const tick = () => {
    if (mq.matches) { media.style.transform = ''; text.style.transform = ''; return; }
    measure();
    if (!raf) raf = requestAnimationFrame(render);
  };

  window.addEventListener('scroll', tick, { passive: true });
  window.addEventListener('resize', tick);
  mq.addEventListener('change', tick);
  tick();
})();

// ===== Про нас: ширина текстового блоку = реальна ширина найдовшого рядка,
// щоб блок стояв по центру панелі з рівними відступами зліва і справа =====
(() => {
  const bodies = document.querySelectorAll('.chapter__body');
  if (!bodies.length) return;
  const mq = window.matchMedia('(max-width: 900px)');
  const range = document.createRange();

  const fit = () => {
    bodies.forEach((b) => {
      b.style.width = '';
      if (mq.matches) return;
      const left = b.getBoundingClientRect().left;
      let max = 0;
      b.querySelectorAll('.chapter__title, .chapter__text').forEach((el) => {
        range.selectNodeContents(el);
        for (const r of range.getClientRects()) max = Math.max(max, r.right - left);
      });
      if (max) b.style.width = `${Math.ceil(max)}px`;
    });
  };

  let t;
  const refit = () => { clearTimeout(t); t = setTimeout(fit, 120); };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(fit);
  window.addEventListener('resize', refit);
  mq.addEventListener('change', fit);
})();
