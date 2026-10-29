/**
 * SWIPE GALLERY — GAURAV PORTFOLIO
 * The short-form reels become a native horizontal swipe gallery below 992px
 * (CSS scroll-snap does the work). This only adds the prev/next buttons and the
 * "1 / 3" position — no scroll-jacking, the page itself always scrolls normally.
 */

export class SwipeGallery {
  constructor(root) {
    this.root = root;
    this.track = root.querySelector('[data-swipe-track]');
    this.controls = root.querySelector('[data-swipe-controls]');
    if (!this.track || !this.controls) return;

    this.items = [...this.track.children];
    this.prev = this.controls.querySelector('[data-swipe-prev]');
    this.next = this.controls.querySelector('[data-swipe-next]');
    this.count = this.controls.querySelector('[data-swipe-count]');
    this.query = window.matchMedia('(max-width: 992px)');

    this.prev.addEventListener('click', () => this.go(this.index() - 1));
    this.next.addEventListener('click', () => this.go(this.index() + 1));

    let queued = false;
    this.track.addEventListener('scroll', () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        this.update();
      });
    }, { passive: true });

    const onMode = () => {
      const active = this.query.matches;
      this.controls.hidden = !active;
      this.root.classList.toggle('is-swipe', active);
      // Only a keyboard stop while it's actually a scrollable gallery
      if (active) this.track.setAttribute('tabindex', '0');
      else this.track.removeAttribute('tabindex');
      this.update();
    };
    this.query.addEventListener('change', onMode);
    onMode();
  }

  // Item whose snap position is nearest the current scroll (track is position:relative, so offsetLeft is track-relative)
  index() {
    const left = this.track.scrollLeft;
    let best = 0;
    let bestDist = Infinity;
    this.items.forEach((item, i) => {
      const dist = Math.abs(item.offsetLeft - this.padding() - left);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    return best;
  }

  padding() {
    return parseFloat(getComputedStyle(this.track).scrollPaddingLeft) || 0;
  }

  go(i) {
    const target = this.items[Math.max(0, Math.min(this.items.length - 1, i))];
    if (!target) return;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.track.scrollTo({
      left: target.offsetLeft - this.padding(),
      behavior: smooth ? 'smooth' : 'auto',
    });
  }

  update() {
    const i = this.index();
    const atEnd = this.track.scrollLeft + this.track.clientWidth >= this.track.scrollWidth - 2;
    const current = atEnd ? this.items.length - 1 : i;
    this.count.textContent = `${current + 1} / ${this.items.length}`;
    this.prev.disabled = this.track.scrollLeft <= 2;
    this.next.disabled = atEnd;
    this.root.classList.toggle('is-at-start', this.track.scrollLeft <= 2);
    this.root.classList.toggle('is-at-end', atEnd);
  }
}
