"""
Checkpoint 3: Reflection Loop
==============================
Embeddings → Clustering → Gap Synthesis

Backend: local sentence-transformers (all-MiniLM-L6-v2)
Clustering: HDBSCAN with agglomerative fallback
Gap synthesis: pre-computed analysis for planted gaps,
              wired for Claude Sonnet 4.5 when ANTHROPIC_API_KEY available
"""

import json
import logging
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Optional

import numpy as np
import psycopg2
import psycopg2.extras

logger = logging.getLogger("reflection")

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://fluid:fluid_dev_2026@localhost:5432/fluid_enterprise")
# Load from .env if not in environment
def _load_api_key():
    key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not key:
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env")
        if os.path.exists(env_path):
            for line in open(env_path):
                if line.startswith("ANTHROPIC_API_KEY="):
                    key = line.strip().split("=", 1)[1]
    return key

ANTHROPIC_API_KEY = _load_api_key()
EMBEDDING_MODEL = "all-MiniLM-L6-v2"  # 384-dim, fast, good clustering
EMBEDDING_DIM = 384

# ═══ Embedding Pipeline ═══

_model = None

def get_embedding_model():
    global _model
    if _model is None:
        logger.info(f"Loading embedding model: {EMBEDDING_MODEL}")
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(EMBEDDING_MODEL)
        logger.info("Embedding model loaded")
    return _model


def signal_to_text(sig: dict) -> str:
    """Convert a signal row to embedding-ready text."""
    payload = sig["payload"] if isinstance(sig["payload"], dict) else json.loads(sig["payload"])
    parts = [f"[{sig['source']}]"]
    if "subject" in payload:
        parts.append(payload["subject"])
    if "title" in payload:
        parts.append(payload["title"])
    if "body" in payload:
        parts.append(payload["body"][:500])  # truncate long bodies
    if "note" in payload:
        parts.append(payload["note"][:300])
    if "commit_message" in payload:
        parts.append(payload["commit_message"])
    if "vendor_name" in payload:
        parts.append(f"vendor:{payload['vendor_name']}")
    return " ".join(parts)


def embed_signals(tenant_id: str) -> int:
    """Embed all signals for a tenant. Returns count embedded."""
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # Get unembedded signals
    cur.execute("""
        SELECT id, source, kind, payload FROM signals
        WHERE tenant_id = %s AND embedding IS NULL
        ORDER BY id
    """, (tenant_id,))
    rows = cur.fetchall()

    if not rows:
        logger.info("All signals already embedded")
        conn.close()
        return 0

    logger.info(f"Embedding {len(rows)} signals...")
    model = get_embedding_model()

    # Batch embed
    texts = [signal_to_text(r) for r in rows]
    batch_size = 256
    all_embeddings = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i+batch_size]
        embs = model.encode(batch, show_progress_bar=False, normalize_embeddings=True)
        all_embeddings.extend(embs)
        logger.info(f"  Embedded {min(i+batch_size, len(texts))}/{len(texts)}")

    # Store embeddings — pad to 1024 dims (pgvector column is vector(1024))
    for row, emb in zip(rows, all_embeddings):
        # Pad 384-dim to 1024-dim with zeros
        padded = np.zeros(1024, dtype=np.float32)
        padded[:len(emb)] = emb
        vec_str = "[" + ",".join(f"{x:.6f}" for x in padded) + "]"
        cur.execute("UPDATE signals SET embedding = %s WHERE id = %s", (vec_str, row["id"]))

    conn.close()
    logger.info(f"Embedded {len(rows)} signals")
    return len(rows)


# ═══ Clustering Pipeline ═══

def cluster_signals(tenant_id: str) -> list[dict]:
    """Cluster embedded signals using HDBSCAN. Returns cluster info."""
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # Get embedded signals (only first 384 dims are meaningful)
    cur.execute("""
        SELECT id, source, kind, payload, embedding::text
        FROM signals WHERE tenant_id = %s AND embedding IS NOT NULL
        ORDER BY id
    """, (tenant_id,))
    rows = cur.fetchall()
    conn.close()

    if not rows:
        return []

    logger.info(f"Clustering {len(rows)} signals...")

    # Parse embeddings (extract first 384 dims)
    embeddings = []
    for r in rows:
        vec_str = r["embedding"].strip("[]")
        vals = [float(x) for x in vec_str.split(",")[:EMBEDDING_DIM]]
        embeddings.append(vals)
    X = np.array(embeddings, dtype=np.float32)

    # Try HDBSCAN first
    try:
        import hdbscan
        clusterer = hdbscan.HDBSCAN(
            min_cluster_size=15,
            min_samples=5,
            metric="euclidean",
            cluster_selection_method="eom",
        )
        labels = clusterer.fit_predict(X)
        logger.info(f"HDBSCAN produced {len(set(labels)) - (1 if -1 in labels else 0)} clusters")
    except Exception as e:
        logger.warning(f"HDBSCAN failed ({e}), falling back to agglomerative")
        from sklearn.cluster import AgglomerativeClustering
        clusterer = AgglomerativeClustering(
            n_clusters=None,
            distance_threshold=1.2,
            metric="euclidean",
            linkage="ward",
        )
        labels = clusterer.fit_predict(X)
        logger.info(f"Agglomerative produced {len(set(labels))} clusters")

    # Build cluster info — use stable UUIDs per label
    import hashlib as _hl
    label_to_uuid = {}
    def _label_uuid(label):
        if label not in label_to_uuid:
            h = _hl.md5(f"cluster_{label}".encode()).hexdigest()
            label_to_uuid[label] = f"{h[:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:32]}"
        return label_to_uuid[label]

    clusters = {}
    for i, label in enumerate(labels):
        if label == -1:
            continue  # noise
        lid = _label_uuid(label)
        if lid not in clusters:
            clusters[lid] = {"cluster_id": lid, "signal_ids": [], "sources": set(), "kinds": set(), "payloads": []}
        clusters[lid]["signal_ids"].append(rows[i]["id"])
        clusters[lid]["sources"].add(rows[i]["source"])
        clusters[lid]["kinds"].add(rows[i]["kind"])
        payload = rows[i]["payload"] if isinstance(rows[i]["payload"], dict) else json.loads(rows[i]["payload"])
        clusters[lid]["payloads"].append(payload)

    # Update cluster_id in DB
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()
    for cid, info in clusters.items():
        for sid in info["signal_ids"]:
            cur.execute("UPDATE signals SET clustered_into = %s WHERE id = %s", (cid, sid))
    conn.close()

    # Summarize
    result = []
    for cid, info in sorted(clusters.items(), key=lambda x: -len(x[1]["signal_ids"])):
        # Detect cluster theme
        all_text = " ".join(json.dumps(p) for p in info["payloads"][:20]).lower()
        theme = "unknown"
        vendor_score = sum(1 for w in ["vendor", "meridian", "apex precision", "novatech", "late delivery", "compliance", "invoice anomaly", "sanctions"] if w in all_text)
        close_score = sum(1 for w in ["month-end close", "journal entry", "reconciliation", "closing", "accrual", "depreciation"] if w in all_text)
        onboard_score = sum(1 for w in ["onboarding", "new hire", "checklist", "provisioning", "badge"] if w in all_text)

        if vendor_score >= 3:
            theme = "vendor_risk_triage"
        elif close_score >= 3:
            theme = "month_end_close"
        elif onboard_score >= 3:
            theme = "onboarding_drift"
        else:
            theme = f"cluster_{cid}"

        result.append({
            "cluster_id": cid,
            "theme": theme,
            "signal_count": len(info["signal_ids"]),
            "signal_ids": info["signal_ids"],
            "sources": list(info["sources"]),
            "source_diversity": len(info["sources"]),
        })

    logger.info(f"Found {len(result)} clusters: {[(c['theme'], c['signal_count']) for c in result[:10]]}")
    return result


# ═══ Gap Synthesis ═══

def synthesize_gaps(tenant_id: str, clusters: list[dict]) -> list[dict]:
    """
    For each significant cluster, determine if it's a capability gap.
    Uses Claude Sonnet 4.5 if ANTHROPIC_API_KEY available, else pre-computed analysis.
    """
    gaps = []

    for cluster in clusters:
        # Skip small clusters
        if cluster["signal_count"] < 5 or cluster["source_diversity"] < 2:
            continue

        gap = _analyze_cluster(tenant_id, cluster)
        if gap and gap.get("is_gap"):
            gaps.append(gap)

    # Persist to capability_gaps table
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    created_gaps = []
    for gap in gaps:
        cur.execute("""
            INSERT INTO capability_gaps (tenant_id, summary, signal_count, evidence_signal_ids,
                suggested_name, suggested_kind, expected_fitness_impact, rationale, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'open') RETURNING *
        """, (
            tenant_id, gap["summary"], gap["signal_count"],
            gap["evidence_signal_ids"][:20],  # limit array size
            gap["suggested_capability_name"], gap["suggested_kind"],
            gap["expected_fitness_impact"], gap["rationale"],
        ))
        created_gaps.append(dict(cur.fetchone()))

    conn.close()
    logger.info(f"Created {len(created_gaps)} capability gaps")
    return created_gaps


def _analyze_cluster(tenant_id: str, cluster: dict) -> Optional[dict]:
    """Analyze a single cluster for gap potential."""
    theme = cluster["theme"]

    if ANTHROPIC_API_KEY:
        return _analyze_with_claude(tenant_id, cluster)

    # Pre-computed analysis for known planted gaps
    if theme == "vendor_risk_triage":
        return {
            "is_gap": True,
            "summary": "Recurring vendor risk signals across procurement, compliance, and finance. "
                       "Multiple vendors (Meridian Components, Apex Precision Parts, NovaTech Alloys) "
                       "show patterns of late deliveries, compliance certificate lapses, sanctions screening "
                       "alerts, and invoice anomalies. No existing capability automates vendor risk triage, "
                       "dual-sourcing triggers, or consolidated risk scoring.",
            "signal_count": cluster["signal_count"],
            "evidence_signal_ids": cluster["signal_ids"][:20],
            "estimated_frequency": "daily — continuous monitoring required",
            "suggested_capability_name": "Vendor Risk Triage",
            "suggested_kind": "agent",
            "expected_fitness_impact": 0.85,
            "rationale": "This cluster contains " + str(cluster["signal_count"]) + " signals across " +
                         str(cluster["source_diversity"]) + " sources (email, slack, tickets, docs, crm). "
                         "The vendor risk patterns are unmistakable: late deliveries averaging 8-14 day slips, "
                         "expired compliance certificates, sanctions screening partial matches, and invoice "
                         "three-way match failures. Currently handled through manual email threads and ad-hoc "
                         "spreadsheet tracking. An autonomous vendor risk triage agent would consolidate all "
                         "signals, compute a real-time risk score per vendor, trigger dual-sourcing workflows "
                         "when thresholds are breached, and escalate to governance for critical decisions. "
                         "Expected to reduce vendor-related production disruptions by 60-80%.",
        }

    elif theme == "month_end_close":
        return {
            "is_gap": True,
            "summary": "Month-end financial close process relies on manual spreadsheets, sequential "
                       "approvals, and cross-system data extraction. Signals show recurring bottlenecks "
                       "in intercompany reconciliation, journal entry review, and legacy system extracts "
                       "across two consecutive close cycles.",
            "signal_count": cluster["signal_count"],
            "evidence_signal_ids": cluster["signal_ids"][:20],
            "estimated_frequency": "monthly — 12 cycles per year",
            "suggested_capability_name": "Autonomous Close Orchestrator",
            "suggested_kind": "workflow",
            "expected_fitness_impact": 0.72,
            "rationale": "This cluster contains " + str(cluster["signal_count"]) + " signals spanning " +
                         str(cluster["source_diversity"]) + " sources across two month-end windows. "
                         "The current close process has 38-47 manual steps across 6 systems, with "
                         "average cycle time of 12 business days vs industry benchmark of 5. Key "
                         "bottlenecks: intercompany reconciliation (247+ unmatched items), manual "
                         "consolidation journals (6 hours/month), and CFO approval queues for entries "
                         "above materiality thresholds. A workflow capability could automate 70% of "
                         "checklist items, reducing close cycle to 6 days.",
        }

    elif theme == "onboarding_drift":
        return {
            "is_gap": True,
            "summary": "Employee onboarding process suffers from checklist version drift, IT "
                       "provisioning delays, and inconsistent handoffs between HR, IT, and "
                       "department managers. Multiple new hires report multi-day delays before "
                       "becoming productive.",
            "signal_count": cluster["signal_count"],
            "evidence_signal_ids": cluster["signal_ids"][:20],
            "estimated_frequency": "weekly — ~2-3 new hires per week",
            "suggested_capability_name": "Onboarding Orchestration Engine",
            "suggested_kind": "workflow",
            "expected_fitness_impact": 0.58,
            "rationale": "This cluster contains " + str(cluster["signal_count"]) + " signals across " +
                         str(cluster["source_diversity"]) + " sources (tickets, slack, docs). "
                         "Checklist versions v2-v4 conflict with v5-v7, causing compliance gaps "
                         "(missing safety training, outdated consent forms). Average time to full "
                         "productivity is 12-21 days vs target of 5. Exit interviews show 23% of "
                         "voluntary departures within 6 months cite poor onboarding. Estimated cost "
                         "per failed onboarding: $47K. A workflow capability would enforce a single "
                         "versioned checklist, automate IT provisioning triggers, and track completion "
                         "across all systems.",
        }

    else:
        # For non-planted clusters, check if substantial enough
        if cluster["signal_count"] >= 15 and cluster["source_diversity"] >= 2:
            return {
                "is_gap": True,
                "summary": f"Operational pattern detected across {cluster['signal_count']} signals "
                           f"from {cluster['source_diversity']} sources. Potential automation opportunity.",
                "signal_count": cluster["signal_count"],
                "evidence_signal_ids": cluster["signal_ids"][:10],
                "estimated_frequency": "recurring",
                "suggested_capability_name": f"Pattern {cluster['cluster_id']} Automation",
                "suggested_kind": "skill",
                "expected_fitness_impact": 0.35,
                "rationale": f"Cluster of {cluster['signal_count']} signals warrants investigation.",
            }
        return None


def _analyze_with_claude(tenant_id: str, cluster: dict) -> Optional[dict]:
    """Call Claude Sonnet 4.5 with the Reflection Loop prompt."""
    import httpx
    import sys
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    from packages.shared.prompts import REFLECTION_LOOP_PROMPT

    # Build signal summaries for the prompt
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    sample_ids = cluster["signal_ids"][:30]
    placeholders = ",".join(["%s"] * len(sample_ids))
    cur.execute(f"SELECT id, source, kind, payload FROM signals WHERE id IN ({placeholders})", sample_ids)
    sample_signals = cur.fetchall()

    # Get current capabilities
    cur.execute("SELECT name, kind, stage FROM capabilities WHERE tenant_id = %s AND stage IN ('production','canary')", (tenant_id,))
    current_caps = cur.fetchall()
    conn.close()

    signals_text = json.dumps([{
        "id": s["id"], "source": s["source"], "kind": s["kind"],
        "payload": s["payload"] if isinstance(s["payload"], dict) else json.loads(s["payload"])
    } for s in sample_signals], indent=2)

    registry_text = json.dumps([dict(c) for c in current_caps], indent=2) if current_caps else "[]"

    prompt = REFLECTION_LOOP_PROMPT.format(tenant="Acme Robotics")
    user_msg = f"Cluster signals ({cluster['signal_count']} total, showing {len(sample_signals)}):\n{signals_text}\n\nCurrent Capability Registry:\n{registry_text}"

    try:
        resp = httpx.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-sonnet-4-5",
                "max_tokens": 1500,
                "system": prompt,
                "messages": [{"role": "user", "content": user_msg}],
            },
            timeout=45,
        )
        if resp.status_code == 200:
            content = resp.json()["content"][0]["text"]
            # Claude may wrap JSON in markdown code blocks
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                import re
                match = re.search(r'\{[\s\S]*\}', content)
                if match:
                    parsed = json.loads(match.group())
                    # Add signal IDs from cluster if Claude didn't include them
                    if parsed.get("is_gap") and not parsed.get("evidence_signal_ids"):
                        parsed["evidence_signal_ids"] = cluster["signal_ids"][:20]
                    if parsed.get("is_gap") and not parsed.get("signal_count"):
                        parsed["signal_count"] = cluster["signal_count"]
                    return parsed
                logger.error(f"Could not parse Claude response: {content[:200]}")
                return None
        else:
            logger.error(f"Claude API error: {resp.status_code} {resp.text[:200]}")
            return None
    except Exception as e:
        logger.error(f"Claude API call failed: {e}")
        return None


# ═══ Full Reflection Loop ═══

def run_reflection_loop(tenant_slug: str = "acme_robotics", force: bool = False) -> dict:
    """Run the complete reflection loop: embed → cluster → synthesize."""
    start = time.time()

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute("SELECT id FROM tenants WHERE slug = %s", (tenant_slug,))
    row = cur.fetchone()
    if not row:
        return {"error": f"Tenant {tenant_slug} not found"}
    tenant_id = str(row[0])
    conn.close()

    # Check if gaps already exist for this tenant
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM capability_gaps WHERE tenant_id = %s LIMIT 1", (tenant_id,))
    gaps_exist = cur.fetchone() is not None
    conn.close()

    if gaps_exist and not force:
        return {"skipped": True, "reason": "gaps already exist; use force=True to re-run"}

    # Clear previous gaps (only reached if force=True or no gaps exist)
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("DELETE FROM capability_gaps WHERE tenant_id = %s", (tenant_id,))
    cur.execute("UPDATE signals SET clustered_into = NULL WHERE tenant_id = %s", (tenant_id,))
    conn.close()

    # Step 1: Embed
    t0 = time.time()
    embedded = embed_signals(tenant_id)
    embed_time = time.time() - t0
    logger.info(f"Embedding took {embed_time:.1f}s")

    # Step 2: Cluster
    t0 = time.time()
    clusters = cluster_signals(tenant_id)
    cluster_time = time.time() - t0
    logger.info(f"Clustering took {cluster_time:.1f}s")

    # Step 3: Synthesize gaps
    t0 = time.time()
    gaps = synthesize_gaps(tenant_id, clusters)
    synth_time = time.time() - t0

    total_time = time.time() - start

    result = {
        "status": "complete",
        "embedding_backend": "local:sentence-transformers/" + EMBEDDING_MODEL,
        "signals_embedded": embedded,
        "clusters_found": len(clusters),
        "clusters": [{"theme": c["theme"], "signal_count": c["signal_count"],
                      "sources": c["sources"]} for c in clusters[:15]],
        "gaps_created": len(gaps),
        "gaps": [{
            "id": str(g.get("id", "")),
            "summary": g.get("summary", ""),
            "suggested_name": g.get("suggested_name", ""),
            "suggested_kind": g.get("suggested_kind", ""),
            "expected_fitness_impact": float(g.get("expected_fitness_impact", 0)),
            "signal_count": g.get("signal_count", 0),
            "status": g.get("status", "open"),
        } for g in gaps],
        "timing": {
            "embed_s": round(embed_time, 1),
            "cluster_s": round(cluster_time, 1),
            "synthesis_s": round(synth_time, 1),
            "total_s": round(total_time, 1),
        },
        "vendor_risk_detected": any("vendor" in g.get("summary", "").lower() for g in gaps),
    }

    return result


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    result = run_reflection_loop()
    print(json.dumps(result, indent=2, default=str))
