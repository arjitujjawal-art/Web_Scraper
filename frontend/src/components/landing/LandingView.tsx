import React, { useEffect, useRef, useState } from 'react';
import { Rocket, Sparkles, Globe, Compass } from 'lucide-react';

interface LandingViewProps {
  onBegin?: () => void;
  onLaunch: (city?: 'delhi' | 'sf') => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onBegin, onLaunch }) => {
  const [animState, setAnimState] = useState<'idle' | 'focus' | 'lock' | 'expand'>('idle');
  const [lockedHub, setLockedHub] = useState<'delhi' | 'sf' | null>(null);
  const [cardTransform, setCardTransform] = useState<string>('');

  const globeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const starfieldCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pinSfRef = useRef<HTMLButtonElement | null>(null);
  const pinDelhiRef = useRef<HTMLButtonElement | null>(null);
  const appCardRef = useRef<HTMLDivElement | null>(null);
  const heroContentRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  const handleStart = (city?: 'delhi' | 'sf') => {
    if (animState !== 'idle') return;

    if (!city && onBegin) {
      onBegin();
    }

    if (city) setLockedHub(city);

    // Calculate delta to center the phone card smoothly in viewport
    if (appCardRef.current) {
      const rect = appCardRef.current.getBoundingClientRect();
      const cardCenterX = rect.left + rect.width / 2;
      const cardCenterY = rect.top + rect.height / 2;
      const screenCenterX = window.innerWidth / 2;
      const screenCenterY = window.innerHeight / 2;
      const deltaX = screenCenterX - cardCenterX;
      const deltaY = screenCenterY - cardCenterY;
      const availableH = window.innerHeight * 0.88;
      const targetScale = Math.max(0.95, Math.min(1.15, availableH / rect.height));

      setCardTransform(`translate(${deltaX}px, ${deltaY}px) scale(${targetScale})`);
    }

    // Step 0: Center Focus
    setAnimState('focus');

    // Step 1: Radar Lock inside phone screen + Globe Zoom (after 600ms)
    setTimeout(() => {
      setAnimState('lock');
    }, 600);

    // Step 2: Signal Wave Expansion & Card Morph (after 1250ms)
    setTimeout(() => {
      setAnimState('expand');
    }, 1250);

    // Step 3: Transition to Dashboard (after 1850ms)
    setTimeout(() => {
      onLaunch(city);
    }, 1850);
  };

  // 3D Rotating Pixel Earth Engine
  useEffect(() => {
    const canvas = globeCanvasRef.current;
    const starCanvas = starfieldCanvasRef.current;
    const pinSf = pinSfRef.current;
    const pinDelhi = pinDelhiRef.current;

    if (!canvas) return;

    const mapW = 512;
    const mapH = 256;
    const texCanvas = document.createElement('canvas');
    texCanvas.width = mapW;
    texCanvas.height = mapH;
    const texCtx = texCanvas.getContext('2d');
    if (!texCtx) return;

    // Ocean Gradient & Scanlines
    const oceanGrad = texCtx.createLinearGradient(0, 0, 0, mapH);
    oceanGrad.addColorStop(0, '#0e7490');
    oceanGrad.addColorStop(0.2, '#0891b2');
    oceanGrad.addColorStop(0.5, '#06b6d4');
    oceanGrad.addColorStop(0.8, '#0891b2');
    oceanGrad.addColorStop(1, '#0e7490');
    texCtx.fillStyle = oceanGrad;
    texCtx.fillRect(0, 0, mapW, mapH);

    texCtx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    for (let y = 0; y < mapH; y += 4) {
      texCtx.fillRect(0, y, mapW, 1);
    }

    const c = (lon: number, lat: number): [number, number] => [
      ((lon + 180) / 360) * mapW,
      ((90 - lat) / 180) * mapH,
    ];

    const drawPolygon = (coords: number[][], fillColor: string | null, strokeColor: string | null = null, lineWidth = 0) => {
      if (!coords || coords.length < 3) return;
      texCtx.beginPath();
      const [firstX, firstY] = c(coords[0][0], coords[0][1]);
      texCtx.moveTo(firstX, firstY);
      for (let i = 1; i < coords.length; i++) {
        const [x, y] = c(coords[i][0], coords[i][1]);
        texCtx.lineTo(x, y);
      }
      texCtx.closePath();
      if (strokeColor && lineWidth > 0) {
        texCtx.strokeStyle = strokeColor;
        texCtx.lineWidth = lineWidth;
        texCtx.lineJoin = 'round';
        texCtx.stroke();
      }
      if (fillColor) {
        texCtx.fillStyle = fillColor;
        texCtx.fill();
      }
    };

    // Continents Data
    const continents = [
      [[-168, 65], [-160, 71], [-130, 70], [-120, 76], [-90, 74], [-80, 62], [-65, 60], [-55, 50], [-65, 44], [-76, 35], [-80, 25], [-81, 30], [-88, 30], [-97, 26], [-97, 19], [-105, 23], [-115, 32], [-124, 40], [-125, 49], [-140, 60], [-168, 65]],
      [[-55, 60], [-40, 60], [-20, 72], [-20, 83], [-50, 83], [-55, 75], [-55, 60]],
      [[-90, 15], [-83, 10], [-77, 8], [-80, 8], [-87, 13], [-92, 16], [-90, 15]],
      [[-78, 10], [-60, 10], [-50, 0], [-35, -5], [-35, -12], [-40, -22], [-53, -33], [-65, -45], [-68, -55], [-75, -50], [-72, -40], [-70, -20], [-80, -5], [-78, 10]],
      [[-10, 36], [0, 36], [15, 38], [25, 35], [30, 42], [40, 45], [45, 60], [30, 70], [20, 70], [10, 60], [5, 50], [-5, 48], [-10, 44], [-10, 36]],
      [[5, 58], [15, 56], [30, 60], [30, 71], [15, 71], [5, 62], [5, 58]],
      [[-10, 50], [2, 50], [0, 58], [-6, 58], [-10, 50]],
      [[-17, 30], [10, 37], [32, 32], [44, 12], [51, 10], [40, -5], [35, -25], [28, -34], [18, -34], [12, -18], [9, 4], [-15, 12], [-17, 22], [-17, 30]],
      [[43, -12], [50, -14], [48, -25], [43, -25], [43, -12]],
      [[35, 30], [50, 30], [55, 25], [60, 25], [68, 24], [72, 19], [76, 8], [80, 13], [88, 22], [92, 16], [100, 5], [108, 12], [118, 22], [122, 30], [122, 40], [130, 42], [140, 45], [160, 55], [170, 65], [180, 67], [180, 75], [140, 75], [100, 75], [70, 72], [60, 60], [50, 50], [40, 40], [35, 30]],
      [[130, 32], [142, 37], [145, 45], [140, 45], [132, 35], [130, 32]],
      [[95, 5], [120, 5], [125, -8], [100, -8], [95, 5]],
      [[114, -22], [130, -12], [142, -10], [152, -25], [150, -38], [138, -38], [115, -35], [114, -22]],
    ];

    continents.forEach(poly => {
      drawPolygon(poly, null, '#67e8f9', 7);
      drawPolygon(poly, '#15803d', '#22c55e', 2);
    });

    const mountains = [
      [[-122, 48], [-115, 42], [-105, 35], [-108, 30]],
      [[-72, -10], [-70, -20], [-68, -32]],
      [[75, 33], [85, 29], [92, 28]],
    ];
    mountains.forEach(poly => {
      drawPolygon(poly, '#fbbf24', '#f59e0b', 3);
    });

    const texData = texCtx.getImageData(0, 0, mapW, mapH).data;

    // Starfield Background
    if (starCanvas) {
      const sCtx = starCanvas.getContext('2d');
      if (sCtx) {
        starCanvas.width = 300;
        starCanvas.height = 300;
        sCtx.fillStyle = 'transparent';
        sCtx.fillRect(0, 0, 300, 300);
        for (let i = 0; i < 45; i++) {
          const sx = Math.random() * 300;
          const sy = Math.random() * 300;
          const sr = Math.random() * 1.3 + 0.3;
          sCtx.fillStyle = Math.random() > 0.4 ? '#38bdf8' : '#ffffff';
          sCtx.globalAlpha = Math.random() * 0.7 + 0.3;
          sCtx.beginPath();
          sCtx.arc(sx, sy, sr, 0, Math.PI * 2);
          sCtx.fill();
        }
      }
    }

    // Raycast Sphere Render Loop
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const radius = size / 2 - 2;
    const imgData = ctx.createImageData(size, size);
    const pixels = imgData.data;

    let rotation = 0;
    const tilt = 18 * (Math.PI / 180);
    const cosTilt = Math.cos(tilt);
    const sinTilt = Math.sin(tilt);

    let animId: number;

    const render = () => {
      rotation += 0.007;

      for (let i = 0; i < pixels.length; i += 4) {
        pixels[i + 3] = 0;
      }

      for (let y = 0; y < size; y++) {
        const ny = (y - size / 2) / radius;
        if (Math.abs(ny) > 1) continue;

        for (let x = 0; x < size; x++) {
          const nx = (x - size / 2) / radius;
          const distSq = nx * nx + ny * ny;
          if (distSq > 1) continue;

          const nz = Math.sqrt(1 - distSq);
          const py = ny * cosTilt - nz * sinTilt;
          const pz = ny * sinTilt + nz * cosTilt;
          const px = nx;

          const lat = Math.asin(Math.max(-1, Math.min(1, py)));
          let lon = Math.atan2(px, pz) - rotation;
          lon = ((lon + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;

          const tx = Math.floor(((lon + Math.PI) / (2 * Math.PI)) * mapW) % mapW;
          const ty = Math.floor(((Math.PI / 2 - lat) / Math.PI) * mapH) % mapH;

          const srcIdx = (ty * mapW + tx) * 4;
          const dstIdx = (y * size + x) * 4;

          const shade = 0.55 + 0.45 * (px * 0.4 + py * -0.2 + nz * 0.9);
          pixels[dstIdx] = Math.min(255, texData[srcIdx] * shade);
          pixels[dstIdx + 1] = Math.min(255, texData[srcIdx + 1] * shade);
          pixels[dstIdx + 2] = Math.min(255, texData[srcIdx + 2] * shade);
          pixels[dstIdx + 3] = 255;
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // Project 3D City Pins
      const projectPin = (lonDeg: number, latDeg: number) => {
        const phi = latDeg * (Math.PI / 180);
        const theta = lonDeg * (Math.PI / 180) + rotation;

        const x3 = Math.cos(phi) * Math.sin(theta);
        const y3 = Math.sin(phi);
        const z3 = Math.cos(phi) * Math.cos(theta);

        const py = y3 * cosTilt + z3 * sinTilt;
        const pz = -y3 * sinTilt + z3 * cosTilt;
        const px = x3;

        const isVisible = pz > 0.12;
        const screenX = (px * radius) + (size / 2);
        const screenY = (size / 2) - (py * radius);

        return { x: screenX, y: screenY, isVisible, pz };
      };

      const sfProj = projectPin(-122.4194, 37.7749);
      if (pinSf) {
        if (sfProj.isVisible) {
          pinSf.style.display = 'block';
          pinSf.style.left = `${(sfProj.x / size) * 100}%`;
          pinSf.style.top = `${(sfProj.y / size) * 100}%`;
          pinSf.style.transform = `translate(-50%, -50%) scale(${0.75 + sfProj.pz * 0.4})`;
          pinSf.style.opacity = `${Math.min(1, sfProj.pz * 1.5)}`;
        } else {
          pinSf.style.display = 'none';
        }
      }

      const delhiProj = projectPin(77.2090, 28.6139);
      if (pinDelhi) {
        if (delhiProj.isVisible) {
          pinDelhi.style.display = 'block';
          pinDelhi.style.left = `${(delhiProj.x / size) * 100}%`;
          pinDelhi.style.top = `${(delhiProj.y / size) * 100}%`;
          pinDelhi.style.transform = `translate(-50%, -50%) scale(${0.75 + delhiProj.pz * 0.4})`;
          pinDelhi.style.opacity = `${Math.min(1, delhiProj.pz * 1.5)}`;
        } else {
          pinDelhi.style.display = 'none';
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className="relative w-full min-h-screen bg-[#070707] text-[#f9dcda] overflow-hidden flex flex-col justify-between select-none">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-[#070707]" />

      {/* Outward Expanding Radar Shockwave Container */}
      {animState === 'expand' && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border-4 border-red-500 shadow-[0_0_60px_rgba(239,68,68,0.8),inset_0_0_40px_rgba(239,68,68,0.5)] z-[9999] pointer-events-none radar-expand-wave-anim" />
      )}

      {/* Top Header */}
      <header
        ref={navRef}
        className={`w-full z-40 px-6 lg:px-12 py-4 max-w-7xl mx-auto flex justify-between items-center flex-shrink-0 transition-all duration-700 ${
          animState !== 'idle' ? 'opacity-15 blur-[2px]' : 'opacity-100'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl sm:text-3xl font-black text-[#ff4d55] uppercase tracking-wider drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">
            ATLAS
          </span>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-red-950/60 border border-red-500/30 text-red-300 font-bold">
            v2.4 Live
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleStart()}
            className="font-bold text-xs tracking-wider text-[#ff4d55] bg-[#ff4d55]/10 border border-[#ff4d55]/30 px-5 py-2.5 rounded-full shadow-[0_0_18px_rgba(239,68,68,0.25)] hover:bg-[#ff4d55] hover:text-white hover:shadow-[0_0_28px_rgba(239,68,68,0.6)] transition-all uppercase flex items-center gap-2 active:scale-95"
          >
            <span>LET'S BEGIN</span>
            <Rocket className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Hero Content */}
      <main className="relative flex-1 flex items-center justify-center px-6 lg:px-12 py-4 w-full z-10">
        <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-[52%_48%] gap-8 lg:gap-12 items-center my-auto">
          
          {/* Left Hero Column */}
          <div
            ref={heroContentRef}
            className={`flex flex-col gap-5 items-start text-left max-w-2xl w-full transition-all duration-700 ${
              animState !== 'idle' ? 'opacity-15 blur-[2px] scale-95' : 'opacity-100 scale-100'
            }`}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.08]">
              Track opportunities.<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff4d55] via-[#ff6b72] to-[#98cdf2] drop-shadow-[0_0_25px_rgba(239,68,68,0.35)]">
                Catch your next move.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-zinc-300 max-w-xl leading-relaxed">
              Explore curated tech jobs, fellowships, and internships across global innovation hubs — starting with live radar in{' '}
              <span className="text-[#98cdf2] font-semibold">Delhi, India</span> and{' '}
              <span className="text-[#ff4d55] font-semibold">San Francisco, USA</span>.
            </p>

            {/* Main Action Button */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                onClick={() => handleStart()}
                className="group flex items-center justify-center gap-3 bg-gradient-to-r from-[#dc2626] via-[#ff3b45] to-[#98cdf2] text-white font-bold text-sm sm:text-base tracking-wider uppercase px-9 py-4 rounded-full shadow-[0_0_30px_rgba(220,38,38,0.6)] hover:shadow-[0_0_45px_rgba(239,68,68,0.9)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300"
              >
                <span>LET'S BEGIN</span>
                <Compass className="w-5 h-5 group-hover:rotate-45 transition-transform" />
              </button>
            </div>

            {/* Active Hubs Quick Navigation Pills */}
            <div className="pt-3 flex flex-col gap-2.5 w-full">
              <div className="text-xs font-semibold tracking-wider text-zinc-400 uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#ff4d55]" />
                <span>Active Hubs & Live Opportunities</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleStart('delhi')}
                  className="inline-flex items-center gap-2 border border-[#98cdf2]/40 bg-[#98cdf2]/10 hover:bg-[#98cdf2]/25 text-[#98cdf2] text-xs px-3.5 py-1.5 rounded-full shadow-sm transition-all hover:scale-105 active:scale-95 font-medium"
                >
                  <span>🇮🇳</span>
                  <span className="font-bold">Delhi Hub</span>
                  <span className="bg-[#98cdf2]/20 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">6 Roles</span>
                </button>
                <button
                  onClick={() => handleStart('sf')}
                  className="inline-flex items-center gap-2 border border-[#ff4d55]/40 bg-[#ff4d55]/10 hover:bg-[#ff4d55]/25 text-[#ff4d55] text-xs px-3.5 py-1.5 rounded-full shadow-sm transition-all hover:scale-105 active:scale-95 font-medium"
                >
                  <span>🇺🇸</span>
                  <span className="font-bold">San Francisco Hub</span>
                  <span className="bg-[#ff4d55]/20 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">6 Roles</span>
                </button>
                <span className="hidden sm:inline-flex items-center border border-white/10 bg-white/5 text-zinc-400 text-xs px-3 py-1.5 rounded-full">
                  Full-time Jobs
                </span>
                <span className="hidden sm:inline-flex items-center border border-white/10 bg-white/5 text-zinc-400 text-xs px-3 py-1.5 rounded-full">
                  Fellowships
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Retro-Cyber Console Device Mockup */}
          <div className="relative w-full flex items-center justify-center p-2">
            <div className="absolute inset-0 rounded-full blur-[80px] opacity-25 z-0 bg-gradient-to-br from-red-600/40 to-cyan-500/40 pointer-events-none" />

            {/* Mobile Device Mockup Card with Dynamic Centering & Expansion */}
            <div
              ref={appCardRef}
              style={{
                transform:
                  animState === 'focus' || animState === 'lock'
                    ? cardTransform
                    : animState === 'expand'
                    ? 'scale(3.5)'
                    : 'none',
              }}
              className={`w-[340px] sm:w-[360px] h-[520px] bg-[#3fa4d1] rounded-2xl border-4 border-black relative overflow-hidden group shadow-[8px_8px_0px_0px_rgba(0,0,0,0.7)] flex flex-col p-3 z-30 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                animState === 'focus' || animState === 'lock'
                  ? 'shadow-[0_30px_90px_rgba(0,0,0,0.95),0_0_60px_rgba(239,68,68,0.6)] brightness-115'
                  : animState === 'expand'
                  ? 'opacity-0 blur-md pointer-events-none'
                  : ''
              }`}
            >
              {/* Internal Bezel Screen */}
              <div className="relative w-full flex-grow bg-[#0c182b] overflow-hidden flex flex-col border-2 border-black rounded-xl">
                
                {/* Mockup Top Header */}
                <div className="pt-2 px-3 pb-2 flex justify-between items-center w-full bg-[#0c182b] border-b-2 border-black flex-shrink-0 z-30">
                  <div className="flex items-center justify-center bg-black/60 border border-red-500/40 rounded px-2 py-0.5">
                    <span className="text-xs suitcase-spin">💼</span>
                  </div>
                  <div className="flex items-center justify-center bg-[#8cd2f5] border-2 border-black rounded px-3 py-0.5 shadow-[inset_-2px_-2px_0_rgba(0,0,0,0.2)]">
                    <span className="text-[9px] text-white font-black tracking-wider">ATLAS</span>
                  </div>
                  <div className="w-6 h-6 bg-white rounded border border-black flex items-center justify-center">
                    <Globe className="w-3.5 h-3.5 text-black" />
                  </div>
                </div>

                {/* 3D Rotating Pixel Earth Container (Zooms on Lock) */}
                <div className="relative flex-1 bg-[#040a16] overflow-hidden flex items-center justify-center">
                  <canvas ref={starfieldCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-80" />
                  <div className="absolute inset-0 w-full h-full bg-[linear-gradient(rgba(56,189,248,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.05)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

                  {/* Globe Orb Container with Zoom Animation */}
                  <div className={`relative w-56 h-56 rounded-full flex items-center justify-center transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    animState === 'lock' || animState === 'expand' ? 'scale-[1.65]' : 'scale-100'
                  }`}>
                    <div className="absolute -inset-2 rounded-full pointer-events-none border border-cyan-400/20 shadow-[0_0_40px_rgba(6,182,212,0.45),0_0_15px_rgba(239,68,68,0.2)]" />
                    <div className="absolute inset-0 rounded-full pointer-events-none border-2 border-cyan-400/60 shadow-[inset_0_0_25px_rgba(34,211,238,0.4)] z-20" />
                    
                    {/* Scanner rotating beam with high speed during lock */}
                    <div className={`absolute inset-0 pointer-events-none z-20 rounded-full ${
                      animState === 'lock' || animState === 'expand'
                        ? 'fast-scanner-beam opacity-90 bg-[conic-gradient(from_0deg,_transparent_0deg,_transparent_280deg,_rgba(239,68,68,0.85)_360deg)]'
                        : 'scanner-beam opacity-25 bg-[conic-gradient(from_0deg,_transparent_0deg,_transparent_300deg,_rgba(56,189,248,0.6)_360deg)]'
                    }`} />

                    {/* Canvas */}
                    <canvas ref={globeCanvasRef} width={160} height={160} className="w-full h-full block rounded-full select-none pointer-events-none z-10" />

                    {/* SF Dynamic Pin */}
                    <button
                      ref={pinSfRef}
                      onClick={() => handleStart('sf')}
                      className={`absolute z-30 cursor-pointer group text-left transition-transform origin-center ${
                        animState === 'lock' ? 'scale-150' : 'hover:scale-125'
                      }`}
                      style={{ display: 'none' }}
                    >
                      <div className="relative flex items-center justify-center">
                        <div className="w-7 h-7 rounded-full border-2 border-red-500 bg-red-500/25 animate-ping absolute inset-0 opacity-80" />
                        <div className="w-6 h-6 rounded-full border-2 border-white bg-red-600 flex items-center justify-center text-[10px] shadow-[0_0_15px_rgba(239,68,68,0.95)] text-white font-bold">
                          💼
                        </div>
                      </div>
                      <div className="mt-1 px-1.5 py-0.5 bg-black/90 border border-red-500/70 rounded text-[7px] text-white font-mono whitespace-nowrap shadow-lg flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        <span>SF (6)</span>
                      </div>
                    </button>

                    {/* Delhi Dynamic Pin */}
                    <button
                      ref={pinDelhiRef}
                      onClick={() => handleStart('delhi')}
                      className={`absolute z-30 cursor-pointer group text-left transition-transform origin-center ${
                        animState === 'lock' ? 'scale-150' : 'hover:scale-125'
                      }`}
                      style={{ display: 'none' }}
                    >
                      <div className="relative flex items-center justify-center">
                        <div className="w-7 h-7 rounded-full border-2 border-red-500 bg-red-500/25 animate-ping absolute inset-0 opacity-80" />
                        <div className="w-6 h-6 rounded-full border-2 border-white bg-red-600 flex items-center justify-center text-[10px] shadow-[0_0_15px_rgba(239,68,68,0.95)] text-white font-bold">
                          💼
                        </div>
                      </div>
                      <div className="mt-1 px-1.5 py-0.5 bg-black/90 border border-red-500/70 rounded text-[7px] text-white font-mono whitespace-nowrap shadow-lg flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        <span>DELHI (6)</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Bottom Status Panel */}
                <div className={`p-2.5 border-t-2 border-black flex flex-col justify-center gap-0.5 z-30 transition-colors duration-500 ${
                  animState === 'lock' || animState === 'expand'
                    ? 'bg-red-600 text-white'
                    : 'bg-[#fbbf24] text-slate-950'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-extrabold text-[10px] uppercase">
                      <span className={`w-2 h-2 rounded-full animate-ping ${animState === 'lock' ? 'bg-white' : 'bg-red-600'}`} />
                      <span>{animState === 'lock' || animState === 'expand' ? `RADAR LOCKED (${lockedHub ? lockedHub.toUpperCase() : '12 ROLES'})` : 'GLOBAL HUBS READY'}</span>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${animState === 'lock' ? 'bg-black/30 text-white' : 'bg-black/15 text-slate-950'}`}>
                      {animState === 'lock' ? 'LOCKED' : '2 HUBS'}
                    </span>
                  </div>
                  <div className="text-[9.5px] font-bold flex items-center justify-between font-mono opacity-90">
                    <span>DELHI (6)</span>
                    <span>•</span>
                    <span>SAN FRANCISCO (6)</span>
                  </div>
                </div>
              </div>

              {/* Bottom Retro Action Buttons */}
              <div className="w-full flex justify-between mt-2.5 gap-2">
                <button
                  onClick={() => handleStart('delhi')}
                  className="flex-1 bg-[#fbbf24] hover:bg-[#f59e0b] border-2 border-black rounded-lg py-1.5 text-[10px] text-slate-950 font-black shadow-[2px_2px_0_rgba(0,0,0,0.7)] active:translate-y-0.5 transition-all uppercase"
                >
                  EXPLORE HUBS
                </button>
                <button
                  onClick={() => handleStart('sf')}
                  className="flex-1 bg-[#fbbf24] hover:bg-[#f59e0b] border-2 border-black rounded-lg py-1.5 text-[10px] text-slate-950 font-black shadow-[2px_2px_0_rgba(0,0,0,0.7)] active:translate-y-0.5 transition-all uppercase"
                >
                  RADAR
                </button>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 lg:px-12 py-3 max-w-7xl mx-auto flex justify-between items-center text-xs text-zinc-500 border-t border-white/5 z-10">
        <div>Signal Atlas Intelligence Engine © 2026</div>
        <div className="flex items-center gap-4">
          <span>Bright Data Fleet</span>
          <span>•</span>
          <span>Groq Multi-Tool Copilot</span>
        </div>
      </footer>
    </div>
  );
};
