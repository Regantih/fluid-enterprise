"""
Acme Robotics Signal Generator
===============================
Generates ~8000 synthetic enterprise signals across 14 days and 6 sources.
Three planted capability gaps are deliberately over-sampled:

1. VENDOR RISK TRIAGE (60+ signals) — THE DEMO CLIMAX
   Late deliveries, compliance flags, sanctions hits, invoice anomalies
   across 3+ vendors: Meridian Components, Apex Precision Parts, NovaTech Alloys

2. MONTH-END CLOSE (40+ signals)
   Manual journal entries, reconciliation delays, approval bottlenecks

3. ONBOARDING DRIFT (30+ signals)  
   Checklist inconsistencies, missed IT provisioning, badge delays
"""

import json
import random
import uuid
from datetime import datetime, timedelta
from typing import Any

TENANT = "acme_robotics"
SOURCES = ["email", "slack", "tickets", "docs", "crm", "git"]
BASE_DATE = datetime(2026, 3, 25)  # 14-day window ending ~Apr 7
NUM_DAYS = 14

# ─── Vendor names for planted gap #1 ───
RISK_VENDORS = ["Meridian Components", "Apex Precision Parts", "NovaTech Alloys"]
SECONDARY_VENDORS = ["TitanForge Industries", "ClearPath Logistics", "ArcLight Sensors", "SteelVane Manufacturing", "CoreSync Electronics"]
ALL_VENDORS = RISK_VENDORS + SECONDARY_VENDORS

# ─── People ───
PEOPLE = {
    "procurement": ["Sarah Chen", "Marcus Rodriguez", "Priya Sharma", "David Kim"],
    "finance": ["James Mitchell", "Lisa Park", "Robert Nguyen", "Amanda Foster"],
    "logistics": ["Carlos Mendez", "Rachel Thompson", "Wei Zhang", "Elena Petrov"],
    "engineering": ["Alex Rivera", "Megan O'Brien", "Raj Patel", "Yuki Tanaka"],
    "hr": ["Diana Brooks", "Thomas Wright", "Fatima Al-Hassan", "Kevin O'Connor"],
    "it": ["Sam Goldstein", "Nadia Ivanova", "Chris Lee", "Jordan Taylor"],
}

# ─── Signal templates ───

def _vendor_risk_signals() -> list[dict]:
    """Planted gap #1: Vendor risk triage. 60+ signals across email + slack + tickets."""
    signals = []
    
    # Late delivery patterns
    for vendor in RISK_VENDORS:
        for day in range(NUM_DAYS):
            if random.random() < 0.6:
                person = random.choice(PEOPLE["procurement"])
                signals.append({
                    "source": "email",
                    "day_offset": day,
                    "subject": f"RE: {vendor} — Delivery delay on PO-{random.randint(40000, 49999)}",
                    "body": f"{person} flagged another late delivery from {vendor}. This is the {random.choice(['third', 'fourth', 'fifth'])} delay this quarter. ETA slipped by {random.randint(3, 14)} days. Production line impact assessment needed.",
                    "from": f"{person.lower().replace(' ', '.')}@acmerobotics.com",
                    "tags": ["vendor_risk", "late_delivery", vendor.lower().replace(' ', '_')],
                })

    # Compliance flags
    for vendor in RISK_VENDORS:
        for _ in range(random.randint(3, 6)):
            signals.append({
                "source": random.choice(["email", "tickets"]),
                "day_offset": random.randint(0, NUM_DAYS - 1),
                "subject": f"Compliance flag: {vendor} — {random.choice(['Missing COC', 'Expired ISO cert', 'REACH declaration overdue', 'Sanctions screening alert'])}",
                "body": f"Automated compliance scan flagged {vendor}. {random.choice(['Certificate of Conformance expired 2026-02-28.', 'ISO 9001 renewal not received. Deadline was 30 days ago.', 'REACH substance declaration not updated for new part numbers.', 'Entity matched partial sanctions list entry. Manual review required.'])} Procurement and legal notified.",
                "tags": ["vendor_risk", "compliance", vendor.lower().replace(' ', '_')],
            })

    # Invoice anomalies
    for vendor in RISK_VENDORS:
        for _ in range(random.randint(2, 5)):
            amount = random.randint(15000, 250000)
            signals.append({
                "source": "tickets",
                "day_offset": random.randint(0, NUM_DAYS - 1),
                "subject": f"Invoice anomaly — {vendor} INV-{random.randint(90000, 99999)}",
                "body": f"Three-way match failed for {vendor} invoice. PO amount ${amount:,}, invoice amount ${amount + random.randint(500, 15000):,}. Variance exceeds 5% threshold. {random.choice(['Duplicate line items detected.', 'Tax calculation mismatch.', 'Quantity received does not match quantity invoiced.', 'Unauthorized price change from contracted rate.'])}",
                "tags": ["vendor_risk", "invoice_anomaly", vendor.lower().replace(' ', '_')],
            })

    # Slack discussions about vendor concerns
    for _ in range(random.randint(8, 15)):
        vendor = random.choice(RISK_VENDORS)
        signals.append({
            "source": "slack",
            "day_offset": random.randint(0, NUM_DAYS - 1),
            "channel": "#procurement-alerts",
            "body": random.choice([
                f"@channel {vendor} just informed us they're shutting down their {random.choice(['Shenzhen', 'Guadalajara', 'Stuttgart'])} facility for 2 weeks. This will impact Q3 delivery schedules.",
                f"Has anyone else noticed {vendor} quality trending down? Third batch rejection this month from QC.",
                f"FYI — {vendor} CFO departure announced. Their accounts receivable team is already slower than usual.",
                f"Heads up: {vendor} was mentioned in a Reuters article about supply chain sanctions exposure in Southeast Asia.",
                f"Just got off the phone with {vendor}. They're asking for a 12% price increase effective next quarter. Need to escalate.",
                f"Quality alert: {vendor} lot {random.randint(1000, 9999)} failed incoming inspection. Contamination detected.",
            ]),
            "tags": ["vendor_risk", "discussion", vendor.lower().replace(' ', '_')],
        })

    return signals


def _month_end_close_signals() -> list[dict]:
    """Planted gap #2: Month-end close manual steps. 40+ signals."""
    signals = []
    
    close_tasks = [
        "Intercompany reconciliation", "Fixed asset depreciation run",
        "Accruals and deferrals posting", "Revenue recognition cutoff",
        "Bank reconciliation", "AP aging review", "AR collections follow-up",
        "Inventory valuation adjustment", "Prepaid expense amortization",
        "Tax provision calculation", "Lease accounting entries",
        "Foreign currency revaluation", "Goodwill impairment test",
    ]

    # Two month-ends in the window
    for month_end_day in [3, 10]:  # Simulating two close cycles
        for task in close_tasks:
            person = random.choice(PEOPLE["finance"])
            signals.append({
                "source": random.choice(["email", "tickets", "slack"]),
                "day_offset": month_end_day + random.randint(-1, 2),
                "subject": f"Month-end close: {task}",
                "body": f"{person}: {task} still pending. {random.choice(['Waiting on IT to run the batch job.', 'Manual spreadsheet reconciliation in progress — 847 line items.', 'Need CFO signature before posting. Calendar shows availability Thursday.', 'Source data extract from legacy system failed again. Retrying.', 'Variance analysis shows $' + str(random.randint(5, 200)) + 'K unexplained. Investigating.'])}",
                "tags": ["month_end_close", "manual_process", task.lower().replace(' ', '_')],
            })

        # Slack frustration
        for _ in range(random.randint(3, 6)):
            signals.append({
                "source": "slack",
                "day_offset": month_end_day + random.randint(0, 2),
                "channel": "#finance-close",
                "body": random.choice([
                    "Close checklist shows 14 of 38 items still open. We're behind last month's pace.",
                    "Can someone explain why the consolidation journal is still manual? This takes 6 hours every month.",
                    "The close calendar says Day 3 but we're still on Day 1 tasks. Bottleneck is the intercompany reconciliation.",
                    "Just found a $340K variance in the subsidiary roll-up. This is the third month in a row.",
                    "Reminder: close signoff deadline is Friday COB. We will not make it at current pace.",
                ]),
                "tags": ["month_end_close", "bottleneck"],
            })

    return signals


def _onboarding_drift_signals() -> list[dict]:
    """Planted gap #3: Employee onboarding checklist drift. 30+ signals."""
    signals = []

    new_hires = ["Jordan Ellis", "Mia Nakamura", "Darius Brown", "Lena Kowalski", "Omar Hassan"]
    
    for hire in new_hires:
        # Ticket: IT provisioning delayed
        signals.append({
            "source": "tickets",
            "day_offset": random.randint(0, NUM_DAYS - 1),
            "subject": f"IT provisioning incomplete — {hire}",
            "body": f"New hire {hire} started Monday but still does not have laptop, VPN access, or email configured. Day 3 and they cannot do any work. Escalating to IT manager.",
            "tags": ["onboarding_drift", "it_provisioning", "new_hire"],
        })
        # Slack: badge/access issues
        signals.append({
            "source": "slack",
            "day_offset": random.randint(0, NUM_DAYS - 1),
            "channel": "#it-helpdesk",
            "body": f"{hire} still waiting for building access badge. Security says the request was never submitted. HR says it was submitted 2 weeks ago.",
            "tags": ["onboarding_drift", "badge_access", "new_hire"],
        })
        # Doc: checklist inconsistency
        signals.append({
            "source": "docs",
            "day_offset": random.randint(0, NUM_DAYS - 1),
            "subject": f"Onboarding checklist v3 vs v5 conflict — {hire}",
            "body": f"HR used checklist v3 for {hire} but IT is following v5. Safety training requirement missing from v3. Compliance gap.",
            "tags": ["onboarding_drift", "checklist_mismatch"],
        })

    # General onboarding complaints
    for _ in range(random.randint(10, 15)):
        signals.append({
            "source": random.choice(["slack", "tickets", "email", "docs"]),
            "day_offset": random.randint(0, NUM_DAYS - 1),
            "subject": random.choice([
                "Onboarding process feedback — too many manual steps",
                "New hire orientation schedule conflict",
                "Benefits enrollment deadline missed — onboarding handoff failure",
                "Manager checklist not completed for 3 recent hires",
                "Training module assignments inconsistent across departments",
            ]),
            "body": random.choice([
                "5 of the last 8 new hires reported not having a working laptop on Day 1. The process is broken.",
                "The onboarding checklist has 47 items across 6 different systems. Nobody completes all of them.",
                "Engineering onboarding includes safety training but the form is still a paper PDF from 2019.",
                "I've been here 2 weeks and still don't have access to the design repository. My manager says 'it takes time.'",
                "Exit interview data shows 23% of voluntary departures cite poor onboarding experience in first 90 days.",
            ]),
            "tags": ["onboarding_drift", "process_gap"],
        })

    return signals


def _background_signals(count: int) -> list[dict]:
    """Generate realistic background noise signals across all sources."""
    signals = []

    email_subjects = [
        "Q3 budget review meeting — agenda attached",
        "Updated project timeline for RoboArm v4",
        "Customer feedback report — March 2026",
        "Reminder: All-hands meeting Thursday 2pm",
        "Patent filing update — gripper mechanism",
        "Travel expense report — Tokyo factory visit",
        "RE: Quarterly business review with Stellaris Corp",
        "Safety incident report — Assembly Line 3",
        "New product launch timeline discussion",
        "Annual performance review cycle starting May 1",
        "Office relocation update — Phase 2",
        "Sustainability report draft for board review",
        "IT maintenance window — Saturday 2am-6am",
        "Customer escalation — Stellaris Corp delivery SLA",
        "R&D budget allocation proposal for FY27",
    ]

    slack_messages = [
        "Anyone know the WiFi password for the 3rd floor conference room?",
        "Great demo today team! The new gripper prototype looks promising.",
        "Reminder: code freeze for v2.8 release is tomorrow at 5pm.",
        "Can someone review my PR? It's been sitting for 3 days.",
        "The cafeteria is serving sushi today. You're welcome.",
        "Standup notes posted in the wiki. Action items tagged.",
        "Build pipeline is green after the flaky test fix. Finally.",
        "Customer site visit scheduled for April 15. Need volunteers.",
        "The new CRM integration is live. Please report any issues.",
        "Happy birthday to Elena! Cake in the break room at 3pm.",
    ]

    ticket_subjects = [
        "Bug: sensor calibration drift after firmware update",
        "Feature request: batch mode for quality inspection",
        "Infrastructure: Redis cluster memory pressure",
        "Customer: Stellaris Corp requesting API access",
        "Maintenance: Servo motor replacement — Line 2",
        "Security: Penetration test findings — 3 medium severity",
        "Performance: Latency spike in order processing",
        "Documentation: API reference out of date for v2.7",
    ]

    doc_subjects = [
        "Architecture Decision Record — Event Sourcing Migration",
        "Competitive Analysis — Q1 2026 Robotics Market",
        "Standard Operating Procedure — Quality Control",
        "Board Presentation — FY26 Mid-Year Review",
        "Technical Specification — Force Sensor Array v3",
        "Incident Postmortem — March 12 Production Outage",
        "Vendor Evaluation Framework — Updated Criteria",
        "Data Governance Policy — v2.1 Draft",
    ]

    crm_entries = [
        "Stellaris Corp — Renewal discussion scheduled Q3",
        "ProBuild Industries — New lead, enterprise tier",
        "MechaDyne Solutions — Demo requested for warehouse automation",
        "AeroFleet Systems — Expansion opportunity, 50 units",
        "NorthStar Manufacturing — Support ticket escalation",
        "Horizon Automotive — Pilot program review",
        "PrecisionWorks Ltd — Contract amendment pending",
        "Atlas Heavy Industries — RFP response due April 20",
    ]

    git_messages = [
        "fix: resolve race condition in task scheduler",
        "feat: add real-time telemetry dashboard",
        "refactor: extract sensor fusion module",
        "chore: update dependencies, fix security advisories",
        "docs: add deployment runbook for production cluster",
        "test: add integration tests for order pipeline",
        "fix: memory leak in long-running calibration process",
        "feat: implement A/B testing framework for pricing model",
    ]

    source_templates = {
        "email": email_subjects,
        "slack": slack_messages,
        "tickets": ticket_subjects,
        "docs": doc_subjects,
        "crm": crm_entries,
        "git": git_messages,
    }

    for _ in range(count):
        source = random.choice(SOURCES)
        templates = source_templates[source]
        person = random.choice(PEOPLE[random.choice(list(PEOPLE.keys()))])

        signal = {
            "source": source,
            "day_offset": random.randint(0, NUM_DAYS - 1),
            "subject": random.choice(templates),
            "body": f"[{person}] " + random.choice(templates) + f" — ref #{random.randint(10000, 99999)}",
            "tags": ["background"],
        }

        if source == "slack":
            signal["channel"] = random.choice([
                "#general", "#engineering", "#product", "#ops",
                "#random", "#incidents", "#customer-success",
            ])
        if source == "git":
            signal["repo"] = random.choice([
                "acme/roboarm-firmware", "acme/platform-api",
                "acme/ml-models", "acme/infra-terraform",
            ])

        signals.append(signal)

    return signals


def generate_all_signals() -> list[dict]:
    """
    Generate the complete signal corpus for Acme Robotics.
    Returns ~8000 signals across 14 days and 6 sources.
    """
    signals = []

    # Planted gaps (high priority, over-sampled)
    vendor_risk = _vendor_risk_signals()
    month_end = _month_end_close_signals()
    onboarding = _onboarding_drift_signals()

    signals.extend(vendor_risk)
    signals.extend(month_end)
    signals.extend(onboarding)

    # Background noise to reach ~8000 total
    planted_count = len(signals)
    background_count = 8000 - planted_count
    signals.extend(_background_signals(max(0, background_count)))

    # Assign IDs and timestamps
    random.shuffle(signals)
    for i, signal in enumerate(signals):
        signal["id"] = f"sig_{uuid.uuid4().hex[:12]}"
        signal["tenant"] = TENANT
        day = signal.pop("day_offset", 0)
        hour = random.randint(6, 22)
        minute = random.randint(0, 59)
        signal["timestamp"] = (BASE_DATE + timedelta(days=day, hours=hour, minutes=minute)).isoformat()
        signal["payload"] = json.dumps({
            k: v for k, v in signal.items()
            if k not in ("id", "tenant", "timestamp", "source", "tags")
        })

    return signals


def get_signal_stats(signals: list[dict]) -> dict:
    """Get statistics about generated signals."""
    source_counts = {}
    tag_counts = {}
    for s in signals:
        src = s.get("source", "unknown")
        source_counts[src] = source_counts.get(src, 0) + 1
        for tag in s.get("tags", []):
            tag_counts[tag] = tag_counts.get(tag, 0) + 1

    vendor_signals = [s for s in signals if "vendor_risk" in s.get("tags", [])]
    vendor_sources = set(s["source"] for s in vendor_signals)

    return {
        "total": len(signals),
        "by_source": source_counts,
        "planted_gaps": {
            "vendor_risk_triage": {
                "count": tag_counts.get("vendor_risk", 0),
                "sources": list(vendor_sources),
                "vendors": RISK_VENDORS,
            },
            "month_end_close": {
                "count": tag_counts.get("month_end_close", 0),
            },
            "onboarding_drift": {
                "count": tag_counts.get("onboarding_drift", 0),
            },
        },
    }


if __name__ == "__main__":
    signals = generate_all_signals()
    stats = get_signal_stats(signals)
    print(json.dumps(stats, indent=2))
    print(f"\nTotal signals: {stats['total']}")
    print(f"Vendor risk signals: {stats['planted_gaps']['vendor_risk_triage']['count']}")
    print(f"Month-end close signals: {stats['planted_gaps']['month_end_close']['count']}")
    print(f"Onboarding drift signals: {stats['planted_gaps']['onboarding_drift']['count']}")
