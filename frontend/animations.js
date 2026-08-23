document.addEventListener("DOMContentLoaded", () => {
  gsap.registerPlugin(ScrollTrigger);

  // 1. Staggered reveal for elements marked with .animate-on-scroll
  gsap.utils.toArray(".animate-on-scroll").forEach(el => {
    // Determine if it's text or an image container
    let yOffset = 50;
    
    gsap.from(el, {
      scrollTrigger: {
        trigger: el,
        start: "top 85%", // Trigger when top of element hits 85% down viewport
        toggleActions: "play none none reverse"
      },
      y: yOffset,
      opacity: 0,
      duration: 1.2,
      ease: "power3.out"
    });
  });

  // 2. Heavy Parallax Images for "crazy UI"
  gsap.utils.toArray(".parallax-img").forEach(img => {
    gsap.to(img, {
      yPercent: 25,
      ease: "none",
      scrollTrigger: {
        trigger: img.parentElement,
        start: "top bottom",
        end: "bottom top",
        scrub: 1 // smooth scrubbing
      }
    });
  });

  // 3. Zoom effect on map container when it appears
  const mapMount = document.getElementById("map-dashboard-mount");
  if(mapMount) {
    gsap.from(mapMount, {
      scrollTrigger: {
        trigger: "#map-section",
        start: "top 75%",
        toggleActions: "play none none reverse"
      },
      scale: 0.9,
      opacity: 0,
      rotationX: 10,
      y: 50,
      duration: 1.5,
      ease: "expo.out"
    });
  }

  // 4. Parallax overlap for the text overlapping image in stage 2
  gsap.to("#stage-2 h2", {
    scrollTrigger: {
      trigger: "#stage-2",
      start: "top center",
      end: "bottom top",
      scrub: 1
    },
    x: 50 // Slight shift right on scroll for depth
  });
});


// Interactive Telemetry Canvas
function initTelemetryNetwork() {
  const canvas = document.getElementById('telemetryCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width, height;
  let particles = [];
  let mouse = { x: null, y: null, radius: 100 };

  function resize() {
    width = canvas.width = canvas.parentElement.offsetWidth;
    height = canvas.height = canvas.parentElement.offsetHeight;
    initParticles();
  }

  function initParticles() {
    particles = [];
    const numParticles = Math.floor((width * height) / 10000);
    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        baseSize: Math.random() * 2 + 1,
        color: Math.random() > 0.5 ? '#FFC700' : '#000000'
      });
    }
  }

  window.addEventListener('resize', resize);
  
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  
  canvas.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;
  });

  resize();

  function draw() {
    ctx.clearRect(0, 0, width, height);
    
    for (let i = 0; i < particles.length; i++) {
      let p = particles[i];
      
      p.x += p.vx;
      p.y += p.vy;
      
      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;

      // Mouse Attraction
      if (mouse.x != null) {
        let dx = mouse.x - p.x;
        let dy = mouse.y - p.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius) {
          const forceDirectionX = dx / dist;
          const forceDirectionY = dy / dist;
          const force = (mouse.radius - dist) / mouse.radius;
          const attraction = force * 0.1;
          p.x += forceDirectionX * attraction;
          p.y += forceDirectionY * attraction;
        }
      }

      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.baseSize, 0, Math.PI * 2);
      ctx.fill();
      
      for (let j = i + 1; j < particles.length; j++) {
        let p2 = particles[j];
        let dx2 = p.x - p2.x;
        let dy2 = p.y - p2.y;
        let dist2 = Math.sqrt(dx2*dx2 + dy2*dy2);
        
        let connectRadius = 120;
        if (dist2 < connectRadius) {
          ctx.beginPath();
          ctx.strokeStyle = p.color === p2.color ? p.color : '#31353C';
          ctx.globalAlpha = 1 - (dist2 / connectRadius);
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

// Ensure it initializes
setTimeout(() => {
  initTelemetryNetwork();
}, 500);
