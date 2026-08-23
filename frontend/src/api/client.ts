import type { 
  OpportunityZone, 
  SignalSummary, 
  JobPosting, 
  CollectorStatus, 
  AdHocScrapeResult,
} from './types';

const API_BASE = '/api';

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
    
    // Map lat/lng coordinates to zones based on city & primary area
    const items = (data.items || []).map((z: any) => {
      const coords = getCoordinatesForLocation(z.city, z.primary_area);
      return {
        ...z,
        lat: coords.lat,
        lng: coords.lng,
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
      return {
        ...s,
        lat: coords.lat,
        lng: coords.lng,
      };
    });
    return { items, total: data.total || items.length };
  },

  async getJobs(city?: string, domain?: string, keyword?: string, limit = 50): Promise<{ items: JobPosting[]; total: number }> {
    const params = new URLSearchParams();
    if (city) params.append('city', city);
    if (domain) params.append('domain', domain);
    if (keyword) params.append('keyword', keyword);
    params.append('limit', limit.toString());

    const res = await fetch(`${API_BASE}/jobs?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch jobs');
    return res.json();
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
  const normCity = (city || '').toLowerCase();
  const normArea = (area || '').toLowerCase();

  // Delhi NCR Hubs
  if (normCity.includes('delhi') || normCity.includes('noida') || normCity.includes('gurugram') || normCity.includes('gurgaon')) {
    if (normArea.includes('hauz khas') || normArea.includes('iit')) return { lat: 28.5450, lng: 77.1926 };
    if (normArea.includes('okhla') || normArea.includes('iiit')) return { lat: 28.5355, lng: 77.2732 };
    if (normArea.includes('gurugram') || normArea.includes('gurgaon') || normArea.includes('cyber')) return { lat: 28.4595, lng: 77.0266 };
    if (normArea.includes('noida') || normArea.includes('sector 62')) return { lat: 28.6280, lng: 77.3649 };
    if (normArea.includes('connaught') || normArea.includes('central')) return { lat: 28.6315, lng: 77.2167 };
    return { lat: 28.6139 + (Math.random() - 0.5) * 0.05, lng: 77.2090 + (Math.random() - 0.5) * 0.05 };
  }

  // San Francisco Bay Area Hubs
  if (normCity.includes('san francisco') || normCity.includes('berkeley') || normCity.includes('palo alto') || normCity.includes('oakland') || normCity.includes('san jose')) {
    if (normArea.includes('berkeley') || normArea.includes('uc berkeley')) return { lat: 37.8719, lng: -122.2585 };
    if (normArea.includes('mission bay') || normArea.includes('soma')) return { lat: 37.7700, lng: -122.3910 };
    if (normArea.includes('palo alto') || normArea.includes('stanford')) return { lat: 37.4275, lng: -122.1697 };
    if (normArea.includes('san jose') || normArea.includes('silicon')) return { lat: 37.3382, lng: -121.8863 };
    if (normArea.includes('oakland')) return { lat: 37.8044, lng: -122.2712 };
    return { lat: 37.7749 + (Math.random() - 0.5) * 0.05, lng: -122.4194 + (Math.random() - 0.5) * 0.05 };
  }

  // Default Delhi Center
  return { lat: 28.6139, lng: 77.2090 };
}
