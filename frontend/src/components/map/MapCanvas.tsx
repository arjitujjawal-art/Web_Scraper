import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { OpportunityZone, SignalSummary, JobPosting } from '../../api/types';
import { DOMAIN_COLORS, CITY_CENTERS } from '../../styles/mapTheme';

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

// Controller to smoothly animate the map camera on state changes
const MapController: React.FC<{
  center: [number, number];
  zoom: number;
  target?: { lat: number; lng: number; zoom?: number } | null;
}> = ({ center, zoom, target }) => {
  const map = useMap();

  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], target.zoom || 13, { duration: 1.2 });
    } else {
      map.flyTo(center, zoom, { duration: 1.2 });
    }
  }, [center, zoom, target, map]);

  return null;
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
  const cityConfig = CITY_CENTERS[activeCity];
  const centerPos: [number, number] = [cityConfig.center.lat, cityConfig.center.lng];

  // Helper to build custom HTML DivIcon for Opportunity Zone Pins
  const createZoneIcon = (zone: OpportunityZone, isSelected: boolean) => {
    const domainStyle = DOMAIN_COLORS[zone.domain] || DOMAIN_COLORS['AI/ML'];
    const borderClass = isSelected ? 'border-cyan-400 ring-2 ring-cyan-400/50 scale-110' : 'border-slate-700/90';

    const html = `
      <div class="relative -translate-x-1/2 -translate-y-1/2 cursor-pointer group select-none">
        <div class="relative flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel-elevated border ${borderClass} shadow-2xl transition-all"
             style="box-shadow: 0 0 20px ${domainStyle.glow};">
          <div class="w-2.5 h-2.5 rounded-full animate-ping" style="background-color: ${domainStyle.hex};"></div>
          <div class="flex flex-col">
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-bold tracking-tight text-white whitespace-nowrap">${zone.primary_area || zone.city}</span>
              <span class="text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase whitespace-nowrap" style="background-color: ${domainStyle.hex}25; color: ${domainStyle.hex};">
                ${zone.domain}
              </span>
            </div>
            <div class="flex items-center gap-1 text-[10px] text-slate-300">
              <span class="text-amber-400 font-mono font-bold">⚡ ${zone.emergence_score.toFixed(2)}</span>
              <span class="text-slate-400">·</span>
              <span class="text-slate-400">${zone.signal_count} signals</span>
            </div>
          </div>
        </div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-div-icon',
      iconSize: [140, 40],
      iconAnchor: [70, 20],
    });
  };

  // Helper to build custom HTML DivIcon for Signal Pins
  const createSignalIcon = (sig: SignalSummary, isSelected: boolean) => {
    const domainStyle = DOMAIN_COLORS[sig.domain] || DOMAIN_COLORS['AI/ML'];
    const bg = isSelected ? '#ffffff' : '#090e1c';
    const text = isSelected ? '#090e1c' : domainStyle.hex;

    const html = `
      <div class="relative -translate-x-1/2 -translate-y-1/2 cursor-pointer">
        <div class="w-7 h-7 rounded-full flex items-center justify-center border shadow-xl transition-transform hover:scale-125"
             style="background-color: ${bg}; color: ${text}; border-color: ${domainStyle.hex}80;">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
          </svg>
        </div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-div-icon',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  };

  // Helper to build custom HTML DivIcon for Active Job Pins
  const createJobIcon = (job: JobPosting, isSelected: boolean) => {
    const bg = isSelected ? '#10b981' : '#090e1c';
    const text = isSelected ? '#090e1c' : '#6ee7b7';

    const html = `
      <div class="relative -translate-x-1/2 -translate-y-1/2 cursor-pointer">
        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold border shadow-lg transition-transform hover:scale-110 whitespace-nowrap"
             style="background-color: ${bg}; color: ${text}; border-color: #10b98180;">
          <span>💼</span>
          <span class="truncate max-w-[100px]">${job.company}</span>
        </div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-div-icon',
      iconSize: [120, 24],
      iconAnchor: [60, 12],
    });
  };

  return (
    <div className="relative w-full h-full bg-[#070b14] overflow-hidden">
      <MapContainer
        center={centerPos}
        zoom={cityConfig.zoom}
        scrollWheelZoom={true}
        zoomControl={false}
        attributionControl={true}
        className="w-full h-full"
      >
        {/* Dark Cyber Vector Map Tiles (CartoDB Dark Matter) */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* Camera Fly Controller */}
        <MapController
          center={centerPos}
          zoom={cityConfig.zoom}
          target={mapCenterTarget}
        />

        {/* Layer 1: Opportunity Zones Glowing Radar Circles & Badge Markers */}
        {zones.map((zone) => {
          const domainStyle = DOMAIN_COLORS[zone.domain] || DOMAIN_COLORS['AI/ML'];
          const isSelected = selectedZone?.city === zone.city && selectedZone?.domain === zone.domain;

          return (
            <React.Fragment key={`zone-frag-${zone.city}-${zone.domain}`}>
              {/* Glowing Concentric Radar Circles */}
              <Circle
                center={[zone.lat, zone.lng]}
                radius={2500 + zone.emergence_score * 300}
                pathOptions={{
                  color: domainStyle.hex,
                  fillColor: domainStyle.hex,
                  fillOpacity: isSelected ? 0.25 : 0.12,
                  weight: isSelected ? 2 : 1,
                  dashArray: isSelected ? '4, 4' : undefined,
                }}
                eventHandlers={{
                  click: () => {
                    onSelectZone(zone);
                    onSelectSignal(null);
                    onSelectJob(null);
                  },
                }}
              />

              {/* Core Badge Marker */}
              <Marker
                position={[zone.lat, zone.lng]}
                icon={createZoneIcon(zone, isSelected)}
                eventHandlers={{
                  click: () => {
                    onSelectZone(zone);
                    onSelectSignal(null);
                    onSelectJob(null);
                  },
                }}
              />
            </React.Fragment>
          );
        })}

        {/* Layer 2: Verified Emerging Signals Markers */}
        {signals.map((sig) => {
          if (!sig.lat || !sig.lng) return null;
          const isSelected = selectedSignal?.signal_id === sig.signal_id;

          return (
            <Marker
              key={`sig-${sig.signal_id}`}
              position={[sig.lat, sig.lng]}
              icon={createSignalIcon(sig, isSelected)}
              eventHandlers={{
                click: () => {
                  onSelectSignal(sig);
                  onSelectZone(null);
                  onSelectJob(null);
                },
              }}
            >
              <Popup>
                <div className="p-1">
                  <span className="text-[9px] font-mono text-cyan-400 uppercase font-bold">{sig.domain} · {sig.signal_type}</span>
                  <h4 className="text-xs font-bold text-white mt-1 leading-snug">{sig.title}</h4>
                  <p className="text-[10px] text-slate-300 mt-1 line-clamp-2">{sig.summary}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Layer 3: Active Jobs Secondary Layer Markers */}
        {showJobsLayer &&
          jobs.map((job) => {
            if (!job.lat || !job.lng) return null;
            const isSelected = selectedJob?.id === job.id;

            return (
              <Marker
                key={`job-${job.id}`}
                position={[job.lat, job.lng]}
                icon={createJobIcon(job, isSelected)}
                eventHandlers={{
                  click: () => {
                    onSelectJob(job);
                    onSelectZone(null);
                    onSelectSignal(null);
                  },
                }}
              >
                <Popup>
                  <div className="p-1">
                    <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase">{job.company}</span>
                    <h4 className="text-xs font-bold text-white mt-0.5">{job.title}</h4>
                    <p className="text-[10px] font-mono text-amber-300 font-bold mt-1">{job.salary_range}</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
};
