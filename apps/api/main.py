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
    return {"signals": [_ser(r) for r in rows], "total": total}


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


# ═══ REFLECTION LOOP (Checkpoint 3 — stub) ═══
@app.post("/api/reflection/run")
def run_reflection():
    return {"status": "not_implemented", "message": "Requires ANTHROPIC_API_KEY (Checkpoint 3)"}


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
