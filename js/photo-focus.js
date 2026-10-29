/**
 * PHOTO FOCUS — GAURAV PORTFOLIO
 * Three photographs: one sharp in the centre, two blurred and cropped either side.
 * Selecting a side photo rotates it into focus (click / tap / swipe / ← →).
 *
 * Each panel gets a slot — "prev" | "active" | "next" — and CSS transitions do the
 * motion (position, width, blur, brightness). No animation library.
 * Panels whose image fails to load are removed and the rest re-balance.
 */

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export class PhotoFocus {
  constructor(root) {
    this.root = root;
    this.stage = root.querySelector('[data-pf-stage]');
    this.caption = root.querySelector('[data-pf-caption]');
    this.count = root.querySelector('[data-pf-count]');
    this.panels = [...root.querySelectorAll('[data-pf-panel]')];
    this.active = 0;
    if (!this.stage || !this.panels.length) return;

    this.panels.forEach((panel) => {
      const img = panel.querySelector('img');
      panel.addEventListener('click', () => {
        if (this.suppressClick) return;
        const i = this.panels.indexOf(panel);
        if (i !== this.active) this.go(i);
      });
      if (img) {
        const fail = () => this.remove(panel);
        if (img.complete && img.naturalWidth === 0 && img.currentSrc) fail();
        else img.addEventListener('error', fail, { once: true });
      }
    });

    this.bindKeys();
    this.bindSwipe();
    this.preloadNearby();
    this.render(false);
  }

  remove(panel) {
    const i = this.panels.indexOf(panel);
    if (i < 0) return;
    panel.remove();
    this.panels.splice(i, 1);
    if (!this.panels.length) {
      this.root.hidden = true;
      return;
    }
    if (this.active >= this.panels.length) this.active = 0;
    this.render(false);
  }

  // Slot for panel i relative to the active one: 0 → active, 1 → next (right), last → prev (left)
  slotOf(i) {
    const n = this.panels.length;
    const offset = (i - this.active + n) % n;
    if (offset === 0) return 'active';
    if (offset === 1) return 'next';
    return 'prev';
  }

  go(i) {
    const n = this.panels.length;
    if (n < 2) return;
    const target = (i + n) % n;
    if (target === this.active) return;

    // A panel jumping from one side to the other passes behind the centre photo:
    // fade it through the move so it never visibly streaks across.
    const before = this.panels.map((_, k) => this.slotOf(k));
    this.active = target;
    const after = this.panels.map((_, k) => this.slotOf(k));
    this.panels.forEach((panel, k) => {
      const crosses = (before[k] === 'prev' && after[k] === 'next') || (before[k] === 'next' && after[k] === 'prev');
      if (crosses && !reducedMotion()) {
        panel.classList.add('is-crossing');
        clearTimeout(panel._crossTimer);
        panel._crossTimer = setTimeout(() => panel.classList.remove('is-crossing'), 650);
      }
    });
    this.render(true);
  }

  render(announce) {
    const n = this.panels.length;
    this.stage.dataset.count = String(n);
    this.panels.forEach((panel, i) => {
      const slot = this.slotOf(i);
      const img = panel.querySelector('img');
      const alt = img ? img.alt : 'photo';
      panel.dataset.slot = slot;
      if (slot === 'active') {
        panel.setAttribute('aria-current', 'true');
        panel.setAttribute('aria-label', `${alt} (in focus)`);
        panel.tabIndex = -1; // nothing to do on the focused photo itself
      } else {
        panel.removeAttribute('aria-current');
        panel.setAttribute('aria-label', `Bring into focus: ${alt}`);
        panel.tabIndex = 0;
      }
    });

    const current = this.panels[this.active];
    if (this.caption) this.caption.textContent = current.dataset.caption || '';
    if (this.count) this.count.textContent = n > 1 ? `${this.active + 1} / ${n}` : '';
    this.root.classList.toggle('is-single', n < 2);
    if (announce) this.root.dataset.changed = String(Date.now()); // caption is aria-live
  }

  bindKeys() {
    this.root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); this.go(this.active + 1); this.focusActiveSide(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); this.go(this.active - 1); this.focusActiveSide(); }
    });
  }

  // Keep keyboard focus inside the gallery after the panel that had it became the centre one
  focusActiveSide() {
    if (!this.root.contains(document.activeElement)) return;
    const side = this.panels.find((_, i) => this.slotOf(i) === 'next') || this.panels.find((_, i) => this.slotOf(i) === 'prev');
    if (side) side.focus({ preventScroll: true });
  }

  // Horizontal swipe changes photo; vertical movement is left to page scrolling (touch-action: pan-y)
  bindSwipe() {
    let startX = 0;
    let startY = 0;
    let tracking = false;
    this.stage.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      tracking = true;
      startX = e.clientX;
      startY = e.clientY;
    });
    this.stage.addEventListener('pointerup', (e) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        this.go(this.active + (dx < 0 ? 1 : -1));
        // the tap that ended the swipe must not also select a panel
        this.suppressClick = true;
        setTimeout(() => { this.suppressClick = false; }, 350);
      }
    });
    this.stage.addEventListener('pointercancel', () => { tracking = false; });
  }

  // Load all three a little before the gallery arrives, so switching never shows an empty panel
  preloadNearby() {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some(e => e.isIntersecting)) return;
      this.panels.forEach(p => { const img = p.querySelector('img'); if (img) img.loading = 'eager'; });
      io.disconnect();
    }, { rootMargin: '150% 0px' });
    io.observe(this.root);
  }
}
