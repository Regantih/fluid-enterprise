import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { companies, capabilities, capabilityCompositions, tasks, governanceApprovals, costEvents, activityLog, migrationMappings } from '@/lib/db/schema'
import { nanoid } from 'nanoid'

const COMPANY_ID = 'comp_acme_global'

function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString()
}
function hoursAgo(n: number) {
  const d = new Date(); d.setHours(d.getHours() - n); return d.toISOString()
}
function minutesAgo(n: number) {
  const d = new Date(); d.setMinutes(d.getMinutes() - n); return d.toISOString()
}

export async function POST() {
  try {
    const db = getDb()
    const MONTH = new Date().toISOString().slice(0, 7)

    // Check if already seeded
    const existing = db.select().from(companies).where((t: any, { eq }: any) => eq(t.id, COMPANY_ID)).all()
    if (existing.length > 0) {
      return NextResponse.json({ message: 'Already seeded', skipped: true })
    }

    // Company
    db.insert(companies).values({
      id: COMPANY_ID, name: 'ACME Global Industries',
      industry: 'Manufacturing & Distribution', erp_system: 'SAP S/4HANA 2023',
      migration_phase: 'parallel', created_at: daysAgo(180),
    }).run()

    // Capabilities
    const caps = [
      { id: 'cap_p2p', name: 'Procure-to-Pay', domain: 'Supply Chain', description: 'End-to-end procurement: requisition → PO → GR → invoice → payment. Handles multi-currency, multi-vendor, and 3-way match automation.', status: 'active', agent_type: 'hybrid', budget: 420000, spent: 318500, sla: 8000, hb: minutesAgo(3), tokens: 2840000, done: 847, fail: 12 },
      { id: 'cap_rev', name: 'Revenue Recognition', domain: 'Finance', description: 'ASC 606 / IFRS 15 compliant revenue recognition. Automates performance obligation identification, transaction price allocation, and scheduling.', status: 'active', agent_type: 'supervised', budget: 380000, spent: 290200, sla: 12000, hb: minutesAgo(7), tokens: 1920000, done: 412, fail: 3 },
      { id: 'cap_treasury', name: 'Treasury Management', domain: 'Finance', description: 'Cash position forecasting, FX exposure management, investment portfolio optimization. Real-time liquidity across 14 banking APIs.', status: 'active', agent_type: 'supervised', budget: 290000, spent: 198000, sla: 15000, hb: minutesAgo(12), tokens: 1450000, done: 290, fail: 8 },
      { id: 'cap_demand', name: 'Demand Forecasting', domain: 'Supply Chain', description: 'ML-powered demand sensing using 47 external signals. Generates 13-week rolling forecasts with uncertainty bands.', status: 'scaling', agent_type: 'autonomous', budget: 520000, spent: 489000, sla: 30000, hb: minutesAgo(1), tokens: 4200000, done: 1240, fail: 45 },
      { id: 'cap_ap_ar', name: 'AP/AR Automation', domain: 'Finance', description: 'Intelligent invoice processing with OCR, duplicate detection, and payment optimization. 99.2% STP rate.', status: 'active', agent_type: 'autonomous', budget: 310000, spent: 245000, sla: 5000, hb: minutesAgo(2), tokens: 3100000, done: 3420, fail: 28 },
      { id: 'cap_interco', name: 'Intercompany Reconciliation', domain: 'Finance', description: 'Automated elimination of intercompany transactions across 23 legal entities. Netting, matching, and dispute resolution.', status: 'active', agent_type: 'hybrid', budget: 240000, spent: 187000, sla: 20000, hb: minutesAgo(8), tokens: 980000, done: 178, fail: 5 },
      { id: 'cap_hr_ops', name: 'HR Operations', domain: 'HR', description: 'Automated onboarding workflows, payroll pre-processing, benefits enrollment, and compliance reporting.', status: 'dormant', agent_type: 'hybrid', budget: 180000, spent: 0, sla: 10000, hb: null, tokens: 0, done: 0, fail: 0 },
      { id: 'cap_customer_intel', name: 'Customer Intelligence', domain: 'Revenue', description: 'Real-time customer health scoring, churn prediction, upsell opportunity identification. Powers next-best-action for sales.', status: 'active', agent_type: 'autonomous', budget: 350000, spent: 278000, sla: 3000, hb: minutesAgo(5), tokens: 5600000, done: 892, fail: 19 },
    ]
    for (const c of caps) {
      db.insert(capabilities).values({ id: c.id, company_id: COMPANY_ID, name: c.name, description: c.description, domain: c.domain, status: c.status as any, agent_type: c.agent_type, budget_monthly_cents: c.budget, spent_monthly_cents: c.spent, sla_target_ms: c.sla, last_heartbeat: c.hb, token_usage_month: c.tokens, tasks_completed: c.done, tasks_failed: c.fail, created_at: daysAgo(90), updated_at: daysAgo(1) }).run()
    }

    // Compositions
    const comps = [
      { src: 'cap_demand', tgt: 'cap_p2p', name: 'Demand-Driven Procurement', flow: 'sequential' },
      { src: 'cap_p2p', tgt: 'cap_ap_ar', name: 'PO → Invoice Processing', flow: 'sequential' },
      { src: 'cap_ap_ar', tgt: 'cap_treasury', name: 'Payment → Cash Position', flow: 'sequential' },
      { src: 'cap_ap_ar', tgt: 'cap_interco', name: 'IC Invoice Elimination', flow: 'conditional' },
      { src: 'cap_customer_intel', tgt: 'cap_rev', name: 'Order → Revenue Event', flow: 'sequential' },
      { src: 'cap_rev', tgt: 'cap_interco', name: 'Cross-Entity Rev Allocation', flow: 'conditional' },
      { src: 'cap_treasury', tgt: 'cap_interco', name: 'IC Netting Settlement', flow: 'parallel' },
    ]
    for (const c of comps) {
      db.insert(capabilityCompositions).values({ id: `comp_${nanoid(8)}`, company_id: COMPANY_ID, name: c.name, source_capability_id: c.src, target_capability_id: c.tgt, flow_type: c.flow as any, created_at: daysAgo(60) }).run()
    }

    // Tasks
    const taskDefs = [
      { cap: 'cap_p2p', title: 'Process vendor invoices batch #4821', status: 'completed', priority: 'normal', cost: 380, tokens: 42000, dur: 3200 },
      { cap: 'cap_p2p', title: 'Validate 3-way match: PO-4729 / GR-8821', status: 'completed', priority: 'high', cost: 120, tokens: 14000, dur: 890 },
      { cap: 'cap_p2p', title: 'Exception: Vendor Mitsubishi - price deviation >5%', status: 'awaiting_approval', priority: 'high', cost: 0, tokens: 8000, dur: null },
      { cap: 'cap_rev', title: 'Q2 ASC 606 close: 1,284 contracts', status: 'running', priority: 'critical', cost: 890, tokens: 98000, dur: null },
      { cap: 'cap_rev', title: 'Restate rev recognition: Contract CN-4492', status: 'completed', priority: 'high', cost: 240, tokens: 27000, dur: 4100 },
      { cap: 'cap_treasury', title: 'FX hedging optimization: EUR/USD exposure', status: 'completed', priority: 'normal', cost: 190, tokens: 21000, dur: 6200 },
      { cap: 'cap_treasury', title: 'Cash concentration sweep: 8 entities', status: 'running', priority: 'normal', cost: 0, tokens: 12000, dur: null },
      { cap: 'cap_demand', title: 'Week 28 forecast: APAC region', status: 'completed', priority: 'normal', cost: 540, tokens: 61000, dur: 28400 },
      { cap: 'cap_demand', title: 'Anomaly: SKU-8821 demand spike +340%', status: 'awaiting_approval', priority: 'critical', cost: 0, tokens: 18000, dur: null },
      { cap: 'cap_ap_ar', title: 'Auto-process 847 invoices under $10K', status: 'completed', priority: 'normal', cost: 210, tokens: 24000, dur: 2100 },
      { cap: 'cap_ap_ar', title: 'Delinquent AR: 142 accounts >60 days', status: 'running', priority: 'high', cost: 0, tokens: 31000, dur: null },
      { cap: 'cap_interco', title: 'Month-end IC elimination: June 2024', status: 'running', priority: 'critical', cost: 0, tokens: 44000, dur: null },
      { cap: 'cap_customer_intel', title: 'Weekly churn scoring: Enterprise segment', status: 'completed', priority: 'normal', cost: 320, tokens: 38000, dur: 4200 },
      { cap: 'cap_customer_intel', title: 'NBO generation: Q3 renewal pipeline', status: 'running', priority: 'high', cost: 0, tokens: 52000, dur: null },
    ]
    const taskIds: string[] = []
    for (const t of taskDefs) {
      const tid = `task_${nanoid(8)}`
      taskIds.push(tid)
      db.insert(tasks).values({ id: tid, capability_id: t.cap, title: t.title, status: t.status as any, priority: t.priority as any, started_at: t.status !== 'pending' ? hoursAgo(Math.random() * 24 + 1) : null, completed_at: t.status === 'completed' ? hoursAgo(Math.random() * 12) : null, duration_ms: t.dur ?? null, cost_cents: t.cost, token_usage: t.tokens, created_at: daysAgo(Math.floor(Math.random() * 7)) }).run()
    }

    // Governance
    const govItems = [
      { cap: 'cap_demand', type: 'budget_override', title: 'Demand Surge: Emergency Procurement Authorization', desc: 'SKU-8821 demand spike +340% requires $48,000 budget override. Revenue at risk: $2.1M if not actioned within 6h.', risk: 'high', by: 'agent:demand-forecasting-v2', status: 'pending', exp: hoursAgo(-4) },
      { cap: 'cap_p2p', type: 'budget_override', title: 'Vendor Price Exception: Mitsubishi Materials', desc: 'Invoice INV-48291 shows 7.3% price deviation above contracted rate. Requires approval or renegotiation trigger.', risk: 'medium', by: 'agent:procure-to-pay-v3', status: 'pending', exp: hoursAgo(-24) },
      { cap: 'cap_demand', type: 'scale_up', title: 'Scale Demand Forecasting: LATAM Expansion', desc: 'Extend coverage to 3 new LATAM markets. Additional cost: $12,400/month. Projected accuracy gain: +8.2%.', risk: 'low', by: 'hemanth.reganti@acme.com', status: 'pending', exp: hoursAgo(-72) },
      { cap: 'cap_treasury', type: 'model_upgrade', title: 'Treasury: Upgrade to Claude Opus 4 for FX Modeling', desc: 'Expected 34% improvement in hedge effectiveness. Additional cost: $4,200/month.', risk: 'medium', by: 'agent:treasury-v2', status: 'pending', exp: hoursAgo(-48) },
      { cap: 'cap_ap_ar', type: 'capability_activation', title: 'Autonomous AR Collections: Enable Full Automation', desc: 'Authorize autonomous collections for accounts >90 days delinquent. High-risk: legal exposure if incorrect.', risk: 'critical', by: 'agent:ap-ar-v4', status: 'pending', exp: hoursAgo(-120) },
      { cap: 'cap_hr_ops', type: 'capability_activation', title: 'Activate HR Operations: 200-Person Pilot', desc: 'Parallel validation complete. Requesting activation for onboarding and benefits enrollment pilot.', risk: 'medium', by: 'hemanth.reganti@acme.com', status: 'approved', exp: null },
      { cap: 'cap_p2p', type: 'emergency_pause', title: 'P2P: Suspicious Transaction Pattern', desc: '14 POs to new vendor with unusual payment terms. Temporary pause requested pending security review.', risk: 'critical', by: 'agent:security-monitor-v1', status: 'rejected', exp: null },
    ]
    for (const g of govItems) {
      db.insert(governanceApprovals).values({ id: `gov_${nanoid(8)}`, company_id: COMPANY_ID, capability_id: g.cap, approval_type: g.type, title: g.title, description: g.desc, requested_by: g.by, status: g.status as any, risk_level: g.risk as any, expires_at: g.exp ?? null, created_at: daysAgo(Math.floor(Math.random() * 5)) }).run()
    }

    // Cost events (30 days)
    const capIds = ['cap_p2p', 'cap_rev', 'cap_treasury', 'cap_demand', 'cap_ap_ar', 'cap_interco', 'cap_customer_intel']
    const models = ['claude-sonnet-4', 'claude-opus-4', 'claude-haiku-3.5']
    for (let day = 0; day < 30; day++) {
      for (const capId of capIds) {
        for (let e = 0; e < Math.floor(Math.random() * 5) + 2; e++) {
          const model = models[Math.floor(Math.random() * models.length)]
          const tokens = Math.floor(Math.random() * 100000) + 5000
          const rate = model.includes('opus') ? 0.0018 : model.includes('sonnet') ? 0.00045 : 0.000085
          const d = new Date(); d.setDate(d.getDate() - day)
          db.insert(costEvents).values({ id: `ce_${nanoid(8)}`, capability_id: capId, event_type: ['inference','tool_call','storage','api_call'][Math.floor(Math.random()*4)], amount_cents: Math.floor(tokens * rate * 100), token_count: tokens, model, month_bucket: MONTH, created_at: d.toISOString() }).run()
        }
      }
    }

    // Activity Log
    const activities = [
      { actor: 'agent:demand-v2', action: 'FORECAST_GENERATED', cap: 'cap_demand', sev: 'info', msg: 'Generated 13-week forecast for APAC. MAPE: 8.2%' },
      { actor: 'agent:demand-v2', action: 'ANOMALY_DETECTED', cap: 'cap_demand', sev: 'warning', msg: 'SKU-8821 demand spike: +340% vs baseline' },
      { actor: 'system', action: 'BUDGET_ALERT_80PCT', cap: 'cap_demand', sev: 'warning', msg: 'Monthly budget at 94% utilization' },
      { actor: 'agent:rev-v2', action: 'RECOGNITION_SCHEDULED', cap: 'cap_rev', sev: 'info', msg: 'Q2 close: 1,284 contracts queued' },
      { actor: 'agent:p2p-v3', action: 'PRICE_EXCEPTION_RAISED', cap: 'cap_p2p', sev: 'warning', msg: 'INV-48291: 7.3% above contracted rate' },
      { actor: 'agent:ap-ar-v4', action: 'INVOICES_PROCESSED', cap: 'cap_ap_ar', sev: 'info', msg: '847 invoices auto-processed. STP rate: 99.2%' },
      { actor: 'agent:security-v1', action: 'SUSPICIOUS_PATTERN', cap: 'cap_p2p', sev: 'critical', msg: '14 POs flagged — security review triggered' },
      { actor: 'cto@acme.com', action: 'GOVERNANCE_REJECTED', cap: 'cap_p2p', sev: 'info', msg: 'False positive confirmed. Pause cancelled.' },
      { actor: 'cto@acme.com', action: 'CAPABILITY_APPROVED', cap: 'cap_hr_ops', sev: 'info', msg: 'HR Ops pilot approved: 200 employees' },
      { actor: 'agent:treasury-v2', action: 'HEDGE_EXECUTED', cap: 'cap_treasury', sev: 'info', msg: 'EUR/USD hedge: $48M notional at 1.0847' },
      { actor: 'system', action: 'HEARTBEAT_MISSED', cap: 'cap_treasury', sev: 'error', msg: '2 missed heartbeats — auto-recovery initiated' },
      { actor: 'agent:interco-v2', action: 'IC_ELIMINATION_STARTED', cap: 'cap_interco', sev: 'info', msg: 'Month-end: 23 entities, $184M in scope' },
      { actor: 'agent:customer-v3', action: 'CHURN_ALERT', cap: 'cap_customer_intel', sev: 'warning', msg: '12 enterprise accounts elevated to high-risk' },
    ]
    for (let i = 0; i < activities.length; i++) {
      const a = activities[i]
      db.insert(activityLog).values({ id: `act_${nanoid(8)}`, company_id: COMPANY_ID, capability_id: a.cap, actor: a.actor, action: a.action, resource_type: 'capability', resource_id: a.cap, details: JSON.stringify({ message: a.msg }), severity: a.sev as any, created_at: hoursAgo(i * 2 + 1) }).run()
    }

    // Migration mappings
    const migrations = [
      { legacy: 'SAP MM — Materials Management', tx: 'ME21N/ME22N', users: 142, cap: 'cap_p2p', status: 'parallel', pct: 68, complexity: 'high', est: 8400000, act: 5200000, target: '2024-09-30' },
      { legacy: 'SAP FI-AA — Revenue Accounting', tx: 'VF44/FARR_REC', users: 38, cap: 'cap_rev', status: 'parallel', pct: 85, complexity: 'critical', est: 6200000, act: 4800000, target: '2024-08-31' },
      { legacy: 'SAP TRM — Treasury & Risk', tx: 'TPM10/TPM11', users: 22, cap: 'cap_treasury', status: 'parallel', pct: 55, complexity: 'critical', est: 4800000, act: 2100000, target: '2024-10-31' },
      { legacy: 'SAP IBP — Integrated Business Planning', tx: 'IBP/APO/SNP', users: 67, cap: 'cap_demand', status: 'cutover', pct: 92, complexity: 'high', est: 9100000, act: 7800000, target: '2024-07-15' },
      { legacy: 'SAP FI-AP/AR — Payables & Receivables', tx: 'FB60/FB70/F110', users: 89, cap: 'cap_ap_ar', status: 'migrated', pct: 100, complexity: 'medium', est: 5400000, act: 5100000, target: '2024-05-31' },
      { legacy: 'SAP FI-SL — Intercompany Ledger', tx: 'F.13/FBICRC', users: 31, cap: 'cap_interco', status: 'parallel', pct: 72, complexity: 'high', est: 3800000, act: 2400000, target: '2024-09-30' },
      { legacy: 'SAP HCM — Human Capital Mgmt', tx: 'PA40/PY/PT', users: 210, cap: 'cap_hr_ops', status: 'analysis', pct: 12, complexity: 'medium', est: 2900000, act: 0, target: '2025-01-31' },
      { legacy: 'SAP CRM/C4C — Customer Mgmt', tx: 'CRM2000/BEA', users: 156, cap: 'cap_customer_intel', status: 'parallel', pct: 61, complexity: 'high', est: 7200000, act: 3900000, target: '2024-11-30' },
      { legacy: 'SAP EWM — Warehouse Management', tx: 'LT0A/LT21', users: 94, cap: null, status: 'legacy', pct: 0, complexity: 'high', est: 4100000, act: 0, target: '2025-03-31' },
    ]
    for (const m of migrations) {
      db.insert(migrationMappings).values({ id: `mig_${nanoid(8)}`, company_id: COMPANY_ID, capability_id: m.cap ?? null, legacy_module: m.legacy, legacy_transaction: m.tx, legacy_users: m.users, migration_status: m.status as any, migration_pct: m.pct, complexity: m.complexity as any, estimated_savings_cents: m.est, actual_savings_cents: m.act, target_date: m.target, created_at: daysAgo(180), updated_at: daysAgo(7) }).run()
    }

    return NextResponse.json({ success: true, message: 'ACME Global Industries seeded successfully' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
