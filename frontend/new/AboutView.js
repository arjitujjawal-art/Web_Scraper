/**
 * Signal Atlas — Borderless Cinematic Animated About View (PROJECT / ATLAS Editorial Design System)
 */

export class AboutView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.render();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="space-y-32 max-w-6xl mx-auto px-4 font-mono pb-24 relative overflow-hidden">
        
        <!-- Ambient Background Scanning Laser Line -->
        <div class="laser-scanner pointer-events-none"></div>

        <!-- ==========================================
             01. HERO / FEATURED QUOTE
             ========================================== -->
        <section class="relative text-center space-y-8 pt-8 reveal-block">
          <!-- Giant Background Watermark -->
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-serif text-[18vw] font-black text-[#E3262E]/[0.03] select-none pointer-events-none leading-none">
            ATLAS
          </div>

          <div class="inline-flex items-center space-x-3 px-4 py-1.5 bg-[#E3262E]/10 border-y border-[#E3262E]/40 text-[#E3262E] text-xs font-mono uppercase tracking-[0.3em]">
            <span class="w-2 h-2 rounded-full bg-[#E3262E] animate-ping"></span>
            <span>01 // THE CORE THESIS</span>
          </div>

          <!-- Featured Quote -->
          <blockquote class="font-serif text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white uppercase tracking-tight max-w-5xl mx-auto leading-[1.08] relative z-10">
            "WE DON'T SCRAPE OPPORTUNITIES — WE SCRAPE THE SIGNALS THAT REVEAL WHERE OPPORTUNITIES ARE <span class="text-[#E3262E] drop-shadow-[0_0_20px_rgba(227,38,46,0.5)]">ABOUT TO EMERGE."</span>
          </blockquote>

          <p class="text-xs sm:text-sm text-[#8A8A8A] max-w-3xl mx-auto font-mono leading-relaxed uppercase tracking-widest relative z-10 pt-2">
            Signal Atlas shifts web data extraction from passive list-gathering to predictive spatial intelligence. Born out of the <strong class="text-white">"Into the Scrape-Verse"</strong> hackathon, we built this platform to see past the noise and detect geographic terrain before it becomes entirely visible.
          </p>
        </section>

        <!-- ==========================================
             02. THE PARADIGM SHIFT (PROBLEM VS SOLUTION)
             ========================================== -->
        <section class="relative space-y-12 reveal-block">
          <!-- Section Tag Header -->
          <div class="flex items-center justify-between border-b border-[#E3262E]/30 pb-4">
            <div class="font-serif text-2xl lg:text-4xl font-extrabold text-white uppercase tracking-tight">
              02 // THE PARADIGM SHIFT
            </div>
            <div class="text-xs text-[#E3262E] font-mono tracking-widest uppercase">
              REACTIVE LISTINGS VS. PREDICTIVE CONVERGENCE
            </div>
          </div>

          <!-- Side-by-Side Borderless Typography Columns -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 relative">
            
            <!-- Center Vertical Divider Laser Line -->
            <div class="hidden lg:block absolute top-0 bottom-0 left-1/2 w-px bg-gradient-to-b from-transparent via-[#E3262E]/40 to-transparent -translate-x-1/2"></div>

            <!-- Problem Column (No Box Borders!) -->
            <div class="space-y-4 group p-2 hover:bg-[#E3262E]/[0.02] transition-colors duration-500">
              <div class="flex items-center space-x-3 text-red-500 font-mono text-xs tracking-widest uppercase">
                <span class="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                <span>THE REACTIVE DATA PROBLEM</span>
              </div>
              <h3 class="font-serif text-2xl font-bold text-white uppercase tracking-tight group-hover:text-red-400 transition-colors">
                CONVENTIONAL SCRAPERS ARE TOO LATE
              </h3>
              <p class="text-xs text-[#8A8A8A] leading-relaxed font-mono">
                Conventional web scrapers and analytics engines are inherently reactive. They collect data on opportunities that are already formal, listed, and saturated—such as job postings, public tenders, or active event registrations.
              </p>
              <div class="text-xs text-red-400 font-mono pt-3 border-t border-red-950/60 uppercase tracking-wider">
                ⚠️ By the time a listing appears on major aggregators, the market shift has already occurred, and competition is fierce.
              </div>
            </div>

            <!-- Solution Column (No Box Borders!) -->
            <div class="space-y-4 group p-2 hover:bg-[#E3262E]/[0.02] transition-colors duration-500">
              <div class="flex items-center space-x-3 text-emerald-400 font-mono text-xs tracking-widest uppercase">
                <span class="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                <span>OUR CONVERGENCE SOLUTION</span>
              </div>
              <h3 class="font-serif text-2xl font-bold text-white uppercase tracking-tight group-hover:text-emerald-400 transition-colors">
                INGESTING EARLY UNSTRUCTURED SIGNALS
              </h3>
              <p class="text-xs text-[#8A8A8A] leading-relaxed font-mono">
                Instead of scraping formal job boards, Signal Atlas continuously ingests early public signals. We track university research lab announcements, corporate press releases, incubator portfolio expansions, and local meetup launches across multiple independent web sources.
              </p>
              <div class="text-xs text-emerald-400 font-mono pt-3 border-t border-emerald-950/60 uppercase tracking-wider">
                ⚡ By detecting <strong class="text-white">Signal Convergence</strong>—clusters of distinct early signals occurring within a shared geography and technical domain—our engine highlights emerging opportunity ecosystems weeks or months early.
              </div>
            </div>

          </div>
        </section>

        <!-- ==========================================
             03. CORE PLATFORM CAPABILITIES (BORDERLESS STREAM)
             ========================================== -->
        <section class="relative space-y-12 reveal-block">
          <!-- Section Header -->
          <div class="flex items-center justify-between border-b border-[#E3262E]/30 pb-4">
            <div class="font-serif text-2xl lg:text-4xl font-extrabold text-white uppercase tracking-tight">
              03 // PLATFORM CAPABILITIES
            </div>
            <div class="text-xs text-[#E3262E] font-mono tracking-widest uppercase">
              FOUR CORE INTELLIGENCE MODULES
            </div>
          </div>

          <!-- 4 Floating Typography Rows (No Box Borders!) -->
          <div class="space-y-10">
            
            <!-- Capability 01 -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pb-8 border-b border-[#1F2937]/60 group hover:border-[#E3262E]/60 transition-all duration-500">
              <div class="lg:col-span-1 font-serif text-3xl font-extrabold text-[#E3262E] group-hover:scale-110 transition-transform">
                01
              </div>
              <div class="lg:col-span-4">
                <div class="text-[10px] text-[#E3262E] tracking-widest uppercase mb-1">LEAFLET / MAPBOX UI</div>
                <h3 class="font-serif text-xl font-bold text-white uppercase tracking-tight group-hover:text-[#E3262E] transition-colors">
                  PREDICTIVE SPATIAL INTELLIGENCE
                </h3>
              </div>
              <div class="lg:col-span-7 text-xs text-[#8A8A8A] font-mono leading-relaxed">
                A centralized, dark-themed Mapbox/Leaflet UI displaying geographic convergence hubs, signal density vectors, and underlying data feeds in real time.
              </div>
            </div>

            <!-- Capability 02 -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pb-8 border-b border-[#1F2937]/60 group hover:border-[#E3262E]/60 transition-all duration-500">
              <div class="lg:col-span-1 font-serif text-3xl font-extrabold text-[#E3262E] group-hover:scale-110 transition-transform">
                02
              </div>
              <div class="lg:col-span-4">
                <div class="text-[10px] text-[#E3262E] tracking-widest uppercase mb-1">TIME-DECAY ALGORITHM</div>
                <h3 class="font-serif text-xl font-bold text-white uppercase tracking-tight group-hover:text-[#E3262E] transition-colors">
                  CONVERGENCE SCORING ENGINE
                </h3>
              </div>
              <div class="lg:col-span-7 text-xs text-[#8A8A8A] font-mono leading-relaxed">
                Grouping signals by city and domain, our platform applies a mathematical time-decay algorithm ($S = \sum w \cdot e^{-0.1 \cdot \text{days}}$) to compute an actionable, decomposable Emergence Score.
              </div>
            </div>

            <!-- Capability 03 -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pb-8 border-b border-[#1F2937]/60 group hover:border-[#E3262E]/60 transition-all duration-500">
              <div class="lg:col-span-1 font-serif text-3xl font-extrabold text-[#E3262E] group-hover:scale-110 transition-transform">
                03
              </div>
              <div class="lg:col-span-4">
                <div class="text-[10px] text-[#E3262E] tracking-widest uppercase mb-1">GEMINI AI RECOVERY</div>
                <h3 class="font-serif text-xl font-bold text-white uppercase tracking-tight group-hover:text-[#E3262E] transition-colors">
                  AUTOMATED SELF-HEALING
                </h3>
              </div>
              <div class="lg:col-span-7 text-xs text-[#8A8A8A] font-mono leading-relaxed">
                Reliability is built into our core. Our pipeline features an automated failure loop that detects target site DOM mutations, holds the degraded state, and instantly executes a JSON recovery using AI.
              </div>
            </div>

            <!-- Capability 04 -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pb-8 border-b border-[#1F2937]/60 group hover:border-[#E3262E]/60 transition-all duration-500">
              <div class="lg:col-span-1 font-serif text-3xl font-extrabold text-[#E3262E] group-hover:scale-110 transition-transform">
                04
              </div>
              <div class="lg:col-span-4">
                <div class="text-[10px] text-[#E3262E] tracking-widest uppercase mb-1">SCRAPER STUDIO</div>
                <h3 class="font-serif text-xl font-bold text-white uppercase tracking-tight group-hover:text-[#E3262E] transition-colors">
                  CUSTOM AI COLLECTORS
                </h3>
              </div>
              <div class="lg:col-span-7 text-xs text-[#8A8A8A] font-mono leading-relaxed">
                Powered by Bright Data Scraper Studio, our infrastructure runs on custom collectors generated via natural-language CLI prompts, ensuring 100% compliance using only publicly available web data.
              </div>
            </div>

          </div>
        </section>

        <!-- ==========================================
             04. ENGINEERING TEAM (FLOATING PORTRAITS)
             ========================================== -->
        <section class="relative space-y-12 reveal-block">
          <!-- Section Header -->
          <div class="flex items-center justify-between border-b border-[#E3262E]/30 pb-4">
            <div class="font-serif text-2xl lg:text-4xl font-extrabold text-white uppercase tracking-tight">
              04 // THE ARCHITECTS
            </div>
            <div class="text-xs text-[#E3262E] font-mono tracking-widest uppercase">
              INTO THE SCRAPE-VERSE TEAM
            </div>
          </div>

          <!-- Floating Team Members (No Box Cards!) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            
            <!-- Team Member 1: Ganesh Nair -->
            <div class="space-y-4 group">
              <div class="relative overflow-hidden aspect-[4/5] bg-[#0A0A0C] border-b-2 border-[#E3262E]">
                <img src="https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?auto=format&fit=crop&q=80&w=500" alt="Ganesh Nair" class="w-full h-full object-cover grayscale contrast-125 group-hover:grayscale-0 group-hover:scale-110 transition duration-700">
                <div class="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent"></div>
              </div>
              <div>
                <h4 class="font-serif text-2xl font-bold text-white uppercase tracking-tight group-hover:text-[#E3262E] transition-colors">GANESH NAIR</h4>
                <div class="text-xs text-[#E3262E] font-mono uppercase tracking-wider">FRONTEND &amp; SPATIAL UI ARCHITECT</div>
                <p class="text-xs text-[#8A8A8A] font-mono leading-relaxed mt-2">
                  Engineered the spatial convergence UI, Leaflet vector map visualizations, and real-time telemetry orchestrator.
                </p>
              </div>
            </div>

            <!-- Team Member 2: Arjit Ujjawal -->
            <div class="space-y-4 group">
              <div class="relative overflow-hidden aspect-[4/5] bg-[#0A0A0C] border-b-2 border-[#E3262E]">
                <img src="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=500" alt="Arjit Ujjawal" class="w-full h-full object-cover grayscale contrast-125 group-hover:grayscale-0 group-hover:scale-110 transition duration-700">
                <div class="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent"></div>
              </div>
              <div>
                <h4 class="font-serif text-2xl font-bold text-white uppercase tracking-tight group-hover:text-[#E3262E] transition-colors">ARJIT UJJAWAL</h4>
                <div class="text-xs text-[#E3262E] font-mono uppercase tracking-wider">BACKEND &amp; DOMAIN ARCHITECT</div>
                <p class="text-xs text-[#8A8A8A] font-mono leading-relaxed mt-2">
                  Architected pure domain models, time-decay scoring algorithms, and LLM self-healing pipeline integrations.
                </p>
              </div>
            </div>

            <!-- Team Member 3: Registry Lead -->
            <div class="space-y-4 group sm:col-span-2 lg:col-span-1">
              <div class="relative overflow-hidden aspect-[4/5] bg-[#0A0A0C] border-b-2 border-[#E3262E]">
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=500" alt="Teammate" class="w-full h-full object-cover grayscale contrast-125 group-hover:grayscale-0 group-hover:scale-110 transition duration-700">
                <div class="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent"></div>
              </div>
              <div>
                <h4 class="font-serif text-2xl font-bold text-white uppercase tracking-tight group-hover:text-[#E3262E] transition-colors">TEAM MEMBER</h4>
                <div class="text-xs text-[#E3262E] font-mono uppercase tracking-wider">COLLECTOR &amp; REGISTRY LEAD</div>
                <p class="text-xs text-[#8A8A8A] font-mono leading-relaxed mt-2">
                  Managed Bright Data Scraper Studio collector configurations, prompt engineering, and dataset normalizations.
                </p>
              </div>
            </div>

          </div>
        </section>

      </div>
    `;

    this.initScrollAnimations();
  }

  initScrollAnimations() {
    setTimeout(() => {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      }, { threshold: 0.15 });

      const targets = this.container.querySelectorAll('.reveal-block');
      targets.forEach(el => observer.observe(el));
    }, 50);
  }

  destroy() {
    this.container.innerHTML = '';
  }
}
