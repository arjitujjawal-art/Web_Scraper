/**
 * Signal Atlas — Map Dashboard View Component (Page 2)
 */

import { getDataset, getCities, getCategories } from '../services/dataset.js';
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
      <div class="topographic-bg min-h-[calc(100vh-64px)] flex flex-col">
        
        <!-- Live Signal Ticker Banner (Section 2 Requirement: pause-on-hover, 1 line, text-muted) -->
        <div class="bg-[#0A0E14] border-b border-[#1F2937] px-4 py-2 text-xs text-[#94A3B8] ticker-wrap">
          <div class="ticker-move flex items-center space-x-8 font-mono">
            <span class="inline-flex items-center space-x-2">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <strong class="text-white">Austin, TX:</strong> Quantum Compute R&D Campus S_emergence=8.42 (+140%)
            </span>
            <span class="inline-flex items-center space-x-2">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <strong class="text-white">San Jose, CA:</strong> AV Testing Hub S_emergence=9.15 (+210%)
            </span>
            <span class="inline-flex items-center space-x-2">
              <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <strong class="text-white">Austin, TX (Civic Seeded):</strong> South End Drainage S_emergence=8.10 (+115%)
            </span>
            <span class="inline-flex items-center space-x-2">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <strong class="text-white">Seattle, WA:</strong> AI Micro-Data Center Substation S_emergence=8.90 (+175%)
            </span>
          </div>
        </div>

        <!-- Toolbar Controls & Mode Switcher -->
        <div class="bg-[#141924]/90 border-b border-[#1F2937] px-4 lg:px-8 py-3.5 space-y-3">
          <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            
            <!-- Dual-Mode Switcher Toggle -->
            <div class="flex items-center bg-[#0A0E14] p-1 rounded-xl border border-[#1F2937] w-full md:w-auto">
              <button id="mode-btn-opp" class="flex-1 md:flex-initial px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-2 ${!isCivic ? 'bg-emerald-500 text-[#0A0E14] shadow-sm' : 'text-[#94A3B8] hover:text-white'}">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                <span>Opportunities Mode</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded font-mono ${!isCivic ? 'bg-emerald-950/60 text-emerald-100' : 'bg-[#1F2937] text-gray-400'}">Live Scraped</span>
              </button>

              <button id="mode-btn-civic" class="flex-1 md:flex-initial px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-2 ${isCivic ? 'bg-amber-500 text-[#0A0E14] shadow-sm' : 'text-[#94A3B8] hover:text-white'}">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                <span>Civic Issues Mode</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded font-mono ${isCivic ? 'bg-amber-950/60 text-amber-100' : 'bg-[#1F2937] text-gray-400'}">Seeded Demo</span>
              </button>
            </div>

            <!-- Filters Row -->
            <div class="flex flex-wrap items-center gap-3 w-full md:w-auto text-xs">
              
              <!-- City Selector -->
              <div class="flex items-center space-x-1.5 bg-[#0A0E14] px-3 py-1.5 rounded-xl border border-[#1F2937]">
                <span class="text-[#94A3B8]">City:</span>
                <select id="filter-city" class="bg-transparent text-white border-none focus:ring-0 font-medium cursor-pointer">
                  ${getCities().map(c => `<option value="${c}" ${this.filters.city === c ? 'selected' : ''} class="bg-[#141924] text-white">${c === 'all' ? 'All Metros' : c}</option>`).join('')}
                </select>
              </div>

              <!-- Category Filter -->
              <div class="flex items-center space-x-1.5 bg-[#0A0E14] px-3 py-1.5 rounded-xl border border-[#1F2937]">
                <span class="text-[#94A3B8]">Category:</span>
                <select id="filter-category" class="bg-transparent text-white border-none focus:ring-0 font-medium cursor-pointer">
                  ${categories.map(cat => `<option value="${cat}" ${this.filters.category === cat ? 'selected' : ''} class="bg-[#141924] text-white">${cat === 'all' ? 'All Categories' : cat}</option>`).join('')}
                </select>
              </div>

              <!-- Emergence Slider -->
              <div class="flex items-center space-x-2 bg-[#0A0E14] px-3 py-1.5 rounded-xl border border-[#1F2937]">
                <span class="text-[#94A3B8]">Min S_emergence:</span>
                <input type="range" id="filter-score" min="0" max="10" step="0.5" value="${this.filters.minScore}" class="w-20 accent-emerald-500 cursor-pointer">
                <span id="filter-score-val" class="font-mono text-emerald-400 font-bold w-6 text-right">${this.filters.minScore}</span>
              </div>

            </div>

          </div>
        </div>

        <!-- Main Map Area -->
        <div class="relative flex-1 min-h-[550px] w-full flex flex-col">
          
          <!-- Leaflet / Vector Spatial Map Container -->
          <div id="map-container" class="absolute inset-0 z-0 bg-[#0A0E14] overflow-hidden"></div>

          <!-- Empty State Overlay (Section 2 Requirement) -->
          <div id="map-empty-state" class="${this.currentDataset.length > 0 ? 'hidden' : ''} absolute inset-0 z-10 bg-[#0A0E14]/85 backdrop-blur-sm flex items-center justify-center p-6 text-center">
            <div class="max-w-md p-8 rounded-2xl bg-[#141924] border border-[#1F2937] space-y-3 shadow-2xl">
              <div class="w-12 h-12 mx-auto rounded-full bg-[#1F2937] flex items-center justify-center text-gray-400">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              </div>
              <h3 class="text-base font-bold text-white">No convergence detected yet</h3>
              <p class="text-xs text-[#94A3B8]">Signals accumulate as collectors run. Try lowering the emergence score threshold filter above.</p>
              <button id="reset-filters-btn" class="px-4 py-2 rounded-lg bg-emerald-500 text-[#0A0E14] text-xs font-bold transition hover:bg-emerald-400">
                Reset Threshold Filter
              </button>
            </div>
          </div>

          <!-- Drawer Mounting Container -->
          <div id="drawer-container"></div>

        </div>

      </div>
    `;

    this.attachEvents();
    this.initMap(this.currentDataset);
  }

  initMap(dataset) {
    setTimeout(() => {
      const mapEl = document.getElementById('map-container');
      if (!mapEl) return;

      // Check if Leaflet L object exists
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

      // Robust Vector Spatial Map fallback
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
      const badgeBg = isCivic ? 'bg-amber-500' : 'bg-emerald-500';

      const customIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div class="relative group cursor-pointer" data-id="${item.id}">
            <div class="w-10 h-10 rounded-full ${badgeBg}/20 border-2 ${isCivic ? 'border-amber-400 text-amber-400' : 'border-emerald-400 text-emerald-400'} ${pulseClass} flex items-center justify-center font-mono text-xs font-bold shadow-lg">
              ${item.emergenceScore.toFixed(1)}
            </div>
            <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-[#0A0E14] text-white text-[11px] font-medium px-3 py-1.5 rounded-lg border border-[#1F2937] whitespace-nowrap z-50 shadow-xl">
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
    const accentColor = isCivic ? '#F59E0B' : '#22C55E';
    const pulseClass = isCivic ? 'marker-pulse-civic' : 'marker-pulse-opp';

    // Spatial positions for cards/pins on vector grid
    const cityPositions = {
      "Austin, TX": { left: "45%", top: "65%" },
      "San Jose, CA": { left: "20%", top: "45%" },
      "Seattle, WA": { left: "25%", top: "25%" },
      "Boston, MA": { left: "80%", top: "35%" }
    };

    container.innerHTML = `
      <div class="relative w-full h-full bg-[#0A0E14] overflow-hidden flex flex-col justify-between p-6">
        
        <!-- Topo grid SVG overlay -->
        <svg class="absolute inset-0 w-full h-full opacity-30 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1F2937" stroke-width="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <!-- Contour lines -->
          <path d="M 100 200 Q 300 100 600 300 T 1100 200" fill="none" stroke="#818CF8" stroke-opacity="0.15" stroke-width="2"/>
          <path d="M 150 400 Q 400 250 700 450 T 1200 350" fill="none" stroke="#22C55E" stroke-opacity="0.1" stroke-width="2"/>
        </svg>

        <!-- Legend / Map Status Header -->
        <div class="relative z-10 flex items-center justify-between text-xs font-mono text-[#94A3B8]">
          <div class="flex items-center space-x-2 bg-[#141924]/90 px-3 py-1.5 rounded-xl border border-[#1F2937]">
            <span class="w-2 h-2 rounded-full" style="background-color: ${accentColor}"></span>
            <span class="text-white font-bold">${isCivic ? 'Civic Issues Mode (Seeded Data)' : 'Opportunities Mode (Live Scraped)'}</span>
          </div>
          <div class="bg-[#141924]/90 px-3 py-1.5 rounded-xl border border-[#1F2937]">
            Showing <strong class="text-white">${dataset.length}</strong> spatial clusters
          </div>
        </div>

        <!-- Interactive Spatial Markers Container -->
        <div class="relative z-10 flex-1 my-4">
          ${dataset.map(item => {
            const pos = cityPositions[item.city] || { left: "50%", top: "50%" };
            return `
              <div class="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group" style="left: ${pos.left}; top: ${pos.top};" data-marker-id="${item.id}">
                <div class="w-12 h-12 rounded-full border-2 ${pulseClass} flex items-center justify-center font-mono text-xs font-bold shadow-2xl transition hover:scale-110" style="background-color: rgba(10,14,20,0.9); border-color: ${accentColor}; color: ${accentColor}">
                  ${item.emergenceScore.toFixed(1)}
                </div>
                <div class="mt-2 bg-[#141924]/95 text-white text-xs font-medium px-3 py-2 rounded-xl border border-[#1F2937] shadow-xl text-center whitespace-nowrap">
                  <div class="font-bold text-white">${item.title}</div>
                  <div class="text-[11px] text-[#94A3B8] font-mono">${item.city} · ${item.scoreChange}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Vector Footer Note -->
        <div class="relative z-10 text-[11px] text-[#94A3B8] font-mono text-center">
          Click any cluster node above to open spatial breakdown &amp; raw JSON payload drawer.
        </div>

      </div>
    `;

    // Attach click listeners to vector markers
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
        onInspectPipeline: () => this.onNavigate('pipeline')
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
