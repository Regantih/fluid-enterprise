# Fluid Enterprise

> **AI-Native Enterprise Control Plane** — Replace rigid ERP departments with dynamically composable, governed AI capabilities.

![Fluid Enterprise Dashboard](docs/screenshots/dashboard.png)

---

## What Is This

Fluid Enterprise is an open-source control plane for enterprises transitioning from traditional ERP systems (SAP, Oracle) to **capability-based AI agent orchestration**.

Instead of org charts and rigid modules, enterprises define **Capabilities** — autonomous or supervised AI agents that execute business processes end-to-end — and compose them into cross-functional workflows governed by a human board.

Inspired by [Paperclip](https://github.com/paperclipai/paperclip), designed for enterprise transformation at scale.

---

## The Problem It Solves

| Legacy ERP | Fluid Enterprise |
|---|---|
| Rigid modules (MM, FI, SD) | Dynamic capabilities (Procure-to-Pay, Revenue Recognition) |
| Human operators execute transactions | AI agents execute, humans govern exceptions |
| Static org chart ownership | Capability health scoring + heartbeat monitoring |
| Manual audit trails | Immutable activity log, every action attributed |
| Quarterly budget reviews | Real-time cost per capability, hard budget stops |
| Big-bang migration | Parallel run → cutover → decommission, tracked per module |

---

## Features

### 🎛 Dashboard
- Live KPI row: active capabilities, running tasks, monthly spend, pending approvals
- 30-day spend trend (Recharts area chart)
- Domain spend breakdown (pie chart)
- Capability health grid with budget utilization bars
- Recent activity feed + pending governance approvals

### ⚡ Capability Registry
- Full CRUD for AI capabilities
- Fields: name, description, domain, status, agent_type, monthly budget, SLA target
- Status lifecycle: `dormant → active → scaling → paused`
- Agent types: `autonomous | supervised | hybrid`
- Per-capability budget bars with soft (80%) and hard (100%) alerts
- Heartbeat timestamp, task completion rate, token usage

### 🔀 Composition Engine
- Visual SVG flow diagram showing how capabilities compose into business processes
- Flow types: `sequential | parallel | conditional`
- Hover interactions highlighting connected nodes
- Full composition registry table

### 🛡 Governance Board
- Human-in-the-loop approval queue
- Risk triage: `low | medium | high | critical` — sorted with critical first
- Approval types: budget override, capability activation, emergency pause, scale-up, model upgrade
- One-click approve / reject with mandatory rejection reason
- Full audit trail of all decisions
- Expiry timers on time-sensitive requests

### 💓 Heartbeat Monitor
- Live agent status with 5-second auto-refresh
- SVG heartbeat visualization per capability
- Heartbeat staleness detection (ok < 60s, stale < 5min, missing > 5min)

### 🗺 Migration Planner
- Side-by-side SAP module → Fluid capability mapping
- Migration pipeline swimlane: `legacy → analysis → parallel → cutover → migrated`
- Progress bars per module
- Estimated vs realized savings tracking
- Complexity ratings per module

### 💰 Cost Dashboard
- Daily spend trend (30-day area chart)
- Budget vs spend bar chart by capability
- Utilization table with soft/hard alert indicators
- Domain-level cost breakdown

### 📜 Activity Log
- Immutable audit trail, all events attributed to actor (human, agent, system)
- Severity filtering: info, warning, error, critical
- Monospace terminal aesthetic for density

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router |
| Language | TypeScript |
| Styling | Tailwind CSS + custom design system |
| Components | Radix UI primitives |
| Charts | Recharts |
| Database | SQLite (via better-sqlite3) |
| ORM | Drizzle ORM |
| Icons | Lucide React |
| Fonts | Space Grotesk + IBM Plex Mono |

---

## Data Model

```
companies
  └── capabilities (status, agent_type, budget, heartbeat, tokens)
       ├── capability_compositions (source → target, flow_type)
       ├── tasks (status, cost_cents, token_usage, duration_ms)
       ├── governance_approvals (risk_level, approval_type, expires_at)
       ├── cost_events (amount_cents, token_count, model, month_bucket)
       └── activity_log (actor, action, severity — immutable)
  └── migration_mappings (legacy_module → capability, migration_status, pct)
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### 1. Clone and install

```bash
git clone https://github.com/regantih/fluid-enterprise.git
cd fluid-enterprise
npm install --legacy-peer-deps
```

### 2. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **First load automatically seeds the database** with a full SAP S/4HANA → Fluid migration scenario for ACME Global Industries, including 8 capabilities, 14 tasks, 7 governance requests, 30 days of cost events, and 13 activity log entries.

### 3. Explore

| Route | Page |
|---|---|
| `/dashboard` | Control plane overview |
| `/capabilities` | Capability registry (CRUD) |
| `/composition` | Flow diagram |
| `/governance` | Approval board |
| `/heartbeat` | Live agent monitor |
| `/migration` | SAP → Fluid tracker |
| `/cost` | Spend dashboard |
| `/activity` | Audit log |

---

## Seed Data: ACME Global Industries

The demo seeds a realistic SAP S/4HANA migration scenario:

| SAP Module | Fluid Capability | Status | Migration |
|---|---|---|---|
| SAP MM — Materials Management | Procure-to-Pay | 🟢 Active | 68% parallel |
| SAP FI-AA — Revenue Accounting | Revenue Recognition | 🟢 Active | 85% parallel |
| SAP TRM — Treasury & Risk | Treasury Management | 🟢 Active | 55% parallel |
| SAP IBP — Integrated Business Planning | Demand Forecasting | 🟡 Scaling | 92% cutover |
| SAP FI-AP/AR | AP/AR Automation | 🟢 Active | ✅ Migrated |
| SAP FI-SL — Intercompany Ledger | Intercompany Reconciliation | 🟢 Active | 72% parallel |
| SAP HCM — Human Capital Mgmt | HR Operations | ⚫ Dormant | 12% analysis |
| SAP CRM/C4C | Customer Intelligence | 🟢 Active | 61% parallel |
| SAP EWM — Warehouse Management | *(unmapped)* | — | 0% legacy |

---

## Project Structure

```
fluid-enterprise/
├── app/
│   ├── layout.tsx              # Root shell with sidebar
│   ├── globals.css             # Design system tokens
│   ├── dashboard/page.tsx      # Main dashboard
│   ├── capabilities/page.tsx   # Registry + CRUD
│   ├── composition/page.tsx    # Visual flow engine
│   ├── governance/page.tsx     # Approval board
│   ├── heartbeat/page.tsx      # Live monitor
│   ├── migration/page.tsx      # SAP migration tracker
│   ├── cost/page.tsx           # Spend dashboard
│   ├── activity/page.tsx       # Audit log
│   └── api/
│       ├── seed/route.ts       # Auto-seed on first run
│       ├── dashboard/route.ts  # Aggregated summary
│       ├── capabilities/       # CRUD
│       ├── governance/         # Approve/reject
│       ├── cost-events/        # Spend data
│       ├── activity-log/       # Immutable trail
│       └── migration/          # Module mapping
├── components/
│   └── layout/
│       ├── Sidebar.tsx         # Navigation
│       └── PageHeader.tsx      # Shared page header
├── lib/
│   ├── db/
│   │   ├── schema.ts           # Drizzle table definitions
│   │   ├── index.ts            # SQLite connection + init
│   │   └── seed.ts             # CLI seed script
│   └── utils.ts                # formatCents, timeAgo, statusBg...
├── drizzle.config.ts
├── tailwind.config.ts
└── fluid.db                    # Auto-created SQLite file
```

---

## Design System

**Palette**
```
--fluid-blue:   #00D4FF  — primary actions, active state
--fluid-amber:  #F5A623  — warnings, scaling, pending
--fluid-green:  #00E5A0  — success, active, healthy
--fluid-red:    #FF4757  — errors, critical, over-budget
--fluid-purple: #8B5CF6  — HR domain, model upgrades
```

**Typography**
- Display: `Space Grotesk` — headings, labels, UI copy
- Mono: `IBM Plex Mono` — metrics, timestamps, status codes, audit log

---

## Roadmap

- [ ] Real-time WebSocket heartbeat updates
- [ ] Multi-tenant company switching
- [ ] Capability versioning and rollback
- [ ] Budget forecasting (ML-powered projection)
- [ ] Slack / Teams governance notification integration
- [ ] SAP API connectors for live migration status pull
- [ ] Capability marketplace (community-contributed templates)
- [ ] RBAC — board members, observers, capability owners
- [ ] Export audit log to CSV / PDF

---

## Architecture Philosophy

Fluid Enterprise treats enterprise AI transformation as a **control plane problem**, not an application problem.

The key insight: ERP systems fail to modernize not because of technology, but because they lack a **governance layer** that lets enterprises de-risk the transition. Every SAP module replacement needs:

1. **Parallel validation** — run legacy and AI simultaneously, compare outputs
2. **Capability-level budget governance** — not project budgets, but per-process cost accountability
3. **Immutable audit trail** — regulators and auditors need to see every AI decision attributed
4. **Human-in-the-loop escalation** — agents escalate, humans decide, system enforces

This is what Fluid Enterprise provides.

---

## License

MIT

---

## Author

**Hemanth Reganti**
Chief Technology Architect · Avant-Garde Solutions
Incoming DEng, Space Systems Engineering · Johns Hopkins University
GoingVC Cohort Member

[LinkedIn](https://linkedin.com/in/hemanthreganti) · [GitHub](https://github.com/regantih)

---

*Built with Claude — AI-native tooling for AI-native enterprises.*
