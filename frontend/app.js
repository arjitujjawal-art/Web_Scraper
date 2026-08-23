/**
 * Signal Atlas — Main Application Orchestrator
 */

import { TopBar } from './components/TopBar.js';
import { LandingView } from './components/LandingView.js';
import { MapDashboardView } from './components/MapDashboardView.js';
import { PipelineHealthView } from './components/PipelineHealthView.js';

class App {
  constructor() {
    this.activeView = 'landing';
    this.activeMode = 'opportunities';

    this.topBar = null;
    this.currentViewInstance = null;

    this.init();
  }

  init() {
    try {
      // Global error listener for smooth debugging
      window.addEventListener('error', (e) => {
        console.error("Signal Atlas Runtime Exception:", e);
      });

      // Render persistent TopBar
      this.topBar = new TopBar('topbar-mount', {
        activeView: this.activeView,
        activeMode: this.activeMode,
        onViewChange: (view) => this.navigate(view),
        onModeChange: (mode) => this.setMode(mode)
      });

      // Render initial view
      this.navigate(this.activeView);

      // Keyboard accessibility shortcuts
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const backdrop = document.getElementById('drawer-backdrop');
          if (backdrop) backdrop.click();
        }
      });
    } catch (err) {
      console.error("App Initialization Error:", err);
      const mount = document.getElementById('main-mount');
      if (mount) {
        mount.innerHTML = `
          <div class="p-8 text-center text-red-400 bg-red-950/20 border border-red-500/30 m-6 rounded-2xl">
            <h2 class="text-lg font-bold">Signal Atlas UI Runtime Error</h2>
            <p class="text-xs mt-2 font-mono">${err.message}</p>
          </div>
        `;
      }
    }
  }

  setMode(mode) {
    this.activeMode = mode;
    if (this.topBar) {
      this.topBar.update(this.activeView, this.activeMode);
    }
    if (this.currentViewInstance && typeof this.currentViewInstance.setMode === 'function') {
      this.currentViewInstance.setMode(mode);
    }
  }

  navigate(view, mode = null) {
    if (mode) {
      this.activeMode = mode;
    }

    this.activeView = view;

    if (this.topBar) {
      this.topBar.update(this.activeView, this.activeMode);
    }

    // Clean up active view instance if needed
    if (this.currentViewInstance && typeof this.currentViewInstance.destroy === 'function') {
      this.currentViewInstance.destroy();
    }

    const mainMount = document.getElementById('main-mount');
    if (!mainMount) return;

    if (view === 'landing') {
      this.currentViewInstance = new LandingView('main-mount', {
        onNavigate: (targetView, targetMode) => this.navigate(targetView, targetMode)
      });
    } else if (view === 'map') {
      this.currentViewInstance = new MapDashboardView('main-mount', {
        activeMode: this.activeMode,
        onNavigate: (targetView, targetMode) => this.navigate(targetView, targetMode)
      });
    } else if (view === 'pipeline') {
      this.currentViewInstance = new PipelineHealthView('main-mount');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
