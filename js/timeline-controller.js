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
    
    this.initScrollListener();
    this.initIntersectionObserver();
  }

  initScrollListener() {
    window.addEventListener('scroll', () => {
      this.handleScroll();
    }, { passive: true });
    
    this.handleScroll(); // Initial run
  }

  handleScroll() {
    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;

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

    // Subtle atmospheric backdrop parallax (20-30px over 1000px scroll)
    if (this.backdrop) {
      const parallaxY = scrollY * 0.025;
      this.backdrop.style.setProperty('--scroll-parallax-y', `${parallaxY.toFixed(1)}px`);
    }

    // Update individual section playheads
    this.updateSectionPlayheads();
  }

  updateSectionPlayheads() {
    const windowH = window.innerHeight;

    this.sections.forEach(sec => {
      const rect = sec.getBoundingClientRect();
      const scrubberFill = sec.querySelector('.timeline-scrubber-fill');
      const scrubberHead = sec.querySelector('.timeline-scrubber-head');

      if (!scrubberFill || !scrubberHead) return;

      // Calculate progress through section (0% to 100%)
      const secTop = rect.top;
      const secH = rect.height;
      
      // If section is entering screen
      if (secTop < windowH && (secTop + secH) > 0) {
        const progress = Math.max(0, Math.min(100, ((windowH - secTop) / (windowH + secH)) * 100));
        scrubberFill.style.width = `${progress}%`;
        scrubberHead.style.left = `${progress}%`;
      }
    });
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
