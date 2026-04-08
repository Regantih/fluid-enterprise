import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowUp,
  ArrowDown,
  Activity,
  Users,
  BrainCircuit,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Truck,
  HeadphonesIcon,
  HardHat,
  Wrench,
} from "lucide-react";

type DashboardData = {
  agents: { total: number; byType: Record<string, number>; byStatus: Record<string, number> };
  guilds: Array<{
    id: number;
    name: string;
    domain: string;
    status: string;
    performanceScore: number;
    agentCount: number;
    agents: number;
  }>;
  metrics: Array<{
    id: number;
    name: string;
    value: number;
    previousValue: number | null;
    category: string;
    unit: string;
  }>;
  recentActivity: Array<{
    id: number;
    title: string;
    description: string;
    severity: string;
    createdAt: string;
  }>;
  pendingEscalations: number;
  latestEvolution: { generationNumber: number; fitnessScore: number } | null;
  recentDecisions: Array<{
    id: number;
    agentId: number;
    guildId: number | null;
    type: string;
    title: string;
    description: string;
    confidence: number;
    impact: string;
    status: string;
    createdAt: string;
  }>;
};

const domainIcons: Record<string, any> = {
  finance: DollarSign,
  supply_chain: Truck,
  customer: HeadphonesIcon,
  hr: Users,
  engineering: Wrench,
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function KPICard({
  label,
  value,
  prev,
  unit,
  icon: Icon,
}: {
  label: string;
  value: number;
  prev: number | null;
  unit: string;
  icon: any;
}) {
  const formatted = unit === "%" ? value.toFixed(1) : unit === "score" ? value.toFixed(3) : String(value);
  const delta = prev != null ? value - prev : 0;
  const deltaAbs = unit === "%" ? Math.abs(delta).toFixed(1) : Math.abs(delta).toFixed(2);
  const isUp = delta > 0;
  const isNeutral = Math.abs(delta) < 0.001;

  return (
    <div
      className="bg-card border border-card-border rounded-lg p-4 flex flex-col gap-2"
      data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </span>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex items-end gap-2">
        <span className="text-xl font-semibold font-mono tabular-nums text-foreground">
          {formatted}
          {unit === "%" && <span className="text-sm text-muted-foreground ml-0.5">%</span>}
        </span>
        {!isNeutral && (
          <span
            className={`flex items-center gap-0.5 text-[11px] font-mono tabular-nums mb-0.5 ${
              isUp ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {isUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {deltaAbs}
          </span>
        )}
      </div>
    </div>
  );
}

const severityColors: Record<string, string> = {
  info: "bg-cyan-400",
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  critical: "bg-red-400",
};

const impactBadge: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-400",
  medium: "bg-cyan-500/10 text-cyan-400",
  high: "bg-amber-500/10 text-amber-400",
  critical: "bg-red-500/10 text-red-400",
};

const statusBadge: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400",
  auto_approved: "bg-emerald-500/10 text-emerald-400",
  escalated: "bg-red-500/10 text-red-400",
  human_approved: "bg-cyan-500/10 text-cyan-400",
  human_rejected: "bg-red-500/10 text-red-400",
};

export default function CommandCenter() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
    refetchInterval: 5000,
  });

  if (isLoading || !data) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
        <Skeleton className="h-60 rounded-lg" />
      </div>
    );
  }

  const metricsMap = new Map(data.metrics.map((m) => [m.name, m]));
  const decisionRate = metricsMap.get("Autonomous Decision Rate");
  const trustIndex = metricsMap.get("Agent Trust Index");
  const fitness = metricsMap.get("Evolution Fitness");
  const escalationRate = metricsMap.get("Human Escalation Rate");

  return (
    <div className="p-6 space-y-6" data-testid="command-center">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Command Center</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">Real-time autonomous operations dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 pulse-live" />
          <span className="text-[11px] text-muted-foreground font-mono">LIVE</span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-5 gap-4" data-testid="kpi-row">
        <KPICard
          label="Autonomous Decision Rate"
          value={decisionRate?.value ?? 0}
          prev={decisionRate?.previousValue ?? null}
          unit="%"
          icon={BrainCircuit}
        />
        <KPICard
          label="Agent Trust Index"
          value={trustIndex?.value ?? 0}
          prev={trustIndex?.previousValue ?? null}
          unit="score"
          icon={Activity}
        />
        <KPICard
          label="Evolution Fitness"
          value={fitness?.value ?? 0}
          prev={fitness?.previousValue ?? null}
          unit="score"
          icon={TrendingUp}
        />
        <KPICard
          label="Human Escalation Rate"
          value={escalationRate?.value ?? 0}
          prev={escalationRate?.previousValue ?? null}
          unit="%"
          icon={AlertTriangle}
        />
        <KPICard
          label="Active Agents"
          value={data.agents.total}
          prev={null}
          unit="count"
          icon={Users}
        />
      </div>

      {/* Middle Row: Guilds + Activity */}
      <div className="grid grid-cols-2 gap-6">
        {/* Guild Performance */}
        <div className="bg-card border border-card-border rounded-lg p-4" data-testid="guild-performance">
          <h2 className="text-[13px] font-semibold text-foreground mb-3 uppercase tracking-wider">
            Guild Performance
          </h2>
          <div className="space-y-3">
            {data.guilds.map((guild) => {
              const DomainIcon = domainIcons[guild.domain] || HardHat;
              return (
                <div
                  key={guild.id}
                  className="flex items-center gap-3 p-2.5 rounded-md bg-background/50 border border-border/50"
                  data-testid={`guild-card-${guild.id}`}
                >
                  <div className="w-8 h-8 rounded-md bg-cyan-500/10 flex items-center justify-center">
                    <DomainIcon className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-medium text-foreground truncate">{guild.name}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                          guild.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : guild.status === "evolving"
                            ? "bg-cyan-500/10 text-cyan-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {guild.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${guild.performanceScore * 100}%`,
                            background:
                              guild.performanceScore > 0.8
                                ? "hsl(160 60% 45%)"
                                : guild.performanceScore > 0.6
                                ? "hsl(187 85% 48%)"
                                : "hsl(38 92% 50%)",
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-mono tabular-nums text-muted-foreground w-10 text-right">
                        {(guild.performanceScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
                      {guild.agents} agents
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card border border-card-border rounded-lg p-4" data-testid="recent-activity">
          <h2 className="text-[13px] font-semibold text-foreground mb-3 uppercase tracking-wider">
            Recent Activity
          </h2>
          <div className="space-y-1 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
            {data.recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-2.5 py-2 border-b border-border/30 last:border-0"
                data-testid={`activity-${activity.id}`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                    severityColors[activity.severity] || "bg-muted-foreground"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-foreground truncate">{activity.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{activity.description}</p>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono tabular-nums shrink-0">
                  {timeAgo(activity.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Decisions Table */}
      <div className="bg-card border border-card-border rounded-lg p-4" data-testid="recent-decisions">
        <h2 className="text-[13px] font-semibold text-foreground mb-3 uppercase tracking-wider">
          Recent Decisions
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-2 px-2 text-muted-foreground font-medium text-[10px] uppercase tracking-wider">
                  Decision
                </th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium text-[10px] uppercase tracking-wider">
                  Agent
                </th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium text-[10px] uppercase tracking-wider">
                  Confidence
                </th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium text-[10px] uppercase tracking-wider">
                  Impact
                </th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium text-[10px] uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium text-[10px] uppercase tracking-wider">
                  Time
                </th>
              </tr>
            </thead>
            <tbody>
              {data.recentDecisions.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-border/20 hover:bg-muted/30 transition-colors"
                  data-testid={`decision-row-${d.id}`}
                >
                  <td className="py-2 px-2">
                    <span className="text-foreground font-medium">{d.title}</span>
                  </td>
                  <td className="py-2 px-2">
                    <span className="text-muted-foreground font-mono tabular-nums">#{d.agentId}</span>
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-cyan-400 transition-all"
                          style={{ width: `${d.confidence * 100}%` }}
                        />
                      </div>
                      <span className="font-mono tabular-nums text-muted-foreground text-[10px]">
                        {(d.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${impactBadge[d.impact] || ""}`}>
                      {d.impact}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        statusBadge[d.status] || ""
                      }`}
                    >
                      {d.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right">
                    <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
                      {timeAgo(d.createdAt)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
