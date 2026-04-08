import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, Shield, Users } from "lucide-react";
import type { Agent, CouncilReview } from "@shared/schema";

type AgentWithGuild = Agent;

const agentTypeColors: Record<string, string> = {
  archon: "bg-cyan-500/10 text-cyan-400",
  guild_leader: "bg-amber-500/10 text-amber-400",
  specialist: "bg-blue-500/10 text-blue-400",
  task: "bg-purple-500/10 text-purple-400",
  sentinel: "bg-red-500/10 text-red-400",
};

const consensusColors: Record<string, string> = {
  unanimous: "bg-emerald-500/10 text-emerald-400",
  majority: "bg-cyan-500/10 text-cyan-400",
  split: "bg-amber-500/10 text-amber-400",
  deadlock: "bg-red-500/10 text-red-400",
};

const outcomeColors: Record<string, string> = {
  approved: "bg-emerald-500/10 text-emerald-400",
  rejected: "bg-red-500/10 text-red-400",
  escalated: "bg-amber-500/10 text-amber-400",
};

function trustColor(score: number): string {
  if (score > 0.85) return "hsl(160 60% 45%)";
  if (score > 0.7) return "hsl(187 85% 48%)";
  if (score > 0.55) return "hsl(38 92% 50%)";
  return "hsl(0 72% 51%)";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

export default function TrustGovernance() {
  const { data: agents, isLoading: loadingAgents } = useQuery<AgentWithGuild[]>({
    queryKey: ["/api/agents"],
    refetchInterval: 5000,
  });

  const { data: council, isLoading: loadingCouncil } = useQuery<CouncilReview[]>({
    queryKey: ["/api/council"],
    refetchInterval: 5000,
  });

  const { data: guilds } = useQuery<any[]>({
    queryKey: ["/api/guilds"],
  });

  const guildMap = new Map(guilds?.map((g: any) => [g.id, g.name]) ?? []);

  if (loadingAgents || loadingCouncil) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  // Sort agents by trust score descending, filter out dissolved
  const sortedAgents = [...(agents || [])]
    .filter((a) => a.status !== "dissolved")
    .sort((a, b) => b.trustScore - a.trustScore);

  return (
    <div className="p-6 space-y-6" data-testid="trust-governance">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <Lock className="w-5 h-5 text-cyan-400" />
          <h1 className="text-lg font-semibold text-foreground">Trust & Governance</h1>
        </div>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          EigenTrust reputation system + Council peer review protocol
        </p>
      </div>

      {/* EigenTrust Leaderboard */}
      <div className="bg-card border border-card-border rounded-lg p-4" data-testid="eigentrust-leaderboard">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-[13px] font-semibold text-foreground uppercase tracking-wider">
            EigenTrust Leaderboard
          </h2>
          <span className="text-[10px] text-muted-foreground font-mono tabular-nums ml-auto">
            {sortedAgents.length} agents
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-2 px-2 text-muted-foreground font-medium text-[10px] uppercase tracking-wider w-10">
                  #
                </th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium text-[10px] uppercase tracking-wider">
                  Agent
                </th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium text-[10px] uppercase tracking-wider">
                  Type
                </th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium text-[10px] uppercase tracking-wider">
                  Guild
                </th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium text-[10px] uppercase tracking-wider">
                  Trust Score
                </th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium text-[10px] uppercase tracking-wider">
                  Confidence
                </th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium text-[10px] uppercase tracking-wider">
                  Decisions
                </th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium text-[10px] uppercase tracking-wider">
                  Success
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedAgents.map((agent, idx) => (
                <tr
                  key={agent.id}
                  className="border-b border-border/20 hover:bg-muted/30 transition-colors"
                  data-testid={`trust-agent-${agent.id}`}
                >
                  <td className="py-2 px-2">
                    <span className="font-mono tabular-nums text-muted-foreground">{idx + 1}</span>
                  </td>
                  <td className="py-2 px-2">
                    <span className="text-foreground font-medium">{agent.name}</span>
                  </td>
                  <td className="py-2 px-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        agentTypeColors[agent.type] || ""
                      }`}
                    >
                      {agent.type.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <span className="text-muted-foreground text-[11px]">
                      {guildMap.get(agent.guildId ?? 0) || "—"}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${agent.trustScore * 100}%`,
                            backgroundColor: trustColor(agent.trustScore),
                          }}
                        />
                      </div>
                      <span className="font-mono tabular-nums text-[10px] text-foreground w-10">
                        {agent.trustScore.toFixed(3)}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <span className="font-mono tabular-nums text-muted-foreground text-[11px]">
                      {(agent.confidenceLevel * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right">
                    <span className="font-mono tabular-nums text-muted-foreground">
                      {agent.decisionsHandled}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right">
                    <span className="font-mono tabular-nums text-muted-foreground">
                      {(agent.successRate * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Council Reviews */}
      <div className="bg-card border border-card-border rounded-lg p-4" data-testid="council-reviews">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-[13px] font-semibold text-foreground uppercase tracking-wider">
            Council Reviews
          </h2>
        </div>
        <div className="space-y-2">
          {council?.map((review) => {
            const reviewerIds = (() => {
              try { return JSON.parse(review.reviewerAgentIds); } catch { return []; }
            })();

            return (
              <div
                key={review.id}
                className="flex items-center gap-4 py-2.5 px-3 rounded-md bg-background/50 border border-border/30"
                data-testid={`council-review-${review.id}`}
              >
                <div className="text-[11px] text-muted-foreground font-mono tabular-nums w-24 shrink-0">
                  Decision #{review.decisionId}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {reviewerIds.length} reviewer{reviewerIds.length !== 1 ? "s" : ""}
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    consensusColors[review.consensus] || ""
                  }`}
                >
                  {review.consensus}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    outcomeColors[review.outcome] || ""
                  }`}
                >
                  {review.outcome}
                </span>
                <span className="ml-auto text-[10px] font-mono tabular-nums text-muted-foreground">
                  {timeAgo(review.createdAt)}
                </span>
              </div>
            );
          })}
          {(!council || council.length === 0) && (
            <div className="text-center py-8 text-muted-foreground text-[12px]">
              No council reviews yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
