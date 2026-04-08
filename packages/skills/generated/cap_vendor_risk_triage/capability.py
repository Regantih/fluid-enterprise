"""
Vendor Risk Triage Agent
========================
Single-file module exposing `def run(inputs: dict) -> dict`.
Imports only from: stdlib, httpx, pydantic, jsonschema.
No network except via declared tools. Reversible or idempotent.

Multi-step tool-using agent that:
1. Ingests vendor signals from multiple enterprise sources
2. Decomposes risk across 4 dimensions
3. Computes a composite risk score
4. Generates prioritized remediation actions
5. Determines if governance escalation is required
"""

import json
import re
import hashlib
import statistics
from datetime import datetime, timedelta
from typing import Any
from dataclasses import dataclass, field
from collections import Counter


# ═══ Risk Dimension Weights (tunable per generation) ═══
DEFAULT_WEIGHTS = {
    "delivery": 0.30,
    "compliance": 0.25,
    "financial": 0.25,
    "stability": 0.20,
}

DEFAULT_THRESHOLDS = {
    "critical": 60,
    "high": 40,
    "medium": 20,
    "low": 0,
}


# ═══ Signal Classification ═══
DELIVERY_KEYWORDS = [
    "late delivery", "delay", "slipped", "eta", "behind schedule",
    "shipment", "overdue", "backorder", "lead time",
]

COMPLIANCE_KEYWORDS = [
    "compliance", "certificate", "iso", "reach", "sanctions",
    "audit", "non-conformance", "regulatory", "expired", "coc",
    "quality audit", "corrective action",
]

FINANCIAL_KEYWORDS = [
    "invoice", "anomaly", "variance", "three-way match",
    "duplicate", "price increase", "payment terms", "overcharge",
    "mismatch", "unauthorized",
]

STABILITY_KEYWORDS = [
    "cfo departure", "facility shutdown", "workforce shortage",
    "financial stability", "leadership change", "acquisition",
    "bankruptcy", "restructuring", "declining", "watchlist",
]


def _classify_signal(payload: dict) -> dict[str, float]:
    """Classify a signal into risk dimensions. Returns dimension scores 0-1."""
    text = json.dumps(payload).lower()
    scores = {}

    for dim, keywords in [
        ("delivery", DELIVERY_KEYWORDS),
        ("compliance", COMPLIANCE_KEYWORDS),
        ("financial", FINANCIAL_KEYWORDS),
        ("stability", STABILITY_KEYWORDS),
    ]:
        hits = sum(1 for kw in keywords if kw in text)
        # Normalize: 0 hits = 0, 3+ hits = 1.0
        scores[dim] = min(1.0, hits / 3.0)

    return scores


def _compute_dimension_score(signals: list[dict], dimension: str,
                              keywords: list[str]) -> dict:
    """Compute risk score for a single dimension across all signals."""
    relevant = []
    for sig in signals:
        text = json.dumps(sig).lower()
        hits = sum(1 for kw in keywords if kw in text)
        if hits > 0:
            severity = sig.get("severity", "medium")
            severity_multiplier = {"critical": 1.5, "high": 1.2, "medium": 1.0, "low": 0.7}.get(severity, 1.0)
            relevant.append({
                "signal": sig,
                "keyword_hits": hits,
                "severity_multiplier": severity_multiplier,
                "raw_score": min(1.0, hits / 3.0) * severity_multiplier,
            })

    if not relevant:
        return {"score": 0, "signal_count": 0, "details": "No signals detected"}

    # Score = average signal severity, boosted by volume
    # Even 1 critical signal should register strongly
    raw_scores = [r["raw_score"] for r in relevant]
    avg_score = statistics.mean(raw_scores)
    max_score = max(raw_scores)
    # Use max of average and 70% of peak — a single critical signal matters
    effective_score = max(avg_score, max_score * 0.7)
    # Volume boost: 1 signal = 0.5, 3 signals = 0.8, 5+ = 1.0
    volume_boost = min(1.0, 0.5 + len(relevant) * 0.1)

    final = min(100, int(effective_score * volume_boost * 100))

    return {
        "score": final,
        "signal_count": len(relevant),
        "avg_severity": round(avg_score, 3),
        "volume_factor": round(volume_boost, 3),
        "top_keywords": _top_keywords(relevant, keywords),
    }


def _top_keywords(relevant: list, keywords: list) -> list[str]:
    """Extract the most frequently appearing keywords."""
    counter = Counter()
    for r in relevant:
        text = json.dumps(r["signal"]).lower()
        for kw in keywords:
            if kw in text:
                counter[kw] += 1
    return [kw for kw, _ in counter.most_common(5)]


def _generate_actions(vendor_name: str, risk_level: str,
                       breakdown: dict) -> list[dict]:
    """Generate prioritized remediation actions based on risk profile."""
    actions = []
    priority = 1

    if breakdown.get("delivery", {}).get("score", 0) > 50:
        actions.append({
            "priority": priority,
            "action": f"Initiate dual-sourcing qualification for {vendor_name}'s primary product categories",
            "category": "delivery",
            "urgency": "immediate" if breakdown["delivery"]["score"] > 70 else "this_quarter",
            "estimated_impact": "Reduce single-source dependency risk by 40-60%",
        })
        priority += 1

    if breakdown.get("compliance", {}).get("score", 0) > 40:
        actions.append({
            "priority": priority,
            "action": f"Request updated compliance documentation package from {vendor_name} with 48-hour SLA",
            "category": "compliance",
            "urgency": "immediate",
            "estimated_impact": "Resolve regulatory exposure within 5 business days",
        })
        priority += 1
        actions.append({
            "priority": priority,
            "action": f"Schedule on-site compliance audit of {vendor_name} within 30 days",
            "category": "compliance",
            "urgency": "this_month",
            "estimated_impact": "Verify corrective actions and prevent recurrence",
        })
        priority += 1

    if breakdown.get("financial", {}).get("score", 0) > 45:
        actions.append({
            "priority": priority,
            "action": f"Freeze new PO issuance to {vendor_name} pending AP investigation of invoice anomalies",
            "category": "financial",
            "urgency": "immediate",
            "estimated_impact": "Prevent further financial exposure until anomalies resolved",
        })
        priority += 1

    if breakdown.get("stability", {}).get("score", 0) > 35:
        actions.append({
            "priority": priority,
            "action": f"Engage {vendor_name} executive sponsor for strategic risk review meeting",
            "category": "stability",
            "urgency": "this_week",
            "estimated_impact": "Assess long-term viability and contingency planning",
        })
        priority += 1

    if risk_level == "critical":
        actions.insert(0, {
            "priority": 0,
            "action": f"ESCALATE TO GOVERNANCE: {vendor_name} composite risk score exceeds critical threshold. Immediate board-level review required.",
            "category": "governance_escalation",
            "urgency": "immediate",
            "estimated_impact": "Activate enterprise risk response protocol",
        })

    return actions


def run(inputs: dict) -> dict:
    """
    Main entry point for the Vendor Risk Triage agent.

    Args:
        inputs: {
            "vendor_name": str,
            "signals": list[dict],  # Signal objects from the Signal Bus
            "risk_thresholds": dict  # Optional custom thresholds
        }

    Returns:
        {
            "risk_score": int (0-100),
            "risk_level": str,
            "risk_breakdown": dict,
            "recommended_actions": list,
            "escalation_required": bool,
            "audit_trail": list
        }
    """
    vendor_name = inputs.get("vendor_name", "Unknown Vendor")
    signals = inputs.get("signals", [])
    thresholds = inputs.get("risk_thresholds", DEFAULT_THRESHOLDS)
    weights = DEFAULT_WEIGHTS

    audit_trail = []
    audit_trail.append({
        "step": 1,
        "action": "signal_ingestion",
        "detail": f"Received {len(signals)} signals for vendor '{vendor_name}'",
        "timestamp": datetime.utcnow().isoformat(),
    })

    if not signals:
        return {
            "risk_score": 0,
            "risk_level": "low",
            "risk_breakdown": {},
            "recommended_actions": [],
            "escalation_required": False,
            "audit_trail": [{"step": 1, "action": "no_signals", "detail": "No signals provided"}],
        }

    # ─── Step 2: Decompose risk across 4 dimensions ───
    breakdown = {
        "delivery": _compute_dimension_score(signals, "delivery", DELIVERY_KEYWORDS),
        "compliance": _compute_dimension_score(signals, "compliance", COMPLIANCE_KEYWORDS),
        "financial": _compute_dimension_score(signals, "financial", FINANCIAL_KEYWORDS),
        "stability": _compute_dimension_score(signals, "stability", STABILITY_KEYWORDS),
    }

    audit_trail.append({
        "step": 2,
        "action": "risk_decomposition",
        "detail": {dim: {"score": v["score"], "signals": v["signal_count"]}
                   for dim, v in breakdown.items()},
        "timestamp": datetime.utcnow().isoformat(),
    })

    # ─── Step 3: Compute composite score ───
    # Weighted average as base, but boosted by max dimension
    # A single critical dimension should push composite high
    weighted_avg = sum(
        breakdown[dim]["score"] * weights[dim]
        for dim in weights
    )
    max_dim_score = max(breakdown[dim]["score"] for dim in breakdown)
    # Composite = 60% weighted avg + 40% max dimension
    composite = min(100, int(0.6 * weighted_avg + 0.4 * max_dim_score))

    # Determine risk level
    risk_level = "low"
    for level in ["critical", "high", "medium", "low"]:
        if composite >= thresholds.get(level, 0):
            risk_level = level
            break

    audit_trail.append({
        "step": 3,
        "action": "composite_scoring",
        "detail": f"Composite score: {composite}/100 → {risk_level}",
        "weights": weights,
        "timestamp": datetime.utcnow().isoformat(),
    })

    # ─── Step 4: Generate remediation actions ───
    actions = _generate_actions(vendor_name, risk_level, breakdown)

    audit_trail.append({
        "step": 4,
        "action": "action_generation",
        "detail": f"Generated {len(actions)} recommended actions",
        "timestamp": datetime.utcnow().isoformat(),
    })

    # ─── Step 5: Escalation decision ───
    escalation_required = (
        composite >= thresholds.get("critical", 60) or
        any(breakdown[dim]["score"] >= 85 for dim in breakdown)
    )

    if escalation_required:
        audit_trail.append({
            "step": 5,
            "action": "escalation_triggered",
            "detail": f"Governance escalation required: composite={composite}, level={risk_level}",
            "timestamp": datetime.utcnow().isoformat(),
        })

    # ─── Compute audit hash for immutability ───
    audit_hash = hashlib.sha256(
        json.dumps(audit_trail, sort_keys=True, default=str).encode()
    ).hexdigest()[:16]

    return {
        "risk_score": composite,
        "risk_level": risk_level,
        "risk_breakdown": {
            dim: {
                "score": v["score"],
                "signal_count": v["signal_count"],
                "top_keywords": v.get("top_keywords", []),
            }
            for dim, v in breakdown.items()
        },
        "recommended_actions": actions,
        "escalation_required": escalation_required,
        "audit_trail": audit_trail,
        "audit_hash": audit_hash,
        "vendor_name": vendor_name,
        "signals_analyzed": len(signals),
    }
