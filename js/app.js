/**
 * MAIN APP INITIALIZER — GAURAV PORTFOLIO
 */

import { VideoExhibitionEngine } from './video-engine.js';
import { TimelineController } from './timeline-controller.js';
import { EditorialCursor } from './cursor.js';
import { HeroTypewriter, HeroBackgroundVideo } from './hero.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Core Systems
  const heroVideo = new HeroBackgroundVideo();
  const heroTypewriter = new HeroTypewriter();
  const videoEngine = new VideoExhibitionEngine();
  const timelineController = new TimelineController();
  const cursor = new EditorialCursor();

  // Hero first; then buffer the rest of the page's videos in the background.
  // (Capped at 2.5s so a slow hero never holds everything else back.)
  Promise.race([heroVideo.ready, new Promise(r => setTimeout(r, 2500))])
    .then(() => videoEngine.beginPreloading());

  // Smooth Anchor Navigation
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  // Mobile Role Interaction (Tap to toggle between roles)
  const roleInteractives = document.querySelectorAll('.role-interactive');
  roleInteractives.forEach(role => {
    role.addEventListener('click', () => {
      role.classList.toggle('is-switched');
    });
  });

  // Global Keyboard Navigation (Space = toggle current video in view, Esc = close modal)
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target === document.body) {
      e.preventDefault();
      // Find video closest to center of viewport
      const frames = Array.from(document.querySelectorAll('.video-exhibition-frame'));
      const mid = window.innerHeight / 2;
      let closestFrame = null;
      let minDistance = Infinity;

      frames.forEach(frame => {
        const rect = frame.getBoundingClientRect();
        const dist = Math.abs(rect.top + rect.height / 2 - mid);
        if (dist < minDistance && rect.top < window.innerHeight && rect.bottom > 0) {
          minDistance = dist;
          closestFrame = frame;
        }
      });

      if (closestFrame && closestFrame._playerInstance) {
        closestFrame._playerInstance.togglePlay();
      }
    }
  });

  console.log('✦ Gaurav Portfolio Engine initialized.');
});
