---
id: cap_vendor_risk_triage
name: Vendor Risk Triage
kind: agent
version: "1.0.0"
generation: 8
parent: null
stage: proposed
owner: acme_robotics
budget_monthly_usd: 750.00
inputs:
  - name: vendor_name
    type: string
    description: Name of the vendor to assess
    required: true
  - name: signals
    type: array
    description: Array of signal objects from the Signal Bus related to this vendor
    required: true
  - name: risk_thresholds
    type: object
    description: Configurable risk thresholds for each risk category
    required: false
outputs:
  - name: risk_score
    type: number
    description: Composite risk score 0-100 (0=no risk, 100=critical)
  - name: risk_level
    type: string
    description: "critical | high | medium | low"
  - name: risk_breakdown
    type: object
    description: Per-category risk scores (delivery, compliance, financial, stability)
  - name: recommended_actions
    type: array
    description: Prioritized list of recommended actions
  - name: escalation_required
    type: boolean
    description: Whether this vendor requires immediate governance escalation
  - name: audit_trail
    type: array
    description: Step-by-step reasoning chain for auditability
tools:
  - signal_query
  - compliance_registry
  - financial_ledger
policies:
  - immutable_audit_trail
  - requires_human_approval_above_10k
  - dual_sourcing_trigger_at_critical
fitness_objective: "Minimize vendor risk exposure score across portfolio while maintaining supply continuity. Target: reduce mean time to risk detection from 14 days to <24 hours."
eval_suite: eval.jsonl
---

# Vendor Risk Triage Agent

Multi-step autonomous agent that continuously monitors vendor signals,
computes real-time risk scores across four dimensions (delivery performance,
compliance posture, financial stability, and invoice integrity), and
triggers governance escalations when thresholds are breached.

## How It Works

1. **Signal Ingestion**: Pulls all signals tagged with the vendor name
   from the Signal Bus across all 6 sources
2. **Risk Decomposition**: Scores each of 4 risk dimensions independently
3. **Composite Scoring**: Weighted combination with configurable thresholds
4. **Action Generation**: Maps risk levels to concrete remediation steps
5. **Escalation Logic**: Auto-escalates to governance when composite > 75
   or any single dimension exceeds critical threshold

## Fitness Objective

The agent is evaluated on:
- Detection accuracy (did it flag vendors that actually caused disruption?)
- Mean time to detection (how quickly after first signal?)
- False positive rate (did it flag healthy vendors?)
- Action relevance (were recommended actions actionable?)
