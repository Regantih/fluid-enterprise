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
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
import psycopg2.extras

logger = logging.getLogger("generator")

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://fluid:fluid_dev_2026@localhost:5432/fluid_enterprise")
SKILLS_DIR = Path(__file__).parent.parent.parent / "packages" / "skills" / "generated"

# Path to .env at project root (three levels up from this file)
_ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '.env')


def _load_api_key() -> str | None:
    """Read ANTHROPIC_API_KEY from the project-root .env file."""
    try:
        with open(_ENV_PATH, "r") as f:
            for line in f:
                line = line.strip()
                if line.startswith("ANTHROPIC_API_KEY="):
                    key = line[len("ANTHROPIC_API_KEY="):].strip()
                    if key:
                        return key
    except Exception as e:
        logger.error(f"Could not read .env file at {_ENV_PATH}: {e}")
    return None


def _parse_fenced_blocks(text: str) -> dict:
    """
    Extract fenced code blocks from Claude's response.
    Returns dict with keys: 'yaml', 'python', 'jsonl' (each may be None).
    """
    result = {"yaml": None, "python": None, "jsonl": None}
    for lang in ("yaml", "python", "jsonl"):
        pattern = rf"```{lang}\s*\n(.*?)```"
        match = re.search(pattern, text, re.DOTALL)
        if match:
            result[lang] = match.group(1).strip()
    return result


def _call_claude(api_key: str, messages: list, system: str) -> str | None:
    """
    Call Claude via httpx. Returns the text content of the first message, or None on failure.
    """
    try:
        import httpx
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        payload = {
            "model": "claude-sonnet-4-5",
            "max_tokens": 4096,
            "system": system,
            "messages": messages,
        }
        with httpx.Client(timeout=120.0) as client:
            resp = client.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["content"][0]["text"]
    except Exception as e:
        logger.error(f"Claude API call failed: {e}")
        return None


def _generate_with_claude(gap: dict, tenant_id: str, tenant_slug: str) -> dict | None:
    """
    Try to generate a capability using Claude Sonnet 4.5.
    Returns a dict with keys: cap_slug, cap_name, cap_kind, manifest, code, eval_suite
    or None if generation fails for any reason.
    """
    try:
        # Import the generator prompt
        import sys
        _pkg_path = str(Path(__file__).parent.parent.parent / "packages" / "shared")
        if _pkg_path not in sys.path:
            sys.path.insert(0, str(Path(__file__).parent.parent.parent))
        from packages.shared.prompts import GENERATOR_PROMPT

        # Import validate_imports from sandbox
        from packages.sandbox.runner import validate_imports

        api_key = _load_api_key()
        if not api_key:
            logger.error("No ANTHROPIC_API_KEY found — skipping Claude generation")
            return None

        # Build the generation number (best-effort; use 1 if unavailable)
        generation = 1

        # Build the user prompt
        gap_json = json.dumps(dict(gap), default=str, indent=2)
        registry_json = "[]"  # could be populated from DB; stub for now

        system_prompt = GENERATOR_PROMPT.replace("{tenant}", tenant_slug)
        user_content = (
            system_prompt
            .replace("{gap_json}", gap_json)
            .replace("{{gap_json}}", gap_json)
            .replace("{registry_json}", registry_json)
            .replace("{{registry_json}}", registry_json)
            .replace("{generation}", str(generation))
            .replace("{{generation}}", str(generation))
        )

        # The GENERATOR_PROMPT uses both {tenant} and {{tenant}} style placeholders;
        # after .replace("{tenant}", tenant_slug) above the system_prompt is clean.
        # We send it as the user message so the model knows the full context.
        messages = [{"role": "user", "content": user_content}]
        # Use a lightweight system instruction so Claude knows its role
        system = "You are the Generator of Fluid Enterprise. Respond with exactly three fenced code blocks: yaml, python, jsonl."

        logger.info(f"Calling Claude to generate capability for gap: {gap.get('id')}")
        response_text = _call_claude(api_key, messages, system)
        if not response_text:
            return None

        blocks = _parse_fenced_blocks(response_text)
        if not blocks["yaml"] or not blocks["python"] or not blocks["jsonl"]:
            logger.error(
                f"Claude response missing blocks — yaml={bool(blocks['yaml'])}, "
                f"python={bool(blocks['python'])}, jsonl={bool(blocks['jsonl'])}"
            )
            return None

        code = blocks["python"]

        # ── Validate imports ──
        violations = validate_imports(code)
        if violations:
            logger.info(f"Import violations on first attempt: {violations}. Retrying with repair prompt.")
            repair_content = (
                f"The following import violations were found in the capability.py you generated:\n"
                f"{json.dumps(violations)}\n\n"
                f"Please fix the code so it only imports from: stdlib, httpx, pydantic, jsonschema.\n"
                f"Return the same three fenced blocks (yaml, python, jsonl) with the corrected Python."
            )
            repair_messages = [
                {"role": "user", "content": user_content},
                {"role": "assistant", "content": response_text},
                {"role": "user", "content": repair_content},
            ]
            repair_response = _call_claude(api_key, repair_messages, system)
            if not repair_response:
                logger.error("Repair call to Claude failed — falling back")
                return None
            repaired_blocks = _parse_fenced_blocks(repair_response)
            if repaired_blocks["python"]:
                code = repaired_blocks["python"]
                if repaired_blocks["yaml"]:
                    blocks["yaml"] = repaired_blocks["yaml"]
                if repaired_blocks["jsonl"]:
                    blocks["jsonl"] = repaired_blocks["jsonl"]
            # Re-validate
            violations = validate_imports(code)
            if violations:
                logger.error(f"Import violations persist after repair: {violations} — falling back")
                return None

        # ── Parse YAML manifest ──
        manifest = {}
        try:
            import yaml
            manifest = yaml.safe_load(blocks["yaml"]) or {}
        except Exception as e:
            logger.error(f"Failed to parse YAML block from Claude: {e}")
            # Proceed with empty manifest; will be filled in by caller

        # ── Determine slug / name / kind ──
        cap_slug = manifest.get("id") or f"cap_{uuid.uuid4().hex[:8]}"
        cap_name = manifest.get("name") or gap.get("suggested_name") or f"Capability {cap_slug}"
        cap_kind = manifest.get("kind") or gap.get("suggested_kind") or "skill"

        # ── Write files to SKILLS_DIR ──
        cap_dir = SKILLS_DIR / cap_slug
        cap_dir.mkdir(parents=True, exist_ok=True)

        skill_md_content = f"---\n{blocks['yaml']}\n---\n"
        (cap_dir / "SKILL.md").write_text(skill_md_content)
        (cap_dir / "capability.py").write_text(code)
        (cap_dir / "eval.jsonl").write_text(blocks["jsonl"])

        logger.info(f"Claude generated capability: {cap_slug} → {cap_dir}")

        return {
            "cap_slug": cap_slug,
            "cap_name": cap_name,
            "cap_kind": cap_kind,
            "manifest": manifest,
            "code": code,
            "eval_suite": blocks["jsonl"],
        }

    except Exception as e:
        logger.error(f"_generate_with_claude raised unexpectedly: {e}", exc_info=True)
        return None


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

    # ── Try Claude generation first (only for open/ungenerated gaps) ──
    claude_result = None
    if gap.get("status") == "open":
        claude_result = _generate_with_claude(gap, tenant_id, tenant_slug)

    if claude_result:
        # Use Claude-generated values
        cap_slug = claude_result["cap_slug"]
        cap_name = claude_result["cap_name"]
        cap_kind = claude_result["cap_kind"]
        manifest_from_claude = claude_result["manifest"]
        code = claude_result["code"]
        eval_suite = claude_result["eval_suite"]
        logger.info(f"Using Claude-generated capability: {cap_slug}")
    else:
        # ── Fallback: existing theme-mapping logic ──
        if gap.get("status") == "open":
            logger.info(f"Claude generation unavailable or failed for gap {gap_id} — using theme-mapping fallback")

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

        manifest_from_claude = {}
        code = ""
        eval_suite = ""

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

    # Load the generated files from disk (in case Claude wrote them, or pre-built files exist)
    cap_dir = SKILLS_DIR / cap_slug

    if not claude_result:
        # Load from disk (pre-built / previously written)
        manifest = {}
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
    else:
        manifest = manifest_from_claude

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

    source = "claude" if claude_result else "theme_mapping"
    logger.info(f"Generated capability: {cap_slug} (gen {next_gen}) from gap {gap_id} via {source}")

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
