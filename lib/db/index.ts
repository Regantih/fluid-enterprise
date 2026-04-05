import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'fluid.db')

let _db: ReturnType<typeof drizzle> | null = null

export function getDb() {
  if (!_db) {
    const sqlite = new Database(DB_PATH)
    sqlite.pragma('journal_mode = WAL')
    sqlite.pragma('foreign_keys = ON')
    _db = drizzle(sqlite, { schema })
    initSchema(sqlite)
  }
  return _db
}

function initSchema(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      industry TEXT NOT NULL,
      erp_system TEXT NOT NULL DEFAULT 'SAP S/4HANA',
      migration_phase TEXT NOT NULL DEFAULT 'parallel',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS capabilities (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id),
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      domain TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'dormant',
      agent_type TEXT NOT NULL,
      budget_monthly_cents INTEGER NOT NULL DEFAULT 0,
      spent_monthly_cents INTEGER NOT NULL DEFAULT 0,
      sla_target_ms INTEGER NOT NULL DEFAULT 5000,
      last_heartbeat TEXT,
      token_usage_month INTEGER NOT NULL DEFAULT 0,
      tasks_completed INTEGER NOT NULL DEFAULT 0,
      tasks_failed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS capability_compositions (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id),
      name TEXT NOT NULL,
      description TEXT,
      source_capability_id TEXT NOT NULL REFERENCES capabilities(id),
      target_capability_id TEXT NOT NULL REFERENCES capabilities(id),
      flow_type TEXT NOT NULL DEFAULT 'sequential',
      condition_expr TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      capability_id TEXT NOT NULL REFERENCES capabilities(id),
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      priority TEXT NOT NULL DEFAULT 'normal',
      started_at TEXT,
      completed_at TEXT,
      duration_ms INTEGER,
      cost_cents INTEGER NOT NULL DEFAULT 0,
      token_usage INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS governance_approvals (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id),
      capability_id TEXT REFERENCES capabilities(id),
      task_id TEXT REFERENCES tasks(id),
      approval_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      requested_by TEXT NOT NULL DEFAULT 'system',
      status TEXT NOT NULL DEFAULT 'pending',
      risk_level TEXT NOT NULL DEFAULT 'medium',
      approved_by TEXT,
      approved_at TEXT,
      rejection_reason TEXT,
      expires_at TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cost_events (
      id TEXT PRIMARY KEY,
      capability_id TEXT NOT NULL REFERENCES capabilities(id),
      task_id TEXT REFERENCES tasks(id),
      event_type TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      token_count INTEGER NOT NULL DEFAULT 0,
      model TEXT,
      month_bucket TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      capability_id TEXT,
      task_id TEXT,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      details TEXT,
      severity TEXT NOT NULL DEFAULT 'info',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS migration_mappings (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id),
      capability_id TEXT REFERENCES capabilities(id),
      legacy_module TEXT NOT NULL,
      legacy_transaction TEXT,
      legacy_users INTEGER NOT NULL DEFAULT 0,
      migration_status TEXT NOT NULL DEFAULT 'legacy',
      migration_pct INTEGER NOT NULL DEFAULT 0,
      complexity TEXT NOT NULL DEFAULT 'medium',
      estimated_savings_cents INTEGER NOT NULL DEFAULT 0,
      actual_savings_cents INTEGER NOT NULL DEFAULT 0,
      target_date TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)
}

export { schema }
