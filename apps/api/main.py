"""
Fluid Enterprise — FastAPI Backend
====================================
Seven Pillars: Signal Layer, Reflection Loop, Generator,
Arena, Evolution Engine, Governance Council, Sovereign Sandbox.

DDL: tenants, capabilities, fitness_scores, governance_events, signals, capability_gaps
"""

import hashlib
import json
import logging
import math
import os
import random
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

import psycopg2
import psycopg2.extras
import psycopg2.pool
import redis
from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://fluid:fluid_dev_2026@localhost:5432/fluid_enterprise")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

_db_pool = psycopg2.pool.ThreadedConnectionPool(2, 10, DATABASE_URL)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("fluid_api")

FLUID_API_KEY = os.environ.get("FLUID_API_KEY", "fluid-demo-2026")


def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != FLUID_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")


def get_db():
    conn = _db_pool.getconn()
    conn.autocommit = True
    psycopg2.extras.register_uuid()
    return conn


def get_redis():
    return redis.from_url(REDIS_URL, decode_responses=True)


def _ser(row: dict) -> dict:
    out = {}
    for k, v in row.items():
        if isinstance(v, uuid.UUID):
            out[k] = str(v)
        elif isinstance(v, datetime):
            out[k] = v.isoformat()
        elif isinstance(v, list) and v and isinstance(v[0], uuid.UUID):
            out[k] = [str(x) for x in v]
        else:
            out[k] = v
    return out


def _dict_cur(conn):
    return conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)


def _tenant_id(cur, slug: str) -> str:
    cur.execute("SELECT id FROM tenants WHERE slug = %s", (slug,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(404, f"Tenant '{slug}' not found")
    return row["id"]


# ── Helpers for synthesizing frontend-compatible shapes from Postgres ──────────

# Deterministic pseudo-random seeded by a string, for stable synthetic values
def _stable_rand(seed_str: str, lo: float, hi: float) -> float:
    h = int(hashlib.md5(seed_str.encode()).hexdigest(), 16)
    return lo + (h % 10000) / 10000.0 * (hi - lo)


# Map Postgres capability stage → frontend status
_STAGE_TO_STATUS = {
    "proposed": "proposed",
    "shadow": "shadow",
    "canary": "canary",
    "production": "active",
    "deprecated": "retiring",
    "retiring": "retiring",
    "archived": "archived",
}

# Map Postgres capability kind → domain (best-effort)
_KIND_TO_DOMAIN = {
    "skill": "operations",
    "agent": "automation",
    "panel": "analytics",
    "policy": "governance",
    "workflow": "workflow",
}

# Domain words extracted from capability names
_DOMAIN_KEYWORDS = {
    "procurement": "procurement",
    "finance": "finance",
    "financial": "finance",
    "logistics": "logistics",
    "supply": "logistics",
    "planning": "planning",
    "workforce": "workforce",
    "customer": "customer",
    "compliance": "compliance",
    "quality": "quality",
    "inventory": "inventory",
    "analytics": "analytics",
    "hr": "workforce",
    "risk": "compliance",
    "audit": "compliance",
    "forecast": "planning",
    "demand": "planning",
    "vendor": "procurement",
    "supplier": "procurement",
    "revenue": "finance",
    "accounts": "finance",
    "ap": "finance",
    "ar": "finance",
    "routing": "logistics",
    "warehouse": "logistics",
    "fleet": "logistics",
}


def _infer_domain(name: str, kind: str, manifest: dict) -> str:
    """Derive a domain string from capability name/kind/manifest."""
    name_lower = name.lower()
    for kw, domain in _DOMAIN_KEYWORDS.items():
        if kw in name_lower:
            return domain
    # Try manifest
    if isinstance(manifest, dict):
        for field in ("domain", "category", "area"):
            if field in manifest:
                return str(manifest[field])
    return _KIND_TO_DOMAIN.get(kind, "operations")


def _cap_to_frontend(row: dict, agent_count: int = 0, fitness_row: Optional[dict] = None) -> dict:
    """
    Map a Postgres capabilities row to the frontend-expected shape.
    Synthesizes missing fields deterministically from available data.
    """
    cap_id_str = str(row["id"])
    name = row.get("name", "")
    kind = row.get("kind", "skill")
    stage = row.get("stage", "proposed")
    generation = row.get("generation", 1)
    manifest = row.get("manifest") or {}
    if isinstance(manifest, str):
        try:
            manifest = json.loads(manifest)
        except Exception:
            manifest = {}
    budget_monthly = float(row.get("budget_monthly_usd") or 500)

    # Derive domain
    domain = _infer_domain(name, kind, manifest)

    # Description: pull from manifest or synthesize
    description = (
        manifest.get("description")
        or manifest.get("summary")
        or f"Autonomous {name.lower()} capability powered by AI agents."
    )

    # Status
    status = _STAGE_TO_STATUS.get(stage, stage)

    # Fitness/trust: use actual fitness_scores row if available, else synthesize
    if fitness_row and fitness_row.get("composite") is not None:
        fitness_score = round(float(fitness_row["composite"]), 4)
        success_rate = float(fitness_row.get("success_rate") or 0)
        trust_score = round(min(1.0, fitness_score + _stable_rand(cap_id_str + "trust", -0.05, 0.15)), 4)
        automation_rate = round(success_rate if success_rate > 0 else _stable_rand(cap_id_str + "auto", 0.55, 0.95), 4)
    else:
        fitness_score = round(_stable_rand(cap_id_str + "fit", 0.55, 0.95), 4)
        trust_score = round(_stable_rand(cap_id_str + "trust", 0.60, 0.97), 4)
        automation_rate = round(_stable_rand(cap_id_str + "auto", 0.55, 0.93), 4)

    # Budget: annualize the monthly USD figure
    budget_allocated = round(budget_monthly * 12)
    budget_limit = round(budget_allocated * _stable_rand(cap_id_str + "limit", 1.05, 1.25))
    budget_consumed = round(budget_allocated * _stable_rand(cap_id_str + "consumed", 0.45, 0.85))

    # Integer ID for frontend compatibility — derive from UUID hash
    int_id = int(hashlib.md5(cap_id_str.encode()).hexdigest()[:8], 16) % 900000 + 100000

    return {
        "id": int_id,
        "uuid": cap_id_str,
        "name": name,
        "domain": domain,
        "description": description,
        "status": status,
        "stage": stage,
        "kind": kind,
        "agentCount": agent_count,
        "generation": generation,
        "fitnessScore": fitness_score,
        "trustScore": trust_score,
        "budgetAllocated": budget_allocated,
        "budgetConsumed": budget_consumed,
        "budgetLimit": budget_limit,
        "automationRate": automation_rate,
        "createdAt": row.get("created_at").isoformat() if isinstance(row.get("created_at"), datetime) else row.get("created_at"),
        "slug": row.get("slug", ""),
    }


def _get_default_tenant_id(cur) -> Optional[str]:
    """Return the acme_robotics tenant id, falling back to first tenant."""
    cur.execute("SELECT id FROM tenants WHERE slug = 'acme_robotics'")
    row = cur.fetchone()
    if row:
        return str(row["id"])
    cur.execute("SELECT id FROM tenants LIMIT 1")
    row = cur.fetchone()
    return str(row["id"]) if row else None


def _build_capabilities_with_fitness(cur, tid: str) -> list[dict]:
    """Fetch capabilities + latest fitness for a tenant, return frontend-shaped list."""
    cur.execute("""
        SELECT c.*,
               (SELECT composite FROM fitness_scores WHERE capability_id = c.id
                ORDER BY evaluated_at DESC LIMIT 1) AS latest_fitness,
               (SELECT success_rate FROM fitness_scores WHERE capability_id = c.id
                ORDER BY evaluated_at DESC LIMIT 1) AS latest_success_rate,
               (SELECT COUNT(*) FROM external_agents ea
                WHERE ea.tenant_id = c.tenant_id) AS ext_agent_total
        FROM capabilities c
        WHERE c.tenant_id = %s
        ORDER BY c.generation DESC, c.created_at DESC
    """, (tid,))
    rows = cur.fetchall()

    result = []
    for i, row in enumerate(rows):
        fitness_stub = {
            "composite": row.get("latest_fitness"),
            "success_rate": row.get("latest_success_rate"),
        } if row.get("latest_fitness") is not None else None

        # Synthetic agent count: derived from external_agents or stable rand
        cap_str = str(row["id"])
        agent_count = int(_stable_rand(cap_str + "agcnt", 2, 8))

        frontend_cap = _cap_to_frontend(dict(row), agent_count=agent_count, fitness_row=fitness_stub)
        result.append(frontend_cap)
    return result


def _build_synthetic_agents(caps: list[dict]) -> list[dict]:
    """
    Build a synthetic agents list from capabilities.
    Used for /api/agents and /api/heartbeat when there is no agents table in Postgres.
    """
    ROLES = ["orchestrator", "specialist", "specialist", "specialist", "sentinel"]
    STATUSES = ["online", "online", "online", "online", "busy", "busy", "degraded", "offline"]
    names_pool = [
        "Atlas", "Nexus", "Orbit", "Vector", "Pulse", "Echo", "Cipher", "Proxy",
        "Forge", "Helix", "Titan", "Prism", "Axiom", "Qubit", "Zeta", "Sigma",
        "Nova", "Rho", "Delta", "Gamma", "Kappa", "Lambda", "Omicron", "Pi",
        "Tau", "Upsilon", "Phi", "Chi", "Psi", "Omega",
    ]

    agents = []
    agent_id = 1
    now_iso = datetime.now(timezone.utc).isoformat()

    for cap in caps:
        cap_uuid = cap.get("uuid", str(cap["id"]))
        count = cap.get("agentCount", 3)
        for j in range(count):
            seed = f"{cap_uuid}_{j}"
            name_idx = int(_stable_rand(seed + "name", 0, len(names_pool) - 0.001))
            role_idx = int(_stable_rand(seed + "role", 0, len(ROLES) - 0.001))
            status_idx = int(_stable_rand(seed + "status", 0, len(STATUSES) - 0.001))

            trust = round(_stable_rand(seed + "trust", 0.65, 0.99), 3)
            uptime = round(_stable_rand(seed + "uptime", 97.5, 99.99), 2)
            decisions = int(_stable_rand(seed + "decisions", 200, 15000))
            success_r = round(_stable_rand(seed + "sr", 0.80, 0.99), 3)
            gen = cap.get("generation", 1)

            # Simulate last heartbeat within last 30s
            hb_offset = int(_stable_rand(seed + "hb", 1, 30))
            last_hb = (datetime.now(timezone.utc) - timedelta(seconds=hb_offset)).isoformat()

            agents.append({
                "id": agent_id,
                "name": f"{names_pool[name_idx]}-{agent_id:03d}",
                "role": ROLES[role_idx],
                "capabilityId": cap["id"],
                "capabilityName": cap["name"],
                "status": STATUSES[status_idx],
                "generation": gen,
                "trustScore": trust,
                "decisionsHandled": decisions,
                "successRate": success_r,
                "lastHeartbeat": last_hb,
                "uptime": uptime,
                "createdAt": now_iso,
            })
            agent_id += 1

    return agents


def _build_synthetic_governance(caps: list[dict], limit: int = 30) -> list[dict]:
    """Synthesize governance/escalation items from capabilities."""
    CATEGORIES = ["budget_breach", "compliance", "policy_change", "capability_lifecycle", "anomaly"]
    RISK_LEVELS = ["low", "medium", "high", "critical"]
    STATUSES = ["pending", "pending", "pending", "approved", "rejected", "deferred"]

    items = []
    gov_id = 1
    for cap in caps:
        cap_uuid = cap.get("uuid", "")
        for k in range(int(_stable_rand(cap_uuid + "govcount", 1, 4))):
            seed = f"{cap_uuid}_gov_{k}"
            cat = CATEGORIES[int(_stable_rand(seed + "cat", 0, len(CATEGORIES) - 0.001))]
            risk = RISK_LEVELS[int(_stable_rand(seed + "risk", 0, len(RISK_LEVELS) - 0.001))]
            status = STATUSES[int(_stable_rand(seed + "status", 0, len(STATUSES) - 0.001))]
            impact = round(_stable_rand(seed + "impact", 5000, 250000), 2)

            days_ago = int(_stable_rand(seed + "days", 0, 14))
            created = (datetime.now(timezone.utc) - timedelta(days=days_ago)).isoformat()

            items.append({
                "id": gov_id,
                "capabilityId": cap["id"],
                "capabilityName": cap["name"],
                "title": f"{cat.replace('_', ' ').title()} — {cap['name']}",
                "description": f"Governance escalation for {cap['name']}: {cat.replace('_', ' ')} review required.",
                "riskLevel": risk,
                "category": cat,
                "status": status,
                "requestedBy": f"agent-system",
                "reviewedBy": None if status == "pending" else "human-reviewer",
                "humanResponse": None,
                "financialImpact": impact,
                "createdAt": created,
                "resolvedAt": None if status == "pending" else created,
            })
            gov_id += 1
            if len(items) >= limit:
                break
        if len(items) >= limit:
            break
    return items


def _build_cost_trend(caps: list[dict], days: int = 30) -> list[dict]:
    """Synthesize a daily cost trend from capabilities budgets."""
    total_daily = sum(c.get("budgetAllocated", 0) for c in caps) / 365.0
    result = []
    for d in range(days - 1, -1, -1):
        seed = f"cost_trend_{d}"
        jitter = _stable_rand(seed, 0.7, 1.35)
        result.append({
            "day": d,
            "total": round(total_daily * jitter, 2),
        })
    return result


def _build_activity_from_signals(cur, tid: str, limit: int = 20) -> list[dict]:
    """Build activity log entries from signals or governance_events."""
    activities = []
    # Try signals first
    try:
        cur.execute("""
            SELECT id, source, kind, payload, ingested_at
            FROM signals WHERE tenant_id = %s
            ORDER BY ingested_at DESC LIMIT %s
        """, (tid, limit))
        rows = cur.fetchall()
        for row in rows:
            payload = row.get("payload") or {}
            if isinstance(payload, str):
                try:
                    payload = json.loads(payload)
                except Exception:
                    payload = {}
            activities.append({
                "id": row["id"],
                "capabilityId": None,
                "agentId": None,
                "eventType": row.get("kind", "signal"),
                "title": f"Signal received — {row.get('source', 'unknown')}",
                "description": payload.get("description") or payload.get("message") or str(payload)[:120],
                "severity": "info",
                "metadata": json.dumps({"source": row.get("source"), "kind": row.get("kind")}),
                "createdAt": row["ingested_at"].isoformat() if isinstance(row["ingested_at"], datetime) else row.get("ingested_at"),
            })
    except Exception:
        pass

    # Supplement with governance events if we have room
    if len(activities) < limit:
        try:
            remaining = limit - len(activities)
            cur.execute("""
                SELECT ge.id, ge.capability_id, ge.decision, ge.actor, ge.rationale, ge.created_at,
                       c.name as cap_name
                FROM governance_events ge
                LEFT JOIN capabilities c ON ge.capability_id = c.id
                WHERE ge.tenant_id = %s
                ORDER BY ge.created_at DESC LIMIT %s
            """, (tid, remaining))
            rows = cur.fetchall()
            base_id = 100000
            for row in rows:
                activities.append({
                    "id": base_id + row["id"],
                    "capabilityId": str(row["capability_id"]) if row.get("capability_id") else None,
                    "agentId": None,
                    "eventType": "governance_requested",
                    "title": f"Governance event — {row.get('cap_name') or 'capability'}",
                    "description": row.get("rationale") or f"Decision: {row.get('decision')} by {row.get('actor')}",
                    "severity": "info" if row.get("decision") == "approve" else "warning",
                    "metadata": json.dumps({"decision": row.get("decision"), "actor": row.get("actor")}),
                    "createdAt": row["created_at"].isoformat() if isinstance(row["created_at"], datetime) else row.get("created_at"),
                })
        except Exception:
            pass

    return activities[:limit]


def _build_evolution_from_fitness(cur, tid: str, limit: int = 20) -> list[dict]:
    """Build evolution log from fitness_scores table."""
    try:
        cur.execute("""
            SELECT fs.*, c.name as cap_name, c.slug as cap_slug
            FROM fitness_scores fs
            JOIN capabilities c ON fs.capability_id = c.id
            WHERE c.tenant_id = %s
            ORDER BY fs.evaluated_at DESC
            LIMIT %s
        """, (tid, limit))
        rows = cur.fetchall()
        result = []
        for row in rows:
            composite = float(row.get("composite") or 0)
            prev = float(row.get("trust_delta") or 0)  # approximate
            result.append({
                "id": row["id"],
                "generation": row.get("generation", 1),
                "capabilityId": str(row["capability_id"]),
                "capabilityName": row.get("cap_name", ""),
                "fitnessScore": composite,
                "previousFitness": round(max(0, composite - abs(prev)), 4),
                "mutations": json.dumps(["Fitness evaluation run", "Trust delta applied"]),
                "improvements": json.dumps(["Composite score updated"]),
                "agentsSurvived": 0,
                "agentsEvolved": 0,
                "agentsDissolved": 0,
                "selfPlayResult": f"Evaluation pass: composite={composite:.4f}",
                "createdAt": row["evaluated_at"].isoformat() if isinstance(row["evaluated_at"], datetime) else row.get("evaluated_at"),
            })
        return result
    except Exception:
        return []


def _build_council_from_governance(cur, tid: str, limit: int = 20) -> list[dict]:
    """Build council reviews from governance_events."""
    try:
        cur.execute("""
            SELECT ge.*, c.name as cap_name
            FROM governance_events ge
            LEFT JOIN capabilities c ON ge.capability_id = c.id
            WHERE ge.tenant_id = %s
            ORDER BY ge.created_at DESC
            LIMIT %s
        """, (tid, limit))
        rows = cur.fetchall()
        result = []
        for row in rows:
            decision = row.get("decision", "approve")
            consensus = "unanimous" if decision == "approve" else "majority"
            outcome = "approved" if decision in ("approve", "propose") else "escalated_to_human"
            votes = json.dumps({row.get("actor", "system"): "approve" if decision == "approve" else "reject"})
            result.append({
                "id": row["id"],
                "capabilityId": str(row["capability_id"]) if row.get("capability_id") else None,
                "capabilityName": row.get("cap_name", ""),
                "triggerEvent": f"{row.get('from_stage', '?')} → {row.get('to_stage', '?')} transition — {row.get('cap_name', '')}",
                "reviewerAgents": json.dumps([row.get("actor", "system")]),
                "votes": votes,
                "consensus": consensus,
                "outcome": outcome,
                "createdAt": row["created_at"].isoformat() if isinstance(row["created_at"], datetime) else row.get("created_at"),
            })
        return result
    except Exception:
        return []


def _build_synthetic_migration(caps: list[dict]) -> list[dict]:
    """Synthesize migration map from capabilities."""
    LEGACY_SYSTEMS = [
        ("SAP ERP — Material Management", "Legacy SAP MM module for procurement"),
        ("Oracle Financials", "On-premise Oracle AP/AR/GL suite"),
        ("Manhattan WMS", "Warehouse management system"),
        ("Workday HCM", "Human capital management platform"),
        ("Salesforce CRM", "Customer relationship management"),
        ("Infor SCM", "Supply chain planning module"),
        ("IBM Sterling OMS", "Order management system"),
    ]
    STATUSES = ["planned", "in_progress", "testing", "live", "decommissioned"]
    COMPLEXITIES = ["low", "medium", "high", "critical"]
    DATA_VOLUMES = ["120K records", "450K records", "1.2M records", "3.4M records", "8.7M records"]

    result = []
    for i, cap in enumerate(caps):
        ls_idx = i % len(LEGACY_SYSTEMS)
        cap_uuid = cap.get("uuid", "")
        seed = f"{cap_uuid}_mig"
        status = STATUSES[int(_stable_rand(seed + "status", 0, len(STATUSES) - 0.001))]
        complexity = COMPLEXITIES[int(_stable_rand(seed + "complexity", 0, len(COMPLEXITIES) - 0.001))]
        progress = round(_stable_rand(seed + "progress", 0.0, 1.0), 3)
        if status == "live":
            progress = 1.0
        elif status == "decommissioned":
            progress = 1.0
        elif status == "planned":
            progress = round(_stable_rand(seed + "progress2", 0.0, 0.1), 3)
        data_vol = DATA_VOLUMES[int(_stable_rand(seed + "dvol", 0, len(DATA_VOLUMES) - 0.001))]
        weeks = int(_stable_rand(seed + "weeks", 4, 24))

        result.append({
            "id": i + 1,
            "legacySystem": LEGACY_SYSTEMS[ls_idx][0],
            "legacyDescription": LEGACY_SYSTEMS[ls_idx][1],
            "capabilityId": cap["id"],
            "capabilityName": cap["name"],
            "migrationStatus": status,
            "progress": progress,
            "complexity": complexity,
            "dataVolume": data_vol,
            "estimatedWeeks": weeks,
            "notes": f"Migrating {LEGACY_SYSTEMS[ls_idx][0]} functions to {cap['name']}.",
            "createdAt": cap.get("createdAt", datetime.now(timezone.utc).isoformat()),
        })
    return result


def _build_synthetic_composition(caps: list[dict]) -> list[dict]:
    """Synthesize composition links between capabilities."""
    LINK_TYPES = ["data_flow", "trigger", "dependency", "feedback"]
    result = []
    link_id = 1
    for i, src in enumerate(caps):
        for j, tgt in enumerate(caps):
            if i == j:
                continue
            seed = f"{src.get('uuid', '')}_{tgt.get('uuid', '')}_comp"
            # Only create links probabilistically
            if _stable_rand(seed + "prob", 0, 1) > 0.35:
                continue
            lt_idx = int(_stable_rand(seed + "lt", 0, len(LINK_TYPES) - 0.001))
            strength = round(_stable_rand(seed + "str", 0.5, 1.0), 3)
            result.append({
                "id": link_id,
                "sourceCapabilityId": src["id"],
                "targetCapabilityId": tgt["id"],
                "sourceCapabilityName": src["name"],
                "targetCapabilityName": tgt["name"],
                "linkType": LINK_TYPES[lt_idx],
                "label": f"{src['domain']} → {tgt['domain']}",
                "strength": strength,
            })
            link_id += 1
    return result


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Fluid Enterprise API starting")
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM tenants")
        logger.info(f"DB connected. {cur.fetchone()[0]} tenant(s).")
        _db_pool.putconn(conn)
    except Exception as e:
        logger.error(f"DB fail: {e}")
    try:
        get_redis().ping()
        logger.info("Redis connected.")
    except Exception as e:
        logger.warning(f"Redis fail (non-fatal): {e}")
    # Seed external agents
    try:
        import sys as _sys
        _sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        from apps.api.agent_gateway import seed_external_agents, seed_interactions
        seed_external_agents("acme_robotics")
        seed_interactions("acme_robotics")
    except Exception as e:
        logger.warning(f"Agent gateway seed: {e}")

    yield
    logger.info("Fluid Enterprise API shutting down.")


app = FastAPI(title="Fluid Enterprise API", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5000", "http://localhost:5173", "http://localhost:3000"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


# ═══ HEALTH ═══
@app.get("/health")
def health():
    checks = {"api": "ok", "database": "unknown", "redis": "unknown"}
    try:
        conn = get_db(); cur = conn.cursor(); cur.execute("SELECT 1"); checks["database"] = "ok"; _db_pool.putconn(conn)
    except Exception as e:
        checks["database"] = f"error: {e}"
    try:
        get_redis().ping(); checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"error: {e}"
    return {"status": "healthy" if all(v == "ok" for v in checks.values()) else "degraded", "checks": checks}


# ═══════════════════════════════════════════════════════════════════════════════
# ═══ FRONTEND-COMPATIBLE ROUTES (no tenant prefix) ═══
# These match what the Express/React frontend expects.
# Added BEFORE the tenant-scoped routes.
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/dashboard")
def frontend_dashboard():
    """
    Return the full dashboard payload expected by the React frontend.
    Synthesizes all required fields from Postgres data.
    """
    conn = get_db()
    cur = _dict_cur(conn)
    tid = _get_default_tenant_id(cur)
    if not tid:
        _db_pool.putconn(conn)
        return _empty_dashboard()

    # ── Capabilities ──────────────────────────────────────────────────────────
    caps = _build_capabilities_with_fitness(cur, tid)

    # ── Agent summary (synthetic) ─────────────────────────────────────────────
    agents = _build_synthetic_agents(caps)
    active_agents = [a for a in agents if a["status"] not in ("offline", "dissolved")]

    by_status: dict[str, int] = {}
    for a in agents:
        by_status[a["status"]] = by_status.get(a["status"], 0) + 1

    by_role: dict[str, int] = {}
    for a in agents:
        by_role[a["role"]] = by_role.get(a["role"], 0) + 1

    agent_summary = {
        "total": len(agents),
        "active": len(active_agents),
        "byStatus": by_status,
        "byRole": by_role,
    }

    # ── KPIs ──────────────────────────────────────────────────────────────────
    total_budget = sum(c.get("budgetAllocated", 0) for c in caps)
    total_consumed = sum(c.get("budgetConsumed", 0) for c in caps)
    total_limit = sum(c.get("budgetLimit", 0) for c in caps)
    avg_automation = (sum(c.get("automationRate", 0) for c in caps) / len(caps)) if caps else 0
    avg_trust = (sum(c.get("trustScore", 0) for c in caps) / len(caps)) if caps else 0
    avg_fitness = (sum(c.get("fitnessScore", 0) for c in caps) / len(caps)) if caps else 0
    max_generation = max((c.get("generation", 1) for c in caps), default=1)

    # Pending governance: count pending governance_events
    try:
        cur.execute("""
            SELECT COUNT(*) as cnt FROM governance_events
            WHERE tenant_id = %s AND decision = 'propose'
        """, (tid,))
        row = cur.fetchone()
        pending_gov = int(row["cnt"]) if row else 0
    except Exception:
        pending_gov = int(_stable_rand(tid + "pgov", 2, 8))

    kpis = {
        "totalBudget": total_budget,
        "totalConsumed": total_consumed,
        "totalLimit": total_limit,
        "budgetUtilization": round(total_consumed / total_budget, 4) if total_budget > 0 else 0,
        "automationRateAvg": round(avg_automation, 3),
        "activeAgents": len(active_agents),
        "pendingGovernance": pending_gov,
        "trustIndexAvg": round(avg_trust, 3),
        "systemFitness": round(avg_fitness, 3),
        "evolutionGeneration": max_generation,
    }

    # ── Recent Activity ───────────────────────────────────────────────────────
    recent_activity = _build_activity_from_signals(cur, tid, limit=15)

    # ── Cost Trend ────────────────────────────────────────────────────────────
    cost_trend = _build_cost_trend(caps, days=30)

    # ── Latest Evolution ──────────────────────────────────────────────────────
    evolution_list = _build_evolution_from_fitness(cur, tid, limit=1)
    latest_evolution = evolution_list[0] if evolution_list else None

    _db_pool.putconn(conn)
    return {
        "capabilities": caps,
        "agentSummary": agent_summary,
        "kpis": kpis,
        "recentActivity": recent_activity,
        "costTrend": cost_trend,
        "latestEvolution": latest_evolution,
    }


def _empty_dashboard() -> dict:
    return {
        "capabilities": [],
        "agentSummary": {"total": 0, "active": 0, "byStatus": {}, "byRole": {}},
        "kpis": {
            "totalBudget": 0, "totalConsumed": 0, "totalLimit": 0,
            "budgetUtilization": 0, "automationRateAvg": 0,
            "activeAgents": 0, "pendingGovernance": 0,
            "trustIndexAvg": 0, "systemFitness": 0, "evolutionGeneration": 0,
        },
        "recentActivity": [],
        "costTrend": [],
        "latestEvolution": None,
    }


@app.get("/api/capabilities")
def frontend_list_capabilities():
    """Return capabilities array with all frontend-expected fields."""
    conn = get_db()
    cur = _dict_cur(conn)
    tid = _get_default_tenant_id(cur)
    if not tid:
        _db_pool.putconn(conn)
        return []
    caps = _build_capabilities_with_fitness(cur, tid)
    _db_pool.putconn(conn)
    return caps


@app.get("/api/capabilities/{cap_id}")
def frontend_get_capability(cap_id: str):
    """
    Return a single capability with agents, tasks, fitness_history, governance_history.
    cap_id can be the synthetic integer id (as string) or a UUID.
    """
    conn = get_db()
    cur = _dict_cur(conn)
    tid = _get_default_tenant_id(cur)
    if not tid:
        _db_pool.putconn(conn)
        raise HTTPException(404, "No tenant found")

    # Determine if cap_id is UUID or synthetic int
    row = None
    try:
        uuid.UUID(cap_id)
        # It's a UUID
        cur.execute("SELECT * FROM capabilities WHERE id = %s AND tenant_id = %s", (cap_id, tid))
        row = cur.fetchone()
    except ValueError:
        # Synthetic int — need to match by scanning
        cur.execute("SELECT * FROM capabilities WHERE tenant_id = %s ORDER BY generation DESC, created_at DESC", (tid,))
        all_caps = cur.fetchall()
        for r in all_caps:
            int_id = int(hashlib.md5(str(r["id"]).encode()).hexdigest()[:8], 16) % 900000 + 100000
            if str(int_id) == str(cap_id):
                row = r
                break

    if not row:
        _db_pool.putconn(conn)
        raise HTTPException(404, "Capability not found")

    # Fitness history
    cur.execute("""
        SELECT * FROM fitness_scores WHERE capability_id = %s
        ORDER BY evaluated_at DESC LIMIT 20
    """, (str(row["id"]),))
    fitness_history = [_ser(f) for f in cur.fetchall()]

    # Governance history
    cur.execute("""
        SELECT * FROM governance_events WHERE capability_id = %s
        ORDER BY created_at DESC LIMIT 20
    """, (str(row["id"]),))
    governance_history = [_ser(g) for g in cur.fetchall()]

    # Latest fitness for shape mapping
    fitness_stub = None
    if fitness_history:
        fitness_stub = {"composite": fitness_history[0].get("composite"), "success_rate": fitness_history[0].get("success_rate")}

    cap_id_str = str(row["id"])
    agent_count = int(_stable_rand(cap_id_str + "agcnt", 2, 8))
    frontend_cap = _cap_to_frontend(dict(row), agent_count=agent_count, fitness_row=fitness_stub)

    # Build synthetic agents for this capability
    agents = _build_synthetic_agents([frontend_cap])

    # Build synthetic tasks
    tasks = _build_synthetic_tasks(frontend_cap)

    _db_pool.putconn(conn)
    return {
        **frontend_cap,
        "agents": agents,
        "tasks": tasks,
        "fitness_history": fitness_history,
        "governance_history": governance_history,
    }


def _build_synthetic_tasks(cap: dict) -> list[dict]:
    """Build a few synthetic tasks for a capability."""
    TASK_TEMPLATES = [
        ("Process incoming vendor invoices", "Automated AP processing for incoming invoices.", "high"),
        ("Run daily reconciliation", "Reconcile ledger entries against bank statements.", "medium"),
        ("Generate weekly performance report", "Aggregate KPIs and publish to stakeholders.", "low"),
        ("Monitor anomaly alerts", "Continuously scan signals for anomalies.", "critical"),
        ("Evaluate supplier contracts", "Review and score active supplier contracts.", "medium"),
    ]
    STATUSES = ["completed", "completed", "in_progress", "pending", "failed"]
    cap_uuid = cap.get("uuid", str(cap["id"]))
    results = []
    count = int(_stable_rand(cap_uuid + "taskcount", 3, 6))
    for i in range(count):
        seed = f"{cap_uuid}_task_{i}"
        tmpl = TASK_TEMPLATES[i % len(TASK_TEMPLATES)]
        status = STATUSES[int(_stable_rand(seed + "s", 0, len(STATUSES) - 0.001))]
        est_cost = round(_stable_rand(seed + "ec", 50, 500), 2)
        actual_cost = round(est_cost * _stable_rand(seed + "ac", 0.8, 1.2), 2) if status == "completed" else 0
        results.append({
            "id": i + 1,
            "capabilityId": cap["id"],
            "agentId": None,
            "title": tmpl[0],
            "description": tmpl[1],
            "priority": tmpl[2],
            "status": status,
            "confidence": round(_stable_rand(seed + "conf", 0.7, 0.99), 3),
            "estimatedCost": est_cost,
            "actualCost": actual_cost,
            "createdAt": cap.get("createdAt", datetime.now(timezone.utc).isoformat()),
            "completedAt": cap.get("createdAt") if status == "completed" else None,
        })
    return results


@app.get("/api/agents")
def frontend_list_agents():
    """Return full agents list synthesized from capabilities."""
    conn = get_db()
    cur = _dict_cur(conn)
    tid = _get_default_tenant_id(cur)
    if not tid:
        _db_pool.putconn(conn)
        return []
    caps = _build_capabilities_with_fitness(cur, tid)
    _db_pool.putconn(conn)
    return _build_synthetic_agents(caps)


@app.get("/api/agents/{agent_id}")
def frontend_get_agent(agent_id: int):
    """Return a single agent by its synthetic id."""
    conn = get_db()
    cur = _dict_cur(conn)
    tid = _get_default_tenant_id(cur)
    if not tid:
        _db_pool.putconn(conn)
        raise HTTPException(404, "No tenant found")
    caps = _build_capabilities_with_fitness(cur, tid)
    _db_pool.putconn(conn)
    agents = _build_synthetic_agents(caps)
    for agent in agents:
        if agent["id"] == agent_id:
            tasks = _build_synthetic_tasks_for_agent(agent)
            return {**agent, "tasks": tasks}
    raise HTTPException(404, "Agent not found")


def _build_synthetic_tasks_for_agent(agent: dict) -> list[dict]:
    """Build synthetic tasks assigned to a specific agent."""
    STATUSES = ["completed", "in_progress", "pending"]
    TEMPLATES = [
        "Process decision batch",
        "Monitor capability health",
        "Execute automated workflow",
        "Evaluate incoming signal",
    ]
    results = []
    seed_base = f"agent_{agent['id']}_"
    count = int(_stable_rand(seed_base + "count", 2, 5))
    for i in range(count):
        seed = seed_base + str(i)
        status = STATUSES[int(_stable_rand(seed + "s", 0, len(STATUSES) - 0.001))]
        est = round(_stable_rand(seed + "ec", 20, 200), 2)
        results.append({
            "id": i + 1,
            "capabilityId": agent.get("capabilityId"),
            "agentId": agent["id"],
            "title": TEMPLATES[i % len(TEMPLATES)],
            "description": f"Automated task for {agent['name']}.",
            "priority": "medium",
            "status": status,
            "confidence": round(_stable_rand(seed + "conf", 0.75, 0.99), 3),
            "estimatedCost": est,
            "actualCost": round(est * 0.95, 2) if status == "completed" else 0,
            "createdAt": agent.get("createdAt", datetime.now(timezone.utc).isoformat()),
            "completedAt": agent.get("createdAt") if status == "completed" else None,
        })
    return results


@app.get("/api/heartbeat")
def frontend_heartbeat():
    """Return agents array with heartbeat/status info (same shape as Express)."""
    conn = get_db()
    cur = _dict_cur(conn)
    tid = _get_default_tenant_id(cur)
    if not tid:
        _db_pool.putconn(conn)
        return []
    caps = _build_capabilities_with_fitness(cur, tid)
    _db_pool.putconn(conn)
    return _build_synthetic_agents(caps)


@app.get("/api/governance")
def frontend_list_governance(limit: int = 50):
    """Return governance events from Postgres + synthetic governance items."""
    conn = get_db()
    cur = _dict_cur(conn)
    tid = _get_default_tenant_id(cur)
    if not tid:
        _db_pool.putconn(conn)
        return []

    # Real governance events from Postgres
    try:
        cur.execute("""
            SELECT ge.*, c.name as cap_name
            FROM governance_events ge
            LEFT JOIN capabilities c ON ge.capability_id = c.id
            WHERE ge.tenant_id = %s
            ORDER BY ge.created_at DESC
            LIMIT %s
        """, (tid, limit))
        pg_rows = cur.fetchall()
    except Exception:
        pg_rows = []

    # Build frontend-shaped governance from real events
    result = []
    for row in pg_rows:
        decision = row.get("decision", "propose")
        # Map Postgres decision → frontend status
        status_map = {"approve": "approved", "veto": "rejected", "rollback": "rejected", "propose": "pending"}
        status = status_map.get(decision, "pending")
        risk_map = {"approve": "medium", "veto": "high", "rollback": "critical", "propose": "medium"}
        result.append({
            "id": row["id"],
            "capabilityId": str(row["capability_id"]) if row.get("capability_id") else None,
            "capabilityName": row.get("cap_name", ""),
            "agentId": None,
            "title": f"Stage transition — {row.get('cap_name', 'capability')} ({row.get('from_stage', '?')} → {row.get('to_stage', '?')})",
            "description": row.get("rationale") or f"Governance event by {row.get('actor', 'system')}: {decision}",
            "riskLevel": risk_map.get(decision, "medium"),
            "category": "capability_lifecycle",
            "status": status,
            "requestedBy": row.get("actor", "system"),
            "reviewedBy": row.get("actor") if decision != "propose" else None,
            "humanResponse": None,
            "financialImpact": 0,
            "createdAt": row["created_at"].isoformat() if isinstance(row["created_at"], datetime) else row.get("created_at"),
            "resolvedAt": None if status == "pending" else (row["created_at"].isoformat() if isinstance(row["created_at"], datetime) else row.get("created_at")),
        })

    # If we have fewer than limit, pad with synthetic ones
    if len(result) < limit:
        caps = _build_capabilities_with_fitness(cur, tid)
        synthetic = _build_synthetic_governance(caps, limit=limit - len(result))
        # Offset ids to avoid collision
        for s in synthetic:
            s["id"] = s["id"] + 100000
        result.extend(synthetic)

    _db_pool.putconn(conn)
    return result[:limit]


class GovernanceResolveBody(BaseModel):
    status: str  # approved, rejected, deferred
    response: Optional[str] = None
    reviewedBy: Optional[str] = None


@app.post("/api/governance/{gov_id}/resolve")
def frontend_resolve_governance(gov_id: int, body: GovernanceResolveBody):
    """Approve/reject a governance event by its id."""
    if body.status not in ("approved", "rejected", "deferred"):
        raise HTTPException(400, "status must be approved, rejected, or deferred")

    # For synthetic ids (> 100000), write a real governance event so it persists
    if gov_id > 100000:
        conn = get_db()
        cur = _dict_cur(conn)
        decision_map = {"approved": "approve", "rejected": "veto", "deferred": "propose"}
        new_decision = decision_map.get(body.status, "propose")
        actor = body.reviewedBy or "human-reviewer"
        try:
            tid = _get_default_tenant_id(cur)
            cur.execute("SELECT this_hash FROM governance_events WHERE tenant_id = %s ORDER BY id DESC LIMIT 1", (tid,))
            prev = cur.fetchone()
            prev_hash = prev["this_hash"] if prev else ""
            payload = json.dumps({
                "gov_id": gov_id, "decision": new_decision, "actor": actor,
                "prev": prev_hash, "ts": datetime.now(timezone.utc).isoformat()
            }, sort_keys=True)
            this_hash = hashlib.sha256(payload.encode()).hexdigest()
            cur.execute("""
                INSERT INTO governance_events
                    (tenant_id, capability_id, from_stage, to_stage, decision, actor, rationale, prev_hash, this_hash)
                VALUES (%s, NULL, NULL, NULL, %s, %s, %s, %s, %s)
            """, (tid, new_decision, actor, body.response or "", prev_hash, this_hash))
            _db_pool.putconn(conn)
        except Exception as e:
            _db_pool.putconn(conn)
            raise HTTPException(500, f"Failed to persist synthetic governance resolution: {e}")
        return {
            "id": gov_id,
            "status": body.status,
            "reviewedBy": body.reviewedBy,
            "humanResponse": body.response,
            "resolvedAt": datetime.now(timezone.utc).isoformat(),
        }

    conn = get_db()
    cur = _dict_cur(conn)

    # Real governance event — map status back to Postgres decision
    decision_map = {"approved": "approve", "rejected": "veto", "deferred": "propose"}
    new_decision = decision_map.get(body.status, "propose")
    actor = body.reviewedBy or "human-reviewer"

    try:
        # Hash chain update
        tid = _get_default_tenant_id(cur)
        cur.execute("SELECT this_hash FROM governance_events WHERE tenant_id = %s ORDER BY id DESC LIMIT 1", (tid,))
        prev = cur.fetchone()
        prev_hash = prev["this_hash"] if prev else ""
        payload = json.dumps({
            "gov_id": gov_id, "decision": new_decision, "actor": actor,
            "prev": prev_hash, "ts": datetime.now(timezone.utc).isoformat()
        }, sort_keys=True)
        this_hash = hashlib.sha256(payload.encode()).hexdigest()

        # Insert a resolution governance event
        cur.execute("""
            INSERT INTO governance_events (tenant_id, capability_id, from_stage, to_stage, decision, actor, rationale, prev_hash, this_hash)
            SELECT tenant_id, capability_id, from_stage, to_stage, %s, %s, %s, %s, %s
            FROM governance_events WHERE id = %s
            RETURNING *
        """, (new_decision, actor, body.response or "", prev_hash, this_hash, gov_id))
        new_row = cur.fetchone()
        _db_pool.putconn(conn)

        if not new_row:
            raise HTTPException(404, "Governance item not found")

        return {
            "id": gov_id,
            "status": body.status,
            "reviewedBy": actor,
            "humanResponse": body.response,
            "resolvedAt": datetime.now(timezone.utc).isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        _db_pool.putconn(conn)
        raise HTTPException(500, f"Failed to resolve governance: {e}")


@app.get("/api/activity")
def frontend_activity(limit: int = Query(50, le=200)):
    """Return activity log entries from signals/governance."""
    conn = get_db()
    cur = _dict_cur(conn)
    tid = _get_default_tenant_id(cur)
    if not tid:
        _db_pool.putconn(conn)
        return []
    activities = _build_activity_from_signals(cur, tid, limit=limit)
    _db_pool.putconn(conn)
    return activities


@app.get("/api/evolution")
def frontend_evolution(limit: int = Query(20, le=100)):
    """Return evolution history from fitness_scores."""
    conn = get_db()
    cur = _dict_cur(conn)
    tid = _get_default_tenant_id(cur)
    if not tid:
        _db_pool.putconn(conn)
        return []
    result = _build_evolution_from_fitness(cur, tid, limit=limit)
    _db_pool.putconn(conn)
    return result


@app.get("/api/council")
def frontend_council(limit: int = Query(20, le=100)):
    """Return council reviews derived from governance_events."""
    conn = get_db()
    cur = _dict_cur(conn)
    tid = _get_default_tenant_id(cur)
    if not tid:
        _db_pool.putconn(conn)
        return []
    result = _build_council_from_governance(cur, tid, limit=limit)
    _db_pool.putconn(conn)
    return result


@app.get("/api/costs")
def frontend_costs(limit: int = Query(100, le=500)):
    """Return cost events (synthetic, derived from capabilities)."""
    conn = get_db()
    cur = _dict_cur(conn)
    tid = _get_default_tenant_id(cur)
    if not tid:
        _db_pool.putconn(conn)
        return []
    caps = _build_capabilities_with_fitness(cur, tid)
    _db_pool.putconn(conn)

    EVENT_TYPES = ["compute", "api_call", "data_transfer", "storage"]
    DESCRIPTIONS = {
        "compute": ["ML inference batch", "Optimization solver run", "Model scoring pass"],
        "api_call": ["External API call", "Rate quote lookup", "Identity verification"],
        "data_transfer": ["EDI sync", "Telemetry ingest", "Delta sync"],
        "storage": ["Snapshot save", "Transaction archive", "Audit trail flush"],
    }
    result = []
    event_id = 1
    for cap in caps:
        cap_uuid = cap.get("uuid", "")
        daily_rate = cap.get("budgetAllocated", 0) / 365.0
        for d in range(min(30, limit // max(len(caps), 1))):
            seed = f"{cap_uuid}_cost_{d}"
            et_idx = int(_stable_rand(seed + "et", 0, len(EVENT_TYPES) - 0.001))
            et = EVENT_TYPES[et_idx]
            descs = DESCRIPTIONS[et]
            desc_idx = int(_stable_rand(seed + "desc", 0, len(descs) - 0.001))
            amount = round(daily_rate * _stable_rand(seed + "amt", 0.6, 1.4), 2)
            days_ago = d
            created = (datetime.now(timezone.utc) - timedelta(days=days_ago)).isoformat()
            result.append({
                "id": event_id,
                "capabilityId": cap["id"],
                "agentId": None,
                "eventType": et,
                "amount": amount,
                "currency": "USD",
                "description": descs[desc_idx],
                "dayOffset": days_ago,
                "createdAt": created,
            })
            event_id += 1
            if len(result) >= limit:
                break
        if len(result) >= limit:
            break

    return result


@app.get("/api/costs/daily")
def frontend_costs_daily(days: int = Query(30, le=365)):
    """Return daily cost totals derived from capabilities budgets."""
    conn = get_db()
    cur = _dict_cur(conn)
    tid = _get_default_tenant_id(cur)
    if not tid:
        _db_pool.putconn(conn)
        return []
    caps = _build_capabilities_with_fitness(cur, tid)
    _db_pool.putconn(conn)
    return _build_cost_trend(caps, days=days)


@app.get("/api/migration")
def frontend_migration():
    """Return legacy migration map synthesized from capabilities."""
    conn = get_db()
    cur = _dict_cur(conn)
    tid = _get_default_tenant_id(cur)
    if not tid:
        _db_pool.putconn(conn)
        return []
    caps = _build_capabilities_with_fitness(cur, tid)
    _db_pool.putconn(conn)
    return _build_synthetic_migration(caps)


@app.get("/api/composition")
def frontend_composition():
    """Return composition links between capabilities."""
    conn = get_db()
    cur = _dict_cur(conn)
    tid = _get_default_tenant_id(cur)
    if not tid:
        _db_pool.putconn(conn)
        return []
    caps = _build_capabilities_with_fitness(cur, tid)
    _db_pool.putconn(conn)
    return _build_synthetic_composition(caps)


# ═══════════════════════════════════════════════════════════════════════════════
# ═══ EXISTING TENANT-SCOPED ROUTES (all preserved) ═══
# ═══════════════════════════════════════════════════════════════════════════════

# ═══ TENANTS ═══
@app.get("/api/tenants/{slug}")
def get_tenant(slug: str):
    conn = get_db(); cur = _dict_cur(conn)
    cur.execute("SELECT * FROM tenants WHERE slug = %s", (slug,))
    row = cur.fetchone(); _db_pool.putconn(conn)
    if not row: raise HTTPException(404, "Not found")
    return _ser(row)


# ═══ CAPABILITIES (the genome pool) ═══
@app.get("/api/tenants/{slug}/capabilities")
def list_capabilities(slug: str, stage: Optional[str] = None):
    conn = get_db(); cur = _dict_cur(conn); tid = _tenant_id(cur, slug)
    q = "SELECT c.*, (SELECT composite FROM fitness_scores WHERE capability_id=c.id ORDER BY evaluated_at DESC LIMIT 1) as latest_fitness FROM capabilities c WHERE c.tenant_id=%s"
    p: list = [tid]
    if stage: q += " AND c.stage=%s"; p.append(stage)
    q += " ORDER BY c.generation DESC, c.created_at DESC"
    cur.execute(q, p); rows = cur.fetchall(); _db_pool.putconn(conn)
    return [_ser(r) for r in rows]


@app.get("/api/tenants/{slug}/capabilities/{cap_id}")
def get_capability(slug: str, cap_id: str):
    conn = get_db(); cur = _dict_cur(conn)
    cur.execute("SELECT * FROM capabilities WHERE id=%s", (cap_id,))
    row = cur.fetchone()
    if not row: _db_pool.putconn(conn); raise HTTPException(404, "Not found")
    # Get fitness history
    cur.execute("SELECT * FROM fitness_scores WHERE capability_id=%s ORDER BY evaluated_at DESC LIMIT 20", (cap_id,))
    fitness = cur.fetchall()
    # Get governance events
    cur.execute("SELECT * FROM governance_events WHERE capability_id=%s ORDER BY created_at DESC LIMIT 20", (cap_id,))
    gov = cur.fetchall()
    _db_pool.putconn(conn)
    return {**_ser(row), "fitness_history": [_ser(f) for f in fitness], "governance_history": [_ser(g) for g in gov]}


class CapabilityCreate(BaseModel):
    name: str; slug: str; kind: str; stage: str = "proposed"
    generation: int = 1; manifest: dict = {}; code: str = ""
    eval_suite: str = ""; budget_monthly_usd: float = 500
    created_by: str = "system"; parent_id: Optional[str] = None


@app.post("/api/tenants/{slug}/capabilities")
def create_capability(slug: str, body: CapabilityCreate):
    conn = get_db(); cur = _dict_cur(conn); tid = _tenant_id(cur, slug)
    cur.execute("""INSERT INTO capabilities (tenant_id,name,slug,kind,stage,generation,parent_id,manifest,code,eval_suite,budget_monthly_usd,created_by)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
        (tid, body.name, body.slug, body.kind, body.stage, body.generation,
         body.parent_id, json.dumps(body.manifest), body.code, body.eval_suite,
         body.budget_monthly_usd, body.created_by))
    row = cur.fetchone(); _db_pool.putconn(conn)
    return _ser(row)


# ═══ FITNESS SCORES ═══
@app.get("/api/tenants/{slug}/fitness")
def list_fitness(slug: str, capability_id: Optional[str] = None, limit: int = 50):
    conn = get_db(); cur = _dict_cur(conn); _tenant_id(cur, slug)
    q = "SELECT f.* FROM fitness_scores f JOIN capabilities c ON f.capability_id=c.id WHERE c.tenant_id=(SELECT id FROM tenants WHERE slug=%s)"
    p: list = [slug]
    if capability_id: q += " AND f.capability_id=%s"; p.append(capability_id)
    q += " ORDER BY f.evaluated_at DESC LIMIT %s"; p.append(limit)
    cur.execute(q, p); rows = cur.fetchall(); _db_pool.putconn(conn)
    return [_ser(r) for r in rows]


# ═══ GOVERNANCE EVENTS (hash-chained audit ledger) ═══
@app.get("/api/tenants/{slug}/governance")
def list_governance(slug: str, limit: int = 50):
    conn = get_db(); cur = _dict_cur(conn); tid = _tenant_id(cur, slug)
    cur.execute("SELECT * FROM governance_events WHERE tenant_id=%s ORDER BY created_at DESC LIMIT %s", (tid, limit))
    rows = cur.fetchall(); _db_pool.putconn(conn)
    return [_ser(r) for r in rows]


class GovernanceCreate(BaseModel):
    capability_id: str; from_stage: Optional[str] = None; to_stage: Optional[str] = None
    decision: str; actor: str; rationale: Optional[str] = None


@app.post("/api/tenants/{slug}/governance")
def create_governance(slug: str, body: GovernanceCreate):
    conn = get_db(); cur = _dict_cur(conn); tid = _tenant_id(cur, slug)
    # Get previous hash for chain
    cur.execute("SELECT this_hash FROM governance_events WHERE tenant_id=%s ORDER BY id DESC LIMIT 1", (tid,))
    prev = cur.fetchone()
    prev_hash = prev["this_hash"] if prev else ""
    # Compute hash
    payload = json.dumps({"cap": body.capability_id, "decision": body.decision, "actor": body.actor,
                          "from": body.from_stage, "to": body.to_stage, "prev": prev_hash,
                          "ts": datetime.now(timezone.utc).isoformat()}, sort_keys=True)
    this_hash = hashlib.sha256(payload.encode()).hexdigest()
    cur.execute("""INSERT INTO governance_events (tenant_id,capability_id,from_stage,to_stage,decision,actor,rationale,prev_hash,this_hash)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
        (tid, body.capability_id, body.from_stage, body.to_stage, body.decision,
         body.actor, body.rationale, prev_hash, this_hash))
    row = cur.fetchone(); _db_pool.putconn(conn)
    # Publish to Redis
    try:
        get_redis().xadd("governance_stream", {"data": json.dumps(_ser(row))})
    except Exception:
        logger.exception("Failed to publish governance event to Redis stream")
    return _ser(row)


# ═══ SIGNALS (Signal Bus persistence) ═══
@app.get("/api/tenants/{slug}/signals")
def list_signals(slug: str, source: Optional[str] = None, kind: Optional[str] = None,
                 limit: int = Query(50, le=500), offset: int = 0):
    conn = get_db(); cur = _dict_cur(conn); tid = _tenant_id(cur, slug)
    q = "SELECT id,source,kind,payload,clustered_into,ingested_at FROM signals WHERE tenant_id=%s"
    p: list = [tid]
    if source: q += " AND source=%s"; p.append(source)
    if kind: q += " AND kind=%s"; p.append(kind)
    q += " ORDER BY ingested_at DESC LIMIT %s OFFSET %s"; p.extend([limit, offset])
    cur.execute(q, p); rows = cur.fetchall()
    cur.execute("SELECT COUNT(*) FROM signals WHERE tenant_id=%s", (tid,))
    total = cur.fetchone()["count"]; _db_pool.putconn(conn)
    page = offset // limit + 1
    return {"items": [_ser(r) for r in rows], "total": total, "page": page, "page_size": limit}


@app.get("/api/tenants/{slug}/signals/{sig_id}")
def get_signal(slug: str, sig_id: int):
    conn = get_db(); cur = _dict_cur(conn)
    cur.execute("SELECT id,source,kind,payload,clustered_into,ingested_at FROM signals WHERE id=%s", (sig_id,))
    row = cur.fetchone(); _db_pool.putconn(conn)
    if not row: raise HTTPException(404, "Not found")
    return _ser(row)


# ═══ CAPABILITY GAPS ═══
@app.get("/api/tenants/{slug}/gaps")
def list_gaps(slug: str, status: Optional[str] = None):
    conn = get_db(); cur = _dict_cur(conn); tid = _tenant_id(cur, slug)
    q = "SELECT * FROM capability_gaps WHERE tenant_id=%s"
    p: list = [tid]
    if status: q += " AND status=%s"; p.append(status)
    q += " ORDER BY expected_fitness_impact DESC NULLS LAST"
    cur.execute(q, p); rows = cur.fetchall(); _db_pool.putconn(conn)
    return [_ser(r) for r in rows]


# ═══ CONVENIENCE ROUTES (default tenant: acme_robotics) ═══
DEFAULT_TENANT = "acme_robotics"

@app.get("/api/gaps")
def list_gaps_default(status: Optional[str] = None):
    return list_gaps(DEFAULT_TENANT, status)

@app.get("/api/gaps/{gap_id}/signals")
def list_signals_for_gap(gap_id: str):
    conn = get_db(); cur = _dict_cur(conn)
    # First get the evidence_signal_ids from the gap
    cur.execute("SELECT evidence_signal_ids FROM capability_gaps WHERE id=%s", (gap_id,))
    gap_row = cur.fetchone()
    if not gap_row or not gap_row.get('evidence_signal_ids'):
        _db_pool.putconn(conn)
        return []
    sig_ids = gap_row['evidence_signal_ids']
    cur.execute(
        "SELECT id,source,kind,payload,clustered_into,ingested_at FROM signals WHERE id = ANY(%s) ORDER BY id",
        (sig_ids,)
    )
    rows = cur.fetchall(); _db_pool.putconn(conn)
    return [_ser(r) for r in rows]

@app.post("/api/generator/generate")
def generate_from_gap_default(body: dict):
    return generate_from_gap(DEFAULT_TENANT, body)

@app.post("/api/arena/evaluate/{cap_id}")
def evaluate_capability_default(cap_id: str):
    return evaluate_capability(DEFAULT_TENANT, cap_id)

@app.post("/api/real/capabilities/{cap_id}/transition")
def transition_capability_default(cap_id: str, body: dict):
    return transition_capability(DEFAULT_TENANT, cap_id, body)


# ═══ REFLECTION LOOP ═══
@app.post("/api/reflection/run")
def run_reflection(api_key: str = Depends(verify_api_key)):
    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    from apps.api.reflection import run_reflection_loop
    result = run_reflection_loop("acme_robotics")
    return result


# ═══ GENERATOR (Checkpoint 4) ═══
@app.post("/api/tenants/{slug}/generator/generate")
def generate_from_gap(slug: str, body: dict):
    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    from apps.api.generator import generate_capability
    gap_id = body.get("gap_id")
    if not gap_id:
        raise HTTPException(400, "gap_id required")
    return generate_capability(gap_id, slug)


@app.post("/api/tenants/{slug}/generator/generate-all")
def generate_all(slug: str):
    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    from apps.api.generator import generate_all_from_gaps
    return generate_all_from_gaps(slug)


# ═══ ARENA + FITNESS (Checkpoint 5) ═══
@app.post("/api/tenants/{slug}/arena/evaluate/{cap_id}")
def evaluate_capability(slug: str, cap_id: str):
    """Run eval suite for a capability in the sandbox, compute fitness."""
    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    from packages.sandbox.runner import SandboxRunner, CapabilityManifest
    conn = get_db(); cur = _dict_cur(conn)
    cur.execute("SELECT * FROM capabilities WHERE id = %s", (cap_id,))
    cap = cur.fetchone()
    if not cap:
        _db_pool.putconn(conn); raise HTTPException(404, "Capability not found")

    # Write code to temp file and run eval
    import tempfile
    from pathlib import Path
    skills_dir = Path(__file__).parent.parent.parent / "packages" / "skills" / "generated" / cap["slug"]
    code_path = skills_dir / "capability.py"
    eval_path = skills_dir / "eval.jsonl"

    if not code_path.exists():
        _db_pool.putconn(conn)
        return {"error": "No capability code on disk", "slug": cap["slug"]}

    manifest = CapabilityManifest(
        id=cap["slug"], name=cap["name"], kind=cap["kind"],
        code_path=str(code_path), tools=[], budget_monthly_usd=float(cap["budget_monthly_usd"]),
    )

    if not eval_path.exists():
        _db_pool.putconn(conn)
        return {"error": "No eval suite on disk"}

    results = SandboxRunner.run_eval(manifest, str(eval_path))
    passed = sum(1 for r in results if r["passed"])
    total = len(results)
    success_rate = passed / total if total > 0 else 0
    avg_latency = sum(r["duration_ms"] for r in results) / total if total > 0 else 0
    cost_per_run = sum(r.get("cost_usd", 0.001) for r in results) / total if total > 0 else 0

    # Fitness = 0.5*success + 0.2*(1-cost_norm) + 0.2*(1-latency_norm) + 0.1*trust_delta
    cost_norm = min(1.0, cost_per_run / 0.01)  # $0.01 is expensive
    latency_norm = min(1.0, avg_latency / 5000)  # 5s is slow
    trust_delta = 0.1 if success_rate > 0.7 else -0.1
    composite = round(0.5 * success_rate + 0.2 * (1 - cost_norm) + 0.2 * (1 - latency_norm) + 0.1 * trust_delta, 4)

    # Write fitness score
    cur.execute("""INSERT INTO fitness_scores (capability_id, generation, success_rate, avg_latency_ms,
        cost_per_run_usd, trust_delta, automation_delta, composite)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING *""",
        (cap_id, cap["generation"], round(success_rate, 4), int(avg_latency),
         round(cost_per_run, 4), round(trust_delta, 4), 0.0, composite))
    fitness = dict(cur.fetchone())
    _db_pool.putconn(conn)

    return {
        "capability_id": cap_id,
        "eval_results": {"passed": passed, "total": total, "success_rate": round(success_rate, 3)},
        "fitness": {"composite": composite, "success_rate": round(success_rate, 4),
                    "avg_latency_ms": int(avg_latency), "cost_per_run": round(cost_per_run, 4)},
        "details": [{"case": r["case"], "passed": r["passed"], "duration_ms": r["duration_ms"]} for r in results],
    }


# ═══ GOVERNANCE STAGE TRANSITIONS (Checkpoint 5) ═══
@app.post("/api/tenants/{slug}/capabilities/{cap_id}/transition")
def transition_capability(slug: str, cap_id: str, body: dict):
    """Propose a stage transition for a capability. Creates governance event."""
    to_stage = body.get("to_stage")
    actor = body.get("actor", "system")
    rationale = body.get("rationale", "")
    if not to_stage:
        raise HTTPException(400, "to_stage required")

    conn = get_db(); cur = _dict_cur(conn); tid = _tenant_id(cur, slug)
    cur.execute("SELECT * FROM capabilities WHERE id = %s", (cap_id,))
    cap = cur.fetchone()
    if not cap:
        _db_pool.putconn(conn); raise HTTPException(404, "Not found")

    from_stage = cap["stage"]

    # Validate transition
    valid = {
        "proposed": ["shadow", "archived"],
        "shadow": ["canary", "proposed"],
        "canary": ["production", "shadow"],
        "production": ["retiring"],
        "retiring": ["deprecated"],
    }
    if to_stage not in valid.get(from_stage, []):
        _db_pool.putconn(conn)
        raise HTTPException(400, f"Invalid transition {from_stage} -> {to_stage}")

    # Hash chain
    cur.execute("SELECT this_hash FROM governance_events WHERE tenant_id = %s ORDER BY id DESC LIMIT 1", (tid,))
    prev = cur.fetchone()
    prev_hash = prev["this_hash"] if prev else ""
    import hashlib
    event_data = json.dumps({"cap": cap_id, "from": from_stage, "to": to_stage,
        "actor": actor, "prev": prev_hash}, sort_keys=True)
    this_hash = hashlib.sha256(event_data.encode()).hexdigest()

    decision = "approve" if to_stage in ["shadow", "canary", "production"] else "rollback"
    cur.execute("""INSERT INTO governance_events (tenant_id, capability_id, from_stage, to_stage, decision, actor, rationale, prev_hash, this_hash)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *""",
        (tid, cap_id, from_stage, to_stage, decision, actor, rationale, prev_hash, this_hash))
    gov = dict(cur.fetchone())

    # Update capability stage
    cur.execute("UPDATE capabilities SET stage = %s WHERE id = %s", (to_stage, cap_id))
    _db_pool.putconn(conn)

    return {"governance_event": _ser(gov), "capability_id": cap_id, "from": from_stage, "to": to_stage}


# ═══ GOVERNANCE CHAIN VERIFICATION ═══
@app.get("/api/tenants/{slug}/governance/verify")
def verify_chain(slug: str):
    """Walk the hash chain and verify integrity."""
    conn = get_db(); cur = _dict_cur(conn); tid = _tenant_id(cur, slug)
    cur.execute("SELECT id, prev_hash, this_hash FROM governance_events WHERE tenant_id = %s ORDER BY id", (tid,))
    events = cur.fetchall()
    _db_pool.putconn(conn)

    if not events:
        return {"valid": True, "chain_length": 0}

    for i, evt in enumerate(events):
        if i == 0:
            continue
        if evt["prev_hash"] != events[i-1]["this_hash"]:
            return {"valid": False, "broken_at": evt["id"], "expected": events[i-1]["this_hash"], "got": evt["prev_hash"]}

    return {"valid": True, "chain_length": len(events)}


# ═══ DEMO RESET (Checkpoint 6) ═══
@app.post("/api/demo/reset")
def demo_reset(api_key: str = Depends(verify_api_key)):
    """Reset Acme tenant to t+0 state."""
    conn = get_db(); cur = conn.cursor()
    cur.execute("SELECT id FROM tenants WHERE slug = 'acme_robotics'")
    row = cur.fetchone()
    if not row:
        _db_pool.putconn(conn); return {"error": "No acme tenant"}
    tid = row[0]
    cur.execute("DELETE FROM fitness_scores WHERE capability_id IN (SELECT id FROM capabilities WHERE tenant_id = %s)", (tid,))
    cur.execute("DELETE FROM governance_events WHERE tenant_id = %s", (tid,))
    cur.execute("DELETE FROM capabilities WHERE tenant_id = %s", (tid,))
    cur.execute("DELETE FROM capability_gaps WHERE tenant_id = %s", (tid,))
    cur.execute("UPDATE signals SET clustered_into = NULL, embedding = NULL WHERE tenant_id = %s", (tid,))
    conn.commit()
    _db_pool.putconn(conn)
    return {"status": "reset", "tenant": "acme_robotics"}


# ═══ DEMO FULL-RESET (Checkpoint 6+) ═══
@app.post("/api/demo/full-reset")
def demo_full_reset(api_key: str = Depends(verify_api_key)):
    """Full reset: clear all generated data, reset signal clusters, delete generated skill files, then re-run reflection loop."""
    import sys, os, shutil
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

    conn = get_db(); cur = conn.cursor()
    cur.execute("SELECT id FROM tenants WHERE slug = 'acme_robotics'")
    row = cur.fetchone()
    if not row:
        _db_pool.putconn(conn); return {"error": "No acme tenant"}
    tid = row[0]

    # 1. Delete generated capability data
    cur.execute("DELETE FROM fitness_scores WHERE capability_id IN (SELECT id FROM capabilities WHERE tenant_id = %s)", (tid,))
    cur.execute("DELETE FROM governance_events WHERE tenant_id = %s", (tid,))
    cur.execute("DELETE FROM capabilities WHERE tenant_id = %s", (tid,))
    cur.execute("DELETE FROM capability_gaps WHERE tenant_id = %s", (tid,))

    # 2. Reset signals.clustered_into to NULL (keep embeddings to avoid re-embedding)
    cur.execute("UPDATE signals SET clustered_into = NULL WHERE tenant_id = %s", (tid,))

    conn.commit()
    _db_pool.putconn(conn)

    # 3. Delete generated skill directories
    generated_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "packages", "skills", "generated"
    )
    if os.path.isdir(generated_dir):
        for entry in os.listdir(generated_dir):
            entry_path = os.path.join(generated_dir, entry)
            if os.path.isdir(entry_path):
                shutil.rmtree(entry_path)
            else:
                os.remove(entry_path)

    # 4. Re-run reflection loop to regenerate gaps
    from apps.api.reflection import run_reflection_loop
    result = run_reflection_loop("acme_robotics")
    gaps_created = result.get("gaps_created", 0) if isinstance(result, dict) else 0

    return {"status": "reset_complete", "gaps_created": gaps_created}


# ═══ AGENT GATEWAY (External Agents) ═══
@app.get("/api/tenants/{slug}/external-agents")
def list_external_agents(slug: str, kind: Optional[str] = None):
    conn = get_db(); cur = _dict_cur(conn); tid = _tenant_id(cur, slug)
    q = "SELECT * FROM external_agents WHERE tenant_id=%s"
    p: list = [tid]
    if kind: q += " AND kind=%s"; p.append(kind)
    q += " ORDER BY trust_score DESC"
    cur.execute(q, p); rows = cur.fetchall(); _db_pool.putconn(conn)
    return [_ser(r) for r in rows]


@app.get("/api/tenants/{slug}/external-agents/{agent_id}")
def get_external_agent(slug: str, agent_id: str):
    conn = get_db(); cur = _dict_cur(conn)
    cur.execute("SELECT * FROM external_agents WHERE id=%s", (agent_id,))
    agent = cur.fetchone()
    if not agent: _db_pool.putconn(conn); raise HTTPException(404, "Not found")
    cur.execute("SELECT * FROM agent_interactions WHERE external_agent_id=%s ORDER BY created_at DESC LIMIT 20", (agent_id,))
    interactions = cur.fetchall(); _db_pool.putconn(conn)
    return {**_ser(agent), "recent_interactions": [_ser(i) for i in interactions]}


@app.get("/api/tenants/{slug}/interactions")
def list_interactions(slug: str, kind: Optional[str] = None, status: Optional[str] = None, limit: int = 50):
    conn = get_db(); cur = _dict_cur(conn); tid = _tenant_id(cur, slug)
    q = "SELECT i.*, e.name as agent_name, e.organization, e.kind as agent_kind, e.trust_score as agent_trust FROM agent_interactions i JOIN external_agents e ON i.external_agent_id=e.id WHERE i.tenant_id=%s"
    p: list = [tid]
    if kind: q += " AND e.kind=%s"; p.append(kind)
    if status: q += " AND i.status=%s"; p.append(status)
    q += " ORDER BY i.created_at DESC LIMIT %s"; p.append(limit)
    cur.execute(q, p); rows = cur.fetchall()
    cur.execute("SELECT count(*) FROM agent_interactions WHERE tenant_id=%s", (tid,))
    total = cur.fetchone()["count"]; _db_pool.putconn(conn)
    return {"items": [_ser(r) for r in rows], "total": total}


@app.get("/api/tenants/{slug}/gateway/stats")
def gateway_stats(slug: str):
    conn = get_db(); cur = _dict_cur(conn); tid = _tenant_id(cur, slug)
    cur.execute("SELECT count(*) as total, count(*) FILTER (WHERE kind='vendor') as vendors, count(*) FILTER (WHERE kind='customer') as customers FROM external_agents WHERE tenant_id=%s", (tid,))
    agents = dict(cur.fetchone())
    cur.execute("SELECT count(*) as total, count(*) FILTER (WHERE status='completed') as completed, count(*) FILTER (WHERE status='escalated') as escalated, count(*) FILTER (WHERE governance_required) as governed, avg(latency_ms) as avg_latency FROM agent_interactions WHERE tenant_id=%s", (tid,))
    interactions = dict(cur.fetchone())
    cur.execute("SELECT interaction_type, count(*) as cnt FROM agent_interactions WHERE tenant_id=%s GROUP BY interaction_type ORDER BY cnt DESC", (tid,))
    by_type = {r["interaction_type"]: r["cnt"] for r in cur.fetchall()}
    cur.execute("SELECT e.kind, avg(e.trust_score) as avg_trust FROM external_agents e WHERE e.tenant_id=%s GROUP BY e.kind", (tid,))
    trust_by_kind = {r["kind"]: round(float(r["avg_trust"]), 4) for r in cur.fetchall()}
    _db_pool.putconn(conn)
    return {"agents": agents, "interactions": {**interactions, "avg_latency_ms": round(float(interactions["avg_latency"] or 0))}, "by_type": by_type, "trust_by_kind": trust_by_kind}


# ═══ DASHBOARD (tenant-scoped) ═══
@app.get("/api/tenants/{slug}/dashboard")
def dashboard(slug: str):
    conn = get_db(); cur = _dict_cur(conn); tid = _tenant_id(cur, slug)
    # Capabilities
    cur.execute("SELECT COUNT(*) as cnt FROM capabilities WHERE tenant_id=%s", (tid,))
    cap_count = cur.fetchone()["cnt"]
    cur.execute("SELECT stage, COUNT(*) as cnt FROM capabilities WHERE tenant_id=%s GROUP BY stage", (tid,))
    stages = {r["stage"]: r["cnt"] for r in cur.fetchall()}
    # Latest generation
    cur.execute("SELECT MAX(generation) as g FROM capabilities WHERE tenant_id=%s", (tid,))
    gen = cur.fetchone()["g"] or 1
    # Avg fitness (latest per capability)
    cur.execute("""SELECT AVG(f.composite) as avg_fitness FROM (
        SELECT DISTINCT ON (capability_id) composite FROM fitness_scores
        WHERE capability_id IN (SELECT id FROM capabilities WHERE tenant_id=%s)
        ORDER BY capability_id, evaluated_at DESC) f""", (tid,))
    avg_fit = cur.fetchone()["avg_fitness"]
    # Signals
    cur.execute("SELECT COUNT(*) FROM signals WHERE tenant_id=%s", (tid,))
    sig_count = cur.fetchone()["count"]
    cur.execute("SELECT source, COUNT(*) as cnt FROM signals WHERE tenant_id=%s GROUP BY source", (tid,))
    sig_sources = {r["source"]: r["cnt"] for r in cur.fetchall()}
    # Gaps
    cur.execute("SELECT COUNT(*) FROM capability_gaps WHERE tenant_id=%s AND status='open'", (tid,))
    open_gaps = cur.fetchone()["count"]
    # Governance
    cur.execute("SELECT COUNT(*) FROM governance_events WHERE tenant_id=%s", (tid,))
    gov_count = cur.fetchone()["count"]
    _db_pool.putconn(conn)
    return {
        "tenant": slug, "generation": gen,
        "capabilities": {"count": cap_count, "by_stage": stages},
        "fitness": {"avg_composite": float(avg_fit) if avg_fit else 0.0},
        "signals": {"count": sig_count, "by_source": sig_sources},
        "gaps_open": open_gaps, "governance_events": gov_count,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
