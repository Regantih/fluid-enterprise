import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { seedWorld } from "./seed";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function now(): string {
  return new Date().toISOString();
}

function randBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Simulation ───────────────────────────────────────────────────────────────
function startSimulation(): void {
  // Every 5s: update agent heartbeats
  setInterval(() => {
    const allAgents = storage.getAgents();
    for (const agent of allAgents) {
      if (agent.status !== "offline" && agent.status !== "dissolved") {
        storage.updateAgent(agent.id, { lastHeartbeat: now() });
      }
    }
  }, 5000);

  // Every 10s: generate a few new cost events
  setInterval(() => {
    const caps = storage.getCapabilities();
    if (caps.length === 0) return;

    const eventTypes: string[] = ["compute", "api_call", "data_transfer", "storage"];
    const descriptions: Record<string, string[]> = {
      compute: ["ML inference batch", "Optimization solver run", "Model scoring pass", "Automated reconciliation run"],
      api_call: ["External API call — market data", "Carrier rate quote", "Identity verification call", "FX rate query"],
      data_transfer: ["EDI sync — supplier network", "Telemetry ingest — IoT sensors", "Delta sync — CRM", "Audit log export"],
      storage: ["Snapshot save — model checkpoint", "Transaction archive", "Document vault write", "Audit trail flush"],
    };

    const numEvents = Math.floor(randBetween(1, 4));
    for (let i = 0; i < numEvents; i++) {
      const cap = pick(caps);
      const agents = storage.getAgentsByCapability(cap.id).filter(a => a.status !== "offline");
      const agent = agents.length > 0 ? pick(agents) : undefined;
      const eventType = pick(eventTypes) as string;
      const amount = Math.round(randBetween(5, 200) * 100) / 100;
      const desc = pick(descriptions[eventType] ?? descriptions["compute"]);

      storage.createCostEvent({
        capabilityId: cap.id,
        agentId: agent?.id,
        eventType,
        amount,
        currency: "USD",
        description: desc,
        dayOffset: 0,
        createdAt: now(),
      });

      // Update capability consumed budget
      storage.updateCapability(cap.id, {
        budgetConsumed: (cap.budgetConsumed || 0) + amount,
      });
    }
  }, 10000);

  // Every 8s: occasionally create new activity log entries
  setInterval(() => {
    if (Math.random() > 0.35) return;

    const caps = storage.getCapabilities();
    if (caps.length === 0) return;
    const cap = pick(caps);
    const agents = storage.getAgentsByCapability(cap.id);
    const agent = agents.length > 0 ? pick(agents) : undefined;

    const activityTemplates = [
      {
        eventType: "heartbeat_lost",
        title: `Heartbeat check — ${agent?.name ?? "agent"} nominal`,
        description: `Routine heartbeat verified for ${agent?.name ?? "agent"} in ${cap.name}. All systems nominal.`,
        severity: "info",
      },
      {
        eventType: "task_completed",
        title: `Autonomous task completed — ${cap.name}`,
        description: `${agent?.name ?? "An agent"} completed a scheduled task with no human intervention required.`,
        severity: "success",
      },
      {
        eventType: "budget_alert",
        title: `Cost event logged — ${cap.name}`,
        description: `New cost event recorded in ${cap.name}. Cumulative spend tracking updated.`,
        severity: "info",
      },
      {
        eventType: "evolution_cycle",
        title: `Evolution pulse — ${cap.name} Gen ${cap.generation}`,
        description: `Fitness evaluation completed for ${cap.name}. Current fitness: ${cap.fitnessScore?.toFixed(3)}. Trust index: ${cap.trustScore?.toFixed(3)}.`,
        severity: "info",
      },
    ];

    const template = pick(activityTemplates);
    storage.createActivity({
      capabilityId: cap.id,
      agentId: agent?.id,
      eventType: template.eventType,
      title: template.title,
      description: template.description,
      severity: template.severity,
      metadata: JSON.stringify({ simulatedAt: now() }),
      createdAt: now(),
    });
  }, 8000);

  // Every 15s: occasionally change agent statuses
  setInterval(() => {
    if (Math.random() > 0.3) return;

    const allAgents = storage.getAgents().filter(a => a.status !== "dissolved");
    if (allAgents.length === 0) return;

    const agent = pick(allAgents);
    const statusOptions: string[] = ["online", "online", "online", "busy", "busy", "degraded"];
    const newStatus = pick(statusOptions);

    storage.updateAgent(agent.id, { status: newStatus });
  }, 15000);

  // Every 20s: nudge capability trust & fitness scores very slightly
  setInterval(() => {
    const caps = storage.getCapabilities();
    for (const cap of caps) {
      const trustDelta = (Math.random() - 0.5) * 0.004;
      const newTrust = Math.min(1.0, Math.max(0.5, cap.trustScore + trustDelta));
      const fitnessDelta = (Math.random() - 0.5) * 0.003;
      const newFitness = Math.min(1.0, Math.max(0.3, cap.fitnessScore + fitnessDelta));
      storage.updateCapability(cap.id, {
        trustScore: Math.round(newTrust * 1000) / 1000,
        fitnessScore: Math.round(newFitness * 1000) / 1000,
      });
    }
  }, 20000);

  // Every 60s: EVOLUTION CYCLE
  setInterval(() => {
    const caps = storage.getCapabilities();
    if (caps.length === 0) return;

    // Pick the capability with highest fitness to evolve
    const activeCaps = caps.filter(c => c.status === "active");
    if (activeCaps.length === 0) return;
    const cap = pick(activeCaps);

    const previousFitness = cap.fitnessScore;
    // Diminishing returns — improvement shrinks as fitness approaches 1.0
    const headroom = 1.0 - previousFitness;
    const improvement = headroom * randBetween(0.01, 0.04);
    const newFitness = Math.min(0.99, Math.round((previousFitness + improvement) * 1000) / 1000);
    const newGeneration = cap.generation + 1;

    // Update capability
    storage.updateCapability(cap.id, {
      generation: newGeneration,
      fitnessScore: newFitness,
    });

    // Evolve agents in this capability
    const capAgents = storage.getAgentsByCapability(cap.id);
    let agentsSurvived = 0;
    let agentsEvolved = 0;
    let agentsDissolved = 0;

    for (const agent of capAgents) {
      if (agent.status === "dissolved") continue;

      if (agent.trustScore < 0.6 && Math.random() > 0.7) {
        // Low-trust agents might get dissolved
        storage.updateAgent(agent.id, { status: "dissolved" });
        agentsDissolved++;
      } else {
        // Evolve the agent
        const trustBump = randBetween(0.001, 0.01);
        const newTrust = Math.min(1.0, agent.trustScore + trustBump);
        storage.updateAgent(agent.id, {
          generation: newGeneration,
          trustScore: Math.round(newTrust * 1000) / 1000,
          decisionsHandled: agent.decisionsHandled + Math.floor(randBetween(10, 50)),
        });
        agentsEvolved++;
        agentsSurvived++;
      }
    }

    const mutationPool = [
      "Decision boundary recalibration",
      "Risk appetite optimization",
      "Cross-capability knowledge transfer",
      "Confidence threshold refinement",
      "EigenTrust score propagation",
      "Attention mechanism tuning",
      "Adversarial self-play iteration",
      "Multi-objective reward shaping",
      "Latent feature discovery",
      "Temporal pattern recognition upgrade",
      "Council voting weight adjustment",
      "Exploration-exploitation rebalancing",
    ];

    const improvementPool = [
      "Faster procurement cycle",
      "Reduced false positive rate",
      "Better demand forecast accuracy",
      "Improved anomaly detection sensitivity",
      "Lower cost per autonomous decision",
      "Higher governance precision",
      "Stronger cross-capability correlation",
      "Reduced human escalation rate",
      "Enhanced trust propagation stability",
      "Improved self-play win rate",
    ];

    const selfPlayResults = [
      `${cap.name} agents outperformed previous generation by ${Math.round(improvement * 100)}% in simulated task completion`,
      `Self-play tournament: Gen-${newGeneration} won ${Math.round(50 + improvement * 200)}% of head-to-head matchups against Gen-${newGeneration - 1}`,
      `Adversarial probing found ${Math.floor(randBetween(0, 3))} exploitable decision boundaries — all patched in this generation`,
      `Emergent collaborative behavior detected in multi-agent simulation. Pareto efficiency: ${Math.round((newFitness * 100))}%`,
    ];

    // Pick 2-4 random mutations and improvements
    const numMutations = Math.floor(randBetween(2, 5));
    const mutations: string[] = [];
    for (let i = 0; i < numMutations; i++) {
      const m = pick(mutationPool);
      if (!mutations.includes(m)) mutations.push(m);
    }
    const numImprovements = Math.floor(randBetween(2, 4));
    const improvements: string[] = [];
    for (let i = 0; i < numImprovements; i++) {
      const imp = pick(improvementPool);
      if (!improvements.includes(imp)) improvements.push(imp);
    }

    // Create evolution log entry
    storage.createEvolution({
      generation: newGeneration,
      capabilityId: cap.id,
      fitnessScore: newFitness,
      previousFitness,
      mutations: JSON.stringify(mutations),
      improvements: JSON.stringify(improvements),
      agentsSurvived,
      agentsEvolved,
      agentsDissolved,
      selfPlayResult: pick(selfPlayResults),
      createdAt: now(),
    });

    // Log evolution activity
    storage.createActivity({
      capabilityId: cap.id,
      eventType: "evolution_cycle",
      title: `Evolution cycle complete — ${cap.name} → Gen ${newGeneration}`,
      description: `Fitness: ${previousFitness.toFixed(3)} → ${newFitness.toFixed(3)}. ${agentsEvolved} agents evolved, ${agentsDissolved} dissolved. Self-play validated.`,
      severity: "success",
      metadata: JSON.stringify({
        generation: newGeneration,
        fitnessGain: Math.round((newFitness - previousFitness) * 1000) / 1000,
        agentsEvolved,
        agentsDissolved,
      }),
      createdAt: now(),
    });

    // Create council review for this evolution
    const reviewerNames = capAgents
      .filter(a => a.status !== "dissolved")
      .slice(0, 3)
      .map(a => a.name);

    if (reviewerNames.length >= 2) {
      const votes: Record<string, string> = {};
      let approveCount = 0;
      let rejectCount = 0;
      for (const name of reviewerNames) {
        const vote = Math.random() > 0.15 ? "approve" : "reject";
        votes[name] = vote;
        if (vote === "approve") approveCount++;
        else rejectCount++;
      }

      let consensus: string;
      if (rejectCount === 0) consensus = "unanimous";
      else if (approveCount > rejectCount) consensus = "majority";
      else if (approveCount === rejectCount) consensus = "split";
      else consensus = "deadlock";

      storage.createCouncilReview({
        capabilityId: cap.id,
        triggerEvent: `Generation ${newGeneration} evolution cycle — ${cap.name} fitness improvement review`,
        reviewerAgents: JSON.stringify(reviewerNames),
        votes: JSON.stringify(votes),
        consensus,
        outcome: consensus === "unanimous" || consensus === "majority" ? "approved" : "escalated_to_human",
        createdAt: now(),
      });
    }
  }, 60000);
}

// ─── FastAPI proxy for demo-critical paths ───────────────────────────────────
const FASTAPI = "http://localhost:8000";
async function proxyToFastAPI(path: string, method: string = "GET", body?: any): Promise<any> {
  const opts: any = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${FASTAPI}${path}`, opts);
  if (!res.ok) throw new Error(`FastAPI ${res.status}`);
  return res.json();
}

// ─── Route registration ───────────────────────────────────────────────────────
export function registerRoutes(server: Server, app: Express): void {
  // Seed the world on startup
  seedWorld();
  // Start live simulation
  startSimulation();

  // ═══ DEMO-CRITICAL: proxy to FastAPI/Postgres ═══
  app.get("/api/gaps", async (_req, res) => {
    try { res.json(await proxyToFastAPI("/api/tenants/acme_robotics/gaps")); }
    catch (e: any) { res.status(502).json({ error: e.message }); }
  });
  app.get("/api/gaps/:gapId/signals", async (req, res) => {
    try {
      const gaps = await proxyToFastAPI("/api/tenants/acme_robotics/gaps");
      const gap = gaps.find((g: any) => g.id === req.params.gapId);
      if (!gap) return res.status(404).json({ error: "Gap not found" });
      const sigs = [];
      for (const sid of (gap.evidence_signal_ids || []).slice(0, 12)) {
        try { sigs.push(await proxyToFastAPI(`/api/tenants/acme_robotics/signals/${sid}`)); } catch {}
      }
      res.json({ gap, signals: sigs });
    } catch (e: any) { res.status(502).json({ error: e.message }); }
  });
  app.post("/api/generator/generate", async (req, res) => {
    try { res.json(await proxyToFastAPI("/api/tenants/acme_robotics/generator/generate", "POST", req.body)); }
    catch (e: any) { res.status(502).json({ error: e.message }); }
  });
  app.post("/api/arena/evaluate/:capId", async (req, res) => {
    try { res.json(await proxyToFastAPI(`/api/tenants/acme_robotics/arena/evaluate/${req.params.capId}`, "POST")); }
    catch (e: any) { res.status(502).json({ error: e.message }); }
  });
  app.post("/api/real/capabilities/:capId/transition", async (req, res) => {
    try { res.json(await proxyToFastAPI(`/api/tenants/acme_robotics/capabilities/${req.params.capId}/transition`, "POST", req.body)); }
    catch (e: any) { res.status(502).json({ error: e.message }); }
  });
  app.get("/api/real/capabilities", async (_req, res) => {
    try { res.json(await proxyToFastAPI("/api/tenants/acme_robotics/capabilities")); }
    catch (e: any) { res.status(502).json({ error: e.message }); }
  });
  app.get("/api/real/dashboard", async (_req, res) => {
    try { res.json(await proxyToFastAPI("/api/tenants/acme_robotics/dashboard")); }
    catch (e: any) { res.status(502).json({ error: e.message }); }
  });
  app.post("/api/demo/full-reset", async (_req, res) => {
    try { res.json(await proxyToFastAPI("/api/demo/full-reset", "POST")); }
    catch (e: any) { res.status(502).json({ error: e.message }); }
  });

  // ═══ SIMULATION ROUTES (all other pages) ═══

  // ── GET /api/dashboard (merges simulation + real Postgres data) ───────────
  app.get("/api/dashboard", async (_req, res) => {
    // Try to enrich with real Postgres data for the generation counter
    let realGeneration = 0;
    let realGapCount = 0;
    let realCapCount = 0;
    try {
      const rd = await proxyToFastAPI("/api/tenants/acme_robotics/dashboard");
      realGeneration = rd.generation || 0;
      realGapCount = rd.gaps_open || 0;
      realCapCount = rd.capabilities?.count || 0;
    } catch { /* fallback to simulation data */ }
    const allCaps = storage.getCapabilities();
    const allAgents = storage.getAgents();
    const pendingGov = storage.getPendingGovernance();
    const recentActivity = storage.getActivity(10);
    const costTrend = storage.getDailyTotals(30);
    const evolutionHistory = storage.getEvolutionHistory(1);
    const latestEvolution = evolutionHistory.length > 0 ? evolutionHistory[0] : null;

    // Capabilities enriched with agent count
    const capsWithAgentCount = allCaps.map(cap => {
      const capAgents = allAgents.filter(a => a.capabilityId === cap.id);
      return { ...cap, agentCount: capAgents.length };
    });

    // Agent summary
    const activeAgents = allAgents.filter(a => a.status !== "dissolved" && a.status !== "offline");
    const byStatus = allAgents.reduce<Record<string, number>>((acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1;
      return acc;
    }, {});
    const byRole = allAgents.reduce<Record<string, number>>((acc, a) => {
      acc[a.role] = (acc[a.role] ?? 0) + 1;
      return acc;
    }, {});

    // KPIs — including evolution metrics
    const totalBudget = allCaps.reduce((s, c) => s + c.budgetAllocated, 0);
    const totalConsumed = allCaps.reduce((s, c) => s + c.budgetConsumed, 0);
    const totalLimit = allCaps.reduce((s, c) => s + c.budgetLimit, 0);
    const avgAutomation =
      allCaps.length > 0
        ? allCaps.reduce((s, c) => s + c.automationRate, 0) / allCaps.length
        : 0;
    const avgTrust =
      allCaps.length > 0
        ? allCaps.reduce((s, c) => s + c.trustScore, 0) / allCaps.length
        : 0;
    const avgFitness =
      allCaps.length > 0
        ? allCaps.reduce((s, c) => s + c.fitnessScore, 0) / allCaps.length
        : 0;
    const maxGeneration = allCaps.length > 0
      ? Math.max(...allCaps.map(c => c.generation))
      : 0;

    res.json({
      capabilities: capsWithAgentCount,
      agentSummary: {
        total: allAgents.length,
        active: activeAgents.length,
        byStatus,
        byRole,
      },
      kpis: {
        totalBudget,
        totalConsumed,
        totalLimit,
        budgetUtilization: totalBudget > 0 ? totalConsumed / totalBudget : 0,
        automationRateAvg: Math.round(avgAutomation * 1000) / 1000,
        activeAgents: activeAgents.length,
        pendingGovernance: pendingGov.length,
        trustIndexAvg: Math.round(avgTrust * 1000) / 1000,
        systemFitness: Math.round(avgFitness * 1000) / 1000,
        evolutionGeneration: Math.max(maxGeneration, realGeneration),
      },
      recentActivity,
      costTrend,
      latestEvolution,
      // Real Postgres data for demo path
      realData: {
        generation: realGeneration,
        gapsOpen: realGapCount,
        capabilitiesGenerated: realCapCount,
      },
    });
  });

  // ── GET /api/capabilities ──────────────────────────────────────────────────
  app.get("/api/capabilities", (_req, res) => {
    const caps = storage.getCapabilities();
    res.json(caps);
  });

  // ── GET /api/capabilities/:id ──────────────────────────────────────────────
  app.get("/api/capabilities/:id", (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });

    const cap = storage.getCapabilityById(id);
    if (!cap) return res.status(404).json({ message: "Capability not found" });

    const capAgents = storage.getAgentsByCapability(id);
    const capTasks = storage.getTasksByCapability(id);

    res.json({ ...cap, agents: capAgents, tasks: capTasks });
  });

  // ── POST /api/capabilities ─────────────────────────────────────────────────
  app.post("/api/capabilities", (req, res) => {
    const body = req.body;
    if (!body.name || !body.domain || !body.description) {
      return res.status(400).json({ message: "name, domain, description required" });
    }
    const ts = now();
    const cap = storage.createCapability({
      name: body.name,
      domain: body.domain,
      description: body.description,
      status: body.status ?? "proposed",
      agentCount: 0,
      generation: body.generation ?? 1,
      fitnessScore: body.fitnessScore ?? 0.5,
      trustScore: body.trustScore ?? 0.5,
      budgetAllocated: body.budgetAllocated ?? 0,
      budgetConsumed: 0,
      budgetLimit: body.budgetLimit ?? 100000,
      automationRate: body.automationRate ?? 0,
      createdAt: ts,
      updatedAt: ts,
    });
    res.status(201).json(cap);
  });

  // ── PATCH /api/capabilities/:id ────────────────────────────────────────────
  app.patch("/api/capabilities/:id", (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });

    const updated = storage.updateCapability(id, req.body);
    if (!updated) return res.status(404).json({ message: "Capability not found" });
    res.json(updated);
  });

  // ── GET /api/agents ────────────────────────────────────────────────────────
  app.get("/api/agents", (_req, res) => {
    const allAgents = storage.getAgents();
    res.json(allAgents);
  });

  // ── GET /api/agents/:id ────────────────────────────────────────────────────
  app.get("/api/agents/:id", (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });

    const agent = storage.getAgentById(id);
    if (!agent) return res.status(404).json({ message: "Agent not found" });

    const agentTasks = storage.getTasks().filter(t => t.agentId === id);
    res.json({ ...agent, tasks: agentTasks });
  });

  // ── GET /api/tasks ─────────────────────────────────────────────────────────
  app.get("/api/tasks", (_req, res) => {
    const allTasks = storage.getTasks();
    res.json(allTasks);
  });

  // ── GET /api/governance ────────────────────────────────────────────────────
  app.get("/api/governance", (_req, res) => {
    const all = storage.getGovernance();
    res.json(all);
  });

  // ── GET /api/governance/pending ────────────────────────────────────────────
  app.get("/api/governance/pending", (_req, res) => {
    const pending = storage.getPendingGovernance();
    res.json(pending);
  });

  // ── POST /api/governance/:id/resolve ──────────────────────────────────────
  app.post("/api/governance/:id/resolve", (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });

    const { status, response, reviewedBy } = req.body;
    if (!status || !["approved", "rejected", "deferred"].includes(status)) {
      return res.status(400).json({ message: "status must be approved, rejected, or deferred" });
    }

    const updated = storage.updateGovernance(id, {
      status,
      humanResponse: response ?? null,
      reviewedBy: reviewedBy ?? null,
      resolvedAt: now(),
    });
    if (!updated) return res.status(404).json({ message: "Governance item not found" });

    // Log the resolution
    storage.createActivity({
      capabilityId: updated.capabilityId,
      agentId: updated.agentId ?? undefined,
      eventType: "governance_requested",
      title: `Governance resolved: ${updated.title}`,
      description: `Status: ${status}. Reviewed by: ${reviewedBy ?? "unknown"}.`,
      severity: status === "approved" ? "success" : status === "rejected" ? "warning" : "info",
      metadata: JSON.stringify({ governanceId: id, status, reviewedBy }),
      createdAt: now(),
    });

    res.json(updated);
  });

  // ── GET /api/costs ─────────────────────────────────────────────────────────
  app.get("/api/costs", (_req, res) => {
    const costs = storage.getCostEvents();
    res.json(costs);
  });

  // ── GET /api/costs/daily ───────────────────────────────────────────────────
  app.get("/api/costs/daily", (req, res) => {
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
    const totals = storage.getDailyTotals(days);
    res.json(totals);
  });

  // ── GET /api/activity ──────────────────────────────────────────────────────
  app.get("/api/activity", (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const activity = storage.getActivity(limit);
    res.json(activity);
  });

  // ── GET /api/migration ─────────────────────────────────────────────────────
  app.get("/api/migration", (_req, res) => {
    const migrations = storage.getMigrations();
    res.json(migrations);
  });

  // ── GET /api/composition ───────────────────────────────────────────────────
  app.get("/api/composition", (_req, res) => {
    const links = storage.getCompositionLinks();
    res.json(links);
  });

  // ── GET /api/heartbeat ─────────────────────────────────────────────────────
  app.get("/api/heartbeat", (_req, res) => {
    const allAgents = storage.getAgents();
    res.json(allAgents);
  });

  // ── GET /api/evolution ─────────────────────────────────────────────────────
  app.get("/api/evolution", (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const history = storage.getEvolutionHistory(limit);
    res.json(history);
  });

  // ── GET /api/council ───────────────────────────────────────────────────────
  app.get("/api/council", (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const reviews = storage.getCouncilReviews(limit);
    res.json(reviews);
  });
}
