export function initGlobe(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 10;
  camera.position.y = 2;
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // Run Rob Run Style Blob/Globe
  const geometry = new THREE.IcosahedronGeometry(3, 128); // High detail for displacement
  
  // Custom Shader Material for Liquid/Tech morph
  const shaderMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMorph: { value: 0.0 }, // 0 = globe, 1 = chaotic goo
      uColor1: { value: new THREE.Color('#FF3366') }, // Accent
      uColor2: { value: new THREE.Color('#00E5FF') }, // Success
      uColor3: { value: new THREE.Color('#0A0A0A') }, // Surface
    },
    vertexShader: `
      uniform float uTime;
      uniform float uMorph;
      varying vec2 vUv;
      varying float vNoise;

      // 3D Simplex Noise
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
      float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute( permute( permute(
                   i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                 + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                 + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
      }

      void main() {
        vUv = uv;
        
        // Base low frequency noise for organic shape
        float n = snoise(position * 0.5 + uTime * 0.2);
        
        // High frequency noise for tech glitch
        float glitch = snoise(position * 5.0 - uTime * 1.0);
        
        vNoise = n;
        
        // Displace position
        vec3 newPosition = position + normal * n * uMorph * 1.5;
        // Add glitch
        newPosition += normal * glitch * (uMorph * 0.2);
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform vec3 uColor3;
      varying vec2 vUv;
      varying float vNoise;

      void main() {
        // Create grid/wireframe illusion natively in shader
        vec2 grid = abs(fract(vUv * 40.0 - 0.5) - 0.5) / fwidth(vUv * 40.0);
        float line = min(grid.x, grid.y);
        float gridPattern = 1.0 - min(line, 1.0);
        
        vec3 colorMix = mix(uColor3, uColor1, vNoise * 0.5 + 0.5);
        colorMix = mix(colorMix, uColor2, sin(vUv.y * 10.0 + uTime) * 0.5 + 0.5);
        
        // Add Grid glow
        vec3 finalColor = colorMix + (vec3(1.0) * gridPattern * 0.2);
        
        gl_FragColor = vec4(finalColor, 0.4 + gridPattern * 0.6);
      }
    `,
    wireframe: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const blob = new THREE.Mesh(geometry, shaderMaterial);
  scene.add(blob);

  // Adding ambient particles (Data streams)
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(500 * 3);
  for(let i=0; i<1500; i++) {
    pPos[i] = (Math.random() - 0.5) * 20;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({
    color: 0x00E5FF,
    size: 0.05,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending
  });
  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  let time = 0;
  function animate() {
    requestAnimationFrame(animate);
    time += 0.01;
    shaderMaterial.uniforms.uTime.value = time;
    blob.rotation.y += 0.002;
    blob.rotation.x += 0.001;
    
    particles.rotation.y -= 0.001;
    const positions = particles.geometry.attributes.position.array;
    for(let i=1; i<1500; i+=3) {
      positions[i] -= 0.01;
      if(positions[i] < -10) positions[i] = 10;
    }
    particles.geometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  }
  animate();

  // Morph triggers
  window.triggerGlobeDistortion = function() {
    gsap.to(shaderMaterial.uniforms.uMorph, {
      value: 1.0,
      duration: 0.5,
      ease: "power2.out",
      onComplete: () => {
        gsap.to(shaderMaterial.uniforms.uMorph, {
          value: 0.0,
          duration: 1.2,
          ease: "elastic.out(1, 0.3)" // Snap back to structure
        });
      }
    });
  };

  // Scroll triggers for camera
  ScrollTrigger.create({
    trigger: '#convergence',
    start: "top bottom",
    end: "bottom top",
    onUpdate: (self) => {
      // Parallax rotation
      gsap.to(blob.rotation, { z: self.progress * Math.PI, duration: 1, ease: 'power2.out', overwrite: 'auto' });
      // Move camera slightly
      gsap.to(camera.position, { y: 2 - self.progress * 4, duration: 1, ease: 'power2.out', overwrite: 'auto' });
    }
  });

  // Target trigger
  const sightingPopup = document.getElementById('sighting-popup');
  if(sightingPopup) {
    ScrollTrigger.create({
      trigger: '#convergence',
      start: "top center",
      onEnter: () => {
        setTimeout(() => {
          window.triggerGlobeDistortion();
          gsap.fromTo('#popup-flash', { scaleX: 0 }, { scaleX: 1, duration: 0.3, transformOrigin: 'left', ease: 'power2.out' });
        }, 800);
      }
    });
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
