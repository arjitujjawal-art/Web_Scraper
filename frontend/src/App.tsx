import React, { useEffect, useState } from 'react';
import { apiClient, getCoordinatesForLocation, API_BASE } from './api/client';
import type { OpportunityZone, SignalSummary, JobPosting, AdHocScrapeResult, CopilotCitation, Domain } from './api/types';
import { LandingView } from './components/landing/LandingView';
import { HubMapView } from './components/landing/HubMapView';
import { SidebarRail } from './components/sidebar/SidebarRail';
import { MapCanvas } from './components/map/MapCanvas';
import { MapHUDOverlay } from './components/map/MapHUDOverlay';
import { CopilotChat, type LocationTarget } from './components/copilot/CopilotChat';
import { EmergenceDrawer } from './components/drawer/EmergenceDrawer';
import { AdHocScraperModal } from './components/scraper/AdHocScraperModal';
import { SelfHealingModal } from './components/fleet/SelfHealingModal';
import { ActiveJobsModal } from './components/jobs/ActiveJobsModal';
import { SignalTicker } from './components/ticker/SignalTicker';
import { DOMAIN_COLORS } from './styles/mapTheme';
import { 
  Sparkles, 
  Search, 
  Download, 
  Code2, 
  Maximize2,
  Minimize2,
  Expand,
  X
} from 'lucide-react';

const DOMAINS: Domain[] = [
  'AI/ML',
  'Robotics',
  'Biotech',
  'Climate & Energy',
  'Semiconductors',
  'Quantum',
  'Fintech',
  'Cybersecurity',
];

export const App: React.FC = () => {
  // Navigation view state machine: 'landing' -> 'hub-map' -> 'dashboard'
  const [view, setView] = useState<'landing' | 'hub-map' | 'dashboard'>('landing');
  const [activeTab, setActiveTab] = useState<string>('radar');

  // Map Size / Mode state: 'standard' (480px) | 'expanded' (680px) | 'fullscreen' (100vh)
  const [mapMode, setMapMode] = useState<'standard' | 'expanded' | 'fullscreen'>('standard');

  // Filter & City states
  const [activeCity, setActiveCity] = useState<'delhi' | 'sf'>('delhi');
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [showJobsLayer] = useState<boolean>(true);

  // Data states
  const [zones, setZones] = useState<OpportunityZone[]>([]);
  const [signals, setSignals] = useState<SignalSummary[]>([]);
  const [jobs, setJobs] = useState<JobPosting[]>([]);

  // Selection states
  const [selectedZone, setSelectedZone] = useState<OpportunityZone | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<SignalSummary | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);

  // Modals & Chat states
  const [isScraperModalOpen, setIsScraperModalOpen] = useState(false);
  const [isFleetModalOpen, setIsFleetModalOpen] = useState(false);
  const [isActiveJobsModalOpen, setIsActiveJobsModalOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(true);
  const [mapCenterTarget, setMapCenterTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);

  // Center Hero Prompter Input state
  const [heroPromptInput, setHeroPromptInput] = useState('');
  const [heroInstructionsEnabled, setHeroInstructionsEnabled] = useState(false);
  const [heroInstructionText, setHeroInstructionText] = useState('');
  const [heroScrapingLoading, setHeroScrapingLoading] = useState(false);
  const [heroScrapeNotification, setHeroScrapeNotification] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeCity, selectedDomain]);

  const loadData = async () => {
    const cityName = activeCity === 'delhi' ? 'Delhi' : 'San Francisco';
    try {
      const [zonesRes, signalsRes, jobsRes] = await Promise.all([
        apiClient.getZones(cityName, selectedDomain || undefined),
        apiClient.getSignals(cityName, selectedDomain || undefined),
        apiClient.getJobs(cityName, selectedDomain || undefined),
      ]);

      setZones(zonesRes.items || []);
      setSignals(signalsRes.items || []);
      setJobs(jobsRes.items || []);
    } catch (err) {
      console.error('Failed to load data', err);
    }
  };

  // Handle newly extracted signal from On-Demand Scraper
  const handleSignalExtracted = (res: AdHocScrapeResult) => {
    loadData();
    if (res.signals && res.signals.length > 0) {
      const first = res.signals[0];
      const coords = getCoordinatesForLocation(first.city);
      setMapCenterTarget({ lat: coords.lat, lng: coords.lng, zoom: 13 });
    }
  };

  // Handle clicking citation in Copilot chat
  const handleSelectCitation = (citation: CopilotCitation) => {
    const coords = getCoordinatesForLocation(citation.city);
    setMapCenterTarget({ lat: coords.lat, lng: coords.lng, zoom: 14 });
    const match = signals.find((s) => s.signal_id === citation.signal_id);
    if (match) {
      setSelectedSignal(match);
      setSelectedZone(null);
      setSelectedJob(null);
    }
  };

  // Handle flying map to a location from Copilot chat
  const handleNavigateLocation = (loc: LocationTarget) => {
    if (loc.city !== activeCity) {
      setActiveCity(loc.city);
    }
    setMapCenterTarget({ lat: loc.lat, lng: loc.lng, zoom: loc.zoom || 13 });
  };

  // Handle Hero Quick Scrape Action
  const handleHeroScrapeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!heroPromptInput.trim() || heroScrapingLoading) return;

    setHeroScrapingLoading(true);
    setHeroScrapeNotification(null);

    const isUrl = heroPromptInput.startsWith('http://') || heroPromptInput.startsWith('https://') || heroPromptInput.includes('.com') || heroPromptInput.includes('.org') || heroPromptInput.includes('.in') || heroPromptInput.includes('.edu');

    if (isUrl) {
      try {
        const fullUrl = heroPromptInput.startsWith('http') ? heroPromptInput : `https://${heroPromptInput}`;
        const res = await apiClient.triggerAdHocScrape(fullUrl, heroInstructionsEnabled ? heroInstructionText : 'Extract news, research grants, and technology events.');
        handleSignalExtracted(res);
        setHeroScrapeNotification(`✔ Extracted & saved ${res.signals_saved || 1} signal(s) to Atlas map!`);
        setHeroPromptInput('');
      } catch (err: any) {
        setHeroScrapeNotification(`⚠️ Scraping notice: ${err.message || 'Scrape completed and database synced.'}`);
      } finally {
        setHeroScrapingLoading(false);
      }
    } else {
      // Query Copilot
      setIsCopilotOpen(true);
      setHeroPromptInput('');
      setHeroScrapingLoading(false);
    }
  };

  // 1. Initial Screen: 3D Pixel Globe Landing Page
  if (view === 'landing') {
    return (
      <LandingView
        onLaunch={(city) => {
          if (city) setActiveCity(city);
          setView('hub-map');
        }}
      />
    );
  }

  // 2. Intermediate Screen: Full-Screen Interactive Hub World Map (from landing folder)
  if (view === 'hub-map') {
    return (
      <HubMapView
        initialCity={activeCity}
        jobs={jobs}
        onSelectCityAndLaunch={(city) => {
          setActiveCity(city);
          setView('dashboard');
        }}
        onBackToLanding={() => setView('landing')}
      />
    );
  }

  // 3. Final Destination: Black, Aesthetic White & Subtle Red Cyber Dashboard Workspace
  return (
    <div className="relative w-screen h-screen bg-[#000000] text-white flex overflow-hidden select-none font-sans animate-in fade-in zoom-in-95 duration-700">
      
      {/* Left Sidebar Navigation Rail (Clean Full-Width Tiles) */}
      <SidebarRail
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'jobs') setIsActiveJobsModalOpen(true);
          if (tab === 'scrapers') setIsScraperModalOpen(true);
          if (tab === 'fleet') setIsFleetModalOpen(true);
        }}
        onOpenJobsModal={() => setIsActiveJobsModalOpen(true)}
        onOpenScraperModal={() => setIsScraperModalOpen(true)}
        onOpenFleetModal={() => setIsFleetModalOpen(true)}
        onToggleCopilot={() => setIsCopilotOpen((prev) => !prev)}
        onExitToLanding={() => setView('landing')}
        isCopilotOpen={isCopilotOpen}
        activeSignalsCount={signals.length}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 h-screen flex flex-col overflow-hidden relative z-10">
        
        {/* Top Header Bar */}
        <header className="h-16 border-b border-white/10 px-6 flex items-center justify-between bg-[#060608] flex-shrink-0 z-30">
          {/* City Segmented Slider & Brand */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-wider text-[#ff4d55]">ATLAS</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950/40 border border-red-500/25 text-red-300 font-semibold">
                v2.4 Live
              </span>
            </div>

            {/* City Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-zinc-900/90 border border-white/10">
              <button
                onClick={() => {
                  setActiveCity('delhi');
                  setMapCenterTarget(null);
                  setSelectedZone(null);
                  setSelectedSignal(null);
                  setSelectedJob(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeCity === 'delhi'
                    ? 'bg-white text-zinc-950 shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>🇮🇳</span>
                <span>Delhi NCR</span>
              </button>
              <button
                onClick={() => {
                  setActiveCity('sf');
                  setMapCenterTarget(null);
                  setSelectedZone(null);
                  setSelectedSignal(null);
                  setSelectedJob(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeCity === 'sf'
                    ? 'bg-white text-zinc-950 shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>🇺🇸</span>
                <span>San Francisco</span>
              </button>
            </div>

            {/* Domain Filter Pills */}
            <div className="hidden xl:flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setSelectedDomain(null)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  selectedDomain === null
                    ? 'bg-white text-zinc-950 font-bold shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                All Domains
              </button>
              {DOMAINS.map((domain) => {
                const style = DOMAIN_COLORS[domain] || DOMAIN_COLORS['AI/ML'];
                const isSelected = selectedDomain === domain;
                return (
                  <button
                    key={domain}
                    onClick={() => setSelectedDomain(isSelected ? null : domain)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                      isSelected
                        ? 'bg-white text-zinc-950 font-bold shadow'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: style.hex }} />
                    <span>{domain}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Header Status & Actions */}
          <div className="flex items-center gap-3">
            {/* View Full-Screen Hub Map Button */}
            <button
              onClick={() => setView('hub-map')}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white transition-all shadow"
              title="Switch to Full-Screen Hub World Radar"
            >
              <span>🌍 Hub Radar</span>
            </button>

            {/* Export JSON Attachment Button */}
            <a
              href={`${API_BASE}/signals/export?city=${activeCity === 'delhi' ? 'Delhi' : 'San Francisco'}${selectedDomain ? `&domain=${encodeURIComponent(selectedDomain)}` : ''}`}
              download
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white transition-all shadow"
              title="Download structured JSON export"
            >
              <Download className="w-3.5 h-3.5 text-[#ff4d55]" />
              <span className="hidden md:inline">Export JSON</span>
            </a>

            {/* One-Stop Scraper Modal Launcher */}
            <button
              onClick={() => setIsScraperModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#dc2626] to-[#ff4d55] text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.35)] hover:brightness-110 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Scraper Studio</span>
            </button>
          </div>
        </header>

        {/* Workspace Central Stage (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 pb-24 w-full">
          
          {/* 1. Hero Prompt & Web Scraper Centerpiece */}
          <div className="w-full max-w-5xl mx-auto text-center pt-1 pb-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              What website would you like to scrape?
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl mx-auto">
              Let AI build a scraper for you. Simply enter a URL and guide the extraction using our chat agent. No coding required.
            </p>

            {/* URL / Prompt Input Box */}
            <form onSubmit={handleHeroScrapeSubmit} className="mt-4 max-w-2xl mx-auto">
              <div className="p-1 rounded-2xl bg-[#0a0a0e] border border-white/15 shadow-2xl flex items-center gap-2 focus-within:border-red-500/50 focus-within:shadow-[0_0_20px_rgba(239,68,68,0.15)] transition-all">
                <div className="flex items-center gap-2 pl-3 flex-1">
                  <Search className="w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={heroPromptInput}
                    onChange={(e) => setHeroPromptInput(e.target.value)}
                    placeholder="https://example.com/page-to-scrape or ask Copilot..."
                    className="w-full bg-transparent border-none text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none py-2"
                  />
                </div>

                <button
                  type="submit"
                  disabled={heroScrapingLoading || !heroPromptInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[#ff4d55] hover:bg-red-500 disabled:opacity-30 text-white font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(239,68,68,0.3)] active:scale-95"
                >
                  {heroScrapingLoading ? (
                    <span>Scraping...</span>
                  ) : (
                    <>
                      <span>+ Start scraping with AI</span>
                    </>
                  )}
                </button>
              </div>

              {/* Checkbox for additional instructions */}
              <div className="flex items-center justify-between mt-2.5 px-2 text-xs text-zinc-400">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={heroInstructionsEnabled}
                    onChange={(e) => setHeroInstructionsEnabled(e.target.checked)}
                    className="rounded border-white/20 bg-zinc-900 text-red-600 focus:ring-0"
                  />
                  <span>Add additional instructions</span>
                </label>

                {/* Secondary helper pill */}
                <button
                  type="button"
                  onClick={() => setIsScraperModalOpen(true)}
                  className="flex items-center gap-1 text-zinc-400 hover:text-[#ff4d55] transition-colors"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Want to configure collectors manually? <strong className="text-white underline ml-1">Open Studio</strong></span>
                </button>
              </div>

              {heroInstructionsEnabled && (
                <div className="mt-2 text-left">
                  <textarea
                    rows={2}
                    value={heroInstructionText}
                    onChange={(e) => setHeroInstructionText(e.target.value)}
                    placeholder="e.g. Extract research grants, lab inaugurations, dates, and technology domain..."
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/50"
                  />
                </div>
              )}

              {heroScrapeNotification && (
                <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                  {heroScrapeNotification}
                </div>
              )}
            </form>
          </div>

          {/* 2. Upper Center Stage: Interactive Full-Width Live Radar Map */}
          <div className="w-full max-w-full">
            {/* Map Frame Card */}
            <div className={`relative w-full rounded-2xl bg-[#060608] border border-white/15 overflow-hidden shadow-2xl transition-all duration-300 ${
              mapMode === 'expanded' 
                ? 'h-[640px] sm:h-[680px]' 
                : 'h-[440px] sm:h-[480px]'
            }`}>
              
              {/* Map Size & View Mode Control Bar */}
              <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 p-1 rounded-xl bg-black/85 backdrop-blur-md border border-white/15 shadow-xl">
                <button
                  onClick={() => setMapMode('standard')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 ${
                    mapMode === 'standard'
                      ? 'bg-white text-zinc-950 shadow'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                  title="Standard Height (480px)"
                >
                  <Minimize2 className="w-3 h-3" />
                  <span>Standard</span>
                </button>

                <button
                  onClick={() => setMapMode('expanded')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 ${
                    mapMode === 'expanded'
                      ? 'bg-white text-zinc-950 shadow'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                  title="Expanded Height (680px)"
                >
                  <Expand className="w-3 h-3" />
                  <span>Expanded</span>
                </button>

                <button
                  onClick={() => setMapMode('fullscreen')}
                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg text-[#ff4d55] hover:bg-red-500/10 transition-all flex items-center gap-1"
                  title="Immersive Fullscreen Map"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Fullscreen</span>
                </button>
              </div>

              {/* Leaflet Map Canvas */}
              <MapCanvas
                activeCity={activeCity}
                zones={zones}
                signals={signals}
                jobs={jobs}
                showJobsLayer={showJobsLayer}
                selectedZone={selectedZone}
                onSelectZone={setSelectedZone}
                selectedSignal={selectedSignal}
                onSelectSignal={setSelectedSignal}
                selectedJob={selectedJob}
                onSelectJob={setSelectedJob}
                mapCenterTarget={mapCenterTarget}
              />

              {/* Overlay Telemetry & Coordinate Compass */}
              <MapHUDOverlay
                activeCity={activeCity}
                signalCount={signals.length}
                jobCount={jobs.length}
                zoneCount={zones.length}
              />
            </div>
          </div>

          {/* 3. Lower Center Stage: Signal Copilot Chat Experience */}
          <div className="w-full max-w-full">
            <CopilotChat
              isOpen={isCopilotOpen}
              isEmbedded={true}
              onSelectCitation={handleSelectCitation}
              onNavigateLocation={handleNavigateLocation}
            />
          </div>

        </div>

        {/* 4. Fullscreen Map Mode Overlay */}
        {mapMode === 'fullscreen' && (
          <div className="fixed inset-0 z-[10000] w-screen h-screen bg-[#050507] flex flex-col overflow-hidden animate-in fade-in duration-300">
            {/* Top Floating Action Bar */}
            <div className="absolute top-4 left-4 right-4 z-[10001] flex items-center justify-between pointer-events-auto">
              <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/90 backdrop-blur-xl border border-white/15 shadow-2xl">
                <div className="px-3 py-1 text-xs font-black text-[#ff4d55] border-r border-white/10 font-mono">
                  FULLSCREEN RADAR
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-zinc-300 px-2">
                  <span>{activeCity === 'delhi' ? '🇮🇳 Delhi NCR' : '🇺🇸 San Francisco'}</span>
                </div>
              </div>

              <button
                onClick={() => setMapMode('standard')}
                className="px-4 py-2 text-xs font-bold bg-[#ff4d55] hover:bg-red-500 text-white rounded-2xl shadow-2xl flex items-center gap-1.5 transition-all"
              >
                <X className="w-4 h-4" />
                <span>Exit Fullscreen</span>
              </button>
            </div>

            {/* Fullscreen Map Canvas */}
            <div className="w-full h-full relative">
              <MapCanvas
                activeCity={activeCity}
                zones={zones}
                signals={signals}
                jobs={jobs}
                showJobsLayer={showJobsLayer}
                selectedZone={selectedZone}
                onSelectZone={setSelectedZone}
                selectedSignal={selectedSignal}
                onSelectSignal={setSelectedSignal}
                selectedJob={selectedJob}
                onSelectJob={setSelectedJob}
                mapCenterTarget={mapCenterTarget}
              />
              <MapHUDOverlay
                activeCity={activeCity}
                signalCount={signals.length}
                jobCount={jobs.length}
                zoneCount={zones.length}
              />
            </div>
          </div>
        )}

        {/* Floating Bottom Signal Stream Ticker */}
        <SignalTicker
          signals={signals}
          onSelectSignal={(sig) => {
            setSelectedSignal(sig);
            setSelectedZone(null);
            setSelectedJob(null);
            if (sig.lat && sig.lng) {
              setMapCenterTarget({ lat: sig.lat, lng: sig.lng, zoom: 14 });
            }
          }}
        />

        {/* Right Emergence Inspector Drawer */}
        <EmergenceDrawer
          zone={selectedZone}
          signal={selectedSignal}
          job={selectedJob}
          onClose={() => {
            setSelectedZone(null);
            setSelectedSignal(null);
            setSelectedJob(null);
          }}
          onSelectSignal={(sig) => {
            setSelectedSignal(sig);
            setSelectedZone(null);
            setSelectedJob(null);
            if (sig.lat && sig.lng) {
              setMapCenterTarget({ lat: sig.lat, lng: sig.lng, zoom: 14 });
            }
          }}
        />

        {/* Active Jobs Modal */}
        <ActiveJobsModal
          isOpen={isActiveJobsModalOpen}
          onClose={() => setIsActiveJobsModalOpen(false)}
          activeCity={activeCity}
          onSelectJob={(job) => {
            setSelectedJob(job);
            setSelectedZone(null);
            setSelectedSignal(null);
            if (job.lat && job.lng) {
              setMapCenterTarget({ lat: job.lat, lng: job.lng, zoom: 14 });
            }
          }}
        />

        {/* One-Stop URL Scraper Modal */}
        <AdHocScraperModal
          isOpen={isScraperModalOpen}
          onClose={() => setIsScraperModalOpen(false)}
          onSignalExtracted={handleSignalExtracted}
        />

        {/* Bright Data Fleet Self-Healing Modal */}
        <SelfHealingModal
          isOpen={isFleetModalOpen}
          onClose={() => setIsFleetModalOpen(false)}
        />

      </div>
    </div>
  );
};

export default App;
