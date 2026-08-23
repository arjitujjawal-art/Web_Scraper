import React from 'react';
import { 
  Compass, 
  Briefcase, 
  Terminal, 
  ShieldCheck, 
  Bot, 
  LogOut
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
    <aside className="w-18 sm:w-20 h-screen bg-[#050507] border-r border-white/10 flex flex-col justify-between items-stretch z-40 flex-shrink-0 select-none">
      
      {/* Top Section: Brand + Main Nav Items */}
      <div className="flex flex-col w-full">
        {/* Brand Header Tile with Spider Crawler Icon */}
        <button
          onClick={onExitToLanding}
          className="w-full h-20 border-b border-white/10 flex flex-col items-center justify-center bg-gradient-to-b from-[#0e0e14] to-[#060608] hover:bg-zinc-900 transition-all group relative overflow-hidden"
          title="Signal Atlas - Click to return to Landing"
        >
          <div className="relative w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110">
            <div className="absolute inset-0 rounded-xl bg-red-500/10 blur-sm group-hover:bg-red-500/25 transition-all" />
            <img 
              src="/spider-crawler.jpg" 
              alt="Spider Crawler" 
              className="w-11 h-11 object-contain relative z-10 filter brightness-125 drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]" 
            />
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-[#ff4d55] mt-0.5 font-mono group-hover:text-white transition-colors">ATLAS</span>
        </button>

        {/* Navigation Item Stack - Occupies Full Width of Sidebar */}
        <nav className="flex flex-col w-full divide-y divide-white/5">
          {/* 1. Radar & Live Map */}
          <button
            onClick={() => onSelectTab('radar')}
            className={`w-full py-3.5 flex flex-col items-center justify-center gap-1 transition-all relative group ${
              activeTab === 'radar' 
                ? 'bg-white/10 text-white font-bold' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 font-medium'
            }`}
            title="Radar & Intelligence Map"
          >
            {activeTab === 'radar' && (
              <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#ff4d55]" />
            )}
            <Compass className={`w-5 h-5 ${activeTab === 'radar' ? 'text-[#ff4d55]' : 'group-hover:text-white'}`} />
            <span className="text-[10px] tracking-tight">Radar</span>
          </button>

          {/* 2. Active Jobs */}
          <button
            onClick={onOpenJobsModal}
            className="w-full py-3.5 flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-white hover:bg-white/5 transition-all relative group font-medium"
            title="Active Jobs & Fellowships"
          >
            <Briefcase className="w-5 h-5 group-hover:text-[#ff4d55] transition-colors" />
            <span className="text-[10px] tracking-tight">Jobs</span>
            <span className="absolute top-2.5 right-3 w-2 h-2 rounded-full bg-[#ef4444] animate-pulse" />
          </button>

          {/* 3. Scrapers / Studio */}
          <button
            onClick={onOpenScraperModal}
            className="w-full py-3.5 flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-white hover:bg-white/5 transition-all relative group font-medium"
            title="Scraper Studio & Ad-Hoc URL Extraction"
          >
            <Terminal className="w-5 h-5 group-hover:text-[#ff4d55] transition-colors" />
            <span className="text-[10px] tracking-tight">Scrapers</span>
          </button>

          {/* 4. Signal Copilot */}
          <button
            onClick={onToggleCopilot}
            className={`w-full py-3.5 flex flex-col items-center justify-center gap-1 transition-all relative group ${
              isCopilotOpen
                ? 'bg-white/10 text-white font-bold'
                : 'text-zinc-400 hover:text-white hover:bg-white/5 font-medium'
            }`}
            title="Signal Copilot Assistant"
          >
            {isCopilotOpen && (
              <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#ff4d55]" />
            )}
            <Bot className={`w-5 h-5 ${isCopilotOpen ? 'text-[#ff4d55]' : 'group-hover:text-white'}`} />
            <span className="text-[10px] tracking-tight">Copilot</span>
          </button>

          {/* 5. Fleet Health */}
          <button
            onClick={onOpenFleetModal}
            className="w-full py-3.5 flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-emerald-400 hover:bg-white/5 transition-all group font-medium"
            title="Bright Data Fleet Health & Self-Healing"
          >
            <ShieldCheck className="w-5 h-5 group-hover:text-emerald-400 transition-colors" />
            <span className="text-[10px] tracking-tight">Fleet</span>
          </button>
        </nav>
      </div>

      {/* Bottom Section: Signals Badge + Export + Logout */}
      <div className="flex flex-col w-full divide-y divide-white/5 border-t border-white/10">
        {/* Signal Ingestion Telemetry Tile */}
        <div className="w-full py-3 flex flex-col items-center justify-center bg-[#07070a]">
          <span className="text-[11px] font-mono font-bold text-[#ff4d55]">{activeSignalsCount}</span>
          <span className="text-[7.5px] uppercase tracking-wider text-zinc-400 font-bold">Signals</span>
        </div>

        {/* Exit to Landing */}
        <button
          onClick={onExitToLanding}
          className="w-full py-3.5 flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-[#ff4d55] hover:bg-red-500/10 transition-all font-medium"
          title="Exit to Landing Page"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-[9px] tracking-tight">Landing</span>
        </button>
      </div>
    </aside>
  );
};
