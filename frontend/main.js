import { initGlobe } from './globeEngine.js';

document.addEventListener('DOMContentLoaded', () => {
  
  // 1. Lenis Smooth Scroll Setup
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: 'vertical',
    gestureDirection: 'vertical',
    smooth: true,
    mouseMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // Integrate Lenis with GSAP ScrollTrigger
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time)=>{ lenis.raf(time * 1000) });
  gsap.ticker.lagSmoothing(0);

  // 2. Custom Cursor
  const cursorDot = document.getElementById('cursor-dot');
  const cursorOutline = document.getElementById('cursor-outline');
  let cursorX = window.innerWidth / 2;
  let cursorY = window.innerHeight / 2;
  let outlineX = cursorX;
  let outlineY = cursorY;

  window.addEventListener('mousemove', (e) => {
    cursorX = e.clientX;
    cursorY = e.clientY;
    cursorDot.style.left = `${cursorX}px`;
    cursorDot.style.top = `${cursorY}px`;
  });

  // Smooth follow for outline
  gsap.ticker.add(() => {
    outlineX += (cursorX - outlineX) * 0.15;
    outlineY += (cursorY - outlineY) * 0.15;
    cursorOutline.style.left = `${outlineX}px`;
    cursorOutline.style.top = `${outlineY}px`;
  });

  const hoverElements = document.querySelectorAll('a, button, .hover-magnetic');
  hoverElements.forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('hovering'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('hovering'));
  });

  // 3. Live Clock
  const clockEl = document.getElementById('clock-updated');
  if(clockEl) {
    setInterval(() => {
      const now = new Date();
      clockEl.textContent = 'UPDATED ' + now.toLocaleTimeString('en-US', { hour12: false });
    }, 1000);
  }

  // 4. GSAP Initial Load Animations
  const tl = gsap.timeline({ delay: 0.2 });
  
  tl.fromTo('.reveal-line', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' })
    .to('.reveal-text', { y: '0%', opacity: 1, duration: 1.2, stagger: 0.1, ease: 'expo.out' }, "-=0.2")
    .fromTo('.reveal-fade', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1, stagger: 0.1, ease: 'power2.out' }, "-=0.8");

  // Counter animation on scroll
  const countElements = document.querySelectorAll('.count-up');
  countElements.forEach((el) => {
    const target = parseFloat(el.getAttribute('data-target'));
    const decimals = parseInt(el.getAttribute('data-decimals') || '2');
    
    ScrollTrigger.create({
      trigger: el,
      start: "top 90%",
      once: true,
      onEnter: () => {
        gsap.to(el, {
          innerHTML: target,
          duration: 1.5,
          ease: 'power3.out',
          snap: { innerHTML: Math.pow(10, -decimals) },
          onUpdate: function() {
            if(decimals > 0) el.innerHTML = Number(this.targets()[0].innerHTML).toFixed(decimals);
            else el.innerHTML = Math.round(this.targets()[0].innerHTML);
          }
        });
      }
    });
  });

  // Fade Up blocks
  gsap.utils.toArray('.reveal-up').forEach(block => {
    gsap.fromTo(block, 
      { opacity: 0, y: 40 },
      { 
        opacity: 1, y: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: block, start: "top 85%" }
      }
    );
  });

  // Nav Dot Update
  const sections = document.querySelectorAll('section');
  const navDots = document.querySelectorAll('.nav-dot');
  sections.forEach((sec, i) => {
    ScrollTrigger.create({
      trigger: sec,
      start: "top center",
      end: "bottom center",
      onToggle: self => {
        if(self.isActive) {
          navDots.forEach(d => d.classList.remove('active'));
          navDots[i].classList.add('active');
        }
      }
    });
  });

  // 5. Initialize WebGL
  initGlobe('webgl-container');

  // 6. Pipeline Choreography
  initPipelineChoreography();
});

function initPipelineChoreography() {
  const btnInvestigate = document.getElementById('btn-investigate');
  const consoleBody = document.getElementById('console-body');
  const diffProposed = document.getElementById('proposed-fix');
  const btnHeal = document.getElementById('btn-heal');
  const diffFlash = document.getElementById('diff-flash');
  
  const consoleLogs = [
    "[SYS] Initializing diagnostic run on PRD-DB-01...",
    "[SYS] Analyzing payload drift in Node PRD-DB-01.",
    "[WARN] Expected array[float] for coordinates.",
    "[WARN] Received string: '18.5204, 73.8567'.",
    "[ACT] Initiating type-safe AST coercion patch...",
    "[SUCCESS] Patch #PTCH-44109 synthesized.",
    "> Awaiting user remediation approval."
  ];

  let tl = gsap.timeline({ paused: true });

  // Distortion flash on card
  tl.to('#schema-flash', { opacity: 1, duration: 0.1 })
    .to('#schema-flash', { opacity: 0, duration: 0.2 })
    .to('#schema-card', { x: -2, y: 1, duration: 0.05, yoyo: true, repeat: 3 }, "-=0.3");

  let timeOffset = 0.4;
  const cursorHtml = '<span class="cursor-blink">_</span>';
  
  consoleLogs.forEach((log) => {
    const chars = log.split('');
    const lineId = 'line-' + Math.random().toString(36).substr(2, 9);
    
    tl.call(() => {
      const p = document.createElement('div');
      p.id = lineId;
      p.className = 'mb-1 ' + (log.startsWith('[WARN]') ? 'text-warning' : (log.startsWith('[SUCCESS]') ? 'text-success' : ''));
      consoleBody.appendChild(p);
      consoleBody.scrollTop = consoleBody.scrollHeight;
    }, null, timeOffset);

    chars.forEach((char, idx) => {
      tl.call(() => {
        const line = document.getElementById(lineId);
        if (line) {
          line.innerHTML = log.substring(0, idx + 1) + (idx === chars.length - 1 ? cursorHtml : '█');
          if (idx === 0) {
            const prevCursor = consoleBody.querySelector('.cursor-blink');
            if (prevCursor) prevCursor.remove();
          }
        }
      }, null, timeOffset + (idx * 0.02)); // Fast typing
    });
    timeOffset += (chars.length * 0.02) + 0.15;
  });

  // Diff flash
  tl.to(diffFlash, { opacity: 1, duration: 0.1, backgroundColor: '#FF3366' }, timeOffset)
    .call(() => diffFlash.style.backgroundColor = '#00E5FF', null, timeOffset + 0.1)
    .to(diffFlash, { opacity: 0, duration: 0.2 }, timeOffset + 0.1)
    .to(diffProposed, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, timeOffset + 0.1)
    .call(() => {
      btnHeal.classList.remove('bg-border', 'text-txMuted', 'cursor-not-allowed');
      btnHeal.classList.add('bg-accent', 'text-tx', 'hover-magnetic', 'cursor-none');
      btnHeal.disabled = false;
    }, null, timeOffset + 0.4);

  if (btnInvestigate) {
    btnInvestigate.addEventListener('click', () => {
      btnInvestigate.style.opacity = '0.5';
      consoleBody.innerHTML = '';
      tl.play();
    });
  }

  if (btnHeal) {
    btnHeal.addEventListener('click', () => {
      if(btnHeal.disabled) return;
      btnHeal.disabled = true;
      btnHeal.innerHTML = 'HEALING...';
      
      const progressContainer = document.getElementById('heal-progress');
      const progressBar = document.getElementById('heal-bar');
      const checkmark = document.getElementById('heal-check');
      
      gsap.to(progressContainer, { opacity: 1, duration: 0.2 });
      gsap.to(progressBar, { width: '100%', duration: 1, ease: 'power2.inOut', delay: 0.2 });
      gsap.to(checkmark, { scale: 1, duration: 0.4, ease: 'back.out(1.7)', delay: 1.2 });
      
      setTimeout(() => {
        document.getElementById('schema-status').textContent = 'HEALTHY';
        document.getElementById('schema-status').className = 'font-display text-4xl text-success mb-1';
        btnHeal.innerHTML = 'SYSTEM HEALTHY';
        btnHeal.classList.remove('bg-accent');
        btnHeal.classList.add('bg-success');
      }, 1200);
    });
  }
}
