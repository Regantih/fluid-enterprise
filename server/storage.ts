import {
  type Guild, type InsertGuild, guilds,
  type Agent, type InsertAgent, agents,
  type Skill, type InsertSkill, skills,
  type Decision, type InsertDecision, decisions,
  type Escalation, type InsertEscalation, escalations,
  type EvolutionGeneration, type InsertEvolution, evolutionGenerations,
  type CouncilReview, type InsertCouncilReview, councilReviews,
  type Intent, type InsertIntent, intents,
  type Activity, type InsertActivity, activityLog,
  type Metric, type InsertMetric, metrics,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, sql } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");
export const db = drizzle(sqlite);

export interface IStorage {
  // Guilds
  getGuilds(): Guild[];
  getGuild(id: number): Guild | undefined;
  createGuild(g: InsertGuild): Guild;
  updateGuild(id: number, data: Partial<InsertGuild>): Guild | undefined;

  // Agents
  getAgents(): Agent[];
  getAgentsByGuild(guildId: number): Agent[];
  getAgent(id: number): Agent | undefined;
  createAgent(a: InsertAgent): Agent;
  updateAgent(id: number, data: Partial<InsertAgent>): Agent | undefined;

  // Skills
  getSkills(): Skill[];
  createSkill(s: InsertSkill): Skill;

  // Decisions
  getDecisions(limit?: number): Decision[];
  getDecisionsByAgent(agentId: number): Decision[];
  createDecision(d: InsertDecision): Decision;
  updateDecision(id: number, data: Partial<InsertDecision>): Decision | undefined;

  // Escalations
  getEscalations(): Escalation[];
  getPendingEscalations(): Escalation[];
  createEscalation(e: InsertEscalation): Escalation;
  updateEscalation(id: number, data: Partial<InsertEscalation>): Escalation | undefined;

  // Evolution
  getEvolutionHistory(limit?: number): EvolutionGeneration[];
  createEvolution(e: InsertEvolution): EvolutionGeneration;

  // Council Reviews
  getCouncilReviews(limit?: number): CouncilReview[];
  createCouncilReview(r: InsertCouncilReview): CouncilReview;

  // Intents
  getIntents(limit?: number): Intent[];
  createIntent(i: InsertIntent): Intent;
  updateIntent(id: number, data: Partial<InsertIntent>): Intent | undefined;

  // Activity Log
  getActivity(limit?: number): Activity[];
  createActivity(a: InsertActivity): Activity;

  // Metrics
  getLatestMetrics(): Metric[];
  createMetric(m: InsertMetric): Metric;
}

export class DatabaseStorage implements IStorage {
  // Guilds
  getGuilds(): Guild[] {
    return db.select().from(guilds).all();
  }
  getGuild(id: number): Guild | undefined {
    return db.select().from(guilds).where(eq(guilds.id, id)).get();
  }
  createGuild(g: InsertGuild): Guild {
    return db.insert(guilds).values(g).returning().get();
  }
  updateGuild(id: number, data: Partial<InsertGuild>): Guild | undefined {
    return db.update(guilds).set(data).where(eq(guilds.id, id)).returning().get();
  }

  // Agents
  getAgents(): Agent[] {
    return db.select().from(agents).all();
  }
  getAgentsByGuild(guildId: number): Agent[] {
    return db.select().from(agents).where(eq(agents.guildId, guildId)).all();
  }
  getAgent(id: number): Agent | undefined {
    return db.select().from(agents).where(eq(agents.id, id)).get();
  }
  createAgent(a: InsertAgent): Agent {
    return db.insert(agents).values(a).returning().get();
  }
  updateAgent(id: number, data: Partial<InsertAgent>): Agent | undefined {
    return db.update(agents).set(data).where(eq(agents.id, id)).returning().get();
  }

  // Skills
  getSkills(): Skill[] {
    return db.select().from(skills).all();
  }
  createSkill(s: InsertSkill): Skill {
    return db.insert(skills).values(s).returning().get();
  }

  // Decisions
  getDecisions(limit = 50): Decision[] {
    return db.select().from(decisions).orderBy(desc(decisions.createdAt)).limit(limit).all();
  }
  getDecisionsByAgent(agentId: number): Decision[] {
    return db.select().from(decisions).where(eq(decisions.agentId, agentId)).all();
  }
  createDecision(d: InsertDecision): Decision {
    return db.insert(decisions).values(d).returning().get();
  }
  updateDecision(id: number, data: Partial<InsertDecision>): Decision | undefined {
    return db.update(decisions).set(data).where(eq(decisions.id, id)).returning().get();
  }

  // Escalations
  getEscalations(): Escalation[] {
    return db.select().from(escalations).orderBy(desc(escalations.createdAt)).all();
  }
  getPendingEscalations(): Escalation[] {
    return db.select().from(escalations).where(eq(escalations.status, "pending")).all();
  }
  createEscalation(e: InsertEscalation): Escalation {
    return db.insert(escalations).values(e).returning().get();
  }
  updateEscalation(id: number, data: Partial<InsertEscalation>): Escalation | undefined {
    return db.update(escalations).set(data).where(eq(escalations.id, id)).returning().get();
  }

  // Evolution
  getEvolutionHistory(limit = 30): EvolutionGeneration[] {
    return db.select().from(evolutionGenerations).orderBy(desc(evolutionGenerations.createdAt)).limit(limit).all();
  }
  createEvolution(e: InsertEvolution): EvolutionGeneration {
    return db.insert(evolutionGenerations).values(e).returning().get();
  }

  // Council Reviews
  getCouncilReviews(limit = 20): CouncilReview[] {
    return db.select().from(councilReviews).orderBy(desc(councilReviews.createdAt)).limit(limit).all();
  }
  createCouncilReview(r: InsertCouncilReview): CouncilReview {
    return db.insert(councilReviews).values(r).returning().get();
  }

  // Intents
  getIntents(limit = 20): Intent[] {
    return db.select().from(intents).orderBy(desc(intents.createdAt)).limit(limit).all();
  }
  createIntent(i: InsertIntent): Intent {
    return db.insert(intents).values(i).returning().get();
  }
  updateIntent(id: number, data: Partial<InsertIntent>): Intent | undefined {
    return db.update(intents).set(data).where(eq(intents.id, id)).returning().get();
  }

  // Activity Log
  getActivity(limit = 100): Activity[] {
    return db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(limit).all();
  }
  createActivity(a: InsertActivity): Activity {
    return db.insert(activityLog).values(a).returning().get();
  }

  // Metrics
  getLatestMetrics(): Metric[] {
    // Get latest value for each metric name
    const subq = db
      .select({
        name: metrics.name,
        maxId: sql<number>`max(${metrics.id})`.as("max_id"),
      })
      .from(metrics)
      .groupBy(metrics.name)
      .all();

    const ids = subq.map((r) => r.maxId);
    if (ids.length === 0) return [];
    
    return db.select().from(metrics).all().filter(m => ids.includes(m.id));
  }
  createMetric(m: InsertMetric): Metric {
    return db.insert(metrics).values(m).returning().get();
  }
}

export const storage = new DatabaseStorage();
