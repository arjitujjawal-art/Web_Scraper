/**
 * Signal Atlas — Main Orchestrator (About Page & Hero)
 */

import { AboutView } from './AboutView.js';

class App {
  constructor() {
    this.aboutView = null;
    this.init();
  }

  init() {
    try {
      window.addEventListener('error', (e) => {
        console.error("Signal Atlas Runtime Exception:", e);
      });

      // Mount About Section
      const aboutMount = document.getElementById('about-section-mount');
      if (aboutMount) {
        this.aboutView = new AboutView('about-section-mount');
      }

      // Hero Web Canvas Animation
      this.initHeroCanvas();

      // Custom Cursor
      this.initCustomCursor();

      // Navigation & ScrollSpy
      this.initNavigation();
      this.initScrollSpy();

    } catch (err) {
      console.error("App Initialization Error:", err);
    }
  }

  initHeroCanvas() {
    const canvas = document.getElementById('hero-web-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];

    const resize = () => {
      width = canvas.width = canvas.parentElement.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement.clientHeight || window.innerHeight;
      createParticles();
    };

    const createParticles = () => {
      particles = [];
      const numParticles = Math.floor((width * height) / 12000);
      for (let i = 0; i < numParticles; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
          radius: Math.random() * 2 + 1
        });
      }
    };

    window.addEventListener('resize', resize);
    resize();

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(227, 38, 46, 0.6)';
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(227, 38, 46, ${0.35 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(animate);
    };

    animate();
  }

  initCustomCursor() {
    const cursor = document.getElementById('custom-cursor');
    if (!cursor) return;

    window.addEventListener('mousemove', (e) => {
      cursor.style.left = `${e.clientX}px`;
      cursor.style.top = `${e.clientY}px`;
    });
  }

  initNavigation() {
    const targets = document.querySelectorAll('[data-target]');
    targets.forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = el.getAttribute('data-target');
        this.scrollToSection(targetId);
      });
    });
  }

  scrollToSection(sectionId) {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  initScrollSpy() {
    const sections = ['scene-01', 'scene-02'];
    const navItems = document.querySelectorAll('.nav-link-item');
    const dots = document.querySelectorAll('.indicator-dot');

    const updateActiveState = (activeId) => {
      navItems.forEach(item => {
        if (item.getAttribute('data-target') === activeId) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });

      dots.forEach(dot => {
        if (dot.getAttribute('data-target') === activeId) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          updateActiveState(entry.target.id);
        }
      });
    }, { threshold: 0.3 });

    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
