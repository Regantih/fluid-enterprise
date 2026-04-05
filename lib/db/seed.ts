import { getDb } from './index'
import { nanoid } from 'nanoid'

const COMPANY_ID = 'comp_acme_global'
const NOW = new Date().toISOString()
const MONTH = new Date().toISOString().slice(0, 7)

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function hoursAgo(n: number) {
  const d = new Date()
  d.setHours(d.getHours() - n)
  return d.toISOString()
}

function minutesAgo(n: number) {
  const d = new Date()
  d.setMinutes(d.getMinutes() - n)
  return d.toISOString()
}

export async function seed() {
  const db = getDb()

  console.log('🌱 Seeding Fluid Enterprise database...')

  // ─── Company ───────────────────────────────────────────────────────────────
  const existingCompany = db.query.companies.findFirst({
    where: (t, { eq }) => eq(t.id, COMPANY_ID)
  })

  if (existingCompany) {
    console.log('✓ Data already seeded, skipping...')
    return
  }

  // Use raw sqlite for seeding
  const sqlite = (db as any).session?.client
  if (!sqlite) {
    console.error('Cannot access raw DB for seeding')
    return
  }

  // ─── Company ───────────────────────────────────────────────────────────────
  sqlite.prepare(`INSERT OR REPLACE INTO companies VALUES (?,?,?,?,?,?)`).run(
    COMPANY_ID, 'ACME Global Industries', 'Manufacturing & Distribution',
    'SAP S/4HANA 2023', 'parallel', daysAgo(180)
  )

  // ─── Capabilities ──────────────────────────────────────────────────────────
  const caps = [
    {
      id: 'cap_p2p', name: 'Procure-to-Pay', domain: 'Supply Chain',
      description: 'End-to-end procurement lifecycle: requisition → PO → GR → invoice → payment. Handles multi-currency, multi-vendor, and 3-way match automation.',
      status: 'active', agent_type: 'hybrid',
      budget: 420000, spent: 318500, sla: 8000,
      heartbeat: minutesAgo(3), tokens: 2840000, completed: 847, failed: 12
    },
    {
      id: 'cap_rev', name: 'Revenue Recognition', domain: 'Finance',
      description: 'ASC 606 / IFRS 15 compliant revenue recognition. Automates performance obligation identification, transaction price allocation, and recognition scheduling.',
      status: 'active', agent_type: 'supervised',
      budget: 380000, spent: 290200, sla: 12000,
      heartbeat: minutesAgo(7), tokens: 1920000, completed: 412, failed: 3
    },
    {
      id: 'cap_treasury', name: 'Treasury Management', domain: 'Finance',
      description: 'Cash position forecasting, FX exposure management, investment portfolio optimization. Integrates with 14 banking APIs for real-time liquidity.',
      status: 'active', agent_type: 'supervised',
      budget: 290000, spent: 198000, sla: 15000,
      heartbeat: minutesAgo(12), tokens: 1450000, completed: 290, failed: 8
    },
    {
      id: 'cap_demand', name: 'Demand Forecasting', domain: 'Supply Chain',
      description: 'ML-powered demand sensing using 47 external signals (weather, social, economic). Generates 13-week rolling forecasts with uncertainty bands.',
      status: 'scaling', agent_type: 'autonomous',
      budget: 520000, spent: 489000, sla: 30000,
      heartbeat: minutesAgo(1), tokens: 4200000, completed: 1240, failed: 45
    },
    {
      id: 'cap_ap_ar', name: 'AP/AR Automation', domain: 'Finance',
      description: 'Intelligent invoice processing with OCR, duplicate detection, and payment optimization. Handles 99.2% of invoices without human intervention.',
      status: 'active', agent_type: 'autonomous',
      budget: 310000, spent: 245000, sla: 5000,
      heartbeat: minutesAgo(2), tokens: 3100000, completed: 3420, failed: 28
    },
    {
      id: 'cap_interco', name: 'Intercompany Reconciliation', domain: 'Finance',
      description: 'Automated elimination of intercompany transactions across 23 legal entities. Netting, matching, and dispute resolution with full audit trail.',
      status: 'active', agent_type: 'hybrid',
      budget: 240000, spent: 187000, sla: 20000,
      heartbeat: minutesAgo(8), tokens: 980000, completed: 178, failed: 5
    },
    {
      id: 'cap_hr_ops', name: 'HR Operations', domain: 'HR',
      description: 'Automated onboarding workflows, payroll pre-processing, benefits enrollment, and compliance reporting. Integrates with 6 HR systems.',
      status: 'dormant', agent_type: 'hybrid',
      budget: 180000, spent: 0, sla: 10000,
      heartbeat: null, tokens: 0, completed: 0, failed: 0
    },
    {
      id: 'cap_customer_intel', name: 'Customer Intelligence', domain: 'Revenue',
      description: 'Real-time customer health scoring, churn prediction, upsell opportunity identification. Powers next-best-action recommendations for sales.',
      status: 'active', agent_type: 'autonomous',
      budget: 350000, spent: 278000, sla: 3000,
      heartbeat: minutesAgo(5), tokens: 5600000, completed: 892, failed: 19
    },
  ]

  for (const cap of caps) {
    sqlite.prepare(`INSERT OR REPLACE INTO capabilities VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      cap.id, COMPANY_ID, cap.name, cap.description, cap.domain,
      cap.status, cap.agent_type, cap.budget, cap.spent, cap.sla,
      cap.heartbeat, cap.tokens, cap.completed, cap.failed,
      daysAgo(90), daysAgo(1)
    )
  }

  // ─── Compositions ──────────────────────────────────────────────────────────
  const compositions = [
    { id: nanoid(), src: 'cap_demand', tgt: 'cap_p2p', name: 'Demand-Driven Procurement', flow: 'sequential' },
    { id: nanoid(), src: 'cap_p2p', tgt: 'cap_ap_ar', name: 'PO → Invoice Processing', flow: 'sequential' },
    { id: nanoid(), src: 'cap_ap_ar', tgt: 'cap_treasury', name: 'Payment → Cash Position', flow: 'sequential' },
    { id: nanoid(), src: 'cap_ap_ar', tgt: 'cap_interco', name: 'IC Invoice Elimination', flow: 'conditional' },
    { id: nanoid(), src: 'cap_customer_intel', tgt: 'cap_rev', name: 'Order → Revenue Event', flow: 'sequential' },
    { id: nanoid(), src: 'cap_rev', tgt: 'cap_interco', name: 'Cross-Entity Rev Allocation', flow: 'conditional' },
    { id: nanoid(), src: 'cap_treasury', tgt: 'cap_interco', name: 'IC Netting Settlement', flow: 'parallel' },
  ]

  for (const comp of compositions) {
    sqlite.prepare(`INSERT OR REPLACE INTO capability_compositions VALUES (?,?,?,?,?,?,?,?,?)`).run(
      comp.id, COMPANY_ID, comp.name, null, comp.src, comp.tgt, comp.flow, null, daysAgo(60)
    )
  }

  // ─── Tasks ─────────────────────────────────────────────────────────────────
  const taskDefs = [
    { cap: 'cap_p2p', title: 'Process vendor invoices batch #4821', status: 'completed', priority: 'normal', cost: 380, tokens: 42000, dur: 3200 },
    { cap: 'cap_p2p', title: 'Validate 3-way match: PO-4729 / GR-8821', status: 'completed', priority: 'high', cost: 120, tokens: 14000, dur: 890 },
    { cap: 'cap_p2p', title: 'Exception: Vendor Mitsubishi - price deviation >5%', status: 'awaiting_approval', priority: 'high', cost: 0, tokens: 8000, dur: null },
    { cap: 'cap_rev', title: 'Q2 ASC 606 close: 1,284 contracts', status: 'running', priority: 'critical', cost: 890, tokens: 98000, dur: null },
    { cap: 'cap_rev', title: 'Restate rev recognition: Contract #CN-4492', status: 'completed', priority: 'high', cost: 240, tokens: 27000, dur: 4100 },
    { cap: 'cap_treasury', title: 'FX hedging optimization: EUR/USD exposure', status: 'completed', priority: 'normal', cost: 190, tokens: 21000, dur: 6200 },
    { cap: 'cap_treasury', title: 'Cash concentration sweep: 8 entities', status: 'running', priority: 'normal', cost: 0, tokens: 12000, dur: null },
    { cap: 'cap_demand', title: 'Week 28 forecast generation: APAC region', status: 'completed', priority: 'normal', cost: 540, tokens: 61000, dur: 28400 },
    { cap: 'cap_demand', title: 'Anomaly detected: SKU-8821 demand spike +340%', status: 'awaiting_approval', priority: 'critical', cost: 0, tokens: 18000, dur: null },
    { cap: 'cap_ap_ar', title: 'Auto-process 847 invoices under $10K', status: 'completed', priority: 'normal', cost: 210, tokens: 24000, dur: 2100 },
    { cap: 'cap_ap_ar', title: 'Duplicate detection scan: batch 2024-06', status: 'completed', priority: 'normal', cost: 80, tokens: 9000, dur: 780 },
    { cap: 'cap_ap_ar', title: 'Delinquent AR: 142 accounts >60 days', status: 'running', priority: 'high', cost: 0, tokens: 31000, dur: null },
    { cap: 'cap_interco', title: 'Month-end IC elimination: June 2024', status: 'running', priority: 'critical', cost: 0, tokens: 44000, dur: null },
    { cap: 'cap_interco', title: 'Dispute resolution: ACME-UK vs ACME-DE', status: 'completed', priority: 'high', cost: 160, tokens: 18000, dur: 12400 },
    { cap: 'cap_customer_intel', title: 'Weekly churn scoring: Enterprise segment', status: 'completed', priority: 'normal', cost: 320, tokens: 38000, dur: 4200 },
    { cap: 'cap_customer_intel', title: 'NBO generation: Q3 renewal pipeline', status: 'running', priority: 'high', cost: 0, tokens: 52000, dur: null },
  ]

  const taskIds: Record<number, string> = {}
  for (let i = 0; i < taskDefs.length; i++) {
    const t = taskDefs[i]
    const tid = `task_${nanoid(8)}`
    taskIds[i] = tid
    const startedAt = t.status !== 'pending' ? hoursAgo(Math.random() * 24 + 1) : null
    const completedAt = t.status === 'completed' ? hoursAgo(Math.random() * 12) : null
    sqlite.prepare(`INSERT OR REPLACE INTO tasks VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      tid, t.cap, t.title, null, t.status, t.priority,
      startedAt, completedAt, t.dur ?? null,
      t.cost, t.tokens, null, null, daysAgo(Math.floor(Math.random() * 7))
    )
  }

  // ─── Governance Approvals ──────────────────────────────────────────────────
  const govItems = [
    {
      id: `gov_${nanoid(8)}`, cap: 'cap_demand', task: taskIds[8],
      type: 'budget_override', title: 'Demand Surge: Emergency Procurement Authorization',
      desc: 'SKU-8821 demand spike of +340% requires immediate procurement budget override of $48,000 to avoid stockout. Projected revenue impact: $2.1M if not actioned within 6 hours.',
      risk: 'high', requestedBy: 'agent:demand-forecasting-v2', status: 'pending',
      expires: hoursAgo(-4)
    },
    {
      id: `gov_${nanoid(8)}`, cap: 'cap_p2p', task: taskIds[2],
      type: 'budget_override', title: 'Vendor Price Exception: Mitsubishi Materials',
      desc: 'Invoice INV-48291 from Mitsubishi shows 7.3% price deviation above contracted rate. Requires manual approval or renegotiation trigger.',
      risk: 'medium', requestedBy: 'agent:procure-to-pay-v3', status: 'pending',
      expires: hoursAgo(-24)
    },
    {
      id: `gov_${nanoid(8)}`, cap: 'cap_demand', task: null,
      type: 'scale_up', title: 'Scale Demand Forecasting: LATAM Expansion',
      desc: 'Request to extend Demand Forecasting capability to cover 3 new LATAM markets. Estimated additional cost: $12,400/month. Projected accuracy improvement: 8.2%.',
      risk: 'low', requestedBy: 'hemanth.reganti@acme.com', status: 'pending',
      expires: hoursAgo(-72)
    },
    {
      id: `gov_${nanoid(8)}`, cap: 'cap_treasury', task: null,
      type: 'model_upgrade', title: 'Treasury: Upgrade to Claude Opus 4 for FX Modeling',
      desc: 'Treasury Management requesting model upgrade for complex FX portfolio optimization. Expected 34% improvement in hedge effectiveness, additional $4,200/month.',
      risk: 'medium', requestedBy: 'agent:treasury-v2', status: 'pending',
      expires: hoursAgo(-48)
    },
    {
      id: `gov_${nanoid(8)}`, cap: 'cap_ap_ar', task: null,
      type: 'capability_activation', title: 'Autonomous AR Collections: Enable Full Automation',
      desc: 'AP/AR requesting authorization to autonomously initiate collections calls for accounts >90 days delinquent. Current: human-supervised. Proposed: fully autonomous with audit trail.',
      risk: 'critical', requestedBy: 'agent:ap-ar-v4', status: 'pending',
      expires: hoursAgo(-120)
    },
    {
      id: `gov_${nanoid(8)}`, cap: 'cap_hr_ops', task: null,
      type: 'capability_activation', title: 'Activate HR Operations Capability',
      desc: 'HR Operations capability has completed parallel validation phase. Requesting activation for 200-person pilot group covering onboarding and benefits enrollment.',
      risk: 'medium', requestedBy: 'hemanth.reganti@acme.com', status: 'approved',
      expires: null, approvedBy: 'cto@acme.com', approvedAt: daysAgo(2)
    },
    {
      id: `gov_${nanoid(8)}`, cap: 'cap_p2p', task: null,
      type: 'emergency_pause', title: 'P2P: Suspicious Transaction Pattern Detected',
      desc: 'Anomaly detection flagged 14 POs to new vendor with unusual payment terms. Temporary pause requested pending security review.',
      risk: 'critical', requestedBy: 'agent:security-monitor-v1', status: 'rejected',
      expires: null, rejectionReason: 'False positive confirmed by CFO. Vendor is new subsidiary.'
    },
  ]

  for (const g of govItems) {
    sqlite.prepare(`INSERT OR REPLACE INTO governance_approvals VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      g.id, COMPANY_ID, g.cap, g.task ?? null, g.type, g.title, g.desc,
      g.requestedBy, g.status, g.risk,
      (g as any).approvedBy ?? null, (g as any).approvedAt ?? null,
      (g as any).rejectionReason ?? null, g.expires ?? null, null, daysAgo(Math.floor(Math.random() * 5))
    )
  }

  // ─── Cost Events ───────────────────────────────────────────────────────────
  const costCapabilities = ['cap_p2p', 'cap_rev', 'cap_treasury', 'cap_demand', 'cap_ap_ar', 'cap_interco', 'cap_customer_intel']
  const models = ['claude-sonnet-4', 'claude-opus-4', 'claude-haiku-3.5']
  const eventTypes = ['inference', 'tool_call', 'storage', 'api_call']

  for (let day = 0; day < 30; day++) {
    for (const capId of costCapabilities) {
      const numEvents = Math.floor(Math.random() * 5) + 2
      for (let e = 0; e < numEvents; e++) {
        const model = models[Math.floor(Math.random() * models.length)]
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)]
        const tokens = Math.floor(Math.random() * 100000) + 5000
        const costPerToken = model.includes('opus') ? 0.0018 : model.includes('sonnet') ? 0.00045 : 0.000085
        const amountCents = Math.floor(tokens * costPerToken * 100)

        sqlite.prepare(`INSERT OR REPLACE INTO cost_events VALUES (?,?,?,?,?,?,?,?,?)`).run(
          `ce_${nanoid(8)}`, capId, null, eventType, amountCents,
          tokens, model, MONTH, daysAgo(day)
        )
      }
    }
  }

  // ─── Activity Log ──────────────────────────────────────────────────────────
  const activities = [
    { actor: 'agent:demand-forecasting-v2', action: 'FORECAST_GENERATED', resource: 'task', severity: 'info', cap: 'cap_demand', detail: 'Generated 13-week forecast for APAC. MAPE: 8.2%' },
    { actor: 'agent:demand-forecasting-v2', action: 'ANOMALY_DETECTED', resource: 'capability', severity: 'warning', cap: 'cap_demand', detail: 'SKU-8821 demand spike: +340% vs baseline' },
    { actor: 'system', action: 'BUDGET_ALERT_80PCT', resource: 'capability', severity: 'warning', cap: 'cap_demand', detail: 'Monthly budget at 94% utilization' },
    { actor: 'agent:rev-recognition-v2', action: 'RECOGNITION_SCHEDULED', resource: 'task', severity: 'info', cap: 'cap_rev', detail: 'Q2 close initiated: 1,284 contracts queued' },
    { actor: 'agent:procure-to-pay-v3', action: 'PRICE_EXCEPTION_RAISED', resource: 'governance', severity: 'warning', cap: 'cap_p2p', detail: 'INV-48291: 7.3% above contracted rate' },
    { actor: 'agent:ap-ar-v4', action: 'INVOICES_PROCESSED', resource: 'task', severity: 'info', cap: 'cap_ap_ar', detail: '847 invoices auto-processed. STP rate: 99.2%' },
    { actor: 'agent:security-monitor-v1', action: 'SUSPICIOUS_PATTERN', resource: 'governance', severity: 'critical', cap: 'cap_p2p', detail: '14 POs flagged to new vendor — security review triggered' },
    { actor: 'cto@acme.com', action: 'GOVERNANCE_REJECTED', resource: 'governance', severity: 'info', cap: 'cap_p2p', detail: 'False positive confirmed. Emergency pause cancelled.' },
    { actor: 'cto@acme.com', action: 'CAPABILITY_APPROVED', resource: 'capability', severity: 'info', cap: 'cap_hr_ops', detail: 'HR Operations pilot approved: 200 employees' },
    { actor: 'agent:treasury-v2', action: 'HEDGE_EXECUTED', resource: 'task', severity: 'info', cap: 'cap_treasury', detail: 'EUR/USD hedge: $48M notional. Rate: 1.0847' },
    { actor: 'system', action: 'HEARTBEAT_MISSED', resource: 'capability', severity: 'error', cap: 'cap_treasury', detail: 'Treasury agent missed 2 consecutive heartbeats — auto-recovery initiated' },
    { actor: 'agent:treasury-v2', action: 'AGENT_RECOVERED', resource: 'capability', severity: 'info', cap: 'cap_treasury', detail: 'Agent recovered after 3.2min downtime. No data loss.' },
    { actor: 'agent:interco-v2', action: 'IC_ELIMINATION_STARTED', resource: 'task', severity: 'info', cap: 'cap_interco', detail: 'Month-end IC elimination: 23 entities, $184M in scope' },
    { actor: 'agent:customer-intel-v3', action: 'CHURN_ALERT', resource: 'capability', severity: 'warning', cap: 'cap_customer_intel', detail: '12 enterprise accounts elevated to high-risk. NBO triggered.' },
    { actor: 'hemanth.reganti@acme.com', action: 'SCALE_REQUEST_SUBMITTED', resource: 'governance', severity: 'info', cap: 'cap_demand', detail: 'Requested LATAM expansion for Demand Forecasting' },
  ]

  for (let i = 0; i < activities.length; i++) {
    const a = activities[i]
    sqlite.prepare(`INSERT OR REPLACE INTO activity_log VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
      `act_${nanoid(8)}`, COMPANY_ID, a.cap, null, a.actor, a.action,
      a.resource, a.cap, JSON.stringify({ message: a.detail }),
      a.severity, hoursAgo(i * 2 + Math.random() * 3)
    )
  }

  // ─── Migration Mappings ────────────────────────────────────────────────────
  const migrations = [
    {
      legacy: 'SAP MM — Materials Management', tx: 'ME21N / ME22N / ME23N',
      users: 142, cap: 'cap_p2p', status: 'parallel', pct: 68,
      complexity: 'high', estSavings: 8400000, actSavings: 5200000,
      target: '2024-09-30', notes: 'Complex approval hierarchies in parallel validation'
    },
    {
      legacy: 'SAP FI-AA — Revenue Accounting', tx: 'VF44 / VF47 / FARR_REC',
      users: 38, cap: 'cap_rev', status: 'parallel', pct: 85,
      complexity: 'critical', estSavings: 6200000, actSavings: 4800000,
      target: '2024-08-31', notes: 'ASC 606 parallel run exceeding accuracy targets'
    },
    {
      legacy: 'SAP TRM — Treasury & Risk', tx: 'TPM10 / TPM11 / TPM13',
      users: 22, cap: 'cap_treasury', status: 'parallel', pct: 55,
      complexity: 'critical', estSavings: 4800000, actSavings: 2100000,
      target: '2024-10-31', notes: 'Regulatory constraints requiring extended validation'
    },
    {
      legacy: 'SAP IBP — Integrated Business Planning', tx: 'IBP / APO / SNP',
      users: 67, cap: 'cap_demand', status: 'cutover', pct: 92,
      complexity: 'high', estSavings: 9100000, actSavings: 7800000,
      target: '2024-07-15', notes: 'On track for cutover. Legacy decommission scheduled.'
    },
    {
      legacy: 'SAP FI-AP / FI-AR — Payables & Receivables', tx: 'FB60 / FB70 / F110',
      users: 89, cap: 'cap_ap_ar', status: 'migrated', pct: 100,
      complexity: 'medium', estSavings: 5400000, actSavings: 5100000,
      target: '2024-05-31', notes: 'COMPLETED. Legacy decommissioned June 1. $5.1M in realized savings.'
    },
    {
      legacy: 'SAP FI-SL — Special Purpose Ledger / IC', tx: 'F.13 / FBICRC / FRIC',
      users: 31, cap: 'cap_interco', status: 'parallel', pct: 72,
      complexity: 'high', estSavings: 3800000, actSavings: 2400000,
      target: '2024-09-30', notes: 'Multi-entity legal complexity requiring phased approach'
    },
    {
      legacy: 'SAP HCM — Human Capital Management', tx: 'PA40 / PY / PT',
      users: 210, cap: 'cap_hr_ops', status: 'analysis', pct: 12,
      complexity: 'medium', estSavings: 2900000, actSavings: 0,
      target: '2025-01-31', notes: 'Pilot approved. SuccessFactors integration mapping in progress.'
    },
    {
      legacy: 'SAP CRM / C4C — Customer Management', tx: 'CRM2000 / BEA / SDP',
      users: 156, cap: 'cap_customer_intel', status: 'parallel', pct: 61,
      complexity: 'high', estSavings: 7200000, actSavings: 3900000,
      target: '2024-11-30', notes: 'Sales team resistance: change management program initiated'
    },
    {
      legacy: 'SAP EWM — Extended Warehouse Mgmt', tx: 'LT0A / LT21 / MIGO',
      users: 94, cap: null, status: 'legacy', pct: 0,
      complexity: 'high', estSavings: 4100000, actSavings: 0,
      target: '2025-03-31', notes: 'RFP for Warehouse AI capability in progress. No mapping yet.'
    },
  ]

  for (const m of migrations) {
    sqlite.prepare(`INSERT OR REPLACE INTO migration_mappings VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      `mig_${nanoid(8)}`, COMPANY_ID, m.cap ?? null, m.legacy, m.tx,
      m.users, m.status, m.pct, m.complexity,
      m.estSavings, m.actSavings, m.target, m.notes,
      daysAgo(180), daysAgo(Math.floor(Math.random() * 14))
    )
  }

  console.log('✅ Seed complete! ACME Global Industries SAP → Fluid migration scenario loaded.')
}

seed().catch(console.error)
