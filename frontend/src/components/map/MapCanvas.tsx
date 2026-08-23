import React, { useCallback, useEffect, useState } from 'react';
import { GoogleMap, useJsApiLoader, OverlayView } from '@react-google-maps/api';
import type { OpportunityZone, SignalSummary, JobPosting } from '../../api/types';
import { cyberDarkMapStyle, DOMAIN_COLORS, CITY_CENTERS } from '../../styles/mapTheme';
import { Sparkles, Building2, GraduationCap, Calendar, Briefcase, Zap, Compass, Layers } from 'lucide-react';

interface MapCanvasProps {
  activeCity: 'delhi' | 'sf';
  zones: OpportunityZone[];
  signals: SignalSummary[];
  jobs: JobPosting[];
  showJobsLayer: boolean;
  selectedZone: OpportunityZone | null;
  onSelectZone: (zone: OpportunityZone | null) => void;
  selectedSignal: SignalSummary | null;
  onSelectSignal: (signal: SignalSummary | null) => void;
  selectedJob: JobPosting | null;
  onSelectJob: (job: JobPosting | null) => void;
  mapCenterTarget?: { lat: number; lng: number; zoom?: number } | null;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const mapOptions: google.maps.MapOptions = {
  styles: cyberDarkMapStyle,
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  backgroundColor: '#070b14',
  minZoom: 4,
  maxZoom: 18,
};

export const MapCanvas: React.FC<MapCanvasProps> = ({
  activeCity,
  zones,
  signals,
  jobs,
  showJobsLayer,
  selectedZone,
  onSelectZone,
  selectedSignal,
  onSelectSignal,
  selectedJob,
  onSelectJob,
  mapCenterTarget,
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const cityConfig = CITY_CENTERS[activeCity];

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Pan to target city on switcher change
  useEffect(() => {
    if (map) {
      if (mapCenterTarget) {
        map.panTo({ lat: mapCenterTarget.lat, lng: mapCenterTarget.lng });
        if (mapCenterTarget.zoom) map.setZoom(mapCenterTarget.zoom);
      } else {
        map.panTo(cityConfig.center);
        map.setZoom(cityConfig.zoom);
      }
    }
  }, [map, activeCity, mapCenterTarget, cityConfig]);

  // Handle Zoom In / Zoom Out / Center
  const handleZoomIn = () => map && map.setZoom((map.getZoom() || 11) + 1);
  const handleZoomOut = () => map && map.setZoom((map.getZoom() || 11) - 1);
  const handleResetCenter = () => map && map.panTo(cityConfig.center);

  // If Google Maps API is loaded, render the Google Map canvas
  return (
    <div className="relative w-full h-full bg-[#070b14] overflow-hidden">
      {isLoaded && !loadError ? (
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={cityConfig.center}
          zoom={cityConfig.zoom}
          options={mapOptions}
          onLoad={onLoad}
          onUnmount={onUnmount}
          onClick={() => {
            onSelectZone(null);
            onSelectSignal(null);
            onSelectJob(null);
          }}
        >
          {/* Layer 1: Opportunity Zones Glowing Radars & Badges */}
          {zones.map((zone) => {
            const domainStyle = DOMAIN_COLORS[zone.domain] || DOMAIN_COLORS['AI/ML'];
            const isSelected = selectedZone?.city === zone.city && selectedZone?.domain === zone.domain;

            return (
              <OverlayView
                key={`zone-${zone.city}-${zone.domain}`}
                position={{ lat: zone.lat, lng: zone.lng }}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                <div
                  className="relative -translate-x-1/2 -translate-y-1/2 cursor-pointer group select-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectZone(zone);
                    onSelectSignal(null);
                    onSelectJob(null);
                  }}
                >
                  {/* Glowing Pulsing Radar Rings */}
                  <div
                    className="absolute -inset-8 rounded-full pointer-events-none opacity-40 group-hover:opacity-80 transition-opacity"
                    style={{
                      background: `radial-gradient(circle, ${domainStyle.glow} 0%, transparent 70%)`,
                    }}
                  />
                  <div
                    className="absolute -inset-10 rounded-full border border-cyan-400/30 radar-ring pointer-events-none"
                    style={{ borderColor: domainStyle.hex }}
                  />
                  <div
                    className="absolute -inset-14 rounded-full border border-cyan-400/20 radar-ring-delayed pointer-events-none"
                    style={{ borderColor: domainStyle.hex }}
                  />

                  {/* Core Badge Pin */}
                  <div
                    className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel-elevated border transition-all duration-300 transform group-hover:scale-110 shadow-2xl ${
                      isSelected
                        ? 'border-cyan-400 ring-2 ring-cyan-400/50 scale-110'
                        : 'border-slate-700/80'
                    }`}
                    style={{
                      boxShadow: `0 0 20px ${domainStyle.glow}`,
                    }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full animate-ping"
                      style={{ backgroundColor: domainStyle.hex }}
                    />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold tracking-tight text-white">
                          {zone.primary_area || zone.city}
                        </span>
                        <span
                          className="text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase"
                          style={{
                            backgroundColor: `${domainStyle.hex}25`,
                            color: domainStyle.hex,
                          }}
                        >
                          {zone.domain}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-300">
                        <span className="flex items-center gap-0.5 text-amber-400 font-mono font-bold">
                          <Zap className="w-3 h-3 fill-amber-400" />
                          {zone.emergence_score.toFixed(2)}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-400">
                          {zone.signal_count} signals
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </OverlayView>
            );
          })}

          {/* Layer 2: Verified Emerging Signals Markers */}
          {signals.map((sig) => {
            const isSelected = selectedSignal?.signal_id === sig.signal_id;
            const domainStyle = DOMAIN_COLORS[sig.domain] || DOMAIN_COLORS['AI/ML'];
            if (!sig.lat || !sig.lng) return null;

            return (
              <OverlayView
                key={`sig-${sig.signal_id}`}
                position={{ lat: sig.lat, lng: sig.lng }}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                <div
                  className="relative -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSignal(sig);
                    onSelectZone(null);
                    onSelectJob(null);
                  }}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center border shadow-lg transition-transform transform group-hover:scale-125 ${
                      isSelected
                        ? 'bg-white text-slate-950 border-white ring-2 ring-cyan-400 scale-125'
                        : 'bg-slate-900/90 hover:scale-110'
                    }`}
                    style={{
                      color: domainStyle.hex,
                      borderColor: `${domainStyle.hex}60`,
                    }}
                  >
                    {sig.source_type === 'university_research' ? (
                      <GraduationCap className="w-3.5 h-3.5" />
                    ) : sig.source_type === 'incubator_cohort' ? (
                      <Building2 className="w-3.5 h-3.5" />
                    ) : sig.source_type === 'tech_event' ? (
                      <Calendar className="w-3.5 h-3.5" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                  </div>
                </div>
              </OverlayView>
            );
          })}

          {/* Layer 3: Active Jobs Overlay Pins */}
          {showJobsLayer &&
            jobs.map((job) => {
              const isSelected = selectedJob?.id === job.id;
              if (!job.lat || !job.lng) return null;

              return (
                <OverlayView
                  key={`job-${job.id}`}
                  position={{ lat: job.lat, lng: job.lng }}
                  mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                >
                  <div
                    className="relative -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectJob(job);
                      onSelectZone(null);
                      onSelectSignal(null);
                    }}
                  >
                    <div
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium border shadow-lg transition-all transform group-hover:scale-110 ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 border-white ring-2 ring-emerald-400 font-bold scale-110'
                          : 'bg-slate-900/90 text-emerald-300 border-emerald-500/40 hover:border-emerald-400'
                      }`}
                    >
                      <Briefcase className="w-3 h-3" />
                      <span className="truncate max-w-[90px]">{job.company}</span>
                    </div>
                  </div>
                </OverlayView>
              );
            })}
        </GoogleMap>
      ) : (
        /* Cyber Fallback Map View with Full Interactivity */
        <div className="relative w-full h-full flex items-center justify-center bg-[#070b14] overflow-hidden">
          {/* Cyber Grid Background */}
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(to right, #1e2d4d 1px, transparent 1px), linear-gradient(to bottom, #1e2d4d 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
            }}
          />
          {/* Glowing Center Radial */}
          <div className="absolute w-[600px] h-[600px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />

          {/* Interactive Opportunity Zones Overlay Cards */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-12 max-w-6xl w-full max-h-[85vh] overflow-y-auto">
            {zones.map((zone) => {
              const domainStyle = DOMAIN_COLORS[zone.domain] || DOMAIN_COLORS['AI/ML'];
              const isSelected = selectedZone?.city === zone.city && selectedZone?.domain === zone.domain;

              return (
                <div
                  key={`fallback-zone-${zone.city}-${zone.domain}`}
                  onClick={() => onSelectZone(zone)}
                  className={`p-6 rounded-2xl glass-panel-elevated border cursor-pointer transition-all duration-300 hover:scale-[1.03] shadow-2xl relative overflow-hidden group ${
                    isSelected ? 'border-cyan-400 ring-2 ring-cyan-400/50' : 'border-slate-800 hover:border-cyan-500/50'
                  }`}
                >
                  <div
                    className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl opacity-20 pointer-events-none"
                    style={{ backgroundColor: domainStyle.hex }}
                  />

                  <div className="flex items-center justify-between mb-4">
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
                      style={{
                        backgroundColor: `${domainStyle.hex}20`,
                        color: domainStyle.hex,
                      }}
                    >
                      {zone.domain}
                    </span>
                    <span className="flex items-center gap-1 text-sm font-mono font-bold text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full">
                      <Zap className="w-3.5 h-3.5 fill-amber-400" />
                      {zone.emergence_score.toFixed(2)}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-1">
                    {zone.primary_area || zone.city}
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">
                    {zone.city} Tech Opportunity Cluster
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800/80 text-xs">
                    <div>
                      <span className="text-slate-500 block">Signals</span>
                      <span className="text-slate-200 font-semibold">{zone.signal_count} verified</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Confidence</span>
                      <span className="text-cyan-400 font-semibold uppercase">{zone.confidence}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="absolute bottom-6 left-6 z-20 glass-panel px-4 py-2 rounded-lg text-xs text-slate-400 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Interactive Cyber Vector Grid Active (API Key optional)</span>
          </div>
        </div>
      )}

      {/* Floating Map HUD Controls (Zoom In/Out, Reset Center) */}
      <div className="absolute top-24 right-6 z-20 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="w-10 h-10 rounded-xl glass-panel-elevated border border-slate-700/70 hover:border-cyan-400/80 text-white flex items-center justify-center transition-all hover:scale-105 shadow-xl"
          title="Zoom In"
        >
          <span className="text-lg font-bold">+</span>
        </button>
        <button
          onClick={handleZoomOut}
          className="w-10 h-10 rounded-xl glass-panel-elevated border border-slate-700/70 hover:border-cyan-400/80 text-white flex items-center justify-center transition-all hover:scale-105 shadow-xl"
          title="Zoom Out"
        >
          <span className="text-lg font-bold">-</span>
        </button>
        <button
          onClick={handleResetCenter}
          className="w-10 h-10 rounded-xl glass-panel-elevated border border-slate-700/70 hover:border-cyan-400/80 text-cyan-400 flex items-center justify-center transition-all hover:scale-105 shadow-xl"
          title="Reset to City Center"
        >
          <Compass className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
