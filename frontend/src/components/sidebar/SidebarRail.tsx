import React from 'react';
import { 
  Home, 
  Briefcase, 
  Globe2, 
  ShieldCheck, 
  Bot, 
  LogOut,
  Radio
} from 'lucide-react';

interface SidebarRailProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenJobsModal: () => void;
  onOpenScraperModal: () => void;
  onOpenFleetModal: () => void;
  onToggleCopilot: () => void;
  onExitToLanding: () => void;
  isCopilotOpen: boolean;
  activeSignalsCount: number;
}

export const SidebarRail: React.FC<SidebarRailProps> = ({
  activeTab,
  onSelectTab,
  onOpenJobsModal,
  onOpenScraperModal,
  onOpenFleetModal,
  onToggleCopilot,
  onExitToLanding,
  isCopilotOpen,
  activeSignalsCount,
}) => {
  return (
    <aside className="w-16 sm:w-18 h-screen bg-[#000000] border-r border-white/10 flex flex-col justify-between items-center py-4 z-40 flex-shrink-0 select-none">
      
      {/* Top Brand Logo */}
      <div className="flex flex-col items-center gap-6 w-full">
        <button
          onClick={onExitToLanding}
          className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:scale-105 active:scale-95 transition-all group"
          title="Return to Landing Page"
        >
          <Radio className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        </button>

        {/* Navigation Item List */}
        <nav className="flex flex-col items-center gap-2 w-full px-2">
          {/* Home / Radar Map */}
          <button
            onClick={() => onSelectTab('radar')}
            className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center transition-all ${
              activeTab === 'radar' 
                ? 'bg-white/15 text-white shadow-[0_0_12px_rgba(255,255,255,0.2)] border border-white/20' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
            }`}
            title="Radar & Intelligence Map"
          >
            <Home className="w-4 h-4" />
            <span className="text-[8.5px] font-medium tracking-tight mt-0.5">Radar</span>
          </button>

          {/* Active Jobs */}
          <button
            onClick={onOpenJobsModal}
            className="w-11 h-11 rounded-xl flex flex-col items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 transition-all group relative"
            title="Active Jobs & Fellowships"
          >
            <Briefcase className="w-4 h-4 group-hover:text-cyan-400 transition-colors" />
            <span className="text-[8.5px] font-medium tracking-tight mt-0.5">Jobs</span>
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          </button>

          {/* Scrapers / One-Stop Scraper */}
          <button
            onClick={onOpenScraperModal}
            className="w-11 h-11 rounded-xl flex flex-col items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 transition-all group"
            title="Scraper Studio / On-Demand URL Extraction"
          >
            <Globe2 className="w-4 h-4 group-hover:text-blue-400 transition-colors" />
            <span className="text-[8.5px] font-medium tracking-tight mt-0.5">Scrapers</span>
          </button>

          {/* Signal Copilot Toggle */}
          <button
            onClick={onToggleCopilot}
            className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center transition-all group ${
              isCopilotOpen
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
            title="Signal Copilot AI"
          >
            <Bot className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="text-[8.5px] font-medium tracking-tight mt-0.5">Copilot</span>
          </button>

          {/* Fleet Health Self-Healing */}
          <button
            onClick={onOpenFleetModal}
            className="w-11 h-11 rounded-xl flex flex-col items-center justify-center text-zinc-400 hover:text-emerald-400 hover:bg-white/5 transition-all group"
            title="Bright Data Fleet Health & Self-Healing"
          >
            <ShieldCheck className="w-4 h-4 group-hover:text-emerald-400 transition-colors" />
            <span className="text-[8.5px] font-medium tracking-tight mt-0.5">Fleet</span>
          </button>
        </nav>
      </div>

      {/* Bottom Actions & Profile */}
      <div className="flex flex-col items-center gap-3 w-full px-2">
        {/* Signal counter pill */}
        <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-white/10 flex flex-col items-center justify-center text-zinc-300" title={`${activeSignalsCount} Signals Ingested`}>
          <span className="text-[9px] font-mono font-bold text-cyan-400">{activeSignalsCount}</span>
          <span className="text-[6.5px] uppercase text-zinc-500">SIG</span>
        </div>

        {/* Return to Landing button */}
        <button
          onClick={onExitToLanding}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
          title="Exit to Landing Page"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
