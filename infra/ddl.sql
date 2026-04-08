-- ═══════════════════════════════════════════════════════════════
-- Fluid Enterprise — DDL from Production Plan (Section 5)
-- PostgreSQL 17 + pgvector 0.8
-- ═══════════════════════════════════════════════════════════════

-- Tenants (not in plan doc, but needed for multi-tenant)
CREATE TABLE IF NOT EXISTS tenants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug            TEXT UNIQUE NOT NULL,
    name            TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    config          JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- The genome
CREATE TABLE IF NOT EXISTS capabilities (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID REFERENCES tenants(id),
    name            TEXT NOT NULL,
    slug            TEXT UNIQUE NOT NULL,
    kind            TEXT NOT NULL CHECK (kind IN ('skill','agent','panel','policy','workflow')),
    stage           TEXT NOT NULL DEFAULT 'proposed'
                    CHECK (stage IN ('proposed','shadow','canary','production','deprecated')),
    generation      INT NOT NULL DEFAULT 1,
    parent_id       UUID REFERENCES capabilities(id),  -- lineage
    manifest        JSONB NOT NULL DEFAULT '{}'::jsonb, -- SKILL.md parsed
    source_ref      TEXT NOT NULL DEFAULT '',           -- git sha in the capability repo
    code            TEXT NOT NULL DEFAULT '',           -- capability.py source
    eval_suite      TEXT NOT NULL DEFAULT '',           -- eval.jsonl content
    budget_monthly_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_by      TEXT NOT NULL DEFAULT 'system',    -- 'reflection_loop' | 'human:<id>'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cap_tenant ON capabilities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cap_stage ON capabilities(stage);
CREATE INDEX IF NOT EXISTS idx_cap_slug ON capabilities(slug);

-- Fitness over time, one row per evaluation
CREATE TABLE IF NOT EXISTS fitness_scores (
    id              BIGSERIAL PRIMARY KEY,
    capability_id   UUID REFERENCES capabilities(id),
    generation      INT NOT NULL,
    success_rate    NUMERIC(5,4),
    avg_latency_ms  INT,
    cost_per_run_usd NUMERIC(10,4),
    trust_delta     NUMERIC(5,4),
    automation_delta NUMERIC(5,4),
    composite       NUMERIC(5,4) NOT NULL,  -- the fitness objective
    evaluated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fitness_cap ON fitness_scores(capability_id);
CREATE INDEX IF NOT EXISTS idx_fitness_gen ON fitness_scores(generation);

-- The Governance audit ledger — append-only, hash-chained
CREATE TABLE IF NOT EXISTS governance_events (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       UUID REFERENCES tenants(id),
    capability_id   UUID REFERENCES capabilities(id),
    from_stage      TEXT,
    to_stage        TEXT,
    decision        TEXT NOT NULL CHECK (decision IN ('propose','approve','veto','rollback')),
    actor           TEXT NOT NULL,
    rationale       TEXT,
    prev_hash       TEXT,
    this_hash       TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gov_tenant ON governance_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gov_cap ON governance_events(capability_id);

-- Signal Bus persistence
CREATE TABLE IF NOT EXISTS signals (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       UUID REFERENCES tenants(id),
    source          TEXT NOT NULL,
    kind            TEXT NOT NULL,
    payload         JSONB NOT NULL,
    embedding       vector(1024),
    clustered_into  UUID,                  -- points at a capability_gap
    ingested_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sig_tenant ON signals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sig_source ON signals(source);
CREATE INDEX IF NOT EXISTS idx_sig_kind ON signals(kind);
CREATE INDEX IF NOT EXISTS idx_sig_ingested ON signals(ingested_at);

-- Capability gaps discovered by the Reflection Loop
CREATE TABLE IF NOT EXISTS capability_gaps (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID REFERENCES tenants(id),
    summary         TEXT NOT NULL,
    signal_count    INT NOT NULL DEFAULT 0,
    evidence_signal_ids BIGINT[] NOT NULL DEFAULT '{}',
    suggested_name  TEXT,
    suggested_kind  TEXT,
    expected_fitness_impact NUMERIC(5,4),
    rationale       TEXT,
    proposed_capability_id UUID REFERENCES capabilities(id),
    status          TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','proposing','generated','dismissed')),
    opened_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gap_tenant ON capability_gaps(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gap_status ON capability_gaps(status);

-- ─── Seed Acme Robotics tenant ───
INSERT INTO tenants (slug, name, config) VALUES (
    'acme_robotics',
    'Acme Robotics',
    '{"industry": "robotics_manufacturing", "employees": 2400, "annual_revenue_usd": 340000000}'::jsonb
) ON CONFLICT (slug) DO NOTHING;
