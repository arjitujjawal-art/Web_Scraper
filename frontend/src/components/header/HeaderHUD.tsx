import React from 'react';
import type { Domain } from '../../api/types';
import { 
  Radio, 
  Layers, 
  Bot, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { DOMAIN_COLORS } from '../../styles/mapTheme';

interface HeaderHUDProps {
  activeCity: 'delhi' | 'sf';
  onSelectCity: (city: 'delhi' | 'sf') => void;
  selectedDomain: string | null;
  onSelectDomain: (domain: string | null) => void;
  showJobsLayer: boolean;
  onToggleJobsLayer: () => void;
  onOpenScraperModal: () => void;
  onOpenFleetModal: () => void;
  onToggleCopilot: () => void;
  isCopilotOpen: boolean;
  backendHealthy: boolean;
}

const DOMAINS: Domain[] = [
  'AI/ML',
  'Robotics',
  'Biotech',
  'Climate & Energy',
  'Semiconductors',
  'Quantum',
  'Fintech',
  'Cybersecurity',
];

export const HeaderHUD: React.FC<HeaderHUDProps> = ({
  activeCity,
  onSelectCity,
  selectedDomain,
  onSelectDomain,
  showJobsLayer,
  onToggleJobsLayer,
  onOpenScraperModal,
  onOpenFleetModal,
  onToggleCopilot,
  isCopilotOpen,
  backendHealthy,
}) => {
  return (
    <header className="fixed top-4 left-4 right-4 z-[9999] flex flex-col gap-2.5 pointer-events-none">
      <div className="flex items-center justify-between gap-3 w-full">
        {/* Brand & City Segmented Switcher */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Main Brand Chip */}
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl glass-panel-elevated shadow-2xl group transition-all hover:border-cyan-400/50">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/30 border border-cyan-400/50 shadow-inner">
              <Radio className="w-4 h-4 text-cyan-300 animate-pulse" />
              <div className="absolute inset-0 rounded-xl bg-cyan-400/20 blur-sm animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-widest uppercase text-white font-mono flex items-center gap-1.5">
                  SIGNAL ATLAS
                  <span className="text-[10px] text-cyan-400 font-mono font-normal">v2.4</span>
                </span>
                <span className={`w-2 h-2 rounded-full shadow-sm ${backendHealthy ? 'bg-emerald-400 animate-pulse shadow-emerald-400/50' : 'bg-rose-500'}`} />
              </div>
              <p className="text-[10px] text-slate-400 font-mono tracking-tight">
                Emergence Radar & Fleet OS
              </p>
            </div>
          </div>

          {/* City Segmented Slider */}
          <div className="flex items-center p-1 rounded-2xl glass-pill shadow-xl">
            <button
              onClick={() => onSelectCity('delhi')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeCity === 'delhi'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg scale-[1.02]'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span>🇮🇳</span>
              <span>Delhi NCR</span>
            </button>
            <button
              onClick={() => onSelectCity('sf')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeCity === 'sf'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg scale-[1.02]'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span>🇺🇸</span>
              <span>San Francisco</span>
            </button>
          </div>
        </div>

        {/* Global Action Command Center */}
        <div className="flex items-center gap-2.5 pointer-events-auto">
          {/* Jobs & Companies Toggle Layer */}
          <button
            onClick={onToggleJobsLayer}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all glass-pill ${
              showJobsLayer
                ? 'border-emerald-500/50 text-emerald-300 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Active Jobs</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </button>

          {/* On-Demand Scraper Trigger Button */}
          <button
            onClick={onOpenScraperModal}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/40 transition-all shadow-[0_0_20px_rgba(0,240,255,0.15)] hover:scale-105"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>One-Stop Scraper</span>
          </button>

          {/* Scraper Fleet Health Status */}
          <button
            onClick={onOpenFleetModal}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 transition-all shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:scale-105"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Fleet Health</span>
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-[9px] font-mono text-emerald-300">100%</span>
          </button>

          {/* Copilot Launcher */}
          <button
            onClick={onToggleCopilot}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              isCopilotOpen
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_25px_rgba(0,240,255,0.4)]'
                : 'glass-pill text-cyan-300 hover:text-white border-cyan-400/40'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Copilot AI</span>
          </button>
        </div>
      </div>

      {/* Domain Quick Filters Strip */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl glass-panel shadow-2xl pointer-events-auto overflow-x-auto max-w-fit mx-auto border border-slate-700/60">
        <button
          onClick={() => onSelectDomain(null)}
          className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all ${
            selectedDomain === null
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All Domains
        </button>
        {DOMAINS.map((domain) => {
          const style = DOMAIN_COLORS[domain] || DOMAIN_COLORS['AI/ML'];
          const isSelected = selectedDomain === domain;
          return (
            <button
              key={domain}
              onClick={() => onSelectDomain(isSelected ? null : domain)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-white text-slate-950 font-bold shadow-lg scale-105'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: style.hex }} />
              <span>{domain}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
