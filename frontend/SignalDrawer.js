/**
 * Signal Atlas — Signal Drawer Component
 * Renders slide-over drawer (desktop) / bottom sheet (mobile) for clicked spatial markers.
 */

export class SignalDrawer {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.signal = null;
    this.isOpen = false;
    this.activeTab = 'overview';
    this.onInspectPipeline = options.onInspectPipeline || (() => {});
    this.render();
  }

  open(signal) {
    this.signal = signal;
    this.isOpen = true;
    this.activeTab = 'overview';
    this.render();
    document.body.classList.add('drawer-open');
  }

  close() {
    this.isOpen = false;
    this.render();
    document.body.classList.remove('drawer-open');
  }

  render() {
    if (!this.container) return;

    if (!this.isOpen || !this.signal) {
      this.container.innerHTML = '';
      return;
    }

    const isCivic = this.signal.id.startsWith('civic');
    const accentColor = isCivic ? '#F59E0B' : '#22C55E';
    const accentBg = isCivic ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';

    this.container.innerHTML = `
      <div class="fixed inset-0 z-50 overflow-hidden">
        
        <!-- Backdrop Overlay -->
        <div id="drawer-backdrop" class="absolute inset-0 bg-black/70 backdrop-blur-sm drawer-overlay cursor-pointer"></div>

        <!-- Slide-Over Drawer Container -->
        <div class="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <div class="w-screen max-w-xl bg-[#141924] border-l border-[#1F2937] text-white flex flex-col shadow-2xl drawer-content">
            
            <!-- Drawer Header -->
            <div class="p-6 bg-[#0A0E14] border-b border-[#1F2937] flex items-start justify-between">
              <div class="space-y-1 pr-4">
                <div class="flex items-center space-x-2">
                  <span class="px-2.5 py-0.5 rounded text-[11px] font-mono border ${accentBg}">
                    ${isCivic ? 'Civic Issue · Seeded Data' : 'Opportunity Cluster'}
                  </span>
                  <span class="text-xs text-[#94A3B8] font-mono">${this.signal.city}</span>
                </div>
                <h3 class="text-xl font-bold text-white tracking-tight leading-snug">${this.signal.title}</h3>
              </div>
              <button id="drawer-close-btn" class="p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1F2937] transition" aria-label="Close drawer">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <!-- Emergence Score Badge + Gloss Banner (Section 2 Requirement) -->
            <div class="p-4 bg-[#0F141C] border-b border-[#1F2937] flex items-center justify-between gap-4">
              <div class="flex items-center space-x-3">
                <div class="px-3.5 py-2 rounded-xl bg-[#141924] border border-[#1F2937] font-mono text-center">
                  <div class="text-[10px] text-[#94A3B8] uppercase">S_emergence</div>
                  <div class="text-xl font-extrabold" style="color: ${accentColor}">${this.signal.emergenceScore.toFixed(2)}</div>
                </div>
                <div>
                  <div class="text-xs font-bold text-white flex items-center space-x-1.5">
                    <span>Signal Velocity: <strong style="color: ${accentColor}">${this.signal.signalVelocity}</strong></span>
                    <span class="text-[11px] font-mono text-emerald-400 font-semibold">${this.signal.scoreChange}</span>
                  </div>
                  <!-- One-Line Plain-Language Gloss -->
                  <div class="text-xs text-[#94A3B8] mt-0.5 italic">
                    "${this.signal.confidenceGloss}"
                  </div>
                </div>
              </div>
            </div>

            <!-- Navigation Tabs -->
            <div class="flex border-b border-[#1F2937] bg-[#0A0E14] px-6 text-xs font-medium">
              <button id="tab-overview" class="py-3 px-4 border-b-2 font-mono transition ${this.activeTab === 'overview' ? 'border-emerald-500 text-white font-bold' : 'border-transparent text-[#94A3B8] hover:text-white'}">
                Overview &amp; Radar
              </button>
              <button id="tab-sources" class="py-3 px-4 border-b-2 font-mono transition ${this.activeTab === 'sources' ? 'border-emerald-500 text-white font-bold' : 'border-transparent text-[#94A3B8] hover:text-white'}">
                Sources (${this.signal.sources ? this.signal.sources.length : 0})
              </button>
              <button id="tab-timeline" class="py-3 px-4 border-b-2 font-mono transition ${this.activeTab === 'timeline' ? 'border-emerald-500 text-white font-bold' : 'border-transparent text-[#94A3B8] hover:text-white'}">
                Timeline
              </button>
              <button id="tab-json" class="py-3 px-4 border-b-2 font-mono transition ${this.activeTab === 'json' ? 'border-emerald-500 text-white font-bold' : 'border-transparent text-[#94A3B8] hover:text-white'}">
                Raw JSON
              </button>
            </div>

            <!-- Drawer Scrollable Content -->
            <div class="flex-1 overflow-y-auto p-6 space-y-6">
              ${this.renderTabContent()}
            </div>

            <!-- Drawer Footer Actions -->
            <div class="p-4 bg-[#0A0E14] border-t border-[#1F2937] flex items-center justify-between gap-3">
              <button id="track-cluster-btn" class="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0A0E14] font-semibold text-xs transition flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-500/10">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                <span>Track Cluster Alerts</span>
              </button>
              <button id="inspect-source-btn" class="flex-1 py-2.5 rounded-xl bg-[#1F2937] hover:bg-gray-700 text-white font-medium text-xs border border-[#1F2937] transition flex items-center justify-center space-x-1.5">
                <svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                <span>Inspect Collector Health</span>
              </button>
            </div>

          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  renderTabContent() {
    if (this.activeTab === 'sources') {
      return `
        <div class="space-y-4">
          <h4 class="text-xs font-mono font-bold text-white uppercase tracking-wider">Scraped &amp; Ingested Data Sources</h4>
          <div class="space-y-3">
            ${(this.signal.sources || []).map(s => `
              <div class="p-3.5 rounded-xl bg-[#0A0E14] border border-[#1F2937] flex items-center justify-between">
                <div>
                  <div class="text-xs font-bold text-white">${s.name}</div>
                  <div class="text-[11px] text-[#94A3B8] font-mono mt-0.5">Type: ${s.type} · ${s.count} records synthesized</div>
                </div>
                <span class="text-[10px] px-2 py-0.5 rounded font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ${s.status}
                </span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (this.activeTab === 'timeline') {
      return `
        <div class="space-y-4">
          <h4 class="text-xs font-mono font-bold text-white uppercase tracking-wider">Cluster Convergence Sequence</h4>
          <div class="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#1F2937]">
            ${(this.signal.timeline || []).map(t => `
              <div class="relative">
                <div class="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#141924]"></div>
                <div class="text-[11px] font-mono text-emerald-400 font-semibold">${t.timestamp}</div>
                <div class="text-xs text-[#F3F4F6] mt-0.5 leading-relaxed">${t.label}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (this.activeTab === 'json') {
      return `
        <div class="space-y-3">
          <div class="flex items-center justify-between text-xs font-mono text-[#94A3B8]">
            <span>Raw Normalized JSON Payload</span>
            <span class="text-emerald-400">JSON Schema v2.1</span>
          </div>
          <pre class="terminal-font text-xs text-emerald-300 p-4 rounded-xl bg-[#0A0E14] border border-[#1F2937] overflow-x-auto max-h-96 leading-relaxed"><code>${JSON.stringify(this.signal.rawPayload, null, 2)}</code></pre>
        </div>
      `;
    }

    // Default Overview Tab
    const m = this.signal.radarMetrics || { diversity: 80, velocity: 85, density: 90, recency: 88 };
    return `
      <div class="space-y-6">
        
        <!-- Metrics Grid -->
        <div class="grid grid-cols-2 gap-3">
          <div class="p-3.5 rounded-xl bg-[#0A0E14] border border-[#1F2937]">
            <div class="text-[11px] text-[#94A3B8] font-mono">Source Diversity</div>
            <div class="text-xl font-bold font-mono text-white mt-1">${m.diversity}%</div>
            <div class="w-full bg-[#1F2937] h-1.5 rounded-full mt-2 overflow-hidden">
              <div class="bg-emerald-500 h-full rounded-full" style="width: ${m.diversity}%"></div>
            </div>
          </div>
          
          <div class="p-3.5 rounded-xl bg-[#0A0E14] border border-[#1F2937]">
            <div class="text-[11px] text-[#94A3B8] font-mono">Signal Velocity</div>
            <div class="text-xl font-bold font-mono text-white mt-1">${m.velocity}%</div>
            <div class="w-full bg-[#1F2937] h-1.5 rounded-full mt-2 overflow-hidden">
              <div class="bg-indigo-400 h-full rounded-full" style="width: ${m.velocity}%"></div>
            </div>
          </div>

          <div class="p-3.5 rounded-xl bg-[#0A0E14] border border-[#1F2937]">
            <div class="text-[11px] text-[#94A3B8] font-mono">Spatial Density</div>
            <div class="text-xl font-bold font-mono text-white mt-1">${m.density}%</div>
            <div class="w-full bg-[#1F2937] h-1.5 rounded-full mt-2 overflow-hidden">
              <div class="bg-amber-400 h-full rounded-full" style="width: ${m.density}%"></div>
            </div>
          </div>

          <div class="p-3.5 rounded-xl bg-[#0A0E14] border border-[#1F2937]">
            <div class="text-[11px] text-[#94A3B8] font-mono">Recency Score</div>
            <div class="text-xl font-bold font-mono text-white mt-1">${m.recency}%</div>
            <div class="w-full bg-[#1F2937] h-1.5 rounded-full mt-2 overflow-hidden">
              <div class="bg-teal-400 h-full rounded-full" style="width: ${m.recency}%"></div>
            </div>
          </div>
        </div>

        <!-- Primary Data Summary -->
        <div class="p-4 rounded-xl bg-[#0A0E14] border border-[#1F2937] space-y-2">
          <h4 class="text-xs font-mono font-bold text-white uppercase tracking-wider">Spatial Convergence Assessment</h4>
          <p class="text-xs text-[#94A3B8] leading-relaxed">
            Multi-source anomaly detector registered simultaneous hiring spikes, commercial permit applications, and regulatory filings within a 2.4km radius in ${this.signal.city}.
          </p>
        </div>

      </div>
    `;
  }

  attachEvents() {
    const backdrop = this.container.querySelector('#drawer-backdrop');
    const closeBtn = this.container.querySelector('#drawer-close-btn');
    const inspectBtn = this.container.querySelector('#inspect-source-btn');
    const trackBtn = this.container.querySelector('#track-cluster-btn');

    if (backdrop) backdrop.addEventListener('click', () => this.close());
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());
    if (inspectBtn) inspectBtn.addEventListener('click', () => { this.close(); this.onInspectPipeline(); });
    if (trackBtn) trackBtn.addEventListener('click', () => {
      alert(`Cluster "${this.signal.title}" is now added to active spatial watchlist.`);
    });

    ['overview', 'sources', 'timeline', 'json'].forEach(tabKey => {
      const tabBtn = this.container.querySelector(`#tab-${tabKey}`);
      if (tabBtn) {
        tabBtn.addEventListener('click', () => {
          this.activeTab = tabKey;
          this.render();
        });
      }
    });
  }
}
