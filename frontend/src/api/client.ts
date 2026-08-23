import type { 
  OpportunityZone, 
  SignalSummary, 
  JobPosting, 
  CollectorStatus, 
  AdHocScrapeResult,
} from './types';

const normalizeApiBase = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (envUrl) {
    const clean = envUrl.replace(/\/+$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return '/api';
  }
  return 'https://signal-atlas-api.onrender.com/api';
};

export const API_BASE = normalizeApiBase();

export const apiClient = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  async getZones(city?: string, domain?: string, minScore?: number): Promise<{ items: OpportunityZone[]; total: number }> {
    const params = new URLSearchParams();
    if (city) params.append('city', city);
    if (domain) params.append('domain', domain);
    if (minScore !== undefined) params.append('min_score', minScore.toString());
    
    const res = await fetch(`${API_BASE}/zones?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch opportunity zones');
    const data = await res.json();
    
    // Map lat/lng coordinates and score fields safely
    const items = (data.items || []).map((z: any) => {
      const coords = getCoordinatesForLocation(z.city, z.primary_area);
      const lat = Number(z.coordinates?.latitude ?? coords.lat);
      const lng = Number(z.coordinates?.longitude ?? coords.lng);
      const emergence_score = Number(z.emergence_score ?? z.score ?? 0);
      const signal_count = Number(z.signal_count ?? (z.signal_ids?.length || 0));
      const confidence = (z.confidence || 'medium').toString().toLowerCase();
      const velocity_delta = Number(z.velocity_delta ?? z.velocity ?? 0.35);

      return {
        ...z,
        emergence_score,
        signal_count,
        confidence,
        velocity_delta,
        lat,
        lng,
      };
    });
    return { items, total: data.total || items.length };
  },

  async getSignals(city?: string, domain?: string, sourceType?: string, limit = 50): Promise<{ items: SignalSummary[]; total: number }> {
    const params = new URLSearchParams();
    if (city) params.append('city', city);
    if (domain) params.append('domain', domain);
    if (sourceType) params.append('source_type', sourceType);
    params.append('limit', limit.toString());

    const res = await fetch(`${API_BASE}/signals?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch signals');
    const data = await res.json();

    const items = (data.items || []).map((s: any) => {
      const coords = getCoordinatesForLocation(s.city, s.area);
      const lat = Number(s.coordinates?.latitude ?? s.lat ?? coords.lat);
      const lng = Number(s.coordinates?.longitude ?? s.lng ?? coords.lng);
      return {
        ...s,
        lat,
        lng,
      };
    });
    return { items, total: data.total || items.length };
  },

  async downloadSignalsExport(city?: string, domain?: string): Promise<void> {
    const params = new URLSearchParams();
    if (city) params.append('city', city);
    if (domain) params.append('domain', domain);

    const res = await fetch(`${API_BASE}/signals/export?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to export signals');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `signals_${(city || 'all').toLowerCase()}_${(domain || 'all').toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      window.URL.revokeObjectURL(url);
    }, 1000);
  },

  async getJobs(city?: string, domain?: string, keyword?: string, limit = 50): Promise<{ items: JobPosting[]; total: number }> {
    const params = new URLSearchParams();
    if (city) params.append('city', city);
    if (domain) params.append('domain', domain);
    if (keyword) params.append('keyword', keyword);
    params.append('limit', limit.toString());

    const res = await fetch(`${API_BASE}/jobs?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch jobs');
    const data = await res.json();
    const items = (data.items || []).map((j: any) => {
      const coords = getCoordinatesForLocation(j.location || j.city || '', `${j.title} ${j.company} ${j.location || ''}`);
      const lat = Number(j.lat ?? coords.lat);
      const lng = Number(j.lng ?? coords.lng);
      return {
        ...j,
        lat,
        lng,
      };
    });
    return { items, total: data.total || items.length };
  },

  async getCollectors(): Promise<{ items: CollectorStatus[]; total: number; needs_attention: number }> {
    const res = await fetch(`${API_BASE}/collectors`);
    if (!res.ok) throw new Error('Failed to fetch collectors');
    return res.json();
  },

  async triggerAdHocScrape(url: string, prompt: string): Promise<AdHocScrapeResult> {
    const res = await fetch(`${API_BASE}/collectors/ad-hoc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, prompt }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Scrape failed' }));
      throw new Error(err.detail || 'Scraping failed');
    }
    return res.json();
  },

  async triggerRun(collectorKey: string, url?: string, adminKey = 'jAQ7w86UApj4g6WHWvP63d4uHr88V5TI0QUetXAx5k4') {
    const res = await fetch(`${API_BASE}/collectors/${collectorKey}/run`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Admin-Key': adminKey 
      },
      body: JSON.stringify(url ? { url } : {}),
    });
    return res.json();
  },

  async triggerHeal(collectorKey: string, prompt: string, adminKey = 'jAQ7w86UApj4g6WHWvP63d4uHr88V5TI0QUetXAx5k4') {
    const res = await fetch(`${API_BASE}/collectors/${collectorKey}/heal`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Admin-Key': adminKey 
      },
      body: JSON.stringify({ prompt }),
    });
    return res.json();
  },

  async triggerApprove(collectorKey: string, adminKey = 'jAQ7w86UApj4g6WHWvP63d4uHr88V5TI0QUetXAx5k4') {
    const res = await fetch(`${API_BASE}/collectors/${collectorKey}/approve`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Admin-Key': adminKey 
      },
    });
    return res.json();
  },

  async pollRun(runId: string) {
    const res = await fetch(`${API_BASE}/collector-runs/${runId}`);
    return res.json();
  },

  async sendChatMessage(message: string): Promise<{ reply: string; citations: any[]; tools_used: string[]; grounded: boolean }> {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Copilot unavailable' }));
      throw new Error(err.detail || 'Copilot communication error');
    }
    return res.json();
  },
};

// Accurate City & Sub-district Lat/Lng coordinate resolution
export function getCoordinatesForLocation(city: string, area?: string): { lat: number; lng: number } {
  const combined = `${city || ''} ${area || ''}`.toLowerCase();

  // Specific Noida sectors
  if (combined.includes('noida')) {
    if (combined.includes('62') || combined.includes('vision') || combined.includes('indosilicon')) return { lat: 28.6280, lng: 77.3649 };
    if (combined.includes('125') || combined.includes('greenpower') || combined.includes('expressway')) return { lat: 28.5450, lng: 77.3320 };
    if (combined.includes('132') || combined.includes('cleangrid')) return { lat: 28.5080, lng: 77.3750 };
    if (combined.includes('63') || combined.includes('aerorobotics')) return { lat: 28.6210, lng: 77.3810 };
    return { lat: 28.5355 + (Math.random() - 0.5) * 0.02, lng: 77.3910 + (Math.random() - 0.5) * 0.02 };
  }

  // Specific Gurugram hubs
  if (combined.includes('gurugram') || combined.includes('gurgaon')) {
    if (combined.includes('cyber') || combined.includes('cybertech') || combined.includes('paywave')) return { lat: 28.4950, lng: 77.0890 };
    if (combined.includes('golf') || combined.includes('alphaquant')) return { lat: 28.4480, lng: 77.1020 };
    return { lat: 28.4595 + (Math.random() - 0.5) * 0.02, lng: 77.0266 + (Math.random() - 0.5) * 0.02 };
  }

  // Delhi Core hubs
  if (combined.includes('delhi') || combined.includes('okhla') || combined.includes('hauz khas')) {
    if (combined.includes('hauz khas') || combined.includes('iit')) return { lat: 28.5450, lng: 77.1926 };
    if (combined.includes('okhla') || combined.includes('iiit') || combined.includes('indobotics')) return { lat: 28.5355, lng: 77.2732 };
    if (combined.includes('connaught') || combined.includes('central')) return { lat: 28.6315, lng: 77.2167 };
    return { lat: 28.6139 + (Math.random() - 0.5) * 0.03, lng: 77.2090 + (Math.random() - 0.5) * 0.03 };
  }

  // San Francisco Bay Area Hubs
  if (combined.includes('san francisco') || combined.includes('berkeley') || combined.includes('palo alto') || combined.includes('santa clara') || combined.includes('bay area')) {
    if (combined.includes('berkeley') || combined.includes('bair') || combined.includes('helixgen')) return { lat: 37.8719, lng: -122.2585 };
    if (combined.includes('mission bay') || combined.includes('aura robotics')) return { lat: 37.7690, lng: -122.3910 };
    if (combined.includes('soma') || combined.includes('nexus ai')) return { lat: 37.7785, lng: -122.3990 };
    if (combined.includes('palo alto') || combined.includes('stanford')) return { lat: 37.4275, lng: -122.1697 };
    if (combined.includes('santa clara') || combined.includes('siliconedge')) return { lat: 37.3541, lng: -121.9552 };
    return { lat: 37.7749 + (Math.random() - 0.5) * 0.03, lng: -122.4194 + (Math.random() - 0.5) * 0.03 };
  }

  // Default Delhi Center
  return { lat: 28.6139, lng: 77.2090 };
}
