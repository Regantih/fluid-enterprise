import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dna,
  ShieldCheck,
  Cpu,
  Users,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

function fitnessColor(score: number) {
  if (score > 0.85) return "text-emerald-400";
  if (score > 0.7) return "text-cyan-400";
  if (score > 0.55) return "text-amber-400";
  return "text-red-400";
}

function fitnessBg(score: number) {
  if (score > 0.85) return "bg-emerald-500/10";
  if (score > 0.7) return "bg-cyan-500/10";
  if (score > 0.55) return "bg-amber-500/10";
  return "bg-red-500/10";
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-400",
    provisioning: "bg-amber-500/10 text-amber-400",
    proposed: "bg-slate-500/10 text-slate-400",
    degraded: "bg-red-500/10 text-red-400",
    retiring: "bg-purple-500/10 text-purple-400",
    archived: "bg-slate-500/10 text-slate-500",
  };
  return map[status] ?? "bg-slate-500/10 text-slate-400";
}

function severityDot(severity: string) {
  const map: Record<string, string> = {
    info: "bg-blue-400",
    warning: "bg-amber-400",
    error: "bg-red-400",
    success: "bg-emerald-400",
  };
  return map[severity] ?? "bg-slate-400";
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatCurrency(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export default function Dashboard() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/dashboard"],
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const kpis = data?.kpis ?? {};
  const capabilities = data?.capabilities ?? [];
  const recentActivity = data?.recentActivity ?? [];
  const costTrend = data?.costTrend ?? [];

  const maxCost = Math.max(...costTrend.map((d: any) => d.total), 1);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground" data-testid="page-title">
            Command Center
          </h1>
          <p className="text-sm text-muted-foreground">
            Self-evolving autonomous operations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 pulse-live" />
            LIVE
          </span>
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-mono font-bold"
            data-testid="header-generation"
          >
            GEN {kpis.evolutionGeneration ?? 0}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-6 gap-3">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Dna className="w-4 h-4 text-cyan-400" />
              <ArrowUpRight className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="font-mono text-lg font-bold tabular-nums text-foreground" data-testid="kpi-fitness">
              {(kpis.systemFitness ?? 0).toFixed(3)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              System Fitness · Gen {kpis.evolutionGeneration ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <ArrowUpRight className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="font-mono text-lg font-bold tabular-nums text-foreground" data-testid="kpi-trust">
              {(kpis.trustIndexAvg ?? 0).toFixed(3)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Trust Index
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <ArrowUpRight className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="font-mono text-lg font-bold tabular-nums text-foreground" data-testid="kpi-automation">
              {Math.round((kpis.automationRateAvg ?? 0) * 100)}%
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Automation Rate
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-4 h-4 text-purple-400" />
            </div>
            <div className="font-mono text-lg font-bold tabular-nums text-foreground" data-testid="kpi-agents">
              {kpis.activeAgents ?? 0}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Active Agents
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-4 h-4 text-amber-400" />
              {(kpis.budgetUtilization ?? 0) > 0.8 ? (
                <ArrowUpRight className="w-3 h-3 text-red-400" />
              ) : (
                <ArrowDownRight className="w-3 h-3 text-emerald-400" />
              )}
            </div>
            <div className="font-mono text-lg font-bold tabular-nums text-foreground" data-testid="kpi-budget">
              {formatCurrency(kpis.totalConsumed ?? 0)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Budget · {formatCurrency(kpis.totalLimit ?? 0)} limit
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="font-mono text-lg font-bold tabular-nums text-foreground" data-testid="kpi-governance">
              {kpis.pendingGovernance ?? 0}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Pending Governance
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle: Capability Health + Activity */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <Card className="border-border h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Capability Health Grid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {capabilities.map((cap: any) => (
                  <div
                    key={cap.id}
                    className={`p-3 rounded-lg border border-border ${fitnessBg(cap.fitnessScore)}`}
                    data-testid={`cap-card-${cap.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-sm text-foreground truncate">
                        {cap.name}
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        Gen {cap.generation}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono ${statusBadge(cap.status)}`}>
                        {cap.status}
                      </span>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-500/10 text-slate-400`}>
                        {cap.domain}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="text-muted-foreground">Fitness </span>
                        <span className={`font-mono font-bold tabular-nums ${fitnessColor(cap.fitnessScore)}`}>
                          {cap.fitnessScore.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Auto </span>
                        <span className="font-mono tabular-nums text-foreground">
                          {Math.round(cap.automationRate * 100)}%
                        </span>
                      </div>
                    </div>
                    {/* Trust bar */}
                    <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${cap.trustScore * 100}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
                      <span>Trust {cap.trustScore.toFixed(2)}</span>
                      <span>{cap.agentCount} agents</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div>
          <Card className="border-border h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((a: any) => (
                  <div key={a.id} className="flex gap-2.5" data-testid={`activity-${a.id}`}>
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${severityDot(a.severity)}`} />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-foreground truncate">
                        {a.title}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {timeAgo(a.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cost Trend */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">30-Day Cost Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-32" data-testid="cost-chart">
            {[...costTrend].reverse().map((d: any, i: number) => {
              const height = maxCost > 0 ? (d.total / maxCost) * 100 : 0;
              const avgDaily = costTrend.reduce((s: number, x: any) => s + x.total, 0) / Math.max(costTrend.length, 1);
              let barColor = "bg-emerald-500";
              if (d.total > avgDaily * 1.5) barColor = "bg-red-500";
              else if (d.total > avgDaily) barColor = "bg-amber-500";

              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-end group relative"
                >
                  <div className="absolute -top-6 hidden group-hover:block bg-popover text-foreground text-[10px] font-mono px-1.5 py-0.5 rounded border border-border whitespace-nowrap z-10">
                    ${d.total.toFixed(0)}
                  </div>
                  <div
                    className={`w-full rounded-t ${barColor} transition-all min-h-[2px]`}
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-muted-foreground font-mono">
            <span>30d ago</span>
            <span>Today</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
