import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronRight } from "lucide-react";

function fitnessColor(score: number) {
  if (score > 0.85) return "text-emerald-400";
  if (score > 0.7) return "text-cyan-400";
  if (score > 0.55) return "text-amber-400";
  return "text-red-400";
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-400",
    provisioning: "bg-amber-500/10 text-amber-400",
    proposed: "bg-slate-500/10 text-slate-400",
    degraded: "bg-red-500/10 text-red-400",
    retiring: "bg-purple-500/10 text-purple-400",
    archived: "bg-slate-600/10 text-slate-500",
  };
  return map[status] ?? "bg-slate-500/10 text-slate-400";
}

function domainBadge(domain: string) {
  const map: Record<string, string> = {
    procurement: "bg-cyan-500/10 text-cyan-400",
    finance: "bg-emerald-500/10 text-emerald-400",
    logistics: "bg-amber-500/10 text-amber-400",
    planning: "bg-purple-500/10 text-purple-400",
    workforce: "bg-red-500/10 text-red-400",
    customer: "bg-blue-500/10 text-blue-400",
  };
  return map[domain] ?? "bg-slate-500/10 text-slate-400";
}

function formatCurrency(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export default function CapabilityRegistry() {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: capabilities, isLoading } = useQuery<any[]>({
    queryKey: ["/api/capabilities"],
    refetchInterval: 10000,
  });

  const { data: expandedCap } = useQuery<any>({
    queryKey: ["/api/capabilities", expandedId],
    enabled: expandedId !== null,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/capabilities/${expandedId}`);
      return res.json();
    },
  });

  const { data: dashboard } = useQuery<any>({
    queryKey: ["/api/dashboard"],
    refetchInterval: 10000,
  });

  const maxGen = dashboard?.kpis?.evolutionGeneration ?? 0;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground" data-testid="page-title">
          Capability Registry
        </h1>
        <p className="text-sm text-muted-foreground">
          Living capability clusters — generation {maxGen}
        </p>
      </div>

      <Card className="border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="capabilities-table">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs">
                  <th className="text-left px-4 py-3 w-8" />
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-3 py-3">Domain</th>
                  <th className="text-left px-3 py-3">Status</th>
                  <th className="text-center px-3 py-3">Gen</th>
                  <th className="text-left px-3 py-3">Fitness</th>
                  <th className="text-center px-3 py-3">Trust</th>
                  <th className="text-left px-3 py-3">Budget</th>
                  <th className="text-center px-3 py-3">Auto</th>
                  <th className="text-center px-3 py-3">Agents</th>
                </tr>
              </thead>
              {(capabilities ?? []).map((cap: any) => {
                  const isExpanded = expandedId === cap.id;
                  const utilization = cap.budgetLimit > 0 ? cap.budgetConsumed / cap.budgetLimit : 0;
                  const budgetWarning = utilization > 0.9 ? "text-red-400" : utilization > 0.8 ? "text-amber-400" : "";

                  return (
                    <tbody key={cap.id}>
                      <tr
                        className="border-b border-border hover:bg-white/[0.02] cursor-pointer transition-colors"
                        onClick={() => setExpandedId(isExpanded ? null : cap.id)}
                        data-testid={`cap-row-${cap.id}`}
                      >
                        <td className="px-4 py-3">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {cap.name}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono ${domainBadge(cap.domain)}`}>
                            {cap.domain}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${statusBadge(cap.status)}`}>
                            {cap.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center font-mono text-xs tabular-nums text-foreground">
                          {cap.generation}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${cap.fitnessScore > 0.85 ? "bg-emerald-500" : cap.fitnessScore > 0.7 ? "bg-cyan-500" : cap.fitnessScore > 0.55 ? "bg-amber-500" : "bg-red-500"}`}
                                style={{ width: `${cap.fitnessScore * 100}%` }}
                              />
                            </div>
                            <span className={`font-mono text-xs tabular-nums ${fitnessColor(cap.fitnessScore)}`}>
                              {cap.fitnessScore.toFixed(2)}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center font-mono text-xs tabular-nums text-foreground">
                          {cap.trustScore.toFixed(2)}
                        </td>
                        <td className="px-3 py-3">
                          <div className="space-y-1">
                            <div className={`font-mono text-xs tabular-nums ${budgetWarning}`}>
                              {formatCurrency(cap.budgetConsumed)} / {formatCurrency(cap.budgetLimit)}
                            </div>
                            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${utilization > 0.9 ? "bg-red-500" : utilization > 0.8 ? "bg-amber-500" : "bg-cyan-500"}`}
                                style={{ width: `${Math.min(utilization * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center font-mono text-xs tabular-nums text-foreground">
                          {Math.round(cap.automationRate * 100)}%
                        </td>
                        <td className="px-3 py-3 text-center font-mono text-xs tabular-nums text-foreground">
                          {cap.agentCount}
                        </td>
                      </tr>
                      {isExpanded && expandedCap && (
                        <tr>
                          <td colSpan={10} className="bg-muted/30 px-8 py-4">
                            <div className="grid grid-cols-2 gap-6">
                              {/* Agents */}
                              <div>
                                <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                                  Agents
                                </div>
                                <div className="space-y-2">
                                  {(expandedCap.agents ?? []).map((agent: any) => (
                                    <div
                                      key={agent.id}
                                      className="flex items-center justify-between text-xs p-2 rounded bg-background border border-border"
                                    >
                                      <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${agent.status === "online" ? "bg-emerald-400" : agent.status === "busy" ? "bg-amber-400" : agent.status === "degraded" ? "bg-red-400" : "bg-slate-500"}`} />
                                        <span className="font-medium text-foreground">{agent.name}</span>
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${agent.role === "orchestrator" ? "bg-cyan-500/10 text-cyan-400" : agent.role === "sentinel" ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"}`}>
                                          {agent.role}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-3 text-muted-foreground font-mono tabular-nums">
                                        <span>Gen {agent.generation}</span>
                                        <span>Trust {agent.trustScore.toFixed(2)}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              {/* Tasks */}
                              <div>
                                <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                                  Recent Tasks
                                </div>
                                <div className="space-y-2">
                                  {(expandedCap.tasks ?? []).slice(0, 5).map((task: any) => (
                                    <div
                                      key={task.id}
                                      className="flex items-center justify-between text-xs p-2 rounded bg-background border border-border"
                                    >
                                      <span className="font-medium text-foreground truncate mr-2">
                                        {task.title}
                                      </span>
                                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] ${task.status === "completed" ? "bg-emerald-500/10 text-emerald-400" : task.status === "in_progress" ? "bg-cyan-500/10 text-cyan-400" : task.status === "failed" ? "bg-red-500/10 text-red-400" : "bg-slate-500/10 text-slate-400"}`}>
                                        {task.status}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  );
                })}
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
