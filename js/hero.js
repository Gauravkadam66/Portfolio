/**
 * HERO — GAURAV PORTFOLIO
 * Typewriter name cycle (GAURAV → CREATES → ART) and the full-bleed background video.
 */

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export class HeroTypewriter {
  constructor() {
    this.root = document.getElementById('hero-typewriter');
    if (!this.root) return;

    this.textEl = this.root.querySelector('.typewriter-text');
    this.words = ['GAURAV', 'CREATES', 'ART'];
    this.wordIndex = 0;

    if (prefersReducedMotion()) {
      this.textEl.textContent = 'GAURAV';
      this.root.classList.add('is-static');
      return;
    }

    // GAURAV is already on screen: let it breathe, then start the cycle
    this.textEl.textContent = this.words[0];
    this.schedule(() => this.erase(), 3000);
  }

  schedule(fn, delay) {
    this.timer = window.setTimeout(fn, delay);
  }

  // Slight human variance so the rhythm never feels mechanical
  jitter(base, spread) {
    return base + Math.random() * spread;
  }

  erase() {
    const current = this.textEl.textContent;
    this.root.classList.add('is-typing');

    if (current.length > 0) {
      this.textEl.textContent = current.slice(0, -1);
      this.schedule(() => this.erase(), this.jitter(55, 30));
      return;
    }

    this.root.classList.remove('is-typing');
    this.wordIndex = (this.wordIndex + 1) % this.words.length;
    this.schedule(() => this.type(), 420);
  }

  type() {
    const target = this.words[this.wordIndex];
    const current = this.textEl.textContent;
    this.root.classList.add('is-typing');

    if (current.length < target.length) {
      this.textEl.textContent = target.slice(0, current.length + 1);
      this.schedule(() => this.type(), this.jitter(115, 70));
      return;
    }

    // Word complete: caret returns to its slow blink while the word holds
    this.root.classList.remove('is-typing');
    const hold = this.wordIndex === 0 ? 3000 : 1900;
    this.schedule(() => this.erase(), hold);
  }
}

export class HeroBackgroundVideo {
  constructor() {
    this.video = document.getElementById('hero-bg-video');
    if (!this.video) return;
    this.media = this.video.closest('.hero-media');

    // The <video> may already have failed/loaded before this module ran
    if (this.video.error) {
      this.fail();
      return;
    }

    this.video.addEventListener('error', () => this.fail());
    if (this.video.readyState >= 2) {
      this.markReady();
    } else {
      this.video.addEventListener('loadeddata', () => this.markReady(), { once: true });
    }

    if (prefersReducedMotion()) {
      // Keep the atmosphere as a still frame, no motion
      this.video.removeAttribute('autoplay');
      this.video.pause();
      return;
    }

    // Only decode while the hero is actually on screen
    const hero = this.video.closest('.hero-section');
    if (hero && 'IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!this.video) return;
          if (entry.isIntersecting) {
            this.video.play().catch(() => {});
          } else {
            this.video.pause();
          }
        });
      }, { threshold: 0.05 }).observe(hero);
    }
  }

  markReady() {
    if (!this.video) return;
    this.video.classList.add('is-ready');
    if (this.media) this.media.classList.add('has-video');
  }

  // Missing/unsupported file: remove the element so only the navy atmosphere remains
  fail() {
    if (this.media) this.media.classList.remove('has-video');
    if (this.video) {
      this.video.removeAttribute('src');
      this.video.load();
      this.video.remove();
      this.video = null;
    }
  }
}
