/**
 * JOB ATLAS — SCROLL CHOREOGRAPHY & PER-ATOM MOTION ENGINE
 */

document.addEventListener('DOMContentLoaded', () => {
  // Check reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. DYNAMIC WORD-SPLITTING UTILITY FOR STAGGERED TEXT REVEALS
  initWordSplitting();

  // 2. POSTER WORDMARK DYNAMIC CHARACTER ADVANCE FIT
  initWordmarkFit();

  // 3. INTERSECTION OBSERVER FOR REVEAL ANIMATIONS
  initIntersectionObserver();

  // 4. rAF-THROTTLED SCROLL STAGE CHOREOGRAPHY
  if (!prefersReducedMotion) {
    initScrollChoreography();
  } else {
    // If reduced motion is preferred, mark all rows active and all reveals visible
    document.querySelectorAll('.comp-row').forEach(row => row.classList.add('is-active'));
  }
});

/**
 * Splits headlines and editorial copy into per-word inline-block spans
 * with 38ms incremental CSS custom properties (--word-i).
 */
function initWordSplitting() {
  const splitTargets = document.querySelectorAll('.split-words');

  splitTargets.forEach(target => {
    // Skip if already processed
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

/**
 * Sets --char-count on poster wordmark element to calculate exact font-size advance.
 */
function initWordmarkFit() {
  const wordmark = document.getElementById('wordmark');
  if (wordmark) {
    const text = wordmark.textContent.trim();
    wordmark.style.setProperty('--char-count', text.length);
  }
}

/**
 * Intersection Observer triggers reveal animations when elements scroll into view.
 */
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
        // Unobserve after initial reveal for performance
        obs.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe items with data-rev and split-words
  const revealItems = document.querySelectorAll('[data-rev], .split-words');
  revealItems.forEach(item => observer.observe(item));
}

/**
 * Single rAF-throttled scroll handler updating CSS custom properties across pinned stages.
 */
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
    
    // Calculate progress 0.0 -> 1.0 while section scrolls past sticky window
    const progress = -rect.top / totalScrollableHeight;
    return Math.min(1, Math.max(0, progress));
  }

  function updateScrollState() {
    // 1. Stage 1 (Hero Pin - 300svh)
    if (heroStage) {
      const heroP = calculateProgress(heroStage);
      heroStage.style.setProperty('--hero-p', heroP.toFixed(4));
    }

    // 2. Stage 2 (Bottom-up Strip Pin - 320svh)
    if (stripStage) {
      const stripP = calculateProgress(stripStage);
      stripStage.style.setProperty('--strip-p', stripP.toFixed(4));
    }

    // 3. Stage 3 (Composition Rows Pin - 360svh)
    if (notesStage) {
      const notesP = calculateProgress(notesStage);
      notesStage.style.setProperty('--notes-p', notesP.toFixed(4));

      // Calculate cumulative row lighting floor(p * 4)
      const targetActiveRow = Math.min(3, Math.floor(notesP * 4));

      // Only mutate DOM when row state index changes!
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

  // Initial call on load
  updateScrollState();
}
