/**
 * EDITORIAL CONTEXTUAL CURSOR — GAURAV PORTFOLIO
 * Subtle, purposeful micro-interaction for desktop video exhibition.
 * Full disc over the picture; collapses out of the way over HUD controls so
 * audio, expand and seeking are never blocked.
 */

export class EditorialCursor {
  constructor() {
    this.cursor = document.getElementById('custom-cursor');
    // Width is handled in CSS (cursor hidden and native pointer kept below 769px), so resizing just works
    const supported = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!this.cursor || !supported) {
      return; // Touch devices keep the native cursor
    }

    document.documentElement.classList.add('has-custom-cursor');

    this.mouseX = -100;
    this.mouseY = -100;
    this.cursorX = -100;
    this.cursorY = -100;
    this.hoverFrame = null;
    this.overControls = false;

    this.bindEvents();
    this.loop();
  }

  bindEvents() {
    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.updateTarget(e.target);
    }, { passive: true });

    // Content scrolls under a stationary pointer: re-resolve what's beneath it
    window.addEventListener('scroll', () => {
      this.updateTarget(document.elementFromPoint(this.mouseX, this.mouseY));
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
      this.hoverFrame = null;
    });
  }

  updateTarget(target) {
    const el = target instanceof Element ? target : null;
    this.hoverFrame = el ? el.closest('.video-exhibition-frame') : null;
    this.overControls = Boolean(this.hoverFrame && el.closest('.video-hud'));
  }

  loop() {
    // Smooth trailing physics (position only; visual states are CSS transitions)
    const ease = 0.18;
    this.cursorX += (this.mouseX - this.cursorX) * ease;
    this.cursorY += (this.mouseY - this.cursorY) * ease;
    this.cursor.style.transform = `translate3d(${this.cursorX}px, ${this.cursorY}px, 0)`;

    const frame = this.hoverFrame;
    this.cursor.classList.toggle('is-active', Boolean(frame) && !this.overControls);
    this.cursor.classList.toggle('is-compact', Boolean(frame) && this.overControls);
    // Read live so HUD button / spacebar / click state changes are reflected immediately
    this.cursor.classList.toggle('is-paused-state', Boolean(frame && frame.classList.contains('is-paused')));

    requestAnimationFrame(() => this.loop());
  }
}
