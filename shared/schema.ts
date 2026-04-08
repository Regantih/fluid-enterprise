import { sqliteTable, text, integer, real } from "drizzle-orm/better-sqlite3";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Guilds: persistent capability teams ───
export const guilds = sqliteTable("guilds", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  domain: text("domain").notNull(), // finance, supply_chain, customer, hr, engineering
  description: text("description").notNull(),
  status: text("status").notNull().default("active"), // active, evolving, dormant
  performanceScore: real("performance_score").notNull().default(0.5),
  agentCount: integer("agent_count").notNull().default(0),
  generation: integer("generation").notNull().default(1),
});

export const insertGuildSchema = createInsertSchema(guilds).omit({ id: true });
export type InsertGuild = z.infer<typeof insertGuildSchema>;
export type Guild = typeof guilds.$inferSelect;

// ─── Agents: the workforce ───
export const agents = sqliteTable("agents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull(), // archon, guild_leader, specialist, task, sentinel
  guildId: integer("guild_id"),
  status: text("status").notNull().default("active"), // active, busy, evolving, dissolved
  trustScore: real("trust_score").notNull().default(0.5),
  confidenceLevel: real("confidence_level").notNull().default(0.7),
  generation: integer("generation").notNull().default(1),
  capabilities: text("capabilities").notNull().default("[]"), // JSON array of skill IDs
  decisionsHandled: integer("decisions_handled").notNull().default(0),
  successRate: real("success_rate").notNull().default(0.8),
  createdAt: text("created_at").notNull(),
  dissolvedAt: text("dissolved_at"),
});

export const insertAgentSchema = createInsertSchema(agents).omit({ id: true });
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;

// ─── Skills: reusable capability library ───
export const skills = sqliteTable("skills", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category").notNull(), // financial, operational, analytical, communication
  description: text("description").notNull(),
  complexity: real("complexity").notNull().default(0.5),
  usageCount: integer("usage_count").notNull().default(0),
  successRate: real("success_rate").notNull().default(0.85),
});

export const insertSkillSchema = createInsertSchema(skills).omit({ id: true });
export type InsertSkill = z.infer<typeof insertSkillSchema>;
export type Skill = typeof skills.$inferSelect;

// ─── Decisions: every consequential action ───
export const decisions = sqliteTable("decisions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: integer("agent_id").notNull(),
  guildId: integer("guild_id"),
  type: text("type").notNull(), // financial, operational, strategic, compliance
  title: text("title").notNull(),
  description: text("description").notNull(),
  confidence: real("confidence").notNull(),
  impact: text("impact").notNull().default("medium"), // low, medium, high, critical
  status: text("status").notNull().default("pending"), // pending, auto_approved, escalated, human_approved, human_rejected
  outcome: text("outcome"), // success, partial, failed
  createdAt: text("created_at").notNull(),
  resolvedAt: text("resolved_at"),
});

export const insertDecisionSchema = createInsertSchema(decisions).omit({ id: true });
export type InsertDecision = z.infer<typeof insertDecisionSchema>;
export type Decision = typeof decisions.$inferSelect;

// ─── Escalations: human-in-the-loop ───
export const escalations = sqliteTable("escalations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  decisionId: integer("decision_id").notNull(),
  agentId: integer("agent_id").notNull(),
  reason: text("reason").notNull(),
  priority: text("priority").notNull().default("medium"), // low, medium, high, critical
  context: text("context").notNull(), // JSON with relevant data
  status: text("status").notNull().default("pending"), // pending, reviewing, approved, rejected, deferred
  humanResponse: text("human_response"),
  createdAt: text("created_at").notNull(),
  resolvedAt: text("resolved_at"),
});

export const insertEscalationSchema = createInsertSchema(escalations).omit({ id: true });
export type InsertEscalation = z.infer<typeof insertEscalationSchema>;
export type Escalation = typeof escalations.$inferSelect;

// ─── Evolution: generational improvement tracking ───
export const evolutionGenerations = sqliteTable("evolution_generations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  generationNumber: integer("generation_number").notNull(),
  guildId: integer("guild_id"),
  fitnessScore: real("fitness_score").notNull(),
  previousFitness: real("previous_fitness").notNull().default(0),
  mutations: text("mutations").notNull().default("[]"), // JSON array of changes
  improvements: text("improvements").notNull().default("[]"), // JSON array
  agentsSurvived: integer("agents_survived").notNull().default(0),
  agentsEvolved: integer("agents_evolved").notNull().default(0),
  agentsDissolved: integer("agents_dissolved").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const insertEvolutionSchema = createInsertSchema(evolutionGenerations).omit({ id: true });
export type InsertEvolution = z.infer<typeof insertEvolutionSchema>;
export type EvolutionGeneration = typeof evolutionGenerations.$inferSelect;

// ─── Council Reviews: peer review protocol ───
export const councilReviews = sqliteTable("council_reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  decisionId: integer("decision_id").notNull(),
  reviewerAgentIds: text("reviewer_agent_ids").notNull(), // JSON array
  votes: text("votes").notNull(), // JSON: {agentId: approve/reject}
  consensus: text("consensus").notNull(), // unanimous, majority, split, deadlock
  outcome: text("outcome").notNull(), // approved, rejected, escalated
  createdAt: text("created_at").notNull(),
});

export const insertCouncilReviewSchema = createInsertSchema(councilReviews).omit({ id: true });
export type InsertCouncilReview = z.infer<typeof insertCouncilReviewSchema>;
export type CouncilReview = typeof councilReviews.$inferSelect;

// ─── Intents: human intent → orchestrated action ───
export const intents = sqliteTable("intents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  humanText: text("human_text").notNull(),
  archonInterpretation: text("archon_interpretation").notNull(),
  status: text("status").notNull().default("processing"), // processing, orchestrating, executing, completed, failed
  guildsInvolved: text("guilds_involved").notNull().default("[]"), // JSON array of guild IDs
  agentsAssigned: text("agents_assigned").notNull().default("[]"), // JSON array of agent IDs
  progress: real("progress").notNull().default(0),
  createdAt: text("created_at").notNull(),
  completedAt: text("completed_at"),
});

export const insertIntentSchema = createInsertSchema(intents).omit({ id: true });
export type InsertIntent = z.infer<typeof insertIntentSchema>;
export type Intent = typeof intents.$inferSelect;

// ─── Activity Log: real-time event stream ───
export const activityLog = sqliteTable("activity_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: integer("agent_id"),
  guildId: integer("guild_id"),
  eventType: text("event_type").notNull(), // agent_spawned, decision_made, escalation, evolution, council_review, skill_used, intent_received
  title: text("title").notNull(),
  description: text("description").notNull(),
  metadata: text("metadata").notNull().default("{}"), // JSON
  severity: text("severity").notNull().default("info"), // info, warning, critical, success
  createdAt: text("created_at").notNull(),
});

export const insertActivitySchema = createInsertSchema(activityLog).omit({ id: true });
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activityLog.$inferSelect;

// ─── Metrics: time-series KPIs ───
export const metrics = sqliteTable("metrics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  value: real("value").notNull(),
  previousValue: real("previous_value"),
  category: text("category").notNull(), // financial, operational, trust, evolution
  unit: text("unit").notNull().default(""), // $, %, count, score
  createdAt: text("created_at").notNull(),
});

export const insertMetricSchema = createInsertSchema(metrics).omit({ id: true });
export type InsertMetric = z.infer<typeof insertMetricSchema>;
export type Metric = typeof metrics.$inferSelect;
