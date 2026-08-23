/**
 * Signal Atlas — Map Dashboard View Component (PROJECT / ATLAS Editorial Design System)
 */

import { getDataset, getCities, getCategories } from './dataset.js';
import { SignalDrawer } from './SignalDrawer.js';

export class MapDashboardView {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.activeMode = options.activeMode || 'opportunities';
    this.onNavigate = options.onNavigate || (() => {});
    this.map = null;
    this.markersGroup = null;
    this.drawer = null;
    this.currentDataset = [];

    this.filters = {
      city: 'all',
      category: 'all',
      minScore: 0.0
    };

    this.render();
  }

  setMode(mode) {
    this.activeMode = mode;
    this.filters.category = 'all';
    this.render();
  }

  render() {
    if (!this.container) return;

    this.currentDataset = getDataset(this.activeMode, this.filters);
    const isCivic = this.activeMode === 'civic';
    const categories = getCategories(this.activeMode);

    this.container.innerHTML = `
      <div class="bg-[#050505] flex flex-col font-mono">
        
        <!-- Live Signal Ticker Banner -->
        <div class="bg-[#0A0A0C] border-b border-[#1F2937] px-4 py-2 text-xs text-[#8A8A8A] ticker-wrap">
          <div class="ticker-move flex items-center space-x-8 font-mono">
            <span class="inline-flex items-center space-x-2">
              <span class="w-2 h-2 rounded-full bg-[#E3262E] animate-pulse"></span>
              <strong class="text-white">Austin, TX:</strong> Quantum Compute R&amp;D Campus S_emergence=8.42 (+140%)
            </span>
            <span class="inline-flex items-center space-x-2">
              <span class="w-2 h-2 rounded-full bg-[#E3262E] animate-pulse"></span>
              <strong class="text-white">San Jose, CA:</strong> AV Testing Hub S_emergence=9.15 (+210%)
            </span>
            <span class="inline-flex items-center space-x-2">
              <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <strong class="text-white">Austin, TX (Civic Seeded):</strong> South End Drainage S_emergence=8.10 (+115%)
            </span>
            <span class="inline-flex items-center space-x-2">
              <span class="w-2 h-2 rounded-full bg-[#E3262E] animate-pulse"></span>
              <strong class="text-white">Seattle, WA:</strong> AI Micro-Data Center Substation S_emergence=8.90 (+175%)
            </span>
          </div>
        </div>

        <!-- Toolbar Controls & Mode Switcher -->
        <div class="bg-[#0A0A0C] border-b border-[#1F2937] px-4 lg:px-8 py-3.5 space-y-3">
          <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            
            <!-- Dual-Mode Switcher Toggle -->
            <div class="flex items-center bg-[#050505] p-1 border border-[#1F2937] w-full md:w-auto">
              <button id="mode-btn-opp" class="flex-1 md:flex-initial px-4 py-1.5 text-xs font-mono font-bold uppercase transition flex items-center justify-center space-x-2 ${!isCivic ? 'bg-[#E3262E] text-white shadow-sm' : 'text-[#8A8A8A] hover:text-white'}">
                <span>OPPORTUNITIES (LIVE SCRAPED)</span>
              </button>

              <button id="mode-btn-civic" class="flex-1 md:flex-initial px-4 py-1.5 text-xs font-mono font-bold uppercase transition flex items-center justify-center space-x-2 ${isCivic ? 'bg-amber-500 text-black shadow-sm' : 'text-[#8A8A8A] hover:text-white'}">
                <span>CIVIC ISSUES (SEEDED DEMO)</span>
              </button>
            </div>

            <!-- Filters Row -->
            <div class="flex flex-wrap items-center gap-3 w-full md:w-auto text-xs font-mono">
              
              <!-- City Selector -->
              <div class="flex items-center space-x-1.5 bg-[#050505] px-3 py-1.5 border border-[#1F2937]">
                <span class="text-[#8A8A8A]">CITY:</span>
                <select id="filter-city" class="bg-transparent text-white border-none focus:ring-0 font-mono uppercase cursor-pointer">
                  ${getCities().map(c => `<option value="${c}" ${this.filters.city === c ? 'selected' : ''} class="bg-[#0A0A0C] text-white">${c === 'all' ? 'ALL METROS' : c}</option>`).join('')}
                </select>
              </div>

              <!-- Category Filter -->
              <div class="flex items-center space-x-1.5 bg-[#050505] px-3 py-1.5 border border-[#1F2937]">
                <span class="text-[#8A8A8A]">CATEGORY:</span>
                <select id="filter-category" class="bg-transparent text-white border-none focus:ring-0 font-mono uppercase cursor-pointer">
                  ${categories.map(cat => `<option value="${cat}" ${this.filters.category === cat ? 'selected' : ''} class="bg-[#0A0A0C] text-white">${cat === 'all' ? 'ALL CATEGORIES' : cat}</option>`).join('')}
                </select>
              </div>

              <!-- Emergence Slider -->
              <div class="flex items-center space-x-2 bg-[#050505] px-3 py-1.5 border border-[#1F2937]">
                <span class="text-[#8A8A8A]">MIN S_EMERGENCE:</span>
                <input type="range" id="filter-score" min="0" max="10" step="0.5" value="${this.filters.minScore}" class="w-20 accent-[#E3262E] cursor-pointer">
                <span id="filter-score-val" class="font-mono text-[#E3262E] font-bold w-6 text-right">${this.filters.minScore}</span>
              </div>

            </div>

          </div>
        </div>

        <!-- Main Map Area -->
        <div class="relative flex-1 min-h-[520px] w-full flex flex-col mt-4">
          
          <!-- Leaflet / Vector Spatial Map Container -->
          <div id="map-container" class="map-canvas-container"></div>

          <!-- Empty State Overlay -->
          <div id="map-empty-state" class="${this.currentDataset.length > 0 ? 'hidden' : ''} absolute inset-0 z-10 bg-[#050505]/90 backdrop-blur-sm flex items-center justify-center p-6 text-center">
            <div class="max-w-md p-8 bg-[#0A0A0C] border border-[#1F2937] space-y-3 shadow-2xl">
              <h3 class="text-base font-bold font-serif text-white uppercase">NO CONVERGENCE DETECTED YET</h3>
              <p class="text-xs text-[#8A8A8A] font-mono">Signals accumulate as collectors run. Try lowering the emergence score threshold filter above.</p>
              <button id="reset-filters-btn" class="px-4 py-2 bg-[#E3262E] text-white text-xs font-mono font-bold uppercase transition hover:bg-[#C11B22]">
                RESET THRESHOLD FILTER
              </button>
            </div>
          </div>

        </div>

      </div>
    `;

    this.attachEvents();
    this.initMap();
  }

  initMap() {
    setTimeout(() => {
      const mapEl = document.getElementById('map-container');
      if (!mapEl) return;

      const dataset = this.currentDataset;

      if (typeof L !== 'undefined') {
        try {
          if (!this.map) {
            this.map = L.map('map-container', {
              center: [39.8283, -98.5795],
              zoom: 4,
              zoomControl: false
            });

            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
              attribution: '&copy; CARTO &copy; OpenStreetMap',
              maxZoom: 19
            }).addTo(this.map);

            L.control.zoom({ position: 'bottomright' }).addTo(this.map);
          }

          this.updateMarkers(dataset);
          return;
        } catch (e) {
          console.warn("Leaflet map initialization warning, using spatial vector render:", e);
        }
      }

      this.renderVectorSpatialMap(dataset, mapEl);
    }, 50);
  }

  updateMarkers(dataset) {
    if (!this.map || typeof L === 'undefined') return;

    if (this.markersGroup) {
      this.map.removeLayer(this.markersGroup);
    }

    this.markersGroup = L.layerGroup().addTo(this.map);

    const bounds = [];
    const isCivic = this.activeMode === 'civic';

    dataset.forEach(item => {
      const coords = item.coordinates;
      bounds.push(coords);

      const pulseClass = isCivic ? 'marker-pulse-civic' : 'marker-pulse-opp';
      const borderColor = isCivic ? 'border-amber-400 text-amber-400' : 'border-[#E3262E] text-[#E3262E]';

      const customIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div class="relative group cursor-pointer" data-id="${item.id}">
            <div class="w-10 h-10 rounded-full bg-[#050505]/90 border-2 ${borderColor} ${pulseClass} flex items-center justify-center font-mono text-xs font-bold shadow-2xl">
              ${item.emergenceScore.toFixed(1)}
            </div>
            <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-[#0A0A0C] text-white text-[11px] font-mono px-3 py-1.5 border border-[#1F2937] whitespace-nowrap z-50 shadow-xl">
              ${item.title} (${item.city})
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      const marker = L.marker(coords, { icon: customIcon }).addTo(this.markersGroup);
      marker.on('click', () => this.openDrawer(item));
    });

    if (bounds.length > 0) {
      this.map.fitBounds(bounds, { padding: [80, 80], maxZoom: 10 });
    }
  }

  renderVectorSpatialMap(dataset, container) {
    const isCivic = this.activeMode === 'civic';
    const accentColor = isCivic ? '#F59E0B' : '#E3262E';
    const pulseClass = isCivic ? 'marker-pulse-civic' : 'marker-pulse-opp';

    const cityPositions = {
      "Austin, TX": { left: "45%", top: "65%" },
      "San Jose, CA": { left: "20%", top: "45%" },
      "Seattle, WA": { left: "25%", top: "25%" },
      "Boston, MA": { left: "80%", top: "35%" }
    };

    container.innerHTML = `
      <div class="relative w-full h-full bg-[#080808] overflow-hidden flex flex-col justify-between p-6">
        
        <svg class="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1F2937" stroke-width="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <path d="M 100 200 Q 300 100 600 300 T 1100 200" fill="none" stroke="#E3262E" stroke-opacity="0.2" stroke-width="2"/>
        </svg>

        <div class="relative z-10 flex items-center justify-between text-xs font-mono text-[#8A8A8A]">
          <div class="flex items-center space-x-2 bg-[#0A0A0C] px-3 py-1.5 border border-[#1F2937]">
            <span class="w-2 h-2 rounded-full" style="background-color: ${accentColor}"></span>
            <span class="text-white font-bold">${isCivic ? 'CIVIC ISSUES MODE (SEEDED DATA)' : 'OPPORTUNITIES MODE (LIVE SCRAPED)'}</span>
          </div>
          <div class="bg-[#0A0A0C] px-3 py-1.5 border border-[#1F2937]">
            SHOWING <strong class="text-white">${dataset.length}</strong> SPATIAL CLUSTERS
          </div>
        </div>

        <div class="relative z-10 flex-1 my-4">
          ${dataset.map(item => {
            const pos = cityPositions[item.city] || { left: "50%", top: "50%" };
            return `
              <div class="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group" style="left: ${pos.left}; top: ${pos.top};" data-marker-id="${item.id}">
                <div class="w-12 h-12 rounded-full border-2 ${pulseClass} flex items-center justify-center font-mono text-xs font-bold shadow-2xl transition hover:scale-110" style="background-color: rgba(5,5,5,0.9); border-color: ${accentColor}; color: ${accentColor}">
                  ${item.emergenceScore.toFixed(1)}
                </div>
                <div class="mt-2 bg-[#0A0A0C] text-white text-xs font-mono px-3 py-2 border border-[#1F2937] shadow-xl text-center whitespace-nowrap">
                  <div class="font-bold text-white uppercase">${item.title}</div>
                  <div class="text-[11px] text-[#8A8A8A] font-mono">${item.city} • ${item.scoreChange}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="relative z-10 text-[11px] text-[#8A8A8A] font-mono text-center uppercase tracking-wider">
          Click any cluster node above to inspect spatial breakdown &amp; raw payload drawer.
        </div>

      </div>
    `;

    dataset.forEach(item => {
      const markerEl = container.querySelector(`[data-marker-id="${item.id}"]`);
      if (markerEl) {
        markerEl.addEventListener('click', () => this.openDrawer(item));
      }
    });
  }

  openDrawer(signal) {
    if (!this.drawer) {
      this.drawer = new SignalDrawer('drawer-container', {
        onInspectPipeline: () => this.onNavigate('scene-03')
      });
    }
    this.drawer.open(signal);
  }

  attachEvents() {
    const oppBtn = this.container.querySelector('#mode-btn-opp');
    const civicBtn = this.container.querySelector('#mode-btn-civic');
    const citySelect = this.container.querySelector('#filter-city');
    const catSelect = this.container.querySelector('#filter-category');
    const scoreSlider = this.container.querySelector('#filter-score');
    const scoreVal = this.container.querySelector('#filter-score-val');
    const resetBtn = this.container.querySelector('#reset-filters-btn');

    if (oppBtn) oppBtn.addEventListener('click', () => this.setMode('opportunities'));
    if (civicBtn) civicBtn.addEventListener('click', () => this.setMode('civic'));

    if (citySelect) {
      citySelect.addEventListener('change', (e) => {
        this.filters.city = e.target.value;
        this.render();
      });
    }

    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        this.filters.category = e.target.value;
        this.render();
      });
    }

    if (scoreSlider) {
      scoreSlider.addEventListener('input', (e) => {
        this.filters.minScore = parseFloat(e.target.value);
        if (scoreVal) scoreVal.textContent = this.filters.minScore.toFixed(1);
        this.render();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.filters.minScore = 0.0;
        this.render();
      });
    }
  }
}
