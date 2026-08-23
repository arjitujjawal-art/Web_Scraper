/**
 * Signal Atlas — Payload Diff Viewer Component
 * Side-by-side JSON comparison viewer showing broken vs. healed payload.
 */

export class PayloadDiffViewer {
  constructor(containerId, options = {}) {
    this.container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    this.brokenPayload = options.brokenPayload || null;
    this.healedPayload = options.healedPayload || null;
    this.render();
  }

  update(brokenPayload, healedPayload) {
    this.brokenPayload = brokenPayload;
    this.healedPayload = healedPayload;
    this.render();
  }

  render() {
    if (!this.container) return;

    if (!this.brokenPayload) {
      this.container.innerHTML = `
        <div class="bg-[#141924] rounded-2xl border border-[#1F2937] p-8 text-center text-[#94A3B8]">
          <div class="w-12 h-12 mx-auto rounded-full bg-[#1F2937] flex items-center justify-center text-gray-400 mb-3">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
          </div>
          <h4 class="text-sm font-semibold text-white">Payload Diff Inspector Idle</h4>
          <p class="text-xs mt-1">Simulate a scraper DOM drift incident above to inspect side-by-side payload transformations.</p>
        </div>
      `;
      return;
    }

    const brokenStr = JSON.stringify(this.brokenPayload, null, 2);
    const healedStr = this.healedPayload ? JSON.stringify(this.healedPayload, null, 2) : "// Awaiting self-healing agent patch generation...";

    this.container.innerHTML = `
      <div class="bg-[#141924] rounded-2xl border border-[#1F2937] overflow-hidden shadow-xl">
        
        <!-- Header -->
        <div class="bg-[#0A0E14] px-5 py-3 border-b border-[#1F2937] flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="text-xs font-mono font-bold text-white uppercase tracking-wider">Payload Diff Viewer</span>
            <span class="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">Side-by-Side</span>
          </div>
          <div class="text-xs font-mono text-[#94A3B8]">
            Collector: <span class="text-emerald-400 font-bold">brightdata_job_harvester_v2</span>
          </div>
        </div>

        <!-- Side-by-Side Code View -->
        <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#1F2937]">
          
          <!-- Broken Column -->
          <div class="p-4 bg-[#0A0E14]/70">
            <div class="flex items-center justify-between pb-2 mb-3 border-b border-[#1F2937]">
              <span class="text-xs font-bold font-mono text-red-400 flex items-center space-x-1.5">
                <span class="w-2 h-2 rounded-full bg-red-500"></span>
                <span>Degraded Input (Broken DOM AST)</span>
              </span>
              <span class="text-[10px] font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">VALIDATION_FAILED</span>
            </div>
            
            <pre class="terminal-font text-xs text-red-200 overflow-x-auto p-3 rounded-lg bg-[#0F141C] border border-red-500/20 leading-relaxed max-h-96"><code>${this.escapeHtml(brokenStr)}</code></pre>

            <div class="mt-3 text-[11px] text-red-400 font-mono bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
              ❌ Null value in required spatial key <code class="bg-red-950 px-1 py-0.5 rounded text-white">location_raw</code>. Collector execution halted.
            </div>
          </div>

          <!-- Healed Column -->
          <div class="p-4 bg-[#0A0E14]/70">
            <div class="flex items-center justify-between pb-2 mb-3 border-b border-[#1F2937]">
              <span class="text-xs font-bold font-mono text-emerald-400 flex items-center space-x-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Transformed Output (Auto-Healed JSON)</span>
              </span>
              <span class="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                ${this.healedPayload ? 'PASSED_AUTO_HEALED' : 'PENDING_REPAIR'}
              </span>
            </div>

            <pre class="terminal-font text-xs text-emerald-200 overflow-x-auto p-3 rounded-lg bg-[#0F141C] border border-emerald-500/20 leading-relaxed max-h-96"><code>${this.escapeHtml(healedStr)}</code></pre>

            ${this.healedPayload ? `
              <div class="mt-3 text-[11px] text-emerald-400 font-mono bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20 flex items-center justify-between">
                <span>✅ Repaired key <code class="bg-emerald-950 px-1 py-0.5 rounded text-white">location_raw</code> &amp; fallback selector attached.</span>
                <span class="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">99.4% Match</span>
              </div>
            ` : `
              <div class="mt-3 text-[11px] text-amber-400 font-mono bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 animate-pulse">
                ⏳ Waiting for AI Repair Agent trigger...
              </div>
            `}
          </div>

        </div>

      </div>
    `;
  }

  escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}
