export type Domain = 
  | 'AI/ML' 
  | 'Robotics' 
  | 'Biotech' 
  | 'Climate & Energy' 
  | 'Semiconductors' 
  | 'Fintech' 
  | 'Cybersecurity' 
  | 'Quantum' 
  | 'Space';

export type Confidence = 'high' | 'medium' | 'low';

export type SignalType = 
  | 'FACILITY_EXPANSION' 
  | 'RESEARCH_GRANT' 
  | 'INCUBATOR_COHORT' 
  | 'TECH_EVENT';

export type SourceType = 
  | 'university_research' 
  | 'incubator_cohort' 
  | 'startup_newsroom' 
  | 'tech_event';

export type CollectorHealth = 'HEALTHY' | 'DEGRADED' | 'UNPROVISIONED' | 'FAILED';

export interface OpportunityZone {
  city: string;
  domain: string;
  emergence_score: number;
  confidence: Confidence;
  signal_count: number;
  velocity_delta: number;
  primary_area: string;
  source_counts: Record<string, number>;
  source_weights: Record<string, number>;
  top_signals: SignalSummary[];
  lat: number;
  lng: number;
}

export interface SignalSummary {
  signal_id: string;
  title: string;
  date: string;
  city: string;
  domain: string;
  source_type: SourceType;
  signal_type: SignalType;
  source_url: string;
  summary: string;
  area?: string;
  lat?: number;
  lng?: number;
}

export interface JobPosting {
  id: string;
  title: string;
  company: string;
  city: string;
  location?: string;
  domain: string;
  job_type: string;
  salary_range: string;
  summary: string;
  skills: string[];
  source_url: string;
  source: string;
  lat: number;
  lng: number;
}

export interface CollectorStatus {
  key: string;
  collector_id: string;
  source_type: SourceType;
  description: string;
  city_hint: string | null;
  health: CollectorHealth;
  last_fill_rate: number | null;
  last_run_at: string | null;
  awaiting_approval: boolean;
  is_provisioned: boolean;
  enabled: boolean;
}

export interface AdHocScrapeResult {
  success: boolean;
  collector_id: string;
  records_extracted: number;
  signals_saved: number;
  rejected_records: number;
  signals: {
    signal_id: string;
    title: string;
    city: string;
    domain: string;
    source_url: string;
    signal_type: string;
    summary: string;
  }[];
  error?: string;
}

export interface CopilotCitation {
  signal_id: string;
  title: string;
  city: string;
  domain: string;
  source_url: string;
}

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  citations?: CopilotCitation[];
  tools_used?: string[];
  timestamp: string;
}
