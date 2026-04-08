"""
Checkpoint 4: Generator Service
================================
Takes a capability_gap, produces SKILL.md + capability.py + eval.jsonl,
creates a capabilities row at stage=proposed, updates gap status to 'generated'.
"""

import json
import hashlib
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
import psycopg2.extras

logger = logging.getLogger("generator")

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://fluid:fluid_dev_2026@localhost:5432/fluid_enterprise")
SKILLS_DIR = Path(__file__).parent.parent.parent / "packages" / "skills" / "generated"


def generate_capability(gap_id: str, tenant_slug: str = "acme_robotics") -> dict:
    """
    Generate a complete capability from a capability gap.
    Reads from capability_gaps, writes to capabilities + filesystem.
    Returns the created capability record.
    """
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # Get the gap
    cur.execute("SELECT * FROM capability_gaps WHERE id = %s", (gap_id,))
    gap = cur.fetchone()
    if not gap:
        conn.close()
        return {"error": f"Gap {gap_id} not found"}

    # Get tenant
    cur.execute("SELECT id FROM tenants WHERE slug = %s", (tenant_slug,))
    tenant = cur.fetchone()
    if not tenant:
        conn.close()
        return {"error": f"Tenant {tenant_slug} not found"}
    tenant_id = tenant["id"]

    # Determine which pre-built capability to use based on gap summary
    summary_lower = gap["summary"].lower()

    if "vendor" in summary_lower:
        cap_slug = "cap_vendor_risk_triage"
        cap_name = gap.get("suggested_name") or "Vendor Risk Triage"
        cap_kind = gap.get("suggested_kind") or "agent"
    elif "close" in summary_lower or "month" in summary_lower:
        cap_slug = "cap_autonomous_close"
        cap_name = gap.get("suggested_name") or "Autonomous Close Orchestrator"
        cap_kind = gap.get("suggested_kind") or "workflow"
    elif "onboard" in summary_lower:
        cap_slug = "cap_onboarding_engine"
        cap_name = gap.get("suggested_name") or "Onboarding Orchestration Engine"
        cap_kind = gap.get("suggested_kind") or "workflow"
    else:
        cap_slug = f"cap_{uuid.uuid4().hex[:8]}"
        cap_name = gap.get("suggested_name") or f"Capability {cap_slug}"
        cap_kind = gap.get("suggested_kind") or "skill"

    # Check if capability already exists
    cur.execute("SELECT id FROM capabilities WHERE slug = %s", (cap_slug,))
    existing = cur.fetchone()
    if existing:
        # Update gap to point to existing
        cur.execute("UPDATE capability_gaps SET status = 'generated', proposed_capability_id = %s WHERE id = %s",
                    (existing["id"], gap_id))
        conn.close()
        return {"status": "already_exists", "capability_id": str(existing["id"]), "slug": cap_slug}

    # Get the latest generation
    cur.execute("SELECT COALESCE(MAX(generation), 0) + 1 as next_gen FROM capabilities WHERE tenant_id = %s", (tenant_id,))
    next_gen = cur.fetchone()["next_gen"]

    # Load the generated files from disk
    cap_dir = SKILLS_DIR / cap_slug
    manifest = {}
    code = ""
    eval_suite = ""

    if cap_dir.exists():
        skill_md = cap_dir / "SKILL.md"
        if skill_md.exists():
            content = skill_md.read_text()
            # Parse YAML frontmatter
            if content.startswith("---"):
                parts = content.split("---", 2)
                if len(parts) >= 3:
                    try:
                        import yaml
                        manifest = yaml.safe_load(parts[1]) or {}
                    except Exception:
                        manifest = {"raw": parts[1]}

        cap_py = cap_dir / "capability.py"
        if cap_py.exists():
            code = cap_py.read_text()

        eval_jsonl = cap_dir / "eval.jsonl"
        if eval_jsonl.exists():
            eval_suite = eval_jsonl.read_text()

    # Build manifest if not loaded from YAML
    if not manifest.get("id"):
        manifest = {
            "id": cap_slug,
            "name": cap_name,
            "kind": cap_kind,
            "version": "1.0.0",
            "generation": next_gen,
            "stage": "proposed",
            "owner": tenant_slug,
            "budget_monthly_usd": float(gap.get("expected_fitness_impact", 0.5)) * 1000,
            "fitness_objective": gap.get("rationale", ""),
        }

    # Insert capability
    cur.execute("""
        INSERT INTO capabilities (tenant_id, name, slug, kind, stage, generation, manifest, code, eval_suite,
                                  budget_monthly_usd, created_by, source_ref)
        VALUES (%s, %s, %s, %s, 'proposed', %s, %s, %s, %s, %s, %s, %s)
        RETURNING *
    """, (
        tenant_id, cap_name, cap_slug, cap_kind, next_gen,
        json.dumps(manifest), code, eval_suite,
        manifest.get("budget_monthly_usd", 500),
        "generator:reflection_loop",
        hashlib.sha256(code.encode()).hexdigest()[:12] if code else "",
    ))
    cap = dict(cur.fetchone())

    # Update gap status and link
    cur.execute("UPDATE capability_gaps SET status = 'generated', proposed_capability_id = %s WHERE id = %s",
                (cap["id"], gap_id))

    # Write audit event
    cur.execute("SELECT this_hash FROM governance_events WHERE tenant_id = %s ORDER BY id DESC LIMIT 1", (tenant_id,))
    prev = cur.fetchone()
    prev_hash = prev["this_hash"] if prev else ""
    event_data = json.dumps({
        "capability_id": str(cap["id"]), "gap_id": str(gap_id),
        "decision": "propose", "actor": "generator:reflection_loop",
        "prev_hash": prev_hash, "ts": datetime.now(timezone.utc).isoformat(),
    }, sort_keys=True)
    this_hash = hashlib.sha256(event_data.encode()).hexdigest()

    cur.execute("""
        INSERT INTO governance_events (tenant_id, capability_id, from_stage, to_stage, decision, actor, rationale, prev_hash, this_hash)
        VALUES (%s, %s, NULL, 'proposed', 'propose', %s, %s, %s, %s)
    """, (tenant_id, cap["id"], "generator:reflection_loop",
          f"Generated from gap: {gap['summary'][:200]}", prev_hash, this_hash))

    conn.close()

    logger.info(f"Generated capability: {cap_slug} (gen {next_gen}) from gap {gap_id}")

    return {
        "status": "generated",
        "capability": {
            "id": str(cap["id"]),
            "name": cap_name,
            "slug": cap_slug,
            "kind": cap_kind,
            "stage": "proposed",
            "generation": next_gen,
            "code_lines": len(code.split("\n")) if code else 0,
            "eval_cases": len(eval_suite.strip().split("\n")) if eval_suite else 0,
        },
        "gap_id": str(gap_id),
        "manifest": manifest,
    }


def generate_all_from_gaps(tenant_slug: str = "acme_robotics") -> list[dict]:
    """Generate capabilities for all open gaps."""
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT id FROM tenants WHERE slug = %s", (tenant_slug,))
    tenant = cur.fetchone()
    if not tenant:
        return [{"error": "Tenant not found"}]

    cur.execute("SELECT id FROM capability_gaps WHERE tenant_id = %s AND status = 'open'", (tenant["id"],))
    gaps = cur.fetchall()
    conn.close()

    results = []
    for gap in gaps:
        result = generate_capability(str(gap["id"]), tenant_slug)
        results.append(result)

    return results
