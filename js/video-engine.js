/**
 * VIDEO ENGINE & EXHIBITION CONTROLLER — GAURAV PORTFOLIO
 * High-performance exhibition player supporting both real video files
 * (.mp4 / .webm in public/assets/videos/) and procedural motion simulations.
 */

export class VideoExhibitionEngine {
  constructor() {
    this.players = [];
    this.activeLightboxPlayer = null;
    this.initObserver();
    this.initPlayers();
    this.preloader = new PreloadQueue(this.players);
    this.bindEvents();
  }

  // Called once the hero is up: start buffering the rest of the page in the background
  beginPreloading() {
    this.preloader.begin();
  }

  initObserver() {
    // Only decode what is actually on screen (buffering ahead is the PreloadQueue's job)
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const player = entry.target._playerInstance;
        if (player) player.setInView(entry.isIntersecting);
      });
    }, {
      rootMargin: '0px',
      threshold: 0.2
    });
  }

  initPlayers() {
    const frames = document.querySelectorAll('.video-exhibition-frame');
    frames.forEach((frame) => {
      const canvas = frame.querySelector('.canvas-player');
      const theme = frame.dataset.motionTheme || 'cinematic';
      const duration = parseFloat(frame.dataset.duration || '12'); // fallback duration
      const videoSrc = frame.dataset.videoSrc; // Path to real video file
      // Grid cards are small on screen: they autoplay the light 720p preview; Expand uses the full file
      const usePreview = Boolean(frame.closest('.video-grid, .reels-grid-3col'));

      const player = new ExhibitionPlayer(frame, canvas, theme, duration, videoSrc, usePreview, (p) => this.handleUnmute(p));
      frame._playerInstance = player;
      this.players.push(player);
      this.observer.observe(frame);
    });
  }

  // Only one card plays sound at a time — and the site music steps aside for it
  handleUnmute(activePlayer) {
    this.players.forEach(p => {
      if (p !== activePlayer) p.setMuted(true);
    });
    document.dispatchEvent(new CustomEvent('site-audio', { detail: { source: 'video' } }));
  }

  bindEvents() {
    // Site music started: silence any unmuted video card
    document.addEventListener('site-audio', (e) => {
      if (e.detail?.source === 'music') this.players.forEach(p => { if (!p.isMuted) p.setMuted(true); });
    });

    // Lightbox modal logic
    const modal = document.getElementById('lightbox-modal');
    const closeBtn = document.getElementById('lightbox-close');

    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => this.closeLightbox());
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeLightbox();
      });
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('is-open')) {
          this.closeLightbox();
        }
      });
    }

    // Expand buttons
    document.querySelectorAll('.hud-expand-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const frame = btn.closest('.video-exhibition-frame');
        if (frame && frame._playerInstance) {
          this.openLightbox(frame._playerInstance);
        }
      });
    });
  }

  openLightbox(player) {
    const modal = document.getElementById('lightbox-modal');
    const modalCanvas = document.getElementById('lightbox-canvas');
    const modalVideo = document.getElementById('lightbox-video');
    if (!modal) return;

    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    // Lightbox takes over audio (card muted, site music paused)
    player.setMuted(true);
    document.dispatchEvent(new CustomEvent('site-audio', { detail: { source: 'video' } }));

    // If real video is active and ready
    if (player.hasRealVideo && player.videoElement && player.isVideoLoaded) {
      if (modalCanvas) modalCanvas.style.display = 'none';
      if (modalVideo) {
        modalVideo.style.display = 'block';
        modalVideo.poster = player.posterSrc || '';
        modalVideo.src = player.videoSrc; // always the full-quality master
        modalVideo.currentTime = player.videoElement.currentTime;
        modalVideo.muted = false;
        modalVideo.play().catch(() => {});
      }
      this.activeLightboxPlayer = { type: 'video', element: modalVideo };
    } else {
      // Fallback: procedural motion simulation on canvas
      if (modalVideo) {
        modalVideo.pause();
        modalVideo.style.display = 'none';
      }
      if (modalCanvas) {
        modalCanvas.style.display = 'block';
        const modalPlayer = new MotionCanvasPlayer(
          modalCanvas,
          player.theme,
          player.totalDuration,
          modal
        );
        modalPlayer.play();
        this.activeLightboxPlayer = { type: 'canvas', player: modalPlayer };
      }
    }
  }

  closeLightbox() {
    const modal = document.getElementById('lightbox-modal');
    if (!modal) return;
    modal.classList.remove('is-open');
    document.body.style.overflow = '';

    if (this.activeLightboxPlayer) {
      if (this.activeLightboxPlayer.type === 'video' && this.activeLightboxPlayer.element) {
        this.activeLightboxPlayer.element.pause();
        this.activeLightboxPlayer.element.src = '';
      } else if (this.activeLightboxPlayer.type === 'canvas' && this.activeLightboxPlayer.player) {
        this.activeLightboxPlayer.player.destroy();
      }
      this.activeLightboxPlayer = null;
    }
  }
}

/**
 * Universal Exhibition Player
 * Seamlessly manages real HTML5 video files when present,
 * with automatic fallback to high-end procedural motion design simulations.
 */
/**
 * Background buffering: after the hero is ready, videos are preloaded in page order
 * (2 at a time, 1 on slow connections) so they're ready before the visitor scrolls to them.
 * Anything within ~1.5 screens of the viewport jumps the queue.
 */
class PreloadQueue {
  constructor(players) {
    const conn = navigator.connection || {};
    // Data saver / slow networks: only buffer what the visitor is about to reach
    this.lowBandwidth = Boolean(conn.saveData) || /(^|-)2g$|^3g$/.test(conn.effectiveType || '');
    this.concurrency = this.lowBandwidth ? 1 : 2;
    this.pending = players.filter(p => p.canPreload());
    this.active = 0;
    this.started = false;

    if ('IntersectionObserver' in window) {
      this.nearObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) this.prioritize(entry.target._playerInstance);
        });
      }, { rootMargin: '150% 0px' });
      this.pending.forEach(p => this.nearObserver.observe(p.container));
    }
  }

  begin() {
    if (this.started) return;
    this.started = true;
    this.pump();
  }

  prioritize(player) {
    if (!player || !this.pending.includes(player)) return;
    this.pending = this.pending.filter(p => p !== player);
    if (this.started) {
      this.run(player); // close to the viewport: start now, even beyond the concurrency limit
    } else {
      this.pending.unshift(player); // hero still loading: go first once it's done
    }
  }

  pump() {
    if (!this.started || this.lowBandwidth) return;
    while (this.active < this.concurrency && this.pending.length) {
      this.run(this.pending.shift());
    }
  }

  run(player) {
    if (this.nearObserver) this.nearObserver.unobserve(player.container);
    this.active++;
    player.preload().finally(() => {
      this.active--;
      this.pump();
    });
  }
}

class ExhibitionPlayer {
  constructor(container, canvas, theme, duration, videoSrc, usePreview, onUnmute) {
    this.container = container;
    this.canvas = canvas;
    this.theme = theme;
    this.totalDuration = duration;
    this.videoSrc = videoSrc;
    this.hasRealVideo = Boolean(videoSrc);
    this.isVideoLoaded = false;
    this.videoFailed = false;
    this.loadRequested = false;
    this.preloadState = 'idle';
    this.videoElement = null;
    this.canvasPlayer = null;
    this.onUnmute = onUnmute;

    // Derived from the master filename: /assets/videos/x.mp4 → previews/x.mp4 + posters/x.jpg
    if (this.hasRealVideo) {
      const slash = videoSrc.lastIndexOf('/');
      const dir = videoSrc.slice(0, slash);
      const file = videoSrc.slice(slash + 1);
      this.posterSrc = `${dir}/posters/${file.replace(/\.[^.]+$/, '.jpg')}`;
      this.previewSrc = usePreview ? `${dir}/previews/${file}` : null;
    }

    this.currentTime = 0;
    this.isPaused = true;      // actual playback state
    this.userPaused = false;   // explicit pause by the visitor (survives scrolling away and back)
    this.isInView = false;
    this.isMuted = true;

    // HUD Elements
    this.hudPlayBtn = container.querySelector('.hud-play-btn');
    this.hudTimecode = container.querySelector('.hud-timecode');
    this.hudProgressBar = container.querySelector('.hud-timeline-bar');
    this.hudAudioBtn = container.querySelector('.hud-audio-btn');
    this.hudTimelineProgress = container.querySelector('.hud-timeline-progress');

    // Audio control only makes sense once a real video (with sound) is playing
    if (this.hudAudioBtn) this.hudAudioBtn.hidden = true;

    // Initialize procedural canvas first as fallback
    if (this.canvas) {
      this.canvasPlayer = new MotionCanvasPlayer(this.canvas, this.theme, this.totalDuration, this.container);
    }

    // Attempt loading real video if provided
    if (this.hasRealVideo) {
      this.setupRealVideo();
    }
    this.bindHUDControls();
  }

  setupRealVideo() {
    const video = document.createElement('video');
    video.className = 'exhibition-video';
    video.playsInline = true;
    video.loop = true;
    video.muted = true;
    // Nothing downloads until the PreloadQueue or the viewport asks for it
    video.preload = 'none';
    video.poster = this.posterSrc; // first frame appears instantly, never a black box
    video.src = this.previewSrc || this.videoSrc;
    video.style.position = 'absolute';
    video.style.inset = '0';
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    if (this.canvas) this.canvas.style.display = 'none';

    video.addEventListener('canplay', () => {
      this.container.classList.remove('is-buffering');
      if (this.isVideoLoaded) return; // canplay re-fires after every seek
      this.isVideoLoaded = true;
      if (this.hudAudioBtn) this.hudAudioBtn.hidden = false;
      this.totalDuration = video.duration || this.totalDuration;
      if (!this.isPaused) {
        video.play().catch(() => {});
      }
    });

    // Subtle buffering state (CSS delays it so quick hiccups never flash)
    video.addEventListener('waiting', () => {
      if (!this.isPaused) this.container.classList.add('is-buffering');
    });
    video.addEventListener('playing', () => this.container.classList.remove('is-buffering'));

    video.addEventListener('timeupdate', () => {
      this.currentTime = video.currentTime;
      this.updateHUD();
    });

    video.addEventListener('error', () => {
      // Preview missing (e.g. `npm run videos` not run yet) → fall back to the full file
      if (this.previewSrc && video.getAttribute('src') === this.previewSrc) {
        video.src = this.videoSrc;
        if (this.loadRequested) video.load();
        if (!this.isPaused) video.play().catch(() => {});
        return;
      }
      // No video at all → graceful procedural canvas placeholder
      this.videoFailed = true;
      this.isVideoLoaded = false;
      this.container.classList.remove('is-buffering');
      video.style.display = 'none';
      if (this.hudAudioBtn) this.hudAudioBtn.hidden = true;
      if (this.canvas) this.canvas.style.display = 'block';
      if (this.canvasPlayer && !this.isPaused) {
        this.canvasPlayer.play();
      }
    });

    this.container.prepend(video);
    this.videoElement = video;
  }

  canPreload() {
    return Boolean(this.videoElement);
  }

  // Buffer ahead without playing. Resolves once the browser has enough to play through
  // (or pauses downloading on its own), so the queue can move on.
  preload() {
    const video = this.videoElement;
    if (!video || this.videoFailed || this.preloadState !== 'idle') return Promise.resolve();
    this.preloadState = 'loading';

    return new Promise((resolve) => {
      const events = ['canplaythrough', 'suspend', 'error'];
      const finish = () => {
        clearTimeout(timer);
        events.forEach(ev => video.removeEventListener(ev, finish));
        this.preloadState = 'done';
        resolve();
      };
      const timer = setTimeout(finish, 20000);

      if (video.readyState >= 4) {
        finish();
        return;
      }
      events.forEach(ev => video.addEventListener(ev, finish));
      video.preload = 'auto';
      if (!this.loadRequested) {
        this.loadRequested = true;
        video.load();
      }
    });
  }

  bindHUDControls() {
    // Clicking the picture toggles playback; controls handle their own clicks
    this.container.addEventListener('click', (e) => {
      if (e.target.closest('button') || e.target.closest('.hud-timeline-progress')) return;
      this.togglePlay();
    });

    if (this.hudPlayBtn) {
      this.hudPlayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePlay();
      });
    }

    if (this.hudAudioBtn) {
      this.hudAudioBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setMuted(!this.isMuted);
        if (!this.isMuted && this.onUnmute) this.onUnmute(this);
      });
    }

    if (this.hudTimelineProgress) {
      // Click or drag to seek (mouse + touch via pointer events)
      const track = this.hudTimelineProgress;
      let scrubbing = false;

      const seekTo = (clientX) => {
        const rect = track.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        if (this.isVideoLoaded && this.videoElement) {
          this.videoElement.currentTime = ratio * (this.videoElement.duration || this.totalDuration);
          this.currentTime = this.videoElement.currentTime;
          this.updateHUD();
        } else if (this.canvasPlayer) {
          this.canvasPlayer.currentTime = ratio * this.canvasPlayer.totalDuration;
          this.canvasPlayer.render();
          this.canvasPlayer.updateHUD();
        }
      };

      const endScrub = (e) => {
        if (!scrubbing) return;
        scrubbing = false;
        track.classList.remove('is-scrubbing');
        if (track.hasPointerCapture(e.pointerId)) track.releasePointerCapture(e.pointerId);
      };

      track.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        scrubbing = true;
        track.setPointerCapture(e.pointerId);
        track.classList.add('is-scrubbing');
        seekTo(e.clientX);
      });
      track.addEventListener('pointermove', (e) => {
        if (scrubbing) seekTo(e.clientX);
      });
      track.addEventListener('pointerup', endScrub);
      track.addEventListener('pointercancel', endScrub);
      track.addEventListener('click', (e) => e.stopPropagation());
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (this.videoElement) this.videoElement.muted = muted;
    if (this.hudAudioBtn) {
      this.hudAudioBtn.textContent = muted ? 'AUDIO OFF' : 'AUDIO ON';
      this.hudAudioBtn.setAttribute('aria-pressed', (!muted).toString());
    }

    // Audio focus: glow + step forward on this frame, neighbours in the same grid step back
    this.container.classList.toggle('is-audio-active', !muted);
    const group = this.container.closest('.video-grid, .reels-grid-3col');
    if (group) {
      group.classList.toggle('has-audio-focus', Boolean(group.querySelector('.is-audio-active')));
    }
  }

  // Visibility-driven playback: never overrides an explicit user pause
  setInView(inView) {
    this.isInView = inView;
    if (inView && !this.userPaused) {
      this.start();
    } else {
      this.stop();
    }
  }

  togglePlay() {
    if (this.userPaused) {
      this.play();
    } else {
      this.pause();
    }
  }

  play() {
    this.userPaused = false;
    this.start();
  }

  pause() {
    this.userPaused = true;
    this.stop();
  }

  start() {
    this.isPaused = false;
    if (this.videoElement && !this.videoFailed) {
      // play() also kicks off loading if the queue hasn't reached this video yet
      this.loadRequested = true;
      this.videoElement.play().catch(() => {});
    } else if (this.canvasPlayer) {
      this.canvasPlayer.play();
    }
    this.syncPlayState();
  }

  stop() {
    this.isPaused = true;
    this.container.classList.remove('is-buffering');
    if (this.videoElement) this.videoElement.pause();
    if (this.canvasPlayer) this.canvasPlayer.pause();
    this.syncPlayState();
  }

  syncPlayState() {
    this.container.classList.toggle('is-paused', this.userPaused);
    if (this.hudPlayBtn) {
      this.hudPlayBtn.textContent = this.userPaused ? '▶︎' : '❚❚';
      this.hudPlayBtn.setAttribute('aria-label', this.userPaused ? 'Play video' : 'Pause video');
    }
  }

  updateHUD() {
    const duration = (this.videoElement && this.videoElement.duration) || this.totalDuration;
    const progress = duration > 0 ? (this.currentTime / duration) * 100 : 0;
    
    if (this.hudProgressBar) {
      this.hudProgressBar.style.width = `${progress}%`;
    }

    if (this.hudTimecode) {
      const minutes = Math.floor(this.currentTime / 60);
      const seconds = Math.floor(this.currentTime % 60);
      const frames = Math.floor((this.currentTime % 1) * 24);
      this.hudTimecode.textContent = `TC 00:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
    }
  }
}

/**
 * Procedural Motion Player for Exhibition Cards
 * Emulates actual elite video editing, motion typography, grading & cuts
 */
class MotionCanvasPlayer {
  constructor(canvas, theme, totalDuration, container) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.theme = theme;
    this.totalDuration = totalDuration;
    this.container = container;
    this.currentTime = 0;
    this.isPaused = false;
    this.isInView = false;
    this.rafId = null;
    this.lastTimestamp = 0;

    // HUD Elements
    this.hudPlayBtn = container.querySelector('.hud-play-btn');
    this.hudTimecode = container.querySelector('.hud-timecode');
    this.hudProgressBar = container.querySelector('.hud-timeline-bar');

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = (rect.width || 800) * dpr;
    this.canvas.height = (rect.height || 450) * dpr;
  }

  play() {
    this.isPaused = false;
    this.lastTimestamp = performance.now();
    if (!this.rafId) {
      this.loop(this.lastTimestamp);
    }
  }

  pause() {
    this.isPaused = true;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  loop(timestamp) {
    if (this.isPaused) return;

    const delta = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    this.currentTime += delta;
    if (this.currentTime >= this.totalDuration) {
      this.currentTime = 0; // seamless loop
    }

    this.render();
    this.updateHUD();

    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  updateHUD() {
    const progress = (this.currentTime / this.totalDuration) * 100;
    if (this.hudProgressBar) {
      this.hudProgressBar.style.width = `${progress}%`;
    }

    if (this.hudTimecode) {
      const minutes = Math.floor(this.currentTime / 60);
      const seconds = Math.floor(this.currentTime % 60);
      const frames = Math.floor((this.currentTime % 1) * 24);
      this.hudTimecode.textContent = `TC 00:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
    }
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (!w || !h) return;

    ctx.clearRect(0, 0, w, h);

    switch (this.theme) {
      case 'vsl':
        this.renderVSLTheme(ctx, w, h);
        break;
      case 'explainer':
        this.renderExplainerTheme(ctx, w, h);
        break;
      case 'podcast':
        this.renderPodcastTheme(ctx, w, h);
        break;
      case 'shortform':
        this.renderShortformTheme(ctx, w, h);
        break;
      default:
        this.renderSelectedWorkTheme(ctx, w, h);
        break;
    }

    this.renderCinematicOverlay(ctx, w, h);
  }

  /* 02 — Selected Work: Flagship Hero Exhibition Simulation */
  renderSelectedWorkTheme(ctx, w, h) {
    const t = this.currentTime;
    ctx.fillStyle = '#070A14';
    ctx.fillRect(0, 0, w, h);

    const glowX = w * (0.35 + Math.sin(t * 0.8) * 0.15);
    const glowY = h * (0.45 + Math.cos(t * 0.6) * 0.15);
    const rad = ctx.createRadialGradient(glowX, glowY, 40, glowX, glowY, w * 0.6);
    rad.addColorStop(0, 'rgba(14, 22, 61, 0.65)');
    rad.addColorStop(0.5, 'rgba(8, 12, 28, 0.35)');
    rad.addColorStop(1, 'rgba(5, 8, 18, 0)');
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    const horizon = h * 0.55;
    for (let i = -6; i <= 6; i++) {
      ctx.beginPath();
      ctx.moveTo(w * 0.5 + i * (w * 0.08), horizon);
      ctx.lineTo(w * 0.5 + i * (w * 0.25), h);
      ctx.stroke();
    }

    const phase = Math.floor(t * 0.5) % 3;
    const phrases = ["NARRATIVE FLOW", "PACING & RHYTHM", "VISUAL SYNTHESIS"];
    
    ctx.font = `600 ${Math.floor(w * 0.045)}px 'Inter', sans-serif`;
    ctx.fillStyle = '#F2F3F5';
    ctx.textAlign = 'center';
    ctx.fillText(phrases[phase], w * 0.5, h * 0.42);

    ctx.font = `400 ${Math.floor(w * 0.016)}px 'DM Mono', monospace`;
    ctx.fillStyle = '#8D929B';
    ctx.fillText(`CUT SEQUENCE #${String(phase + 1).padStart(2, '0')} // 24.00 FPS`, w * 0.5, h * 0.49);

    this.drawAudioWave(ctx, w * 0.25, h * 0.65, w * 0.5, h * 0.06, t);
  }

  /* 03 — VSL / Marketing: High-retention Kinetic Pacing & Typography */
  renderVSLTheme(ctx, w, h) {
    const t = this.currentTime;
    ctx.fillStyle = '#060914';
    ctx.fillRect(0, 0, w, h);

    const beat = (t * 2) % 4;
    const activeWordIdx = Math.floor(beat);
    const words = ["ATTENTION", "RETENTION", "STORY", "CONVERSION"];

    const barW = (beat / 4) * w;
    ctx.fillStyle = 'rgba(14, 22, 61, 0.85)';
    ctx.fillRect(0, 0, barW, 4);

    ctx.font = `700 ${Math.floor(w * 0.055)}px 'Inter', sans-serif`;
    ctx.fillStyle = '#F2F3F5';
    ctx.textAlign = 'center';
    ctx.fillText(words[activeWordIdx], w * 0.5, h * 0.46);

    ctx.strokeStyle = '#4A5A8C';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(w * 0.5 - 130, h * 0.53, 260, 28);
    ctx.font = `500 ${Math.floor(w * 0.014)}px 'DM Mono', monospace`;
    ctx.fillStyle = '#8D929B';
    ctx.fillText("PACED TO HOLD ATTENTION", w * 0.5, h * 0.57);
  }

  /* 04 — Explainer / Long-Form: Information Hierarchy & Motion Infographics */
  renderExplainerTheme(ctx, w, h) {
    const t = this.currentTime;
    ctx.fillStyle = '#060813';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = 0; x < w; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    const cx = w * 0.5;
    const cy = h * 0.45;
    const radius = Math.min(w, h) * 0.22;

    ctx.strokeStyle = 'rgba(74, 90, 140, 0.7)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2 * ((t * 0.15) % 1));
    ctx.stroke();

    for (let i = 0; i < 4; i++) {
      const angle = (t * 0.5) + (i * Math.PI * 0.5);
      const nx = cx + Math.cos(angle) * radius;
      const ny = cy + Math.sin(angle) * radius;

      ctx.fillStyle = '#F2F3F5';
      ctx.beginPath();
      ctx.arc(nx, ny, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(nx, ny);
      ctx.stroke();
    }

    ctx.font = `600 ${Math.floor(w * 0.032)}px 'Inter', sans-serif`;
    ctx.fillStyle = '#F2F3F5';
    ctx.textAlign = 'center';
    ctx.fillText("VISUAL EXPLANATION", cx, cy + 8);
  }

  /* 04 — Long-Form / YouTube: Podcasts (conversation pacing on NLE tracks) */
  renderPodcastTheme(ctx, w, h) {
    const t = this.currentTime;
    ctx.fillStyle = '#050711';
    ctx.fillRect(0, 0, w, h);

    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#0E163D');
    grad.addColorStop(0.5, '#070A18');
    grad.addColorStop(1, '#03050B');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.5 - 20, h * 0.5);
    ctx.lineTo(w * 0.5 + 20, h * 0.5);
    ctx.moveTo(w * 0.5, h * 0.5 - 20);
    ctx.lineTo(w * 0.5, h * 0.5 + 20);
    ctx.stroke();

    ctx.font = `500 ${Math.floor(w * 0.038)}px 'Inter', sans-serif`;
    ctx.fillStyle = '#F2F3F5';
    ctx.textAlign = 'center';
    ctx.fillText("IN CONVERSATION", w * 0.5, h * 0.38);

    ctx.font = `400 ${Math.floor(w * 0.015)}px 'DM Mono', monospace`;
    ctx.fillStyle = '#8D929B';
    ctx.fillText("PACING · RHYTHM · VISUAL DETAIL", w * 0.5, h * 0.46);

    this.drawNLETracks(ctx, w * 0.2, h * 0.6, w * 0.6, h * 0.16, t);
  }

  /* 07 — Short-Form / Social: 9:16 Vertical Apple-Inspired Reel */
  renderShortformTheme(ctx, w, h) {
    const t = this.currentTime;
    ctx.fillStyle = '#050711';
    ctx.fillRect(0, 0, w, h);

    const progress = (t * 1.5) % 3;
    const words = ["PRECISION", "PACING", "IMPACT"];
    const idx = Math.floor(progress);

    ctx.font = `700 ${Math.floor(w * 0.08)}px 'Inter', sans-serif`;
    ctx.fillStyle = '#F2F3F5';
    ctx.textAlign = 'center';
    ctx.fillText(words[idx], w * 0.5, h * 0.45);

    ctx.strokeStyle = 'rgba(74, 90, 140, 0.8)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.6, 50 + Math.sin(t * 8) * 15, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = `500 ${Math.floor(w * 0.035)}px 'DM Mono', monospace`;
    ctx.fillStyle = '#8D929B';
    ctx.fillText("9:16 VERTICAL CUT", w * 0.5, h * 0.72);
  }

  drawAudioWave(ctx, x, y, width, height, t) {
    const bars = 36;
    const barWidth = width / (bars * 1.5);
    const spacing = barWidth * 0.5;

    for (let i = 0; i < bars; i++) {
      const barH = (Math.sin((i * 0.4) + (t * 6)) * 0.5 + 0.5) * height;
      const bx = x + i * (barWidth + spacing);
      const by = y + (height - barH) * 0.5;

      ctx.fillStyle = i % 4 === 0 ? '#4A5A8C' : 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(bx, by, barWidth, barH);
    }
  }

  drawNLETracks(ctx, x, y, width, height, t) {
    const trackH = height / 3;
    const colors = ['#0E163D', 'rgba(74, 90, 140, 0.5)', 'rgba(255, 255, 255, 0.15)'];

    for (let i = 0; i < 3; i++) {
      const ty = y + i * trackH;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.fillRect(x, ty, width, trackH - 2);

      const clipW = (width * 0.4) + Math.sin(t + i) * 30;
      const clipX = x + ((t * 40 + i * 80) % (width - clipW));
      ctx.fillStyle = colors[i];
      ctx.fillRect(clipX, ty + 1, clipW, trackH - 4);
    }
  }

  renderCinematicOverlay(ctx, w, h) {
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.45, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  destroy() {
    this.pause();
  }
}
