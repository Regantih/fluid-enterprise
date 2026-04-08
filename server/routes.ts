import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { seedWorld, startSimulation } from "./simulation";
import { insertIntentSchema, insertEscalationSchema } from "@shared/schema";

export function registerRoutes(server: Server, app: Express): void {
  // Initialize the world on first request
  seedWorld();
  startSimulation();

  // ─── Dashboard overview ───
  app.get("/api/dashboard", (_req, res) => {
    const agents = storage.getAgents().filter(a => a.status !== "dissolved");
    const guilds = storage.getGuilds();
    const metrics = storage.getLatestMetrics();
    const recentActivity = storage.getActivity(20);
    const pendingEscalations = storage.getPendingEscalations();
    const latestEvolution = storage.getEvolutionHistory(1)[0];
    const recentDecisions = storage.getDecisions(10);

    res.json({
      agents: { total: agents.length, byType: countBy(agents, "type"), byStatus: countBy(agents, "status") },
      guilds: guilds.map(g => ({
        ...g,
        agents: storage.getAgentsByGuild(g.id).filter(a => a.status !== "dissolved").length,
      })),
      metrics,
      recentActivity,
      pendingEscalations: pendingEscalations.length,
      latestEvolution,
      recentDecisions,
    });
  });

  // ─── Guilds ───
  app.get("/api/guilds", (_req, res) => {
    const guilds = storage.getGuilds();
    const result = guilds.map(g => ({
      ...g,
      agents: storage.getAgentsByGuild(g.id).filter(a => a.status !== "dissolved"),
    }));
    res.json(result);
  });

  app.get("/api/guilds/:id", (req, res) => {
    const guild = storage.getGuild(Number(req.params.id));
    if (!guild) return res.status(404).json({ error: "Guild not found" });
    const agents = storage.getAgentsByGuild(guild.id);
    const decisions = storage.getDecisions(50).filter(d => d.guildId === guild.id);
    res.json({ ...guild, agents, decisions });
  });

  // ─── Agents ───
  app.get("/api/agents", (_req, res) => {
    const agents = storage.getAgents();
    res.json(agents);
  });

  app.get("/api/agents/:id", (req, res) => {
    const agent = storage.getAgent(Number(req.params.id));
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    const agentDecisions = storage.getDecisionsByAgent(agent.id);
    res.json({ ...agent, decisions: agentDecisions });
  });

  // ─── Decisions ───
  app.get("/api/decisions", (req, res) => {
    const limit = Number(req.query.limit) || 50;
    res.json(storage.getDecisions(limit));
  });

  // ─── Skills ───
  app.get("/api/skills", (_req, res) => {
    res.json(storage.getSkills());
  });

  // ─── Escalations ───
  app.get("/api/escalations", (_req, res) => {
    res.json(storage.getEscalations());
  });

  app.get("/api/escalations/pending", (_req, res) => {
    res.json(storage.getPendingEscalations());
  });

  app.post("/api/escalations/:id/resolve", (req, res) => {
    const id = Number(req.params.id);
    const { status, response } = req.body;
    if (!["approved", "rejected", "deferred"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const updated = storage.updateEscalation(id, {
      status,
      humanResponse: response || null,
      resolvedAt: new Date().toISOString(),
    });
    if (!updated) return res.status(404).json({ error: "Escalation not found" });

    // Log the human decision
    storage.createActivity({
      agentId: updated.agentId,
      guildId: null,
      eventType: "escalation",
      title: `Human ${status}: Escalation #${id}`,
      description: response || `Escalation ${status} by human operator`,
      metadata: JSON.stringify({ escalationId: id, status }),
      severity: status === "approved" ? "success" : status === "rejected" ? "warning" : "info",
      createdAt: new Date().toISOString(),
    });

    res.json(updated);
  });

  // ─── Evolution ───
  app.get("/api/evolution", (req, res) => {
    const limit = Number(req.query.limit) || 30;
    res.json(storage.getEvolutionHistory(limit));
  });

  // ─── Council Reviews ───
  app.get("/api/council", (req, res) => {
    const limit = Number(req.query.limit) || 20;
    res.json(storage.getCouncilReviews(limit));
  });

  // ─── Intents (Archon Console) ───
  app.get("/api/intents", (req, res) => {
    const limit = Number(req.query.limit) || 20;
    res.json(storage.getIntents(limit));
  });

  app.post("/api/intents", (req, res) => {
    const parsed = insertIntentSchema.safeParse({
      ...req.body,
      status: "processing",
      progress: 0,
      createdAt: new Date().toISOString(),
    });
    if (!parsed.success) return res.status(400).json({ error: parsed.error });

    const intent = storage.createIntent(parsed.data);

    // Simulate Archon processing
    storage.createActivity({
      agentId: 1, // Archon
      guildId: null,
      eventType: "intent_received",
      title: "ARCHON received intent",
      description: `Processing: "${intent.humanText}"`,
      metadata: JSON.stringify({ intentId: intent.id }),
      severity: "info",
      createdAt: new Date().toISOString(),
    });

    // Simulate progressive execution
    setTimeout(() => {
      storage.updateIntent(intent.id, { status: "orchestrating", progress: 0.25 });
      storage.createActivity({
        agentId: 1,
        guildId: null,
        eventType: "intent_received",
        title: "ARCHON orchestrating agents",
        description: `Delegating "${intent.humanText}" to relevant guilds`,
        metadata: JSON.stringify({ intentId: intent.id }),
        severity: "info",
        createdAt: new Date().toISOString(),
      });
    }, 2000);

    setTimeout(() => {
      const guilds = storage.getGuilds();
      const involvedGuilds = guilds.filter(() => Math.random() > 0.4).slice(0, 3);
      const agents = storage.getAgents().filter(a => a.status !== "dissolved");
      const assignedAgents = agents.filter(() => Math.random() > 0.6).slice(0, 5);
      
      storage.updateIntent(intent.id, {
        status: "executing",
        progress: 0.6,
        guildsInvolved: JSON.stringify(involvedGuilds.map(g => g.id)),
        agentsAssigned: JSON.stringify(assignedAgents.map(a => a.id)),
      });
    }, 5000);

    setTimeout(() => {
      storage.updateIntent(intent.id, { status: "completed", progress: 1.0, completedAt: new Date().toISOString() });
      storage.createActivity({
        agentId: 1,
        guildId: null,
        eventType: "intent_received",
        title: "Intent fulfilled",
        description: `Completed: "${intent.humanText}"`,
        metadata: JSON.stringify({ intentId: intent.id }),
        severity: "success",
        createdAt: new Date().toISOString(),
      });
    }, 10000);

    res.json(intent);
  });

  // ─── Activity Feed ───
  app.get("/api/activity", (req, res) => {
    const limit = Number(req.query.limit) || 50;
    res.json(storage.getActivity(limit));
  });

  // ─── Metrics ───
  app.get("/api/metrics", (_req, res) => {
    res.json(storage.getLatestMetrics());
  });
}

function countBy<T>(arr: T[], key: keyof T): Record<string, number> {
  return arr.reduce((acc, item) => {
    const val = String(item[key]);
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}
