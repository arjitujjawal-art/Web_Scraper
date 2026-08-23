# Signal Atlas - Cinematic UI

This is a pure HTML/CSS/JS frontend application. It contains no build steps, bundlers, or frameworks like React/Vue.

## Architecture
- **index.html**: Structure and layout. Uses Tailwind CSS via CDN.
- **styles.css**: Custom CSS overrides, magnetic cursor physics, and noise overlays.
- **main.js**: DOM manipulation, Lenis smooth scrolling, and GSAP timeline choreographies for the "Healing Console" terminal.
- **globeEngine.js**: Three.js WebGL code that renders the morphing cinematic background globe.

## Libraries Used (Loaded via CDN in index.html)
- Tailwind CSS
- Three.js
- GSAP & ScrollTrigger
- Lenis (Smooth Scrolling)

## How to Run
Simply serve this directory with a local HTTP server. For example:
`python -m http.server 8080`
Then open `http://localhost:8080` in your browser.
