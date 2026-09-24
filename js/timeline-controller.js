/**
 * TIMELINE CONTROLLER — GAURAV PORTFOLIO
 * Signature NLE Playhead Motif, Sticky Nav Progress & Section Timecode tracking
 */

export class TimelineController {
  constructor() {
    this.sections = document.querySelectorAll('section[id]');
    this.navProgressBar = document.getElementById('nav-timeline-progress');
    this.siteNav = document.getElementById('site-nav');
    this.navLinks = document.querySelectorAll('.nav-link');
    this.backdrop = document.getElementById('cinematic-backdrop');
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.initScrollListener();
    this.initIntersectionObserver();
  }

  initScrollListener() {
    // Coalesce scroll events into one update per animation frame
    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        this.handleScroll();
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    this.handleScroll(); // Initial run
  }

  handleScroll() {
    // Read everything first, then write (avoids forced layout on every scroll frame)
    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;
    const playheads = this.measureSectionPlayheads();

    // Update Nav bar appearance
    if (this.siteNav) {
      if (scrollY > 50) {
        this.siteNav.classList.add('is-scrolled');
      } else {
        this.siteNav.classList.remove('is-scrolled');
      }
    }

    // Update Nav Progress Bar
    if (this.navProgressBar) {
      this.navProgressBar.style.width = `${scrollPercent.toFixed(1)}%`;
    }

    // Subtle atmospheric backdrop parallax (20-30px over 1000px scroll) — compositor-only transform
    if (this.backdrop && !this.reducedMotion) {
      const parallaxY = scrollY * 0.025;
      this.backdrop.style.transform = `translate3d(0, ${parallaxY.toFixed(1)}px, 0)`;
    }

    // Update individual section playheads
    playheads.forEach(({ fill, head, progress }) => {
      fill.style.width = `${progress}%`;
      head.style.left = `${progress}%`;
    });
  }

  measureSectionPlayheads() {
    const windowH = window.innerHeight;
    const updates = [];

    this.sections.forEach(sec => {
      const scrubberFill = sec._scrubFill || (sec._scrubFill = sec.querySelector('.timeline-scrubber-fill'));
      const scrubberHead = sec._scrubHead || (sec._scrubHead = sec.querySelector('.timeline-scrubber-head'));
      if (!scrubberFill || !scrubberHead) return;

      // Calculate progress through section (0% to 100%)
      const rect = sec.getBoundingClientRect();
      const secTop = rect.top;
      const secH = rect.height;

      // If section is entering screen
      if (secTop < windowH && (secTop + secH) > 0) {
        const progress = Math.max(0, Math.min(100, ((windowH - secTop) / (windowH + secH)) * 100));
        updates.push({ fill: scrubberFill, head: scrubberHead, progress });
      }
    });

    return updates;
  }

  initIntersectionObserver() {
    // Reveal animations on scroll
    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));

    // Nav active link tracking
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          this.highlightNavLink(id);
        }
      });
    }, {
      threshold: 0.3
    });

    this.sections.forEach(sec => navObserver.observe(sec));
  }

  highlightNavLink(activeId) {
    let targetCategory = 'work';
    if (activeId === 'about') targetCategory = 'about';
    if (activeId === 'contact') targetCategory = 'contact';

    this.navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === `#${targetCategory}` || (targetCategory === 'work' && href === '#selected-work')) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }
}
