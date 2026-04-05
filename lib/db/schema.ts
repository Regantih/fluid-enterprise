import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// ─── Companies ────────────────────────────────────────────────────────────────
export const companies = sqliteTable('companies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  industry: text('industry').notNull(),
  erp_system: text('erp_system').notNull().default('SAP S/4HANA'),
  migration_phase: text('migration_phase').notNull().default('parallel'), // legacy | parallel | migrated
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

// ─── Capabilities ─────────────────────────────────────────────────────────────
export const capabilities = sqliteTable('capabilities', {
  id: text('id').primaryKey(),
  company_id: text('company_id').notNull().references(() => companies.id),
  name: text('name').notNull(),
  description: text('description').notNull(),
  domain: text('domain').notNull(), // Finance | Supply Chain | HR | Operations | Revenue
  status: text('status').notNull().default('dormant'), // dormant | active | scaling | paused | error
  agent_type: text('agent_type').notNull(), // autonomous | supervised | hybrid
  budget_monthly_cents: integer('budget_monthly_cents').notNull().default(0),
  spent_monthly_cents: integer('spent_monthly_cents').notNull().default(0),
  sla_target_ms: integer('sla_target_ms').notNull().default(5000),
  last_heartbeat: text('last_heartbeat'),
  token_usage_month: integer('token_usage_month').notNull().default(0),
  tasks_completed: integer('tasks_completed').notNull().default(0),
  tasks_failed: integer('tasks_failed').notNull().default(0),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

// ─── Capability Compositions ──────────────────────────────────────────────────
export const capabilityCompositions = sqliteTable('capability_compositions', {
  id: text('id').primaryKey(),
  company_id: text('company_id').notNull().references(() => companies.id),
  name: text('name').notNull(),
  description: text('description'),
  source_capability_id: text('source_capability_id').notNull().references(() => capabilities.id),
  target_capability_id: text('target_capability_id').notNull().references(() => capabilities.id),
  flow_type: text('flow_type').notNull().default('sequential'), // sequential | parallel | conditional
  condition_expr: text('condition_expr'),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

// ─── Tasks ────────────────────────────────────────────────────────────────────
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  capability_id: text('capability_id').notNull().references(() => capabilities.id),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('pending'), // pending | running | completed | failed | awaiting_approval
  priority: text('priority').notNull().default('normal'), // low | normal | high | critical
  started_at: text('started_at'),
  completed_at: text('completed_at'),
  duration_ms: integer('duration_ms'),
  cost_cents: integer('cost_cents').notNull().default(0),
  token_usage: integer('token_usage').notNull().default(0),
  error_message: text('error_message'),
  metadata: text('metadata'), // JSON blob
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

// ─── Governance Approvals ─────────────────────────────────────────────────────
export const governanceApprovals = sqliteTable('governance_approvals', {
  id: text('id').primaryKey(),
  company_id: text('company_id').notNull().references(() => companies.id),
  capability_id: text('capability_id').references(() => capabilities.id),
  task_id: text('task_id').references(() => tasks.id),
  approval_type: text('approval_type').notNull(), // budget_override | capability_activation | emergency_pause | scale_up | model_upgrade
  title: text('title').notNull(),
  description: text('description').notNull(),
  requested_by: text('requested_by').notNull().default('system'),
  status: text('status').notNull().default('pending'), // pending | approved | rejected | expired
  risk_level: text('risk_level').notNull().default('medium'), // low | medium | high | critical
  approved_by: text('approved_by'),
  approved_at: text('approved_at'),
  rejection_reason: text('rejection_reason'),
  expires_at: text('expires_at'),
  metadata: text('metadata'),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

// ─── Cost Events ──────────────────────────────────────────────────────────────
export const costEvents = sqliteTable('cost_events', {
  id: text('id').primaryKey(),
  capability_id: text('capability_id').notNull().references(() => capabilities.id),
  task_id: text('task_id').references(() => tasks.id),
  event_type: text('event_type').notNull(), // inference | tool_call | storage | api_call
  amount_cents: integer('amount_cents').notNull(),
  token_count: integer('token_count').notNull().default(0),
  model: text('model'),
  month_bucket: text('month_bucket').notNull(), // YYYY-MM
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

// ─── Activity Log ─────────────────────────────────────────────────────────────
export const activityLog = sqliteTable('activity_log', {
  id: text('id').primaryKey(),
  company_id: text('company_id').notNull(),
  capability_id: text('capability_id'),
  task_id: text('task_id'),
  actor: text('actor').notNull(), // system | human:name | agent:name
  action: text('action').notNull(),
  resource_type: text('resource_type').notNull(), // capability | task | governance | cost | migration
  resource_id: text('resource_id'),
  details: text('details'), // JSON blob
  severity: text('severity').notNull().default('info'), // info | warning | error | critical
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

// ─── Migration Mappings ───────────────────────────────────────────────────────
export const migrationMappings = sqliteTable('migration_mappings', {
  id: text('id').primaryKey(),
  company_id: text('company_id').notNull().references(() => companies.id),
  capability_id: text('capability_id').references(() => capabilities.id),
  legacy_module: text('legacy_module').notNull(), // e.g. "SAP MM - Materials Management"
  legacy_transaction: text('legacy_transaction'), // e.g. "ME21N"
  legacy_users: integer('legacy_users').notNull().default(0),
  migration_status: text('migration_status').notNull().default('legacy'), // legacy | analysis | parallel | cutover | migrated
  migration_pct: integer('migration_pct').notNull().default(0), // 0-100
  complexity: text('complexity').notNull().default('medium'), // low | medium | high | critical
  estimated_savings_cents: integer('estimated_savings_cents').notNull().default(0),
  actual_savings_cents: integer('actual_savings_cents').notNull().default(0),
  target_date: text('target_date'),
  notes: text('notes'),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

// ─── Types ────────────────────────────────────────────────────────────────────
export type Company = typeof companies.$inferSelect
export type Capability = typeof capabilities.$inferSelect
export type CapabilityComposition = typeof capabilityCompositions.$inferSelect
export type Task = typeof tasks.$inferSelect
export type GovernanceApproval = typeof governanceApprovals.$inferSelect
export type CostEvent = typeof costEvents.$inferSelect
export type ActivityLogEntry = typeof activityLog.$inferSelect
export type MigrationMapping = typeof migrationMappings.$inferSelect
