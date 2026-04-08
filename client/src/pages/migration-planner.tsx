import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, CheckCircle2, Loader2, FlaskConical, Clock, Archive } from "lucide-react";

function migrationStatusBadge(status: string) {
  const map: Record<string, { class: string; icon: any }> = {
    live: { class: "bg-emerald-500/10 text-emerald-400", icon: CheckCircle2 },
    in_progress: { class: "bg-amber-500/10 text-amber-400", icon: Loader2 },
    testing: { class: "bg-cyan-500/10 text-cyan-400", icon: FlaskConical },
    planned: { class: "bg-slate-500/10 text-slate-400", icon: Clock },
    decommissioned: { class: "bg-slate-600/10 text-slate-500 line-through", icon: Archive },
  };
  return map[status] ?? { class: "bg-slate-500/10 text-slate-400", icon: Clock };
}

function complexityBadge(complexity: string) {
  const map: Record<string, string> = {
    critical: "bg-red-500/10 text-red-400",
    high: "bg-amber-500/10 text-amber-400",
    medium: "bg-cyan-500/10 text-cyan-400",
    low: "bg-emerald-500/10 text-emerald-400",
  };
  return map[complexity] ?? "bg-slate-500/10 text-slate-400";
}

export default function MigrationPlanner() {
  const { data: migrations, isLoading } = useQuery<any[]>({
    queryKey: ["/api/migration"],
    refetchInterval: 10000,
  });

  const { data: capabilities } = useQuery<any[]>({
    queryKey: ["/api/capabilities"],
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const items = migrations ?? [];
  const caps = capabilities ?? [];

  const liveCount = items.filter(m => m.migrationStatus === "live").length;
  const totalCount = items.length;
  const overallProgress = totalCount > 0
    ? items.reduce((s, m) => s + m.progress, 0) / totalCount
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground" data-testid="page-title">
          Migration Planner
        </h1>
        <p className="text-sm text-muted-foreground">
          Legacy → Fluid capability mapping
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="font-mono text-2xl font-bold tabular-nums text-foreground" data-testid="migration-live-count">
              {liveCount} <span className="text-sm text-muted-foreground font-normal">of {totalCount}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">Systems Migrated</div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="font-mono text-2xl font-bold tabular-nums text-foreground" data-testid="migration-progress">
              {Math.round(overallProgress * 100)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">Overall Progress</div>
            <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 rounded-full transition-all"
                style={{ width: `${overallProgress * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="font-mono text-2xl font-bold tabular-nums text-foreground">
              {items.reduce((s, m) => s + m.estimatedWeeks, 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Total Estimated Weeks</div>
          </CardContent>
        </Card>
      </div>

      {/* Migration Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="migration-table">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs">
                  <th className="text-left px-4 py-3">Legacy System</th>
                  <th className="text-center px-3 py-3 w-8"></th>
                  <th className="text-left px-3 py-3">Fluid Capability</th>
                  <th className="text-left px-3 py-3">Status</th>
                  <th className="text-left px-3 py-3">Progress</th>
                  <th className="text-left px-3 py-3">Complexity</th>
                  <th className="text-left px-3 py-3">Data Volume</th>
                  <th className="text-center px-3 py-3">Weeks</th>
                </tr>
              </thead>
              <tbody>
                {items.map((m: any) => {
                  const cap = caps.find(c => c.id === m.capabilityId);
                  const statusInfo = migrationStatusBadge(m.migrationStatus);
                  const StatusIcon = statusInfo.icon;

                  return (
                    <tr key={m.id} className="border-b border-border hover:bg-white/[0.02]" data-testid={`migration-row-${m.id}`}>
                      <td className="px-4 py-3">
                        <div className={`font-medium text-foreground ${m.migrationStatus === "decommissioned" ? "line-through text-muted-foreground" : ""}`}>
                          {m.legacySystem}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 max-w-[200px] truncate">
                          {m.legacyDescription}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <ArrowRight className="w-4 h-4 text-cyan-400 mx-auto" />
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-foreground">{cap?.name ?? "—"}</div>
                        {cap && (
                          <span className="text-[10px] font-mono text-cyan-400">Gen {cap.generation}</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${statusInfo.class}`}>
                          <StatusIcon className="w-3 h-3" />
                          {m.migrationStatus.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${m.progress >= 1 ? "bg-emerald-500" : m.progress > 0.5 ? "bg-cyan-500" : "bg-amber-500"}`}
                              style={{ width: `${m.progress * 100}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs tabular-nums text-foreground">
                            {Math.round(m.progress * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${complexityBadge(m.complexity)}`}>
                          {m.complexity}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs tabular-nums text-muted-foreground">
                        {m.dataVolume}
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-xs tabular-nums text-foreground">
                        {m.estimatedWeeks}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Migration Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {items.filter(m => m.notes).map((m: any) => (
              <div key={m.id} className="flex gap-3 text-xs p-2 rounded bg-muted/20 border border-border">
                <span className="font-medium text-foreground shrink-0 w-36">{m.legacySystem}</span>
                <span className="text-muted-foreground">{m.notes}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
