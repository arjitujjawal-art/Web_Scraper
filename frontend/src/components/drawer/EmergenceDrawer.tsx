import React from 'react';
import type { OpportunityZone, SignalSummary, JobPosting } from '../../api/types';
import { DOMAIN_COLORS } from '../../styles/mapTheme';
import { 
  X, 
  TrendingUp, 
  ExternalLink, 
  Sparkles, 
  Calendar,
  Info,
  MapPin,
  Briefcase
} from 'lucide-react';

interface EmergenceDrawerProps {
  zone: OpportunityZone | null;
  signal: SignalSummary | null;
  job: JobPosting | null;
  onClose: () => void;
  onSelectSignal: (sig: SignalSummary) => void;
}

export const EmergenceDrawer: React.FC<EmergenceDrawerProps> = ({
  zone,
  signal,
  job,
  onClose,
  onSelectSignal,
}) => {
  if (!zone && !signal && !job) return null;

  // 1. Job Details View
  if (job) {
    return (
      <aside className="fixed top-20 right-4 bottom-4 w-96 z-[9999] glass-panel-elevated rounded-2xl border border-emerald-500/50 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Active Vacancy
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg glass-panel flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          <div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
              {job.domain}
            </span>
            <h3 className="text-xl font-bold text-white mt-2">{job.title}</h3>
            <p className="text-sm text-slate-300 font-semibold mt-0.5">{job.company}</p>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5" />
              {job.city} · {job.job_type}
            </p>
          </div>

          <div className="p-4 rounded-xl glass-panel border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Salary Range</span>
            <span className="text-base font-bold text-emerald-400 font-mono">
              {job.salary_range}
            </span>
          </div>

          {job.summary && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Job Summary
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {job.summary}
              </p>
            </div>
          )}

          {job.skills && job.skills.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Required Skills
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {job.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {job.source_url && (
            <a
              href={job.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg"
            >
              <span>View Original Job Posting</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </aside>
    );
  }

  // 2. Individual Signal Details View
  if (signal) {
    const domainStyle = DOMAIN_COLORS[signal.domain] || DOMAIN_COLORS['AI/ML'];
    return (
      <aside className="fixed top-20 right-4 bottom-4 w-96 z-[9999] glass-panel-elevated rounded-2xl border border-cyan-500/50 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Verified Signal
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg glass-panel flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                style={{
                  backgroundColor: `${domainStyle.hex}25`,
                  color: domainStyle.hex,
                }}
              >
                {signal.domain}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                {signal.signal_type}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-3 leading-snug">
              {signal.title}
            </h3>
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              <span>Extracted {new Date(signal.date).toLocaleDateString()}</span>
              <span>·</span>
              <span>{signal.city}</span>
            </p>
          </div>

          <div className="p-4 rounded-xl glass-panel border border-slate-800 space-y-2">
            <span className="text-xs text-slate-400 font-semibold block">
              Signal Citation ID
            </span>
            <code className="text-xs font-mono text-cyan-300 block bg-slate-900/80 p-2 rounded border border-slate-800 break-all">
              [{signal.signal_id}]
            </code>
          </div>

          {signal.summary && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Executive Summary
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                {signal.summary}
              </p>
            </div>
          )}

          {signal.source_url && (
            <a
              href={signal.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition-all shadow-lg"
            >
              <span>Inspect Source Evidence</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </aside>
    );
  }

  // 3. Opportunity Zone Inspection View
  if (!zone) return null;
  const domainStyle = DOMAIN_COLORS[zone.domain] || DOMAIN_COLORS['AI/ML'];

  return (
    <aside className="fixed top-20 right-4 bottom-4 w-[420px] z-[9999] glass-panel-elevated rounded-2xl border border-cyan-500/50 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: domainStyle.hex }}
          />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Opportunity Zone Profile
          </h2>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg glass-panel flex items-center justify-center text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-6 overflow-y-auto space-y-6 flex-1">
        {/* Title & Domain */}
        <div>
          <div className="flex items-center gap-2">
            <span
              className="text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider"
              style={{
                backgroundColor: `${domainStyle.hex}25`,
                color: domainStyle.hex,
              }}
            >
              {zone.domain}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-semibold uppercase">
              {zone.confidence} Confidence
            </span>
          </div>
          <h3 className="text-2xl font-black text-white mt-2">
            {zone.primary_area || zone.city}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {zone.city} Innovation Cluster
          </p>
        </div>

        {/* Big Score Card */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/30">
            <span className="text-xs text-slate-400 block mb-1">
              Emergence Score ($S_{'{'}emergence{'}'}$)
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black font-mono text-cyan-300">
                {(zone.emergence_score ?? 0).toFixed(2)}
              </span>
              <span className="text-xs text-slate-500 font-mono">/ 10.0</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/30">
            <span className="text-xs text-slate-400 block mb-1">
              Cluster Velocity
            </span>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span className="text-2xl font-bold font-mono text-purple-300">
                {zone.velocity_delta >= 0 ? `+${zone.velocity_delta.toFixed(2)}` : zone.velocity_delta.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500">/mo</span>
            </div>
          </div>
        </div>

        {/* Mathematical Transparency Section */}
        <div className="p-4 rounded-2xl glass-panel border border-slate-800 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Info className="w-4 h-4 text-cyan-400" />
            <span>Mathematical Convergence Model</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Calculated via exponential time-decay across independent public signals:
          </p>
          <div className="p-2.5 rounded-lg bg-slate-950 font-mono text-[10px] text-cyan-300 border border-slate-800 text-center">
            S = ∑ (Weight_i · e^(-λ · Δt)) · Diversity_factor
          </div>
          <p className="text-[10px] text-slate-400 italic">
            Recent university research grants & facility launches receive highest weight; decay half-life = 90 days.
          </p>
        </div>

        {/* Verified Signal Timeline */}
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Leading Signal Evidence ({zone.signal_count})
          </h4>
          <div className="space-y-2.5">
            {(zone.top_signals || []).map((sig) => (
              <div
                key={sig.signal_id}
                onClick={() => onSelectSignal(sig)}
                className="p-3 rounded-xl glass-panel border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-all hover:translate-x-1"
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span className="font-mono text-cyan-400">{sig.signal_type}</span>
                  <span>{new Date(sig.date).toLocaleDateString()}</span>
                </div>
                <h5 className="text-xs font-semibold text-white line-clamp-2">
                  {sig.title}
                </h5>
                <p className="text-[10px] text-slate-400 mt-1 truncate">
                  {sig.summary}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};
