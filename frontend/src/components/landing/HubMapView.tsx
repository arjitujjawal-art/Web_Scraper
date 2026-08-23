import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { JobPosting } from '../../api/types';

interface HubMapViewProps {
  initialCity?: 'delhi' | 'sf' | null;
  jobs: JobPosting[];
  onSelectCityAndLaunch: (city: 'delhi' | 'sf') => void;
  onBackToLanding: () => void;
}

export const HubMapView: React.FC<HubMapViewProps> = ({
  initialCity,
  jobs,
  onSelectCityAndLaunch,
  onBackToLanding,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [activeHub, setActiveHub] = useState<'delhi' | 'sf'>(initialCity || 'delhi');
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [transitionStep, setTransitionStep] = useState<'idle' | 'zooming' | 'shrinking'>('idle');

  const delhiCoords: [number, number] = [28.6139, 77.2090];
  const sfCoords: [number, number] = [37.7749, -122.4194];

  // Leaflet Map Initialization with World View (Matching media_1787507099366.png)
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on world so both US and India are visible
    const map = L.map(mapContainerRef.current, {
      center: [28, 5],
      zoom: 2.3,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    // Custom Red Spidey Beacon Icons matching media_1787507099366.png
    const createHubIcon = (code: string, label: string, count: number) => {
      return L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div class="relative flex flex-col items-center cursor-pointer group select-none">
            <div class="relative flex items-center justify-center">
              <div class="w-9 h-9 rounded-full border border-red-500 bg-red-500/30 animate-ping absolute inset-0 opacity-85"></div>
              <div class="w-6 h-6 rounded-full border-2 border-white bg-[#dc2626] flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,1)] text-white text-[10px] font-bold">
                💼
              </div>
            </div>
            <div class="mt-1.5 px-2 py-0.5 bg-black/95 border border-red-500/80 rounded-md text-[9.5px] text-white font-mono whitespace-nowrap shadow-2xl flex items-center gap-1 font-bold group-hover:scale-110 transition-transform">
              <span class="text-red-400 font-extrabold">${code}</span>
              <span>${label}</span>
              <span class="text-red-400 font-mono">(${count})</span>
            </div>
          </div>
        `,
        iconSize: [100, 60],
        iconAnchor: [50, 20],
      });
    };

    const delhiMarker = L.marker(delhiCoords, {
      icon: createHubIcon('IN', 'Delhi NCR', 6),
    }).addTo(map);

    delhiMarker.on('click', () => {
      handleCityClickAndZoom('delhi');
    });

    const sfMarker = L.marker(sfCoords, {
      icon: createHubIcon('US', 'San Francisco', 6),
    }).addTo(map);

    sfMarker.on('click', () => {
      handleCityClickAndZoom('sf');
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // When a user clicks a City -> 1. Camera zooms into city -> 2. Map shrinks to card -> 3. Dashboard reveals
  const handleCityClickAndZoom = (hub: 'delhi' | 'sf') => {
    if (transitionStep !== 'idle') return;

    setActiveHub(hub);
    setTransitionStep('zooming');
    setIsDrawerOpen(false);

    const coords = hub === 'delhi' ? delhiCoords : sfCoords;

    // 1. Fast camera flight zooming into the city
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(coords, 12, {
        duration: 0.85,
        easeLinearity: 0.25,
      });
    }

    // 2. Graphic transition: Map smoothly shrinks & morphs to match dashboard card (after 650ms)
    setTimeout(() => {
      setTransitionStep('shrinking');
    }, 650);

    // 3. Open the Dashboard Workspace (after 1150ms)
    setTimeout(() => {
      onSelectCityAndLaunch(hub);
    }, 1150);
  };

  const activeHubName = activeHub === 'delhi' ? 'Delhi NCR Innovation Corridor' : 'San Francisco Bay Area Hub';
  const activeHubCode = activeHub === 'delhi' ? 'IN' : 'US';
  const filteredJobs = jobs.filter((j) => activeHub === 'delhi' ? j.city.toLowerCase().includes('delhi') : j.city.toLowerCase().includes('san francisco'));

  return (
    <div className="fixed inset-0 w-screen h-screen z-50 bg-[#050507] overflow-hidden select-none font-sans flex items-center justify-center">
      
      {/* Map Outer Frame Container with Graphic Zoom-Out / Shrink Transition into Dashboard */}
      <div
        className={`w-full h-full relative transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          transitionStep === 'shrinking'
            ? 'max-w-4xl h-[340px] rounded-2xl shadow-[0_30px_90px_rgba(0,0,0,0.95)] border border-white/20 -translate-y-8 opacity-90'
            : 'max-w-full h-full rounded-none border-none'
        }`}
      >
        
        {/* Top Floating Command HUD (Matching media_1787507099366.png) */}
        <div className={`absolute top-4 left-4 right-4 z-[1000] flex items-center justify-between pointer-events-auto transition-opacity duration-300 ${
          transitionStep !== 'idle' ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}>
          {/* Hub Selector Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/90 backdrop-blur-xl border border-white/15 shadow-2xl">
            <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-black text-white border-r border-white/10 select-none mr-1">
              <span className="text-[#ff4d55]">ATLAS</span>
              <span className="text-[10px] font-mono text-zinc-400 font-normal">RADAR</span>
            </div>

            <button
              onClick={() => handleCityClickAndZoom('delhi')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                activeHub === 'delhi'
                  ? 'bg-[#dc2626] text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="text-red-300 font-extrabold text-[10px]">IN</span>
              <span>Delhi NCR (6)</span>
            </button>

            <button
              onClick={() => handleCityClickAndZoom('sf')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                activeHub === 'sf'
                  ? 'bg-[#dc2626] text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="text-red-300 font-extrabold text-[10px]">US</span>
              <span>San Francisco (6)</span>
            </button>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCityClickAndZoom(activeHub)}
              className="px-4 py-2 text-xs font-bold bg-[#ff4d55] hover:bg-red-500 text-white rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <span>Open in Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onBackToLanding}
              className="px-3.5 py-2 text-xs font-bold bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-2xl border border-white/10 transition-all flex items-center gap-1.5"
              title="Return to 3D Globe Landing"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Landing</span>
            </button>
          </div>
        </div>

        {/* Full-Screen Leaflet Map Area */}
        <div ref={mapContainerRef} className="w-full h-full relative z-10" />

        {/* Right Slide-in Opportunities Drawer (Matching media_1787507099366.png) */}
        <div className={`absolute top-0 bottom-0 right-0 w-full sm:w-[420px] bg-[#0c0c10]/95 backdrop-blur-2xl border-l border-white/15 z-[1001] shadow-2xl flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isDrawerOpen && transitionStep === 'idle' ? 'translate-x-0' : 'translate-x-full'
        }`}>
          
          {/* Drawer Header */}
          <div className="p-5 border-b border-white/10 bg-zinc-950 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-950/60 border border-red-500/40 flex items-center justify-center font-black text-red-400 text-xs">
                {activeHubCode}
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-white leading-tight">
                  {activeHubName}
                </h3>
                <p className="text-xs text-[#ff4d55] font-mono font-semibold">
                  6 Active Opportunities Verified
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsDrawerOpen(false)}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 text-xs"
            >
              ✕
            </button>
          </div>

          {/* Hub Action Banner */}
          <div className="p-4 border-b border-white/5 bg-gradient-to-r from-red-950/40 to-black flex items-center justify-between">
            <div className="text-xs text-zinc-300">
              <span>Ready to explore signals & scrape live?</span>
            </div>
            <button
              onClick={() => handleCityClickAndZoom(activeHub)}
              className="px-3.5 py-1.5 rounded-xl bg-[#ff4d55] hover:bg-red-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all flex items-center gap-1.5 active:scale-95"
            >
              <span>Open in Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Scrollable Listings List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredJobs.slice(0, 6).map((job) => (
              <div
                key={job.id}
                onClick={() => handleCityClickAndZoom(activeHub)}
                className="p-3.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-red-500/50 transition-all cursor-pointer group shadow-lg"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-[#ff4d55] transition-colors leading-snug">
                      {job.title}
                    </h4>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      <span className="font-semibold text-zinc-200">{job.company}</span>
                      <span> • </span>
                      <span className="text-red-400">{job.domain}</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300 font-semibold whitespace-nowrap">
                    {job.job_type}
                  </span>
                </div>

                <p className="text-[11px] text-zinc-300 mt-2 line-clamp-2 leading-relaxed">
                  {job.summary}
                </p>

                <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-400 font-mono font-bold">
                    {job.salary_range}
                  </span>
                  <span className="text-[#ff4d55] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    <span>View Details</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Drawer Bottom Action */}
          <div className="p-4 border-t border-white/10 bg-zinc-950 flex flex-col gap-2">
            <button
              onClick={() => handleCityClickAndZoom(activeHub)}
              className="w-full py-3 bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span>LAUNCH {activeHub === 'delhi' ? 'DELHI' : 'SF'} IN AI DASHBOARD</span>
              <ArrowRight className="w-4 h-4 text-[#ff4d55]" />
            </button>
          </div>
        </div>

        {/* Bottom Telemetry Bar */}
        <div className={`absolute bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-white/10 px-4 py-2 flex items-center justify-between text-[11px] z-[999] pointer-events-auto transition-opacity duration-300 ${
          transitionStep !== 'idle' ? 'opacity-0' : 'opacity-100'
        }`}>
          <div className="flex items-center gap-2 text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-zinc-200 font-bold">
              LIVE RADAR: 2 GLOBAL HUBS ACTIVE (DELHI NCR & SAN FRANCISCO)
            </span>
          </div>
          <div className="text-zinc-500 text-[10px] flex items-center gap-2">
            <span>Leaflet Vector Tiles</span>
            <span>•</span>
            <span>Atlas Fleet Engine</span>
          </div>
        </div>

      </div>

    </div>
  );
};
