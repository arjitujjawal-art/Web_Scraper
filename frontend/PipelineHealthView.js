/**
 * Signal Atlas — Pipeline Health & Self-Healing Monitor Component (Page 3)
 */

import { selfHealingEngine } from '../services/selfHealingEngine.js';
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

    let statusBadgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    let statusLabel = '🟢 ALL SYSTEMS HEALTHY (100% OPERATIONAL)';
    if (isDegraded) {
      statusBadgeColor = 'bg-red-500/10 text-red-400 border-red-500/30 animate-pulse';
      statusLabel = '🔴 CRITICAL: DOM SELECTOR DRIFT DETECTED IN BRIGHTDATA SCRAPER';
    } else if (isRepairing) {
      statusBadgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse';
      statusLabel = '🟡 REPAIRING: GEMINI AI AGENT SYNTHESIZING FALLBACK AST PATCH';
    } else if (isHealedUnapproved) {
      statusBadgeColor = 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30 animate-pulse';
      statusLabel = '🔵 AUTO-PATCH READY: SYNTHETIC SELECTOR GENERATED — APPROVAL PENDING';
    }

    this.container.innerHTML = `
      <div class="topographic-bg min-h-[calc(100vh-64px)] p-4 lg:p-8 space-y-8 max-w-7xl mx-auto">
        
        <!-- Header & Status Banner -->
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-[#1F2937]">
          <div>
            <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full border text-xs font-mono mb-2 ${statusBadgeColor}">
              <span class="w-2 h-2 rounded-full ${isDegraded ? 'bg-red-500 animate-ping' : 'bg-emerald-400'}"></span>
              <span>${statusLabel}</span>
            </div>
            <h1 class="text-3xl font-extrabold text-white tracking-tight">Pipeline Health &amp; Self-Healing Console</h1>
            <p class="text-xs text-[#94A3B8] mt-1">Autonomous web scraper DOM drift detection, schema recovery, and operator verification logs.</p>
          </div>

          <!-- Quick Action Buttons -->
          <div class="flex flex-wrap items-center gap-2">
            <button id="btn-drift" class="px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold transition flex items-center space-x-1.5 ${!isHealthy ? 'opacity-50 cursor-not-allowed' : ''}" ${!isHealthy ? 'disabled' : ''}>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              <span>1. Simulate Selector Drift</span>
            </button>

            <button id="btn-heal" class="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-indigo-600/20 ${!isDegraded ? 'opacity-50 cursor-not-allowed' : ''}" ${!isDegraded ? 'disabled' : ''}>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              <span>2. Trigger AI Repair Agent</span>
            </button>

            <button id="btn-approve" class="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0A0E14] text-xs font-extrabold transition flex items-center space-x-1.5 shadow-md shadow-emerald-500/20 ${!isHealedUnapproved ? 'opacity-50 cursor-not-allowed' : ''}" ${!isHealedUnapproved ? 'disabled' : ''}>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              <span>3. Approve Auto-Patch</span>
            </button>

            <button id="btn-reset" class="p-2.5 rounded-xl bg-[#141924] hover:bg-[#1E2536] text-[#94A3B8] border border-[#1F2937] text-xs transition" title="Reset Demo">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            </button>
          </div>
        </div>

        <!-- Metrics Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-[#141924] p-5 rounded-2xl border border-[#1F2937]">
            <div class="text-xs text-[#94A3B8] font-mono">Active Scrapers</div>
            <div class="text-2xl font-bold font-mono text-white mt-1">
              ${isDegraded ? '3/4' : '4/4'} <span class="text-xs text-emerald-400 font-normal">Active</span>
            </div>
          </div>

          <div class="bg-[#141924] p-5 rounded-2xl border border-[#1F2937]">
            <div class="text-xs text-[#94A3B8] font-mono">Pipeline Uptime</div>
            <div class="text-2xl font-bold font-mono text-emerald-400 mt-1">99.8%</div>
          </div>

          <div class="bg-[#141924] p-5 rounded-2xl border border-[#1F2937]">
            <div class="text-xs text-[#94A3B8] font-mono">Auto-Healed Incidents</div>
            <div class="text-2xl font-bold font-mono text-indigo-400 mt-1">${state.healedIncidentsCount}</div>
          </div>

          <div class="bg-[#141924] p-5 rounded-2xl border border-[#1F2937]">
            <div class="text-xs text-[#94A3B8] font-mono">Mean Time to Repair (MTTR)</div>
            <div class="text-2xl font-bold font-mono text-white mt-1">1.4s</div>
          </div>
        </div>

        <!-- Collector Status Table -->
        <div class="bg-[#141924] rounded-2xl border border-[#1F2937] overflow-hidden">
          <div class="bg-[#0A0E14] px-6 py-3.5 border-b border-[#1F2937] flex items-center justify-between">
            <span class="text-xs font-mono font-bold text-white uppercase tracking-wider">Collector Pipelines Status</span>
            <span class="text-xs text-[#94A3B8]">Bright Data Web Scraper API Engine</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-[#0D121B] text-[#94A3B8] font-mono border-b border-[#1F2937]">
                <tr>
                  <th class="px-6 py-3">Collector ID</th>
                  <th class="px-6 py-3">Target Public Portal</th>
                  <th class="px-6 py-3">Error Rate</th>
                  <th class="px-6 py-3">Last Sync</th>
                  <th class="px-6 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#1F2937] text-white">
                ${state.collectors.map(c => {
                  let badge = '<span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">🟢 Healthy</span>';
                  if (c.status === 'DEGRADED') {
                    badge = '<span class="px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-mono animate-pulse">🔴 Degraded (DOM Drift)</span>';
                  } else if (c.status === 'REPAIRING') {
                    badge = '<span class="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono animate-pulse">🟡 AI Repairing</span>';
                  } else if (c.status === 'PATCH_PENDING') {
                    badge = '<span class="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">🔵 Patch Pending</span>';
                  }

                  return `
                    <tr class="hover:bg-[#1E2536]/50 transition">
                      <td class="px-6 py-3.5 font-mono font-bold">${c.name}</td>
                      <td class="px-6 py-3.5 text-[#94A3B8]">${c.target}</td>
                      <td class="px-6 py-3.5 font-mono ${c.errorRate !== '0.00%' && c.errorRate !== '0.01%' && c.errorRate !== '0.02%' ? 'text-red-400 font-bold' : 'text-gray-300'}">${c.errorRate}</td>
                      <td class="px-6 py-3.5 text-[#94A3B8]">${c.lastSync}</td>
                      <td class="px-6 py-3.5 text-right">${badge}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Side-by-Side Payload Diff Inspector -->
        <div id="diff-viewer-mount"></div>

        <!-- Streaming Terminal Console (Section 2 & 3 Requirement) -->
        <div class="bg-[#0A0E14] rounded-2xl border border-[#1F2937] overflow-hidden shadow-2xl">
          <div class="bg-[#0F141C] px-5 py-3 border-b border-[#1F2937] flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <div class="flex space-x-1.5">
                <span class="w-3 h-3 rounded-full bg-red-500/80"></span>
                <span class="w-3 h-3 rounded-full bg-amber-500/80"></span>
                <span class="w-3 h-3 rounded-full bg-emerald-500/80"></span>
              </div>
              <span class="text-xs font-mono text-gray-300 font-bold ml-2">Collector Stream Log Console</span>
            </div>
            <span class="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">REALTIME LOG STREAM</span>
          </div>

          <div id="terminal-log-output" class="p-5 font-mono text-xs space-y-2 overflow-y-auto max-h-80 text-gray-300 leading-relaxed">
            ${state.logHistory.map(l => {
              let color = 'text-gray-300';
              if (l.level === 'ERROR') color = 'text-red-400 font-bold bg-red-500/10 p-1 rounded';
              if (l.level === 'WARN') color = 'text-amber-400 font-semibold';
              if (l.level === 'SUCCESS') color = 'text-emerald-400 font-semibold';
              return `
                <div class="flex items-start space-x-3">
                  <span class="text-[#94A3B8] text-[11px] select-none">${l.timestamp}</span>
                  <span class="px-1.5 py-0.2 rounded text-[10px] bg-[#1F2937] text-indigo-300 select-none">${l.source}</span>
                  <span class="${color}">${l.message}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

      </div>
    `;

    this.attachEvents();

    // Mount Side-by-side Payload Diff Viewer
    if (!this.diffViewer) {
      this.diffViewer = new PayloadDiffViewer('diff-viewer-mount', {
        brokenPayload: state.brokenPayload,
        healedPayload: state.healedPayload
      });
    } else {
      this.diffViewer.update(state.brokenPayload, state.healedPayload);
    }

    // Subscribe to real-time engine changes
    this.unsubscribe = selfHealingEngine.subscribe((newState) => {
      this.updateStateUI(newState);
    });
  }

  updateStateUI(state) {
    const term = document.getElementById('terminal-log-output');
    if (term) {
      term.innerHTML = state.logHistory.map(l => {
        let color = 'text-gray-300';
        if (l.level === 'ERROR') color = 'text-red-400 font-bold bg-red-500/10 p-1 rounded';
        if (l.level === 'WARN') color = 'text-amber-400 font-semibold';
        if (l.level === 'SUCCESS') color = 'text-emerald-400 font-semibold';
        return `
          <div class="flex items-start space-x-3">
            <span class="text-[#94A3B8] text-[11px] select-none">${l.timestamp}</span>
            <span class="px-1.5 py-0.2 rounded text-[10px] bg-[#1F2937] text-indigo-300 select-none">${l.source}</span>
            <span class="${color}">${l.message}</span>
          </div>
        `;
      }).join('');
      term.scrollTop = term.scrollHeight;
    }

    if (this.diffViewer) {
      this.diffViewer.update(state.brokenPayload, state.healedPayload);
    }
  }

  attachEvents() {
    const btnDrift = this.container.querySelector('#btn-drift');
    const btnHeal = this.container.querySelector('#btn-heal');
    const btnApprove = this.container.querySelector('#btn-approve');
    const btnReset = this.container.querySelector('#btn-reset');

    if (btnDrift) btnDrift.addEventListener('click', () => {
      selfHealingEngine.simulateDrift();
      this.render();
    });

    if (btnHeal) btnHeal.addEventListener('click', () => {
      selfHealingEngine.triggerSelfHealing();
      this.render();
    });

    if (btnApprove) btnApprove.addEventListener('click', () => {
      selfHealingEngine.approvePatch();
      this.render();
    });

    if (btnReset) btnReset.addEventListener('click', () => {
      selfHealingEngine.reset();
      this.render();
    });
  }
}
