import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingDown, BarChart3, AlertTriangle } from "lucide-react";

function formatCurrency(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export default function CostDashboard() {
  const { data: dailyTotals, isLoading: dailyLoading } = useQuery<any[]>({
    queryKey: ["/api/costs/daily"],
    refetchInterval: 15000,
  });

  const { data: capabilities } = useQuery<any[]>({
    queryKey: ["/api/capabilities"],
    refetchInterval: 15000,
  });

  if (dailyLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  const caps = capabilities ?? [];
  const trend = dailyTotals ?? [];

  const totalBudget = caps.reduce((s, c) => s + c.budgetAllocated, 0);
  const totalConsumed = caps.reduce((s, c) => s + c.budgetConsumed, 0);
  const totalLimit = caps.reduce((s, c) => s + c.budgetLimit, 0);
  const utilization = totalLimit > 0 ? totalConsumed / totalLimit : 0;

  const totalDecisions = caps.reduce((s, c) => {
    // We'll approximate from budget data
    return s;
  }, 0);

  // Compute total decisions from agents
  const costPerDecision = totalConsumed > 0 ? totalConsumed / Math.max(1, caps.reduce((s, c) => s + c.agentCount * 500, 0)) : 0;

  // Daily chart
  const chartData = [...trend].reverse();
  const maxCost = Math.max(...chartData.map(d => d.total), 1);
  const avgDaily = chartData.length > 0
    ? chartData.reduce((s, d) => s + d.total, 0) / chartData.length
    : 0;

  // Budget alerts
  const alerts = caps.filter(c => {
    const util = c.budgetLimit > 0 ? c.budgetConsumed / c.budgetLimit : 0;
    return util > 0.85;
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground" data-testid="page-title">
          Cost Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Agent economics — cost of experimentation → zero
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-muted-foreground">Total Budget</span>
            </div>
            <div className="font-mono text-xl font-bold tabular-nums text-foreground" data-testid="cost-total-budget">
              {formatCurrency(totalBudget)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-muted-foreground">Total Consumed</span>
            </div>
            <div className="font-mono text-xl font-bold tabular-nums text-foreground" data-testid="cost-total-consumed">
              {formatCurrency(totalConsumed)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-muted-foreground">Budget Utilization</span>
            </div>
            <div className={`font-mono text-xl font-bold tabular-nums ${utilization > 0.9 ? "text-red-400" : utilization > 0.75 ? "text-amber-400" : "text-foreground"}`} data-testid="cost-utilization">
              {Math.round(utilization * 100)}%
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-muted-foreground">Avg Daily Spend</span>
            </div>
            <div className="font-mono text-xl font-bold tabular-nums text-foreground" data-testid="cost-daily-avg">
              {formatCurrency(avgDaily)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 30-day spend trend */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">30-Day Spend Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-40" data-testid="cost-trend-chart">
            {chartData.map((d: any, i: number) => {
              const height = maxCost > 0 ? (d.total / maxCost) * 100 : 0;
              let barColor = "bg-emerald-500";
              if (d.total > avgDaily * 1.5) barColor = "bg-red-500";
              else if (d.total > avgDaily) barColor = "bg-amber-500";

              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
                  <div className="absolute -top-8 hidden group-hover:block bg-popover text-foreground text-[10px] font-mono px-2 py-1 rounded border border-border whitespace-nowrap z-10">
                    Day {d.day}: ${d.total.toFixed(0)}
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
            <span className="text-cyan-400">Avg: {formatCurrency(avgDaily)}/day</span>
            <span>Today</span>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown by capability */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Capability Budget Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm" data-testid="cost-breakdown-table">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs">
                <th className="text-left px-4 py-2">Capability</th>
                <th className="text-right px-3 py-2">Allocated</th>
                <th className="text-right px-3 py-2">Consumed</th>
                <th className="text-right px-3 py-2">Remaining</th>
                <th className="text-left px-3 py-2 w-40">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {caps.map((cap: any) => {
                const remaining = cap.budgetLimit - cap.budgetConsumed;
                const util = cap.budgetLimit > 0 ? cap.budgetConsumed / cap.budgetLimit : 0;
                const rowHighlight = util > 0.95 ? "bg-red-500/5" : util > 0.85 ? "bg-amber-500/5" : "";

                return (
                  <tr key={cap.id} className={`border-b border-border ${rowHighlight}`} data-testid={`cost-row-${cap.id}`}>
                    <td className="px-4 py-2 font-medium text-foreground">{cap.name}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-muted-foreground">
                      {formatCurrency(cap.budgetAllocated)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-foreground">
                      {formatCurrency(cap.budgetConsumed)}
                    </td>
                    <td className={`px-3 py-2 text-right font-mono text-xs tabular-nums ${remaining < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                      {formatCurrency(remaining)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${util > 0.95 ? "bg-red-500" : util > 0.85 ? "bg-amber-500" : "bg-cyan-500"}`}
                            style={{ width: `${Math.min(util * 100, 100)}%` }}
                          />
                        </div>
                        <span className={`font-mono text-xs tabular-nums ${util > 0.95 ? "text-red-400" : util > 0.85 ? "text-amber-400" : "text-muted-foreground"}`}>
                          {Math.round(util * 100)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Budget alerts */}
      {alerts.length > 0 && (
        <Card className="border-border border-amber-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Budget Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((cap: any) => {
                const util = cap.budgetLimit > 0 ? cap.budgetConsumed / cap.budgetLimit : 0;
                return (
                  <div key={cap.id} className="flex items-center justify-between p-2 rounded bg-amber-500/5 border border-amber-500/20 text-xs">
                    <span className="font-medium text-foreground">{cap.name}</span>
                    <span className={`font-mono tabular-nums ${util > 0.95 ? "text-red-400" : "text-amber-400"}`}>
                      {Math.round(util * 100)}% of budget consumed — {formatCurrency(cap.budgetLimit - cap.budgetConsumed)} remaining
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
