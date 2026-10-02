import { Fancybox } from '@fancyapps/ui/dist/fancybox/';
import { en_EN } from '@fancyapps/ui/dist/fancybox/l10n/en_EN.js';
import '@fancyapps/ui/dist/fancybox/fancybox.css';

/**
 * The site's client-side behaviour: theme persistence, navigation, galleries,
 * media controls, the contact form and cookie preferences.
 */

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* -------------------------------------------------------------- theme --- */

function initTheme() {
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  const read = () => {
    try {
      return localStorage.getItem('vs-theme');
    } catch {
      return null;
    }
  };

  // Tint the browser chrome with the active page background.
  const apply = (theme: string) => {
    root.dataset.theme = theme;
    const bg = getComputedStyle(root).getPropertyValue('--c-bg').trim();
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.setAttribute('content', bg);
    });
  };

  // Follow the OS until the visitor makes an explicit choice.
  media.addEventListener('change', (e) => {
    if (!read()) apply(e.matches ? 'dark' : 'light');
  });

  document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      apply(next);
      btn.setAttribute('aria-pressed', String(next === 'dark'));
      try {
        localStorage.setItem('vs-theme', next);
      } catch {
        /* private mode — the choice just will not persist */
      }
    });
    btn.setAttribute('aria-pressed', String(root.dataset.theme === 'dark'));
  });
}

/* --------------------------------------------------------- mobile menu --- */

function initMenu() {
  const dialog = document.querySelector<HTMLDialogElement>('#site-menu');
  const openBtn = document.querySelector<HTMLButtonElement>('[data-menu-open]');
  if (!dialog || !openBtn) return;

  const close = () => dialog.close();

  openBtn.addEventListener('click', () => {
    dialog.showModal();
    openBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  });

  dialog.querySelector('[data-menu-close]')?.addEventListener('click', close);
  dialog.addEventListener('close', () => {
    openBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    openBtn.focus();
  });

  // A link inside the menu navigates away; close first so history back is sane.
  dialog.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) close();
  });

  // Desktop breakpoint reached while open — the menu no longer applies.
  window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => {
    if (e.matches && dialog.open) close();
  });
}

/* -------------------------------------------------------- galleries ----- */

const csFancybox = {
  ...en_EN,
  CLOSE: 'Zavřít',
  NEXT: 'Další fotografie',
  PREV: 'Předchozí fotografie',
  MODAL: 'Galerii zavřete klávesou Escape',
  IMAGE_ERROR: 'Fotografii se nepodařilo načíst. Zkuste to prosím znovu.',
  ERROR: 'Něco se nepodařilo. Zkuste to prosím znovu.',
  ZOOM_IN: 'Přiblížit',
  ZOOM_OUT: 'Oddálit',
  TOGGLE_FULL: 'Přepnout velikost fotografie',
  TOGGLE_1TO1: 'Zobrazit ve skutečné velikosti',
  TOGGLE_FULLSCREEN: 'Přepnout zobrazení na celou obrazovku',
  TOGGLE_THUMBS: 'Zobrazit náhledy',
};

function initFancybox() {
  if (!document.querySelector('[data-fancybox]')) return;

  const reducedMotion = prefersReducedMotion();

  Fancybox.bind('[data-fancybox]', {
    l10n: document.documentElement.lang.startsWith('cs') ? csFancybox : en_EN,
    mainClass: 'vila-fancybox',
    theme: 'dark',
    placeFocusBack: true,
    dragToClose: !reducedMotion,
    zoomEffect: !reducedMotion,
    showClass: reducedMotion ? false : 'f-zoomInUp',
    hideClass: reducedMotion ? false : 'f-zoomOutDown',
    Carousel: {
      transition: reducedMotion ? false : 'fade',
      Thumbs: {
        type: 'modern',
        showOnStart: true,
      },
      Toolbar: {
        display: {
          left: ['counter'],
          right: ['zoomIn', 'zoomOut', 'fullscreen', 'thumbs', 'close'],
        },
      },
    },
  });
}


/* ------------------------------------------------------------- header --- */

/**
 * Flags the header once the page has scrolled, so a header sitting over a
 * hero can fade into its normal surface. A sentinel beats a scroll listener:
 * no work on the main thread while scrolling.
 */
function initHeader() {
  const header = document.querySelector<HTMLElement>('[data-site-header]');
  if (!header) return;

  const setState = (scrolled: boolean) => {
    header.dataset.scrolled = String(scrolled);
  };

  if (!('IntersectionObserver' in window)) {
    setState(true);
    return;
  }

  const sentinel = document.createElement('div');
  sentinel.setAttribute('aria-hidden', 'true');
  sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:60vh;pointer-events:none';
  document.body.prepend(sentinel);

  new IntersectionObserver(([entry]) => setState(!entry.isIntersecting), {
    threshold: 0,
  }).observe(sentinel);
}

/* ---------------------------------------------------------- hero video --- */

/**
 * The poster image is what paints (and what LCP measures). The loop is only
 * fetched afterwards, and only when the visitor has not asked for reduced
 * motion, is not on Save-Data, and is not on a slow connection.
 */
function initHeroVideo() {
  const video = document.querySelector<HTMLVideoElement>('[data-hero-video]');
  const toggle = document.querySelector<HTMLButtonElement>('[data-hero-toggle]');
  if (!video) return;

  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } })
    .connection;
  const frugal =
    conn?.saveData === true || ['slow-2g', '2g'].includes(conn?.effectiveType ?? '');

  if (prefersReducedMotion() || frugal) return;

  const narrow = window.matchMedia('(max-width: 900px)').matches;
  video.src = (narrow ? video.dataset.srcNarrow : video.dataset.srcWide) ?? '';
  video.load();

  video.addEventListener(
    'canplay',
    () => {
      video.dataset.ready = 'true';
      void video.play().catch(() => {
        /* Autoplay refused (iOS low-power mode): the poster stays, which is fine. */
      });
    },
    { once: true },
  );

  if (!toggle) return;

  const pauseIcon = toggle.querySelector<HTMLElement>('[data-icon-pause]')!;
  const playIcon = toggle.querySelector<HTMLElement>('[data-icon-play]')!;
  const label = toggle.querySelector<HTMLElement>('[data-hero-toggle-label]')!;
  const labels = {
    pause: toggle.dataset.labelPause ?? '',
    play: toggle.dataset.labelPlay ?? '',
  };

  const sync = () => {
    const playing = !video.paused;
    pauseIcon.hidden = !playing;
    playIcon.hidden = playing;
    label.textContent = playing ? labels.pause : labels.play;
  };

  video.addEventListener('playing', () => {
    toggle.hidden = false;
    sync();
  });
  video.addEventListener('pause', sync);

  toggle.addEventListener('click', () => {
    if (video.paused) void video.play();
    else video.pause();
    sync();
  });

  // Nothing decodes while the hero is off screen or the tab is hidden.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) video.pause();
        else if (toggle.dataset.userPaused !== 'true') void video.play().catch(() => {});
      },
      { threshold: 0.05 },
    ).observe(video);

    toggle.addEventListener('click', () => {
      toggle.dataset.userPaused = String(video.paused);
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) video.pause();
    else if (toggle.dataset.userPaused !== 'true') void video.play().catch(() => {});
  });
}

/* ------------------------------------------------------------ marquee ---- */

/** Keyboard users get the same pause that hover gives a mouse user. */
function initMarquee() {
  document.querySelectorAll<HTMLElement>('[data-marquee]').forEach((el) => {
    const stop = () => (el.dataset.paused = 'true');
    const go = () => (el.dataset.paused = 'false');
    el.addEventListener('focusin', stop);
    el.addEventListener('focusout', go);
    document.addEventListener('visibilitychange', () =>
      document.hidden ? stop() : go(),
    );
  });
}

/* ------------------------------------------------------------- forms ---- */

function initContactForm() {
  const form = document.querySelector<HTMLFormElement>('[data-contact-form]');
  if (!form) return;

  const summary = form.querySelector<HTMLElement>('[data-form-errors]');
  const summaryList = form.querySelector<HTMLElement>('[data-form-errors-list]');
  const status = form.querySelector<HTMLElement>('[data-form-status]');

  const setFieldError = (field: HTMLInputElement | HTMLTextAreaElement, message: string | null) => {
    const errorEl = form.querySelector<HTMLElement>(`[data-error-for="${field.name}"]`);
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (errorEl) {
      errorEl.textContent = message ?? '';
      errorEl.hidden = !message;
    }
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();
    const phone = String(data.get('phone') ?? '').trim();
    const unit = String(data.get('unit') ?? '').trim();
    const message = String(data.get('message') ?? '').trim();

    const errors: { field: string; message: string }[] = [];
    const check = (
      selector: string,
      valid: boolean,
      messageKey: 'name' | 'email' | 'message',
    ) => {
      const field = form.querySelector<HTMLInputElement>(`[name="${selector}"]`);
      if (!field) return;
      const msg = valid ? null : (form.dataset[`err${messageKey[0].toUpperCase()}${messageKey.slice(1)}`] ?? '');
      setFieldError(field, msg);
      if (msg) errors.push({ field: selector, message: msg });
    };

    check('name', name.length > 1, 'name');
    check('email', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email), 'email');
    check('message', message.length > 4, 'message');

    if (summary && summaryList) {
      summaryList.innerHTML = '';
      summary.hidden = errors.length === 0;
      for (const err of errors) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#field-${err.field}`;
        a.textContent = err.message;
        a.addEventListener('click', (ev) => {
          ev.preventDefault();
          form.querySelector<HTMLElement>(`[name="${err.field}"]`)?.focus();
        });
        li.append(a);
        summaryList.append(li);
      }
    }

    if (errors.length) {
      summary?.focus();
      return;
    }

    const subject = form.dataset.subject ?? 'Vila SCALA';
    const bodyLines = [
      `${form.dataset.labelName}: ${name}`,
      `${form.dataset.labelEmail}: ${email}`,
      phone ? `${form.dataset.labelPhone}: ${phone}` : null,
      unit ? `${form.dataset.labelUnit}: ${unit}` : null,
      '',
      message,
    ].filter(Boolean);

    const href = `mailto:${form.dataset.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`;
    window.location.href = href;

    if (status) {
      status.hidden = false;
    }
  });
}

/* ------------------------------------------------------------ cookies --- */

function initCookieConsent() {
  const bar = document.querySelector<HTMLElement>('[data-cookie-bar]');
  if (!bar) return;

  const storageKey = 'vs-cookie-consent';
  const root = document.documentElement;

  const read = () => {
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  };

  const open = () => {
    bar.hidden = false;
    root.dataset.cookieBar = 'open';
  };

  const close = () => {
    bar.hidden = true;
    delete root.dataset.cookieBar;
  };

  bar.querySelectorAll<HTMLButtonElement>('[data-cookie-choice]').forEach((button) => {
    button.addEventListener('click', () => {
      const choice = button.dataset.cookieChoice === 'all' ? 'all' : 'necessary';
      try {
        localStorage.setItem(storageKey, choice);
      } catch {
        /* The choice still applies for this page view when storage is unavailable. */
      }
      document.dispatchEvent(new CustomEvent('vs:cookie-consent', { detail: choice }));
      close();
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-cookie-settings]').forEach((button) => {
    button.addEventListener('click', open);
  });

  if (!read()) open();
}

/* ------------------------------------------------------ day / night ---- */

/* Before/after slider inside the gallery lightbox. Pointer drags are taken
   in the capture phase so Fancybox never sees them as a swipe to the next
   photo; the hidden range input carries keyboard and screen reader use. */
function initCompare() {
  const setPos = (compare: HTMLElement, pct: number) => {
    const pos = Math.min(100, Math.max(0, pct));
    compare.style.setProperty('--pos', `${pos}%`);
    const range = compare.querySelector<HTMLInputElement>('.vs-compare__range');
    if (range) range.value = String(Math.round(pos));
  };
  const fromPointer = (compare: HTMLElement, event: PointerEvent) => {
    const box = compare.getBoundingClientRect();
    setPos(compare, ((event.clientX - box.left) / box.width) * 100);
  };

  document.addEventListener(
    'pointerdown',
    (event) => {
      const compare = (event.target as Element | null)?.closest?.<HTMLElement>('[data-compare]');
      if (!compare || event.button > 0) return;
      event.stopPropagation();
      event.preventDefault();
      compare.querySelector<HTMLInputElement>('.vs-compare__range')?.focus({ preventScroll: true });
      compare.setPointerCapture(event.pointerId);
      fromPointer(compare, event);

      const move = (e: PointerEvent) => fromPointer(compare, e);
      const end = () => {
        compare.removeEventListener('pointermove', move);
        compare.removeEventListener('pointerup', end);
        compare.removeEventListener('pointercancel', end);
      };
      compare.addEventListener('pointermove', move);
      compare.addEventListener('pointerup', end);
      compare.addEventListener('pointercancel', end);
    },
    true,
  );

  // Older touch paths in the carousel listen for these directly.
  for (const type of ['touchstart', 'mousedown'] as const) {
    document.addEventListener(
      type,
      (event) => {
        if ((event.target as Element | null)?.closest?.('[data-compare]')) event.stopPropagation();
      },
      { capture: true, passive: true },
    );
  }

  document.addEventListener('input', (event) => {
    const range = event.target as HTMLInputElement;
    if (!range.matches?.('.vs-compare__range')) return;
    const compare = range.closest<HTMLElement>('[data-compare]');
    if (compare) setPos(compare, Number(range.value));
  });

  // Arrow keys on the slider move the slider, not the gallery.
  document.addEventListener(
    'keydown',
    (event) => {
      if ((event.target as Element | null)?.matches?.('.vs-compare__range')) event.stopPropagation();
    },
    true,
  );
}

/* ---------------------------------------------------------- 360 tour ---- */

/* The Matterport tour opens over the page in the same lightbox as the
   galleries, so visitors never leave the apartment they are looking at.
   Nothing from Matterport loads until one of the triggers is clicked. */
function initTour() {
  if (!document.querySelector('[data-tour-open]')) return;

  Fancybox.bind('[data-tour-open]', {
    l10n: document.documentElement.lang.startsWith('cs') ? csFancybox : en_EN,
    mainClass: 'vila-fancybox vila-tour',
    theme: 'dark',
    placeFocusBack: true,
    // Dragging belongs to the tour inside the frame, not to the lightbox.
    dragToClose: false,
    zoomEffect: false,
    // The toolbar carries the close button; never fade it out, because
    // touches inside the tour frame never reach Fancybox to bring it back.
    idle: false,
    closeButton: false,
    showClass: prefersReducedMotion() ? false : 'f-fadeIn',
    hideClass: prefersReducedMotion() ? false : 'f-fadeOut',
    Carousel: {
      Thumbs: false,
      Html: {
        iframeAttr: {
          allow: 'autoplay; fullscreen; xr-spatial-tracking; gyroscope; accelerometer',
          allowfullscreen: 'true',
        },
      },
      // "auto" would only enable it for zoomable images, so an iframe slide
      // would get no toolbar, and no close button, at all.
      Toolbar: {
        enabled: true,
        display: {
          left: [],
          middle: [],
          right: ['fullscreen', 'close'],
        },
      },
    },
  });
}

/* -------------------------------------------------------- panoramas ---- */

/* 360° renders open in the lightbox and are drawn by Photo Sphere Viewer.
   It brings three.js with it, so both are fetched only when a panorama is
   actually opened. Swiping between slides is off: a drag looks around. */
function initPanoramas() {
  if (!document.querySelector('[data-pano-open]')) return;

  type Viewer = { destroy(): void };
  const viewers = new Map<HTMLElement, Viewer>();

  const mountSelected = async () => {
    const el = document.querySelector<HTMLElement>('.vila-pano .fancybox__slide.is-selected [data-pano]');
    if (!el || viewers.has(el) || !el.dataset.pano) return;
    viewers.set(el, { destroy() {} });
    const [{ Viewer }] = await Promise.all([
      import('@photo-sphere-viewer/core'),
      import('@photo-sphere-viewer/core/index.css'),
    ]);
    if (!el.isConnected) return;
    viewers.set(
      el,
      new Viewer({
        container: el,
        panorama: el.dataset.pano,
        navbar: ['zoom', 'move', 'fullscreen'],
        defaultZoomLvl: 10,
        mousewheelCtrlKey: true,
        touchmoveTwoFingers: false,
        loadingTxt: '',
        lang: document.documentElement.lang.startsWith('cs')
          ? { zoom: 'Přiblížení', zoomOut: 'Oddálit', zoomIn: 'Přiblížit', moveUp: 'Nahoru', moveDown: 'Dolů', moveLeft: 'Doleva', moveRight: 'Doprava', fullscreen: 'Celá obrazovka', ctrlZoom: 'Přibližujte s klávesou Ctrl a kolečkem myši', twoFingers: 'Posouvejte dvěma prsty' }
          : {},
      }),
    );
  };

  Fancybox.bind('[data-pano-open]', {
    l10n: document.documentElement.lang.startsWith('cs') ? csFancybox : en_EN,
    mainClass: 'vila-fancybox vila-pano',
    theme: 'dark',
    placeFocusBack: true,
    dragToClose: false,
    zoomEffect: false,
    idle: false,
    closeButton: false,
    showClass: prefersReducedMotion() ? false : 'f-fadeIn',
    hideClass: prefersReducedMotion() ? false : 'f-fadeOut',
    Carousel: {
      gestures: false,
      Thumbs: false,
      Toolbar: {
        enabled: true,
        display: { left: ['counter'], middle: [], right: ['close'] },
      },
      on: { settle: () => void mountSelected() },
    },
    on: {
      ready: () => void mountSelected(),
      destroy: () => {
        viewers.forEach((viewer) => viewer.destroy());
        viewers.clear();
      },
    },
  });
}

/* -------------------------------------------------------------- boot ---- */

const boot = () => {
  initTheme();
  initHeader();
  initMenu();
  initFancybox();
  initHeroVideo();
  initMarquee();
  initContactForm();
  initTour();
  initCompare();
  initPanoramas();
  initCookieConsent();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
