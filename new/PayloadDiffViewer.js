/**
 * Signal Atlas — Payload Diff Viewer Component (PROJECT / ATLAS Editorial Design System)
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
        <div class="bg-[#050505] border border-[#1F2937] p-8 text-center text-[#8A8A8A] font-mono">
          <div class="text-xs uppercase font-bold text-white mb-1">Payload Diff Inspector Idle</div>
          <p class="text-xs">Simulate a scraper DOM drift incident above to inspect side-by-side payload transformations.</p>
        </div>
      `;
      return;
    }

    const brokenStr = JSON.stringify(this.brokenPayload, null, 2);
    const healedStr = this.healedPayload ? JSON.stringify(this.healedPayload, null, 2) : "// Awaiting self-healing agent patch generation...";

    this.container.innerHTML = `
      <div class="bg-[#050505] border border-[#1F2937] overflow-hidden font-mono">
        
        <!-- Header -->
        <div class="bg-[#0A0A0C] px-5 py-3 border-b border-[#1F2937] flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="text-xs font-mono font-bold text-white uppercase tracking-wider">Payload Diff Viewer</span>
            <span class="text-[10px] px-2 py-0.5 border border-[#E3262E]/40 text-[#E3262E] font-mono uppercase">Side-by-Side</span>
          </div>
          <div class="text-xs font-mono text-[#8A8A8A]">
            COLLECTOR: <span class="text-white font-bold">brightdata_job_harvester_v2</span>
          </div>
        </div>

        <!-- Side-by-Side Code View -->
        <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#1F2937]">
          
          <!-- Broken Column -->
          <div class="p-4 bg-[#050505]">
            <div class="flex items-center justify-between pb-2 mb-3 border-b border-[#1F2937]">
              <span class="text-xs font-bold font-mono text-[#E3262E] flex items-center space-x-1.5 uppercase">
                <span class="w-2 h-2 rounded-full bg-[#E3262E]"></span>
                <span>Degraded Input (Broken DOM AST)</span>
              </span>
              <span class="text-[10px] font-mono text-[#E3262E] bg-red-950/40 px-2 py-0.5 border border-[#E3262E]/40 uppercase">VALIDATION_FAILED</span>
            </div>
            
            <pre class="text-xs text-red-200 overflow-x-auto p-3 bg-[#0A0A0C] border border-[#E3262E]/30 leading-relaxed max-h-96 font-mono"><code>${this.escapeHtml(brokenStr)}</code></pre>

            <div class="mt-3 text-[11px] text-[#E3262E] font-mono bg-red-950/30 p-2.5 border border-[#E3262E]/40">
              ❌ Null value in required spatial key <code class="bg-[#050505] px-1 py-0.5 text-white">location_raw</code>. Collector execution halted.
            </div>
          </div>

          <!-- Healed Column -->
          <div class="p-4 bg-[#050505]">
            <div class="flex items-center justify-between pb-2 mb-3 border-b border-[#1F2937]">
              <span class="text-xs font-bold font-mono text-emerald-400 flex items-center space-x-1.5 uppercase">
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Transformed Output (Auto-Healed JSON)</span>
              </span>
              <span class="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 border border-emerald-500/30 uppercase">
                ${this.healedPayload ? 'PASSED_AUTO_HEALED' : 'PENDING_REPAIR'}
              </span>
            </div>

            <pre class="text-xs text-emerald-200 overflow-x-auto p-3 bg-[#0A0A0C] border border-emerald-500/30 leading-relaxed max-h-96 font-mono"><code>${this.escapeHtml(healedStr)}</code></pre>

            ${this.healedPayload ? `
              <div class="mt-3 text-[11px] text-emerald-400 font-mono bg-emerald-950/30 p-2.5 border border-emerald-500/40 flex items-center justify-between">
                <span>✅ Repaired key <code class="bg-[#050505] px-1 py-0.5 text-white">location_raw</code> &amp; fallback selector attached.</span>
                <span class="text-[10px] bg-emerald-950/60 text-emerald-300 px-2 py-0.5 border border-emerald-500/30">99.4% Match</span>
              </div>
            ` : `
              <div class="mt-3 text-[11px] text-amber-400 font-mono bg-amber-950/30 p-2.5 border border-amber-500/40 animate-pulse">
                ⏳ Waiting for AI Repair Agent trigger...
              </div>
            `}
          </div>

        </div>

      </div>
    `;
  }

  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
