/**
 * demo-data.ts — Standalone demo interceptor for static deployments.
 *
 * When the real API server is unavailable (e.g. Perplexity static hosting),
 * demoFetch() returns realistic mock responses so the full UI is interactive.
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function ago(seconds: number): string {
  return new Date(Date.now() - seconds * 1000).toISOString();
}

// ─── Shared Entity Data ───────────────────────────────────────────────────────

const CAPABILITIES = [
  {
    id: 1,
    name: "MonthEndCloseOrchestrator",
    domain: "finance",
    description:
      "Autonomous orchestration of month-end financial close: ledger reconciliation, accrual posting, variance analysis, and stakeholder reporting across SAP and Oracle systems.",
    status: "active",
    agentCount: 5,
    generation: 2,
    fitnessScore: 0.78,
    trustScore: 0.77,
    budgetAllocated: 6500,
    budgetConsumed: 4820,
    budgetLimit: 8000,
    automationRate: 0.64,
    createdAt: ago(72 * 3600),
    updatedAt: ago(1800),
  },
  {
    id: 2,
    name: "Onboarding Orchestration",
    domain: "workforce",
    description:
      "End-to-end employee onboarding automation: IT provisioning, HR system enrollment, benefits activation, compliance training assignment, and 90-day milestone tracking.",
    status: "proposed",
    agentCount: 2,
    generation: 3,
    fitnessScore: 0.56,
    trustScore: 0.72,
    budgetAllocated: 3200,
    budgetConsumed: 1480,
    budgetLimit: 5000,
    automationRate: 0.75,
    createdAt: ago(48 * 3600),
    updatedAt: ago(3600),
  },
  {
    id: 3,
    name: "Vendor Risk Monitor",
    domain: "procurement",
    description:
      "Real-time vendor risk assessment and triage: payment history analysis, compliance verification, delivery performance scoring, and automated governance council escalation for Tier-1 supplier portfolio.",
    status: "active",
    agentCount: 2,
    generation: 1,
    fitnessScore: 0.67,
    trustScore: 0.67,
    budgetAllocated: 2800,
    budgetConsumed: 1540,
    budgetLimit: 4000,
    automationRate: 0.60,
    createdAt: ago(96 * 3600),
    updatedAt: ago(7200),
  },
];

const AGENTS = [
  // MonthEndCloseOrchestrator (capabilityId: 1)
  {
    id: 1,
    name: "Nexus-003",
    role: "orchestrator",
    capabilityId: 1,
    status: "online",
    generation: 2,
    trustScore: 0.85,
    successRate: 0.94,
    decisionsHandled: 288,
    uptime: 99.7,
    lastHeartbeat: ago(26),
    createdAt: ago(72 * 3600),
  },
  {
    id: 2,
    name: "Chi-004",
    role: "specialist",
    capabilityId: 1,
    status: "busy",
    generation: 2,
    trustScore: 0.81,
    successRate: 0.91,
    decisionsHandled: 156,
    uptime: 98.2,
    lastHeartbeat: ago(8),
    createdAt: ago(72 * 3600),
  },
  {
    id: 3,
    name: "Psi-005",
    role: "specialist",
    capabilityId: 1,
    status: "online",
    generation: 2,
    trustScore: 0.79,
    successRate: 0.89,
    decisionsHandled: 203,
    uptime: 97.8,
    lastHeartbeat: ago(14),
    createdAt: ago(72 * 3600),
  },
  {
    id: 4,
    name: "Prism-006",
    role: "sentinel",
    capabilityId: 1,
    status: "online",
    generation: 1,
    trustScore: 0.88,
    successRate: 0.96,
    decisionsHandled: 412,
    uptime: 99.9,
    lastHeartbeat: ago(5),
    createdAt: ago(96 * 3600),
  },
  {
    id: 5,
    name: "Gamma-007",
    role: "task",
    capabilityId: 1,
    status: "busy",
    generation: 2,
    trustScore: 0.76,
    successRate: 0.87,
    decisionsHandled: 94,
    uptime: 96.4,
    lastHeartbeat: ago(31),
    createdAt: ago(48 * 3600),
  },
  // Onboarding Orchestration (capabilityId: 2)
  {
    id: 6,
    name: "Tau-001",
    role: "orchestrator",
    capabilityId: 2,
    status: "online",
    generation: 3,
    trustScore: 0.74,
    successRate: 0.88,
    decisionsHandled: 67,
    uptime: 98.1,
    lastHeartbeat: ago(42),
    createdAt: ago(48 * 3600),
  },
  {
    id: 7,
    name: "Sigma-002",
    role: "specialist",
    capabilityId: 2,
    status: "online",
    generation: 3,
    trustScore: 0.70,
    successRate: 0.85,
    decisionsHandled: 39,
    uptime: 97.3,
    lastHeartbeat: ago(18),
    createdAt: ago(48 * 3600),
  },
  // Vendor Risk Monitor (capabilityId: 3)
  {
    id: 8,
    name: "Lambda-008",
    role: "orchestrator",
    capabilityId: 3,
    status: "online",
    generation: 1,
    trustScore: 0.71,
    successRate: 0.86,
    decisionsHandled: 134,
    uptime: 97.6,
    lastHeartbeat: ago(9),
    createdAt: ago(96 * 3600),
  },
  {
    id: 9,
    name: "Delta-009",
    role: "sentinel",
    capabilityId: 3,
    status: "busy",
    generation: 1,
    trustScore: 0.63,
    successRate: 0.82,
    decisionsHandled: 88,
    uptime: 95.8,
    lastHeartbeat: ago(53),
    createdAt: ago(96 * 3600),
  },
];

const GAPS = [
  {
    id: "43c33991-bfca-4176-9f68-453b74c8ab49",
    suggested_name: "MonthEndCloseOrchestrator",
    suggested_kind: "workflow",
    gap_type: "workflow",
    signal_count: 24,
    confidence: 0.85,
    expected_fitness_impact: 0.85,
    status: "generated",
    summary:
      "24 signals over 45 days indicate recurring manual effort in the month-end financial close cycle. Finance team averaging 3.2 days/cycle on reconciliation tasks that could be automated.",
    rationale:
      "High-frequency, rule-based reconciliation patterns detected across SAP GL and Oracle AR modules. Signal density suggests strong candidate for workflow orchestration with measurable ROI.",
    analysis_text:
      "Analysis of 24 signals spanning Slack threads, ServiceNow tickets, and email chains reveals systematic bottlenecks in the month-end close process. Key pain points: manual journal entry validation (avg 6h/cycle), cross-system balance reconciliation (avg 8h/cycle), and exception handling for intercompany eliminations (avg 4h/cycle). Finance controllers report 94% of tasks follow predictable rule sets amenable to automation. Estimated time savings: 18 hours/cycle × 12 cycles = 216 hours/year.",
    createdAt: ago(18 * 3600),
  },
  {
    id: "365d9b9e-409c-4729-bb42-77aaf5f5f9c0",
    suggested_name: "Vendor Risk Monitor",
    suggested_kind: "agent",
    gap_type: "agent",
    signal_count: 57,
    confidence: 0.85,
    expected_fitness_impact: 0.82,
    status: "generated",
    summary:
      "57 signals across procurement channels identify a reactive vendor risk management posture. Three Tier-1 suppliers (Apex Precision Parts, Meridian Components, NovoTech Alloys) show escalating risk indicators not surfaced until audit.",
    rationale:
      "Payment delays from Apex Precision Parts (+34 days avg), lapsed compliance certification at NovoTech Alloys, and delivery performance degradation at Meridian Components all went undetected for 60+ days due to manual monitoring gaps.",
    analysis_text:
      "Cross-source signal analysis covering 57 data points from accounts payable, supplier portal, compliance registry, and logistics tracking reveals a systematic monitoring gap in the Tier-1 supplier portfolio. Apex Precision Parts: 3 late payments in Q4, average 34-day delay, $2.3M in outstanding payables. NovoTech Alloys: ISO 9001 certification lapsed 47 days ago, active on $5.8M procurement orders. Meridian Components: on-time delivery rate dropped from 94% to 61% over 90 days, root cause unaddressed. Estimated financial exposure from unmonitored risk: $1.2M–$3.4M.",
    createdAt: ago(12 * 3600),
  },
  {
    id: "abac1d90-a89b-49dd-b28e-7c4d589a3d94",
    suggested_name: "Onboarding Orchestration",
    suggested_kind: "workflow",
    gap_type: "workflow",
    signal_count: 16,
    confidence: 0.75,
    expected_fitness_impact: 0.71,
    status: "generated",
    summary:
      "16 signals from HR, IT, and new hire feedback channels reveal a fragmented onboarding experience. Average time-to-productivity is 23 days vs. 12-day industry benchmark.",
    rationale:
      "IT provisioning delays (avg 4.2 days), manual benefits enrollment requiring 3+ HR touchpoints, and compliance training assignment happening ad hoc are primary contributors to extended onboarding cycle.",
    analysis_text:
      "Onboarding signal analysis across 16 data points from Workday, ServiceNow IT tickets, Slack #new-hire-help, and exit interview data identifies three systemic gaps: 1) IT provisioning not triggered until Day 1 (avg 4.2 day delay to full access), 2) Benefits enrollment requires manual HR intervention for 78% of new hires, 3) Compliance training assignment is ad hoc with 34% completion rate at 30-day mark. Total cost of inefficient onboarding estimated at $4,200/hire × 48 annual hires = $201,600/year.",
    createdAt: ago(6 * 3600),
  },
];

const GAP_SIGNALS: Record<string, unknown[]> = {
  "43c33991-bfca-4176-9f68-453b74c8ab49": [
    {
      id: "sig-mc-001",
      source: "slack",
      kind: "slack",
      createdAt: ago(45 * 24 * 3600),
      ingested_at: ago(45 * 24 * 3600),
      payload: {
        subject: "#finance-ops · Andrea Chu",
        body: "Running 6 hours behind on the GL reconciliation again. SAP and Oracle GL balances still don't match for cost center 4400. @Marcus can you manually verify the accrual entries? This is the 3rd month in a row.",
      },
    },
    {
      id: "sig-mc-002",
      source: "ticket",
      kind: "servicenow",
      createdAt: ago(43 * 24 * 3600),
      ingested_at: ago(43 * 24 * 3600),
      payload: {
        subject: "SNOW-84921 · Manual Journal Entry Validation — Nov Close",
        body: "Finance Controller requesting manual review of 142 journal entries generated during Nov month-end close. SAP automated validation flagged 23 exceptions requiring human sign-off. Estimated 4 hours work.",
      },
    },
    {
      id: "sig-mc-003",
      source: "email",
      kind: "email",
      createdAt: ago(42 * 24 * 3600),
      ingested_at: ago(42 * 24 * 3600),
      payload: {
        subject: "Re: Q3 Close — Intercompany Elimination Errors",
        body: "Hi team, we had 18 intercompany elimination mismatches again this quarter. I've attached the manual reconciliation spreadsheet. We really need to find a better way to handle this — took Marcus and I 8 hours to resolve. — Sarah K., VP Finance",
      },
    },
    {
      id: "sig-mc-004",
      source: "slack",
      kind: "slack",
      createdAt: ago(38 * 24 * 3600),
      ingested_at: ago(38 * 24 * 3600),
      payload: {
        subject: "#month-end-close · Marcus Webb",
        body: "Day 3 of close and we're still waiting on the Oracle AR sub-ledger to sync. IT says it's a known latency issue during EOM. I'm manually pulling the data directly from the database again. This happens every single month.",
      },
    },
    {
      id: "sig-mc-005",
      source: "ticket",
      kind: "servicenow",
      createdAt: ago(35 * 24 * 3600),
      ingested_at: ago(35 * 24 * 3600),
      payload: {
        subject: "SNOW-86104 · Accrual Posting Review — Dec Close",
        body: "17 accrual entries require manual CFO sign-off before posting to GL. Entries total $847,000 across 6 cost centers. Standard review takes 3-4 hours. Deadline: Dec 31 17:00 EST.",
      },
    },
    {
      id: "sig-mc-006",
      source: "slack",
      kind: "slack",
      createdAt: ago(30 * 24 * 3600),
      ingested_at: ago(30 * 24 * 3600),
      payload: {
        subject: "#finance-ops · Andrea Chu",
        body: "Close package finally out at 11:47 PM. That's 5.5 days — our worst month in a year. The manual variance analysis took forever. We need to automate the preliminary variance flagging at minimum.",
      },
    },
    {
      id: "sig-mc-007",
      source: "email",
      kind: "email",
      createdAt: ago(28 * 24 * 3600),
      ingested_at: ago(28 * 24 * 3600),
      payload: {
        subject: "Process Improvement Idea — Month-End Close Automation",
        body: "Sarah, I've been tracking our close timelines and we're consistently 2-3 days over target. I think 60-70% of what we do manually is rule-based and could be automated. Would you support a proposal to the CFO for an automation initiative? — Marcus",
      },
    },
    {
      id: "sig-mc-008",
      source: "doc",
      kind: "confluence",
      createdAt: ago(25 * 24 * 3600),
      ingested_at: ago(25 * 24 * 3600),
      payload: {
        subject: "Month-End Close Runbook v2.4 — 47 Manual Steps",
        body: "Current close process documented: 47 discrete manual steps across SAP, Oracle, and Excel. Steps 12-19 (GL reconciliation) and 28-34 (variance analysis) identified as highest time sinks. Last updated by Marcus Webb, Dec 2024.",
      },
    },
    {
      id: "sig-mc-009",
      source: "ticket",
      kind: "jira",
      createdAt: ago(20 * 24 * 3600),
      ingested_at: ago(20 * 24 * 3600),
      payload: {
        subject: "FIN-2847 · Automate Cross-System Balance Verification",
        body: "Feature request from Finance: build automated balance verification between SAP GL and Oracle AR to eliminate 8-hour manual reconciliation step. Priority: High. Requested by: Andrea Chu, Finance Controller.",
      },
    },
    {
      id: "sig-mc-010",
      source: "slack",
      kind: "slack",
      createdAt: ago(14 * 24 * 3600),
      ingested_at: ago(14 * 24 * 3600),
      payload: {
        subject: "#month-end-close · Sarah K.",
        body: "Q4 close starts next week. Reminding everyone of the manual checklist — please review the 47-step runbook before Monday. Marcus, can you prep the reconciliation templates? We need to do better than last quarter.",
      },
    },
  ],
  "365d9b9e-409c-4729-bb42-77aaf5f5f9c0": [
    {
      id: "sig-vr-001",
      source: "email",
      kind: "email",
      createdAt: ago(62 * 24 * 3600),
      ingested_at: ago(62 * 24 * 3600),
      payload: {
        subject: "AP Alert: Apex Precision Parts — 34-Day Overdue Invoice",
        body: "AP Team: Invoice #APX-2024-0847 from Apex Precision Parts for $312,400 is now 34 days overdue. This is the third consecutive late-pay occurrence. Procurement has not been notified. Please escalate per SOP.",
      },
    },
    {
      id: "sig-vr-002",
      source: "ticket",
      kind: "servicenow",
      createdAt: ago(59 * 24 * 3600),
      ingested_at: ago(59 * 24 * 3600),
      payload: {
        subject: "SNOW-79234 · Apex Precision Parts — Supplier Risk Review",
        body: "Procurement requesting risk assessment for Apex Precision Parts following 3 late payment events in Q4. Total outstanding: $847,200. Current risk tier: Tier 1. Previous risk score: 0.42 (Low). Manual review required.",
      },
    },
    {
      id: "sig-vr-003",
      source: "slack",
      kind: "slack",
      createdAt: ago(57 * 24 * 3600),
      ingested_at: ago(57 * 24 * 3600),
      payload: {
        subject: "#procurement-ops · Daniel Torres",
        body: "Has anyone checked NovoTech Alloys' compliance status recently? I just found out their ISO 9001 cert expired 47 days ago and we have $5.8M in active orders going through them. This should have triggered an alert.",
      },
    },
    {
      id: "sig-vr-004",
      source: "email",
      kind: "email",
      createdAt: ago(55 * 24 * 3600),
      ingested_at: ago(55 * 24 * 3600),
      payload: {
        subject: "NovoTech Alloys — ISO 9001 Certification Lapse — URGENT",
        body: "Per our supplier compliance requirements, NovoTech Alloys' ISO 9001 certification lapsed on Dec 3. They represent $5.8M in Q1 purchase orders. Per Section 4.2 of the Supplier Quality Agreement, all orders should be placed on hold pending re-certification. Compliance team not yet notified. — Daniel Torres, Senior Procurement Manager",
      },
    },
    {
      id: "sig-vr-005",
      source: "ticket",
      kind: "servicenow",
      createdAt: ago(52 * 24 * 3600),
      ingested_at: ago(52 * 24 * 3600),
      payload: {
        subject: "SNOW-80112 · Meridian Components — Delivery Performance Alert",
        body: "Logistics flagging Meridian Components on-time delivery rate: Q4 actuals show 61% vs. 94% contractual SLA. 14 missed shipments in 90 days. Root cause unknown. No corrective action plan on file. Active orders: $2.1M.",
      },
    },
    {
      id: "sig-vr-006",
      source: "slack",
      kind: "slack",
      createdAt: ago(48 * 24 * 3600),
      ingested_at: ago(48 * 24 * 3600),
      payload: {
        subject: "#supply-chain · Rachel Kim",
        body: "Production line 4 is down because Meridian Components missed another delivery. This is the 6th time this quarter. I escalated to procurement 3 weeks ago but nothing has happened. We're eating $40K/day in downtime costs.",
      },
    },
    {
      id: "sig-vr-007",
      source: "git",
      kind: "git",
      createdAt: ago(44 * 24 * 3600),
      ingested_at: ago(44 * 24 * 3600),
      payload: {
        subject: "PR #2847: Add manual vendor risk scoring spreadsheet",
        body: "Commit: feat(procurement): add vendor risk scoring workbook for Q4 audit\\n\\nManual Excel workbook for scoring Tier-1 vendors across 5 risk dimensions. Built because no automated monitoring exists. Covers Apex Precision Parts, Meridian Components, NovoTech Alloys, and 11 other suppliers. — authored by d.torres@acme-robotics.com",
      },
    },
    {
      id: "sig-vr-008",
      source: "email",
      kind: "email",
      createdAt: ago(40 * 24 * 3600),
      ingested_at: ago(40 * 24 * 3600),
      payload: {
        subject: "Q4 Supplier Risk Audit — Manual Review Required for 14 Vendors",
        body: "Procurement: Q4 risk audit requires manual review of 14 Tier-1 suppliers. Using the scoring workbook Daniel shared. This will take approximately 3 days of analyst time. Apex Precision Parts and NovoTech Alloys are priority flags. Findings due Jan 10.",
      },
    },
    {
      id: "sig-vr-009",
      source: "doc",
      kind: "confluence",
      createdAt: ago(36 * 24 * 3600),
      ingested_at: ago(36 * 24 * 3600),
      payload: {
        subject: "Supplier Risk Management — Current State Assessment",
        body: "Current vendor risk monitoring: 100% manual. 3-person procurement team reviews 47 Tier-1 suppliers quarterly using a 5-dimension Excel scorecard. No real-time monitoring. Alerts generated only during quarterly review cycles. Total monitoring gap: 270 days/year. Last updated: Jan 2025.",
      },
    },
    {
      id: "sig-vr-010",
      source: "slack",
      kind: "slack",
      createdAt: ago(30 * 24 * 3600),
      ingested_at: ago(30 * 24 * 3600),
      payload: {
        subject: "#procurement-ops · Daniel Torres",
        body: "Apex Precision Parts just told us they're restructuring. 4th late payment now confirmed. We have $1.2M in open orders. I've been manually monitoring 47 suppliers in a spreadsheet — we need automated risk monitoring or we're going to get blindsided again.",
      },
    },
    {
      id: "sig-vr-011",
      source: "ticket",
      kind: "jira",
      createdAt: ago(25 * 24 * 3600),
      ingested_at: ago(25 * 24 * 3600),
      payload: {
        subject: "PROC-4421 · Automate Tier-1 Supplier Risk Monitoring",
        body: "Epic: Build automated vendor risk monitoring to replace quarterly manual review. Requirements: real-time payment tracking, compliance certificate expiration alerts, delivery performance scoring. Business case: $1.2M exposure from Apex Precision Parts alone justifies immediate investment.",
      },
    },
    {
      id: "sig-vr-012",
      source: "email",
      kind: "email",
      createdAt: ago(18 * 24 * 3600),
      ingested_at: ago(18 * 24 * 3600),
      payload: {
        subject: "NovoTech Alloys — Re-certification Status Update",
        body: "NovoTech has submitted their ISO 9001 recertification audit request. Expected completion: 45 days. In the meantime, $5.8M in orders remain technically non-compliant. Procurement recommends continuing orders given lead time constraints but wants governance sign-off. — Rachel Kim, Supply Chain Director",
      },
    },
  ],
  "abac1d90-a89b-49dd-b28e-7c4d589a3d94": [
    {
      id: "sig-ob-001",
      source: "ticket",
      kind: "servicenow",
      createdAt: ago(30 * 24 * 3600),
      ingested_at: ago(30 * 24 * 3600),
      payload: {
        subject: "SNOW-88301 · IT Provisioning Delay — New Hire Priya Sharma",
        body: "New hire Priya Sharma (Software Engineer, start date Jan 6) still awaiting laptop provisioning on Day 4. Manager escalation received. IT team backlog at 34 pending provisioning requests. Standard SLA is Day 1.",
      },
    },
    {
      id: "sig-ob-002",
      source: "slack",
      kind: "slack",
      createdAt: ago(28 * 24 * 3600),
      ingested_at: ago(28 * 24 * 3600),
      payload: {
        subject: "#new-hire-help · Priya Sharma",
        body: "Hi everyone, I started Monday and I still don't have laptop access or email yet. My manager submitted a ticket but IT says it's in a queue. Is this normal? I've been reading through PDFs but can't actually start work yet.",
      },
    },
    {
      id: "sig-ob-003",
      source: "email",
      kind: "email",
      createdAt: ago(25 * 24 * 3600),
      ingested_at: ago(25 * 24 * 3600),
      payload: {
        subject: "Q4 New Hire Satisfaction Survey — Onboarding Feedback",
        body: "Survey results: 23-day avg time-to-productivity vs. 12-day benchmark. Top complaints: IT access delays (67% of respondents), unclear benefits enrollment process (54%), and compliance training notification was ad hoc (48%). NPS for onboarding: 31 (industry avg: 67).",
      },
    },
    {
      id: "sig-ob-004",
      source: "ticket",
      kind: "servicenow",
      createdAt: ago(22 * 24 * 3600),
      ingested_at: ago(22 * 24 * 3600),
      payload: {
        subject: "SNOW-88924 · Benefits Enrollment — Manual HR Intervention Required",
        body: "New hire James Carter unable to complete benefits enrollment via Workday self-service. HR must manually process. This is the 3rd such ticket this month. Benefits portal integration with Workday broken for ~78% of new hire configurations.",
      },
    },
    {
      id: "sig-ob-005",
      source: "slack",
      kind: "slack",
      createdAt: ago(20 * 24 * 3600),
      ingested_at: ago(20 * 24 * 3600),
      payload: {
        subject: "#hr-ops · Jennifer Walsh",
        body: "Can someone from IT fix the Workday-to-AD sync? 4 new hires this week had to get manual accounts created. We're spending 2+ hours per hire on IT coordination that should be automatic. This is why our onboarding scores are terrible.",
      },
    },
    {
      id: "sig-ob-006",
      source: "doc",
      kind: "confluence",
      createdAt: ago(18 * 24 * 3600),
      ingested_at: ago(18 * 24 * 3600),
      payload: {
        subject: "Onboarding Process Map — Current State (62 Manual Steps)",
        body: "Documented current state: 62 discrete manual steps across Workday, ServiceNow, AD, benefits portal, and LMS. Process owners: HR (22 steps), IT (18 steps), Facilities (8 steps), Compliance (14 steps). No single system of record for onboarding status. Last reviewed Dec 2024.",
      },
    },
    {
      id: "sig-ob-007",
      source: "email",
      kind: "email",
      createdAt: ago(14 * 24 * 3600),
      ingested_at: ago(14 * 24 * 3600),
      payload: {
        subject: "January Cohort — 12 New Hires Starting Monday",
        body: "Reminder: 12 new hires starting Jan 13. Please ensure IT provisioning is completed by Friday. Last cohort averaged 4.2 days to full access. Compliance training assignments need to go out Day 1 — Lisa, please manually assign in LMS as usual. — Jennifer Walsh, HR Director",
      },
    },
    {
      id: "sig-ob-008",
      source: "ticket",
      kind: "jira",
      createdAt: ago(10 * 24 * 3600),
      ingested_at: ago(10 * 24 * 3600),
      payload: {
        subject: "HR-1147 · Automate New Hire Onboarding Workflow",
        body: "Initiative: Automate the 62-step onboarding workflow to reduce time-to-productivity from 23 to <12 days. Estimated annual savings: $201,600 (48 hires × $4,200 cost per inefficient onboarding). Priority: Q1 initiative. Sponsor: Jennifer Walsh.",
      },
    },
  ],
};

const GOVERNANCE_ITEMS = [
  {
    id: 1,
    capabilityId: 1,
    agentId: 4,
    title: "MonthEndCloseOrchestrator — Budget Threshold Breach",
    description:
      "Capability has consumed $4,820 of $8,000 budget limit (60.3%). Projected month-end spend is $6,200, approaching the 80% governance alert threshold. Requesting approval to increase budget limit to $10,000 for Q1 close cycle.",
    riskLevel: "medium",
    category: "budget_breach",
    status: "pending",
    requestedBy: "Nexus-003",
    reviewedBy: null,
    humanResponse: null,
    financialImpact: 2000,
    createdAt: ago(4 * 3600),
    resolvedAt: null,
  },
  {
    id: 2,
    capabilityId: 3,
    agentId: 8,
    title: "Vendor Risk Monitor — Escalation Policy Change",
    description:
      "Lambda-008 proposing to lower the critical risk escalation threshold from 0.90 to 0.82 following NovoTech Alloys incident (lapsed ISO cert went undetected for 47 days at threshold 0.90). Change requires governance approval per Section 3.4 of the Compliance Policy.",
    riskLevel: "high",
    category: "policy_change",
    status: "pending",
    requestedBy: "Lambda-008",
    reviewedBy: null,
    humanResponse: null,
    financialImpact: 0,
    createdAt: ago(8 * 3600),
    resolvedAt: null,
  },
  {
    id: 3,
    capabilityId: 1,
    agentId: 1,
    title: "MonthEndCloseOrchestrator — Capability Lifecycle Promotion",
    description:
      "Capability has maintained fitness score of 0.78 for 6 consecutive cycles. Requesting promotion from 'active' to 'production' status with expanded autonomous decision boundaries for journal entry posting.",
    riskLevel: "low",
    category: "capability_lifecycle",
    status: "approved",
    requestedBy: "Nexus-003",
    reviewedBy: "Human Operator",
    humanResponse:
      "Approved. Performance data supports promotion. Monitoring dashboard required for first 30 days post-promotion.",
    financialImpact: 0,
    createdAt: ago(36 * 3600),
    resolvedAt: ago(30 * 3600),
  },
  {
    id: 4,
    capabilityId: 2,
    agentId: 6,
    title: "Onboarding Orchestration — Compliance Module Anomaly",
    description:
      "Tau-001 detected 34% compliance training completion rate at 30-day mark across January cohort (12 new hires). Root cause: LMS integration latency causing assignment failures. Proposing emergency fallback to email-based assignment for active cohort.",
    riskLevel: "critical",
    category: "compliance",
    status: "approved",
    requestedBy: "Tau-001",
    reviewedBy: "Jennifer Walsh",
    humanResponse:
      "Approved emergency fallback. IT to patch LMS integration by end of week. Keep manual email backup active until confirmed fixed.",
    financialImpact: 0,
    createdAt: ago(24 * 3600),
    resolvedAt: ago(20 * 3600),
  },
];

const COUNCIL_REVIEWS = [
  {
    id: 1,
    capabilityId: 1,
    triggerEvent:
      "MonthEndCloseOrchestrator generation 2 evolution cycle — fitness delta +0.06 from Gen 1 baseline",
    reviewerAgents: JSON.stringify(["Nexus-003", "Prism-006", "Lambda-008"]),
    votes: JSON.stringify({
      "Nexus-003": "approve",
      "Prism-006": "approve",
      "Lambda-008": "approve",
    }),
    consensus: "unanimous",
    outcome: "approved",
    createdAt: ago(48 * 3600),
  },
  {
    id: 2,
    capabilityId: 3,
    triggerEvent:
      "Vendor Risk Monitor — proposed threshold change from 0.90 → 0.82 after NovoTech Alloys incident",
    reviewerAgents: JSON.stringify(["Lambda-008", "Prism-006", "Nexus-003", "Chi-004"]),
    votes: JSON.stringify({
      "Lambda-008": "approve",
      "Prism-006": "approve",
      "Nexus-003": "approve",
      "Chi-004": "reject",
    }),
    consensus: "majority",
    outcome: "escalated_to_human",
    createdAt: ago(8 * 3600),
  },
  {
    id: 3,
    capabilityId: 2,
    triggerEvent:
      "Onboarding Orchestration Gen 3 deployment — proposed 30% expansion of autonomous decision scope",
    reviewerAgents: JSON.stringify(["Tau-001", "Sigma-002", "Nexus-003"]),
    votes: JSON.stringify({
      "Tau-001": "approve",
      "Sigma-002": "reject",
      "Nexus-003": "reject",
    }),
    consensus: "split",
    outcome: "escalated_to_human",
    createdAt: ago(12 * 3600),
  },
];

const REAL_CAPABILITIES = [
  {
    id: 10,
    name: "VendorRiskTriageAgent",
    kind: "agent",
    stage: "shadow",
    generation: 1,
  },
  {
    id: 11,
    name: "MonthEndReconciler",
    kind: "workflow",
    stage: "canary",
    generation: 2,
  },
  {
    id: 12,
    name: "OnboardingOrchestrator",
    kind: "workflow",
    stage: "proposed",
    generation: 3,
  },
];

const EVOLUTION = [
  {
    id: 1,
    generation: 3,
    capabilityId: 2,
    fitnessScore: 0.56,
    previousFitness: 0.49,
    mutations: JSON.stringify(["expanded_decision_scope", "new_hr_system_integration"]),
    improvements: JSON.stringify([
      "LMS integration fallback",
      "Workday sync retry logic",
    ]),
    agentsSurvived: 2,
    agentsEvolved: 1,
    agentsDissolved: 0,
    selfPlayResult: "positive",
    createdAt: ago(6 * 3600),
  },
  {
    id: 2,
    generation: 2,
    capabilityId: 1,
    fitnessScore: 0.78,
    previousFitness: 0.72,
    mutations: JSON.stringify(["reconciliation_algorithm_v2", "cross_system_balance_check"]),
    improvements: JSON.stringify([
      "SAP-Oracle bridge latency fix",
      "Intercompany elimination rule expansion",
      "Variance threshold tuning",
    ]),
    agentsSurvived: 4,
    agentsEvolved: 3,
    agentsDissolved: 1,
    selfPlayResult: "positive",
    createdAt: ago(36 * 3600),
  },
  {
    id: 3,
    generation: 1,
    capabilityId: 3,
    fitnessScore: 0.67,
    previousFitness: 0.0,
    mutations: JSON.stringify(["initial_deployment"]),
    improvements: JSON.stringify(["First generation deployment from gap analysis"]),
    agentsSurvived: 2,
    agentsEvolved: 0,
    agentsDissolved: 0,
    selfPlayResult: "neutral",
    createdAt: ago(96 * 3600),
  },
];

const COMPOSITION_LINKS = [
  {
    id: 1,
    sourceCapabilityId: 1,
    targetCapabilityId: 3,
    linkType: "data_flow",
    strength: 0.8,
    description: "Vendor invoice data flows from MonthEndCloseOrchestrator to Vendor Risk Monitor for payment history scoring",
  },
  {
    id: 2,
    sourceCapabilityId: 3,
    targetCapabilityId: 1,
    linkType: "feedback",
    strength: 0.6,
    description: "Vendor risk escalations from Lambda-008 inform accrual estimates in month-end close",
  },
  {
    id: 3,
    sourceCapabilityId: 2,
    targetCapabilityId: 1,
    linkType: "trigger",
    strength: 0.4,
    description: "New employee onboarding triggers cost center setup in financial systems",
  },
];

const MIGRATION_ITEMS = [
  {
    id: 1,
    capabilityId: 1,
    legacySystem: "SAP Manual Close",
    legacyDescription: "47-step manual month-end close process across SAP GL and Oracle AR with Excel reconciliation workbooks",
    migrationStatus: "live",
    progress: 1.0,
    complexity: "critical",
    estimatedWeeks: 12,
    dataVolume: "2.4M records/month",
    createdAt: ago(120 * 24 * 3600),
  },
  {
    id: 2,
    capabilityId: 3,
    legacySystem: "Excel Vendor Scorecard",
    legacyDescription: "Quarterly manual vendor risk scoring workbook covering 47 Tier-1 suppliers across 5 risk dimensions",
    migrationStatus: "in_progress",
    progress: 0.72,
    complexity: "high",
    estimatedWeeks: 6,
    dataVolume: "47 vendors, 15K data points",
    createdAt: ago(60 * 24 * 3600),
  },
  {
    id: 3,
    capabilityId: 2,
    legacySystem: "Manual Onboarding Runbook",
    legacyDescription: "62-step manual onboarding process across Workday, ServiceNow, AD, benefits portal, and LMS",
    migrationStatus: "testing",
    progress: 0.45,
    complexity: "high",
    estimatedWeeks: 8,
    dataVolume: "48 hires/year",
    createdAt: ago(30 * 24 * 3600),
  },
  {
    id: 4,
    capabilityId: null,
    legacySystem: "Oracle AR Manual Reconciliation",
    legacyDescription: "Manual accounts receivable aging analysis and customer credit risk scoring in Oracle",
    migrationStatus: "planned",
    progress: 0.0,
    complexity: "medium",
    estimatedWeeks: 10,
    dataVolume: "850 active AR accounts",
    createdAt: ago(14 * 24 * 3600),
  },
  {
    id: 5,
    capabilityId: null,
    legacySystem: "Legacy PO Approval Workflow",
    legacyDescription: "Email-based purchase order approval chain for orders under $50K",
    migrationStatus: "decommissioned",
    progress: 1.0,
    complexity: "low",
    estimatedWeeks: 4,
    dataVolume: "~200 POs/month",
    createdAt: ago(180 * 24 * 3600),
  },
];

// ─── Activity Data ────────────────────────────────────────────────────────────

function makeActivity() {
  const events = [
    {
      id: 1,
      capabilityId: 1,
      agentId: 1,
      eventType: "task_completed",
      title: "GL Reconciliation Complete",
      description:
        "Nexus-003 completed SAP-Oracle GL reconciliation. 3 variances found, 2 auto-resolved, 1 escalated.",
      severity: "success",
      metadata: JSON.stringify({ duration_ms: 4820, variances: 3 }),
      createdAt: ago(420),
    },
    {
      id: 2,
      capabilityId: 3,
      agentId: 8,
      eventType: "governance_requested",
      title: "Vendor Escalation Threshold Change",
      description:
        "Lambda-008 submitted governance request to lower vendor risk escalation threshold from 0.90 to 0.82.",
      severity: "warning",
      metadata: JSON.stringify({ old_threshold: 0.90, new_threshold: 0.82 }),
      createdAt: ago(8 * 3600),
    },
    {
      id: 3,
      capabilityId: 2,
      agentId: 6,
      eventType: "evolution_cycle",
      title: "Onboarding Orchestration Gen 3 Deployed",
      description:
        "Tau-001 completed Gen 3 evolution cycle. Fitness improved from 0.49 → 0.56. LMS fallback integration added.",
      severity: "info",
      metadata: JSON.stringify({ gen: 3, fitness: 0.56, delta: 0.07 }),
      createdAt: ago(6 * 3600),
    },
    {
      id: 4,
      capabilityId: 3,
      agentId: 9,
      eventType: "task_completed",
      title: "NovoTech Alloys Risk Assessment",
      description:
        "Delta-009 completed risk assessment for NovoTech Alloys. Score: 0.87 (High). Council alert dispatched.",
      severity: "warning",
      metadata: JSON.stringify({ vendor: "NovoTech Alloys", score: 0.87 }),
      createdAt: ago(2 * 3600),
    },
    {
      id: 5,
      capabilityId: 1,
      agentId: 2,
      eventType: "task_completed",
      title: "Accrual Posting — 17 Entries",
      description:
        "Chi-004 processed 17 accrual entries totaling $847,000 across 6 cost centers. All within policy bounds.",
      severity: "success",
      metadata: JSON.stringify({ entries: 17, total: 847000 }),
      createdAt: ago(3 * 3600),
    },
    {
      id: 6,
      capabilityId: 3,
      agentId: 8,
      eventType: "governance_requested",
      title: "Apex Precision Parts Risk Alert",
      description:
        "Lambda-008 flagged Apex Precision Parts (4th consecutive late payment, $1.2M exposure). Governance review initiated.",
      severity: "error",
      metadata: JSON.stringify({ vendor: "Apex Precision Parts", exposure: 1200000 }),
      createdAt: ago(4 * 3600),
    },
    {
      id: 7,
      capabilityId: 2,
      agentId: 7,
      eventType: "task_completed",
      title: "January Cohort IT Provisioning",
      description:
        "Sigma-002 completed provisioning for 12 new hires (Jan cohort). Avg time-to-access: 2.1 days (↓ from 4.2).",
      severity: "success",
      metadata: JSON.stringify({ cohort_size: 12, avg_days: 2.1 }),
      createdAt: ago(5 * 3600),
    },
    {
      id: 8,
      capabilityId: 1,
      agentId: 3,
      eventType: "agent_spawned",
      title: "Psi-005 Spawned for Intercompany Module",
      description:
        "New specialist agent Psi-005 spawned to handle intercompany elimination module. Gen 2 architecture.",
      severity: "info",
      metadata: JSON.stringify({ agent: "Psi-005", gen: 2 }),
      createdAt: ago(48 * 3600),
    },
    {
      id: 9,
      capabilityId: null,
      agentId: null,
      eventType: "evolution_cycle",
      title: "System Fitness Update",
      description:
        "System-wide fitness recalculated: 0.670. MonthEndClose leading at 0.78. VendorRisk stable at 0.67.",
      severity: "info",
      metadata: JSON.stringify({ system_fitness: 0.670 }),
      createdAt: ago(7200),
    },
    {
      id: 10,
      capabilityId: 3,
      agentId: 8,
      eventType: "task_completed",
      title: "Meridian Components Delivery Audit",
      description:
        "Lambda-008 completed 90-day delivery performance audit for Meridian Components. OTD: 61%. Escalation recommended.",
      severity: "warning",
      metadata: JSON.stringify({ vendor: "Meridian Components", otd_pct: 61 }),
      createdAt: ago(8600),
    },
    {
      id: 11,
      capabilityId: 1,
      agentId: 4,
      eventType: "task_completed",
      title: "Variance Analysis Flagged 4 Anomalies",
      description:
        "Prism-006 (sentinel) detected 4 statistical anomalies in Q4 cost center variance analysis. 2 require human review.",
      severity: "warning",
      metadata: JSON.stringify({ anomalies: 4, human_review: 2 }),
      createdAt: ago(10800),
    },
    {
      id: 12,
      capabilityId: 2,
      agentId: 6,
      eventType: "budget_alert",
      title: "Onboarding Module Budget 72%",
      description:
        "Onboarding Orchestration at 72% of monthly budget. LMS API call volume higher than projected for January cohort.",
      severity: "warning",
      metadata: JSON.stringify({ budget_pct: 72 }),
      createdAt: ago(14400),
    },
  ];
  // Extend to 50 entries with synthetic past events
  for (let i = 13; i <= 50; i++) {
    const caps = [1, 2, 3];
    const types = [
      "task_completed",
      "evolution_cycle",
      "governance_requested",
      "budget_alert",
      "agent_spawned",
    ];
    const severities = ["info", "success", "warning", "info", "success"];
    const templates = [
      {
        title: "Agent Heartbeat Healthy",
        description: "All agents reporting within SLA. Fitness stable.",
        severity: "info",
        eventType: "task_completed",
      },
      {
        title: "Trust Score Updated",
        description: "Agent trust score recalculated after decision review.",
        severity: "success",
        eventType: "evolution_cycle",
      },
      {
        title: "Budget Utilization Check",
        description: "Monthly budget utilization within normal bounds.",
        severity: "info",
        eventType: "budget_alert",
      },
      {
        title: "Task Queue Processed",
        description: "Batch task queue cleared. 0 exceptions.",
        severity: "success",
        eventType: "task_completed",
      },
    ];
    const t = templates[i % templates.length];
    events.push({
      id: i,
      capabilityId: caps[i % caps.length],
      agentId: (i % 9) + 1,
      eventType: t.eventType,
      title: t.title,
      description: t.description,
      severity: t.severity,
      metadata: JSON.stringify({}),
      createdAt: ago((i * 1800) + 7200),
    });
  }
  return events;
}

const ACTIVITY = makeActivity();

// ─── Daily Costs ──────────────────────────────────────────────────────────────

function makeDailyCosts(): Array<{ day: number; total: number }> {
  const base = [
    268, 312, 287, 341, 298, 276, 253, 364, 389, 412,
    298, 276, 387, 401, 356, 329, 299, 413, 438, 467,
    389, 345, 318, 402, 448, 391, 362, 419, 456, 484,
  ];
  return base.map((total, i) => ({
    day: 30 - i,
    total: total + Math.round(total * 0.05 * Math.sin(i)),
  }));
}

const DAILY_COSTS = makeDailyCosts();

// ─── SSE Stream Factories ─────────────────────────────────────────────────────

const VENDOR_RISK_CODE = `class VendorRiskTriageAgent:
    """Autonomous vendor risk assessment and escalation agent.
    Generated by Fluid Enterprise — Gen 1 | Domain: procurement
    Capability: VendorRiskMonitor | Tenant: acme_robotics
    """

    def __init__(self, config: VendorRiskConfig):
        self.threshold_high     = config.threshold_high or 0.72
        self.threshold_critical = config.threshold_critical or 0.88
        self.scoring_engine     = RiskScoringEngine.load("acme-vendor-risk-v3")
        self.escalation_bus     = EscalationBus(channel="governance_council")
        self.audit              = AuditTrail(capability="VendorRiskMonitor")

    async def assess_vendor(self, vendor_id: str) -> VendorRiskAssessment:
        vendor  = await VendorRegistry.fetch(vendor_id)
        signals = await asyncio.gather(
            self._payment_history_signal(vendor),
            self._compliance_signal(vendor),
            self._delivery_performance_signal(vendor),
            self._contract_signal(vendor),
            self._financial_health_signal(vendor),
        )
        composite_score = self.scoring_engine.score(signals)
        assessment = VendorRiskAssessment(
            vendor_id=vendor_id,
            vendor_name=vendor.name,
            composite_score=composite_score,
            risk_level=self._classify(composite_score),
            signals=signals,
            assessed_at=datetime.utcnow(),
        )
        if composite_score >= self.threshold_high:
            await self._escalate(vendor, assessment)
        self.audit.record(
            event="vendor_risk_assessed",
            vendor_id=vendor_id,
            score=composite_score,
        )
        return assessment

    def _classify(self, score: float) -> str:
        if score >= self.threshold_critical: return "critical"
        if score >= self.threshold_high:     return "high"
        if score >= 0.45:                    return "medium"
        return "low"

    async def _payment_history_signal(self, vendor: Vendor) -> RiskSignal:
        history  = await PaymentLedger.get_history(vendor.id, days=90)
        late_pct = sum(1 for p in history if p.days_late > 0) / max(len(history), 1)
        return RiskSignal(name="payment_history", score=late_pct, weight=0.30)

    async def _compliance_signal(self, vendor: Vendor) -> RiskSignal:
        status = await ComplianceRegistry.check(vendor.id)
        return RiskSignal(
            name="compliance_status",
            score=0.0 if status.current else 1.0,
            weight=0.35,
        )

    async def _delivery_performance_signal(self, vendor: Vendor) -> RiskSignal:
        metrics = await LogisticsTracker.get_performance(vendor.id, days=90)
        miss_rate = 1.0 - (metrics.on_time_count / max(metrics.total_shipments, 1))
        return RiskSignal(name="delivery_performance", score=miss_rate, weight=0.20)

    async def _escalate(self, vendor: Vendor, assessment: VendorRiskAssessment):
        await self.escalation_bus.publish(GovernanceAlert(
            title=f"Vendor risk threshold exceeded: {vendor.name}",
            risk_score=assessment.composite_score,
            risk_level=assessment.risk_level,
            vendor_id=vendor.id,
            signals=assessment.signals,
            requires_human_approval=assessment.composite_score >= self.threshold_critical,
            sla_hours=4 if assessment.risk_level == "critical" else 24,
        ))`;

function createGeneratorStream(): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const steps: Array<{ event: string; data: unknown; delay: number }> = [
    {
      event: "thinking",
      data: {
        message:
          "Ingesting 57 signals from accounts payable, supplier portal, compliance registry, and logistics tracking...",
      },
      delay: 600,
    },
    {
      event: "thinking",
      data: {
        message:
          "Identified 3 high-risk vendors: Apex Precision Parts ($1.2M exposure), NovoTech Alloys (lapsed ISO 9001), Meridian Components (61% OTD rate).",
      },
      delay: 900,
    },
    {
      event: "thinking",
      data: {
        message:
          "Designing agent architecture: multi-source signal aggregation + composite risk scoring + governance escalation bus.",
      },
      delay: 700,
    },
    {
      event: "thinking",
      data: {
        message:
          "Scaffolding VendorRiskTriageAgent class — procurement domain, compliance integration layer, audit trail.",
      },
      delay: 600,
    },
    {
      event: "code",
      data: { content: VENDOR_RISK_CODE.slice(0, 400) },
      delay: 500,
    },
    {
      event: "code",
      data: { content: VENDOR_RISK_CODE.slice(400, 900) },
      delay: 400,
    },
    {
      event: "code",
      data: { content: VENDOR_RISK_CODE.slice(900) },
      delay: 400,
    },
    {
      event: "thinking",
      data: { message: "Running evaluation suite against 10 test scenarios..." },
      delay: 500,
    },
    {
      event: "eval",
      data: { passed: true, name: "Apex Precision Parts: 34-day overdue payment detection", case_id: 1 },
      delay: 400,
    },
    {
      event: "eval",
      data: { passed: true, name: "NovoTech Alloys: ISO 9001 expiration flag (score → 0.91)", case_id: 2 },
      delay: 350,
    },
    {
      event: "eval",
      data: { passed: true, name: "Meridian Components: delivery miss-rate scoring (61% OTD)", case_id: 3 },
      delay: 350,
    },
    {
      event: "eval",
      data: { passed: false, name: "Edge case: vendor with null payment history (score handling)", case_id: 4 },
      delay: 300,
    },
    {
      event: "eval",
      data: { passed: true, name: "Multi-signal composite: finance + compliance + delivery (score 0.86)", case_id: 5 },
      delay: 350,
    },
    {
      event: "eval",
      data: { passed: true, name: "Critical threshold breach triggers council alert dispatch", case_id: 6 },
      delay: 300,
    },
    {
      event: "eval",
      data: { passed: false, name: "Concurrent assessments: 500 vendor/min throughput target", case_id: 7 },
      delay: 300,
    },
    {
      event: "eval",
      data: { passed: true, name: "Governance notification: SLA 4h for critical, 24h for high", case_id: 8 },
      delay: 350,
    },
    {
      event: "eval",
      data: { passed: true, name: "Audit trail: all assessments recorded with immutable timestamps", case_id: 9 },
      delay: 300,
    },
    {
      event: "eval",
      data: { passed: false, name: "Edge case: vendor registry 404 — fallback to cached profile", case_id: 10 },
      delay: 300,
    },
    {
      event: "complete",
      data: {
        id: 10,
        name: "VendorRiskTriageAgent",
        slug: "vendor-risk-triage-agent",
        kind: "agent",
        generation: 1,
        code_lines: 187,
        eval_cases: 10,
        fitness: 0.668,
        composite: 0.668,
      },
      delay: 500,
    },
  ];

  return new ReadableStream<Uint8Array>({
    start(controller) {
      let i = 0;
      function next() {
        if (i >= steps.length) {
          controller.close();
          return;
        }
        const step = steps[i++];
        const line = `event: ${step.event}\ndata: ${JSON.stringify(step.data)}\n\n`;
        controller.enqueue(encoder.encode(line));
        setTimeout(next, step.delay);
      }
      setTimeout(next, 300);
    },
  });
}

// Agent activity events for sidebar pulse
const AGENT_ACTIVITY_POOL = [
  { agent: "Nexus-003", action: "GL reconciliation check — SAP cost center 4400 balanced", level: "success" },
  { agent: "Lambda-008", action: "Apex Precision Parts risk score recalculated: 0.79 (High)", level: "warning" },
  { agent: "Chi-004", action: "Accrual entry #JE-2847 posted to Oracle GL successfully", level: "success" },
  { agent: "Prism-006", action: "Variance anomaly detected in CC-1102 — flagged for review", level: "warning" },
  { agent: "Delta-009", action: "Meridian Components OTD monitoring heartbeat — 61% OTD rate", level: "info" },
  { agent: "Tau-001", action: "New hire provisioning batch queued: 3 employees starting Monday", level: "info" },
  { agent: "Sigma-002", action: "Workday-to-AD sync completed for James Carter", level: "success" },
  { agent: "Nexus-003", action: "Intercompany elimination: 18 entries processed, 0 exceptions", level: "success" },
  { agent: "Lambda-008", action: "NovoTech Alloys recertification status check — still pending", level: "warning" },
  { agent: "Gamma-007", action: "AR aging report generated for 850 accounts", level: "info" },
  { agent: "Psi-005", action: "Sub-ledger sync complete — Oracle AR to SAP GL delta reconciled", level: "success" },
  { agent: "Chi-004", action: "Budget utilization alert: MonthEndClose at 60.3% of limit", level: "warning" },
  { agent: "Prism-006", action: "Sentinel check: all agents healthy, 0 anomalies detected", level: "info" },
  { agent: "Lambda-008", action: "Vendor risk council alert dispatched for Apex Precision Parts", level: "warning" },
  { agent: "Tau-001", action: "Compliance training LMS fallback active for 12-person cohort", level: "info" },
];

let agentActivityIndex = 0;
function createAgentActivityStream(): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let cancelled = false;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      function sendNext() {
        if (cancelled) return;
        const event = AGENT_ACTIVITY_POOL[agentActivityIndex % AGENT_ACTIVITY_POOL.length];
        agentActivityIndex++;
        const data = JSON.stringify({ ...event, timestamp: Date.now() });
        const line = `event: activity\ndata: ${data}\n\n`;
        controller.enqueue(encoder.encode(line));
        const delay = 2500 + Math.floor(Math.random() * 2500);
        setTimeout(sendNext, delay);
      }
      setTimeout(sendNext, 1000);
    },
    cancel() {
      cancelled = true;
    },
  });
}

// ─── Dashboard Aggregation ───────────────────────────────────────────────────

function getDashboard() {
  const totalConsumed = CAPABILITIES.reduce((s, c) => s + c.budgetConsumed, 0);
  const totalLimit = CAPABILITIES.reduce((s, c) => s + c.budgetLimit, 0);
  return {
    capabilities: CAPABILITIES,
    kpis: {
      systemFitness: 0.670,
      trustIndexAvg: 0.719,
      automationRateAvg: 0.66,
      activeAgents: 9,
      totalConsumed,
      totalAllocated: CAPABILITIES.reduce((s, c) => s + c.budgetAllocated, 0),
      totalLimit,
      budgetUtilization: totalConsumed / totalLimit,
      pendingGovernance: 2,
      evolutionGeneration: 3,
    },
    recentActivity: ACTIVITY.slice(0, 10),
    costTrend: DAILY_COSTS,
    latestEvolution: EVOLUTION[0],
    realData: {
      generation: 3,
      gapsOpen: 3,
      capabilitiesGenerated: 3,
    },
    agentSummary: {
      total: 9,
      active: 9,
      byStatus: { online: 6, busy: 3, degraded: 0, offline: 0, dissolved: 0 },
      byRole: { orchestrator: 3, specialist: 2, sentinel: 2, task: 2 },
    },
  };
}

// ─── Main Interceptor ─────────────────────────────────────────────────────────

export async function demoFetch(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  const parsed = (() => {
    try {
      return new URL(url, "http://localhost");
    } catch {
      return { pathname: url, searchParams: new URLSearchParams() };
    }
  })();
  const path = parsed.pathname;
  const method = (options?.method ?? "GET").toUpperCase();

  // ── GET /api/dashboard
  if (path === "/api/dashboard" || path === "/api/real/dashboard") {
    return jsonResponse(getDashboard());
  }

  // ── GET /api/capabilities
  if (path === "/api/capabilities" || path === "/api/real/capabilities") {
    if (path === "/api/real/capabilities") return jsonResponse(REAL_CAPABILITIES);
    return jsonResponse(CAPABILITIES);
  }

  // ── GET /api/capabilities/:id
  const capDetailMatch = path.match(/^\/api\/capabilities\/(\d+)$/);
  if (capDetailMatch) {
    const id = parseInt(capDetailMatch[1], 10);
    const cap = CAPABILITIES.find((c) => c.id === id);
    if (!cap) return jsonResponse({ message: "Not found" }, 404);
    const agents = AGENTS.filter((a) => a.capabilityId === id);
    return jsonResponse({ ...cap, agents, tasks: [] });
  }

  // ── GET /api/gaps
  if (path === "/api/gaps") {
    return jsonResponse(GAPS);
  }

  // ── GET /api/gaps/:id/signals
  const signalsMatch = path.match(/^\/api\/gaps\/([^/]+)\/signals$/);
  if (signalsMatch) {
    const gapId = signalsMatch[1];
    const signals = GAP_SIGNALS[gapId] ?? [];
    return jsonResponse({ signals });
  }

  // ── GET /api/governance
  if (path === "/api/governance") {
    return jsonResponse(GOVERNANCE_ITEMS);
  }

  // ── POST /api/governance/:id/resolve
  const govResolveMatch = path.match(/^\/api\/governance\/(\d+)\/resolve$/);
  if (govResolveMatch && method === "POST") {
    return jsonResponse({ success: true, message: "Governance item resolved" });
  }

  // ── GET /api/council
  if (path === "/api/council") {
    return jsonResponse(COUNCIL_REVIEWS);
  }

  // ── GET /api/heartbeat
  if (path === "/api/heartbeat") {
    return jsonResponse(AGENTS);
  }

  // ── GET /api/evolution
  if (path === "/api/evolution") {
    return jsonResponse(EVOLUTION);
  }

  // ── GET /api/composition
  if (path === "/api/composition") {
    return jsonResponse(COMPOSITION_LINKS);
  }

  // ── GET /api/migration
  if (path === "/api/migration") {
    return jsonResponse(MIGRATION_ITEMS);
  }

  // ── GET /api/costs/daily
  if (path === "/api/costs/daily") {
    return jsonResponse(DAILY_COSTS);
  }

  // ── GET /api/activity
  if (path === "/api/activity") {
    return jsonResponse(ACTIVITY);
  }

  // ── POST /api/generator/generate
  if (path === "/api/generator/generate" && method === "POST") {
    return jsonResponse({
      id: 10,
      name: "VendorRiskTriageAgent",
      slug: "vendor-risk-triage-agent",
      kind: "agent",
      generation: 1,
      code_lines: 187,
      eval_cases: 10,
      fitness: 0.668,
      composite: 0.668,
    });
  }

  // ── POST /api/generator/stream  (SSE)
  if (path === "/api/generator/stream" && method === "POST") {
    return new Response(createGeneratorStream(), {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // ── POST /api/arena/evaluate/:id
  const arenaMatch = path.match(/^\/api\/arena\/evaluate\/(\d+)$/);
  if (arenaMatch && method === "POST") {
    // Slight delay to simulate evaluation
    await new Promise((r) => setTimeout(r, 800));
    return jsonResponse({
      composite: 0.668,
      success_rate: 0.6,
      passed: 6,
      total: 10,
      fitness: 0.668,
      cases: [
        { id: 1, name: "Payment delay detection", result: "pass" },
        { id: 2, name: "Compliance expiration flag", result: "pass" },
        { id: 3, name: "Delivery miss-rate scoring", result: "pass" },
        { id: 4, name: "Null payment history edge case", result: "fail" },
        { id: 5, name: "Multi-signal composite scoring", result: "pass" },
        { id: 6, name: "Critical threshold escalation", result: "pass" },
        { id: 7, name: "500 vendor/min throughput", result: "fail" },
        { id: 8, name: "Governance SLA compliance", result: "pass" },
        { id: 9, name: "Immutable audit trail", result: "pass" },
        { id: 10, name: "Registry 404 fallback", result: "fail" },
      ],
    });
  }

  // ── POST /api/real/capabilities/:id/transition
  const transitionMatch = path.match(/^\/api\/real\/capabilities\/(\d+)\/transition$/);
  if (transitionMatch && method === "POST") {
    return jsonResponse({
      success: true,
      message: "Capability promoted to shadow stage",
      stage: "shadow",
    });
  }

  // ── GET /api/agents/activity/stream  (SSE)
  if (path === "/api/agents/activity/stream") {
    return new Response(createAgentActivityStream(), {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // ── Fallback: unknown endpoint
  return jsonResponse({ error: `Demo: no mock for ${method} ${path}` }, 404);
}

// ─── Demo EventSource ─────────────────────────────────────────────────────────
// Patches window.EventSource so AgentPulse's /api/agents/activity/stream works
// in static deployments where there's no real SSE server.

export function installDemoEventSource(): void {
  if (typeof window === "undefined") return;

  const OriginalEventSource = window.EventSource;

  class DemoEventSource extends EventTarget {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSED = 2;
    readonly CONNECTING = 0;
    readonly OPEN = 1;
    readonly CLOSED = 2;

    readonly url: string;
    readonly withCredentials: boolean;
    readyState: number = 0;

    onopen: ((ev: Event) => void) | null = null;
    onmessage: ((ev: MessageEvent) => void) | null = null;
    onerror: ((ev: Event) => void) | null = null;

    private _inner: EventSource | null = null;
    private _simInterval: ReturnType<typeof setTimeout> | null = null;
    private _connected = false;
    private _closed = false;

    constructor(urlArg: string | URL, init?: EventSourceInit) {
      super();
      this.url = String(urlArg);
      this.withCredentials = init?.withCredentials ?? false;

      // Try the real EventSource first; fall back to simulation on error
      try {
        const inner = new OriginalEventSource(urlArg, init);
        this._inner = inner;

        const failTimeout = setTimeout(() => {
          if (!this._connected && !this._closed) {
            inner.close();
            this._inner = null;
            this._startSimulation();
          }
        }, 3000);

        inner.onopen = () => {
          this._connected = true;
          clearTimeout(failTimeout);
          this.readyState = 1;
          const ev = new Event("open");
          this.onopen?.(ev);
          this.dispatchEvent(ev);
        };

        inner.onerror = () => {
          if (!this._connected) {
            clearTimeout(failTimeout);
            inner.close();
            this._inner = null;
            this._startSimulation();
          }
        };

        inner.onmessage = (e: MessageEvent) => {
          const fwd = new MessageEvent("message", { data: e.data });
          this.onmessage?.(fwd);
          this.dispatchEvent(fwd);
        };

        for (const name of ["activity", "agent_event"]) {
          inner.addEventListener(name, (e: Event) => {
            const me = e as MessageEvent;
            const fwd = new MessageEvent(name, { data: me.data });
            this.dispatchEvent(fwd);
          });
        }
      } catch {
        this._startSimulation();
      }
    }

    private _startSimulation(): void {
      if (this._closed) return;
      this.readyState = 1;
      const openEv = new Event("open");
      this.onopen?.(openEv);
      this.dispatchEvent(openEv);

      const tick = () => {
        if (this._closed) return;
        const event = AGENT_ACTIVITY_POOL[agentActivityIndex % AGENT_ACTIVITY_POOL.length];
        agentActivityIndex++;
        const data = JSON.stringify({ ...event, timestamp: Date.now() });
        const ev = new MessageEvent("activity", { data });
        this.dispatchEvent(ev);
        const delay = 2500 + Math.floor(Math.random() * 2500);
        this._simInterval = setTimeout(tick, delay);
      };
      this._simInterval = setTimeout(tick, 1200);
    }

    close(): void {
      this._closed = true;
      this.readyState = 2;
      this._inner?.close();
      if (this._simInterval) clearTimeout(this._simInterval);
    }
  }

  // @ts-expect-error — intentional EventSource override
  window.EventSource = DemoEventSource;
}
