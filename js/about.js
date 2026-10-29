/**
 * ABOUT — GAURAV PORTFOLIO
 * osu! easter egg: an approach circle closes onto "circles" when it's hovered, focused or tapped.
 * (The photographs are handled by photo-focus.js.)
 */

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export class AboutSection {
  constructor() {
    this.initOsu();
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
