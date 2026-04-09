"""
Agent Gateway — Cross-Boundary Agent Interaction Layer
=======================================================
Implements A2A-inspired protocol for vendor and customer agents
to interact with the Fluid Enterprise's internal capabilities.

Architecture:
- External agents register with Agent Cards (capabilities, auth, trust)
- Every interaction goes through the Gateway's trust verification
- High-value interactions trigger governance council review
- All interactions are hash-chained in the audit ledger
- Trust scores evolve based on interaction history (EigenTrust)

Interaction Types:
  Vendor → Enterprise:  rfq_response, delivery_update, compliance_submission, invoice, negotiation
  Enterprise → Vendor:  rfq_request, quality_audit, compliance_request, payment
  Customer → Enterprise: order_request, quote_request, escalation, feedback
  Enterprise → Customer: quote_response, delivery_notification, issue_resolution
"""

import json
import hashlib
import logging
import os
import random
import uuid
from datetime import datetime, timezone, timedelta

import psycopg2
import psycopg2.extras

logger = logging.getLogger("agent_gateway")

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://fluid:fluid_dev_2026@localhost:5432/fluid_enterprise")

GOVERNANCE_THRESHOLD_USD = 50000  # interactions above this require governance


def seed_external_agents(tenant_slug: str = "acme_robotics"):
    """Seed vendor and customer agents with realistic Agent Cards."""
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute("SELECT id FROM tenants WHERE slug = %s", (tenant_slug,))
    tenant = cur.fetchone()
    if not tenant:
        conn.close()
        return

    tid = tenant["id"]

    # Check if already seeded
    cur.execute("SELECT count(*) as cnt FROM external_agents WHERE tenant_id = %s", (tid,))
    if cur.fetchone()["cnt"] > 0:
        conn.close()
        return

    # ─── Vendor Agents ───
    vendors = [
        {
            "name": "Meridian-Agent-v3",
            "kind": "vendor",
            "organization": "Meridian Components",
            "status": "trusted",
            "trust_score": 0.42,  # Low trust — matches the risk signals
            "capabilities": ["rfq_response", "delivery_update", "compliance_submission", "invoice"],
            "agent_card": {
                "version": "1.0",
                "endpoint": "https://agents.meridian-components.com/a2a",
                "auth": ["api_key"],
                "capabilities": ["respond_to_rfq", "submit_delivery_status", "submit_compliance_docs", "submit_invoice"],
                "rate_limit": "100/hour",
                "organization": {"name": "Meridian Components", "industry": "precision_manufacturing", "employees": 850},
            },
        },
        {
            "name": "Apex-Agent-v2",
            "kind": "vendor",
            "organization": "Apex Precision Parts",
            "status": "verified",
            "trust_score": 0.58,
            "capabilities": ["rfq_response", "delivery_update", "quality_report", "compliance_submission"],
            "agent_card": {
                "version": "1.0",
                "endpoint": "https://agents.apex-precision.com/a2a",
                "auth": ["oauth2", "api_key"],
                "capabilities": ["respond_to_rfq", "submit_delivery_status", "submit_quality_report", "submit_compliance_docs"],
                "rate_limit": "200/hour",
                "organization": {"name": "Apex Precision Parts", "industry": "precision_machining", "employees": 1200},
            },
        },
        {
            "name": "NovaTech-Agent-v1",
            "kind": "vendor",
            "organization": "NovaTech Alloys",
            "status": "verified",
            "trust_score": 0.51,
            "capabilities": ["rfq_response", "delivery_update", "invoice", "negotiation"],
            "agent_card": {
                "version": "0.9",
                "endpoint": "https://agents.novatech-alloys.com/a2a",
                "auth": ["api_key"],
                "capabilities": ["respond_to_rfq", "submit_delivery_status", "submit_invoice", "negotiate_terms"],
                "rate_limit": "50/hour",
                "organization": {"name": "NovaTech Alloys", "industry": "specialty_alloys", "employees": 600},
            },
        },
        {
            "name": "TitanForge-Agent-v4",
            "kind": "vendor",
            "organization": "TitanForge Industries",
            "status": "trusted",
            "trust_score": 0.91,
            "capabilities": ["rfq_response", "delivery_update", "compliance_submission", "invoice", "quality_report"],
            "agent_card": {
                "version": "2.0",
                "endpoint": "https://agents.titanforge.com/a2a",
                "auth": ["mtls", "oauth2"],
                "capabilities": ["respond_to_rfq", "submit_delivery_status", "submit_compliance_docs", "submit_invoice", "submit_quality_report"],
                "rate_limit": "500/hour",
                "organization": {"name": "TitanForge Industries", "industry": "heavy_manufacturing", "employees": 3400},
            },
        },
        {
            "name": "ClearPath-Agent-v2",
            "kind": "vendor",
            "organization": "ClearPath Logistics",
            "status": "trusted",
            "trust_score": 0.88,
            "capabilities": ["delivery_update", "route_optimization", "invoice"],
            "agent_card": {
                "version": "1.5",
                "endpoint": "https://agents.clearpath-logistics.com/a2a",
                "auth": ["oauth2"],
                "capabilities": ["submit_delivery_status", "optimize_route", "submit_invoice"],
                "rate_limit": "300/hour",
                "organization": {"name": "ClearPath Logistics", "industry": "logistics", "employees": 2100},
            },
        },
    ]

    # ─── Customer Agents ───
    customers = [
        {
            "name": "Stellaris-Agent-v3",
            "kind": "customer",
            "organization": "Stellaris Corp",
            "status": "trusted",
            "trust_score": 0.94,
            "capabilities": ["order_request", "quote_request", "delivery_tracking", "escalation"],
            "agent_card": {
                "version": "2.0",
                "endpoint": "https://agents.stellaris-corp.com/a2a",
                "auth": ["oauth2", "mtls"],
                "capabilities": ["submit_order", "request_quote", "track_delivery", "escalate_issue"],
                "rate_limit": "200/hour",
                "organization": {"name": "Stellaris Corp", "industry": "aerospace", "employees": 12000, "tier": "platinum"},
            },
        },
        {
            "name": "ProBuild-Agent-v1",
            "kind": "customer",
            "organization": "ProBuild Industries",
            "status": "verified",
            "trust_score": 0.78,
            "capabilities": ["order_request", "quote_request", "feedback"],
            "agent_card": {
                "version": "1.0",
                "endpoint": "https://agents.probuild.com/a2a",
                "auth": ["api_key"],
                "capabilities": ["submit_order", "request_quote", "submit_feedback"],
                "rate_limit": "100/hour",
                "organization": {"name": "ProBuild Industries", "industry": "construction_tech", "employees": 450, "tier": "gold"},
            },
        },
        {
            "name": "MechaDyne-Agent-v2",
            "kind": "customer",
            "organization": "MechaDyne Solutions",
            "status": "trusted",
            "trust_score": 0.85,
            "capabilities": ["order_request", "quote_request", "escalation", "negotiation"],
            "agent_card": {
                "version": "1.5",
                "endpoint": "https://agents.mechadyne.com/a2a",
                "auth": ["oauth2"],
                "capabilities": ["submit_order", "request_quote", "escalate_issue", "negotiate_terms"],
                "rate_limit": "150/hour",
                "organization": {"name": "MechaDyne Solutions", "industry": "industrial_automation", "employees": 2800, "tier": "platinum"},
            },
        },
    ]

    for agent in vendors + customers:
        cur.execute("""
            INSERT INTO external_agents (tenant_id, name, kind, organization, status, trust_score, capabilities, agent_card, auth_method)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            tid, agent["name"], agent["kind"], agent["organization"],
            agent["status"], agent["trust_score"],
            agent["capabilities"],
            json.dumps(agent["agent_card"]),
            agent["agent_card"].get("auth", ["api_key"])[0],
        ))

    logger.info(f"Seeded {len(vendors)} vendor agents and {len(customers)} customer agents")
    conn.close()


def seed_interactions(tenant_slug: str = "acme_robotics"):
    """Generate realistic agent interactions over the past 14 days."""
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute("SELECT id FROM tenants WHERE slug = %s", (tenant_slug,))
    tenant = cur.fetchone()
    if not tenant:
        conn.close()
        return
    tid = tenant["id"]

    # Check if already seeded
    cur.execute("SELECT count(*) as cnt FROM agent_interactions WHERE tenant_id = %s", (tid,))
    if cur.fetchone()["cnt"] > 0:
        conn.close()
        return

    cur.execute("SELECT * FROM external_agents WHERE tenant_id = %s", (tid,))
    agents = cur.fetchall()
    if not agents:
        conn.close()
        return

    cur.execute("SELECT id FROM capabilities WHERE tenant_id = %s LIMIT 1", (tid,))
    cap_row = cur.fetchone()
    cap_id = cap_row["id"] if cap_row else None

    vendors = [a for a in agents if a["kind"] == "vendor"]
    customers = [a for a in agents if a["kind"] == "customer"]
    base = datetime(2026, 3, 25, tzinfo=timezone.utc)

    interactions = []

    # ─── Vendor Interactions ───
    for vendor in vendors:
        is_risky = vendor["trust_score"] < 0.6
        num_interactions = random.randint(15, 30) if is_risky else random.randint(8, 15)

        for _ in range(num_interactions):
            day = random.randint(0, 13)
            ts = base + timedelta(days=day, hours=random.randint(6, 20), minutes=random.randint(0, 59))

            if is_risky:
                itype = random.choice([
                    "delivery_update", "delivery_update", "delivery_update",
                    "compliance_submission", "invoice", "negotiation",
                    "rfq_response",
                ])
            else:
                itype = random.choice(["delivery_update", "rfq_response", "invoice", "compliance_submission", "quality_report"])

            payload, response, status, trust_impact, gov_required = _vendor_interaction(vendor, itype, is_risky)

            interactions.append({
                "tenant_id": tid,
                "external_agent_id": vendor["id"],
                "internal_capability_id": cap_id,
                "direction": "inbound",
                "interaction_type": itype,
                "payload": payload,
                "status": status,
                "trust_impact": trust_impact,
                "governance_required": gov_required,
                "response_payload": response,
                "latency_ms": random.randint(50, 3000),
                "created_at": ts.isoformat(),
                "resolved_at": (ts + timedelta(seconds=random.randint(1, 300))).isoformat() if status != "pending" else None,
            })

    # ─── Customer Interactions ───
    for customer in customers:
        num_interactions = random.randint(10, 25)
        for _ in range(num_interactions):
            day = random.randint(0, 13)
            ts = base + timedelta(days=day, hours=random.randint(8, 22), minutes=random.randint(0, 59))
            itype = random.choice(["order_request", "quote_request", "delivery_tracking", "escalation", "feedback"])
            payload, response, status, trust_impact, gov_required = _customer_interaction(customer, itype)

            interactions.append({
                "tenant_id": tid,
                "external_agent_id": customer["id"],
                "internal_capability_id": cap_id,
                "direction": "inbound",
                "interaction_type": itype,
                "payload": payload,
                "status": status,
                "trust_impact": trust_impact,
                "governance_required": gov_required,
                "response_payload": response,
                "latency_ms": random.randint(30, 1500),
                "created_at": ts.isoformat(),
                "resolved_at": (ts + timedelta(seconds=random.randint(1, 120))).isoformat() if status != "pending" else None,
            })

    # Insert all
    for i in interactions:
        cur.execute("""
            INSERT INTO agent_interactions (tenant_id, external_agent_id, internal_capability_id, direction,
                interaction_type, payload, status, trust_impact, governance_required, response_payload,
                latency_ms, created_at, resolved_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            i["tenant_id"], i["external_agent_id"], i["internal_capability_id"],
            i["direction"], i["interaction_type"], json.dumps(i["payload"]),
            i["status"], i["trust_impact"], i["governance_required"],
            json.dumps(i["response_payload"]) if i["response_payload"] else None,
            i["latency_ms"], i["created_at"], i["resolved_at"],
        ))

    # Update interaction counts
    for agent in agents:
        cur.execute("UPDATE external_agents SET interactions_count = (SELECT count(*) FROM agent_interactions WHERE external_agent_id = %s), last_interaction = (SELECT max(created_at) FROM agent_interactions WHERE external_agent_id = %s) WHERE id = %s",
                    (agent["id"], agent["id"], agent["id"]))

    conn.close()
    logger.info(f"Seeded {len(interactions)} agent interactions")


def _vendor_interaction(vendor, itype, is_risky):
    org = vendor["organization"]
    if itype == "delivery_update":
        if is_risky and random.random() < 0.6:
            return (
                {"type": "delivery_update", "vendor": org, "po": f"PO-{random.randint(40000,49999)}",
                 "status": "delayed", "delay_days": random.randint(3, 18),
                 "reason": random.choice(["Material shortage", "Production capacity", "Quality hold", "Logistics disruption"]),
                 "revised_eta": (datetime.now() + timedelta(days=random.randint(5, 20))).strftime("%Y-%m-%d")},
                {"action": "risk_score_updated", "new_score": round(float(vendor["trust_score"]) - 0.02, 4),
                 "alert": "Late delivery pattern detected. Dual-sourcing recommended."},
                "completed", -0.02, False
            )
        return (
            {"type": "delivery_update", "vendor": org, "po": f"PO-{random.randint(40000,49999)}",
             "status": "on_track", "eta": (datetime.now() + timedelta(days=random.randint(1, 10))).strftime("%Y-%m-%d")},
            {"action": "acknowledged", "status": "tracking"},
            "completed", 0.005, False
        )
    elif itype == "compliance_submission":
        if is_risky and random.random() < 0.5:
            return (
                {"type": "compliance_submission", "vendor": org, "doc_type": random.choice(["ISO_9001", "COC", "REACH"]),
                 "status": "expired", "expired_date": "2026-02-28"},
                {"action": "rejected", "reason": "Document expired. Updated version required within 48 hours.",
                 "escalation": "compliance_team"},
                "rejected", -0.03, True
            )
        return (
            {"type": "compliance_submission", "vendor": org, "doc_type": random.choice(["ISO_9001", "COC", "REACH"]),
             "status": "valid", "valid_until": "2027-03-31"},
            {"action": "accepted", "stored": True},
            "completed", 0.01, False
        )
    elif itype == "invoice":
        amount = random.randint(5000, 250000)
        if is_risky and random.random() < 0.4:
            variance = random.randint(500, 25000)
            return (
                {"type": "invoice", "vendor": org, "invoice_id": f"INV-{random.randint(90000,99999)}",
                 "amount_usd": amount + variance, "po_amount_usd": amount, "variance_usd": variance},
                {"action": "held", "reason": f"Three-way match failed. Variance ${variance:,} exceeds threshold.",
                 "next_step": "AP investigation"},
                "escalated", -0.02, True
            )
        return (
            {"type": "invoice", "vendor": org, "invoice_id": f"INV-{random.randint(90000,99999)}",
             "amount_usd": amount, "po_amount_usd": amount},
            {"action": "approved", "payment_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")},
            "completed", 0.005, amount > GOVERNANCE_THRESHOLD_USD
        )
    elif itype == "negotiation":
        increase_pct = random.randint(5, 18)
        return (
            {"type": "negotiation", "vendor": org, "request": f"Price increase of {increase_pct}%",
             "effective_date": "2026-07-01", "justification": random.choice(["Raw material costs", "Energy prices", "Labor inflation"])},
            {"action": "counter_proposed", "counter": f"Maximum acceptable: {max(0, increase_pct-8)}%",
             "conditions": ["Volume commitment of 10,000 units/quarter", "12-month price lock"]},
            "processing", -0.01, True
        )
    else:
        return (
            {"type": itype, "vendor": org, "data": "standard interaction"},
            {"action": "processed"},
            "completed", 0.0, False
        )


def _customer_interaction(customer, itype):
    org = customer["organization"]
    if itype == "order_request":
        qty = random.randint(10, 500)
        unit_price = random.randint(500, 5000)
        total = qty * unit_price
        return (
            {"type": "order_request", "customer": org, "product": random.choice(["RoboArm-v4", "GripperPro-X", "SensorArray-3"]),
             "quantity": qty, "unit_price_usd": unit_price, "total_usd": total,
             "requested_delivery": (datetime.now() + timedelta(days=random.randint(14, 60))).strftime("%Y-%m-%d")},
            {"action": "accepted", "order_id": f"ORD-{random.randint(10000,99999)}",
             "confirmed_delivery": (datetime.now() + timedelta(days=random.randint(14, 45))).strftime("%Y-%m-%d"),
             "payment_terms": "Net-30"},
            "completed", 0.01, total > 500000
        )
    elif itype == "quote_request":
        return (
            {"type": "quote_request", "customer": org,
             "products": [{"sku": f"SKU-{random.randint(1000,9999)}", "qty": random.randint(50, 1000)} for _ in range(random.randint(1,4))],
             "urgency": random.choice(["standard", "expedited", "critical"])},
            {"action": "quote_generated", "quote_id": f"QT-{random.randint(50000,59999)}",
             "total_usd": random.randint(50000, 2000000), "valid_until": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")},
            "completed", 0.005, False
        )
    elif itype == "escalation":
        return (
            {"type": "escalation", "customer": org, "severity": random.choice(["high", "critical"]),
             "issue": random.choice(["Delivery SLA breach on ORD-12345", "Quality defect in batch #7890", "Invoice dispute — double charge"]),
             "impact": random.choice(["Production line stopped", "Customer demo at risk", "Revenue recognition delayed"])},
            {"action": "escalated_to_governance", "assigned_to": "account_manager",
             "sla": "4 hours for critical, 24 hours for high"},
            "escalated", -0.01, True
        )
    elif itype == "delivery_tracking":
        return (
            {"type": "delivery_tracking", "customer": org, "order_id": f"ORD-{random.randint(10000,99999)}"},
            {"status": random.choice(["in_production", "shipped", "in_transit", "delivered"]),
             "eta": (datetime.now() + timedelta(days=random.randint(1, 14))).strftime("%Y-%m-%d"),
             "tracking_number": f"TRK-{uuid.uuid4().hex[:8].upper()}"},
            "completed", 0.0, False
        )
    else:
        return (
            {"type": "feedback", "customer": org, "rating": random.randint(3, 5),
             "comment": random.choice(["Great quality, on-time delivery", "Good product but slow support response", "Excellent — renewing contract"])},
            {"action": "logged", "nps_impact": random.choice(["+1", "0", "-1"])},
            "completed", 0.005, False
        )
