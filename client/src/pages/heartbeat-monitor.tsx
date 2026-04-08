import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Dna, ShieldCheck, Users } from "lucide-react";

function roleBadge(role: string) {
  const map: Record<string, string> = {
    orchestrator: "bg-cyan-500/10 text-cyan-400",
    specialist: "bg-blue-500/10 text-blue-400",
    sentinel: "bg-red-500/10 text-red-400",
    task: "bg-purple-500/10 text-purple-400",
  };
  return map[role] ?? "bg-slate-500/10 text-slate-400";
}

function statusDot(status: string) {
  const map: Record<string, string> = {
    online: "bg-emerald-400 pulse-live",
    busy: "bg-amber-400",
    degraded: "bg-red-400",
    offline: "bg-slate-500",
    dissolved: "bg-slate-700",
  };
  return map[status] ?? "bg-slate-500";
}

function trustColor(score: number) {
  if (score > 0.85) return "bg-emerald-500";
  if (score > 0.7) return "bg-cyan-500";
  if (score > 0.55) return "bg-amber-500";
  return "bg-red-500";
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

export default function HeartbeatMonitor() {
  const { data: agents, isLoading } = useQuery<any[]>({
    queryKey: ["/api/heartbeat"],
    refetchInterval: 5000,
  });

  const { data: capabilities } = useQuery<any[]>({
    queryKey: ["/api/capabilities"],
    refetchInterval: 10000,
  });

  const { data: evolution } = useQuery<any[]>({
    queryKey: ["/api/evolution"],
    refetchInterval: 10000,
  });

  const { data: council } = useQuery<any[]>({
    queryKey: ["/api/council"],
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

  const allAgents = agents ?? [];
  const caps = capabilities ?? [];
  const latestEvo = evolution && evolution.length > 0 ? evolution[0] : null;
  const lastPulse = allAgents.length > 0
    ? allAgents.reduce((max, a) => a.lastHeartbeat > max ? a.lastHeartbeat : max, allAgents[0].lastHeartbeat)
    : null;

  // Group agents by capability
  const grouped: Record<number, any[]> = {};
  for (const agent of allAgents) {
    const capId = agent.capabilityId ?? 0;
    if (!grouped[capId]) grouped[capId] = [];
    grouped[capId].push(agent);
  }

  const maxGeneration = caps.length > 0 ? Math.max(...caps.map(c => c.generation)) : 0;
  const avgFitness = caps.length > 0
    ? caps.reduce((s, c) => s + c.fitnessScore, 0) / caps.length
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground" data-testid="page-title">
            Heartbeat Monitor
          </h1>
          <p className="text-sm text-muted-foreground">
            Agent evolution & real-time status
          </p>
        </div>
        {lastPulse && (
          <span className="text-xs text-muted-foreground font-mono">
            Last pulse: {timeAgo(lastPulse)}
          </span>
        )}
      </div>

      {/* Evolution stats bar */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="border-border">
          <CardContent className="p-3 flex items-center gap-3">
            <Dna className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="font-mono text-lg font-bold tabular-nums text-foreground" data-testid="evo-generation">
                Gen {maxGeneration}
              </div>
              <div className="text-[10px] text-muted-foreground">Current Generation</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-3 flex items-center gap-3">
            <Activity className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="font-mono text-lg font-bold tabular-nums text-foreground" data-testid="evo-fitness">
                {avgFitness.toFixed(3)}
              </div>
              <div className="text-[10px] text-muted-foreground">System Fitness</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-3 flex items-center gap-3">
            <Users className="w-5 h-5 text-purple-400" />
            <div>
              <div className="font-mono text-lg font-bold tabular-nums text-foreground">
                {latestEvo?.agentsEvolved ?? 0}
              </div>
              <div className="text-[10px] text-muted-foreground">Agents Evolved This Gen</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-3 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <div>
              <div className="font-mono text-lg font-bold tabular-nums text-foreground">
                {(council ?? []).length}
              </div>
              <div className="text-[10px] text-muted-foreground">Council Reviews</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent grid grouped by capability */}
      {Object.entries(grouped).map(([capIdStr, capAgents]) => {
        const cap = caps.find(c => c.id === Number(capIdStr));
        return (
          <div key={capIdStr}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold text-foreground">
                {cap?.name ?? "Unknown"}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                Gen {cap?.generation ?? "?"}
              </span>
              <span className="text-[10px] font-mono text-cyan-400">
                F: {cap?.fitnessScore?.toFixed(2) ?? "?"}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {capAgents.map((agent: any) => (
                <Card key={agent.id} className="border-border" data-testid={`agent-card-${agent.id}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${statusDot(agent.status)}`} />
                        <span className="text-sm font-semibold text-foreground truncate">
                          {agent.name}
                        </span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${roleBadge(agent.role)}`}>
                        {agent.role}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Generation</span>
                        <span className="font-mono tabular-nums text-foreground">{agent.generation}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Trust</span>
                        <span className="font-mono tabular-nums text-foreground">{agent.trustScore.toFixed(2)}</span>
                      </div>
                      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${trustColor(agent.trustScore)}`}
                          style={{ width: `${agent.trustScore * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Success</span>
                        <span className="font-mono tabular-nums text-foreground">{(agent.successRate * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Uptime</span>
                        <span className="font-mono tabular-nums text-foreground">{agent.uptime.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Decisions</span>
                        <span className="font-mono tabular-nums text-foreground">{agent.decisionsHandled.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Last beat</span>
                        <span className="font-mono tabular-nums text-foreground text-[10px]">{timeAgo(agent.lastHeartbeat)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
