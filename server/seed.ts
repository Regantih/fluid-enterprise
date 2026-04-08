import { storage } from "./storage";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function now(): string {
  return new Date().toISOString();
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Main seed function ───────────────────────────────────────────────────────
export function seedWorld(): void {
  // Guard: skip if already seeded
  const existing = storage.getCapabilities();
  if (existing.length > 0) return;

  console.log("[seed] Seeding ACME Global Industries world...");

  // ── 1. CAPABILITIES ─────────────────────────────────────────────────────────
  const capDefs = [
    {
      name: "Procurement Intelligence",
      domain: "procurement",
      description: "Autonomous sourcing, vendor evaluation, and PO generation. Eliminates manual RFQ cycles and approves qualified vendors in real time.",
      status: "active",
      generation: 7,
      fitnessScore: 0.89,
      trustScore: 0.91,
      budgetAllocated: 180000,
      budgetConsumed: 142000,
      budgetLimit: 200000,
      automationRate: 0.87,
    },
    {
      name: "Financial Operations",
      domain: "finance",
      description: "Real-time general ledger, AP/AR automation, and period-close orchestration. Reconciles intercompany balances without human intervention.",
      status: "active",
      generation: 6,
      fitnessScore: 0.86,
      trustScore: 0.88,
      budgetAllocated: 150000,
      budgetConsumed: 118000,
      budgetLimit: 175000,
      automationRate: 0.82,
    },
    {
      name: "Logistics Orchestration",
      domain: "logistics",
      description: "Warehouse operations, route optimization, and carrier management. Dynamically reroutes shipments based on live disruption signals.",
      status: "active",
      generation: 5,
      fitnessScore: 0.83,
      trustScore: 0.85,
      budgetAllocated: 220000,
      budgetConsumed: 187000,
      budgetLimit: 250000,
      automationRate: 0.79,
    },
    {
      name: "Demand Planning",
      domain: "planning",
      description: "Forecast modeling, inventory optimization, and S&OP alignment. Uses multi-horizon ML models trained on internal and external signals.",
      status: "active",
      generation: 4,
      fitnessScore: 0.78,
      trustScore: 0.83,
      budgetAllocated: 95000,
      budgetConsumed: 72000,
      budgetLimit: 120000,
      automationRate: 0.74,
    },
    {
      name: "Workforce Intelligence",
      domain: "workforce",
      description: "Talent analytics, scheduling optimization, and compensation modeling. Currently provisioning — first cohort of agents under evaluation.",
      status: "provisioning",
      generation: 2,
      fitnessScore: 0.62,
      trustScore: 0.72,
      budgetAllocated: 60000,
      budgetConsumed: 28000,
      budgetLimit: 80000,
      automationRate: 0.45,
    },
    {
      name: "Customer Revenue Engine",
      domain: "customer",
      description: "Pipeline management, churn prediction, and dynamic pricing optimization. Surfaces next-best-action signals for the revenue team.",
      status: "active",
      generation: 5,
      fitnessScore: 0.84,
      trustScore: 0.86,
      budgetAllocated: 130000,
      budgetConsumed: 98000,
      budgetLimit: 150000,
      automationRate: 0.81,
    },
    {
      name: "Asset Lifecycle Management",
      domain: "finance",
      description: "Fixed asset tracking, depreciation scheduling, and predictive maintenance. Integrates with IoT telemetry for condition-based triggers.",
      status: "active",
      generation: 4,
      fitnessScore: 0.79,
      trustScore: 0.84,
      budgetAllocated: 75000,
      budgetConsumed: 52000,
      budgetLimit: 90000,
      automationRate: 0.71,
    },
    {
      name: "Compliance & Risk Engine",
      domain: "finance",
      description: "Regulatory monitoring, immutable audit trail, and automated control testing. Issues escalations for threshold breaches before they become findings.",
      status: "active",
      generation: 6,
      fitnessScore: 0.91,
      trustScore: 0.93,
      budgetAllocated: 110000,
      budgetConsumed: 89000,
      budgetLimit: 130000,
      automationRate: 0.88,
    },
  ];

  const caps: { id: number; name: string }[] = [];
  for (const def of capDefs) {
    const c = storage.createCapability({
      ...def,
      agentCount: 0,
      createdAt: daysAgo(60),
      updatedAt: daysAgo(1),
    });
    caps.push({ id: c.id, name: c.name });
  }

  // Convenience index
  const capId = (name: string) => caps.find(c => c.name === name)!.id;
  const C = {
    procurement: capId("Procurement Intelligence"),
    finance: capId("Financial Operations"),
    logistics: capId("Logistics Orchestration"),
    planning: capId("Demand Planning"),
    workforce: capId("Workforce Intelligence"),
    customer: capId("Customer Revenue Engine"),
    assets: capId("Asset Lifecycle Management"),
    compliance: capId("Compliance & Risk Engine"),
  };

  // ── 2. AGENTS (~28 total) ────────────────────────────────────────────────────
  const agentDefs = [
    // Procurement Intelligence (4) — gen 7
    { name: "Helix-7", role: "orchestrator", capabilityId: C.procurement, status: "online", generation: 7, trustScore: 0.93, decisionsHandled: 4821, successRate: 0.96, uptime: 99.8 },
    { name: "Prism-Core", role: "specialist", capabilityId: C.procurement, status: "busy", generation: 7, trustScore: 0.89, decisionsHandled: 2344, successRate: 0.93, uptime: 99.2 },
    { name: "Vega-Q", role: "specialist", capabilityId: C.procurement, status: "online", generation: 7, trustScore: 0.88, decisionsHandled: 1987, successRate: 0.91, uptime: 98.9 },
    { name: "Solus-3", role: "sentinel", capabilityId: C.procurement, status: "online", generation: 7, trustScore: 0.94, decisionsHandled: 812, successRate: 0.98, uptime: 99.9 },

    // Financial Operations (4) — gen 6
    { name: "Nexus-Prime", role: "orchestrator", capabilityId: C.finance, status: "online", generation: 6, trustScore: 0.91, decisionsHandled: 6103, successRate: 0.95, uptime: 99.7 },
    { name: "Ledge-2", role: "specialist", capabilityId: C.finance, status: "online", generation: 6, trustScore: 0.87, decisionsHandled: 3221, successRate: 0.92, uptime: 99.4 },
    { name: "Aria-Fin", role: "specialist", capabilityId: C.finance, status: "busy", generation: 6, trustScore: 0.85, decisionsHandled: 2890, successRate: 0.90, uptime: 98.7 },
    { name: "Cipher-8", role: "sentinel", capabilityId: C.finance, status: "online", generation: 6, trustScore: 0.95, decisionsHandled: 1102, successRate: 0.99, uptime: 100.0 },

    // Logistics Orchestration (4) — gen 5
    { name: "Atlas-1", role: "orchestrator", capabilityId: C.logistics, status: "online", generation: 5, trustScore: 0.88, decisionsHandled: 5402, successRate: 0.93, uptime: 99.5 },
    { name: "Route-X", role: "specialist", capabilityId: C.logistics, status: "busy", generation: 5, trustScore: 0.84, decisionsHandled: 3112, successRate: 0.90, uptime: 98.8 },
    { name: "Depot-9", role: "specialist", capabilityId: C.logistics, status: "online", generation: 5, trustScore: 0.82, decisionsHandled: 2654, successRate: 0.88, uptime: 98.5 },
    { name: "Weigh-5", role: "specialist", capabilityId: C.logistics, status: "degraded", generation: 5, trustScore: 0.71, decisionsHandled: 1843, successRate: 0.82, uptime: 94.2 },

    // Demand Planning (3) — gen 4
    { name: "Signal-\u03A9", role: "orchestrator", capabilityId: C.planning, status: "online", generation: 4, trustScore: 0.86, decisionsHandled: 3877, successRate: 0.91, uptime: 99.3 },
    { name: "Tempo-4", role: "specialist", capabilityId: C.planning, status: "online", generation: 4, trustScore: 0.83, decisionsHandled: 2213, successRate: 0.89, uptime: 99.1 },
    { name: "Flux-\u0394", role: "specialist", capabilityId: C.planning, status: "busy", generation: 4, trustScore: 0.80, decisionsHandled: 1995, successRate: 0.87, uptime: 98.6 },

    // Workforce Intelligence (3) — gen 2
    { name: "Kore-V", role: "orchestrator", capabilityId: C.workforce, status: "online", generation: 2, trustScore: 0.74, decisionsHandled: 521, successRate: 0.83, uptime: 97.4 },
    { name: "Plex-W1", role: "specialist", capabilityId: C.workforce, status: "online", generation: 2, trustScore: 0.70, decisionsHandled: 344, successRate: 0.79, uptime: 96.8 },
    { name: "Sched-\u03B1", role: "specialist", capabilityId: C.workforce, status: "offline", generation: 2, trustScore: 0.65, decisionsHandled: 189, successRate: 0.74, uptime: 88.3 },

    // Customer Revenue Engine (3) — gen 5
    { name: "Pulse-CX", role: "orchestrator", capabilityId: C.customer, status: "online", generation: 5, trustScore: 0.89, decisionsHandled: 4230, successRate: 0.94, uptime: 99.6 },
    { name: "Churn-0", role: "specialist", capabilityId: C.customer, status: "online", generation: 5, trustScore: 0.87, decisionsHandled: 2877, successRate: 0.92, uptime: 99.2 },
    { name: "Price-\u039B", role: "specialist", capabilityId: C.customer, status: "busy", generation: 5, trustScore: 0.84, decisionsHandled: 2001, successRate: 0.90, uptime: 98.9 },

    // Asset Lifecycle Management (3) — gen 4
    { name: "Tandem-A", role: "orchestrator", capabilityId: C.assets, status: "online", generation: 4, trustScore: 0.87, decisionsHandled: 2103, successRate: 0.92, uptime: 99.0 },
    { name: "Depr-3", role: "specialist", capabilityId: C.assets, status: "online", generation: 4, trustScore: 0.83, decisionsHandled: 1655, successRate: 0.90, uptime: 98.8 },
    { name: "Maint-\u03B2", role: "specialist", capabilityId: C.assets, status: "busy", generation: 4, trustScore: 0.81, decisionsHandled: 1388, successRate: 0.88, uptime: 98.4 },

    // Compliance & Risk Engine (4) — gen 6
    { name: "Aegis-1", role: "orchestrator", capabilityId: C.compliance, status: "online", generation: 6, trustScore: 0.95, decisionsHandled: 3901, successRate: 0.97, uptime: 99.9 },
    { name: "Audit-\u03A3", role: "sentinel", capabilityId: C.compliance, status: "online", generation: 6, trustScore: 0.96, decisionsHandled: 2544, successRate: 0.98, uptime: 100.0 },
    { name: "Ctrl-\u03C6", role: "specialist", capabilityId: C.compliance, status: "online", generation: 6, trustScore: 0.91, decisionsHandled: 1904, successRate: 0.95, uptime: 99.7 },
    { name: "Risk-\u03A8", role: "sentinel", capabilityId: C.compliance, status: "online", generation: 6, trustScore: 0.94, decisionsHandled: 1221, successRate: 0.97, uptime: 99.8 },
  ];

  const agentIds: Record<string, number> = {};
  for (const def of agentDefs) {
    const a = storage.createAgent({
      ...def,
      lastHeartbeat: now(),
      createdAt: daysAgo(randInt(10, 55)),
    });
    agentIds[def.name] = a.id;
  }

  // Update agentCount on capabilities
  const agentCountByCapId: Record<number, number> = {};
  for (const def of agentDefs) {
    agentCountByCapId[def.capabilityId] = (agentCountByCapId[def.capabilityId] ?? 0) + 1;
  }
  for (const [capIdStr, count] of Object.entries(agentCountByCapId)) {
    storage.updateCapability(Number(capIdStr), { agentCount: count });
  }

  // ── 3. TASKS (14) ────────────────────────────────────────────────────────────
  const taskDefs = [
    {
      capabilityId: C.procurement,
      agentId: agentIds["Helix-7"],
      title: "Negotiate Q3 raw materials contracts",
      description: "Evaluate 14 steel and polymer suppliers. Issue RFQs, score bids, and execute contracts for Q3 volume commitments.",
      priority: "high",
      status: "in_progress",
      confidence: 0.88,
      estimatedCost: 3200,
      actualCost: 1850,
      createdAt: daysAgo(5),
      completedAt: null,
    },
    {
      capabilityId: C.procurement,
      agentId: agentIds["Prism-Core"],
      title: "Onboard 3 new strategic vendors",
      description: "Complete KYC, risk scoring, and system onboarding for approved tier-1 vendors: Apex Materials, Brightline Chemicals, Vortex Packaging.",
      priority: "medium",
      status: "completed",
      confidence: 0.95,
      estimatedCost: 800,
      actualCost: 740,
      createdAt: daysAgo(14),
      completedAt: daysAgo(9),
    },
    {
      capabilityId: C.finance,
      agentId: agentIds["Nexus-Prime"],
      title: "Reconcile intercompany balances \u2014 Q2 close",
      description: "Identify and clear $4.2M in intercompany receivables/payables across 7 legal entities. Escalate any variances > $50K.",
      priority: "critical",
      status: "in_progress",
      confidence: 0.91,
      estimatedCost: 1200,
      actualCost: 890,
      createdAt: daysAgo(3),
      completedAt: null,
    },
    {
      capabilityId: C.finance,
      agentId: agentIds["Aria-Fin"],
      title: "Process AP invoice backlog \u2014 April",
      description: "Clear 847 pending invoices from April. Match POs, validate goods receipts, and route exceptions for manual review.",
      priority: "high",
      status: "completed",
      confidence: 0.94,
      estimatedCost: 600,
      actualCost: 580,
      createdAt: daysAgo(18),
      completedAt: daysAgo(12),
    },
    {
      capabilityId: C.logistics,
      agentId: agentIds["Atlas-1"],
      title: "Optimize APAC warehouse layout \u2014 Singapore DC",
      description: "Reconfigure slotting for 22,000 SKU positions based on velocity data. Expected pick time reduction: 18%.",
      priority: "medium",
      status: "in_progress",
      confidence: 0.84,
      estimatedCost: 4500,
      actualCost: 2200,
      createdAt: daysAgo(7),
      completedAt: null,
    },
    {
      capabilityId: C.logistics,
      agentId: agentIds["Route-X"],
      title: "Reroute EMEA lanes \u2014 port congestion response",
      description: "Hamburg port closure: reroute 34 active shipments via Rotterdam and Antwerp. Update ETAs and notify customer ops.",
      priority: "critical",
      status: "completed",
      confidence: 0.97,
      estimatedCost: 2800,
      actualCost: 3100,
      createdAt: daysAgo(10),
      completedAt: daysAgo(9),
    },
    {
      capabilityId: C.planning,
      agentId: agentIds["Signal-\u03A9"],
      title: "Retrain demand forecast model \u2014 H2 inputs",
      description: "Incorporate H1 actuals, updated macroeconomic signals, and revised product mix. Re-run S&OP consensus for 18-week horizon.",
      priority: "high",
      status: "in_progress",
      confidence: 0.82,
      estimatedCost: 5200,
      actualCost: 3100,
      createdAt: daysAgo(4),
      completedAt: null,
    },
    {
      capabilityId: C.planning,
      agentId: agentIds["Tempo-4"],
      title: "Safety stock recalibration \u2014 400 critical SKUs",
      description: "Adjust safety stock levels for top-400 SKUs following supplier lead time changes. Minimize excess inventory while holding target fill rate.",
      priority: "medium",
      status: "pending",
      confidence: 0.79,
      estimatedCost: 1800,
      actualCost: 0,
      createdAt: daysAgo(2),
      completedAt: null,
    },
    {
      capabilityId: C.workforce,
      agentId: agentIds["Kore-V"],
      title: "Generate Q3 workforce capacity plan",
      description: "Aggregate demand signals from all active capabilities. Model headcount requirements for temporary and permanent roles across 12 sites.",
      priority: "medium",
      status: "pending",
      confidence: 0.71,
      estimatedCost: 2100,
      actualCost: 0,
      createdAt: daysAgo(1),
      completedAt: null,
    },
    {
      capabilityId: C.customer,
      agentId: agentIds["Pulse-CX"],
      title: "Run churn intervention campaign \u2014 at-risk cohort",
      description: "Execute targeted outreach for 213 accounts flagged as high-churn risk. Coordinate pricing adjustments and success team engagement.",
      priority: "high",
      status: "in_progress",
      confidence: 0.86,
      estimatedCost: 3400,
      actualCost: 1600,
      createdAt: daysAgo(6),
      completedAt: null,
    },
    {
      capabilityId: C.customer,
      agentId: agentIds["Price-\u039B"],
      title: "Dynamic pricing recalibration \u2014 electronics vertical",
      description: "Update 1,800 SKU prices based on competitor signals and margin targets. Validate against floor/ceiling policies before publish.",
      priority: "medium",
      status: "completed",
      confidence: 0.92,
      estimatedCost: 900,
      actualCost: 870,
      createdAt: daysAgo(15),
      completedAt: daysAgo(11),
    },
    {
      capabilityId: C.assets,
      agentId: agentIds["Tandem-A"],
      title: "Schedule preventive maintenance \u2014 Plant C machinery",
      description: "Analyze IoT telemetry for 67 CNC machines. Issue maintenance work orders and coordinate downtime windows with production planning.",
      priority: "high",
      status: "completed",
      confidence: 0.90,
      estimatedCost: 1500,
      actualCost: 1420,
      createdAt: daysAgo(20),
      completedAt: daysAgo(16),
    },
    {
      capabilityId: C.compliance,
      agentId: agentIds["Aegis-1"],
      title: "Q2 SOX control testing \u2014 48 automated controls",
      description: "Execute test scripts for all 48 IT general controls in scope. Document evidence, flag exceptions, and generate auditor-ready report.",
      priority: "critical",
      status: "in_progress",
      confidence: 0.95,
      estimatedCost: 2200,
      actualCost: 1400,
      createdAt: daysAgo(8),
      completedAt: null,
    },
    {
      capabilityId: C.compliance,
      agentId: agentIds["Ctrl-\u03C6"],
      title: "GDPR data residency audit \u2014 EU customer records",
      description: "Verify all EU personal data is stored within approved jurisdictions. Flag cross-border transfers and generate Article 30 register update.",
      priority: "high",
      status: "failed",
      confidence: 0.61,
      estimatedCost: 1800,
      actualCost: 950,
      createdAt: daysAgo(12),
      completedAt: daysAgo(8),
    },
  ];

  for (const def of taskDefs) {
    storage.createTask(def);
  }

  // ── 4. GOVERNANCE (7) ────────────────────────────────────────────────────────
  const govDefs = [
    {
      capabilityId: C.logistics,
      agentId: agentIds["Atlas-1"],
      title: "Budget threshold exceeded \u2014 Logistics Orchestration",
      description: "Current spend ($187K) has reached 84.5% of allocated budget ($220K) with 23 days remaining in the period. Autonomous rate of spend projects $241K by period close \u2014 $21K above limit.",
      riskLevel: "high",
      category: "budget_breach",
      status: "pending",
      requestedBy: "Atlas-1",
      reviewedBy: null,
      humanResponse: null,
      financialImpact: 21000,
      createdAt: daysAgo(1),
      resolvedAt: null,
    },
    {
      capabilityId: C.procurement,
      agentId: agentIds["Helix-7"],
      title: "New vendor onboarding policy change",
      description: "Proposal to lower KYC threshold from $500K to $250K annual contract value. Affects 31 pending vendor applications. Estimated approval acceleration: 18 days average.",
      riskLevel: "medium",
      category: "policy_change",
      status: "pending",
      requestedBy: "Helix-7",
      reviewedBy: null,
      humanResponse: null,
      financialImpact: 0,
      createdAt: daysAgo(2),
      resolvedAt: null,
    },
    {
      capabilityId: C.workforce,
      agentId: agentIds["Kore-V"],
      title: "Capability promotion: Workforce Intelligence \u2192 active",
      description: "Workforce Intelligence has completed 30-day evaluation period. Trust score: 0.72. Recommend promotion to active status. Requires human authorization per lifecycle policy.",
      riskLevel: "low",
      category: "capability_lifecycle",
      status: "pending",
      requestedBy: "Kore-V",
      reviewedBy: null,
      humanResponse: null,
      financialImpact: 0,
      createdAt: daysAgo(0),
      resolvedAt: null,
    },
    {
      capabilityId: C.compliance,
      agentId: agentIds["Audit-\u03A3"],
      title: "Anomaly: Unusual AP disbursement pattern detected",
      description: "Audit-\u03A3 flagged 47 payments to a single vendor totaling $892K over 6 days \u2014 340% above baseline. Pattern matches known split-payment fraud signature. Payments auto-held pending review.",
      riskLevel: "critical",
      category: "anomaly",
      status: "pending",
      requestedBy: "Audit-\u03A3",
      reviewedBy: null,
      humanResponse: null,
      financialImpact: 892000,
      createdAt: daysAgo(0),
      resolvedAt: null,
    },
    {
      capabilityId: C.finance,
      agentId: agentIds["Cipher-8"],
      title: "SOX compliance: manual journal entry review",
      description: "14 manual journal entries above $100K threshold identified in period close. Cipher-8 auto-applied controls but policy requires human sign-off on entries > $250K (3 entries).",
      riskLevel: "high",
      category: "compliance",
      status: "approved",
      requestedBy: "Cipher-8",
      reviewedBy: "Sarah Chen (CFO)",
      humanResponse: "Reviewed and approved. Entries align with Q2 restructuring charges. No exceptions noted.",
      financialImpact: 780000,
      createdAt: daysAgo(8),
      resolvedAt: daysAgo(7),
    },
    {
      capabilityId: C.procurement,
      agentId: agentIds["Solus-3"],
      title: "Sole-source justification \u2014 critical component shortage",
      description: "Global shortage of Microchip MCU-4 series. Single-source exception requested for NovaTech Components at 22% premium. Estimated revenue protection if approved: $4.1M.",
      riskLevel: "high",
      category: "policy_change",
      status: "approved",
      requestedBy: "Solus-3",
      reviewedBy: "James Park (CPO)",
      humanResponse: "Approved for 90-day window. Helix-7 to continue alternative sourcing in parallel.",
      financialImpact: 4100000,
      createdAt: daysAgo(15),
      resolvedAt: daysAgo(14),
    },
    {
      capabilityId: C.logistics,
      agentId: agentIds["Weigh-5"],
      title: "Carrier contract renegotiation \u2014 Freight Partner B",
      description: "Weigh-5 flagged anomalous fuel surcharge invoices totaling $118K. Investigation confirmed billing errors. Contract renegotiation proposal with revised rate schedule submitted.",
      riskLevel: "medium",
      category: "compliance",
      status: "rejected",
      requestedBy: "Weigh-5",
      reviewedBy: "Maria Santos (VP Logistics)",
      humanResponse: "Rejected. Legal team handling directly. Weigh-5 to suspend contact with carrier until further notice.",
      financialImpact: 118000,
      createdAt: daysAgo(20),
      resolvedAt: daysAgo(18),
    },
  ];

  for (const def of govDefs) {
    storage.createGovernance(def);
  }

  // ── 5. COST EVENTS (~200 across 30 days) ─────────────────────────────────────
  const eventTypes: string[] = ["compute", "api_call", "data_transfer", "storage", "human_escalation"];
  const costDescriptions: Record<string, string[]> = {
    compute: [
      "ML inference \u2014 demand forecast batch",
      "Route optimization solver run",
      "Vendor scoring model execution",
      "Control test automation run",
      "Churn prediction model pass",
      "Reconciliation computation batch",
    ],
    api_call: [
      "External carrier API \u2014 rate quote",
      "Credit bureau API \u2014 vendor check",
      "Market data feed \u2014 commodity prices",
      "FX rate provider \u2014 multi-currency",
      "Tax engine API \u2014 AP validation",
      "Identity verification \u2014 new vendor",
    ],
    data_transfer: [
      "EDI transmission \u2014 supplier network",
      "Carrier manifest upload",
      "Intercompany data sync",
      "Customer CRM delta sync",
      "IoT telemetry ingest \u2014 Plant C",
      "Regulatory reporting export",
    ],
    storage: [
      "Document vault \u2014 contract storage",
      "Audit trail archival",
      "Forecast model checkpoint save",
      "Transaction log snapshot",
      "Surveillance data retention",
    ],
    human_escalation: [
      "Manual review \u2014 high-value PO",
      "CFO sign-off \u2014 journal entry",
      "Legal review \u2014 carrier dispute",
      "CPO approval \u2014 sole source exception",
      "Compliance officer \u2014 anomaly review",
    ],
  };

  const capWeights = [
    { id: C.procurement, weight: 5 },
    { id: C.finance, weight: 4 },
    { id: C.logistics, weight: 5 },
    { id: C.planning, weight: 3 },
    { id: C.workforce, weight: 1 },
    { id: C.customer, weight: 3 },
    { id: C.assets, weight: 2 },
    { id: C.compliance, weight: 3 },
  ];

  const capPool: number[] = [];
  for (const cw of capWeights) {
    for (let i = 0; i < cw.weight; i++) capPool.push(cw.id);
  }

  for (let day = 0; day < 30; day++) {
    const eventsToday = randInt(5, 10);
    for (let e = 0; e < eventsToday; e++) {
      const capabilityId = pick(capPool);
      const eventType = pick(eventTypes) as string;
      const descs = costDescriptions[eventType] ?? costDescriptions["compute"];
      const description = pick(descs);

      let amount: number;
      if (eventType === "human_escalation") {
        amount = Math.round(rand(200, 2000) * 100) / 100;
      } else if (eventType === "compute") {
        amount = Math.round(rand(20, 400) * 100) / 100;
      } else if (eventType === "api_call") {
        amount = Math.round(rand(5, 80) * 100) / 100;
      } else if (eventType === "data_transfer") {
        amount = Math.round(rand(10, 150) * 100) / 100;
      } else {
        amount = Math.round(rand(5, 60) * 100) / 100;
      }

      const capAgents = agentDefs.filter(a => a.capabilityId === capabilityId);
      const agentName = pick(capAgents)?.name;
      const agentId = agentName ? agentIds[agentName] : undefined;

      const d = new Date();
      d.setDate(d.getDate() - day);
      d.setHours(randInt(0, 23), randInt(0, 59), randInt(0, 59));

      storage.createCostEvent({
        capabilityId,
        agentId,
        eventType,
        amount,
        currency: "USD",
        description,
        dayOffset: day,
        createdAt: d.toISOString(),
      });
    }
  }

  // ── 6. ACTIVITY LOG (13) ─────────────────────────────────────────────────────
  const activityDefs = [
    {
      capabilityId: C.compliance,
      agentId: agentIds["Audit-\u03A3"],
      eventType: "governance_requested",
      title: "Critical anomaly flagged \u2014 AP disbursement pattern",
      description: "Audit-\u03A3 auto-held 47 payments and escalated to governance queue. Human review required.",
      severity: "error",
      metadata: JSON.stringify({ financialImpact: 892000, paymentsHeld: 47 }),
      createdAt: daysAgo(0),
    },
    {
      capabilityId: C.logistics,
      agentId: agentIds["Atlas-1"],
      eventType: "budget_alert",
      title: "Budget threshold alert \u2014 Logistics Orchestration at 84.5%",
      description: "Current period spend approaching limit. Projection exceeds budget by $21K if current rate continues.",
      severity: "warning",
      metadata: JSON.stringify({ consumed: 187000, limit: 220000, projected: 241000 }),
      createdAt: daysAgo(1),
    },
    {
      capabilityId: C.procurement,
      agentId: agentIds["Helix-7"],
      eventType: "task_completed",
      title: "Vendor onboarding completed \u2014 Apex Materials, Brightline Chemicals, Vortex Packaging",
      description: "Three strategic vendors successfully onboarded. KYC passed. Contracts executed. First POs eligible.",
      severity: "success",
      metadata: JSON.stringify({ vendorsOnboarded: 3, avgOnboardingDays: 5 }),
      createdAt: daysAgo(9),
    },
    {
      capabilityId: C.logistics,
      agentId: agentIds["Route-X"],
      eventType: "task_completed",
      title: "EMEA shipment reroute complete \u2014 34 shipments via Rotterdam/Antwerp",
      description: "All 34 shipments successfully rerouted within 6 hours of port closure notification. Average ETA impact: +1.3 days.",
      severity: "success",
      metadata: JSON.stringify({ shipmentsRerouted: 34, avgDelayDays: 1.3 }),
      createdAt: daysAgo(9),
    },
    {
      capabilityId: C.finance,
      agentId: agentIds["Cipher-8"],
      eventType: "governance_requested",
      title: "SOX manual journal entries flagged for CFO review",
      description: "14 entries above threshold identified. 3 above $250K auto-escalated per policy. CFO review requested.",
      severity: "warning",
      metadata: JSON.stringify({ totalEntries: 14, escalated: 3, totalValue: 780000 }),
      createdAt: daysAgo(8),
    },
    {
      capabilityId: C.finance,
      agentId: agentIds["Cipher-8"],
      eventType: "task_completed",
      title: "SOX journal entries approved by CFO",
      description: "Sarah Chen approved all 3 escalated entries. No exceptions. Entries posted to ledger.",
      severity: "info",
      metadata: JSON.stringify({ approvedBy: "Sarah Chen", entriesPosted: 3 }),
      createdAt: daysAgo(7),
    },
    {
      capabilityId: C.workforce,
      agentId: agentIds["Kore-V"],
      eventType: "capability_created",
      title: "Workforce Intelligence capability promoted \u2014 evaluation complete",
      description: "30-day evaluation period complete. Governance request submitted for promotion to active status.",
      severity: "info",
      metadata: JSON.stringify({ trustScore: 0.72, evaluationDays: 30 }),
      createdAt: daysAgo(0),
    },
    {
      capabilityId: C.planning,
      agentId: agentIds["Signal-\u03A9"],
      eventType: "agent_spawned",
      title: "Flux-\u0394 specialist agent spawned \u2014 H2 forecast workload",
      description: "Signal-\u03A9 requested additional specialist capacity for H2 retraining workload. Flux-\u0394 instantiated and assigned.",
      severity: "info",
      metadata: JSON.stringify({ reason: "H2 forecast retraining workload surge" }),
      createdAt: daysAgo(4),
    },
    {
      capabilityId: C.compliance,
      agentId: agentIds["Audit-\u03A3"],
      eventType: "task_completed",
      title: "GDPR audit task failed \u2014 access permissions blocked",
      description: "Ctrl-\u03C6 was unable to complete data residency audit due to restricted access to legacy data store. Manual intervention required.",
      severity: "error",
      metadata: JSON.stringify({ blockedSystem: "legacy data store", recordsUnverified: 14200 }),
      createdAt: daysAgo(8),
    },
    {
      capabilityId: C.customer,
      agentId: agentIds["Churn-0"],
      eventType: "task_completed",
      title: "Churn model identified 213 at-risk accounts",
      description: "Latest model pass surfaced 213 accounts with > 65% 90-day churn probability. Intervention campaign initiated.",
      severity: "warning",
      metadata: JSON.stringify({ accountsFlagged: 213, avgChurnProb: 0.71 }),
      createdAt: daysAgo(6),
    },
    {
      capabilityId: C.assets,
      agentId: agentIds["Maint-\u03B2"],
      eventType: "task_completed",
      title: "Plant C preventive maintenance scheduled \u2014 67 CNC machines",
      description: "Maintenance work orders issued. Downtime windows coordinated with production planning. Estimated availability improvement: 4.2%.",
      severity: "success",
      metadata: JSON.stringify({ machinesServiced: 67, downtimeWindowsCoordinated: 12 }),
      createdAt: daysAgo(16),
    },
    {
      capabilityId: C.procurement,
      agentId: agentIds["Solus-3"],
      eventType: "governance_requested",
      title: "Sole-source exception approved \u2014 NovaTech Components",
      description: "CPO approved 90-day sole-source window for MCU-4 series at 22% premium. Revenue protection value: $4.1M.",
      severity: "success",
      metadata: JSON.stringify({ approvedBy: "James Park", revProtection: 4100000 }),
      createdAt: daysAgo(14),
    },
    {
      capabilityId: C.logistics,
      agentId: agentIds["Weigh-5"],
      eventType: "heartbeat_lost",
      title: "Weigh-5 degraded \u2014 anomalous carrier invoice investigation",
      description: "Weigh-5 status degraded following discovery of billing discrepancies. Agent suspended from carrier contact pending legal review.",
      severity: "warning",
      metadata: JSON.stringify({ billingErrors: 118000, carrierSuspended: "Freight Partner B" }),
      createdAt: daysAgo(18),
    },
  ];

  for (const def of activityDefs) {
    storage.createActivity(def);
  }

  // ── 7. MIGRATION MAP (8) ─────────────────────────────────────────────────────
  const migrationDefs = [
    {
      legacySystem: "Material Management",
      legacyDescription: "Traditional procurement module handling purchase requisitions, PO management, and goods receipts.",
      capabilityId: C.procurement,
      migrationStatus: "live",
      progress: 1.0,
      complexity: "high",
      dataVolume: "8.4M records",
      estimatedWeeks: 24,
      notes: "Full migration complete. Legacy module decommissioned. All PO workflows running on Procurement Intelligence.",
      createdAt: daysAgo(180),
    },
    {
      legacySystem: "General Ledger",
      legacyDescription: "Traditional GL module for journal entries, account balances, and period-close management.",
      capabilityId: C.finance,
      migrationStatus: "live",
      progress: 1.0,
      complexity: "critical",
      dataVolume: "22.1M records",
      estimatedWeeks: 36,
      notes: "Live since Q4 last year. Real-time GL reconciliation running autonomously. SOX controls verified.",
      createdAt: daysAgo(200),
    },
    {
      legacySystem: "Warehouse Management",
      legacyDescription: "Traditional WMS covering receiving, putaway, picking, packing, and shipping across 12 DCs.",
      capabilityId: C.logistics,
      migrationStatus: "in_progress",
      progress: 0.72,
      complexity: "critical",
      dataVolume: "34.7M records",
      estimatedWeeks: 40,
      notes: "8 of 12 DCs migrated. Singapore DC in progress. Hamburg and Rotterdam DCs scheduled Q3.",
      createdAt: daysAgo(120),
    },
    {
      legacySystem: "Demand Planning",
      legacyDescription: "Spreadsheet-based and legacy statistical forecasting tools used by the S&OP team.",
      capabilityId: C.planning,
      migrationStatus: "in_progress",
      progress: 0.58,
      complexity: "high",
      dataVolume: "5.2M records",
      estimatedWeeks: 20,
      notes: "Consensus forecast now running on Signal-\u03A9. Historical data migration 58% complete. S&OP integration in Q3.",
      createdAt: daysAgo(90),
    },
    {
      legacySystem: "Human Capital Management",
      legacyDescription: "Legacy HR system managing headcount, org structure, compensation bands, and time tracking.",
      capabilityId: C.workforce,
      migrationStatus: "testing",
      progress: 0.25,
      complexity: "medium",
      dataVolume: "1.8M records",
      estimatedWeeks: 16,
      notes: "Workforce Intelligence still provisioning. Testing data ingestion pipelines. Full migration deferred until capability reaches active status.",
      createdAt: daysAgo(45),
    },
    {
      legacySystem: "Customer Management",
      legacyDescription: "CRM and CPQ systems used by sales for pipeline tracking, quoting, and account management.",
      capabilityId: C.customer,
      migrationStatus: "testing",
      progress: 0.41,
      complexity: "high",
      dataVolume: "11.3M records",
      estimatedWeeks: 28,
      notes: "Churn and pricing models live. Pipeline and quoting integration still in testing. CRM sync verified for 3 of 5 regions.",
      createdAt: daysAgo(75),
    },
    {
      legacySystem: "Fixed Assets",
      legacyDescription: "Legacy fixed asset register handling acquisition, depreciation, disposal, and impairment.",
      capabilityId: C.assets,
      migrationStatus: "in_progress",
      progress: 0.65,
      complexity: "medium",
      dataVolume: "3.1M records",
      estimatedWeeks: 14,
      notes: "Depreciation automation live. IoT telemetry integration 65% complete. Plant C maintenance module go-live next week.",
      createdAt: daysAgo(60),
    },
    {
      legacySystem: "Treasury Operations",
      legacyDescription: "Legacy treasury workstation for cash positioning, FX exposure management, and bank reconciliation.",
      capabilityId: C.compliance,
      migrationStatus: "planned",
      progress: 0.15,
      complexity: "critical",
      dataVolume: "7.6M records",
      estimatedWeeks: 32,
      notes: "Requirements gathering in progress. Compliance & Risk Engine will absorb treasury controls as a new cluster in Q4.",
      createdAt: daysAgo(30),
    },
  ];

  for (const def of migrationDefs) {
    storage.createMigration(def);
  }

  // ── 8. COMPOSITION LINKS (12) ────────────────────────────────────────────────
  const linkDefs = [
    { sourceCapabilityId: C.procurement, targetCapabilityId: C.logistics, linkType: "trigger", label: "PO fulfillment trigger", strength: 0.95 },
    { sourceCapabilityId: C.procurement, targetCapabilityId: C.finance, linkType: "data_flow", label: "Invoice matching & AP", strength: 0.92 },
    { sourceCapabilityId: C.logistics, targetCapabilityId: C.customer, linkType: "data_flow", label: "Delivery tracking & ETA", strength: 0.88 },
    { sourceCapabilityId: C.planning, targetCapabilityId: C.procurement, linkType: "data_flow", label: "Demand signals \u2192 sourcing", strength: 0.90 },
    { sourceCapabilityId: C.planning, targetCapabilityId: C.logistics, linkType: "data_flow", label: "Warehouse allocation plan", strength: 0.85 },
    { sourceCapabilityId: C.finance, targetCapabilityId: C.compliance, linkType: "data_flow", label: "GL audit data stream", strength: 0.96 },
    { sourceCapabilityId: C.customer, targetCapabilityId: C.planning, linkType: "feedback", label: "Real-time demand signals", strength: 0.87 },
    { sourceCapabilityId: C.workforce, targetCapabilityId: C.logistics, linkType: "data_flow", label: "DC capacity & headcount", strength: 0.78 },
    { sourceCapabilityId: C.workforce, targetCapabilityId: C.procurement, linkType: "data_flow", label: "Buyer capacity data", strength: 0.72 },
    { sourceCapabilityId: C.assets, targetCapabilityId: C.finance, linkType: "data_flow", label: "Depreciation & asset values", strength: 0.89 },
    { sourceCapabilityId: C.compliance, targetCapabilityId: C.finance, linkType: "feedback", label: "Control test results", strength: 0.94 },
    { sourceCapabilityId: C.logistics, targetCapabilityId: C.finance, linkType: "data_flow", label: "Freight cost actuals", strength: 0.86 },
  ];

  for (const def of linkDefs) {
    storage.createCompositionLink(def);
  }

  // ── 9. EVOLUTION LOG (7 generations) ──────────────────────────────────────────
  const evolutionDefs = [
    {
      generation: 1,
      capabilityId: C.procurement,
      fitnessScore: 0.45,
      previousFitness: 0,
      mutations: JSON.stringify(["Initial capability bootstrap", "Base agent spawning protocol", "Threshold calibration from training data"]),
      improvements: JSON.stringify(["First autonomous PO generated", "Basic vendor scoring online"]),
      agentsSurvived: 4,
      agentsEvolved: 0,
      agentsDissolved: 0,
      selfPlayResult: "Baseline established. Procurement agents processed 120 simulated RFQs with 61% accuracy against human benchmark.",
      createdAt: daysAgo(55),
    },
    {
      generation: 2,
      capabilityId: C.procurement,
      fitnessScore: 0.56,
      previousFitness: 0.45,
      mutations: JSON.stringify(["Decision boundary recalibration", "Vendor trust scoring v2", "Risk appetite optimization"]),
      improvements: JSON.stringify(["Vendor scoring accuracy +18%", "PO cycle time reduced 22%", "False rejection rate halved"]),
      agentsSurvived: 3,
      agentsEvolved: 2,
      agentsDissolved: 1,
      selfPlayResult: "Gen-2 agents outperformed Gen-1 in 78% of simulated negotiations. One low-trust agent dissolved after failing confidence threshold.",
      createdAt: daysAgo(45),
    },
    {
      generation: 3,
      capabilityId: C.procurement,
      fitnessScore: 0.67,
      previousFitness: 0.56,
      mutations: JSON.stringify(["Cross-capability knowledge transfer", "Multi-signal vendor evaluation", "Confidence threshold refinement"]),
      improvements: JSON.stringify(["Cross-capability data sharing enabled", "Supplier risk prediction improved 31%", "Autonomous approval rate hit 72%"]),
      agentsSurvived: 4,
      agentsEvolved: 3,
      agentsDissolved: 0,
      selfPlayResult: "Gen-3 procurement agents achieved 84% vendor selection accuracy in blind simulations against historical human decisions.",
      createdAt: daysAgo(36),
    },
    {
      generation: 4,
      capabilityId: C.procurement,
      fitnessScore: 0.74,
      previousFitness: 0.67,
      mutations: JSON.stringify(["EigenTrust score propagation", "Council peer review protocol v1", "Dynamic budget reallocation"]),
      improvements: JSON.stringify(["Trust-based agent routing online", "Peer review catches 94% of anomalies", "Budget allocation 15% more efficient"]),
      agentsSurvived: 4,
      agentsEvolved: 2,
      agentsDissolved: 0,
      selfPlayResult: "Council review protocol prevented 3 false approvals in stress test. Trust propagation reduced cascading failures by 41%.",
      createdAt: daysAgo(27),
    },
    {
      generation: 5,
      capabilityId: C.procurement,
      fitnessScore: 0.81,
      previousFitness: 0.74,
      mutations: JSON.stringify(["Adversarial self-play training", "Explainability module added", "Governance auto-escalation tuning"]),
      improvements: JSON.stringify(["Faster procurement cycle by 28%", "Reduced false positive rate 19%", "Governance escalations 40% more precise"]),
      agentsSurvived: 4,
      agentsEvolved: 3,
      agentsDissolved: 0,
      selfPlayResult: "Procurement agents outperformed baseline by 23% in simulated vendor negotiation. Adversarial agent failed to exploit decision boundaries.",
      createdAt: daysAgo(18),
    },
    {
      generation: 6,
      capabilityId: C.procurement,
      fitnessScore: 0.85,
      previousFitness: 0.81,
      mutations: JSON.stringify(["Attention mechanism refinement", "Supply chain disruption anticipation", "Multi-objective optimization v2"]),
      improvements: JSON.stringify(["Better demand forecast accuracy +12%", "Disruption response time halved", "Multi-criteria bid evaluation launched"]),
      agentsSurvived: 4,
      agentsEvolved: 2,
      agentsDissolved: 0,
      selfPlayResult: "Gen-6 agents demonstrated emergent collaborative behavior in multi-party negotiation simulation. Pareto-optimal outcomes in 87% of trials.",
      createdAt: daysAgo(9),
    },
    {
      generation: 7,
      capabilityId: C.procurement,
      fitnessScore: 0.89,
      previousFitness: 0.85,
      mutations: JSON.stringify(["Meta-learning across capabilities", "Diminishing returns detection", "Autonomous capability boundary expansion"]),
      improvements: JSON.stringify(["System-wide fitness plateau detection", "Cross-domain insight transfer active", "Autonomous scope expansion proposed"]),
      agentsSurvived: 4,
      agentsEvolved: 4,
      agentsDissolved: 0,
      selfPlayResult: "Gen-7 achieved diminishing returns threshold. Meta-learner identified cross-capability synergies. System approaching theoretical fitness ceiling for current architecture.",
      createdAt: daysAgo(2),
    },
  ];

  for (const def of evolutionDefs) {
    storage.createEvolution(def);
  }

  // ── 10. COUNCIL REVIEWS (5) ──────────────────────────────────────────────────
  const councilDefs = [
    {
      capabilityId: C.procurement,
      triggerEvent: "Generation 5 evolution cycle \u2014 adversarial self-play results ready for peer review",
      reviewerAgents: JSON.stringify(["Helix-7", "Nexus-Prime", "Aegis-1"]),
      votes: JSON.stringify({ "Helix-7": "approve", "Nexus-Prime": "approve", "Aegis-1": "approve" }),
      consensus: "unanimous",
      outcome: "approved",
      createdAt: daysAgo(18),
    },
    {
      capabilityId: C.compliance,
      triggerEvent: "Anomalous AP disbursement pattern \u2014 $892K flagged by Audit-\u03A3. Council convened for cross-capability validation.",
      reviewerAgents: JSON.stringify(["Aegis-1", "Nexus-Prime", "Cipher-8", "Helix-7"]),
      votes: JSON.stringify({ "Aegis-1": "approve", "Nexus-Prime": "approve", "Cipher-8": "approve", "Helix-7": "approve" }),
      consensus: "unanimous",
      outcome: "approved",
      createdAt: daysAgo(0),
    },
    {
      capabilityId: C.logistics,
      triggerEvent: "Budget breach projection for Logistics Orchestration \u2014 $21K overrun projected. Council review of autonomous spending authority.",
      reviewerAgents: JSON.stringify(["Atlas-1", "Nexus-Prime", "Signal-\u03A9"]),
      votes: JSON.stringify({ "Atlas-1": "approve", "Nexus-Prime": "reject", "Signal-\u03A9": "approve" }),
      consensus: "majority",
      outcome: "approved",
      createdAt: daysAgo(1),
    },
    {
      capabilityId: C.workforce,
      triggerEvent: "Workforce Intelligence promotion request \u2014 capability lifecycle state change requires council endorsement.",
      reviewerAgents: JSON.stringify(["Kore-V", "Aegis-1", "Pulse-CX", "Atlas-1"]),
      votes: JSON.stringify({ "Kore-V": "approve", "Aegis-1": "reject", "Pulse-CX": "approve", "Atlas-1": "reject" }),
      consensus: "split",
      outcome: "escalated_to_human",
      createdAt: daysAgo(0),
    },
    {
      capabilityId: C.finance,
      triggerEvent: "Generation 6 evolution results \u2014 Financial Operations fitness improvement review and agent evolution authorization.",
      reviewerAgents: JSON.stringify(["Nexus-Prime", "Cipher-8", "Aegis-1"]),
      votes: JSON.stringify({ "Nexus-Prime": "approve", "Cipher-8": "approve", "Aegis-1": "approve" }),
      consensus: "unanimous",
      outcome: "approved",
      createdAt: daysAgo(5),
    },
  ];

  for (const def of councilDefs) {
    storage.createCouncilReview(def);
  }

  console.log("[seed] ACME Global Industries seeded successfully.");
}
