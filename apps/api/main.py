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
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Optional

import psycopg2
import psycopg2.extras
import redis
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://fluid:fluid_dev_2026@localhost:5432/fluid_enterprise")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("fluid_api")


def get_db():
    conn = psycopg2.connect(DATABASE_URL)
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Fluid Enterprise API starting")
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM tenants")
        logger.info(f"DB connected. {cur.fetchone()[0]} tenant(s).")
        conn.close()
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
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


# ═══ HEALTH ═══
@app.get("/health")
def health():
    checks = {"api": "ok", "database": "unknown", "redis": "unknown"}
    try:
        conn = get_db(); cur = conn.cursor(); cur.execute("SELECT 1"); checks["database"] = "ok"; conn.close()
    except Exception as e:
        checks["database"] = f"error: {e}"
    try:
        get_redis().ping(); checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"error: {e}"
    return {"status": "healthy" if all(v == "ok" for v in checks.values()) else "degraded", "checks": checks}


# ═══ TENANTS ═══
@app.get("/api/tenants/{slug}")
def get_tenant(slug: str):
    conn = get_db(); cur = _dict_cur(conn)
    cur.execute("SELECT * FROM tenants WHERE slug = %s", (slug,))
    row = cur.fetchone(); conn.close()
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
    cur.execute(q, p); rows = cur.fetchall(); conn.close()
    return [_ser(r) for r in rows]


@app.get("/api/tenants/{slug}/capabilities/{cap_id}")
def get_capability(slug: str, cap_id: str):
    conn = get_db(); cur = _dict_cur(conn)
    cur.execute("SELECT * FROM capabilities WHERE id=%s", (cap_id,))
    row = cur.fetchone()
    if not row: conn.close(); raise HTTPException(404, "Not found")
    # Get fitness history
    cur.execute("SELECT * FROM fitness_scores WHERE capability_id=%s ORDER BY evaluated_at DESC LIMIT 20", (cap_id,))
    fitness = cur.fetchall()
    # Get governance events
    cur.execute("SELECT * FROM governance_events WHERE capability_id=%s ORDER BY created_at DESC LIMIT 20", (cap_id,))
    gov = cur.fetchall()
    conn.close()
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
    row = cur.fetchone(); conn.close()
    return _ser(row)


# ═══ FITNESS SCORES ═══
@app.get("/api/tenants/{slug}/fitness")
def list_fitness(slug: str, capability_id: Optional[str] = None, limit: int = 50):
    conn = get_db(); cur = _dict_cur(conn); _tenant_id(cur, slug)
    q = "SELECT f.* FROM fitness_scores f JOIN capabilities c ON f.capability_id=c.id WHERE c.tenant_id=(SELECT id FROM tenants WHERE slug=%s)"
    p: list = [slug]
    if capability_id: q += " AND f.capability_id=%s"; p.append(capability_id)
    q += " ORDER BY f.evaluated_at DESC LIMIT %s"; p.append(limit)
    cur.execute(q, p); rows = cur.fetchall(); conn.close()
    return [_ser(r) for r in rows]


# ═══ GOVERNANCE EVENTS (hash-chained audit ledger) ═══
@app.get("/api/tenants/{slug}/governance")
def list_governance(slug: str, limit: int = 50):
    conn = get_db(); cur = _dict_cur(conn); tid = _tenant_id(cur, slug)
    cur.execute("SELECT * FROM governance_events WHERE tenant_id=%s ORDER BY created_at DESC LIMIT %s", (tid, limit))
    rows = cur.fetchall(); conn.close()
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
    row = cur.fetchone(); conn.close()
    # Publish to Redis
    try: get_redis().xadd("governance_stream", {"data": json.dumps(_ser(row))})
    except: pass
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
    total = cur.fetchone()["count"]; conn.close()
    page = offset // limit + 1
    return {"items": [_ser(r) for r in rows], "total": total, "page": page, "page_size": limit}


@app.get("/api/tenants/{slug}/signals/{sig_id}")
def get_signal(slug: str, sig_id: int):
    conn = get_db(); cur = _dict_cur(conn)
    cur.execute("SELECT id,source,kind,payload,clustered_into,ingested_at FROM signals WHERE id=%s", (sig_id,))
    row = cur.fetchone(); conn.close()
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
    cur.execute(q, p); rows = cur.fetchall(); conn.close()
    return [_ser(r) for r in rows]


# ═══ REFLECTION LOOP ═══
@app.post("/api/reflection/run")
def run_reflection():
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
        conn.close(); raise HTTPException(404, "Capability not found")

    # Write code to temp file and run eval
    import tempfile
    from pathlib import Path
    skills_dir = Path(__file__).parent.parent.parent / "packages" / "skills" / "generated" / cap["slug"]
    code_path = skills_dir / "capability.py"
    eval_path = skills_dir / "eval.jsonl"

    if not code_path.exists():
        conn.close()
        return {"error": "No capability code on disk", "slug": cap["slug"]}

    manifest = CapabilityManifest(
        id=cap["slug"], name=cap["name"], kind=cap["kind"],
        code_path=str(code_path), tools=[], budget_monthly_usd=float(cap["budget_monthly_usd"]),
    )

    if not eval_path.exists():
        conn.close()
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
    conn.close()

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
        conn.close(); raise HTTPException(404, "Not found")

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
        conn.close()
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
    conn.close()

    return {"governance_event": _ser(gov), "capability_id": cap_id, "from": from_stage, "to": to_stage}


# ═══ GOVERNANCE CHAIN VERIFICATION ═══
@app.get("/api/tenants/{slug}/governance/verify")
def verify_chain(slug: str):
    """Walk the hash chain and verify integrity."""
    conn = get_db(); cur = _dict_cur(conn); tid = _tenant_id(cur, slug)
    cur.execute("SELECT id, prev_hash, this_hash FROM governance_events WHERE tenant_id = %s ORDER BY id", (tid,))
    events = cur.fetchall()
    conn.close()

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
def demo_reset():
    """Reset Acme tenant to t+0 state."""
    conn = get_db(); cur = conn.cursor()
    cur.execute("SELECT id FROM tenants WHERE slug = 'acme_robotics'")
    row = cur.fetchone()
    if not row:
        conn.close(); return {"error": "No acme tenant"}
    tid = row[0]
    cur.execute("DELETE FROM fitness_scores WHERE capability_id IN (SELECT id FROM capabilities WHERE tenant_id = %s)", (tid,))
    cur.execute("DELETE FROM governance_events WHERE tenant_id = %s", (tid,))
    cur.execute("DELETE FROM capabilities WHERE tenant_id = %s", (tid,))
    cur.execute("DELETE FROM capability_gaps WHERE tenant_id = %s", (tid,))
    cur.execute("UPDATE signals SET clustered_into = NULL, embedding = NULL WHERE tenant_id = %s", (tid,))
    conn.commit()
    conn.close()
    return {"status": "reset", "tenant": "acme_robotics"}


# ═══ DEMO FULL-RESET (Checkpoint 6+) ═══
@app.post("/api/demo/full-reset")
def demo_full_reset():
    """Full reset: clear all generated data, reset signal clusters, delete generated skill files, then re-run reflection loop."""
    import sys, os, shutil
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

    conn = get_db(); cur = conn.cursor()
    cur.execute("SELECT id FROM tenants WHERE slug = 'acme_robotics'")
    row = cur.fetchone()
    if not row:
        conn.close(); return {"error": "No acme tenant"}
    tid = row[0]

    # 1. Delete generated capability data
    cur.execute("DELETE FROM fitness_scores WHERE capability_id IN (SELECT id FROM capabilities WHERE tenant_id = %s)", (tid,))
    cur.execute("DELETE FROM governance_events WHERE tenant_id = %s", (tid,))
    cur.execute("DELETE FROM capabilities WHERE tenant_id = %s", (tid,))
    cur.execute("DELETE FROM capability_gaps WHERE tenant_id = %s", (tid,))

    # 2. Reset signals.clustered_into to NULL (keep embeddings to avoid re-embedding)
    cur.execute("UPDATE signals SET clustered_into = NULL WHERE tenant_id = %s", (tid,))

    conn.commit()
    conn.close()

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
    cur.execute(q, p); rows = cur.fetchall(); conn.close()
    return [_ser(r) for r in rows]


@app.get("/api/tenants/{slug}/external-agents/{agent_id}")
def get_external_agent(slug: str, agent_id: str):
    conn = get_db(); cur = _dict_cur(conn)
    cur.execute("SELECT * FROM external_agents WHERE id=%s", (agent_id,))
    agent = cur.fetchone()
    if not agent: conn.close(); raise HTTPException(404, "Not found")
    cur.execute("SELECT * FROM agent_interactions WHERE external_agent_id=%s ORDER BY created_at DESC LIMIT 20", (agent_id,))
    interactions = cur.fetchall(); conn.close()
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
    total = cur.fetchone()["count"]; conn.close()
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
    conn.close()
    return {"agents": agents, "interactions": {**interactions, "avg_latency_ms": round(float(interactions["avg_latency"] or 0))}, "by_type": by_type, "trust_by_kind": trust_by_kind}


# ═══ DASHBOARD ═══
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
    conn.close()
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
