/**
 * Signal Atlas — Data Service
 * Provides spatio-temporal signal dataset for Opportunities Mode (Live Scraped Simulation)
 * and Civic Issues Mode (Seeded Static Dataset per Section 0 spec resolution).
 */

export const OPPORTUNITIES_DATA = [
  {
    id: "opp-001",
    title: "Quantum Compute R&D Campus Expansion",
    city: "Austin, TX",
    coordinates: [30.2672, -97.7431],
    category: "R&D Hiring",
    emergenceScore: 8.42,
    scoreChange: "+140%",
    confidenceGloss: "High confidence — signal density well above 30-day baseline.",
    signalVelocity: "High",
    lastUpdated: "4 mins ago",
    sources: [
      { name: "Bright Data Scraper — Public Job Postings", count: 48, status: "Active", type: "Hiring" },
      { name: "USPTO Patent Assignment Feed", count: 6, status: "Active", type: "IP" },
      { name: "Travis County Commercial Permit Filings", count: 3, status: "Active", type: "Real Estate" },
      { name: "SEC Form D Corporate Filings", count: 1, status: "Active", type: "Finance" }
    ],
    radarMetrics: {
      diversity: 92,
      velocity: 88,
      density: 95,
      recency: 90
    },
    timeline: [
      { timestamp: "2026-08-22 14:10", label: "Bright Data detected 34 new Principal Compiler Engineer roles at secret location" },
      { timestamp: "2026-08-21 09:30", label: "Commercial permit #2026-8891 filed for 120,000 sq ft specialized HVAC cleanroom" },
      { timestamp: "2026-08-18 16:45", label: "Patent assignment transfer from MIT to stealth Delaware LLC" },
      { timestamp: "2026-08-10 11:00", label: "Initial baseline signal detected in local industrial zoning filings" }
    ],
    rawPayload: {
      cluster_id: "opp-001",
      geo_center: { lat: 30.2672, lng: -97.7431 },
      city: "Austin, TX",
      primary_collector: "brightdata_job_harvester_v2",
      detected_sources: [
        { source_id: "bd_job_99812", position: "Lead Quantum Hardware Architect", company: "Undisclosed R&D" },
        { source_id: "perm_tx_8891", type: "Commercial Remodel", valuation: "$18,500,000" }
      ],
      emergence_index: 8.42,
      score_breakdown: { velocity: 0.88, 'spatial_k-means': 0.95, source_entropy: 0.92 }
    }
  },
  {
    id: "opp-002",
    title: "Autonomous Vehicle Subsystem Testing Hub",
    city: "San Jose, CA",
    coordinates: [37.3382, -121.8863],
    category: "Corporate Filings",
    emergenceScore: 9.15,
    scoreChange: "+210%",
    confidenceGloss: "Critical convergence — 4 independent sources cross-verified.",
    signalVelocity: "Critical",
    lastUpdated: "2 mins ago",
    sources: [
      { name: "Bright Data Scraper — Tech Career Listings", count: 72, status: "Active", type: "Hiring" },
      { name: "FCC Experimental Radar License Filings", count: 4, status: "Active", type: "Regulatory" },
      { name: "Santa Clara Land Registry Leases", count: 2, status: "Active", type: "Real Estate" }
    ],
    radarMetrics: {
      diversity: 98,
      velocity: 96,
      density: 92,
      recency: 99
    },
    timeline: [
      { timestamp: "2026-08-22 16:30", label: "FCC grants 77GHz millimeter radar experimental emission permit" },
      { timestamp: "2026-08-22 11:15", label: "Bright Data scraper flagged 50+ AV Calibration Technicians in South Bay" },
      { timestamp: "2026-08-19 14:00", label: "Commercial lease executed for 45-acre test track parcel" }
    ],
    rawPayload: {
      cluster_id: "opp-002",
      geo_center: { lat: 37.3382, lng: -121.8863 },
      city: "San Jose, CA",
      primary_collector: "fcc_experimental_license_feed",
      detected_sources: [
        { source_id: "fcc_el_009981", frequency: "76-81 GHz", applicant: "Project Apex Mobility LLC" },
        { source_id: "lease_sc_7712", square_footage: 350000 }
      ],
      emergence_index: 9.15,
      score_breakdown: { velocity: 0.96, 'spatial_k-means': 0.92, source_entropy: 0.98 }
    }
  },
  {
    id: "opp-003",
    title: "Synthetic Biology Biomanufacturing Node",
    city: "Boston, MA",
    coordinates: [42.3601, -71.0589],
    category: "Patent Filings",
    emergenceScore: 7.85,
    scoreChange: "+85%",
    confidenceGloss: "Moderate-high signal — patent assignment matching hiring spikes.",
    signalVelocity: "Moderate",
    lastUpdated: "12 mins ago",
    sources: [
      { name: "USPTO Patent Registry Collector", count: 14, status: "Active", type: "IP" },
      { name: "Bright Data Scraper — Biotech Board Listings", count: 28, status: "Active", type: "Hiring" },
      { name: "MA Environmental Impact Review Notices", count: 1, status: "Active", type: "Regulatory" }
    ],
    radarMetrics: {
      diversity: 82,
      velocity: 78,
      density: 85,
      recency: 80
    },
    timeline: [
      { timestamp: "2026-08-22 15:00", label: "MEPA filing submitted for high-volume bioreactor waste treatment" },
      { timestamp: "2026-08-20 08:45", label: "Bright Data harvester cataloged 28 Fermentation Process Specialists" },
      { timestamp: "2026-08-15 13:20", label: "3 CRISPR scale-up patents assigned to Cambridge incubator" }
    ],
    rawPayload: {
      cluster_id: "opp-003",
      geo_center: { lat: 42.3601, lng: -71.0589 },
      city: "Boston, MA",
      primary_collector: "uspto_patent_assignment_stream",
      emergence_index: 7.85
    }
  },
  {
    id: "opp-004",
    title: "Hyperscale AI Micro-Data Center Substation",
    city: "Seattle, WA",
    coordinates: [47.6062, -122.3321],
    category: "Real Estate & Zoning",
    emergenceScore: 8.90,
    scoreChange: "+175%",
    confidenceGloss: "High confidence — grid power reservation combined with land option.",
    signalVelocity: "High",
    lastUpdated: "7 mins ago",
    sources: [
      { name: "Puget Sound Energy Interconnection Queue", count: 2, status: "Active", type: "Utility" },
      { name: "King County Zoning Amendment Filings", count: 5, status: "Active", type: "Real Estate" },
      { name: "Bright Data Scraper — Infrastructure Careers", count: 31, status: "Active", type: "Hiring" }
    ],
    radarMetrics: {
      diversity: 88,
      velocity: 92,
      density: 90,
      recency: 94
    },
    timeline: [
      { timestamp: "2026-08-22 12:40", label: "120MW grid interconnection request placed on queue" },
      { timestamp: "2026-08-21 16:10", label: "Zoning re-classification request for heavy industrial power overlay" },
      { timestamp: "2026-08-17 10:00", label: "Bright Data scraper flagged Data Center Electrical Engineers in Bellevue" }
    ],
    rawPayload: {
      cluster_id: "opp-004",
      geo_center: { lat: 47.6062, lng: -122.3321 },
      city: "Seattle, WA",
      primary_collector: "utility_interconnect_feed",
      emergence_index: 8.90
    }
  }
];

export const CIVIC_DATA = [
  {
    id: "civic-001",
    title: "South End Drainage & Flood Resilience Shift",
    city: "Austin, TX",
    coordinates: [30.2450, -97.7600],
    category: "Infrastructure & Climate",
    emergenceScore: 8.10,
    scoreChange: "+115%",
    confidenceGloss: "Seeded demo signal — high correlation between 311 flood calls & council agendas.",
    signalVelocity: "High",
    lastUpdated: "Seeded Dataset",
    sources: [
      { name: "Austin City Council Public Agenda Collector", count: 4, status: "Static Seed", type: "Agenda" },
      { name: "311 Drainage & Runoff Complaint Logs", count: 184, status: "Static Seed", type: "Civic 311" },
      { name: "FEMA Watershed Assessment Filings", count: 2, status: "Static Seed", type: "Federal" }
    ],
    radarMetrics: {
      diversity: 85,
      velocity: 82,
      density: 90,
      recency: 85
    },
    timeline: [
      { timestamp: "2026-08-22 10:00", label: "City Council Item #42: $14M emergency storm drain bond authorization" },
      { timestamp: "2026-08-19 18:30", label: "311 system recorded 184 localized flooding tickets following storm event" },
      { timestamp: "2026-08-12 14:00", label: "FEMA revised flood plain boundary draft published" }
    ],
    rawPayload: {
      cluster_id: "civic-001",
      is_seeded_demo: true,
      city: "Austin, TX",
      dataset_type: "civic_infrastructure",
      geo_center: { lat: 30.2450, lng: -97.7600 },
      emergence_index: 8.10
    }
  },
  {
    id: "civic-002",
    title: "Downtown Transit Priority Corridor Re-zoning",
    city: "San Jose, CA",
    coordinates: [37.3320, -121.8900],
    category: "Zoning & Transit",
    emergenceScore: 7.60,
    scoreChange: "+90%",
    confidenceGloss: "Seeded demo signal — planning commission draft matches transit grant application.",
    signalVelocity: "Moderate",
    lastUpdated: "Seeded Dataset",
    sources: [
      { name: "VTA Transit Development Advisory", count: 3, status: "Static Seed", type: "Transit" },
      { name: "San Jose Planning Commission Agenda", count: 6, status: "Static Seed", type: "Agenda" }
    ],
    radarMetrics: {
      diversity: 78,
      velocity: 74,
      density: 82,
      recency: 78
    },
    timeline: [
      { timestamp: "2026-08-21 15:30", label: "Planning commission proposes parking minimum elimination in transit zone" },
      { timestamp: "2026-08-16 09:15", label: "VTA submits federal bus rapid transit lane reservation grant" }
    ],
    rawPayload: {
      cluster_id: "civic-002",
      is_seeded_demo: true,
      city: "San Jose, CA",
      dataset_type: "civic_transit",
      geo_center: { lat: 37.3320, lng: -121.8900 },
      emergence_index: 7.60
    }
  },
  {
    id: "civic-003",
    title: "Waterfront Industrial Noise & Air Quality Overlay",
    city: "Seattle, WA",
    coordinates: [47.5850, -122.3400],
    category: "Regulatory & Health",
    emergenceScore: 8.75,
    scoreChange: "+160%",
    confidenceGloss: "Seeded demo signal — multi-point sensor network spikes match council petitions.",
    signalVelocity: "High",
    lastUpdated: "Seeded Dataset",
    sources: [
      { name: "Puget Sound Clean Air Agency Notices", count: 8, status: "Static Seed", type: "Environmental" },
      { name: "Seattle Port Authority Citizen Petitions", count: 310, status: "Static Seed", type: "Public" }
    ],
    radarMetrics: {
      diversity: 90,
      velocity: 88,
      density: 92,
      recency: 89
    },
    timeline: [
      { timestamp: "2026-08-22 08:00", label: "Clean Air Agency issues compliance order for maritime diesel exhaust" },
      { timestamp: "2026-08-18 11:30", label: "Citizen petition with 310 verified signatures submitted to Port Commissioners" }
    ],
    rawPayload: {
      cluster_id: "civic-003",
      is_seeded_demo: true,
      city: "Seattle, WA",
      dataset_type: "civic_regulatory",
      geo_center: { lat: 47.5850, lng: -122.3400 },
      emergence_index: 8.75
    }
  }
];

export function getDataset(mode = "opportunities", filters = {}) {
  const data = mode === "civic" ? CIVIC_DATA : OPPORTUNITIES_DATA;
  
  return data.filter(item => {
    // City filter
    if (filters.city && filters.city !== "all" && item.city !== filters.city) {
      return false;
    }
    // Category filter
    if (filters.category && filters.category !== "all" && item.category !== filters.category) {
      return false;
    }
    // Min Emergence Score filter
    if (filters.minScore && item.emergenceScore < parseFloat(filters.minScore)) {
      return false;
    }
    return true;
  });
}

export function getSignalById(id) {
  return [...OPPORTUNITIES_DATA, ...CIVIC_DATA].find(s => s.id === id);
}

export function getCities() {
  return ["all", "Austin, TX", "San Jose, CA", "Seattle, WA", "Boston, MA"];
}

export function getCategories(mode = "opportunities") {
  if (mode === "civic") {
    return ["all", "Infrastructure & Climate", "Zoning & Transit", "Regulatory & Health"];
  }
  return ["all", "R&D Hiring", "Corporate Filings", "Patent Filings", "Real Estate & Zoning"];
}

