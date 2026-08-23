/**
 * ATLAS — Didone Editorial Engine & Real Geographic Intelligence Map
 * Powered by D3.js & Natural Earth World GeoJSON Projection
 * Nº 02 | CONVERGENCE MAP — Global Signal Flow and Pattern Verification
 */

(function () {
  'use strict';

  // --- NODES DATASET WITH EXACT GEOGRAPHIC LAT/LNG COORDINATES ---
  const GLOBAL_INTELLIGENCE_NODES = [
    {
      id: "node-nyc",
      name: "NEW YORK",
      category: "FINANCIAL AGGREGATE",
      coordinates: [40.7128, -74.0060], // [lat, lng]
      lngLat: [-74.0060, 40.7128],      // [lng, lat] for D3 projection
      score: "8.92",
      change: "+18.4%",
      strength: "94%",
      connections: ["node-lon", "node-sao"],
      details: "High-frequency algorithmic liquidity transfers matching federal SEC disclosures."
    },
    {
      id: "node-lon",
      name: "LONDON",
      category: "REGULATORY PULSE",
      coordinates: [51.5074, -0.1278],
      lngLat: [-0.1278, 51.5074],
      score: "9.14",
      change: "+24.1%",
      strength: "98%",
      connections: ["node-nyc", "node-ber", "node-[#MUM]"],
      details: "Cross-border financial regulation draft matching EU digital asset framework."
    },
    {
      id: "node-ber",
      name: "BERLIN",
      category: "OPEN SOURCE VECTOR",
      coordinates: [52.5200, 13.4050],
      lngLat: [13.4050, 52.5200],
      score: "8.60",
      change: "+15.2%",
      strength: "91%",
      connections: ["node-lon", "node-tok"],
      details: "Brandenburg commercial industrial lease and electric autonomous logistics permits."
    },
    {
      id: "node-tok",
      name: "TOKYO",
      category: "ROBOTICS EMERGENT",
      coordinates: [35.6762, 139.6503],
      lngLat: [139.6503, 35.6762],
      score: "9.40",
      change: "+31.8%",
      strength: "96%",
      connections: ["node-bei", "node-[#SIN]"],
      details: "S_EMERGENCE: 5.4B (+31.8%) — Quantum optical sensor procurement & automation expansion."
    },
    {
      id: "node-bei",
      name: "BEIJING",
      category: "INFRASTRUCTURE INDEX",
      coordinates: [39.9042, 116.4074],
      lngLat: [116.4074, 39.9042],
      score: "8.75",
      change: "+12.6%",
      strength: "89%",
      connections: ["node-tok"],
      details: "State semiconductor grid interconnect reservations & rare-earth supply chain indexing."
    },
    {
      id: "node-[#MUM]",
      name: "MUMBAI",
      category: "MODEL DATA CONVERGENCE",
      coordinates: [19.0760, 72.8777],
      lngLat: [72.8777, 19.0760],
      score: "8.85",
      change: "+22.5%",
      strength: "93%",
      connections: ["node-[#SIN]"],
      details: "AI training cluster power reservation & engineering talent hiring velocity."
    },
    {
      id: "node-[#SIN]",
      name: "SINGAPORE",
      category: "LOGISTICS NETWORK",
      coordinates: [1.3521, 103.8198],
      lngLat: [103.8198, 1.3521],
      score: "9.60",
      change: "+42.0%",
      strength: "99%",
      connections: ["node-tok"],
      details: "Jurong Island subsea fiber cable landing permit & 40+ datacenter power reservations."
    },
    {
      id: "node-sao",
      name: "SÃO PAULO",
      category: "COMMODITY SIGNAL",
      coordinates: [-23.5505, -46.6333],
      lngLat: [-46.6333, -23.5505],
      score: "7.80",
      change: "+9.4%",
      strength: "84%",
      connections: ["node-nyc"],
      details: "Agricultural satellite yield telemetry matching Chicago mercantile futures options."
    }
  ];

  const CIVIC_INTELLIGENCE_NODES = [
    {
      id: "node-aus",
      name: "AUSTIN",
      category: "DRAINAGE & FLOOD",
      coordinates: [30.2672, -97.7431],
      lngLat: [-97.7431, 30.2672],
      score: "8.10",
      change: "+115%",
      strength: "90%",
      connections: ["node-[#SJ]"],
      details: "Seeded demo signal — high correlation between 311 flood calls & council agendas."
    },
    {
      id: "node-[#SJ]",
      name: "SAN JOSE",
      category: "TRANSIT RE-ZONING",
      coordinates: [37.3382, -121.8863],
      lngLat: [-121.8863, 37.3382],
      score: "7.60",
      change: "+90%",
      strength: "85%",
      connections: ["node-aus"],
      details: "Planning commission proposal matching VTA bus rapid transit grant."
    }
  ];

  function getDataset(mode = "opportunities") {
    return mode === "civic" ? CIVIC_INTELLIGENCE_NODES : GLOBAL_INTELLIGENCE_NODES;
  }

  // --- SELF HEALING ENGINE SERVICE ---
  class SelfHealingEngine {
    constructor() {
      this.status = "HEALTHY";
      this.collectors = [
        { name: "Bright Data Job Harvester (v2.4)", target: "Public Career Portals", status: "HEALTHY", errorRate: "0.02%" },
        { name: "USPTO Patent Assignment Stream", target: "Federal IP Registry", status: "HEALTHY", errorRate: "0.00%" },
        { name: "Commercial Zoning Harvester", target: "Municipal Permit Portals", status: "HEALTHY", errorRate: "0.01%" },
        { name: "Municipal Council Agenda Harvester", target: "City Clerk PDF Records", status: "HEALTHY", errorRate: "0.00%" }
      ];
      this.listeners = [];
      this.logHistory = [
        { timestamp: this.getTimestamp(), source: "SYSTEM", message: "Collector pipeline orchestrator online. 4/4 workers active." },
        { timestamp: this.getTimestamp(), source: "BRIGHTDATA", message: "Successfully ingested 152 public job listings across target metro areas." },
        { timestamp: this.getTimestamp(), source: "CONVERGENCE", message: "Emergence Index recalculation complete. 8 active global tracking nodes." }
      ];
      this.brokenPayload = null;
      this.healedPayload = null;
    }

    subscribe(fn) {
      this.listeners.push(fn);
      fn(this.getSnapshot());
      return () => { this.listeners = this.listeners.filter(l => l !== fn); };
    }

    notify() {
      const snap = this.getSnapshot();
      this.listeners.forEach(l => l(snap));
    }

    getSnapshot() {
      return {
        status: this.status,
        collectors: [...this.collectors],
        logHistory: [...this.logHistory],
        brokenPayload: this.brokenPayload,
        healedPayload: this.healedPayload
      };
    }

    getTimestamp() {
      const now = new Date();
      return now.toTimeString().split(" ")[0] + "." + String(now.getMilliseconds()).padStart(3, "0");
    }

    simulateDrift() {
      if (this.status !== "HEALTHY") return;
      this.status = "DEGRADED";
      this.collectors[0].status = "DEGRADED";
      this.collectors[0].errorRate = "94.2%";
      this.brokenPayload = {
        timestamp: new Date().toISOString(),
        collector_id: "brightdata_job_harvester_v2",
        target_url: "https://public-listing-portal.example/jobs/tech-rnd-austin",
        extracted_fields: { company_name: "Undisclosed Stealth R&D", location_raw: null },
        scraper_error: "DOMSelectorNotFoundError: Selector 'div.legacy-job-card-2024 > span.loc-v1' returned 0 elements."
      };
      this.healedPayload = null;
      this.logHistory.push({ timestamp: this.getTimestamp(), source: "SCRAPER_ENGINE", message: "CRITICAL: DOM extraction failed!" });
      this.notify();
    }

    triggerSelfHealing() {
      if (this.status !== "DEGRADED") return;
      this.status = "REPAIRING";
      this.collectors[0].status = "REPAIRING";
      this.logHistory.push({ timestamp: this.getTimestamp(), source: "SELF_HEAL_AGENT", message: "Initiating DOM repair workflow..." });
      this.notify();

      setTimeout(() => {
        this.healedPayload = {
          timestamp: new Date().toISOString(),
          collector_id: "brightdata_job_harvester_v2",
          extracted_fields: { company_name: "Undisclosed Stealth R&D", location_raw: "Austin, TX (78701)" },
          healed_by_agent: "Gemini-3.6-DOM-Repair-V2",
          patch_applied: { active_selector: "[data-testid=\"job-location-meta\"]" }
        };
        this.status = "HEALED_UNAPPROVED";
        this.collectors[0].status = "PATCH_PENDING";
        this.logHistory.push({ timestamp: this.getTimestamp(), source: "AUTO_PATCH", message: "Generated synthetic DOM patch #PAT-2026-0881." });
        this.notify();
      }, 1200);
    }

    approvePatch() {
      if (this.status !== "HEALED_UNAPPROVED") return;
      this.status = "HEALTHY";
      this.collectors[0].status = "HEALTHY";
      this.collectors[0].errorRate = "0.01%";
      this.logHistory.push({ timestamp: this.getTimestamp(), source: "ORCHESTRATOR", message: "Auto-patch approved & deployed." });
      this.notify();
    }
  }

  const engine = new SelfHealingEngine();

  // --- REAL GEOGRAPHIC D3.JS WORLD MAP COMPONENT ---
  class RealGeographicIntelligenceMap {
    constructor(container, options = {}) {
      this.container = container;
      this.activeMode = options.activeMode || 'opportunities';
      this.selectedNodeId = null;
      this.zoomLevel = 1.0;
      this.worldGeoJson = null;

      this.render();
      this.loadWorldGeoJson();
    }

    setMode(mode) {
      this.activeMode = mode;
      this.selectedNodeId = null;
      this.render();
    }

    async loadWorldGeoJson() {
      try {
        // Fetch official Natural Earth 110m World Atlas dataset
        const response = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
        if (response.ok) {
          const worldData = await response.json();
          if (typeof topojson !== 'undefined') {
            this.worldGeoJson = topojson.feature(worldData, worldData.objects.countries);
            this.renderGeoMap();
          }
        }
      } catch (e) {
        console.warn("World Atlas GeoJSON fetch warning:", e);
      }
    }

    render() {
      if (!this.container) return;
      const dataset = getDataset(this.activeMode);
      const selectedNode = dataset.find(n => n.id === this.selectedNodeId);

      this.container.innerHTML = `
        <div class="intel-wrapper border border-[#1F1F1F]">
          
          <!-- Editorial Header -->
          <div class="intel-header">
            <div>
              <div class="intel-title-serif">Nº 02 | CONVERGENCE MAP</div>
              <div class="intel-subtitle">Global Signal Flow and Pattern Verification</div>
            </div>

            <div class="flex items-center space-x-3 text-xs">
              <span class="text-[#9CA3AF] uppercase font-mono">Projection:</span>
              <span class="text-white font-mono bg-[#1A1A1A] px-2 py-1 border border-[#333333]">Natural Earth 1</span>
              <div class="h-4 w-px bg-[#333333] mx-1"></div>
              <button id="intel-zoom-in" class="px-2.5 py-1 bg-[#1A1A1A] text-white border border-[#333333] hover:border-[#FFD64D] font-mono">+</button>
              <button id="intel-zoom-out" class="px-2.5 py-1 bg-[#1A1A1A] text-white border border-[#333333] hover:border-[#FFD64D] font-mono">−</button>
              <button id="intel-zoom-reset" class="px-3 py-1 bg-[#1A1A1A] text-white border border-[#333333] hover:border-[#FFD64D] font-mono uppercase text-[10px]">RESET</button>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12">
            
            <!-- MAIN MAP VIEWPORT (8 Columns) -->
            <div class="lg:col-span-8 relative h-[620px] bg-[#080808] overflow-hidden" id="intel-viewport">
              
              <!-- SVG CANVAS FOR D3 GEOJSON COUNTRIES & CONNECTIONS -->
              <svg viewBox="0 0 960 540" class="w-full h-full transform transition-transform duration-200" id="intel-geo-svg" style="transform: scale(${this.zoomLevel});">
                
                <!-- Ocean Background -->
                <rect width="960" height="540" fill="#080808" />

                <!-- Geographic Countries Path Layer -->
                <g id="geo-countries-group"></g>

                <!-- Signal Connection Arcs Layer -->
                <g id="geo-arcs-group"></g>

              </svg>

              <!-- GEOGRAPHICALLY PROJECTED NODES OVERLAY -->
              <div class="absolute inset-0 pointer-events-none z-20" id="nodes-overlay"></div>

              <!-- Tooltip Mount -->
              <div id="intel-tooltip-mount" class="hidden absolute z-30 pointer-events-none"></div>

              <!-- FLOATING SELECTED NODE PANEL -->
              ${selectedNode ? `
                <div class="absolute bottom-6 left-6 z-40 intel-floating-modal animate-fade-in">
                  <div class="flex items-center justify-between border-b border-[#2A2A2A] pb-2 mb-3">
                    <div class="text-[10px] font-mono text-[#FFD64D] tracking-wider font-bold">[SELECTED NODE: ${selectedNode.name}]</div>
                    <button id="close-selected-panel" class="text-xs text-[#9CA3AF] hover:text-white font-mono">✕</button>
                  </div>

                  <div class="text-sm font-bold text-white mb-1 font-mono">${selectedNode.category}</div>
                  <div class="text-xs font-mono text-[#FFD64D] font-bold mb-3">
                    S_EMERGENCE: ${selectedNode.score} (${selectedNode.change})
                  </div>

                  <p class="text-xs text-[#9CA3AF] font-mono leading-relaxed mb-3">${selectedNode.details}</p>

                  <div class="text-[10px] font-mono text-gray-400 pt-2 border-t border-[#2A2A2A]">
                    KEY CONVERGENCE PATHS: ${selectedNode.connections.map(cId => {
                      const cNode = dataset.find(n => n.id === cId);
                      return cNode ? `${cNode.name} (${cNode.score})` : '';
                    }).filter(Boolean).join(' · ')}
                  </div>
                </div>
              ` : ''}

            </div>

            <!-- RIGHT-SIDE INTELLIGENCE PANEL (4 Columns) -->
            <div class="lg:col-span-4 bg-[#0B0B0B] border-t lg:border-t-0 lg:border-l border-[#1F1F1F] flex flex-col justify-between">
              
              <div>
                <div class="px-5 py-4 border-b border-[#1F1F1F] flex items-center justify-between">
                  <div class="text-xs font-mono font-bold text-[#F3F4F6] uppercase tracking-wider">ACTIVE CONVERGENCE NODES</div>
                  <div class="text-[10px] font-mono text-[#FFD64D] font-bold">8 LIVE</div>
                </div>

                <div class="divide-y divide-[#1A1A1A]">
                  ${dataset.map((node, index) => {
                    const isSelected = this.selectedNodeId === node.id;
                    return `
                      <div class="intel-panel-row ${isSelected ? 'selected' : ''}" data-panel-node-id="${node.id}">
                        <div class="flex items-center space-x-3">
                          <span class="text-[11px] font-mono text-[#FFD64D] font-bold">${String(index + 1).padStart(2, '0')}.</span>
                          <div>
                            <div class="font-mono font-bold text-white uppercase text-[11px]">[${node.name}]</div>
                            <div class="text-[10px] text-[#9CA3AF] font-mono">${node.category}</div>
                          </div>
                        </div>
                        <div class="flex items-center space-x-2">
                          <span class="text-[10px] font-mono text-[#FFD64D] font-bold">${node.score}</span>
                          <span class="w-1.5 h-1.5 rounded-full bg-[#FFD64D] ${isSelected ? 'animate-ping' : ''}"></span>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>

              <div class="p-4 border-t border-[#1F1F1F] bg-[#080808] text-[10.5px] font-mono text-[#9CA3AF] flex items-center justify-between">
                <div>REAL NATURAL EARTH GEOGRAPHY</div>
                <div class="text-white font-bold">ACCURATE BOUNDARIES</div>
              </div>

            </div>

          </div>

        </div>
      `;

      this.attachEvents(dataset);
      this.renderGeoMap();
    }

    renderGeoMap() {
      const dataset = getDataset(this.activeMode);
      const svg = d3.select('#intel-geo-svg');
      if (svg.empty()) return;

      const width = 960;
      const height = 540;

      // Real D3 Geographic Projection: Natural Earth 1 centered on Atlantic/Europe/Africa
      const projection = d3.geoNaturalEarth1()
        .scale(165)
        .translate([width / 2, height / 2 + 20]);

      const pathGenerator = d3.geoPath().projection(projection);

      // Render Country Features
      const countriesGroup = svg.select('#geo-countries-group');
      countriesGroup.selectAll('*').remove();

      if (this.worldGeoJson && this.worldGeoJson.features) {
        countriesGroup.selectAll('path')
          .data(this.worldGeoJson.features)
          .enter()
          .append('path')
          .attr('d', pathGenerator)
          .attr('class', 'geo-country-path');
      }

      // Render Connection Arcs using projected coordinates
      const arcsGroup = svg.select('#geo-arcs-group');
      arcsGroup.selectAll('*').remove();

      dataset.forEach(sourceNode => {
        const sourcePt = projection(sourceNode.lngLat);
        if (!sourcePt) return;

        (sourceNode.connections || []).forEach(targetId => {
          const targetNode = dataset.find(n => n.id === targetId);
          if (targetNode) {
            const targetPt = projection(targetNode.lngLat);
            if (targetPt) {
              const midX = (sourcePt[0] + targetPt[0]) / 2;
              const midY = (sourcePt[1] + targetPt[1]) / 2 - Math.abs(sourcePt[0] - targetPt[0]) * 0.15;
              const d = `M ${sourcePt[0]} ${sourcePt[1]} Q ${midX} ${midY} ${targetPt[0]} ${targetPt[1]}`;

              let arcClass = 'intel-arc-path';
              if (this.selectedNodeId) {
                if (this.selectedNodeId === sourceNode.id || this.selectedNodeId === targetNode.id) {
                  arcClass += ' active-path';
                } else {
                  arcClass += ' dimmed-path';
                }
              }

              arcsGroup.append('path')
                .attr('d', d)
                .attr('class', arcClass);
            }
          }
        });
      });

      // Render Geographically Projected Nodes Overlay
      const nodesOverlay = document.getElementById('nodes-overlay');
      if (nodesOverlay) {
        nodesOverlay.innerHTML = dataset.map(node => {
          const pt = projection(node.lngLat);
          if (!pt) return '';

          const xPct = (pt[0] / width) * 100;
          const yPct = (pt[1] / height) * 100;

          const isSelected = this.selectedNodeId === node.id;
          const isDimmed = this.selectedNodeId && !isSelected && !node.connections.includes(this.selectedNodeId);

          return `
            <div 
              class="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group transition-opacity duration-300 ${isDimmed ? 'opacity-30' : 'opacity-100'}" 
              style="left: ${xPct}%; top: ${yPct}%;" 
              data-node-id="${node.id}"
            >
              <div class="relative w-5 h-5 flex items-center justify-center">
                <div class="intel-pulse-ring"></div>
                <div class="w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-[#FFD64D] ring-4 ring-[#FFD64D]/30' : 'bg-[#FFD64D]'} shadow-lg"></div>
              </div>

              <div class="mt-1 text-[10px] font-mono text-[#F3F4F6] tracking-wider whitespace-nowrap bg-[#080808]/90 px-1.5 py-0.5 border border-[#222222]">
                ${node.name}
              </div>
            </div>
          `;
        }).join('');

        this.attachNodeEvents(dataset, projection);
      }
    }

    attachNodeEvents(dataset, projection) {
      const viewport = this.container.querySelector('#intel-viewport');
      const tooltipEl = this.container.querySelector('#intel-tooltip-mount');

      dataset.forEach(node => {
        const nodeEl = this.container.querySelector(`[data-node-id="${node.id}"]`);
        const panelRowEl = this.container.querySelector(`[data-panel-node-id="${node.id}"]`);

        const handleSelect = () => {
          this.selectedNodeId = (this.selectedNodeId === node.id) ? null : node.id;
          this.render();
        };

        if (nodeEl) {
          nodeEl.addEventListener('mouseenter', () => {
            if (!tooltipEl) return;
            tooltipEl.innerHTML = `
              <div class="intel-tooltip-card">
                <div class="font-bold text-white uppercase font-mono mb-0.5">${node.name}</div>
                <div class="text-[#FFD64D] font-mono text-[10px] mb-1">${node.category}</div>
                <div class="text-[10px] font-mono text-gray-400">Signal Strength: ${node.strength}</div>
              </div>
            `;
            tooltipEl.classList.remove('hidden');

            const vRect = viewport.getBoundingClientRect();
            const nRect = nodeEl.getBoundingClientRect();
            tooltipEl.style.left = `${nRect.left - vRect.left + 20}px`;
            tooltipEl.style.top = `${nRect.top - vRect.top - 35}px`;
          });

          nodeEl.addEventListener('mouseleave', () => {
            if (tooltipEl) tooltipEl.classList.add('hidden');
          });

          nodeEl.addEventListener('click', handleSelect);
        }

        if (panelRowEl) {
          panelRowEl.addEventListener('click', handleSelect);
        }
      });
    }

    attachEvents(dataset) {
      const zIn = this.container.querySelector('#intel-zoom-in');
      const zOut = this.container.querySelector('#intel-zoom-out');
      const zReset = this.container.querySelector('#intel-zoom-reset');

      if (zIn) zIn.addEventListener('click', () => { this.zoomLevel = Math.min(this.zoomLevel + 0.25, 2.2); this.render(); });
      if (zOut) zOut.addEventListener('click', () => { this.zoomLevel = Math.max(this.zoomLevel - 0.25, 0.85); this.render(); });
      if (zReset) zReset.addEventListener('click', () => { this.zoomLevel = 1.0; this.selectedNodeId = null; this.render(); });

      const closePanelBtn = this.container.querySelector('#close-selected-panel');
      if (closePanelBtn) {
        closePanelBtn.addEventListener('click', () => {
          this.selectedNodeId = null;
          this.render();
        });
      }
    }
  }

  // --- RENDERERS ---

  function renderMapDashboard(container, activeMode) {
    new RealGeographicIntelligenceMap(container, { activeMode });
  }

  function renderPipelineHealth(container) {
    if (!container) return;
    const state = engine.getSnapshot();

    container.innerHTML = `
      <div class="bg-[#F7F7F4] p-8 border border-[#070707] space-y-6">
        
        <div class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#070707]">
          <div class="font-furniture text-xs">PIPELINE STATUS: <strong class="text-[#FFC700]">${state.status}</strong></div>
          <div class="flex gap-3">
            <button id="didone-drift-btn" class="btn-didone-outline text-xs">1. Simulate Drift</button>
            <button id="didone-heal-btn" class="btn-didone-pink text-xs">2. Trigger AI Repair</button>
            <button id="didone-approve-btn" class="btn-didone-outline text-xs">3. Approve Patch</button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-[#070707] text-white p-4">
            <div class="font-furniture text-[10px] text-[#FFC700] mb-2">DEGRADED INPUT (BROKEN DOM AST)</div>
            <pre class="terminal-font text-xs text-red-300 overflow-x-auto max-h-48"><code>${state.brokenPayload ? JSON.stringify(state.brokenPayload, null, 2) : '// No incident active'}</code></pre>
          </div>
          <div class="bg-[#070707] text-white p-4">
            <div class="font-furniture text-[10px] text-[#22C55E] mb-2">AUTO-HEALED OUTPUT (TRANSFORMED JSON)</div>
            <pre class="terminal-font text-xs text-emerald-300 overflow-x-auto max-h-48"><code>${state.healedPayload ? JSON.stringify(state.healedPayload, null, 2) : '// Awaiting self-healing patch...'}</code></pre>
          </div>
        </div>

        <div class="bg-[#070707] text-gray-300 p-4 font-mono text-xs max-h-48 overflow-y-auto space-y-1">
          ${state.logHistory.map(l => `<div><span class="text-[#999999]">[${l.timestamp}]</span> <span class="text-[#FFC700]">[${l.source}]</span> ${l.message}</div>`).join('')}
        </div>

      </div>
    `;

    const dBtn = container.querySelector('#didone-drift-btn');
    const hBtn = container.querySelector('#didone-heal-btn');
    const aBtn = container.querySelector('#didone-approve-btn');

    if (dBtn) dBtn.addEventListener('click', () => { engine.simulateDrift(); });
    if (hBtn) hBtn.addEventListener('click', () => { engine.triggerSelfHealing(); });
    if (aBtn) aBtn.addEventListener('click', () => { engine.approvePatch(); });
  }

  // --- SCROLL CHOREOGRAPHY ---

  function initScrollChoreography() {
    let ticking = false;

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateStages();
          ticking = false;
        });
        ticking = true;
      }
    }

    function updateStages() {
      const vh = window.innerHeight;

      // Stage 1 (300vh)
      const s1 = document.getElementById('stage-1');
      if (s1) {
        const rect = s1.getBoundingClientRect();
        const total = rect.height - vh;
        const p1 = Math.min(Math.max(-rect.top / total, 0), 1);
        document.documentElement.style.setProperty('--p1', p1.toFixed(4));
      }

      // Stage 2 (320vh)
      const s2 = document.getElementById('stage-2');
      if (s2) {
        const rect = s2.getBoundingClientRect();
        const total = rect.height - vh;
        const p2 = Math.min(Math.max(-rect.top / total, 0), 1);
        document.documentElement.style.setProperty('--p2', p2.toFixed(4));
      }

      // Stage 3 (360vh)
      const s3 = document.getElementById('stage-3');
      if (s3) {
        const rect = s3.getBoundingClientRect();
        const total = rect.height - vh;
        const p3 = Math.min(Math.max(-rect.top / total, 0), 1);
        document.documentElement.style.setProperty('--p3', p3.toFixed(4));

        const rowIndex = Math.min(Math.floor(p3 * 4), 3);
        for (let i = 0; i < 4; i++) {
          const row = document.getElementById(`crow-${i}`);
          if (row) {
            if (i <= rowIndex) row.classList.add('active');
            else row.classList.remove('active');
          }
        }

        const img3 = document.getElementById('stage-3-img');
        if (img3) {
          const scale = (1.08 - (p3 * 0.08)).toFixed(3);
          img3.style.transform = `scale(${scale})`;
        }
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    updateStages();
  }

  // --- INITIALIZATION ---

  document.addEventListener('DOMContentLoaded', () => {
    let activeMode = 'opportunities';

    const mapMount = document.getElementById('map-dashboard-mount');
    const pipelineMount = document.getElementById('pipeline-health-mount');

    renderMapDashboard(mapMount, activeMode);
    renderPipelineHealth(pipelineMount);

    engine.subscribe(() => {
      renderPipelineHealth(pipelineMount);
    });

    // Mode Switcher Buttons
    const oppBtn = document.getElementById('mode-opp-btn');
    const civicBtn = document.getElementById('mode-civic-btn');

    if (oppBtn) {
      oppBtn.addEventListener('click', () => {
        activeMode = 'opportunities';
        oppBtn.className = 'px-5 py-2 font-furniture text-[10.5px] font-bold bg-[#070707] text-white';
        if (civicBtn) civicBtn.className = 'px-5 py-2 font-furniture text-[10.5px] font-bold bg-transparent text-[#070707]';
        renderMapDashboard(mapMount, activeMode);
      });
    }

    if (civicBtn) {
      civicBtn.addEventListener('click', () => {
        activeMode = 'civic';
        civicBtn.className = 'px-5 py-2 font-furniture text-[10.5px] font-bold bg-[#070707] text-white';
        if (oppBtn) oppBtn.className = 'px-5 py-2 font-furniture text-[10.5px] font-bold bg-transparent text-[#070707]';
        renderMapDashboard(mapMount, activeMode);
      });
    }

    // Scroll to sections
    const navLanding = document.getElementById('nav-landing-btn');
    const navMap = document.getElementById('nav-map-btn');
    const navPipeline = document.getElementById('nav-pipeline-btn');
    const heroBtnMap = document.getElementById('hero-btn-map');
    const heroBtnPipeline = document.getElementById('hero-btn-pipeline');

    if (navLanding) navLanding.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    if (navMap || heroBtnMap) {
      const fn = () => {
        const el = document.getElementById('map-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      };
      if (navMap) navMap.addEventListener('click', fn);
      if (heroBtnMap) heroBtnMap.addEventListener('click', fn);
    }
    if (navPipeline || heroBtnPipeline) {
      const fn = () => {
        const el = document.getElementById('pipeline-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      };
      if (navPipeline) navPipeline.addEventListener('click', fn);
      if (heroBtnPipeline) heroBtnPipeline.addEventListener('click', fn);
    }

    initScrollChoreography();
  });

})();
