import React from 'react';
import type { SignalSummary } from '../../api/types';
import { Radio } from 'lucide-react';
import { DOMAIN_COLORS } from '../../styles/mapTheme';

interface SignalTickerProps {
  signals: SignalSummary[];
  onSelectSignal: (sig: SignalSummary) => void;
}

export const SignalTicker: React.FC<SignalTickerProps> = ({
  signals,
  onSelectSignal,
}) => {
  if (!signals || signals.length === 0) return null;

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[9990] hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full glass-pill border border-slate-700/80 shadow-2xl overflow-hidden max-w-[50vw]">
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold uppercase font-mono tracking-wider shrink-0">
        <Radio className="w-2.5 h-2.5 animate-pulse text-cyan-400" />
        <span>LIVE FEED</span>
      </div>

      <div className="flex items-center gap-4 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap text-[11px]">
        {signals.slice(0, 12).map((sig) => {
          const style = DOMAIN_COLORS[sig.domain] || DOMAIN_COLORS['AI/ML'];
          return (
            <button
              key={sig.signal_id}
              onClick={() => onSelectSignal(sig)}
              className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors group shrink-0"
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: style.hex }} />
              <span className="font-semibold text-slate-200 group-hover:text-cyan-300">{sig.city}:</span>
              <span className="truncate max-w-[200px] text-slate-400 group-hover:text-slate-200">{sig.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
