/**
 * Signal Atlas — Self-Healing Pipeline Simulation Engine
 * Simulates DOM selector drift, schema anomalies, 2.5s degrade hold,
 * streaming LLM patch creation, and side-by-side payload diff verification.
 */

class SelfHealingEngine {
  constructor() {
    this.status = "HEALTHY"; // HEALTHY, DEGRADED, REPAIRING, HEALED_UNAPPROVED
    this.activeCollectorsCount = 4;
    this.uptime = 99.8;
    this.healedIncidentsCount = 12;
    this.meanTimeToRepairSeconds = 1.4;

    this.collectors = [
      { id: "c1", name: "Bright Data Job Harvester (v2.4)", target: "Public Career Portals", status: "HEALTHY", errorRate: "0.02%", lastSync: "2m ago" },
      { id: "c2", name: "USPTO Patent Assignment Stream", target: "Federal IP Registry", status: "HEALTHY", errorRate: "0.00%", lastSync: "5m ago" },
      { id: "c3", name: "Commercial Zoning Harvester", target: "Municipal Permit Portals", status: "HEALTHY", errorRate: "0.01%", lastSync: "1m ago" },
      { id: "c4", name: "Municipal Council Agenda Harvester", target: "City Clerk PDF Records", status: "HEALTHY", errorRate: "0.00%", lastSync: "12m ago" }
    ];

    this.listeners = [];
    this.logHistory = [
      { timestamp: this.getTimestamp(), level: "INFO", source: "SYSTEM", message: "Collector pipeline orchestrator online. 4/4 workers active." },
      { timestamp: this.getTimestamp(), level: "INFO", source: "BRIGHTDATA", message: "Successfully ingested 152 public job listings across target metro areas." },
      { timestamp: this.getTimestamp(), level: "INFO", source: "CONVERGENCE", message: "Emergence Index recalculation complete. 4 cluster candidates updated." }
    ];

    this.brokenPayload = null;
    this.healedPayload = null;
  }

  subscribe(listener) {
    this.listeners.push(listener);
    // Send initial snapshot
    listener(this.getSnapshot());
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    const snapshot = this.getSnapshot();
    this.listeners.forEach(l => l(snapshot));
  }

  getSnapshot() {
    return {
      status: this.status,
      activeCollectorsCount: this.activeCollectorsCount,
      totalCollectorsCount: 4,
      uptime: this.uptime,
      healedIncidentsCount: this.healedIncidentsCount,
      meanTimeToRepairSeconds: this.meanTimeToRepairSeconds,
      collectors: [...this.collectors],
      logHistory: [...this.logHistory],
      brokenPayload: this.brokenPayload,
      healedPayload: this.healedPayload
    };
  }

  getTimestamp() {
    const now = new Date();
    return now.toTimeString().split(" ")[0] + "." + String(now.getMilliseconds()).padStart(3, "0");
  }

  addLog(level, source, message) {
    const entry = {
      timestamp: this.getTimestamp(),
      level,
      source,
      message
    };
    this.logHistory.push(entry);
    if (this.logHistory.length > 80) this.logHistory.shift();
    this.notify();
  }

  /**
   * Step 1: Simulate Selector Drift / Schema Break
   * Per Section 2 fix: Holds degraded 🔴 state sitting for 2-3 seconds before repair.
   */
  simulateDrift() {
    if (this.status !== "HEALTHY") return;

    this.status = "DEGRADED";
    this.collectors[0].status = "DEGRADED";
    this.collectors[0].errorRate = "94.2%";

    // Prepare Broken Payload sample
    this.brokenPayload = {
      timestamp: new Date().toISOString(),
      collector_id: "brightdata_job_harvester_v2",
      target_url: "https://public-listing-portal.example/jobs/tech-rnd-austin",
      extracted_fields: {
        company_name: "Undisclosed Stealth R&D",
        job_title: "Lead Quantum Hardware Architect",
        location_raw: null, // ❌ BROKEN SELECTOR NULL
        posted_date: "2026-08-22",
        salary_range: "$220,000 - $280,000",
        department_code: undefined // ❌ MISSING KEY
      },
      scraper_error: "DOMSelectorNotFoundError: Selector 'div.legacy-job-card-2024 > span.loc-v1' returned 0 DOM elements.",
      http_status: 200,
      validation_status: "FAILED_SCHEMA_CHECK"
    };

    this.healedPayload = null;

    this.addLog("ERROR", "SCRAPER_ENGINE", "CRITICAL: 'brightdata_job_harvester_v2' DOM extraction failed!");
    this.addLog("WARN", "DOM_INSPECTOR", "Target DOM mutation detected on host public-listing-portal.example");
    this.addLog("ERROR", "SCHEMA_VALIDATOR", "Validation failed: 'location_raw' is null. Emergence scoring suspended for Austin R&D cluster.");

    // Notify UI immediately of DEGRADED state
    this.notify();
  }

  /**
   * Step 2: Trigger Self-Healing AI Repair Agent
   */
  triggerSelfHealing() {
    if (this.status !== "DEGRADED") return;

    this.status = "REPAIRING";
    this.collectors[0].status = "REPAIRING";
    this.addLog("INFO", "SELF_HEAL_AGENT", "Initiating autonomous DOM repair workflow...");
    this.notify();

    // Stream repair logs over 1.5 seconds
    setTimeout(() => {
      this.addLog("DEBUG", "DOM_ANALYZER", "Fetching HTML DOM AST snapshot from latest Bright Data raw stream...");
    }, 400);

    setTimeout(() => {
      this.addLog("INFO", "LLM_INFERENCE", "Prompting Gemini AI agent with broken selector & updated DOM tree...");
    }, 900);

    setTimeout(() => {
      this.addLog("INFO", "SELECTOR_RESOLVER", "AI Agent identified match: modern fallback '[data-testid=\"job-location-meta\"]' (99.4% confidence)");
      
      // Generate Healed Payload
      this.healedPayload = {
        timestamp: new Date().toISOString(),
        collector_id: "brightdata_job_harvester_v2",
        target_url: "https://public-listing-portal.example/jobs/tech-rnd-austin",
        extracted_fields: {
          company_name: "Undisclosed Stealth R&D",
          job_title: "Lead Quantum Hardware Architect",
          location_raw: "Austin, TX (78701)", // ✅ REPAIRED & NORMALIZED
          posted_date: "2026-08-22",
          salary_range: "$220,000 - $280,000",
          department_code: "QUANTUM_RD_01" // ✅ INFERRED & POPULATED
        },
        healed_by_agent: "Gemini-3.6-DOM-Repair-V2",
        patch_applied: {
          deprecated_selector: "div.legacy-job-card-2024 > span.loc-v1",
          active_selector: "[data-testid=\"job-location-meta\"]",
          fallback_strategy: "semantic_attribute_match"
        },
        http_status: 200,
        validation_status: "PASSED_AUTO_HEALED"
      };

      this.status = "HEALED_UNAPPROVED";
      this.collectors[0].status = "PATCH_PENDING";
      this.addLog("SUCCESS", "AUTO_PATCH", "Generated synthetic DOM patch #PAT-2026-0881. Awaiting operator verification.");
      this.notify();
    }, 1600);
  }

  /**
   * Step 3: Operator Approves Patch
   */
  approvePatch() {
    if (this.status !== "HEALED_UNAPPROVED") return;

    this.status = "HEALTHY";
    this.collectors[0].status = "HEALTHY";
    this.collectors[0].errorRate = "0.01%";
    this.healedIncidentsCount += 1;

    this.addLog("SUCCESS", "ORCHESTRATOR", "Auto-patch #PAT-2026-0881 approved & deployed to Bright Data live scraper pool.");
    this.addLog("INFO", "CONVERGENCE", "Pipeline re-synced. Emergence score for Austin Quantum Campus restored to 8.42.");

    this.notify();
  }

  reset() {
    this.status = "HEALTHY";
    this.collectors[0].status = "HEALTHY";
    this.collectors[0].errorRate = "0.02%";
    this.brokenPayload = null;
    this.healedPayload = null;
    this.addLog("INFO", "SYSTEM", "Reset self-healing demonstration environment.");
    this.notify();
  }
}

export const selfHealingEngine = new SelfHealingEngine();
