"""
Checkpoint 2: Seed Acme Robotics signals into Postgres + Redis Streams.
~8000 signals, 6 sources, 14 days, 3 planted gaps.

Usage: python3 apps/api/seed_signals.py
"""

import json
import os
import sys
import time
import uuid
import random
from datetime import datetime, timedelta

import psycopg2
import psycopg2.extras
import redis

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://fluid:fluid_dev_2026@localhost:5432/fluid_enterprise")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

TENANT_SLUG = "acme_robotics"
BASE_DATE = datetime(2026, 3, 25, 6, 0, 0)  # 14-day window
NUM_DAYS = 14

# ─── Vendor names for planted gap #1 ───
RISK_VENDORS = ["Meridian Components", "Apex Precision Parts", "NovaTech Alloys"]
SAFE_VENDORS = ["TitanForge Industries", "ClearPath Logistics", "ArcLight Sensors", "SteelVane Manufacturing"]

PEOPLE = {
    "procurement": ["Sarah Chen", "Marcus Rodriguez", "Priya Sharma", "David Kim"],
    "finance": ["James Mitchell", "Lisa Park", "Robert Nguyen", "Amanda Foster"],
    "logistics": ["Carlos Mendez", "Rachel Thompson", "Wei Zhang", "Elena Petrov"],
    "engineering": ["Alex Rivera", "Megan O'Brien", "Raj Patel", "Yuki Tanaka"],
    "hr": ["Diana Brooks", "Thomas Wright", "Fatima Al-Hassan", "Kevin O'Connor"],
    "it": ["Sam Goldstein", "Nadia Ivanova", "Chris Lee", "Jordan Taylor"],
}


def ts(day_offset, hour=None):
    h = hour if hour else random.randint(7, 21)
    m = random.randint(0, 59)
    s = random.randint(0, 59)
    return (BASE_DATE + timedelta(days=day_offset, hours=h, minutes=m, seconds=s)).isoformat()


def pick(lst): return random.choice(lst)


# ═══════════════════════════════════════════
# PLANTED GAP #1: VENDOR RISK TRIAGE (60+ signals)
# THE DEMO CLIMAX — deliberately over-sampled
# ═══════════════════════════════════════════
def vendor_risk_signals():
    sigs = []

    for vendor in RISK_VENDORS:
        # Late deliveries — email (3-4 per vendor per week)
        for day in range(NUM_DAYS):
            if random.random() < 0.55:
                person = pick(PEOPLE["procurement"])
                po = f"PO-{random.randint(40000, 49999)}"
                delay_days = random.randint(3, 18)
                sigs.append({
                    "source": "email", "kind": "vendor_communication",
                    "ingested_at": ts(day),
                    "payload": {
                        "subject": f"RE: {vendor} — Delivery delay on {po}",
                        "from": f"{person.lower().replace(' ', '.')}@acmerobotics.com",
                        "to": "procurement-team@acmerobotics.com",
                        "body": f"Team,\n\n{vendor} has notified us of another delivery delay on {po}. The original delivery date was {(BASE_DATE + timedelta(days=day-delay_days)).strftime('%B %d')}, and the revised ETA is now {(BASE_DATE + timedelta(days=day+random.randint(3, 10))).strftime('%B %d')} — a slip of {delay_days} days.\n\nThis is the {pick(['third', 'fourth', 'fifth', 'sixth'])} delay from {vendor} this quarter. Our production planning team reports that Assembly Line {random.randint(1,4)} will be impacted if the {pick(['servo motors', 'precision bearings', 'aluminum housings', 'sensor arrays', 'titanium fasteners'])} don't arrive by end of week.\n\nI've escalated to {vendor}'s account manager ({pick(['Jennifer Wu', 'Mark Stevens', 'Anika Patel', 'Tom Richardson'])}) but their responsiveness has been declining.\n\nRegards,\n{person}\nSenior Procurement Specialist\nAcme Robotics",
                        "vendor_name": vendor,
                        "tags": ["vendor_risk", "late_delivery"]
                    }
                })

        # Compliance flags — tickets (3-5 per vendor)
        for _ in range(random.randint(3, 5)):
            issue = pick([
                ("Missing Certificate of Conformance", f"CoC for part batch #{random.randint(1000,9999)} expired {random.randint(15,60)} days ago. Production cannot use incoming materials without valid certification."),
                ("ISO 9001 renewal overdue", f"ISO 9001:2015 certificate expired. Renewal documentation was due {random.randint(30,90)} days ago. Vendor has been notified 3 times."),
                ("REACH substance declaration gap", f"New part numbers ({random.randint(3,8)} SKUs) added since last REACH declaration. Substance compliance unverified. Regulatory risk."),
                ("Sanctions screening alert", f"Entity name matched partial entry on OFAC SDN list. Confidence: {random.randint(65,92)}%. Manual review required per compliance policy CP-2024-{random.randint(10,30)}."),
                ("Quality audit finding", f"Last on-site audit revealed {random.randint(2,7)} non-conformances. Corrective action plan overdue by {random.randint(14,45)} days."),
            ])
            sigs.append({
                "source": "tickets", "kind": "compliance_flag",
                "ingested_at": ts(random.randint(0, NUM_DAYS - 1)),
                "payload": {
                    "subject": f"Compliance: {vendor} — {issue[0]}",
                    "body": f"AUTOMATED COMPLIANCE ALERT\n\nVendor: {vendor}\nIssue: {issue[0]}\nDetails: {issue[1]}\n\nSeverity: {pick(['HIGH', 'CRITICAL', 'MEDIUM'])}\nAssigned to: {pick(PEOPLE['procurement'])}\nSLA: 48 hours",
                    "vendor_name": vendor,
                    "severity": pick(["high", "critical", "medium"]),
                    "tags": ["vendor_risk", "compliance"]
                }
            })

        # Invoice anomalies — tickets (2-4 per vendor)
        for _ in range(random.randint(2, 4)):
            amount = random.randint(15000, 280000)
            variance = random.randint(800, 25000)
            sigs.append({
                "source": "tickets", "kind": "invoice_anomaly",
                "ingested_at": ts(random.randint(0, NUM_DAYS - 1)),
                "payload": {
                    "subject": f"Invoice anomaly — {vendor} INV-{random.randint(90000, 99999)}",
                    "body": f"Three-way match FAILED for {vendor} invoice.\n\nPO Amount: ${amount:,}\nInvoice Amount: ${amount + variance:,}\nVariance: ${variance:,} ({(variance/amount*100):.1f}%)\n\n{pick(['Duplicate line items detected across 2 invoices.', 'Tax calculation mismatch — vendor applied incorrect rate.', 'Quantity received (340 units) does not match quantity invoiced (380 units).', 'Unauthorized price change from contracted rate of $' + str(random.randint(10,100)) + '/unit.', 'Payment terms changed from Net-60 to Net-30 without contract amendment.'])}\n\nAction required: AP hold applied. Procurement review needed.",
                    "vendor_name": vendor,
                    "amount_usd": amount + variance,
                    "tags": ["vendor_risk", "invoice_anomaly"]
                }
            })

    # Slack discussions about vendor concerns (8-12 signals)
    for _ in range(random.randint(10, 15)):
        vendor = pick(RISK_VENDORS)
        person = pick(PEOPLE["procurement"] + PEOPLE["logistics"])
        sigs.append({
            "source": "slack", "kind": "discussion",
            "ingested_at": ts(random.randint(0, NUM_DAYS - 1)),
            "payload": {
                "channel": "#procurement-alerts",
                "author": person,
                "body": pick([
                    f"@channel Heads up — {vendor} just informed us they're shutting down their {pick(['Shenzhen', 'Guadalajara', 'Stuttgart', 'Chennai'])} facility for 2 weeks due to {pick(['equipment failure', 'regulatory inspection', 'workforce shortage', 'power grid instability'])}. This will impact Q3 delivery schedules for {random.randint(4, 12)} open POs.",
                    f"Has anyone else noticed {vendor} quality trending down? Just got the third batch rejection this month from QC. Rejection rate is now {random.randint(4, 12)}% vs our 2% threshold. We need to discuss alternative sources at Tuesday's supply review.",
                    f"FYI — {vendor} CFO departure announced in their 8-K filing yesterday. Their AR team is already slower than usual. I'm flagging this as a vendor stability risk. cc @{pick(PEOPLE['finance'])}",
                    f"Just saw a Reuters article mentioning {vendor} in connection with supply chain sanctions exposure in {pick(['Southeast Asia', 'Eastern Europe', 'Central Asia'])}. Not confirmed but worth monitoring. Looping in legal.",
                    f"Just got off the call with {vendor}. They're asking for a {random.randint(8, 18)}% price increase effective next quarter, citing {pick(['raw material costs', 'energy prices', 'logistics surcharges', 'labor inflation'])}. This blows our cost model. Need to escalate to VP Procurement.",
                    f"Quality alert: {vendor} lot {random.randint(1000, 9999)} failed incoming inspection. {pick(['Contamination detected in surface treatment.', 'Dimensional tolerance out of spec by 0.3mm.', 'Hardness test below minimum — Rockwell C score 48 vs required 52.', 'Visual defects on 23% of sampled units.'])} Quarantined {random.randint(200, 2000)} units.",
                ]),
                "vendor_name": vendor,
                "tags": ["vendor_risk", "discussion"]
            }
        })

    # Docs — vendor risk reports
    for vendor in RISK_VENDORS:
        for _ in range(random.randint(1, 3)):
            sigs.append({
                "source": "docs", "kind": "report",
                "ingested_at": ts(random.randint(0, NUM_DAYS - 1)),
                "payload": {
                    "title": f"Vendor Risk Assessment — {vendor} — Q1 2026",
                    "body": f"QUARTERLY VENDOR RISK REPORT\n\nVendor: {vendor}\nRisk Rating: {pick(['HIGH', 'CRITICAL', 'ELEVATED'])}\nPrevious Rating: {pick(['MEDIUM', 'LOW', 'ELEVATED'])}\n\nKey Findings:\n- On-time delivery rate: {random.randint(55, 75)}% (target: 95%)\n- Quality rejection rate: {random.randint(3, 11)}% (target: <2%)\n- Compliance documentation: {random.randint(2, 6)} outstanding items\n- Financial stability: {pick(['Watchlist — declining margins', 'Under review — leadership changes', 'Caution — high leverage ratio'])}\n\nRecommendation: {pick(['Initiate dual-sourcing strategy', 'Place on probationary status', 'Escalate to VP for strategic review', 'Begin qualification of alternative suppliers'])}",
                    "vendor_name": vendor,
                    "tags": ["vendor_risk", "assessment"]
                }
            })

    # CRM entries about vendor issues
    for vendor in RISK_VENDORS:
        sigs.append({
            "source": "crm", "kind": "vendor_note",
            "ingested_at": ts(random.randint(0, NUM_DAYS - 1)),
            "payload": {
                "account": vendor,
                "note": f"Account flagged for risk review. Multiple delivery delays and compliance issues in Q1. Account manager reports declining relationship quality. Recommend supplier development meeting or transition planning.",
                "vendor_name": vendor,
                "tags": ["vendor_risk", "crm_note"]
            }
        })

    return sigs


# ═══════════════════════════════════════════
# PLANTED GAP #2: MONTH-END CLOSE (40+ signals)
# ═══════════════════════════════════════════
def _close_body(person, task):
    status = pick(['still pending', 'in progress', 'blocked', 'waiting on approval'])
    details = pick([
        f'Waiting on IT to run the batch extraction — ticket open for {random.randint(2,5)} days.',
        f'Manual spreadsheet reconciliation in progress — {random.randint(400, 1200)} line items to review.',
        f'Need CFO signature on {random.randint(2,5)} journal entries above $250K threshold.',
        f'Source data extract from legacy system failed again. Retrying with fallback query.',
        f'Variance of ${random.randint(5,300)}K unexplained in EMEA subsidiary. Root cause analysis underway.',
    ])
    return f"{person}: {task} for March 2026 close is {status}. {details}"


def month_end_close_signals():
    sigs = []
    close_tasks = [
        "Intercompany reconciliation", "Fixed asset depreciation run",
        "Accruals and deferrals posting", "Revenue recognition cutoff",
        "Bank reconciliation", "AP aging review and cleanup",
        "AR collections follow-up", "Inventory valuation adjustment",
        "Prepaid expense amortization", "Tax provision calculation",
        "Lease accounting entries (ASC 842)", "Foreign currency revaluation",
        "Goodwill impairment assessment", "Closing journal entries review",
    ]

    # Two month-end windows
    for window_start in [2, 9]:
        for task in close_tasks:
            person = pick(PEOPLE["finance"])
            day = window_start + random.randint(-1, 2)
            day = max(0, min(day, NUM_DAYS - 1))
            src = pick(["email", "tickets", "slack"])
            sigs.append({
                "source": src, "kind": "month_end_close",
                "ingested_at": ts(day),
                "payload": {
                    "subject": f"Month-end close: {task}",
                    "body": _close_body(person, task),
                    "task_type": "month_end_close",
                    "tags": ["month_end_close", "manual_process"]
                }
            })

        # Frustration signals in Slack
        for _ in range(random.randint(4, 7)):
            sigs.append({
                "source": "slack", "kind": "month_end_close",
                "ingested_at": ts(window_start + random.randint(0, 2)),
                "payload": {
                    "channel": "#finance-close",
                    "author": pick(PEOPLE["finance"]),
                    "body": pick([
                        f"Close checklist shows {random.randint(12, 20)} of 38 items still open. We're behind last month's pace by {random.randint(1, 3)} days.",
                        "Can someone explain why the consolidation journal is still manual? This takes 6 hours every single month.",
                        f"The close calendar says Day {random.randint(3,5)} but we're still on Day 1 tasks. Bottleneck is the intercompany reconciliation — {random.randint(140, 300)} entries to match.",
                        f"Just found a ${random.randint(100, 500)}K variance in the subsidiary roll-up. This is the third month in a row the same entity is off.",
                        f"Reminder: close signoff deadline is Friday COB. At current pace we will miss by {random.randint(1,3)} days. Escalating to Controller.",
                        "The month-end close checklist has 47 steps across 6 different systems. We manually copy data between 3 of them. This is not sustainable.",
                    ]),
                    "tags": ["month_end_close", "bottleneck"]
                }
            })

    return sigs


# ═══════════════════════════════════════════
# PLANTED GAP #3: ONBOARDING DRIFT (30+ signals)
# ═══════════════════════════════════════════
def onboarding_drift_signals():
    sigs = []
    new_hires = ["Jordan Ellis", "Mia Nakamura", "Darius Brown", "Lena Kowalski", "Omar Hassan", "Sofia Reyes", "Ryan Park"]

    for hire in new_hires:
        dept = pick(["Engineering", "Product", "Sales", "Operations", "Finance"])
        mgr = pick(PEOPLE[pick(list(PEOPLE.keys()))])

        # Ticket: IT provisioning
        sigs.append({
            "source": "tickets", "kind": "onboarding_issue",
            "ingested_at": ts(random.randint(0, NUM_DAYS - 1)),
            "payload": {
                "subject": f"IT provisioning incomplete — {hire} ({dept})",
                "body": f"New hire {hire} started in {dept} on Monday but still does not have {pick(['laptop', 'VPN access', 'email account', 'Slack access', 'badge access'])} configured as of Day {random.randint(2,5)}. They cannot {pick(['access the codebase', 'join team standups', 'complete required training', 'submit timesheets', 'access the building after hours'])}. Manager {mgr} is escalating.",
                "new_hire": hire,
                "tags": ["onboarding_drift", "it_provisioning", "new_hire"]
            }
        })

        # Slack: access issues
        sigs.append({
            "source": "slack", "kind": "onboarding_issue",
            "ingested_at": ts(random.randint(0, NUM_DAYS - 1)),
            "payload": {
                "channel": "#it-helpdesk",
                "author": hire,
                "body": f"Hi team, I'm {hire}, new in {dept}. I still don't have {pick(['building badge access — Security says the request was never submitted', 'a laptop — IT says the order is backordered', 'VPN access — my credentials show invalid', 'access to Jira/Confluence — getting 403 errors', 'my corporate email — still using personal for work communication'])}. HR says it was submitted {random.randint(5,14)} days ago. Can someone help?",
                "new_hire": hire,
                "tags": ["onboarding_drift", "access_issue", "new_hire"]
            }
        })

        # Doc: checklist conflict
        sigs.append({
            "source": "docs", "kind": "onboarding_issue",
            "ingested_at": ts(random.randint(0, NUM_DAYS - 1)),
            "payload": {
                "title": f"Onboarding checklist conflict — {hire} ({dept})",
                "body": f"Discrepancy found: HR used checklist v{random.randint(2,4)} for {hire} but IT and {dept} are following v{random.randint(5,7)}. {pick(['Safety training requirement missing from older version.', 'Security awareness module not included in HR checklist.', 'Equipment request form changed — old version references discontinued laptop model.', 'Background check consent form outdated — does not include new state requirements.'])} Compliance gap identified.",
                "new_hire": hire,
                "tags": ["onboarding_drift", "checklist_mismatch"]
            }
        })

    # General onboarding complaints
    for _ in range(random.randint(12, 18)):
        sigs.append({
            "source": pick(["slack", "tickets", "email", "docs"]),
            "kind": "onboarding_issue",
            "ingested_at": ts(random.randint(0, NUM_DAYS - 1)),
            "payload": {
                "subject": pick([
                    "Onboarding process feedback — too many manual handoffs",
                    "New hire orientation schedule conflicts with team deadlines",
                    "Benefits enrollment deadline missed — onboarding handoff failure",
                    "Manager checklist not completed for 3 recent hires",
                    "Training module assignments inconsistent across departments",
                    "Onboarding NPS score dropped to 3.2 — action needed",
                    "Exit interview data: 23% cite poor onboarding in first 90 days",
                ]),
                "body": pick([
                    f"{random.randint(4,7)} of the last {random.randint(8,12)} new hires reported not having a working laptop on Day 1. Average time to full productivity is now {random.randint(12,21)} days vs target of 5.",
                    f"The onboarding checklist has {random.randint(38,52)} items across {random.randint(5,8)} different systems. Completion rate last month: {random.randint(45,70)}%. Nobody completes all of them.",
                    f"Engineering onboarding still includes a paper PDF safety form from 2019. {random.randint(2,4)} new hires this month submitted it incorrectly.",
                    f"HR → IT handoff for provisioning takes an average of {random.randint(3,7)} business days. Industry benchmark is same-day. We're losing productivity and frustrating new talent.",
                    "Exit interview data from Q1 shows 23% of voluntary departures within 6 months cite poor onboarding experience. Cost per failed onboarding estimated at $47K.",
                ]),
                "tags": ["onboarding_drift", "process_gap"]
            }
        })

    return sigs


# ═══════════════════════════════════════════
# BACKGROUND SIGNALS (~7700 to reach ~8000 total)
# ═══════════════════════════════════════════
def background_signals(count):
    sigs = []

    email_templates = [
        ("Q3 budget review meeting — agenda attached", "finance"),
        ("Updated project timeline for RoboArm v4", "engineering"),
        ("Customer feedback report — March 2026", "logistics"),
        ("Patent filing update — gripper mechanism", "engineering"),
        ("Travel expense report — Tokyo factory visit", "finance"),
        ("RE: Quarterly business review with Stellaris Corp", "procurement"),
        ("Safety incident report — Assembly Line 3", "logistics"),
        ("Annual performance review cycle starting May 1", "hr"),
        ("R&D budget allocation proposal for FY27", "finance"),
        ("New product launch go/no-go decision", "engineering"),
        ("Board deck draft — Q1 results", "finance"),
        ("Customer escalation — delivery SLA breach", "logistics"),
        ("Headcount planning for H2 2026", "hr"),
        ("Competitive analysis update — March", "procurement"),
        ("IT security audit findings — 3 medium items", "it"),
    ]

    slack_templates = [
        "#general: Great demo today team! The gripper prototype looks promising.",
        "#engineering: Reminder — code freeze for v2.8 release is tomorrow 5pm.",
        "#engineering: Can someone review my PR #1247? Sitting for 3 days.",
        "#random: The cafeteria is serving sushi today.",
        "#ops: Standup notes posted in the wiki. Action items tagged.",
        "#engineering: Build pipeline is green after the flaky test fix.",
        "#customer-success: Customer site visit scheduled for April 15.",
        "#engineering: The new sensor fusion algorithm passed regression tests.",
        "#product: Sprint retro moved to Thursday 2pm.",
        "#ops: Server room temperature alert — HVAC maintenance scheduled.",
    ]

    ticket_templates = [
        ("Bug: sensor calibration drift after firmware update", "engineering"),
        ("Feature request: batch mode for quality inspection", "engineering"),
        ("Infrastructure: Redis cluster memory pressure", "it"),
        ("Customer: Stellaris Corp requesting API access", "engineering"),
        ("Maintenance: Servo motor replacement — Line 2", "logistics"),
        ("Performance: Latency spike in order processing", "it"),
        ("Documentation: API reference out of date for v2.7", "engineering"),
        ("Security: Penetration test remediation plan", "it"),
    ]

    doc_templates = [
        ("Architecture Decision Record — Event Sourcing Migration", "engineering"),
        ("Competitive Analysis — Q1 2026 Robotics Market", "procurement"),
        ("Standard Operating Procedure — Quality Control", "logistics"),
        ("Board Presentation — FY26 Mid-Year Review", "finance"),
        ("Technical Spec — Force Sensor Array v3", "engineering"),
        ("Incident Postmortem — March 12 Production Outage", "it"),
        ("Data Governance Policy — v2.1 Draft", "it"),
        ("Manufacturing Process Improvement Plan", "logistics"),
    ]

    crm_templates = [
        "Stellaris Corp — Renewal discussion scheduled Q3",
        "ProBuild Industries — New lead, enterprise tier",
        "MechaDyne Solutions — Demo requested for warehouse automation",
        "AeroFleet Systems — Expansion opportunity, 50 units",
        "NorthStar Manufacturing — Support ticket escalation",
        "Horizon Automotive — Pilot program review",
        "Atlas Heavy Industries — RFP response due April 20",
        "PrecisionWorks Ltd — Contract amendment pending legal",
    ]

    git_templates = [
        ("fix: resolve race condition in task scheduler", "acme/roboarm-firmware"),
        ("feat: add real-time telemetry dashboard", "acme/platform-api"),
        ("refactor: extract sensor fusion module", "acme/ml-models"),
        ("chore: update dependencies, fix security advisories", "acme/infra-terraform"),
        ("docs: add deployment runbook for production cluster", "acme/platform-api"),
        ("test: add integration tests for order pipeline", "acme/platform-api"),
        ("fix: memory leak in long-running calibration", "acme/roboarm-firmware"),
        ("feat: implement A/B testing for pricing model", "acme/ml-models"),
    ]

    for _ in range(count):
        src = random.choices(
            ["email", "slack", "tickets", "docs", "crm", "git"],
            weights=[25, 25, 20, 12, 10, 8],
            k=1
        )[0]

        day = random.randint(0, NUM_DAYS - 1)
        person = pick(PEOPLE[pick(list(PEOPLE.keys()))])

        if src == "email":
            tmpl = pick(email_templates)
            payload = {
                "subject": tmpl[0],
                "from": f"{person.lower().replace(' ', '.')}@acmerobotics.com",
                "body": f"{person} — {tmpl[0]}. Reference: REF-{random.randint(10000,99999)}. Department: {tmpl[1]}.",
                "tags": ["background", tmpl[1]]
            }
        elif src == "slack":
            msg = pick(slack_templates)
            payload = {
                "channel": msg.split(":")[0],
                "author": person,
                "body": msg.split(":", 1)[1].strip(),
                "tags": ["background"]
            }
        elif src == "tickets":
            tmpl = pick(ticket_templates)
            payload = {
                "subject": tmpl[0],
                "body": f"Reported by {person}. Priority: {pick(['low','medium','high'])}. Category: {tmpl[1]}.",
                "assigned_to": pick(PEOPLE[pick(list(PEOPLE.keys()))]),
                "tags": ["background", tmpl[1]]
            }
        elif src == "docs":
            tmpl = pick(doc_templates)
            payload = {
                "title": tmpl[0],
                "body": f"Document updated by {person}. Category: {tmpl[1]}. Last modified: {ts(day)}.",
                "author": person,
                "tags": ["background", tmpl[1]]
            }
        elif src == "crm":
            note = pick(crm_templates)
            payload = {
                "account": note.split("—")[0].strip(),
                "note": note,
                "updated_by": person,
                "tags": ["background", "crm"]
            }
        else:  # git
            tmpl = pick(git_templates)
            payload = {
                "commit_message": tmpl[0],
                "repo": tmpl[1],
                "author": person,
                "sha": uuid.uuid4().hex[:8],
                "tags": ["background", "git"]
            }

        sigs.append({
            "source": src, "kind": payload.get("tags", ["background"])[0] if "tags" in payload else "background",
            "ingested_at": ts(day),
            "payload": payload,
        })

    return sigs


def main():
    start = time.time()

    # Connect
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()
    r = redis.from_url(REDIS_URL, decode_responses=True)

    # Get tenant ID
    cur.execute("SELECT id FROM tenants WHERE slug = %s", (TENANT_SLUG,))
    tenant_row = cur.fetchone()
    if not tenant_row:
        print("ERROR: Acme Robotics tenant not found")
        sys.exit(1)
    tenant_id = tenant_row[0]

    # Clear existing signals
    cur.execute("DELETE FROM signals WHERE tenant_id = %s", (tenant_id,))
    print(f"Cleared existing signals for {TENANT_SLUG}")

    # Generate all signals
    vendor = vendor_risk_signals()
    close = month_end_close_signals()
    onboard = onboarding_drift_signals()
    planted = len(vendor) + len(close) + len(onboard)
    bg_count = max(0, 8000 - planted)
    bg = background_signals(bg_count)

    all_signals = vendor + close + onboard + bg
    random.shuffle(all_signals)

    print(f"Generated {len(all_signals)} signals ({len(vendor)} vendor, {len(close)} close, {len(onboard)} onboarding, {len(bg)} background)")

    # Insert into Postgres + publish to Redis
    batch_size = 500
    for i in range(0, len(all_signals), batch_size):
        batch = all_signals[i:i+batch_size]
        values = []
        for sig in batch:
            values.append((
                tenant_id,
                sig["source"],
                sig["kind"],
                json.dumps(sig["payload"]),
                sig["ingested_at"],
            ))
            # Publish to Redis stream
            try:
                stream_key = f"signals:{sig['source']}"
                r.xadd(stream_key, {
                    "tenant": TENANT_SLUG,
                    "kind": sig["kind"],
                    "payload": json.dumps(sig["payload"]),
                    "ingested_at": sig["ingested_at"],
                }, maxlen=50000)
            except Exception:
                pass

        psycopg2.extras.execute_batch(cur, """
            INSERT INTO signals (tenant_id, source, kind, payload, ingested_at)
            VALUES (%s, %s, %s, %s, %s)
        """, values)
        print(f"  Inserted {min(i+batch_size, len(all_signals))}/{len(all_signals)}")

    # Verify
    cur.execute("SELECT count(*) FROM signals WHERE tenant_id = %s", (tenant_id,))
    total = cur.fetchone()[0]

    cur.execute("SELECT count(*) FROM signals WHERE tenant_id = %s AND payload::text ILIKE '%%vendor%%'", (tenant_id,))
    vendor_count = cur.fetchone()[0]

    cur.execute("SELECT count(distinct source) FROM signals WHERE tenant_id = %s AND payload::text ILIKE '%%vendor%%'", (tenant_id,))
    vendor_sources = cur.fetchone()[0]

    # Redis stream lengths
    redis_counts = {}
    for src in ["email", "slack", "tickets", "docs", "crm", "git"]:
        try:
            redis_counts[src] = r.xlen(f"signals:{src}")
        except:
            redis_counts[src] = 0

    elapsed = time.time() - start

    conn.close()

    print(f"\n{'='*50}")
    print(f"SEED COMPLETE in {elapsed:.1f}s")
    print(f"{'='*50}")
    print(f"Total signals:        {total}")
    print(f"Vendor risk signals:  {vendor_count} across {vendor_sources} sources")
    print(f"Redis streams:        {json.dumps(redis_counts)}")
    print(f"{'='*50}")

    # Validation
    if total < 7000 or total > 9000:
        print(f"WARNING: Signal count {total} outside 7000-9000 range")
        sys.exit(1)
    if vendor_count < 60:
        print(f"FAIL: Vendor signals {vendor_count} < 60")
        sys.exit(1)
    if vendor_sources < 2:
        print(f"FAIL: Vendor sources {vendor_sources} < 2")
        sys.exit(1)

    print("ALL VALIDATIONS PASSED")


if __name__ == "__main__":
    main()
