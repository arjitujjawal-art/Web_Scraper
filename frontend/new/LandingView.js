/**
 * Signal Atlas — Landing View Component (Page 1)
 */

export class LandingView {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.onNavigate = options.onNavigate || (() => {});
    this.render();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="topographic-bg min-h-[calc(100vh-64px)] pb-16">
        
        <!-- Hero Section -->
        <section class="max-w-7xl mx-auto px-4 lg:px-8 pt-12 lg:pt-20 pb-12">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <!-- Hero Text Content -->
            <div class="lg:col-span-7 space-y-6">
              <div class="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Spatial Intelligence & Scraper Observability Engine</span>
              </div>
              
              <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
                Detect early spatial signals <span class="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400">before they emerge</span>
              </h1>
              
              <p class="text-lg text-[#94A3B8] leading-relaxed max-w-2xl">
                Signal Atlas ingests unstructured public web records — job postings, patent filings, municipal agendas, commercial permits — synthesizing spatio-temporal convergence clusters with self-healing scraper pipelines.
              </p>

              <!-- Action CTAs -->
              <div class="flex flex-wrap gap-4 pt-2">
                <button id="hero-cta-map" class="px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0A0E14] font-semibold transition shadow-lg shadow-emerald-500/20 flex items-center space-x-2">
                  <span>Explore Convergence Map</span>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                </button>

                <button id="hero-cta-pipeline" class="px-6 py-3.5 rounded-xl bg-[#141924] hover:bg-[#1E2536] text-white border border-[#1F2937] font-medium transition flex items-center space-x-2">
                  <svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                  <span>Inspect Self-Healing Pipeline</span>
                </button>
              </div>

              <!-- Quick Metrics Row -->
              <div class="pt-6 border-t border-[#1F2937]/80 grid grid-cols-3 gap-4 text-left">
                <div>
                  <div class="text-2xl font-bold font-mono text-white">4 Sources</div>
                  <div class="text-xs text-[#94A3B8]">Ingested & Cross-Linked</div>
                </div>
                <div>
                  <div class="text-2xl font-bold font-mono text-emerald-400">&lt; 1.4s</div>
                  <div class="text-xs text-[#94A3B8]">Mean Self-Healing Time</div>
                </div>
                <div>
                  <div class="text-2xl font-bold font-mono text-indigo-400">99.8%</div>
                  <div class="text-xs text-[#94A3B8]">Pipeline Uptime</div>
                </div>
              </div>
            </div>

            <!-- Hero Interactive Teaser Card -->
            <div class="lg:col-span-5">
              <div class="relative rounded-2xl bg-[#141924] border border-[#1F2937] p-6 shadow-2xl overflow-hidden group">
                
                <!-- Teaser Label Header -->
                <div class="flex items-center justify-between pb-4 mb-4 border-b border-[#1F2937]">
                  <div class="flex items-center space-x-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span class="text-xs font-mono text-white font-medium uppercase tracking-wider">Cluster Preview</span>
                  </div>
                  <span class="text-[11px] px-2.5 py-0.5 rounded-full bg-[#1F2937] text-[#94A3B8] font-mono">
                    Live preview · sample data
                  </span>
                </div>

                <!-- Teaser Interactive Pulse Visual -->
                <div class="relative h-48 bg-[#0A0E14] rounded-xl border border-[#1F2937] p-4 flex items-center justify-around overflow-hidden">
                  
                  <!-- Topo subtle lines -->
                  <div class="absolute inset-0 opacity-20 bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:16px_16px]"></div>

                  <!-- Opportunity Pulse Marker -->
                  <div class="relative z-10 text-center cursor-pointer transform hover:scale-105 transition" id="teaser-opp-pin">
                    <div class="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center marker-pulse-opp shadow-lg shadow-emerald-500/20">
                      <span class="text-xs font-mono font-bold text-emerald-400">8.42</span>
                    </div>
                    <div class="mt-2 text-xs font-bold text-white">Austin R&D Campus</div>
                    <div class="text-[10px] text-emerald-400 font-mono">+140% velocity</div>
                  </div>

                  <!-- Divider line -->
                  <div class="h-24 w-px bg-[#1F2937]"></div>

                  <!-- Civic Pulse Marker -->
                  <div class="relative z-10 text-center cursor-pointer transform hover:scale-105 transition" id="teaser-civic-pin">
                    <div class="w-12 h-12 mx-auto rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center marker-pulse-civic shadow-lg shadow-amber-500/20">
                      <span class="text-xs font-mono font-bold text-amber-400">8.10</span>
                    </div>
                    <div class="mt-2 text-xs font-bold text-white">Austin Drainage Resilience</div>
                    <div class="text-[10px] text-amber-400 font-mono">Seeded Civic Demo</div>
                  </div>

                </div>

                <!-- Teaser Card Footer info -->
                <div class="mt-4 pt-3 text-xs text-[#94A3B8] flex items-center justify-between">
                  <span>S_emergence calculation active</span>
                  <button id="teaser-explore-btn" class="text-emerald-400 hover:text-emerald-300 font-medium flex items-center space-x-1 transition">
                    <span>Inspect Cluster</span>
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                  </button>
                </div>

              </div>
            </div>

          </div>
        </section>

        <!-- Value Proposition Pillars -->
        <section class="max-w-7xl mx-auto px-4 lg:px-8 py-12 border-t border-[#1F2937]">
          <div class="text-center max-w-3xl mx-auto mb-12">
            <h2 class="text-2xl sm:text-3xl font-bold text-white tracking-tight">Built for Spatio-Temporal Intelligence</h2>
            <p class="text-sm text-[#94A3B8] mt-2">Combining multi-source spatial clustering algorithms with autonomous collector pipeline reliability.</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <!-- Pillar 1 -->
            <div class="bg-[#141924] rounded-2xl border border-[#1F2937] p-6 hover:border-emerald-500/40 transition group">
              <div class="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-110 transition">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A2 2 0 013 15.488V5.512a2 2 0 011.553-1.954L9 2.236l6 3 5.447-2.724A2 2 0 0123 4.464v9.976a2 2 0 01-1.553 1.954L15 19.118l-6-3z"/></svg>
              </div>
              <h3 class="text-lg font-bold text-white mb-2">Signal Convergence Engine</h3>
              <p class="text-sm text-[#94A3B8] leading-relaxed">
                Works across domains — from commercial R&D expansion to civic infrastructure shifts — synthesizing independent public data signals into spatial density indexes.
              </p>
            </div>

            <!-- Pillar 2 -->
            <div class="bg-[#141924] rounded-2xl border border-[#1F2937] p-6 hover:border-indigo-500/40 transition group">
              <div class="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-5 group-hover:scale-110 transition">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
              </div>
              <h3 class="text-lg font-bold text-white mb-2">Self-Healing Scraper Pipeline</h3>
              <p class="text-sm text-[#94A3B8] leading-relaxed">
                Autonomous DOM drift detection and Gemini LLM schema auto-repair ensure data pipelines never break when public websites alter CSS classes or structural layouts.
              </p>
            </div>

            <!-- Pillar 3 -->
            <div class="bg-[#141924] rounded-2xl border border-[#1F2937] p-6 hover:border-amber-500/40 transition group">
              <div class="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-5 group-hover:scale-110 transition">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
              </div>
              <h3 class="text-lg font-bold text-white mb-2">Emergence Scoring Math</h3>
              <p class="text-sm text-[#94A3B8] leading-relaxed">
                Multi-source density velocity formulas ($S_{emergence}$) rank geographical clusters by confidence level, signal entropy, and recency baseline deltas.
              </p>
            </div>

          </div>
        </section>

        <!-- Footer with Bright Data credit & compliance micro-disclaimer -->
        <footer class="max-w-7xl mx-auto px-4 lg:px-8 pt-12 pb-6 border-t border-[#1F2937] text-xs text-[#94A3B8]">
          <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="flex items-center space-x-2">
              <span>Signal Atlas &copy; 2026. Built with Bright Data Web Scraper APIs.</span>
            </div>
            <div class="text-center sm:text-right text-[11px] text-gray-500">
              <span>Not affiliated with any municipal entity · Data sourced strictly from public listings &amp; registries</span>
            </div>
          </div>
        </footer>

      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    const ctaMap = this.container.querySelector('#hero-cta-map');
    const ctaPipeline = this.container.querySelector('#hero-cta-pipeline');
    const teaserExplore = this.container.querySelector('#teaser-explore-btn');
    const oppPin = this.container.querySelector('#teaser-opp-pin');

    if (ctaMap) ctaMap.addEventListener('click', () => this.onNavigate('map', 'opportunities'));
    if (ctaPipeline) ctaPipeline.addEventListener('click', () => this.onNavigate('pipeline', 'opportunities'));
    if (teaserExplore) teaserExplore.addEventListener('click', () => this.onNavigate('map', 'opportunities'));
    if (oppPin) oppPin.addEventListener('click', () => this.onNavigate('map', 'opportunities'));
  }
}
