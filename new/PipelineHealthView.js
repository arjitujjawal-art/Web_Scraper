/**
 * Signal Atlas — Pipeline Health & Self-Healing Monitor Component (PROJECT / ATLAS Editorial Visual System)
 */

import { selfHealingEngine } from './selfHealingEngine.js';
import { PayloadDiffViewer } from './PayloadDiffViewer.js';

export class PipelineHealthView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.diffViewer = null;
    this.unsubscribe = null;
    this.render();
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  render() {
    if (!this.container) return;

    const state = selfHealingEngine.getSnapshot();
    const isDegraded = state.status === 'DEGRADED';
    const isRepairing = state.status === 'REPAIRING';
    const isHealedUnapproved = state.status === 'HEALED_UNAPPROVED';
    const isHealthy = state.status === 'HEALTHY';

    let statusBadgeColor = 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30';
    let statusLabel = '🟢 SYSTEM HEALTHY — ALL 4 COLLECTORS OPERATIONAL (FILL RATE 100%)';
    if (isDegraded) {
      statusBadgeColor = 'bg-red-950/60 text-[#E3262E] border-[#E3262E] animate-pulse';
      statusLabel = '🔴 CRITICAL: DOM SELECTOR DRIFT DETECTED IN BRIGHTDATA COLLECTOR';
    } else if (isRepairing) {
      statusBadgeColor = 'bg-amber-950/60 text-amber-400 border-amber-500/40 animate-pulse';
      statusLabel = '🟡 REPAIRING: GEMINI LLM AGENT SYNTHESIZING AST SELECTOR PATCH';
    } else if (isHealedUnapproved) {
      statusBadgeColor = 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40 animate-pulse';
      statusLabel = '🔵 AUTO-PATCH GENERATED: AST DIFF READY FOR OPERATOR APPROVAL';
    }

    this.container.innerHTML = `
      <div class="space-y-8 max-w-7xl mx-auto px-4 font-mono">
        
        <!-- Header & Interactive Controls -->
        <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-[#1F2937]">
          <div>
            <div class="inline-flex items-center space-x-2 px-3 py-1.5 border text-xs font-mono mb-3 ${statusBadgeColor}">
              <span class="w-2 h-2 rounded-full ${isDegraded ? 'bg-[#E3262E] animate-ping' : 'bg-emerald-400'}"></span>
              <span>${statusLabel}</span>
            </div>
            <h2 class="font-serif text-2xl lg:text-3xl font-extrabold text-white uppercase tracking-tight">PIPELINE HEALTH &amp; RECOVERY CONSOLE</h2>
            <p class="text-xs text-[#8A8A8A] mt-1 font-mono uppercase tracking-wider">Autonomous DOM Drift Detection · Schema Auto-Repair · Human Operator Approval Gating</p>
          </div>

          <!-- Quick Action Buttons matching Editorial Theme -->
          <div class="flex flex-wrap items-center gap-3">
            <button id="btn-drift" class="px-4 py-2.5 bg-red-950/40 hover:bg-red-900/60 text-[#E3262E] border border-[#E3262E]/60 text-xs font-bold font-mono uppercase transition flex items-center space-x-2 ${!isHealthy ? 'opacity-40 cursor-not-allowed' : ''}" ${!isHealthy ? 'disabled' : ''}>
              <span>1. SIMULATE DRIFT</span>
            </button>

            <button id="btn-heal" class="px-4 py-2.5 bg-[#E3262E] hover:bg-[#C11B22] text-white text-xs font-bold font-mono uppercase transition flex items-center space-x-2 shadow-lg shadow-[#E3262E]/20 ${!isDegraded ? 'opacity-40 cursor-not-allowed' : ''}" ${!isDegraded ? 'disabled' : ''}>
              <span>2. TRIGGER LLM REPAIR</span>
            </button>

            <button id="btn-approve" class="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold font-mono uppercase transition flex items-center space-x-2 shadow-lg shadow-emerald-500/20 ${!isHealedUnapproved ? 'opacity-40 cursor-not-allowed' : ''}" ${!isHealedUnapproved ? 'disabled' : ''}>
              <span>3. APPROVE AUTO-PATCH</span>
            </button>

            <button id="btn-reset" class="px-3 py-2.5 bg-[#0A0A0C] hover:bg-[#141924] text-[#8A8A8A] hover:text-white border border-[#1F2937] text-xs font-mono uppercase transition" title="Reset Demo">
              <span>RESET</span>
            </button>
          </div>
        </div>

        <!-- Metric Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-[#0A0A0C] p-5 border border-[#1F2937]">
            <div class="text-[11px] text-[#8A8A8A] font-mono uppercase tracking-wider">Collector Status</div>
            <div class="text-2xl font-bold font-mono text-white mt-1">
              ${isDegraded ? '3/4 ONLINE' : '4/4 ONLINE'}
            </div>
            <div class="text-[10px] text-[#E3262E] font-mono mt-1">${isDegraded ? '1 Collector Degraded' : '100% Collector Fill Rate'}</div>
          </div>

          <div class="bg-[#0A0A0C] p-5 border border-[#1F2937]">
            <div class="text-[11px] text-[#8A8A8A] font-mono uppercase tracking-wider">Pipeline Uptime</div>
            <div class="text-2xl font-bold font-mono text-emerald-400 mt-1">99.8%</div>
            <div class="text-[10px] text-[#8A8A8A] font-mono mt-1">Zero Data Loss Architecture</div>
          </div>

          <div class="bg-[#0A0A0C] p-5 border border-[#1F2937]">
            <div class="text-[11px] text-[#8A8A8A] font-mono uppercase tracking-wider">Auto-Healed Incidents</div>
            <div class="text-2xl font-bold font-mono text-[#E3262E] mt-1">${state.healedIncidentsCount}</div>
            <div class="text-[10px] text-[#8A8A8A] font-mono mt-1">Mean Repair: 1.4s</div>
          </div>

          <div class="bg-[#0A0A0C] p-5 border border-[#1F2937]">
            <div class="text-[11px] text-[#8A8A8A] font-mono uppercase tracking-wider">Active Selector Schema</div>
            <div class="text-xl font-bold font-mono text-white mt-1 truncate">${state.currentSelector}</div>
            <div class="text-[10px] text-[#8A8A8A] font-mono mt-1">Bright Data Harvester v2.4</div>
          </div>
        </div>

        <!-- Horizontal Pipeline Step Machine Visualizer -->
        <div class="bg-[#0A0A0C] border border-[#1F2937] p-6 space-y-4">
          <div class="text-xs font-mono text-[#8A8A8A] uppercase tracking-widest flex items-center justify-between border-b border-[#1F2937] pb-3">
            <span>5-STEP RECOVERABLE SCRAPER LIFECYCLE</span>
            <span>DOM DRIFT RECOVERY PROTOCOL</span>
          </div>

          <div class="pipeline-track mx-auto">
            <div class="pipeline-step ${isHealthy || isDegraded || isRepairing || isHealedUnapproved ? 'active-step' : ''}">
              <div class="step-label">01. DISCOVER</div>
              <div class="step-status text-emerald-400">100% FILL RATE</div>
            </div>
            <div class="pipeline-step ${isHealthy || isDegraded || isRepairing || isHealedUnapproved ? 'active-step' : ''}">
              <div class="step-label">02. EXTRACT</div>
              <div class="step-status text-emerald-400">RAW DATA STREAM</div>
            </div>
            <div class="pipeline-step ${isDegraded ? 'glitch-step' : 'active-step'}">
              <div class="step-label">03. STRUCTURE</div>
              <div class="step-status ${isDegraded ? 'text-[#E3262E] font-bold' : 'text-emerald-400'}">
                ${isDegraded ? 'DOM DRIFT DETECTED' : 'SCHEMA VALIDATED'}
              </div>
            </div>
            <div class="pipeline-step ${isRepairing || isHealedUnapproved ? 'active-step' : ''}">
              <div class="step-label">04. ANALYZE</div>
              <div class="step-status ${isRepairing ? 'text-amber-400 font-bold' : 'text-[#8A8A8A]'}">
                ${isRepairing ? 'LLM HEALING...' : isHealedUnapproved ? 'PATCH SYNTHESIZED' : 'AST PARSER READY'}
              </div>
            </div>
            <div class="pipeline-step ${isHealthy && state.healedIncidentsCount > 0 ? 'active-step' : ''}">
              <div class="step-label">05. RECOVER</div>
              <div class="step-status text-emerald-400">1.4s AUTO-REPAIRED</div>
            </div>
          </div>
        </div>

        <!-- Payload & AST Diff Inspector Container -->
        <div id="payload-diff-mount" class="bg-[#0A0A0C] border border-[#1F2937] p-6"></div>

      </div>
    `;

    // Initialize Diff Viewer
    const diffMount = this.container.querySelector('#payload-diff-mount');
    if (diffMount) {
      this.diffViewer = new PayloadDiffViewer('payload-diff-mount');
    }

    this.attachEvents();
    this.subscribeToEngine();
  }

  subscribeToEngine() {
    if (this.unsubscribe) this.unsubscribe();
    this.unsubscribe = selfHealingEngine.subscribe(() => {
      this.render();
    });
  }

  attachEvents() {
    const btnDrift = this.container.querySelector('#btn-drift');
    const btnHeal = this.container.querySelector('#btn-heal');
    const btnApprove = this.container.querySelector('#btn-approve');
    const btnReset = this.container.querySelector('#btn-reset');

    if (btnDrift) btnDrift.addEventListener('click', () => selfHealingEngine.simulateDrift());
    if (btnHeal) btnHeal.addEventListener('click', () => selfHealingEngine.triggerHeal());
    if (btnApprove) btnApprove.addEventListener('click', () => selfHealingEngine.approvePatch());
    if (btnReset) btnReset.addEventListener('click', () => selfHealingEngine.resetDemo());
  }
}
