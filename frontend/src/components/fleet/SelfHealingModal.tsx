import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import type { CollectorStatus } from '../../api/types';
import confetti from 'canvas-confetti';
import { 
  X, 
  Activity, 
  Wrench, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  Eye,
  Check,
  Zap,
  Loader2
} from 'lucide-react';

interface SelfHealingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SelfHealingModal: React.FC<SelfHealingModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [collectors, setCollectors] = useState<CollectorStatus[]>([]);
  const [demoStep, setDemoStep] = useState<number>(0);
  const demoCollectorKey = 'newsroom_delhi';
  const [diffSummary, setDiffSummary] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCollectors();
    }
  }, [isOpen]);

  const loadCollectors = async () => {
    try {
      const data = await apiClient.getCollectors();
      setCollectors(data.items || []);
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  // Step 1: Simulate Layout Breakage (Run against mutated fixture)
  const handleSimulateBreakage = async () => {
    setActionLoading(true);
    try {
      await apiClient.triggerRun(demoCollectorKey, 'https://arjitujjawal-art.github.io/Web_Scraper/fixtures/newsroom_v2_mutated.html');
      await new Promise((r) => setTimeout(r, 1500));
      await loadCollectors();
      setDemoStep(1);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Step 2: Trigger AI Scraper Heal
  const handleTriggerHeal = async () => {
    setActionLoading(true);
    try {
      await apiClient.triggerHeal(
        demoCollectorKey,
        'Site changed layout: article titles moved to .story-heading, publication dates are inside time[datetime], and categories are under .badge-domain'
      );
      await new Promise((r) => setTimeout(r, 2000));
      setDiffSummary('Updated CSS selectors: title (.headline -> .story-heading), date (.pub-date -> time[datetime]), domain (.tag -> .badge-domain)');
      await loadCollectors();
      setDemoStep(2);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Step 3: Approve & Deploy Fix
  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await apiClient.triggerApprove(demoCollectorKey);
      await new Promise((r) => setTimeout(r, 1000));
      await loadCollectors();
      setDemoStep(3);
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-4xl bg-[#0c0c10] rounded-2xl border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 bg-[#08080c] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-[#ff4d55]">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Scraper Fleet & Self-Healing Terminal</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 font-mono font-semibold">
                  Bright Data Scraper Studio
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Automated degradation detection, AI repair generation, and human-in-the-loop approval
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Demo Stepper Banner */}
        <div className="px-6 py-4 bg-[#121217] border-b border-white/10 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-white">
              Interactive Self-Healing Workflow:
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${demoStep === 0 ? 'bg-white text-zinc-950 font-bold' : 'text-zinc-500'}`}>
              1. Mutate Site
            </span>
            <ArrowRight className="w-3 h-3 text-zinc-600" />
            <span className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${demoStep === 1 ? 'bg-[#ff4d55] text-white font-bold' : 'text-zinc-500'}`}>
              2. AI Heal
            </span>
            <ArrowRight className="w-3 h-3 text-zinc-600" />
            <span className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${demoStep === 2 ? 'bg-white text-zinc-950 font-bold' : 'text-zinc-500'}`}>
              3. Review Diff
            </span>
            <ArrowRight className="w-3 h-3 text-zinc-600" />
            <span className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${demoStep === 3 ? 'bg-emerald-500 text-white font-bold' : 'text-zinc-500'}`}>
              4. Recovered
            </span>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Step Actions Card */}
          <div className="p-5 rounded-xl bg-zinc-900/80 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Demo Target: Startup Newsroom Collector (`c_mp3tuab31lswoxvpws`)
                </h3>
                <p className="text-xs text-zinc-400">
                  Simulate DOM changes, watch fill rate degrade, and inspect automated AI repair.
                </p>
              </div>

              {demoStep === 0 && (
                <button
                  onClick={handleSimulateBreakage}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  <span>Test Mutated HTML (Trigger Degrade)</span>
                </button>
              )}

              {demoStep === 1 && (
                <button
                  onClick={handleTriggerHeal}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-[#ff4d55] hover:bg-red-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wrench className="w-3.5 h-3.5" />}
                  <span>Trigger AI Scraper Heal</span>
                </button>
              )}

              {demoStep === 2 && (
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Approve & Deploy Fix</span>
                </button>
              )}

              {demoStep === 3 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/40">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Fleet Fully Recovered (100% Fill Rate)</span>
                </div>
              )}
            </div>

            {/* Diff Inspection View */}
            {diffSummary && demoStep >= 2 && (
              <div className="p-4 rounded-xl bg-black border border-white/15 space-y-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-[#ff4d55]" />
                  <span>Proposed Scraper Studio Selector Repair Diff:</span>
                </span>
                <p className="text-xs font-mono text-zinc-300 bg-zinc-900/90 p-2.5 rounded-lg border border-white/10">
                  {diffSummary}
                </p>
              </div>
            )}
          </div>

          {/* Collectors Table */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Fleet Collectors ({collectors.length})
            </h4>
            <div className="space-y-2">
              {collectors.map((c) => (
                <div
                  key={c.key}
                  className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/10 flex items-center justify-between hover:border-white/20 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${c.health === 'HEALTHY' ? 'bg-emerald-400' : c.health === 'DEGRADED' ? 'bg-rose-500 animate-ping' : 'bg-zinc-500'}`} />
                    <div>
                      <h5 className="text-xs font-bold text-white">{c.description}</h5>
                      <span className="text-[10px] font-mono text-zinc-400">{c.collector_id} · {c.source_type}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-white">
                        {c.last_fill_rate !== null ? `${(c.last_fill_rate * 100).toFixed(0)}% fill` : 'Pending'}
                      </span>
                      <span className="text-[10px] text-zinc-500 block">Quality Rate</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        c.health === 'HEALTHY'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : c.health === 'DEGRADED'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {c.health}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
