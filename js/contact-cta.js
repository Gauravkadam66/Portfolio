/**
 * CONTACT CTA — GAURAV PORTFOLIO
 * The one fixed element: "Let's talk" in the bottom-right corner.
 * - Clicking it is the site-wide smooth anchor scroll to #contact (app.js), which respects
 *   reduced motion; scroll-margin in CSS clears the fixed header.
 * - Steps aside once Contact (and the footer below it) is on screen.
 * - Also steps aside whenever something interactive sits underneath it (links, buttons,
 *   the music bar, video controls, gallery arrows), so it never blocks what the visitor
 *   is trying to use. It returns a beat after the control has scrolled clear.
 */

// Anything interactive the CTA must never cover: every link, button and input,
// plus whole control strips (music bar, video seek bar, gallery arrows)
const CONTROLS = [
  'a[href]',
  'button',
  'input',
  '.ms-bar',
  '.hud-timeline-progress',
  '.swipe-controls',
].join(', ');

export class ContactCta {
  constructor() {
    this.btn = document.querySelector('[data-contact-cta]');
    this.target = document.getElementById('contact');
    if (!this.btn || !this.target) return;

    this.contactVisible = false;
    this.overControl = false;

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        this.contactVisible = entry.isIntersecting;
        this.apply();
      }, { threshold: 0.12 }).observe(this.target);
    }

    let queued = false;
    const check = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        this.checkOverlap();
      });
    };
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check, { passive: true });
    // Content under it can also change without scrolling (e.g. the music panel opening)
    document.addEventListener('transitionend', check, { passive: true });
    check();
  }

  // Sample a few points across the button and look *beneath* it for a control
  checkOverlap() {
    const r = this.btn.getBoundingClientRect();
    if (!r.width) return;
    const pad = 8;
    const ys = [r.top - pad, r.top + r.height / 2, r.bottom + pad];
    const xs = [r.left - pad, r.left + r.width / 2, r.right];
    let hit = false;
    for (const y of ys) {
      for (const x of xs) {
        if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
        const stack = document.elementsFromPoint(x, y);
        if (stack.some(el => el !== this.btn && !this.btn.contains(el) && this.isLiveControl(el))) {
          hit = true;
          break;
        }
      }
      if (hit) break;
    }

    clearTimeout(this.releaseTimer);
    if (hit) {
      this.overControl = true;
      this.apply();
    } else if (this.overControl) {
      // Come back a beat later, so passing over a thin seek bar doesn't make it flicker
      this.releaseTimer = setTimeout(() => {
        this.overControl = false;
        this.apply();
      }, 350);
    }
  }

  // Video controls only count while they're actually showing (paused, or hovered on desktop);
  // otherwise every frame scrolling past would make the button blink away.
  isLiveControl(el) {
    const control = el.closest(CONTROLS);
    if (!control) return false;
    const frame = control.closest('.video-exhibition-frame');
    if (!frame) return true;
    return frame.classList.contains('is-paused') || frame.matches(':hover');
  }

  apply() {
    this.btn.classList.toggle('is-away', this.contactVisible || this.overControl);
  }
}
