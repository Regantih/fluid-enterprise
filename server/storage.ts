import {
  type Capability, type InsertCapability, capabilities,
  type Agent, type InsertAgent, agents,
  type Task, type InsertTask, tasks,
  type Governance, type InsertGovernance, governance,
  type CostEvent, type InsertCostEvent, costEvents,
  type Activity, type InsertActivity, activityLog,
  type Migration, type InsertMigration, migrationMap,
  type CompositionLink, type InsertCompositionLink, compositionLinks,
  type Evolution, type InsertEvolution, evolutionLog,
  type CouncilReview, type InsertCouncilReview, councilReviews,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, sql } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");
export const db = drizzle(sqlite);

export interface IStorage {
  // Capabilities
  getCapabilities(): Capability[];
  getCapabilityById(id: number): Capability | undefined;
  createCapability(c: InsertCapability): Capability;
  updateCapability(id: number, data: Partial<InsertCapability>): Capability | undefined;

  // Agents
  getAgents(): Agent[];
  getAgentsByCapability(capabilityId: number): Agent[];
  getAgentById(id: number): Agent | undefined;
  createAgent(a: InsertAgent): Agent;
  updateAgent(id: number, data: Partial<InsertAgent>): Agent | undefined;

  // Tasks
  getTasks(): Task[];
  getTasksByCapability(capabilityId: number): Task[];
  createTask(t: InsertTask): Task;
  updateTask(id: number, data: Partial<InsertTask>): Task | undefined;

  // Governance
  getGovernance(): Governance[];
  getPendingGovernance(): Governance[];
  createGovernance(g: InsertGovernance): Governance;
  updateGovernance(id: number, data: Partial<InsertGovernance>): Governance | undefined;

  // Cost Events
  getCostEvents(): CostEvent[];
  getCostEventsByCapability(capabilityId: number): CostEvent[];
  createCostEvent(e: InsertCostEvent): CostEvent;
  getDailyTotals(days?: number): { day: number; total: number }[];

  // Activity Log
  getActivity(limit?: number): Activity[];
  createActivity(a: InsertActivity): Activity;

  // Migration Map
  getMigrations(): Migration[];
  createMigration(m: InsertMigration): Migration;
  updateMigration(id: number, data: Partial<InsertMigration>): Migration | undefined;

  // Composition Links
  getCompositionLinks(): CompositionLink[];
  createCompositionLink(l: InsertCompositionLink): CompositionLink;

  // Evolution Log
  getEvolutionHistory(limit?: number): Evolution[];
  createEvolution(e: InsertEvolution): Evolution;

  // Council Reviews
  getCouncilReviews(limit?: number): CouncilReview[];
  createCouncilReview(r: InsertCouncilReview): CouncilReview;
}

export class DatabaseStorage implements IStorage {
  // ─── Capabilities ───────────────────────────────────────────────────────────
  getCapabilities(): Capability[] {
    return db.select().from(capabilities).orderBy(capabilities.id).all();
  }

  getCapabilityById(id: number): Capability | undefined {
    return db.select().from(capabilities).where(eq(capabilities.id, id)).get();
  }

  createCapability(c: InsertCapability): Capability {
    return db.insert(capabilities).values(c).returning().get();
  }

  updateCapability(id: number, data: Partial<InsertCapability>): Capability | undefined {
    return db
      .update(capabilities)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(capabilities.id, id))
      .returning()
      .get();
  }

  // ─── Agents ─────────────────────────────────────────────────────────────────
  getAgents(): Agent[] {
    return db.select().from(agents).orderBy(agents.id).all();
  }

  getAgentsByCapability(capabilityId: number): Agent[] {
    return db.select().from(agents).where(eq(agents.capabilityId, capabilityId)).all();
  }

  getAgentById(id: number): Agent | undefined {
    return db.select().from(agents).where(eq(agents.id, id)).get();
  }

  createAgent(a: InsertAgent): Agent {
    return db.insert(agents).values(a).returning().get();
  }

  updateAgent(id: number, data: Partial<InsertAgent>): Agent | undefined {
    return db.update(agents).set(data).where(eq(agents.id, id)).returning().get();
  }

  // ─── Tasks ───────────────────────────────────────────────────────────────────
  getTasks(): Task[] {
    return db.select().from(tasks).orderBy(desc(tasks.createdAt)).all();
  }

  getTasksByCapability(capabilityId: number): Task[] {
    return db
      .select()
      .from(tasks)
      .where(eq(tasks.capabilityId, capabilityId))
      .orderBy(desc(tasks.createdAt))
      .all();
  }

  createTask(t: InsertTask): Task {
    return db.insert(tasks).values(t).returning().get();
  }

  updateTask(id: number, data: Partial<InsertTask>): Task | undefined {
    return db.update(tasks).set(data).where(eq(tasks.id, id)).returning().get();
  }

  // ─── Governance ──────────────────────────────────────────────────────────────
  getGovernance(): Governance[] {
    return db.select().from(governance).orderBy(desc(governance.createdAt)).all();
  }

  getPendingGovernance(): Governance[] {
    return db
      .select()
      .from(governance)
      .where(eq(governance.status, "pending"))
      .orderBy(desc(governance.createdAt))
      .all();
  }

  createGovernance(g: InsertGovernance): Governance {
    return db.insert(governance).values(g).returning().get();
  }

  updateGovernance(id: number, data: Partial<InsertGovernance>): Governance | undefined {
    return db.update(governance).set(data).where(eq(governance.id, id)).returning().get();
  }

  // ─── Cost Events ─────────────────────────────────────────────────────────────
  getCostEvents(): CostEvent[] {
    return db.select().from(costEvents).orderBy(desc(costEvents.createdAt)).all();
  }

  getCostEventsByCapability(capabilityId: number): CostEvent[] {
    return db
      .select()
      .from(costEvents)
      .where(eq(costEvents.capabilityId, capabilityId))
      .orderBy(desc(costEvents.createdAt))
      .all();
  }

  createCostEvent(e: InsertCostEvent): CostEvent {
    return db.insert(costEvents).values(e).returning().get();
  }

  getDailyTotals(days = 30): { day: number; total: number }[] {
    const rows = db
      .select({
        day: costEvents.dayOffset,
        total: sql<number>`sum(${costEvents.amount})`.as("total"),
      })
      .from(costEvents)
      .groupBy(costEvents.dayOffset)
      .all();

    const map = new Map<number, number>();
    for (const row of rows) {
      map.set(row.day, Number(row.total));
    }
    const result: { day: number; total: number }[] = [];
    for (let d = days - 1; d >= 0; d--) {
      result.push({ day: d, total: map.get(d) ?? 0 });
    }
    return result.sort((a, b) => b.day - a.day);
  }

  // ─── Activity Log ────────────────────────────────────────────────────────────
  getActivity(limit = 50): Activity[] {
    return db
      .select()
      .from(activityLog)
      .orderBy(desc(activityLog.createdAt))
      .limit(limit)
      .all();
  }

  createActivity(a: InsertActivity): Activity {
    return db.insert(activityLog).values(a).returning().get();
  }

  // ─── Migration Map ───────────────────────────────────────────────────────────
  getMigrations(): Migration[] {
    return db.select().from(migrationMap).orderBy(migrationMap.id).all();
  }

  createMigration(m: InsertMigration): Migration {
    return db.insert(migrationMap).values(m).returning().get();
  }

  updateMigration(id: number, data: Partial<InsertMigration>): Migration | undefined {
    return db.update(migrationMap).set(data).where(eq(migrationMap.id, id)).returning().get();
  }

  // ─── Composition Links ───────────────────────────────────────────────────────
  getCompositionLinks(): CompositionLink[] {
    return db.select().from(compositionLinks).orderBy(compositionLinks.id).all();
  }

  createCompositionLink(l: InsertCompositionLink): CompositionLink {
    return db.insert(compositionLinks).values(l).returning().get();
  }

  // ─── Evolution Log ───────────────────────────────────────────────────────────
  getEvolutionHistory(limit = 20): Evolution[] {
    return db
      .select()
      .from(evolutionLog)
      .orderBy(desc(evolutionLog.generation))
      .limit(limit)
      .all();
  }

  createEvolution(e: InsertEvolution): Evolution {
    return db.insert(evolutionLog).values(e).returning().get();
  }

  // ─── Council Reviews ─────────────────────────────────────────────────────────
  getCouncilReviews(limit = 20): CouncilReview[] {
    return db
      .select()
      .from(councilReviews)
      .orderBy(desc(councilReviews.createdAt))
      .limit(limit)
      .all();
  }

  createCouncilReview(r: InsertCouncilReview): CouncilReview {
    return db.insert(councilReviews).values(r).returning().get();
  }
}

export const storage = new DatabaseStorage();
