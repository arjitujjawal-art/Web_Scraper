import React from 'react';
import { Compass, Cpu, Wifi } from 'lucide-react';

interface MapHUDOverlayProps {
  activeCity: 'delhi' | 'sf';
  signalCount: number;
  jobCount: number;
  zoneCount: number;
}

export const MapHUDOverlay: React.FC<MapHUDOverlayProps> = ({
  activeCity,
  signalCount,
  jobCount,
  zoneCount,
}) => {
  const isDelhi = activeCity === 'delhi';

  return (
    <div className="absolute inset-0 pointer-events-none z-[500] overflow-hidden select-none">
      {/* 4 Cyber Corner Crosshairs */}
      <div className="absolute top-24 left-6 text-cyan-500/40 font-mono text-[10px] flex items-center gap-1">
        <span>+</span>
        <span className="text-[9px] tracking-widest text-slate-500">GRID_SEC_01</span>
      </div>
      <div className="absolute top-24 right-6 text-cyan-500/40 font-mono text-[10px] flex items-center gap-1">
        <span className="text-[9px] tracking-widest text-slate-500">ORBITAL_RADAR</span>
        <span>+</span>
      </div>
      <div className="absolute bottom-20 left-6 text-cyan-500/40 font-mono text-[10px]">
        <span>+</span>
      </div>
      <div className="absolute bottom-20 right-6 text-cyan-500/40 font-mono text-[10px]">
        <span>+</span>
      </div>

      {/* Top Right: Real-time Coordinate Compass & Satellite Telemetry */}
      <div className="absolute top-28 right-6 flex flex-col items-end gap-1.5 pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-panel text-[10px] font-mono text-slate-300 shadow-xl border border-slate-800">
          <Compass className="w-3 h-3 text-cyan-400 animate-spin" style={{ animationDuration: '12s' }} />
          <span className="text-cyan-300 font-bold">
            {isDelhi ? '28°32\'07" N, 77°23\'27" E' : '37°46\'29" N, 122°25\'09" W'}
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">{isDelhi ? 'ELEV 216m' : 'ELEV 16m'}</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[9px] font-mono text-slate-400">
          <Wifi className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
          <span>BRIGHT DATA CLUSTER · REAL-TIME TELEMETRY</span>
        </div>
      </div>

      {/* Bottom Left: Mathematical Model Convergence Telemetry Box */}
      <div className="absolute bottom-6 left-6 pointer-events-auto hidden md:flex flex-col gap-2 max-w-sm">
        <div className="p-3.5 rounded-2xl glass-panel-elevated shadow-2xl border border-cyan-500/30 space-y-2">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white">
                Emergence Model Telemetry
              </span>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-[9px] font-mono text-cyan-300 font-bold">
              λ = 0.05 / day
            </span>
          </div>

          <div className="text-[10px] font-mono text-slate-300 leading-tight space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Time-Decay Formula:</span>
              <span className="text-cyan-300 font-bold">S = ∑ w_i · e^(-λ Δt_i)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Active Signals Ingested:</span>
              <span className="text-emerald-400 font-bold">{signalCount} events</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Enterprise Hiring Tracked:</span>
              <span className="text-amber-300 font-bold">{jobCount} active roles</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Opportunity Zones Detected:</span>
              <span className="text-purple-300 font-bold">{zoneCount} clusters</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
