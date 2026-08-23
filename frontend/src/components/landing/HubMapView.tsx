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
  const [isTransitioning, setIsTransitioning] = useState(false);

  const delhiCoords: [number, number] = [28.6139, 77.2090];
  const sfCoords: [number, number] = [37.7749, -122.4194];

  // Leaflet Map Initialization
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter = activeHub === 'delhi' ? delhiCoords : sfCoords;
    const initialZoom = 11;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    // Custom Red Spidey Icon for Delhi
    const createHubIcon = (label: string, count: number, flag: string) => {
      return L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div class="relative flex flex-col items-center cursor-pointer group">
            <div class="relative flex items-center justify-center">
              <div class="w-10 h-10 rounded-full border-2 border-red-500 bg-red-500/25 animate-ping absolute inset-0 opacity-80"></div>
              <div class="w-8 h-8 rounded-full border-2 border-white bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-sm shadow-[0_0_25px_rgba(239,68,68,0.95)] text-white font-bold">
                💼
              </div>
            </div>
            <div class="mt-1 px-2.5 py-1 bg-black/90 border border-red-500/70 rounded-lg text-[10px] text-white font-mono whitespace-nowrap shadow-2xl flex items-center gap-1.5 font-bold">
              <span>${flag}</span>
              <span>${label}</span>
              <span class="bg-red-500/30 text-red-300 px-1 py-0.2 rounded text-[8px]">(${count})</span>
            </div>
          </div>
        `,
        iconSize: [80, 60],
        iconAnchor: [40, 20],
      });
    };

    const delhiMarker = L.marker(delhiCoords, {
      icon: createHubIcon('Delhi NCR', 6, '🇮🇳'),
    }).addTo(map);

    delhiMarker.on('click', () => {
      setActiveHub('delhi');
      setIsDrawerOpen(true);
      map.flyTo(delhiCoords, 12, { duration: 1.2 });
    });

    const sfMarker = L.marker(sfCoords, {
      icon: createHubIcon('San Francisco', 6, '🇺🇸'),
    }).addTo(map);

    sfMarker.on('click', () => {
      setActiveHub('sf');
      setIsDrawerOpen(true);
      map.flyTo(sfCoords, 12, { duration: 1.2 });
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Hub Tab Switching
  const handleSwitchHub = (hub: 'delhi' | 'sf') => {
    setActiveHub(hub);
    setIsDrawerOpen(true);
    if (mapInstanceRef.current) {
      const coords = hub === 'delhi' ? delhiCoords : sfCoords;
      mapInstanceRef.current.flyTo(coords, 12, { duration: 1.2 });
    }
  };

  const handleLaunchDashboard = (hub?: 'delhi' | 'sf') => {
    const targetHub = hub || activeHub;
    setIsTransitioning(true);

    // Zoom and fade transition into main dashboard
    setTimeout(() => {
      onSelectCityAndLaunch(targetHub);
    }, 600);
  };

  const activeHubName = activeHub === 'delhi' ? 'Delhi NCR Innovation Corridor' : 'San Francisco Bay Area Hub';
  const activeHubFlag = activeHub === 'delhi' ? '🇮🇳' : '🇺🇸';
  const filteredJobs = jobs.filter((j) => activeHub === 'delhi' ? j.city.toLowerCase().includes('delhi') : j.city.toLowerCase().includes('san francisco'));

  return (
    <div className={`fixed inset-0 w-screen h-screen z-50 bg-[#060608] flex overflow-hidden select-none font-sans transition-all duration-700 ${
      isTransitioning ? 'scale-105 opacity-0 blur-sm' : 'scale-100 opacity-100 blur-0'
    }`}>
      
      {/* Top Floating Command HUD */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex items-center justify-between pointer-events-auto">
        {/* Hub Selector Pills */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/85 backdrop-blur-xl border border-white/15 shadow-2xl">
          <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-black text-[#ff4d55] border-r border-white/10 select-none mr-1">
            <span>ATLAS</span>
            <span className="text-[10px] font-mono text-zinc-400 font-normal">RADAR</span>
          </div>

          <button
            onClick={() => handleSwitchHub('delhi')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeHub === 'delhi'
                ? 'bg-gradient-to-r from-[#dc2626] to-[#ff4d55] text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>🇮🇳</span>
            <span>Delhi NCR (6)</span>
          </button>

          <button
            onClick={() => handleSwitchHub('sf')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeHub === 'sf'
                ? 'bg-gradient-to-r from-[#dc2626] to-[#ff4d55] text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>🇺🇸</span>
            <span>San Francisco (6)</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Main Launch Button */}
          <button
            onClick={() => handleLaunchDashboard(activeHub)}
            className="px-5 py-2.5 text-xs font-bold bg-white hover:bg-zinc-200 text-zinc-950 rounded-2xl shadow-[0_0_25px_rgba(255,255,255,0.25)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <span>Enter AI Dashboard Workspace</span>
            <ArrowRight className="w-4 h-4 text-[#ff4d55]" />
          </button>

          {/* Back to Landing Button */}
          <button
            onClick={onBackToLanding}
            className="px-3.5 py-2.5 text-xs font-bold bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-2xl border border-white/10 transition-all flex items-center gap-1.5"
            title="Return to 3D Globe Landing"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Landing</span>
          </button>
        </div>
      </div>

      {/* Full-Screen Leaflet Map Area */}
      <div ref={mapContainerRef} className="w-full h-full relative z-10" />

      {/* Right Slide-in Opportunities & Hub Drawer */}
      <div className={`absolute top-0 bottom-0 right-0 w-full sm:w-[420px] bg-[#0c0c10]/95 backdrop-blur-2xl border-l border-white/15 z-[1001] shadow-2xl flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        
        {/* Drawer Header */}
        <div className="p-5 border-b border-white/10 bg-zinc-950/80 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{activeHubFlag}</span>
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
        <div className="p-4 border-b border-white/5 bg-gradient-to-r from-red-950/30 to-black flex items-center justify-between">
          <div className="text-xs text-zinc-300">
            <span>Ready to explore signals & scrape live?</span>
          </div>
          <button
            onClick={() => handleLaunchDashboard(activeHub)}
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
              onClick={() => handleLaunchDashboard(activeHub)}
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
            onClick={() => handleLaunchDashboard(activeHub)}
            className="w-full py-3 bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <span>Launch {activeHub === 'delhi' ? 'Delhi' : 'SF'} in AI Dashboard</span>
            <ArrowRight className="w-4 h-4 text-[#ff4d55]" />
          </button>
        </div>
      </div>

      {/* Bottom Telemetry Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-white/10 px-4 py-2 flex items-center justify-between text-[11px] z-[999] pointer-events-auto">
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
  );
};
