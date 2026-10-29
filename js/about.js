/**
 * ABOUT — GAURAV PORTFOLIO
 * - Photos that aren't in public/assets/photos/ yet are removed, and the layout closes up.
 * - Gentle parallax on the primary photo (desktop, motion allowed only).
 * - osu! easter egg: an approach circle closes onto "circles" when it's hovered, focused or tapped.
 */

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export class AboutSection {
  constructor() {
    this.root = document.querySelector('[data-about]');
    if (!this.root) return;

    this.handlePhotos();
    this.initParallax();
    this.initOsu();
  }

  handlePhotos() {
    const figures = [...this.root.querySelectorAll('[data-about-photo]')];
    // Classes only mark what's missing, so the default (all photos) layout needs no JS
    const settle = () => {
      const remaining = this.root.querySelectorAll('[data-about-photo]');
      this.root.classList.toggle('no-primary', !this.root.querySelector('[data-about-photo="primary"]'));
      this.root.classList.toggle('no-photos', remaining.length === 0);
    };

    figures.forEach((figure) => {
      const img = figure.querySelector('img');
      const drop = () => {
        figure.remove();
        settle();
      };
      if (!img) return drop();
      // Already failed before this ran (cached 404)?
      if (img.complete && img.naturalWidth === 0 && img.currentSrc) return drop();
      img.addEventListener('error', drop, { once: true });
      img.addEventListener('load', () => figure.classList.add('is-loaded'), { once: true });
      if (img.complete && img.naturalWidth > 0) figure.classList.add('is-loaded');
    });
    settle();

    // Start loading ~2.5 screens early: photos are ready on arrival, and any missing
    // ones close up off-screen instead of shifting the layout in front of the visitor
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        if (!entries.some(e => e.isIntersecting)) return;
        this.root.querySelectorAll('img[loading="lazy"]').forEach(img => { img.loading = 'eager'; });
        io.disconnect();
      }, { rootMargin: '250% 0px' });
      io.observe(this.root);
    }
  }

  initParallax() {
    if (reducedMotion() || !window.matchMedia('(min-width: 993px)').matches) return;
    const frame = this.root.querySelector('[data-parallax]');
    const img = frame && frame.querySelector('img');
    if (!img) return;

    let visible = false;
    let queued = false;
    const update = () => {
      queued = false;
      if (!visible || !img.isConnected) return;
      const rect = frame.getBoundingClientRect();
      // -1 (entering from below) → 1 (leaving at the top)
      const progress = (window.innerHeight / 2 - (rect.top + rect.height / 2)) / (window.innerHeight / 2 + rect.height / 2);
      const clamped = Math.max(-1, Math.min(1, progress));
      img.style.transform = `translate3d(0, ${(clamped * 4).toFixed(2)}%, 0) scale(1.1)`;
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    };

    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) onScroll();
    }).observe(frame);
    window.addEventListener('scroll', onScroll, { passive: true });
    frame.classList.add('has-parallax');
  }

  initOsu() {
    const hit = document.querySelector('.osu-hit');
    if (!hit) return;
    const play = () => {
      if (reducedMotion()) {
        hit.classList.add('is-hit');
        return;
      }
      hit.classList.remove('is-playing', 'is-hit');
      void hit.offsetWidth; // restart the CSS animation
      hit.classList.add('is-playing');
    };
    hit.addEventListener('click', play);
    hit.addEventListener('mouseenter', play);
    hit.addEventListener('animationend', (e) => {
      if (e.animationName === 'osu-approach') {
        hit.classList.remove('is-playing');
        hit.classList.add('is-hit');
      }
    });
  }
}
