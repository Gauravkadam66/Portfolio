/**
 * MUSIC PLAYER — GAURAV PORTFOLIO
 *
 * One native <audio> element, one controller. OFF by default and never autoplays:
 * playback only starts from an explicit click/tap (the player itself or a
 * [data-music-trigger] button elsewhere on the page).
 *
 * The UI only says "Now playing" after the browser fires `playing`.
 * The player stays hidden unless the configured file really exists.
 *
 * Shares the page's sound with the video cards through a `site-audio` event:
 * starting the music mutes any unmuted video, unmuting a video pauses the music.
 */

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

export class MusicPlayer {
  constructor() {
    this.root = document.getElementById('music-player');
    if (!this.root) return;

    this.src = this.root.dataset.src;
    this.title = this.root.dataset.title || 'Music';
    this.audio = null; // created on first play, so nothing downloads until asked
    this.seeking = false;

    this.toggleBtn = this.root.querySelector('.mp-toggle');
    this.muteBtn = this.root.querySelector('.mp-mute');
    this.seek = this.root.querySelector('.mp-seek');
    this.label = this.root.querySelector('.mp-label');
    this.elapsedEl = this.root.querySelector('.mp-elapsed');
    this.durationEl = this.root.querySelector('.mp-duration');
    this.status = this.root.querySelector('[data-mp-status]');
    this.triggers = [...document.querySelectorAll('[data-music-trigger]')];

    this.offLabel = this.label.innerHTML;
    this.bind();
    this.checkAvailability();
    this.watchHero();
  }

  // The full "Sound off · tap to listen" label shows in the hero; past it, phones get
  // the compact player (CSS decides what compact means per screen size)
  watchHero() {
    const hero = document.getElementById('hero');
    if (!hero || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(([entry]) => {
      this.root.classList.toggle('is-compact', !entry.isIntersecting);
    }, { threshold: 0.15 }).observe(hero);
  }

  // Show the player only when the track exists and is audio (dev servers answer 404s with HTML)
  async checkAvailability() {
    if (!this.src) return;
    try {
      const res = await fetch(this.src, { method: 'HEAD' });
      const type = res.headers.get('content-type') || '';
      if (!res.ok || !type.startsWith('audio/')) return;
    } catch {
      return;
    }
    this.root.hidden = false;
    this.triggers.forEach(t => { t.hidden = false; });
    requestAnimationFrame(() => this.root.classList.add('is-visible'));
  }

  bind() {
    this.toggleBtn.addEventListener('click', () => this.toggle());
    this.triggers.forEach(t => t.addEventListener('click', () => this.play()));

    this.muteBtn.addEventListener('click', () => {
      if (!this.audio) return;
      this.audio.muted = !this.audio.muted;
    });

    // Native range input: mouse, touch and keyboard seeking for free
    this.seek.addEventListener('input', () => {
      this.seeking = true;
      this.paintSeek();
      if (this.audio && Number.isFinite(this.audio.duration)) {
        this.elapsedEl.textContent = formatTime((this.seek.value / 1000) * this.audio.duration);
      }
    });
    this.seek.addEventListener('change', () => {
      if (this.audio && Number.isFinite(this.audio.duration)) {
        this.audio.currentTime = (this.seek.value / 1000) * this.audio.duration;
      }
      this.seeking = false;
    });

    // Another sound source on the page (a video's audio / the lightbox) takes over
    document.addEventListener('site-audio', (e) => {
      if (e.detail?.source !== 'music' && this.audio && !this.audio.paused) {
        this.audio.pause();
      }
    });
  }

  // Played portion of the thin track (WebKit has no native "progress" pseudo-element)
  paintSeek() {
    this.seek.style.setProperty('--p', `${this.seek.value / 10}%`);
  }

  ensureAudio() {
    if (this.audio) return this.audio;
    const audio = new Audio();
    audio.preload = 'auto';
    audio.loop = true; // a soundtrack for browsing; seeking still works
    audio.src = this.src;

    audio.addEventListener('playing', () => {
      this.setState('playing');
      document.dispatchEvent(new CustomEvent('site-audio', { detail: { source: 'music' } }));
    });
    audio.addEventListener('waiting', () => {
      if (!audio.paused) this.setState('loading');
    });
    audio.addEventListener('pause', () => this.setState('paused'));
    audio.addEventListener('loadedmetadata', () => {
      this.durationEl.textContent = formatTime(audio.duration);
      this.seek.disabled = false;
    });
    audio.addEventListener('timeupdate', () => {
      if (this.seeking || !Number.isFinite(audio.duration)) return;
      this.elapsedEl.textContent = formatTime(audio.currentTime);
      this.seek.value = String(Math.round((audio.currentTime / audio.duration) * 1000));
      this.paintSeek();
    });
    audio.addEventListener('volumechange', () => {
      this.root.classList.toggle('is-muted', audio.muted);
      this.muteBtn.setAttribute('aria-pressed', String(audio.muted));
      this.muteBtn.setAttribute('aria-label', audio.muted ? 'Unmute music' : 'Mute music');
    });
    audio.addEventListener('error', () => this.setState('error'));

    this.audio = audio;
    return audio;
  }

  toggle() {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
    } else {
      this.play();
    }
  }

  play() {
    const audio = this.ensureAudio();
    if (!audio.paused) return;
    this.setState('loading');
    // play() must come straight from the click; UI waits for the real `playing` event
    audio.play().catch((err) => {
      // AbortError = paused before it started; anything else is a real failure
      if (err && err.name === 'AbortError') {
        this.setState(audio.currentTime > 0 ? 'paused' : 'off');
      } else {
        this.setState('error');
      }
    });
  }

  setState(state) {
    this.root.dataset.state = state;
    const labels = {
      off: null,
      loading: 'Loading…',
      playing: 'Now playing',
      paused: 'Paused',
      error: 'Couldn’t play the track',
    };

    if (state === 'off') {
      this.label.innerHTML = this.offLabel;
    } else {
      this.label.textContent = labels[state];
    }

    const isPlaying = state === 'playing' || state === 'loading';
    this.toggleBtn.setAttribute('aria-label', isPlaying ? 'Pause music' : `Play ${this.title}`);
    this.toggleBtn.setAttribute('aria-pressed', String(state === 'playing'));

    const announce = { playing: `Now playing: ${this.title}`, paused: 'Music paused', error: 'The music could not be played' };
    if (announce[state]) this.status.textContent = announce[state];
  }
}
