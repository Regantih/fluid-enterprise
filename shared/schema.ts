import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ═══ CAPABILITIES — Living capability clusters that run the enterprise ═══
export const capabilities = sqliteTable("capabilities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  domain: text("domain").notNull(), // procurement, finance, logistics, planning, workforce, customer
  description: text("description").notNull(),
  status: text("status").notNull().default("proposed"), // proposed, provisioning, active, degraded, retiring, archived
  agentCount: integer("agent_count").notNull().default(0),
  generation: integer("generation").notNull().default(1), // current evolutionary generation
  fitnessScore: real("fitness_score").notNull().default(0.5), // AlphaZero-style fitness
  trustScore: real("trust_score").notNull().default(0.5),
  budgetAllocated: real("budget_allocated").notNull().default(0),
  budgetConsumed: real("budget_consumed").notNull().default(0),
  budgetLimit: real("budget_limit").notNull().default(100000),
  automationRate: real("automation_rate").notNull().default(0), // 0-1
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export const insertCapabilitySchema = createInsertSchema(capabilities).omit({ id: true });
export type InsertCapability = z.infer<typeof insertCapabilitySchema>;
export type Capability = typeof capabilities.$inferSelect;

// ═══ AGENTS — The workforce operating inside capabilities ═══
export const agents = sqliteTable("agents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  role: text("role").notNull(), // orchestrator, specialist, sentinel, task
  capabilityId: integer("capability_id"),
  status: text("status").notNull().default("online"), // online, busy, degraded, offline, dissolved
  generation: integer("generation").notNull().default(1),
  trustScore: real("trust_score").notNull().default(0.7),
  decisionsHandled: integer("decisions_handled").notNull().default(0),
  successRate: real("success_rate").notNull().default(0.85),
  lastHeartbeat: text("last_heartbeat").notNull(),
  uptime: real("uptime").notNull().default(99.9),
  createdAt: text("created_at").notNull(),
});
export const insertAgentSchema = createInsertSchema(agents).omit({ id: true });
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;

// ═══ TASKS — Work items within capabilities ═══
export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  capabilityId: integer("capability_id").notNull(),
  agentId: integer("agent_id"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull().default("medium"), // low, medium, high, critical
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, failed, blocked
  confidence: real("confidence").notNull().default(0.8),
  estimatedCost: real("estimated_cost").notNull().default(0),
  actualCost: real("actual_cost").notNull().default(0),
  createdAt: text("created_at").notNull(),
  completedAt: text("completed_at"),
});
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// ═══ GOVERNANCE — Human-in-the-loop approval queue ═══
export const governance = sqliteTable("governance", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  capabilityId: integer("capability_id").notNull(),
  agentId: integer("agent_id"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  riskLevel: text("risk_level").notNull().default("medium"), // low, medium, high, critical
  category: text("category").notNull(), // budget_breach, compliance, policy_change, capability_lifecycle, anomaly
  status: text("status").notNull().default("pending"), // pending, approved, rejected, deferred
  requestedBy: text("requested_by").notNull(),
  reviewedBy: text("reviewed_by"),
  humanResponse: text("human_response"),
  financialImpact: real("financial_impact").notNull().default(0),
  createdAt: text("created_at").notNull(),
  resolvedAt: text("resolved_at"),
});
export const insertGovernanceSchema = createInsertSchema(governance).omit({ id: true });
export type InsertGovernance = z.infer<typeof insertGovernanceSchema>;
export type Governance = typeof governance.$inferSelect;

// ═══ COST EVENTS — Financial tracking for every agent action ═══
export const costEvents = sqliteTable("cost_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  capabilityId: integer("capability_id").notNull(),
  agentId: integer("agent_id"),
  eventType: text("event_type").notNull(), // compute, api_call, data_transfer, storage, human_escalation
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("USD"),
  description: text("description").notNull(),
  dayOffset: integer("day_offset").notNull().default(0), // days ago for historical seeding
  createdAt: text("created_at").notNull(),
});
export const insertCostEventSchema = createInsertSchema(costEvents).omit({ id: true });
export type InsertCostEvent = z.infer<typeof insertCostEventSchema>;
export type CostEvent = typeof costEvents.$inferSelect;

// ═══ ACTIVITY LOG — Immutable audit trail ═══
export const activityLog = sqliteTable("activity_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  capabilityId: integer("capability_id"),
  agentId: integer("agent_id"),
  eventType: text("event_type").notNull(), // capability_created, agent_spawned, task_completed, governance_requested, budget_alert, migration_progress, heartbeat_lost
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull().default("info"), // info, warning, error, success
  metadata: text("metadata").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
});
export const insertActivitySchema = createInsertSchema(activityLog).omit({ id: true });
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activityLog.$inferSelect;

// ═══ MIGRATION MAP — Legacy-to-capability mapping ═══
export const migrationMap = sqliteTable("migration_map", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  legacySystem: text("legacy_system").notNull(), // "Material Management", "Treasury", etc.
  legacyDescription: text("legacy_description").notNull(),
  capabilityId: integer("capability_id"),
  migrationStatus: text("migration_status").notNull().default("planned"), // planned, in_progress, testing, live, decommissioned
  progress: real("progress").notNull().default(0), // 0-1
  complexity: text("complexity").notNull().default("medium"), // low, medium, high, critical
  dataVolume: text("data_volume").notNull().default(""), // e.g. "2.4M records"
  estimatedWeeks: integer("estimated_weeks").notNull().default(4),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull(),
});
export const insertMigrationSchema = createInsertSchema(migrationMap).omit({ id: true });
export type InsertMigration = z.infer<typeof insertMigrationSchema>;
export type Migration = typeof migrationMap.$inferSelect;

// ═══ COMPOSITION LINKS — How capabilities chain together ═══
export const compositionLinks = sqliteTable("composition_links", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceCapabilityId: integer("source_capability_id").notNull(),
  targetCapabilityId: integer("target_capability_id").notNull(),
  linkType: text("link_type").notNull(), // data_flow, trigger, dependency, feedback
  label: text("label").notNull().default(""),
  strength: real("strength").notNull().default(0.8),
});
export const insertCompositionLinkSchema = createInsertSchema(compositionLinks).omit({ id: true });
export type InsertCompositionLink = z.infer<typeof insertCompositionLinkSchema>;
export type CompositionLink = typeof compositionLinks.$inferSelect;

// ═══ EVOLUTION — AlphaZero-inspired generational improvement ═══
export const evolutionLog = sqliteTable("evolution_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  generation: integer("generation").notNull(),
  capabilityId: integer("capability_id"),
  fitnessScore: real("fitness_score").notNull(),
  previousFitness: real("previous_fitness").notNull().default(0),
  mutations: text("mutations").notNull().default("[]"), // JSON array of what changed
  improvements: text("improvements").notNull().default("[]"), // JSON array of outcomes
  agentsSurvived: integer("agents_survived").notNull().default(0),
  agentsEvolved: integer("agents_evolved").notNull().default(0),
  agentsDissolved: integer("agents_dissolved").notNull().default(0),
  selfPlayResult: text("self_play_result").notNull().default(""), // summary of self-play outcome
  createdAt: text("created_at").notNull(),
});
export const insertEvolutionSchema = createInsertSchema(evolutionLog).omit({ id: true });
export type InsertEvolution = z.infer<typeof insertEvolutionSchema>;
export type Evolution = typeof evolutionLog.$inferSelect;

// ═══ COUNCIL REVIEWS — Peer review protocol (no single bad actor) ═══
export const councilReviews = sqliteTable("council_reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  capabilityId: integer("capability_id").notNull(),
  triggerEvent: text("trigger_event").notNull(), // what triggered the review
  reviewerAgents: text("reviewer_agents").notNull(), // JSON array of agent names
  votes: text("votes").notNull(), // JSON: { agentName: "approve"|"reject" }
  consensus: text("consensus").notNull(), // unanimous, majority, split, deadlock
  outcome: text("outcome").notNull(), // approved, rejected, escalated_to_human
  createdAt: text("created_at").notNull(),
});
export const insertCouncilReviewSchema = createInsertSchema(councilReviews).omit({ id: true });
export type InsertCouncilReview = z.infer<typeof insertCouncilReviewSchema>;
export type CouncilReview = typeof councilReviews.$inferSelect;
