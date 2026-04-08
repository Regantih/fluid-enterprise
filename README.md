# The Fluid Enterprise — Agent-First ERP

> **The first ERP built on the principles of AlphaGo → AlphaZero → AlphaEvolve.**  
> A self-evolving organizational framework where agents run the enterprise and request human assistance — not the other way around.

---

## The Thesis

Every organization you admire was built to resist change. Stability was the competitive advantage. **That equation just broke.**

The smartest people in your organization are spending more than half their working day *operating software*. Not thinking, not creating, not leading — operating. The average Global 2000 company runs 900+ enterprise applications. Integration costs alone exceed their entire AI investment 3:1.

**The Fluid Enterprise is the operating model for the post-software organization.**

---

## Architecture

### Archon — The Operating System of the Company

At the center is **Archon**, the central orchestrator. Archon receives human intent and translates it into orchestrated action across the agent hierarchy. It doesn't execute. It ensures execution is always aligned to intent.

### Guilds — Living Capability Clusters

Persistent capability teams form around domains:

| Guild | Domain | Responsibility |
|-------|--------|---------------|
| **Finance Guild** | Financial Operations | GL, AP/AR, Treasury, Tax, Compliance |
| **Supply Chain Guild** | Procurement & Logistics | Sourcing, Inventory, Logistics, Supplier Management |
| **Customer Intelligence Guild** | Revenue & Experience | CRM, Analytics, Pricing, Churn Prevention |
| **People & Culture Guild** | Talent & Organization | Workforce Planning, Compensation, Engagement |
| **Engineering Guild** | Platform & Infrastructure | Reliability, Security, DevOps, Technical Debt |

### Agent Hierarchy

- **Archon** — Central orchestrator, intent → action translation
- **Guild Leaders** — Domain authority, delegation, cross-guild coordination
- **Specialists** — Deep domain expertise, persistent capability
- **Task Agents** — Ephemeral, spin up on demand, dissolve when complete
- **Sentinels** — Security, compliance, audit — embedded in every guild

### The Alpha Lineage

Inspired by DeepMind's evolution:

| Phase | Principle | Application |
|-------|-----------|------------|
| **AlphaGo** | Learn from human expertise | Agents trained on domain best practices |
| **AlphaZero** | Self-play, learn from scratch | Agents simulate business scenarios, improve through generations |
| **AlphaEvolve** | Evolutionary optimization | Mutation, selection, crossover of agent policies |
| **AlphaCode** | Generate novel solutions | Agents compose and reconfigure capabilities dynamically |

---

## Core Systems

### EigenTrust Reputation System

Trust is calculated continuously from behavioral history. It cannot be assigned by title or gamed by a single bad actor. An agent that operates cleanly earns autonomy. An agent that deviates loses it instantly.

### Council Protocol

Agents continuously peer-review each other's decisions. A single bad actor — human or machine — cannot operate undetected because every consequential action requires consensus from a rotating peer group.

### Human Sovereignty

When machine confidence drops below a defined threshold, humans are brought back in immediately. Sovereignty is maintained not through policy, but through mathematical triggers that cannot be overridden.

### Skill Library

Composable capabilities that emerge from composing skills on demand. The cost of standing up a new capability is the cost of configuration, not development. When a product line ends, the capability dissolves. The skills return to the library. Nothing is wasted.

---

## Running Locally

```bash
# Clone
git clone https://github.com/Regantih/fluid-enterprise.git
cd fluid-enterprise

# Install
npm install

# Push database schema
npx drizzle-kit push

# Run
npm run dev
```

The app starts at `http://localhost:5000`. The simulation engine begins immediately — agents start making decisions, evolving, and escalating to humans in real time.

---

## Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + Drizzle ORM + SQLite
- **Simulation**: Custom evolution engine with EigenTrust, Council Protocol, and generational fitness tracking
- **Architecture**: Full-stack monorepo with shared schema types

---

## Pages

| Page | Description |
|------|-------------|
| **Command Center** | Real-time KPIs, guild performance, activity feed, decision table |
| **Archon Console** | Submit human intent, watch Archon orchestrate agent response |
| **Guilds** | View all capability teams, their agents, trust scores, and status |
| **Evolution Arena** | Generational fitness tracking, mutations, improvements over time |
| **Trust & Governance** | EigenTrust leaderboard, Council review history, audit trail |
| **Skill Library** | Browse and search composable capabilities by category |
| **Escalation Queue** | Human-in-the-loop decisions — approve, reject, or defer agent actions |

---

## Contributing

This is an open architecture. The organizations that will define the next decade of enterprise infrastructure are making this decision now.

If you're a builder who understands that the ERP era is over and the agent era has begun — the manifesto is waiting.

### Areas for Contribution

- **Supply Chain Deep Module** — First-principles procurement, logistics, and inventory agents
- **Financial Close Automation** — Period-end close orchestrated entirely by agents
- **Real LLM Integration** — Connect Archon to actual language models for intent parsing
- **Edge Inference** — Move agent execution to local hardware
- **Decentralized Identity** — Verifiable agent identity in a decentralized registry
- **Multi-Tenant Architecture** — Support multiple organizations with isolated agent hierarchies

---

## Vision

> *"The next generation of talent you're hiring didn't study for this. Neither did you. We built the ERP era around process automation. It worked. Then we added modularity. It worked. But each layer made the next transformation harder and more expensive to attempt. The system is self-defeating."*

The Fluid Enterprise is not automation layered onto existing structures. It is a fundamentally different operating hierarchy.

**Intent flows from human leadership through Archon into agent teams. Agents operate within the organizational accountability structure — partners with defined roles and responsibility. Traditional org charts dissolve.**

---

## License

MIT — Build freely. Build boldly.

---

*Envisioned by Hemanth Raganti. The future of the enterprise is fluid.*
