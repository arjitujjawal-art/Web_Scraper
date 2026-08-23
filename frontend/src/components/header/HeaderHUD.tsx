import React from 'react';
import type { Domain } from '../../api/types';
import { 
  Radio, 
  Layers, 
  Bot, 
  Activity, 
  Sparkles
} from 'lucide-react';

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
    <header className="fixed top-4 left-4 right-4 z-[9999] flex items-center justify-between gap-4 pointer-events-none">
      {/* Brand & City Switcher */}
      <div className="flex items-center gap-3 pointer-events-auto">
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl glass-panel-elevated border border-slate-700/80 shadow-2xl">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 shadow-inner">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black tracking-wider uppercase text-white font-mono">
                Signal Atlas
              </h1>
              <span className={`w-2 h-2 rounded-full ${backendHealthy ? 'bg-emerald-400' : 'bg-rose-400'}`} title={backendHealthy ? 'Backend Live' : 'Backend Disconnected'} />
            </div>
            <p className="text-[10px] text-slate-400">
              Opportunity Zone Intelligence
            </p>
          </div>
        </div>

        {/* City Selector Pill */}
        <div className="flex items-center p-1 rounded-2xl glass-panel border border-slate-700/80 shadow-xl">
          <button
            onClick={() => onSelectCity('delhi')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeCity === 'delhi'
                ? 'bg-cyan-500 text-slate-950 shadow-lg font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Delhi NCR
          </button>
          <button
            onClick={() => onSelectCity('sf')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeCity === 'sf'
                ? 'bg-cyan-500 text-slate-950 shadow-lg font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            San Francisco
          </button>
        </div>
      </div>

      {/* Domain Filters Dropdown / Quick Select */}
      <div className="hidden lg:flex items-center gap-1.5 p-1 rounded-2xl glass-panel border border-slate-700/80 shadow-xl pointer-events-auto overflow-x-auto max-w-xl">
        <button
          onClick={() => onSelectDomain(null)}
          className={`px-3 py-1.2 rounded-xl text-xs font-medium transition-all ${
            selectedDomain === null
              ? 'bg-slate-800 text-cyan-400 border border-cyan-500/40 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All Domains
        </button>
        {DOMAINS.map((domain) => (
          <button
            key={domain}
            onClick={() => onSelectDomain(selectedDomain === domain ? null : domain)}
            className={`px-3 py-1.2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              selectedDomain === domain
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            {domain}
          </button>
        ))}
      </div>

      {/* Action Buttons (Scraper, Self-Healing Fleet, Jobs Layer, Copilot) */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Active Jobs Layer Toggle */}
        <button
          onClick={onToggleJobsLayer}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold border transition-all shadow-xl ${
            showJobsLayer
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/30'
              : 'glass-panel border-slate-700/80 text-slate-300 hover:border-slate-500'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Active Jobs Layer</span>
        </button>

        {/* On-Demand Scraper Modal Trigger */}
        <button
          onClick={onOpenScraperModal}
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold glass-panel-elevated border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 hover:text-white transition-all shadow-xl hover:scale-105"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="hidden sm:inline">One-Stop Scraper</span>
        </button>

        {/* Self-Healing Scraper Fleet Modal Trigger */}
        <button
          onClick={onOpenFleetModal}
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold glass-panel-elevated border border-purple-500/50 hover:border-purple-400 text-purple-300 hover:text-white transition-all shadow-xl hover:scale-105"
        >
          <Activity className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">Fleet & Self-Healing</span>
        </button>

        {/* Signal Copilot Chat Widget Trigger */}
        <button
          onClick={onToggleCopilot}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shadow-2xl ${
            isCopilotOpen
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 ring-2 ring-cyan-400 scale-105'
              : 'glass-panel-elevated border border-cyan-400/80 text-cyan-400 hover:bg-cyan-500/20'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>Copilot</span>
        </button>
      </div>
    </header>
  );
};
