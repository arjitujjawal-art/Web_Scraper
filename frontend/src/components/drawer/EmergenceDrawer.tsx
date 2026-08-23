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
  Briefcase, 
  Download 
} from 'lucide-react';

const downloadJson = (data: any, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

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
      <aside className="fixed top-20 right-4 bottom-4 w-96 z-[9999] bg-[#0c0c10] rounded-2xl border border-white/15 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 select-none">
        <div className="p-5 border-b border-white/10 bg-[#08080c] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center text-[#ff4d55]">
              <Briefcase className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Active Vacancy
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          <div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-zinc-200 font-semibold border border-white/10">
              {job.domain}
            </span>
            <h3 className="text-xl font-bold text-white mt-2 leading-tight">{job.title}</h3>
            <p className="text-sm text-zinc-300 font-semibold mt-0.5">{job.company}</p>
            <p className="text-xs text-zinc-400 flex items-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5 text-zinc-500" />
              {job.city} · {job.job_type}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900 border border-white/10">
            <span className="text-xs text-zinc-400 block mb-1">Salary Range</span>
            <span className="text-base font-bold text-emerald-400 font-mono">
              {job.salary_range}
            </span>
          </div>

          {job.summary && (
            <div>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Job Summary
              </h4>
              <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/60 p-3 rounded-xl border border-white/5">
                {job.summary}
              </p>
            </div>
          )}

          {job.skills && job.skills.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Required Skills
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {job.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/10 text-xs text-zinc-300 font-mono"
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
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold transition-all shadow-lg active:scale-95"
            >
              <span>View Original Job Posting</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <button
            onClick={() => downloadJson(job, `job_${job.id}.json`)}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-[#ff4d55]" />
            <span>Download Job JSON</span>
          </button>
        </div>
      </aside>
    );
  }

  // 2. Individual Signal Details View
  if (signal) {
    const domainStyle = DOMAIN_COLORS[signal.domain] || DOMAIN_COLORS['AI/ML'];
    return (
      <aside className="fixed top-20 right-4 bottom-4 w-96 z-[9999] bg-[#0c0c10] rounded-2xl border border-white/15 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 select-none">
        <div className="p-5 border-b border-white/10 bg-[#08080c] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center text-[#ff4d55]">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Verified Signal
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-xs px-2.5 py-0.5 rounded-full font-semibold border border-white/10"
                style={{
                  backgroundColor: `${domainStyle.hex}25`,
                  color: domainStyle.hex,
                }}
              >
                {signal.domain}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-900 border border-white/5 text-zinc-400 font-mono">
                {signal.signal_type}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-3 leading-snug">
              {signal.title}
            </h3>
            <p className="text-xs text-zinc-400 mt-2 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              <span>Extracted {new Date(signal.date).toLocaleDateString()}</span>
              <span>·</span>
              <span>{signal.city}</span>
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900 border border-white/10 space-y-2">
            <span className="text-xs text-zinc-400 font-semibold block">
              Signal Citation ID
            </span>
            <code className="text-xs font-mono text-white block bg-black/70 p-2 rounded border border-white/10 break-all">
              [{signal.signal_id}]
            </code>
          </div>

          {signal.summary && (
            <div>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Executive Summary
              </h4>
              <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/60 p-3 rounded-xl border border-white/5">
                {signal.summary}
              </p>
            </div>
          )}

          {signal.source_url && (
            <a
              href={signal.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs transition-all shadow-lg active:scale-95"
            >
              <span>Inspect Source Evidence</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <button
            onClick={() => downloadJson(signal, `signal_${signal.signal_id}.json`)}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-[#ff4d55]" />
            <span>Download Signal JSON</span>
          </button>
        </div>
      </aside>
    );
  }

  // 3. Opportunity Zone Inspection View
  if (!zone) return null;
  const domainStyle = DOMAIN_COLORS[zone.domain] || DOMAIN_COLORS['AI/ML'];

  return (
    <aside className="fixed top-20 right-4 bottom-4 w-[420px] z-[9999] bg-[#0c0c10] rounded-2xl border border-white/15 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 select-none">
      {/* Header */}
      <div className="p-5 border-b border-white/10 bg-[#08080c] flex items-center justify-between">
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
          className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-95"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-6 overflow-y-auto space-y-6 flex-1">
        {/* Title & Domain */}
        <div>
          <div className="flex items-center gap-2">
            <span
              className="text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider border border-white/10"
              style={{
                backgroundColor: `${domainStyle.hex}25`,
                color: domainStyle.hex,
              }}
            >
              {zone.domain}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-zinc-900 border border-white/10 text-white font-semibold uppercase">
              {zone.confidence} Confidence
            </span>
          </div>
          <h3 className="text-2xl font-black text-white mt-2 leading-tight">
            {zone.primary_area || zone.city}
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            {zone.city} Innovation Cluster
          </p>
        </div>

        {/* Big Score Card */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10">
            <span className="text-xs text-zinc-400 block mb-1">
              Emergence Score ($S_{'{'}emergence{'}'}$)
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black font-mono text-white">
                {(zone.emergence_score ?? 0).toFixed(2)}
              </span>
              <span className="text-xs text-zinc-500 font-mono">/ 10.0</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10">
            <span className="text-xs text-zinc-400 block mb-1">
              Cluster Velocity
            </span>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-[#ff4d55]" />
              <span className="text-2xl font-bold font-mono text-white">
                {zone.velocity_delta >= 0 ? `+${zone.velocity_delta.toFixed(2)}` : zone.velocity_delta.toFixed(2)}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">/mo</span>
            </div>
          </div>
        </div>

        {/* Mathematical Transparency Section */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
            <Info className="w-4 h-4 text-[#ff4d55]" />
            <span>Mathematical Convergence Model</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Calculated via exponential time-decay across independent public signals:
          </p>
          <div className="p-2.5 rounded-lg bg-black font-mono text-[10px] text-white border border-white/10 text-center font-bold">
            S = ∑ (Weight_i · e^(-λ · Δt)) · Diversity_factor
          </div>
          <p className="text-[10px] text-zinc-500 italic">
            Recent university research grants & facility launches receive highest weight; decay half-life = 90 days.
          </p>
        </div>

        {/* Verified Signal Timeline */}
        <div>
          <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Leading Signal Evidence ({zone.signal_count})
          </h4>
          <div className="space-y-2.5">
            {(zone.top_signals || []).map((sig) => (
              <div
                key={sig.signal_id}
                onClick={() => onSelectSignal(sig)}
                className="p-3 rounded-xl bg-zinc-900/80 border border-white/10 hover:border-red-500/40 cursor-pointer transition-all hover:translate-x-1"
              >
                <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                  <span className="font-mono text-[#ff4d55] font-bold">{sig.signal_type}</span>
                  <span>{new Date(sig.date).toLocaleDateString()}</span>
                </div>
                <h5 className="text-xs font-semibold text-white line-clamp-2">
                  {sig.title}
                </h5>
                <p className="text-[10px] text-zinc-400 mt-1 truncate">
                  {sig.summary}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Export Zone JSON Button */}
        <div className="pt-2">
          <button
            onClick={() => downloadJson(zone, `zone_${zone.city}_${zone.domain}.json`)}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs transition-all shadow-lg active:scale-95"
          >
            <Download className="w-4 h-4 text-[#ff4d55]" />
            <span>Export Zone & Evidence JSON</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
