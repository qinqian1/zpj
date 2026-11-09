(() => {
  const range = (start, end) => Array.from({ length: end - start + 1 }, (_, i) => start + i);
  // Page numbers reference the original portfolio; assets are shared with the main site.
  const editions = {
    ai: { label: 'AI', pages: [1, 2, 3, 5, ...range(11, 26), 7, ...range(41, 46), 79] },
    b2b: { label: 'B2B', pages: [1, 2, 3, 8, ...range(64, 70), 6, ...range(27, 40), 5, ...range(11, 26), 79] },
    c: { label: 'C', pages: range(1, 33) }
  };
  const edition = editions[document.body.dataset.edition];
  const pages = edition.pages;
  const number = value => String(value).padStart(2, '0');
  const isC = document.body.dataset.edition === 'c';
  const asset = (type, page, ext) => isC
    ? `./assets/${type === 'thumbnails' ? 'thumbnails' : type.replace('slides-', '')}/${number(page)}.${ext}?v=c20261110`
    : `../public/${type}/slide-${number(page)}.${ext}?v=hd6`;
  const srcset = (page, ext) => `${asset(`slides-${ext}-1920`, page, ext)} 1920w, ${asset(`slides-${ext}-3200`, page, ext)} 3200w`;
  document.body.innerHTML = `
    <main class="viewer">
      <aside class="sidebar" aria-label="作品集页面缩略图导航">
        <header class="sidebar-header"><strong>PORTFOLIO · ${edition.label}</strong><span>2026</span></header>
        <nav class="thumbnails" id="thumbnails"></nav>
      </aside>
      <section class="stage" aria-label="作品集页面">
        <div class="ambient" aria-hidden="true"></div>
        <div class="slide-frame">
          <picture><source id="sourceA" type="image/avif"><source id="webpSourceA" type="image/webp"><img id="slideA" class="master-slide slide-active" width="5120" height="2880" fetchpriority="high"></picture>
          <picture><source id="sourceB" type="image/avif"><source id="webpSourceB" type="image/webp"><img id="slideB" class="master-slide" width="5120" height="2880" alt=""></picture>
        </div>
        <div class="page-status" aria-live="polite"><span id="currentPage">01</span><i></i><span>${number(pages.length)}</span></div>
        <div class="keyboard-tip">方向键 / 滚轮翻页</div>
      </section>
    </main>`;
  const thumbnails = document.getElementById('thumbnails');
  const slides = [document.getElementById('slideA'), document.getElementById('slideB')];
  const sources = [document.getElementById('sourceA'), document.getElementById('sourceB')];
  const webpSources = [document.getElementById('webpSourceA'), document.getElementById('webpSourceB')];
  const sizes = '(max-width: 720px) 100vw, 86vw';
  let active = 0;
  let front = 0;
  let locked = false;
  const preloads = new Map();

  pages.forEach((page, index) => {
    const button = document.createElement('button');
    button.className = 'thumbnail';
    button.setAttribute('aria-label', `前往第 ${index + 1} 页`);
    button.innerHTML = `<span>${number(index + 1)}</span><img src="${asset('thumbnails', page, 'jpg')}" alt="" loading="${index < 3 ? 'eager' : 'lazy'}" decoding="async">`;
    button.addEventListener('click', () => show(index));
    thumbnails.appendChild(button);
  });
  const buttons = [...thumbnails.children];
  buttons[0].classList.add('active');
  buttons[0].setAttribute('aria-current', 'page');

  function setImage(slot, page, position) {
    if (!isC) sources[slot].srcset = srcset(page, 'avif');
    sources[slot].sizes = sizes;
    webpSources[slot].srcset = srcset(page, 'webp');
    webpSources[slot].sizes = sizes;
    slides[slot].src = isC ? asset('slides-webp-1920', page, 'webp') : asset('slides-master', page, 'png');
    slides[slot].alt = `${edition.label} 作品集第 ${position + 1} 页`;
  }
  function preloadAhead(index) {
    const next = pages.slice(index + 1, index + 3);
    preloads.forEach((picture, page) => {
      if (!next.includes(page)) { picture.remove(); preloads.delete(page); }
    });
    next.forEach(page => {
      if (preloads.has(page)) return;
      const picture = document.createElement('picture');
      picture.hidden = true;
      picture.innerHTML = `${isC ? '' : `<source type="image/avif" srcset="${srcset(page, 'avif')}" sizes="${sizes}">`}<source type="image/webp" srcset="${srcset(page, 'webp')}" sizes="${sizes}"><img src="${isC ? asset('slides-webp-1920', page, 'webp') : asset('slides-master', page, 'png')}" alt="">`;
      document.body.appendChild(picture);
      preloads.set(page, picture);
    });
  }
  async function show(index) {
    if (index < 0 || index >= pages.length || index === active || locked) return;
    locked = true;
    const back = 1 - front;
    setImage(back, pages[index], index);
    try {
      if (slides[back].decode) await slides[back].decode();
    } catch (error) {
      locked = false;
      console.error('作品集页面加载失败', error);
      return;
    }
    active = index;
    document.getElementById('currentPage').textContent = number(index + 1);
    buttons.forEach((button, i) => {
      button.classList.toggle('active', i === index);
      button.setAttribute('aria-current', i === index ? 'page' : 'false');
    });
    buttons[index].scrollIntoView({ block: 'center', behavior: 'smooth' });
    if (window.goatcounter?.count) window.goatcounter.count({ path: `/${document.body.dataset.edition}/slide/${number(pages[index])}`, title: `${edition.label} 作品集第 ${index + 1} 页` });
    requestAnimationFrame(() => {
      slides[front].classList.remove('slide-active');
      slides[back].classList.add('slide-active');
      setTimeout(() => { front = back; locked = false; preloadAhead(index); }, 140);
    });
  }
  setImage(0, pages[0], 0);
  if (slides[0].complete) preloadAhead(0);
  else slides[0].addEventListener('load', () => preloadAhead(0), { once: true });
  window.addEventListener('keydown', event => {
    if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); show(active + 1); }
    if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(event.key)) { event.preventDefault(); show(active - 1); }
    if (event.key === 'Home') { event.preventDefault(); show(0); }
    if (event.key === 'End') { event.preventDefault(); show(pages.length - 1); }
  });
  document.querySelector('.stage').addEventListener('wheel', event => {
    if (Math.abs(event.deltaY) < 12) return;
    event.preventDefault();
    show(active + (event.deltaY > 0 ? 1 : -1));
  }, { passive: false });
  window.goatcounter = { path: `/${document.body.dataset.edition}/slide/${number(pages[0])}`, title: `${edition.label} 作品集第 1 页` };
  const analytics = document.createElement('script');
  analytics.async = true;
  analytics.dataset.goatcounter = 'https://fandehui-portfolio.goatcounter.com/count';
  analytics.src = 'https://gc.zgo.at/count.js';
  document.head.appendChild(analytics);
})();
