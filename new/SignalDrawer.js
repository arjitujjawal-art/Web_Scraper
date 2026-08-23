/**
 * Signal Atlas — Signal Drawer Component (PROJECT / ATLAS Editorial Design System)
 * Renders slide-over drawer for clicked spatial markers.
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
    const accentColor = isCivic ? '#F59E0B' : '#E3262E';
    const accentBg = isCivic ? 'bg-amber-950/60 border-amber-500/40 text-amber-400' : 'bg-red-950/60 border-[#E3262E]/60 text-[#E3262E]';

    this.container.innerHTML = `
      <div class="fixed inset-0 z-50 overflow-hidden font-mono">
        
        <!-- Backdrop Overlay -->
        <div id="drawer-backdrop" class="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"></div>

        <!-- Slide-Over Drawer Container -->
        <div class="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <div class="w-screen max-w-xl bg-[#0A0A0C] border-l border-[#1F2937] text-white flex flex-col shadow-2xl">
            
            <!-- Drawer Header -->
            <div class="p-6 bg-[#050505] border-b border-[#1F2937] flex items-start justify-between">
              <div class="space-y-1.5 pr-4">
                <div class="flex items-center space-x-2">
                  <span class="px-2.5 py-0.5 text-[10px] font-mono border uppercase tracking-wider ${accentBg}">
                    ${isCivic ? 'Civic Issue · Seeded Data' : 'Opportunity Cluster'}
                  </span>
                  <span class="text-xs text-[#8A8A8A] font-mono uppercase">${this.signal.city}</span>
                </div>
                <h3 class="font-serif text-xl font-bold text-white uppercase tracking-tight leading-snug">${this.signal.title}</h3>
              </div>
              <button id="drawer-close-btn" class="p-2 text-[#8A8A8A] hover:text-white hover:bg-[#1F2937] transition" aria-label="Close drawer">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <!-- Emergence Score Badge + Gloss Banner -->
            <div class="p-4 bg-[#050505] border-b border-[#1F2937] flex items-center justify-between gap-4">
              <div class="flex items-center space-x-3">
                <div class="px-3.5 py-2 bg-[#0A0A0C] border border-[#1F2937] font-mono text-center">
                  <div class="text-[10px] text-[#8A8A8A] uppercase">S_emergence</div>
                  <div class="text-xl font-extrabold" style="color: ${accentColor}">${this.signal.emergenceScore.toFixed(2)}</div>
                </div>
                <div>
                  <div class="text-xs font-bold text-white flex items-center space-x-1.5 font-mono">
                    <span>SIGNAL VELOCITY: <strong style="color: ${accentColor}">${this.signal.signalVelocity}</strong></span>
                    <span class="text-[11px] font-mono text-emerald-400 font-semibold">${this.signal.scoreChange}</span>
                  </div>
                  <div class="text-xs text-[#8A8A8A] mt-0.5 italic font-mono">
                    "${this.signal.confidenceGloss}"
                  </div>
                </div>
              </div>
            </div>

            <!-- Navigation Tabs -->
            <div class="flex border-b border-[#1F2937] bg-[#050505] px-6 text-xs font-mono">
              <button id="tab-overview" class="py-3 px-4 border-b-2 uppercase transition ${this.activeTab === 'overview' ? 'border-[#E3262E] text-white font-bold' : 'border-transparent text-[#8A8A8A] hover:text-white'}">
                Overview &amp; Metrics
              </button>
              <button id="tab-sources" class="py-3 px-4 border-b-2 uppercase transition ${this.activeTab === 'sources' ? 'border-[#E3262E] text-white font-bold' : 'border-transparent text-[#8A8A8A] hover:text-white'}">
                Sources (${this.signal.sources ? this.signal.sources.length : 0})
              </button>
              <button id="tab-timeline" class="py-3 px-4 border-b-2 uppercase transition ${this.activeTab === 'timeline' ? 'border-[#E3262E] text-white font-bold' : 'border-transparent text-[#8A8A8A] hover:text-white'}">
                Timeline
              </button>
              <button id="tab-json" class="py-3 px-4 border-b-2 uppercase transition ${this.activeTab === 'json' ? 'border-[#E3262E] text-white font-bold' : 'border-transparent text-[#8A8A8A] hover:text-white'}">
                Raw JSON
              </button>
            </div>

            <!-- Tab Content Body -->
            <div class="flex-1 overflow-y-auto p-6 space-y-6">
              ${this.renderTabContent()}
            </div>

            <!-- Drawer Footer -->
            <div class="p-4 bg-[#050505] border-t border-[#1F2937] flex items-center justify-between text-xs font-mono">
              <span class="text-[#8A8A8A]">Updated: ${this.signal.lastUpdated || '2 mins ago'}</span>
              <button id="drawer-inspect-pipeline-btn" class="px-3 py-1.5 bg-[#E3262E] text-white font-bold uppercase transition hover:bg-[#C11B22]">
                Inspect Pipeline Health →
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
        <div class="space-y-3 font-mono">
          <div class="text-xs text-[#8A8A8A] uppercase tracking-wider">Ingested Public Sources (${this.signal.sources.length})</div>
          ${this.signal.sources.map(src => `
            <div class="p-4 bg-[#050505] border border-[#1F2937] space-y-1">
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-white">${src.name}</span>
                <span class="px-2 py-0.5 text-[10px] bg-[#0A0A0C] border border-[#1F2937] text-emerald-400 font-mono">${src.status}</span>
              </div>
              <div class="text-xs text-[#8A8A8A] flex justify-between pt-1">
                <span>Category: ${src.type}</span>
                <span>Signal Count: <strong>${src.count}</strong></span>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (this.activeTab === 'timeline') {
      return `
        <div class="space-y-4 font-mono">
          <div class="text-xs text-[#8A8A8A] uppercase tracking-wider">Chronological Evidence Trail</div>
          <div class="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#1F2937]">
            ${this.signal.timeline ? this.signal.timeline.map(t => `
              <div class="relative pl-7 space-y-0.5">
                <div class="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-[#E3262E] border-2 border-[#050505]"></div>
                <div class="text-[10px] text-[#E3262E] font-mono">${t.timestamp}</div>
                <div class="text-xs text-white leading-relaxed font-mono">${t.label}</div>
              </div>
            `).join('') : '<div class="text-xs text-[#8A8A8A]">No timeline data recorded.</div>'}
          </div>
        </div>
      `;
    }

    if (this.activeTab === 'json') {
      return `
        <div class="space-y-2 font-mono">
          <div class="text-xs text-[#8A8A8A] uppercase tracking-wider">Raw Collector Ingestion Payload</div>
          <pre class="p-4 bg-[#050505] border border-[#1F2937] text-xs text-emerald-400 overflow-x-auto rounded-none font-mono">${JSON.stringify(this.signal.rawPayload || this.signal, null, 2)}</pre>
        </div>
      `;
    }

    // Default: Overview Tab
    const m = this.signal.radarMetrics || { diversity: 85, velocity: 80, density: 90, recency: 88 };
    return `
      <div class="space-y-6 font-mono">
        <div class="space-y-3">
          <div class="text-xs text-[#8A8A8A] uppercase tracking-wider">Spatio-Temporal Convergence Density</div>
          <div class="grid grid-cols-2 gap-3">
            <div class="p-3 bg-[#050505] border border-[#1F2937]">
              <div class="text-[10px] text-[#8A8A8A]">SOURCE DIVERSITY</div>
              <div class="text-lg font-bold text-white">${m.diversity}%</div>
            </div>
            <div class="p-3 bg-[#050505] border border-[#1F2937]">
              <div class="text-[10px] text-[#8A8A8A]">SIGNAL VELOCITY</div>
              <div class="text-lg font-bold text-[#E3262E]">${m.velocity}%</div>
            </div>
            <div class="p-3 bg-[#050505] border border-[#1F2937]">
              <div class="text-[10px] text-[#8A8A8A]">SPATIAL DENSITY</div>
              <div class="text-lg font-bold text-white">${m.density}%</div>
            </div>
            <div class="p-3 bg-[#050505] border border-[#1F2937]">
              <div class="text-[10px] text-[#8A8A8A]">RECENCY DECAY</div>
              <div class="text-lg font-bold text-white">${m.recency}%</div>
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <div class="text-xs text-[#8A8A8A] uppercase tracking-wider">Scraper Collector Origin</div>
          <div class="p-4 bg-[#050505] border border-[#1F2937] text-xs space-y-1 text-[#8A8A8A]">
            <div>Collector ID: <strong class="text-white font-mono">${this.signal.rawPayload ? this.signal.rawPayload.primary_collector || 'brightdata_job_harvester_v2' : 'brightdata_harvester'}</strong></div>
            <div>Source Categories Ingested: <strong class="text-white font-mono">${this.signal.category}</strong></div>
          </div>
        </div>
      </div>
    `;
  }

  attachEvents() {
    const backdrop = this.container.querySelector('#drawer-backdrop');
    const closeBtn = this.container.querySelector('#drawer-close-btn');
    const inspectBtn = this.container.querySelector('#drawer-inspect-pipeline-btn');

    if (backdrop) backdrop.addEventListener('click', () => this.close());
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    if (inspectBtn) {
      inspectBtn.addEventListener('click', () => {
        this.close();
        this.onInspectPipeline();
      });
    }

    const tabOverview = this.container.querySelector('#tab-overview');
    const tabSources = this.container.querySelector('#tab-sources');
    const tabTimeline = this.container.querySelector('#tab-timeline');
    const tabJson = this.container.querySelector('#tab-json');

    if (tabOverview) tabOverview.addEventListener('click', () => { this.activeTab = 'overview'; this.render(); });
    if (tabSources) tabSources.addEventListener('click', () => { this.activeTab = 'sources'; this.render(); });
    if (tabTimeline) tabTimeline.addEventListener('click', () => { this.activeTab = 'timeline'; this.render(); });
    if (tabJson) tabJson.addEventListener('click', () => { this.activeTab = 'json'; this.render(); });
  }
}
