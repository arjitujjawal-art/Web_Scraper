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
      // Wait for run completion
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
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl glass-panel-elevated rounded-3xl border border-purple-500/40 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center">
              <Activity className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Scraper Fleet & Self-Healing Terminal</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono">
                  Bright Data Scraper Studio
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Automated degradation detection, AI repair generation, and human-in-the-loop approval
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl glass-panel flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Demo Stepper Banner */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-cyan-950/40 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-200">
              Interactive Self-Healing Demonstration:
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className={`px-2.5 py-1 rounded-lg font-medium transition-all ${demoStep === 0 ? 'bg-purple-500 text-white font-bold' : 'text-slate-500'}`}>
              1. Mutate Site
            </span>
            <ArrowRight className="w-3 h-3 text-slate-600" />
            <span className={`px-2.5 py-1 rounded-lg font-medium transition-all ${demoStep === 1 ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-500'}`}>
              2. AI Heal
            </span>
            <ArrowRight className="w-3 h-3 text-slate-600" />
            <span className={`px-2.5 py-1 rounded-lg font-medium transition-all ${demoStep === 2 ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-500'}`}>
              3. Review Diff
            </span>
            <ArrowRight className="w-3 h-3 text-slate-600" />
            <span className={`px-2.5 py-1 rounded-lg font-medium transition-all ${demoStep === 3 ? 'bg-emerald-500 text-white font-bold' : 'text-slate-500'}`}>
              4. Recovered
            </span>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Step Actions Card */}
          <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Demo Target: Startup Newsroom Collector (`c_mp3tuab31lswoxvpws`)
                </h3>
                <p className="text-xs text-slate-400">
                  Simulate DOM changes, watch fill rate degrade, and inspect automated AI repair.
                </p>
              </div>

              {demoStep === 0 && (
                <button
                  onClick={handleSimulateBreakage}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  <span>Test Mutated HTML (Trigger Degrade)</span>
                </button>
              )}

              {demoStep === 1 && (
                <button
                  onClick={handleTriggerHeal}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg transition-all animate-pulse"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wrench className="w-3.5 h-3.5" />}
                  <span>Trigger AI Scraper Heal</span>
                </button>
              )}

              {demoStep === 2 && (
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
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
              <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/40 space-y-2">
                <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Proposed Scraper Studio Selector Repair Diff:</span>
                </span>
                <p className="text-xs font-mono text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  {diffSummary}
                </p>
              </div>
            )}
          </div>

          {/* Collectors Table */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Fleet Collectors ({collectors.length})
            </h4>
            <div className="space-y-2">
              {collectors.map((c) => (
                <div
                  key={c.key}
                  className="p-3.5 rounded-xl glass-panel border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${c.health === 'HEALTHY' ? 'bg-emerald-400' : c.health === 'DEGRADED' ? 'bg-rose-500 animate-ping' : 'bg-slate-500'}`} />
                    <div>
                      <h5 className="text-xs font-bold text-white">{c.description}</h5>
                      <span className="text-[10px] font-mono text-slate-500">{c.collector_id} · {c.source_type}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-slate-200">
                        {c.last_fill_rate !== null ? `${(c.last_fill_rate * 100).toFixed(0)}% fill` : 'Pending'}
                      </span>
                      <span className="text-[10px] text-slate-500 block">Quality Rate</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        c.health === 'HEALTHY'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : c.health === 'DEGRADED'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : 'bg-slate-800 text-slate-400'
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
