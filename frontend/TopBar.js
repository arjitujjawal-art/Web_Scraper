/**
 * Signal Atlas — TopBar Component
 * Renders header bar, navigation tabs, persistent live indicator, and active mode badge.
 */

import { selfHealingEngine } from '../services/selfHealingEngine.js';

export class TopBar {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.activeView = options.activeView || 'landing';
    this.activeMode = options.activeMode || 'opportunities';
    this.onViewChange = options.onViewChange || (() => {});
    this.onModeChange = options.onModeChange || (() => {});

    this.pipelineState = selfHealingEngine.getSnapshot();
    selfHealingEngine.subscribe((state) => {
      this.pipelineState = state;
      this.render();
    });

    this.render();
  }

  update(activeView, activeMode) {
    this.activeView = activeView;
    this.activeMode = activeMode;
    this.render();
  }

  render() {
    if (!this.container) return;

    const isDegraded = this.pipelineState.status === 'DEGRADED' || this.pipelineState.status === 'REPAIRING';
    const isHealedUnapproved = this.pipelineState.status === 'HEALED_UNAPPROVED';

    let statusDotColor = 'bg-emerald-500';
    let statusText = 'Live · 4 collectors · updated 2m ago';
    if (isDegraded) {
      statusDotColor = 'bg-red-500 animate-pulse';
      statusText = '🔴 Scraper Drift Detected · 1 Action Required';
    } else if (isHealedUnapproved) {
      statusDotColor = 'bg-indigo-400 animate-pulse';
      statusText = '🔵 Auto-Patch Ready · Approval Needed';
    }

    this.container.innerHTML = `
      <header class="sticky top-0 z-40 bg-[#0A0E14]/90 backdrop-blur-md border-b border-[#1F2937] px-4 lg:px-8 py-3">
        <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          
          <!-- Logo & Brand -->
          <div class="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-start">
            <a href="#" id="brand-link" class="flex items-center space-x-2.5 text-white font-bold text-xl tracking-tight hover:opacity-90 transition">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 via-indigo-500 to-amber-500 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <div class="w-full h-full bg-[#0A0E14] rounded-[7px] flex items-center justify-center">
                  <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <span class="bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400">SIGNAL ATLAS</span>
            </a>

            <!-- Persistent Live Status Indicator -->
            <div class="flex items-center space-x-2 px-3 py-1 rounded-full bg-[#141924] border border-[#1F2937] text-xs text-[#94A3B8]">
              <span class="w-2 h-2 rounded-full ${statusDotColor}"></span>
              <span class="font-medium">${statusText}</span>
            </div>
          </div>

          <!-- Center Navigation Tabs -->
          <nav class="flex items-center space-x-1 bg-[#141924]/80 p-1 rounded-xl border border-[#1F2937]" aria-label="Main Navigation">
            <button id="nav-landing" class="px-4 py-1.5 rounded-lg text-xs md:text-sm font-medium transition ${this.activeView === 'landing' ? 'bg-[#1F2937] text-white shadow-sm' : 'text-[#94A3B8] hover:text-white'}">
              Overview
            </button>
            <button id="nav-map" class="px-4 py-1.5 rounded-lg text-xs md:text-sm font-medium transition flex items-center space-x-1.5 ${this.activeView === 'map' ? 'bg-[#1F2937] text-white shadow-sm' : 'text-[#94A3B8] hover:text-white'}">
              <span>Convergence Map</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">Live</span>
            </button>
            <button id="nav-pipeline" class="px-4 py-1.5 rounded-lg text-xs md:text-sm font-medium transition flex items-center space-x-1.5 ${this.activeView === 'pipeline' ? 'bg-[#1F2937] text-white shadow-sm' : 'text-[#94A3B8] hover:text-white'}">
              <span>Pipeline Health</span>
              ${isDegraded ? '<span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>' : ''}
            </button>
          </nav>

          <!-- Right Action & Mode Badge -->
          <div class="hidden lg:flex items-center space-x-3 text-xs">
            <div class="px-2.5 py-1 rounded-md bg-[#141924] border border-[#1F2937] text-[#94A3B8]">
              Domain: <span class="font-mono text-[#F3F4F6] capitalize">${this.activeMode} Mode</span>
            </div>
            <button id="quick-demo-btn" class="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-medium transition flex items-center space-x-1">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span>Self-Healing Demo</span>
            </button>
          </div>

        </div>
      </header>
    `;

    this.attachEvents();
  }

  attachEvents() {
    const brand = this.container.querySelector('#brand-link');
    const landingBtn = this.container.querySelector('#nav-landing');
    const mapBtn = this.container.querySelector('#nav-map');
    const pipelineBtn = this.container.querySelector('#nav-pipeline');
    const quickDemoBtn = this.container.querySelector('#quick-demo-btn');

    if (brand) brand.addEventListener('click', (e) => { e.preventDefault(); this.onViewChange('landing'); });
    if (landingBtn) landingBtn.addEventListener('click', () => this.onViewChange('landing'));
    if (mapBtn) mapBtn.addEventListener('click', () => this.onViewChange('map'));
    if (pipelineBtn) pipelineBtn.addEventListener('click', () => this.onViewChange('pipeline'));
    if (quickDemoBtn) quickDemoBtn.addEventListener('click', () => this.onViewChange('pipeline'));
  }
}
