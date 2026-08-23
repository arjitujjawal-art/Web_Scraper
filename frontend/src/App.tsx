import React, { useEffect, useState } from 'react';
import { apiClient, getCoordinatesForLocation } from './api/client';
import type { OpportunityZone, SignalSummary, JobPosting, AdHocScrapeResult, CopilotCitation } from './api/types';
import { MapCanvas } from './components/map/MapCanvas';
import { HeaderHUD } from './components/header/HeaderHUD';
import { EmergenceDrawer } from './components/drawer/EmergenceDrawer';
import { AdHocScraperModal } from './components/scraper/AdHocScraperModal';
import { SelfHealingModal } from './components/fleet/SelfHealingModal';
import { CopilotChat } from './components/copilot/CopilotChat';
import { Bot } from 'lucide-react';

export const App: React.FC = () => {
  const [activeCity, setActiveCity] = useState<'delhi' | 'sf'>('delhi');
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [showJobsLayer, setShowJobsLayer] = useState<boolean>(true);

  // Data states
  const [zones, setZones] = useState<OpportunityZone[]>([]);
  const [signals, setSignals] = useState<SignalSummary[]>([]);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [backendHealthy, setBackendHealthy] = useState<boolean>(true);

  // Selection states
  const [selectedZone, setSelectedZone] = useState<OpportunityZone | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<SignalSummary | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);

  // Modals & Chat states
  const [isScraperModalOpen, setIsScraperModalOpen] = useState(false);
  const [isFleetModalOpen, setIsFleetModalOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(true);
  const [mapCenterTarget, setMapCenterTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);

  // Initial Data Fetch
  useEffect(() => {
    checkHealth();
  }, []);

  useEffect(() => {
    loadData();
  }, [activeCity, selectedDomain]);

  const checkHealth = async () => {
    try {
      await apiClient.getHealth();
      setBackendHealthy(true);
    } catch {
      setBackendHealthy(false);
    }
  };

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

  return (
    <div className="relative w-screen h-screen bg-[#070b14] overflow-hidden">
      {/* Top Glassmorphic HUD */}
      <HeaderHUD
        activeCity={activeCity}
        onSelectCity={(city) => {
          setActiveCity(city);
          setMapCenterTarget(null);
          setSelectedZone(null);
          setSelectedSignal(null);
          setSelectedJob(null);
        }}
        selectedDomain={selectedDomain}
        onSelectDomain={setSelectedDomain}
        showJobsLayer={showJobsLayer}
        onToggleJobsLayer={() => setShowJobsLayer((prev) => !prev)}
        onOpenScraperModal={() => setIsScraperModalOpen(true)}
        onOpenFleetModal={() => setIsFleetModalOpen(true)}
        onToggleCopilot={() => setIsCopilotOpen((prev) => !prev)}
        isCopilotOpen={isCopilotOpen}
        backendHealthy={backendHealthy}
      />

      {/* Main Google Maps Vector Canvas */}
      <main className="w-full h-full">
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
      </main>

      {/* Side Slide-In Inspection Drawer */}
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

      {/* One-Stop On-Demand Scraper Modal */}
      <AdHocScraperModal
        isOpen={isScraperModalOpen}
        onClose={() => setIsScraperModalOpen(false)}
        onSignalExtracted={handleSignalExtracted}
      />

      {/* Scraper Fleet Self-Healing Terminal Modal */}
      <SelfHealingModal
        isOpen={isFleetModalOpen}
        onClose={() => setIsFleetModalOpen(false)}
      />

      {/* Signal Copilot Floating Chat Widget */}
      <CopilotChat
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        onSelectCitation={handleSelectCitation}
      />

      {/* Floating Copilot Launcher Button when minimized */}
      {!isCopilotOpen && (
        <button
          onClick={() => setIsCopilotOpen(true)}
          className="fixed bottom-6 right-6 z-[9995] flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-2xl hover:scale-105 transition-all border border-cyan-300/40"
        >
          <div className="relative flex items-center justify-center">
            <span className="absolute w-full h-full rounded-full bg-slate-950/20 animate-ping" />
            <Bot className="w-4 h-4 text-slate-950" />
          </div>
          <span>Signal Copilot</span>
          <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
        </button>
      )}
    </div>
  );
};

export default App;
