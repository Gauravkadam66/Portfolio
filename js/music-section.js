/**
 * MUSIC SECTION — GAURAV PORTFOLIO
 *
 * A closed panel in the normal page flow that expands into a three-track player.
 * - One <audio> element for every track → only one can ever play; switching tracks
 *   reuses it (no duplicates when the panel opens/closes).
 * - Nothing autoplays. Play only happens from an explicit press, and the UI only
 *   switches to "playing" on the element's real `playing` event.
 * - Tracks come from the <li data-ms-card> markup; any whose file is missing are
 *   dropped, and with none available the whole section stays hidden.
 * - The waveform is decorative (generated per track, NOT the real amplitude); the
 *   range input on top of it is the real timeline and seeks the real audio.
 * - A card with data-drop-note="47" shows "If you just want the drop, skip to 0:47."
 *   when its play is pressed (not when merely selected).
 * - Shares the page's sound with the video cards via the `site-audio` event.
 */

const fmt = (s) => {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

// Small deterministic PRNG so each track always gets the same decorative waveform
const seeded = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const isAudioFile = async (src) => {
  if (!src) return false;
  try {
    const res = await fetch(src, { method: 'HEAD' });
    return res.ok && (res.headers.get('content-type') || '').startsWith('audio/');
  } catch {
    return false;
  }
};

export class MusicSection {
  constructor() {
    this.root = document.querySelector('[data-music]');
    if (!this.root) return;

    const q = (s) => this.root.querySelector(s);
    this.panel = q('[data-music-panel]');
    this.toggleBtn = q('[data-music-toggle]');
    this.body = q('[data-music-body]');
    this.sub = q('[data-music-sub]');
    this.mini = q('[data-music-mini]');
    this.stage = q('[data-ms-stage]');
    this.list = q('[data-ms-cards]');
    this.note = q('[data-ms-note]');
    this.noteSeek = q('[data-ms-note-seek]');
    this.mainBtn = q('[data-ms-toggle]');
    this.nowArt = q('[data-ms-now-art]');
    this.nowTitle = q('[data-ms-now-title]');
    this.nowMood = q('[data-ms-now-mood]');
    this.elapsed = q('[data-ms-elapsed]');
    this.duration = q('[data-ms-duration]');
    this.wave = q('[data-ms-wave]');
    this.bars = q('[data-ms-bars]');
    this.barsPlayed = q('[data-ms-bars-played]');
    this.seek = q('[data-ms-seek]');
    this.muteBtn = q('[data-ms-mute]');
    this.vol = q('[data-ms-vol]');
    this.status = q('[data-ms-status]');
    this.openLinks = [...document.querySelectorAll('[data-music-open]')];

    this.subDefault = this.sub ? this.sub.textContent : '';
    this.audio = null;
    this.tracks = [];
    this.index = 0;
    this.isOpen = false;
    this.seeking = false;
    this.noteDismissed = false;

    this.init();
  }

  async init() {
    const cards = [...this.root.querySelectorAll('[data-ms-card]')];
    const available = await Promise.all(cards.map(c => isAudioFile(c.dataset.src)));
    cards.forEach((card, i) => { if (!available[i]) card.remove(); });

    this.tracks = cards.filter((_, i) => available[i]).map((card) => ({
      card,
      src: card.dataset.src,
      title: card.dataset.title || '',
      mood: card.dataset.mood || '',
      dropNote: card.dataset.dropNote ? parseFloat(card.dataset.dropNote) : null,
      id: card.className,
    }));

    if (!this.tracks.length) return; // nothing to play yet → section stays hidden

    this.root.hidden = false;
    this.openLinks.forEach(a => { a.hidden = false; });
    this.root.classList.toggle('is-single', this.tracks.length === 1);
    this.tracks.forEach(t => this.applyArt(t));
    this.bind();
    this.select(0, { keepPlaying: false });
  }

  // Optional artwork image (data-art). Without it the card keeps its own type-led art.
  applyArt(track) {
    const url = track.card.dataset.art;
    if (!url) return;
    const img = new Image();
    img.onload = () => {
      track.card.style.setProperty('--art', `url("${url}")`);
      track.card.classList.add('has-art');
      if (this.tracks[this.index] === track) this.updateNow();
    };
    img.src = url;
  }

  bind() {
    this.toggleBtn.addEventListener('click', () => this.setOpen(!this.isOpen));
    this.openLinks.forEach(a => a.addEventListener('click', () => this.setOpen(true)));
    this.mini.addEventListener('click', () => this.audio && this.audio.pause());

    this.tracks.forEach((t, i) => {
      t.card.querySelector('[data-ms-select]').addEventListener('click', () => {
        if (this.suppressClick) return;
        if (i !== this.index) this.select(i, { keepPlaying: true });
      });
      t.card.querySelector('[data-ms-play]').addEventListener('click', () => {
        if (i === this.index && this.audio && !this.audio.paused) {
          this.audio.pause();
        } else {
          if (i !== this.index) this.select(i, { keepPlaying: false });
          this.pressPlay();
        }
      });
    });

    this.mainBtn.addEventListener('click', () => {
      if (this.audio && !this.audio.paused) this.audio.pause();
      else this.pressPlay();
    });
    this.root.querySelector('[data-ms-prev]').addEventListener('click', () => this.select(this.index - 1, { keepPlaying: true }));
    this.root.querySelector('[data-ms-next]').addEventListener('click', () => this.select(this.index + 1, { keepPlaying: true }));

    // Timeline: native range = click, drag and keyboard seeking on the real audio
    this.seek.addEventListener('input', () => {
      this.seeking = true;
      this.paintProgress(this.seek.value / 1000);
      if (this.audio && Number.isFinite(this.audio.duration)) {
        this.elapsed.textContent = fmt((this.seek.value / 1000) * this.audio.duration);
      }
    });
    this.seek.addEventListener('change', () => {
      if (this.audio && Number.isFinite(this.audio.duration)) {
        this.audio.currentTime = (this.seek.value / 1000) * this.audio.duration;
      }
      this.seeking = false;
    });

    this.muteBtn.addEventListener('click', () => {
      const a = this.ensureAudio();
      a.muted = !a.muted;
    });
    this.vol.addEventListener('input', () => {
      const a = this.ensureAudio();
      a.volume = this.vol.value / 100;
      if (a.muted && a.volume > 0) a.muted = false;
    });

    // The Weeknd note
    this.noteSeek.addEventListener('click', () => this.jumpToDrop());
    this.root.querySelector('[data-ms-note-close]').addEventListener('click', () => {
      this.noteDismissed = true;
      this.hideNote();
    });

    // Arrow keys + swipe change the selected track
    this.stage.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); this.select(this.index + 1, { keepPlaying: true }); this.focusCurrent(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); this.select(this.index - 1, { keepPlaying: true }); this.focusCurrent(); }
    });
    this.bindSwipe();

    // Another sound source on the page (a video's audio / the lightbox) takes over
    document.addEventListener('site-audio', (e) => {
      if (e.detail?.source !== 'music' && this.audio && !this.audio.paused) this.audio.pause();
    });
  }

  bindSwipe() {
    let x = 0; let y = 0; let tracking = false;
    this.stage.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      tracking = true; x = e.clientX; y = e.clientY;
    });
    this.stage.addEventListener('pointerup', (e) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.clientX - x; const dy = e.clientY - y;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        this.select(this.index + (dx < 0 ? 1 : -1), { keepPlaying: true });
        this.suppressClick = true;
        setTimeout(() => { this.suppressClick = false; }, 350);
      }
    });
    this.stage.addEventListener('pointercancel', () => { tracking = false; });
  }

  focusCurrent() {
    const btn = this.tracks[this.index]?.card.querySelector('[data-ms-select]');
    if (btn) btn.focus({ preventScroll: true });
  }

  setOpen(open) {
    if (open === this.isOpen) return;
    this.isOpen = open;
    this.panel.classList.toggle('is-open', open);
    this.toggleBtn.setAttribute('aria-expanded', String(open));
    if (open) {
      this.body.removeAttribute('inert');
      // Fetch the selected track's metadata so its real duration shows (no playback)
      const a = this.ensureAudio();
      if (!a.src) this.loadCurrent();
    } else {
      this.body.setAttribute('inert', '');
    }
    this.updateClosedState();
  }

  ensureAudio() {
    if (this.audio) return this.audio;
    const a = new Audio();
    a.preload = 'metadata';
    a.volume = this.vol.value / 100;

    a.addEventListener('playing', () => {
      this.setPlaying(true);
      document.dispatchEvent(new CustomEvent('site-audio', { detail: { source: 'music' } }));
    });
    a.addEventListener('pause', () => this.setPlaying(false));
    a.addEventListener('waiting', () => this.panel.classList.add('is-loading'));
    a.addEventListener('canplay', () => this.panel.classList.remove('is-loading'));
    a.addEventListener('loadedmetadata', () => {
      this.duration.textContent = fmt(a.duration);
      this.seek.disabled = false;
      this.updateNoteSeek();
    });
    a.addEventListener('timeupdate', () => {
      if (this.seeking || !Number.isFinite(a.duration) || a.duration === 0) return;
      const p = a.currentTime / a.duration;
      this.elapsed.textContent = fmt(a.currentTime);
      this.seek.value = String(Math.round(p * 1000));
      this.paintProgress(p);
    });
    a.addEventListener('ended', () => {
      // Carry on through the collection; stop after the last track
      if (this.index < this.tracks.length - 1) this.select(this.index + 1, { keepPlaying: true, force: true });
      else this.setPlaying(false);
    });
    a.addEventListener('volumechange', () => {
      this.panel.classList.toggle('is-muted', a.muted || a.volume === 0);
      this.muteBtn.setAttribute('aria-pressed', String(a.muted));
      this.muteBtn.setAttribute('aria-label', a.muted ? 'Unmute' : 'Mute');
    });
    a.addEventListener('error', () => {
      this.panel.classList.remove('is-loading');
      this.setPlaying(false);
      this.say(`“${this.tracks[this.index]?.title}” couldn’t be loaded.`);
    });

    this.audio = a;
    return a;
  }

  loadCurrent() {
    const a = this.ensureAudio();
    const t = this.tracks[this.index];
    a.src = t.src;
    this.seek.disabled = true;
    this.seek.value = '0';
    this.paintProgress(0);
    this.elapsed.textContent = '0:00';
    this.duration.textContent = '0:00';
  }

  // Change the selected track. If music was already playing, the new track carries on playing.
  select(i, { keepPlaying, force = false }) {
    const n = this.tracks.length;
    const next = ((i % n) + n) % n;
    if (next === this.index && !force && this.audio?.src) return;

    const wasPlaying = Boolean(this.audio && !this.audio.paused) || (force && keepPlaying);
    this.index = next;
    this.hideNote();
    this.noteDismissed = false;
    this.renderSlots();
    this.updateNow();
    this.drawWave();

    if (this.audio) {
      this.loadCurrent();
      if (keepPlaying && wasPlaying) this.requestPlay();
    }
  }

  // An explicit press of play (card or bar) on the current track
  pressPlay() {
    const a = this.ensureAudio();
    if (!a.src) this.loadCurrent();
    const t = this.tracks[this.index];
    if (t.dropNote != null && !this.noteDismissed) this.showNote();
    this.requestPlay();
  }

  requestPlay() {
    const a = this.ensureAudio();
    this.panel.classList.add('is-loading');
    a.play().catch((err) => {
      this.panel.classList.remove('is-loading');
      if (err && err.name === 'AbortError') return; // superseded by a newer play/pause/src change
      this.setPlaying(false);
      this.say(err && err.name === 'NotAllowedError'
        ? 'Your browser blocked playback. Press play again.'
        : `“${this.tracks[this.index]?.title}” couldn’t be played.`);
    });
  }

  setPlaying(playing) {
    if (playing) this.panel.classList.remove('is-loading');
    this.panel.classList.toggle('is-playing', playing);
    this.tracks.forEach((t, i) => {
      const on = playing && i === this.index;
      t.card.classList.toggle('is-playing', on);
      const btn = t.card.querySelector('[data-ms-play]');
      btn.setAttribute('aria-label', `${on ? 'Pause' : 'Play'} ${t.title}`);
    });
    this.mainBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    // The status line describes what's happening now; never leave a stale "Now playing"
    // (error messages are written after this call, so they still show)
    this.say(playing ? `Now playing: ${this.tracks[this.index].title}` : '');
    this.updateClosedState();
  }

  // Closed panel + playing: say what's on and offer a pause, without reopening (and nothing floats)
  updateClosedState() {
    const playing = Boolean(this.audio && !this.audio.paused);
    const showMini = playing && !this.isOpen;
    this.mini.hidden = !showMini;
    if (this.sub) {
      this.sub.textContent = showMini ? `Now playing: ${this.tracks[this.index].title}` : this.subDefault;
    }
  }

  renderSlots() {
    const n = this.tracks.length;
    this.tracks.forEach((t, i) => {
      const offset = (i - this.index + n) % n;
      const slot = offset === 0 ? 'active' : offset === 1 ? 'next' : 'prev';
      t.card.dataset.slot = n === 2 && slot === 'prev' ? 'next' : slot;
      t.card.classList.toggle('is-selected', offset === 0);
      const sel = t.card.querySelector('[data-ms-select]');
      sel.setAttribute('aria-pressed', String(offset === 0));
      sel.setAttribute('aria-label', offset === 0 ? `${t.title}, selected` : `Select ${t.title}`);
    });
  }

  updateNow() {
    const t = this.tracks[this.index];
    this.nowTitle.textContent = t.title;
    this.nowMood.textContent = t.mood;
    // Mini artwork mirrors the card's art (image or type-led treatment)
    this.nowArt.className = `ms-now-art ${[...t.card.classList].filter(c => c.startsWith('ms-card--')).map(c => c.replace('ms-card--', 'ms-now-art--')).join(' ')}`;
    this.nowArt.style.backgroundImage = t.card.classList.contains('has-art') ? t.card.style.getPropertyValue('--art') : '';
    this.root.dataset.track = t.card.className.match(/ms-card--(\S+)/)?.[1] || '';
  }

  drawWave() {
    const rand = seeded(this.tracks[this.index].title);
    const count = 72;
    let prev = 0.5;
    const heights = Array.from({ length: count }, (_, i) => {
      // smoothed noise with a gentle swell, so it reads like a waveform rather than static
      const swell = 0.55 + 0.45 * Math.sin((i / count) * Math.PI);
      prev = prev * 0.45 + rand() * 0.55;
      return Math.max(0.12, Math.min(1, prev * swell * 1.25));
    });
    const html = heights.map(h => `<i style="--h:${h.toFixed(3)}"></i>`).join('');
    this.bars.innerHTML = html;
    this.barsPlayed.innerHTML = html;
  }

  paintProgress(p) {
    this.wave.style.setProperty('--p', `${(Math.max(0, Math.min(1, p)) * 100).toFixed(2)}%`);
  }

  // ---- The Weeknd note -------------------------------------------------
  showNote() {
    this.note.hidden = false;
    this.updateNoteSeek();
    requestAnimationFrame(() => this.note.classList.add('is-visible'));
  }

  hideNote() {
    this.note.classList.remove('is-visible');
    this.note.hidden = true;
  }

  updateNoteSeek() {
    const t = this.tracks[this.index];
    if (!t || t.dropNote == null) return;
    this.noteSeek.textContent = fmt(t.dropNote);
    const d = this.audio?.duration;
    const tooShort = Number.isFinite(d) && d < t.dropNote;
    this.noteSeek.disabled = tooShort;
    this.noteSeek.title = tooShort ? 'This track is shorter than that.' : `Skip to ${fmt(t.dropNote)}`;
  }

  jumpToDrop() {
    const t = this.tracks[this.index];
    const a = this.ensureAudio();
    if (!t || t.dropNote == null) return;
    const go = () => {
      if (!Number.isFinite(a.duration) || a.duration < t.dropNote) {
        this.updateNoteSeek();
        return;
      }
      a.currentTime = t.dropNote;
      if (a.paused) this.requestPlay();
    };
    if (a.readyState >= 1) go();
    else a.addEventListener('loadedmetadata', go, { once: true });
  }

  say(text) {
    if (!this.status) return;
    clearTimeout(this.sayTimer);
    this.status.textContent = '';
    if (!text) return;
    // short delay so screen readers announce repeated messages too
    this.sayTimer = setTimeout(() => { this.status.textContent = text; }, 50);
  }
}

