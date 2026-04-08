import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollText, Dna, Shield, DollarSign, Users, CheckSquare, Filter } from "lucide-react";

const FILTERS = [
  { key: "all", label: "All", icon: Filter },
  { key: "evolution_cycle", label: "Evolution", icon: Dna },
  { key: "governance_requested", label: "Governance", icon: Shield },
  { key: "budget_alert", label: "Budget", icon: DollarSign },
  { key: "agent_spawned", label: "Agent", icon: Users },
  { key: "task_completed", label: "Task", icon: CheckSquare },
];

function severityIcon(severity: string) {
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
  return `${Math.floor(hours / 24)}d ago`;
}

function formatTimestamp(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ActivityLog() {
  const [filter, setFilter] = useState("all");

  const { data: activities, isLoading } = useQuery<any[]>({
    queryKey: ["/api/activity"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/activity?limit=100");
      return res.json();
    },
    refetchInterval: 8000,
  });

  const { data: capabilities } = useQuery<any[]>({
    queryKey: ["/api/capabilities"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const caps = capabilities ?? [];
  const items = activities ?? [];

  const filtered = filter === "all"
    ? items
    : items.filter(a => a.eventType === filter);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground" data-testid="page-title">
          Activity Log
        </h1>
        <p className="text-sm text-muted-foreground">
          Immutable audit trail — every action recorded
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {FILTERS.map((f) => {
          const Icon = f.icon;
          const isActive = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                isActive
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                  : "bg-muted/30 text-muted-foreground border border-transparent hover:bg-muted/50"
              }`}
              data-testid={`filter-${f.key}`}
            >
              <Icon className="w-3 h-3" />
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Activity list */}
      <Card className="border-border">
        <CardContent className="p-0">
          <div className="divide-y divide-border" data-testid="activity-list">
            {filtered.map((a: any) => {
              const cap = a.capabilityId ? caps.find(c => c.id === a.capabilityId) : null;
              const isEvolution = a.eventType === "evolution_cycle";
              let metadata: any = {};
              try { metadata = JSON.parse(a.metadata || "{}"); } catch {}

              return (
                <div
                  key={a.id}
                  className={`px-4 py-3 flex gap-3 hover:bg-white/[0.02] transition-colors ${isEvolution ? "bg-cyan-500/[0.03]" : ""}`}
                  data-testid={`activity-item-${a.id}`}
                >
                  {/* Severity dot */}
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${severityIcon(a.severity)}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{a.title}</span>
                      {isEvolution && metadata.generation && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400">
                          Gen {metadata.generation}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{a.description}</div>

                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {cap && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-500/10 text-slate-400 font-mono">
                          {cap.name}
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-muted/40 text-muted-foreground font-mono">
                        {a.eventType.replace(/_/g, " ")}
                      </span>
                      {isEvolution && metadata.fitnessGain && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-mono">
                          +{metadata.fitnessGain.toFixed(3)} fitness
                        </span>
                      )}
                      {isEvolution && metadata.agentsEvolved !== undefined && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-400 font-mono">
                          {metadata.agentsEvolved} evolved
                        </span>
                      )}
                      {isEvolution && metadata.agentsDissolved > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 font-mono">
                          {metadata.agentsDissolved} dissolved
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {timeAgo(a.createdAt)}
                    </div>
                    <div className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">
                      {formatTimestamp(a.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No activity matching this filter.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
