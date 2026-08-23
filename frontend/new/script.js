/**
 * JOB ATLAS — SCROLL CHOREOGRAPHY & PER-ATOM MOTION ENGINE
 */

document.addEventListener('DOMContentLoaded', () => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  initWordSplitting();
  initWordmarkFit();
  initIntersectionObserver();

  if (!prefersReducedMotion) {
    initScrollChoreography();
  } else {
    document.querySelectorAll('.comp-row').forEach(row => row.classList.add('is-active'));
  }
});

function initWordSplitting() {
  const splitTargets = document.querySelectorAll('.split-words');

  splitTargets.forEach(target => {
    if (target.getAttribute('data-split') === 'true') return;

    const words = target.textContent.trim().split(/\s+/);
    target.innerHTML = '';

    words.forEach((word, index) => {
      const span = document.createElement('span');
      span.className = 'word-span';
      span.textContent = word + (index < words.length - 1 ? '\u00A0' : '');
      span.style.setProperty('--word-i', index);
      target.appendChild(span);
    });

    target.setAttribute('data-split', 'true');
  });
}

function initWordmarkFit() {
  const wordmark = document.getElementById('wordmark');
  if (wordmark) {
    const text = wordmark.textContent.trim();
    wordmark.style.setProperty('--char-count', text.length);
  }
}

function initIntersectionObserver() {
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.12
  };

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        obs.unobserve(entry.target);
      }
    });
  }, observerOptions);

  const revealItems = document.querySelectorAll('[data-rev], .split-words');
  revealItems.forEach(item => observer.observe(item));
}

function initScrollChoreography() {
  const heroStage = document.getElementById('hero-stage');
  const stripStage = document.getElementById('emergence');
  const notesStage = document.getElementById('copilot');
  const compRows = document.querySelectorAll('.comp-row');

  let currentActiveRow = -1;
  let ticking = false;

  function calculateProgress(element) {
    if (!element) return 0;
    const rect = element.getBoundingClientRect();
    const totalScrollableHeight = rect.height - window.innerHeight;
    if (totalScrollableHeight <= 0) return 0;
    
    const progress = -rect.top / totalScrollableHeight;
    return Math.min(1, Math.max(0, progress));
  }

  function updateScrollState() {
    if (heroStage) {
      const heroP = calculateProgress(heroStage);
      heroStage.style.setProperty('--hero-p', heroP.toFixed(4));
    }

    if (stripStage) {
      const stripP = calculateProgress(stripStage);
      stripStage.style.setProperty('--strip-p', stripP.toFixed(4));
    }

    if (notesStage) {
      const notesP = calculateProgress(notesStage);
      notesStage.style.setProperty('--notes-p', notesP.toFixed(4));

      const targetActiveRow = Math.min(3, Math.floor(notesP * 4));

      if (targetActiveRow !== currentActiveRow) {
        currentActiveRow = targetActiveRow;
        compRows.forEach((row, index) => {
          if (index <= currentActiveRow) {
            row.classList.add('is-active');
          } else {
            row.classList.remove('is-active');
          }
        });
      }
    }

    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(updateScrollState);
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  updateScrollState();
}
