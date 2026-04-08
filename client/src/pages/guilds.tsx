import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  Truck,
  HeadphonesIcon,
  Users,
  Wrench,
} from "lucide-react";
import type { Agent } from "@shared/schema";

type GuildWithAgents = {
  id: number;
  name: string;
  domain: string;
  description: string;
  status: string;
  performanceScore: number;
  agentCount: number;
  generation: number;
  agents: Agent[];
};

const domainIcons: Record<string, any> = {
  finance: DollarSign,
  supply_chain: Truck,
  customer: HeadphonesIcon,
  hr: Users,
  engineering: Wrench,
};

const domainColors: Record<string, string> = {
  finance: "bg-emerald-500/10 text-emerald-400",
  supply_chain: "bg-cyan-500/10 text-cyan-400",
  customer: "bg-amber-500/10 text-amber-400",
  hr: "bg-purple-500/10 text-purple-400",
  engineering: "bg-cyan-500/10 text-cyan-400",
};

const agentTypeColors: Record<string, string> = {
  archon: "bg-cyan-500/10 text-cyan-400",
  guild_leader: "bg-amber-500/10 text-amber-400",
  specialist: "bg-blue-500/10 text-blue-400",
  task: "bg-purple-500/10 text-purple-400",
  sentinel: "bg-red-500/10 text-red-400",
};

const agentStatusDot: Record<string, string> = {
  active: "bg-emerald-400",
  busy: "bg-amber-400",
  evolving: "bg-cyan-400",
  dissolved: "bg-red-400",
};

const guildStatusStyle: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400",
  evolving: "bg-cyan-500/10 text-cyan-400",
  dormant: "bg-muted text-muted-foreground",
};

export default function Guilds() {
  const { data: guilds, isLoading } = useQuery<GuildWithAgents[]>({
    queryKey: ["/api/guilds"],
    refetchInterval: 5000,
  });

  if (isLoading || !guilds) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="guilds-page">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Guilds</h1>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Autonomous capability teams — {guilds.length} active guilds
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {guilds.map((guild) => {
          const DomainIcon = domainIcons[guild.domain] || Wrench;
          return (
            <div
              key={guild.id}
              className="bg-card border border-card-border rounded-lg p-4"
              data-testid={`guild-${guild.id}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <DomainIcon className="w-4.5 h-4.5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-semibold text-foreground">{guild.name}</h3>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${domainColors[guild.domain] || ""}`}>
                      {guild.domain.replace("_", " ")}
                    </span>
                  </div>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${guildStatusStyle[guild.status] || ""}`}>
                  {guild.status}
                </span>
              </div>

              {/* Performance Score */}
              <div className="flex items-center gap-3 mb-3">
                <div className="relative w-14 h-14 flex items-center justify-center">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                    <circle
                      cx="28"
                      cy="28"
                      r="24"
                      fill="none"
                      stroke="hsl(var(--muted))"
                      strokeWidth="3"
                    />
                    <circle
                      cx="28"
                      cy="28"
                      r="24"
                      fill="none"
                      stroke={
                        guild.performanceScore > 0.8
                          ? "hsl(160 60% 45%)"
                          : guild.performanceScore > 0.6
                          ? "hsl(187 85% 48%)"
                          : "hsl(38 92% 50%)"
                      }
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={`${guild.performanceScore * 150.8} 150.8`}
                    />
                  </svg>
                  <span className="absolute text-[11px] font-mono font-semibold tabular-nums text-foreground">
                    {(guild.performanceScore * 100).toFixed(0)}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <Users className="w-3 h-3" />
                    <span className="font-mono tabular-nums">{guild.agents.length}</span> agents
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider">Gen</span>
                    <span className="font-mono tabular-nums text-cyan-400">{guild.generation}</span>
                  </div>
                </div>
              </div>

              {/* Agents */}
              <div className="space-y-1.5 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
                {guild.agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center gap-2 py-1.5 px-2 rounded bg-background/50 border border-border/30"
                    data-testid={`agent-${agent.id}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${agentStatusDot[agent.status] || "bg-muted-foreground"}`} />
                    <span className="text-[11px] text-foreground truncate flex-1">{agent.name}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                        agentTypeColors[agent.type] || ""
                      }`}
                    >
                      {agent.type.replace("_", " ")}
                    </span>
                    <div className="w-12 h-1 bg-muted rounded-full overflow-hidden shrink-0">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${agent.trustScore * 100}%`,
                          background:
                            agent.trustScore > 0.85
                              ? "hsl(160 60% 45%)"
                              : agent.trustScore > 0.7
                              ? "hsl(187 85% 48%)"
                              : agent.trustScore > 0.55
                              ? "hsl(38 92% 50%)"
                              : "hsl(0 72% 51%)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
