/**
 * FLUID ENTERPRISE — Simulation Engine
 * 
 * Inspired by AlphaGo → AlphaZero → AlphaEvolve:
 * - Self-play: agents simulate business scenarios against each other
 * - Self-improvement: each generation improves on the last
 * - Emergent strategy: complex behaviors from simple rules
 * - Evolution: mutation, selection, and crossover of agent policies
 */

import { storage } from "./storage";

const CONFIDENCE_THRESHOLD = 0.65; // Below this, escalate to human
const COUNCIL_THRESHOLD = 0.80; // High-impact decisions need council review
const EVOLUTION_INTERVAL = 45000; // New generation every 45s
const DECISION_INTERVAL = 4000; // New decision every 4s
const ACTIVITY_INTERVAL = 2500; // Activity event every 2.5s

// ─── Agent name generators ───
const AGENT_PREFIXES = ["Alpha", "Nexus", "Flux", "Helix", "Prism", "Vega", "Orion", "Cipher", "Quant", "Astra", "Nova", "Zenith", "Pulse", "Drift", "Apex", "Echo", "Forge", "Lucid", "Onyx", "Rune"];
const AGENT_SUFFIXES = ["-7", "-X", "-Q", "-9", "-Prime", "-Core", "-Net", "-Arc", "-Syn", "-Mod"];

function randomName(): string {
  return AGENT_PREFIXES[Math.floor(Math.random() * AGENT_PREFIXES.length)] +
    AGENT_SUFFIXES[Math.floor(Math.random() * AGENT_SUFFIXES.length)];
}

function now(): string {
  return new Date().toISOString();
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Decision templates by guild domain ───
const DECISION_TEMPLATES: Record<string, { titles: string[]; descriptions: string[] }> = {
  finance: {
    titles: [
      "Quarterly revenue forecast adjustment",
      "Vendor payment optimization",
      "Currency hedging strategy shift",
      "Cost center reallocation proposal",
      "Invoice reconciliation anomaly detected",
      "Capital expenditure threshold review",
      "Intercompany transfer pricing update",
      "Cash flow projection recalibration",
      "Budget variance threshold breach",
      "Tax provision optimization opportunity",
    ],
    descriptions: [
      "Analyzing 47 data points across 3 fiscal periods to recommend adjustment",
      "Identified $2.3M savings opportunity through payment term renegotiation",
      "EUR/USD exposure exceeded tolerance band by 12%, recommending hedge increase",
      "Proposing reallocation of $890K from dormant initiatives to high-ROI projects",
      "Flagged 23 invoices with statistical anomalies requiring verification",
      "CapEx request exceeds delegated authority, initiating approval chain",
      "Transfer pricing model updated based on new OECD guidelines",
      "Cash runway projection updated with latest AR/AP aging data",
      "Operating expenses 8.3% over plan, identifying root causes",
      "Identified tax credit opportunity worth estimated $1.2M",
    ],
  },
  supply_chain: {
    titles: [
      "Supplier risk assessment triggered",
      "Inventory rebalancing across warehouses",
      "Logistics route optimization",
      "Demand forecast model recalibration",
      "Safety stock threshold adjustment",
      "New supplier qualification review",
      "Lead time anomaly in procurement",
      "Multi-modal shipping strategy revision",
      "Raw material price volatility response",
      "Quality control failure pattern detected",
    ],
    descriptions: [
      "Tier-1 supplier showing 3 consecutive late deliveries, risk score elevated",
      "Redistributing 12,000 units to reduce stockout probability from 8% to 2%",
      "Route optimization yields 14% reduction in transit time for APAC corridor",
      "ML model retrained on Q4 data, MAPE improved from 12% to 7.3%",
      "Safety stock for 34 SKUs adjusted based on updated demand volatility",
      "Evaluating 3 alternative suppliers for critical component category",
      "Procurement cycle time deviation of +18 days requires investigation",
      "Shifting 30% of ground freight to rail for carbon reduction target",
      "Commodity index spike of 23%, activating hedging protocol",
      "Batch rejection rate anomaly detected in supplier SN-4472",
    ],
  },
  customer: {
    titles: [
      "Customer churn prediction alert",
      "Sentiment analysis trend shift",
      "Pricing elasticity opportunity",
      "Customer lifetime value recalculation",
      "Support escalation pattern detected",
      "Cross-sell propensity model update",
      "NPS score trajectory change",
      "Customer segment migration detected",
      "Competitive win/loss analysis update",
      "Service level agreement risk",
    ],
    descriptions: [
      "12 enterprise accounts showing pre-churn behavioral signals",
      "Social sentiment shifted negative (-14%) following product update",
      "Price sensitivity analysis suggests 3-5% increase feasible in segment B",
      "CLV model updated: top decile now 4.2x more valuable than median",
      "Escalation volume up 28% in EMEA region, investigating root cause",
      "Model identifies $3.8M cross-sell opportunity in existing accounts",
      "NPS trending down 6 points over 90 days, activating recovery protocol",
      "340 accounts migrated from growth to mature segment this quarter",
      "Win rate against competitor X improved from 34% to 41%",
      "3 platinum accounts approaching SLA breach threshold",
    ],
  },
  hr: {
    titles: [
      "Attrition risk model triggered",
      "Compensation benchmark deviation",
      "Skills gap analysis completed",
      "Workforce planning forecast update",
      "Performance review cycle optimization",
      "Diversity metric trajectory change",
      "Learning path recommendation engine",
      "Succession planning gap identified",
      "Employee engagement pulse anomaly",
      "Recruitment pipeline velocity alert",
    ],
    descriptions: [
      "17 high-performers flagged with elevated flight risk score (>0.75)",
      "Engineering compensation 8% below market median, retention impact projected",
      "Identified 23 critical skills with <60% coverage across organization",
      "Headcount model projects 12% growth needed in AI/ML roles by Q3",
      "Proposed shift from annual to continuous review, projecting 18% efficiency gain",
      "Gender representation in leadership improved 4pp, pace tracking to target",
      "Personalized learning paths generated for 2,400 employees",
      "3 VP-level succession gaps identified requiring immediate development focus",
      "Team engagement score dropped 11 points in product engineering",
      "Time-to-fill increased 34% for senior roles, bottleneck in screening",
    ],
  },
  engineering: {
    titles: [
      "System reliability threshold breach",
      "Technical debt assessment update",
      "Infrastructure scaling recommendation",
      "Security vulnerability scan results",
      "API performance degradation detected",
      "Data pipeline latency optimization",
      "Microservice dependency risk analysis",
      "Cloud cost optimization opportunity",
      "Code quality metrics trend change",
      "Deployment frequency analysis",
    ],
    descriptions: [
      "SLA uptime dropped to 99.91%, below 99.95% target, initiating RCA",
      "Technical debt index increased 12%, recommending dedicated sprint allocation",
      "Traffic projection suggests auto-scaling threshold needs 40% increase",
      "Critical CVE detected in 3 production dependencies, patch priority HIGH",
      "P95 latency for payment API increased 340ms, investigating root cause",
      "ETL pipeline optimization reduced processing time by 67%",
      "Identified circular dependency risk across 4 microservices",
      "Reserved instance optimization could save $180K/year",
      "Test coverage dropped below 80% threshold in 2 critical modules",
      "Deployment frequency up 23%, failure rate stable at 2.1%",
    ],
  },
};

const ESCALATION_REASONS = [
  "Confidence level below human oversight threshold",
  "Decision impact exceeds agent authority level",
  "Regulatory compliance review required",
  "Conflicting signals from multiple data sources",
  "Novel scenario — no historical precedent found",
  "Cross-guild impact requires coordination approval",
  "Financial threshold exceeds delegated authority",
  "Potential reputational risk identified",
  "Council review resulted in deadlock",
  "EigenTrust score insufficient for autonomous action",
];

const MUTATION_TYPES = [
  "Decision boundary recalibration",
  "Confidence threshold adjustment",
  "Risk appetite parameter shift",
  "Pattern recognition sensitivity increase",
  "Cross-domain knowledge transfer",
  "Temporal weighting rebalance",
  "Anomaly detection threshold refinement",
  "Peer learning integration",
  "Reward function optimization",
  "Exploration-exploitation ratio shift",
];

const IMPROVEMENT_TYPES = [
  "Faster convergence on financial anomalies",
  "Reduced false positive rate in risk detection",
  "Improved cross-guild collaboration efficiency",
  "Higher confidence in novel scenario handling",
  "Better human intent interpretation accuracy",
  "Optimized resource allocation decisions",
  "Enhanced predictive modeling accuracy",
  "Reduced escalation rate through self-improvement",
  "Stronger consensus-building in council reviews",
  "More efficient skill composition patterns",
];

const SKILL_TEMPLATES = [
  { name: "Financial Reconciliation", category: "financial", description: "Automated matching and verification of financial records across systems" },
  { name: "Demand Forecasting", category: "analytical", description: "ML-driven demand prediction using multi-variate time series analysis" },
  { name: "Vendor Risk Scoring", category: "operational", description: "Continuous assessment of supplier reliability and financial health" },
  { name: "Cash Flow Projection", category: "financial", description: "Dynamic cash position forecasting with scenario modeling" },
  { name: "Sentiment Analysis", category: "analytical", description: "NLP-based customer and market sentiment tracking" },
  { name: "Route Optimization", category: "operational", description: "Multi-constraint logistics route planning and optimization" },
  { name: "Anomaly Detection", category: "analytical", description: "Statistical and ML-based identification of data anomalies" },
  { name: "Compliance Validation", category: "operational", description: "Real-time regulatory compliance checking across transactions" },
  { name: "Workforce Planning", category: "operational", description: "Predictive headcount and skills gap analysis" },
  { name: "Price Optimization", category: "analytical", description: "Dynamic pricing models based on elasticity and competition" },
  { name: "Invoice Processing", category: "financial", description: "Automated invoice extraction, matching, and posting" },
  { name: "Quality Prediction", category: "analytical", description: "Predictive quality analytics for manufacturing processes" },
  { name: "Contract Analysis", category: "operational", description: "NLP extraction of key terms, obligations, and risk clauses" },
  { name: "Churn Prediction", category: "analytical", description: "Multi-signal customer retention risk modeling" },
  { name: "Budget Variance Analysis", category: "financial", description: "Automated detection and root cause analysis of budget deviations" },
  { name: "Inventory Optimization", category: "operational", description: "Multi-echelon inventory optimization with safety stock tuning" },
  { name: "Fraud Detection", category: "analytical", description: "Real-time transaction monitoring for fraudulent patterns" },
  { name: "Tax Computation", category: "financial", description: "Multi-jurisdiction tax calculation and optimization" },
  { name: "Capacity Planning", category: "operational", description: "Infrastructure and resource capacity forecasting" },
  { name: "Knowledge Synthesis", category: "communication", description: "Cross-domain insight extraction and report generation" },
];

// ─── Seed the world ───
export function seedWorld() {
  const existingGuilds = storage.getGuilds();
  if (existingGuilds.length > 0) return; // Already seeded

  // Create guilds
  const guildDefs = [
    { name: "Finance Guild", domain: "finance", description: "Financial operations, reporting, treasury, tax, and compliance" },
    { name: "Supply Chain Guild", domain: "supply_chain", description: "Procurement, logistics, inventory, and supplier management" },
    { name: "Customer Intelligence Guild", domain: "customer", description: "CRM, customer analytics, pricing, and experience" },
    { name: "People & Culture Guild", domain: "hr", description: "Talent, compensation, workforce planning, and engagement" },
    { name: "Engineering Guild", domain: "engineering", description: "Platform reliability, security, infrastructure, and DevOps" },
  ];

  const createdGuilds = guildDefs.map((g) =>
    storage.createGuild({
      ...g,
      status: "active",
      performanceScore: rand(0.65, 0.85),
      agentCount: 0,
      generation: 1,
    })
  );

  // Create Archon (the central orchestrator)
  storage.createAgent({
    name: "ARCHON",
    type: "archon",
    guildId: null,
    status: "active",
    trustScore: 0.99,
    confidenceLevel: 0.95,
    generation: 1,
    capabilities: JSON.stringify(["orchestration", "intent_parsing", "delegation", "oversight"]),
    decisionsHandled: 0,
    successRate: 0.97,
    createdAt: now(),
    dissolvedAt: null,
  });

  // Create agents per guild
  createdGuilds.forEach((guild) => {
    // Guild leader
    storage.createAgent({
      name: `${guild.domain.charAt(0).toUpperCase() + guild.domain.slice(1).replace("_", "-")}-Prime`,
      type: "guild_leader",
      guildId: guild.id,
      status: "active",
      trustScore: rand(0.80, 0.95),
      confidenceLevel: rand(0.78, 0.92),
      generation: 1,
      capabilities: JSON.stringify([guild.domain, "leadership", "delegation"]),
      decisionsHandled: Math.floor(rand(20, 80)),
      successRate: rand(0.82, 0.95),
      createdAt: now(),
      dissolvedAt: null,
    });

    // Specialists (3-5 per guild)
    const specialistCount = Math.floor(rand(3, 6));
    for (let i = 0; i < specialistCount; i++) {
      storage.createAgent({
        name: randomName(),
        type: "specialist",
        guildId: guild.id,
        status: pick(["active", "active", "active", "busy"]),
        trustScore: rand(0.55, 0.90),
        confidenceLevel: rand(0.60, 0.88),
        generation: 1,
        capabilities: JSON.stringify([guild.domain, pick(["analysis", "execution", "monitoring", "optimization"])]),
        decisionsHandled: Math.floor(rand(5, 50)),
        successRate: rand(0.72, 0.93),
        createdAt: now(),
        dissolvedAt: null,
      });
    }

    // Sentinel (security/compliance per guild)
    storage.createAgent({
      name: `Sentinel-${guild.domain.charAt(0).toUpperCase()}${Math.floor(rand(1, 9))}`,
      type: "sentinel",
      guildId: guild.id,
      status: "active",
      trustScore: rand(0.85, 0.98),
      confidenceLevel: rand(0.82, 0.95),
      generation: 1,
      capabilities: JSON.stringify(["compliance", "audit", "security", guild.domain]),
      decisionsHandled: Math.floor(rand(10, 30)),
      successRate: rand(0.90, 0.99),
      createdAt: now(),
      dissolvedAt: null,
    });

    // Update guild agent count
    const guildAgents = storage.getAgentsByGuild(guild.id);
    storage.updateGuild(guild.id, { agentCount: guildAgents.length });
  });

  // Create skills
  SKILL_TEMPLATES.forEach((s) => {
    storage.createSkill({
      ...s,
      complexity: rand(0.3, 0.9),
      usageCount: Math.floor(rand(5, 200)),
      successRate: rand(0.78, 0.98),
    });
  });

  // Seed initial evolution history
  for (let gen = 1; gen <= 5; gen++) {
    storage.createEvolution({
      generationNumber: gen,
      guildId: null,
      fitnessScore: 0.40 + gen * 0.08 + rand(-0.02, 0.02),
      previousFitness: gen === 1 ? 0.35 : 0.40 + (gen - 1) * 0.08,
      mutations: JSON.stringify(
        Array.from({ length: Math.floor(rand(2, 5)) }, () => pick(MUTATION_TYPES))
      ),
      improvements: JSON.stringify(
        Array.from({ length: Math.floor(rand(1, 4)) }, () => pick(IMPROVEMENT_TYPES))
      ),
      agentsSurvived: Math.floor(rand(18, 28)),
      agentsEvolved: Math.floor(rand(3, 8)),
      agentsDissolved: Math.floor(rand(1, 4)),
      createdAt: new Date(Date.now() - (5 - gen) * 3600000).toISOString(),
    });
  }

  // Seed initial metrics
  const metricDefs = [
    { name: "Autonomous Decision Rate", value: 78.4, category: "operational", unit: "%" },
    { name: "Agent Trust Index", value: 0.847, category: "trust", unit: "score" },
    { name: "Evolution Fitness", value: 0.72, category: "evolution", unit: "score" },
    { name: "Human Escalation Rate", value: 12.3, category: "operational", unit: "%" },
    { name: "Cost Efficiency Gain", value: 34.7, category: "financial", unit: "%" },
    { name: "Decision Latency", value: 1.8, category: "operational", unit: "s" },
    { name: "Council Consensus Rate", value: 89.2, category: "trust", unit: "%" },
    { name: "Skill Utilization", value: 67.8, category: "operational", unit: "%" },
    { name: "Revenue Impact", value: 2.4, category: "financial", unit: "$M" },
    { name: "Compliance Score", value: 97.1, category: "trust", unit: "%" },
  ];

  metricDefs.forEach((m) => {
    storage.createMetric({ ...m, previousValue: m.value * rand(0.92, 0.99), createdAt: now() });
  });

  // Initial activity
  storage.createActivity({
    agentId: 1,
    guildId: null,
    eventType: "agent_spawned",
    title: "ARCHON initialized",
    description: "Central orchestrator online. Fluid Enterprise operational.",
    metadata: "{}",
    severity: "success",
    createdAt: now(),
  });

  storage.createActivity({
    agentId: null,
    guildId: null,
    eventType: "evolution",
    title: "Generation 5 complete",
    description: "System fitness improved to 0.72. 6 agents evolved, 2 dissolved.",
    metadata: JSON.stringify({ generation: 5, fitness: 0.72 }),
    severity: "info",
    createdAt: now(),
  });
}

// ─── Live simulation loop ───
let simulationRunning = false;
let currentGeneration = 6;

export function startSimulation() {
  if (simulationRunning) return;
  simulationRunning = true;

  // Generate decisions periodically
  setInterval(() => generateDecision(), DECISION_INTERVAL);

  // Generate activity events
  setInterval(() => generateActivity(), ACTIVITY_INTERVAL);

  // Evolution cycle
  setInterval(() => runEvolutionCycle(), EVOLUTION_INTERVAL);

  // Spawn/dissolve task agents occasionally
  setInterval(() => manageTaskAgents(), 15000);

  // Update metrics
  setInterval(() => updateMetrics(), 20000);
}

function generateDecision() {
  const allGuilds = storage.getGuilds();
  const guild = pick(allGuilds);
  if (!guild) return;

  const guildAgents = storage.getAgentsByGuild(guild.id).filter((a) => a.status !== "dissolved");
  if (guildAgents.length === 0) return;

  const agent = pick(guildAgents);
  const templates = DECISION_TEMPLATES[guild.domain] || DECISION_TEMPLATES.finance;
  const confidence = rand(0.35, 0.98);
  const impact = confidence < 0.5 ? "critical" : confidence < 0.65 ? "high" : confidence < 0.8 ? "medium" : "low";

  const decision = storage.createDecision({
    agentId: agent.id,
    guildId: guild.id,
    type: guild.domain,
    title: pick(templates.titles),
    description: pick(templates.descriptions),
    confidence,
    impact,
    status: confidence >= CONFIDENCE_THRESHOLD ? "auto_approved" : "escalated",
    outcome: confidence >= CONFIDENCE_THRESHOLD ? pick(["success", "success", "success", "partial"]) : null,
    createdAt: now(),
    resolvedAt: confidence >= CONFIDENCE_THRESHOLD ? now() : null,
  });

  // Update agent stats
  storage.updateAgent(agent.id, {
    decisionsHandled: agent.decisionsHandled + 1,
    trustScore: Math.min(1, agent.trustScore + (confidence >= CONFIDENCE_THRESHOLD ? 0.002 : -0.005)),
  });

  // Escalate if low confidence
  if (confidence < CONFIDENCE_THRESHOLD) {
    storage.createEscalation({
      decisionId: decision.id,
      agentId: agent.id,
      reason: pick(ESCALATION_REASONS),
      priority: impact === "critical" ? "critical" : impact === "high" ? "high" : "medium",
      context: JSON.stringify({
        guild: guild.name,
        agent: agent.name,
        confidence: confidence.toFixed(3),
        decision: decision.title,
      }),
      status: "pending",
      humanResponse: null,
      createdAt: now(),
      resolvedAt: null,
    });

    storage.createActivity({
      agentId: agent.id,
      guildId: guild.id,
      eventType: "escalation",
      title: `Escalation: ${decision.title}`,
      description: `${agent.name} requesting human oversight (confidence: ${(confidence * 100).toFixed(1)}%)`,
      metadata: JSON.stringify({ decisionId: decision.id, confidence }),
      severity: "warning",
      createdAt: now(),
    });
  }

  // Council review for high-impact decisions
  if (impact === "high" || impact === "critical") {
    const reviewers = guildAgents
      .filter((a) => a.id !== agent.id && a.trustScore > 0.7)
      .slice(0, 3);

    if (reviewers.length >= 2) {
      const votes: Record<number, string> = {};
      reviewers.forEach((r) => {
        votes[r.id] = rand(0, 1) > 0.2 ? "approve" : "reject";
      });

      const approvals = Object.values(votes).filter((v) => v === "approve").length;
      const consensus =
        approvals === reviewers.length ? "unanimous" :
        approvals > reviewers.length / 2 ? "majority" :
        approvals === reviewers.length / 2 ? "split" : "deadlock";

      storage.createCouncilReview({
        decisionId: decision.id,
        reviewerAgentIds: JSON.stringify(reviewers.map((r) => r.id)),
        votes: JSON.stringify(votes),
        consensus,
        outcome: consensus === "deadlock" ? "escalated" : approvals > reviewers.length / 2 ? "approved" : "rejected",
        createdAt: now(),
      });
    }
  }
}

function generateActivity() {
  const allAgents = storage.getAgents().filter((a) => a.status !== "dissolved");
  const agent = pick(allAgents);
  if (!agent) return;

  const eventTypes = [
    { type: "skill_used", title: `${agent.name} executed skill`, desc: `Completed task using composed skill set`, severity: "info" as const },
    { type: "decision_made", title: `${agent.name} autonomous decision`, desc: `Processed and resolved operational query`, severity: "info" as const },
    { type: "agent_spawned", title: `Task agent spawned by ${agent.name}`, desc: `On-demand capability deployed for one-shot execution`, severity: "success" as const },
    { type: "council_review", title: `Council review initiated`, desc: `Peer review protocol activated for high-impact decision`, severity: "info" as const },
  ];

  const event = pick(eventTypes);
  storage.createActivity({
    agentId: agent.id,
    guildId: agent.guildId,
    eventType: event.type,
    title: event.title,
    description: event.desc,
    metadata: JSON.stringify({ agentType: agent.type, trustScore: agent.trustScore }),
    severity: event.severity,
    createdAt: now(),
  });
}

function runEvolutionCycle() {
  const prevGen = storage.getEvolutionHistory(1)[0];
  const prevFitness = prevGen?.fitnessScore ?? 0.70;

  // Fitness improves with diminishing returns (like AlphaZero's learning curve)
  const fitnessGain = rand(0.005, 0.025) * Math.max(0.1, 1 - prevFitness);
  const newFitness = Math.min(0.99, prevFitness + fitnessGain);

  const mutations = Array.from(
    { length: Math.floor(rand(2, 6)) },
    () => pick(MUTATION_TYPES)
  );
  const improvements = Array.from(
    { length: Math.floor(rand(1, 4)) },
    () => pick(IMPROVEMENT_TYPES)
  );

  const allAgents = storage.getAgents().filter((a) => a.status !== "dissolved");
  const evolved = Math.floor(rand(2, 7));
  const dissolved = Math.floor(rand(0, 3));

  storage.createEvolution({
    generationNumber: currentGeneration,
    guildId: null,
    fitnessScore: newFitness,
    previousFitness: prevFitness,
    mutations: JSON.stringify(mutations),
    improvements: JSON.stringify(improvements),
    agentsSurvived: allAgents.length - dissolved,
    agentsEvolved: evolved,
    agentsDissolved: dissolved,
    createdAt: now(),
  });

  // Evolve some agents (improve their stats)
  const evolveTargets = allAgents
    .filter((a) => a.type !== "archon")
    .sort(() => Math.random() - 0.5)
    .slice(0, evolved);

  evolveTargets.forEach((agent) => {
    storage.updateAgent(agent.id, {
      generation: currentGeneration,
      trustScore: Math.min(1, agent.trustScore + rand(0.01, 0.04)),
      confidenceLevel: Math.min(1, agent.confidenceLevel + rand(0.005, 0.02)),
      successRate: Math.min(1, agent.successRate + rand(0.005, 0.015)),
    });
  });

  storage.createActivity({
    agentId: null,
    guildId: null,
    eventType: "evolution",
    title: `Generation ${currentGeneration} evolved`,
    description: `Fitness: ${(newFitness * 100).toFixed(1)}% (+${(fitnessGain * 100).toFixed(2)}%). ${evolved} agents evolved, ${dissolved} dissolved.`,
    metadata: JSON.stringify({ generation: currentGeneration, fitness: newFitness, mutations }),
    severity: "success",
    createdAt: now(),
  });

  currentGeneration++;
}

function manageTaskAgents() {
  // Occasionally spawn task agents
  if (Math.random() > 0.4) {
    const guilds_ = storage.getGuilds();
    const guild = pick(guilds_);
    if (!guild) return;

    const taskAgent = storage.createAgent({
      name: `Task-${randomName()}`,
      type: "task",
      guildId: guild.id,
      status: "busy",
      trustScore: rand(0.50, 0.75),
      confidenceLevel: rand(0.55, 0.80),
      generation: currentGeneration - 1,
      capabilities: JSON.stringify([guild.domain, "execution"]),
      decisionsHandled: 0,
      successRate: rand(0.70, 0.90),
      createdAt: now(),
      dissolvedAt: null,
    });

    storage.updateGuild(guild.id, { agentCount: storage.getAgentsByGuild(guild.id).length });

    // Auto-dissolve after a delay
    setTimeout(() => {
      storage.updateAgent(taskAgent.id, { status: "dissolved", dissolvedAt: now() });
      storage.updateGuild(guild.id, {
        agentCount: storage.getAgentsByGuild(guild.id).filter((a) => a.status !== "dissolved").length,
      });
    }, rand(8000, 25000));
  }
}

function updateMetrics() {
  const allAgents = storage.getAgents().filter((a) => a.status !== "dissolved");
  const avgTrust = allAgents.reduce((s, a) => s + a.trustScore, 0) / allAgents.length;
  const latestEvolution = storage.getEvolutionHistory(1)[0];
  const pendingEscalations = storage.getPendingEscalations();
  const recentDecisions = storage.getDecisions(100);
  const autoApproved = recentDecisions.filter((d) => d.status === "auto_approved").length;
  const autonomousRate = recentDecisions.length > 0 ? (autoApproved / recentDecisions.length) * 100 : 78;
  const escalationRate = recentDecisions.length > 0
    ? (recentDecisions.filter((d) => d.status === "escalated").length / recentDecisions.length) * 100
    : 12;

  const metricUpdates = [
    { name: "Autonomous Decision Rate", value: Math.min(99, autonomousRate + rand(-2, 2)), category: "operational", unit: "%" },
    { name: "Agent Trust Index", value: avgTrust, category: "trust", unit: "score" },
    { name: "Evolution Fitness", value: latestEvolution?.fitnessScore ?? 0.72, category: "evolution", unit: "score" },
    { name: "Human Escalation Rate", value: Math.max(1, escalationRate + rand(-1, 1)), category: "operational", unit: "%" },
    { name: "Active Agents", value: allAgents.length, category: "operational", unit: "count" },
    { name: "Pending Escalations", value: pendingEscalations.length, category: "operational", unit: "count" },
    { name: "Cost Efficiency Gain", value: 34.7 + rand(-2, 3), category: "financial", unit: "%" },
    { name: "Decision Latency", value: Math.max(0.3, 1.8 + rand(-0.3, 0.2)), category: "operational", unit: "s" },
    { name: "Council Consensus Rate", value: Math.min(99, 89.2 + rand(-3, 3)), category: "trust", unit: "%" },
    { name: "Skill Utilization", value: Math.min(99, 67.8 + rand(-3, 4)), category: "operational", unit: "%" },
  ];

  const existing = storage.getLatestMetrics();
  metricUpdates.forEach((m) => {
    const prev = existing.find((e) => e.name === m.name);
    storage.createMetric({
      ...m,
      previousValue: prev?.value ?? m.value * 0.95,
      createdAt: now(),
    });
  });
}
