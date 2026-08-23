import React, { useState } from 'react';
import { ForceFieldBackground } from './ForceFieldBackground';
import { RefreshCw, Zap, Maximize, Palette } from 'lucide-react';

export default function App() {
  const [params, setParams] = useState({
    hue: 48, // Amber Gold Site Styles hue
    saturation: 100,
    minStroke: 2,
    maxStroke: 6,
    spacing: 10,
    forceStrength: 15,
    magnifierRadius: 160
  });

  const randomize = () => {
    setParams({
      ...params,
      hue: Math.floor(Math.random() * 360),
      minStroke: parseFloat((Math.random() * 3 + 1).toFixed(1)),
      maxStroke: parseFloat((Math.random() * 8 + 4).toFixed(1)),
      spacing: Math.floor(Math.random() * 8 + 8),
      magnifierRadius: Math.floor(Math.random() * 100 + 100)
    });
  };

  return (
    <div className="relative w-full min-h-screen font-sans text-white bg-black overflow-hidden">
      {/* Background Component */}
      <div className="absolute inset-0 z-0">
        <ForceFieldBackground 
          hue={params.hue}
          saturation={params.saturation}
          minStroke={params.minStroke}
          maxStroke={params.maxStroke}
          spacing={params.spacing}
          forceStrength={params.forceStrength}
          magnifierRadius={params.magnifierRadius}
        />
      </div>

      {/* Foreground Content Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen pointer-events-none">
        <div className="text-center space-y-8 p-8 max-w-4xl mix-blend-difference">
          <h1 className="text-7xl md:text-9xl font-bold tracking-tighter leading-none bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50"
              style={{ fontFamily: '"Bodoni Moda", serif' }}>
            JOB ATLAS
          </h1>
          <p className="text-xl md:text-2xl font-light tracking-[0.5em] text-white/80 uppercase">
            Spatial Intelligence Telemetry Field
          </p>
        </div>
      </div>

      {/* Floating Controls */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-4 pointer-events-auto">
        <div className="bg-black/60 backdrop-blur-md border border-white/10 p-4 rounded-full shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-10 fade-in duration-700">
          
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs text-white/50 uppercase tracking-wider">
              <Palette className="w-3 h-3 text-[#FFC700]" /> Hue
            </div>
            <input 
              type="range" min="0" max="360" 
              value={params.hue} 
              onChange={(e) => setParams({...params, hue: parseInt(e.target.value)})}
              className="w-24 accent-[#FFC700] h-1 bg-white/20 rounded-full appearance-none cursor-pointer"
            />
          </div>

          <div className="w-px h-8 bg-white/10" />

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs text-white/50 uppercase tracking-wider">
              <Maximize className="w-3 h-3 text-[#FFC700]" /> Radius
            </div>
            <input 
              type="range" min="50" max="300" 
              value={params.magnifierRadius} 
              onChange={(e) => setParams({...params, magnifierRadius: parseInt(e.target.value)})}
              className="w-24 accent-[#FFC700] h-1 bg-white/20 rounded-full appearance-none cursor-pointer"
            />
          </div>

          <div className="w-px h-8 bg-white/10" />

          <div className="flex flex-col gap-2">
             <div className="flex items-center gap-2 text-xs text-white/50 uppercase tracking-wider">
              <Zap className="w-3 h-3 text-[#FFC700]" /> Force
            </div>
            <input 
              type="range" min="0" max="30" 
              value={params.forceStrength} 
              onChange={(e) => setParams({...params, forceStrength: parseInt(e.target.value)})}
              className="w-24 accent-[#FFC700] h-1 bg-white/20 rounded-full appearance-none cursor-pointer"
            />
          </div>

          <button 
            onClick={randomize}
            className="ml-4 p-3 rounded-full bg-white/10 hover:bg-[#FFC700] hover:text-black transition-colors border border-white/10 group"
            title="Randomize Parameters"
          >
            <RefreshCw className="w-5 h-5 text-white/80 group-hover:rotate-180 transition-transform duration-500" />
          </button>
        </div>
      </div>

      <div className="fixed top-8 right-8 z-20 pointer-events-none">
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 px-4 py-2 rounded-full text-xs text-white/50 font-mono">
          FPS: 60 • POINTS: {(1280/params.spacing * 720/params.spacing * 0.5).toFixed(0)}
        </div>
      </div>
    </div>
  );
}
