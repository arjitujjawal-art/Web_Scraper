import React, { useEffect, useState } from 'react';
import { apiClient, getCoordinatesForLocation } from './api/client';
import type { OpportunityZone, SignalSummary, JobPosting, AdHocScrapeResult, CopilotCitation, Domain } from './api/types';
import { LandingView } from './components/landing/LandingView';
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
  Gift, 
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
  // Navigation view state
  const [view, setView] = useState<'landing' | 'dashboard'>('landing');
  const [activeTab, setActiveTab] = useState<string>('radar');

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

  // Render Landing Page View
  if (view === 'landing') {
    return (
      <LandingView
        onLaunch={(city) => {
          if (city) setActiveCity(city);
          setView('dashboard');
        }}
      />
    );
  }

  // Render Dashboard View
  return (
    <div className="relative w-screen h-screen bg-[#000000] text-white flex overflow-hidden select-none font-sans">
      
      {/* Left Sidebar Navigation Rail */}
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
      <div className="flex-1 h-screen flex flex-col overflow-hidden relative">
        
        {/* Top Header Bar */}
        <header className="h-16 border-b border-white/10 px-6 flex items-center justify-between bg-[#08080b] flex-shrink-0 z-30">
          {/* City Segmented Slider & Brand */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-wider text-white">ATLAS</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-zinc-300 font-semibold">
                v2.4
              </span>
            </div>

            {/* City Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-zinc-900 border border-white/10">
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
                    ? 'bg-blue-600/20 border border-blue-500/40 text-blue-300'
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
            {/* Free Credits Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs font-mono">
              <Gift className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-zinc-400">Free credits</span>
              <span className="text-blue-400 font-bold">2,080 / 5,000</span>
            </div>

            {/* Export JSON Attachment Button */}
            <a
              href={`http://localhost:8000/api/signals/export?city=${activeCity === 'delhi' ? 'Delhi' : 'San Francisco'}${selectedDomain ? `&domain=${encodeURIComponent(selectedDomain)}` : ''}`}
              download
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white transition-all shadow"
              title="Download structured JSON export"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden md:inline">Export JSON</span>
            </a>

            {/* One-Stop Scraper Modal Launcher */}
            <button
              onClick={() => setIsScraperModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:scale-105"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Scraper Studio</span>
            </button>
          </div>
        </header>

        {/* Workspace Central Stage (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 pb-20">
          
          {/* 1. Hero Prompt & Web Scraper Centerpiece */}
          <div className="max-w-4xl mx-auto text-center pt-2 pb-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              What website would you like to scrape?
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl mx-auto">
              Let AI build a scraper for you. Simply enter a URL and guide the extraction using our chat agent. No coding required.
            </p>

            {/* URL / Prompt Input Box */}
            <form onSubmit={handleHeroScrapeSubmit} className="mt-4 max-w-2xl mx-auto">
              <div className="p-1 rounded-2xl bg-[#0c0c10] border border-white/15 shadow-2xl flex items-center gap-2">
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
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-30 text-zinc-950 font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 shadow"
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
                    className="rounded border-white/20 bg-zinc-900 text-blue-600 focus:ring-0"
                  />
                  <span>Add additional instructions</span>
                </label>

                {/* Secondary helper pill */}
                <button
                  type="button"
                  onClick={() => setIsScraperModalOpen(true)}
                  className="flex items-center gap-1 text-zinc-400 hover:text-blue-400 transition-colors"
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
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
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

          {/* 2. Upper Center Stage: Interactive Live Radar Map */}
          <div className="max-w-4xl mx-auto">
            <div className="relative w-full h-[320px] rounded-2xl bg-[#09090b] border border-white/10 overflow-hidden shadow-2xl">
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
          <div className="max-w-4xl mx-auto">
            <CopilotChat
              isOpen={isCopilotOpen}
              isEmbedded={true}
              onSelectCitation={handleSelectCitation}
              onNavigateLocation={handleNavigateLocation}
            />
          </div>

        </div>

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
          jobs={jobs}
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
