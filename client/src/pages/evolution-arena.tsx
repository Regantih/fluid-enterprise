import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Dna, ArrowUp, ArrowDown, Minus } from "lucide-react";
import type { EvolutionGeneration } from "@shared/schema";

export default function EvolutionArena() {
  const { data: generations, isLoading } = useQuery<EvolutionGeneration[]>({
    queryKey: ["/api/evolution"],
    refetchInterval: 5000,
  });

  if (isLoading || !generations) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const latestGen = generations.length > 0 ? generations[0].generationNumber : 0;
  // Show chart bars in chronological order (oldest first)
  const chartData = [...generations].reverse();
  const maxFitness = Math.max(...chartData.map((g) => g.fitnessScore), 0.01);

  return (
    <div className="p-6 space-y-6" data-testid="evolution-arena">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Dna className="w-5 h-5 text-cyan-400" />
            <h1 className="text-lg font-semibold text-foreground">Evolution Arena</h1>
          </div>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Genetic optimization across generations
          </p>
        </div>
        <div className="flex items-center gap-2 bg-card border border-card-border rounded-lg px-3 py-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Current Generation</span>
          <span className="text-lg font-mono font-semibold tabular-nums text-cyan-400" data-testid="current-generation">
            {latestGen}
          </span>
        </div>
      </div>

      {/* Fitness Chart - CSS bar chart */}
      <div className="bg-card border border-card-border rounded-lg p-4" data-testid="fitness-chart">
        <h2 className="text-[13px] font-semibold text-foreground mb-4 uppercase tracking-wider">
          Fitness Score Over Generations
        </h2>
        <div className="flex items-end gap-1 h-40">
          {chartData.map((gen, i) => {
            const heightPct = (gen.fitnessScore / maxFitness) * 100;
            // Color gradient from amber (low) to emerald (high)
            const hue = gen.fitnessScore > 0.8 ? 160 : gen.fitnessScore > 0.6 ? 170 : gen.fitnessScore > 0.4 ? 45 : 38;
            const saturation = gen.fitnessScore > 0.6 ? 60 : 92;
            const lightness = gen.fitnessScore > 0.6 ? 45 : 50;

            return (
              <div
                key={gen.id}
                className="flex-1 flex flex-col items-center justify-end h-full group relative"
              >
                <div
                  className="w-full rounded-t transition-all duration-300 min-h-[2px] group-hover:opacity-80"
                  style={{
                    height: `${heightPct}%`,
                    backgroundColor: `hsl(${hue} ${saturation}% ${lightness}%)`,
                  }}
                  data-testid={`fitness-bar-${gen.generationNumber}`}
                />
                {/* Tooltip on hover */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block bg-popover border border-popover-border rounded-md px-2 py-1 shadow-md z-10 whitespace-nowrap">
                  <span className="text-[10px] font-mono text-foreground">
                    Gen {gen.generationNumber}: {gen.fitnessScore.toFixed(3)}
                  </span>
                </div>
                {i % Math.max(1, Math.floor(chartData.length / 8)) === 0 && (
                  <span className="text-[8px] font-mono text-muted-foreground mt-1 tabular-nums">
                    {gen.generationNumber}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Generation History */}
      <div>
        <h2 className="text-[13px] font-semibold text-foreground mb-3 uppercase tracking-wider">
          Generation History
        </h2>
        <div className="space-y-3">
          {generations.map((gen) => {
            const delta = gen.fitnessScore - gen.previousFitness;
            const isUp = delta > 0.001;
            const isDown = delta < -0.001;
            const mutations = (() => {
              try { return JSON.parse(gen.mutations); } catch { return []; }
            })();
            const improvements = (() => {
              try { return JSON.parse(gen.improvements); } catch { return []; }
            })();

            return (
              <div
                key={gen.id}
                className="bg-card border border-card-border rounded-lg p-4"
                data-testid={`generation-${gen.generationNumber}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Gen</span>
                      <span className="text-xl font-mono font-bold tabular-nums text-foreground">
                        {gen.generationNumber}
                      </span>
                    </div>
                    <div className="h-10 w-px bg-border" />
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Fitness</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-mono font-semibold tabular-nums text-foreground">
                          {gen.fitnessScore.toFixed(3)}
                        </span>
                        <span
                          className={`flex items-center gap-0.5 text-[11px] font-mono tabular-nums ${
                            isUp ? "text-emerald-400" : isDown ? "text-red-400" : "text-muted-foreground"
                          }`}
                        >
                          {isUp ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : isDown ? (
                            <ArrowDown className="w-3 h-3" />
                          ) : (
                            <Minus className="w-3 h-3" />
                          )}
                          {Math.abs(delta).toFixed(3)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Agent stats */}
                  <div className="flex items-center gap-4 text-[11px]">
                    <div className="text-center">
                      <span className="block text-[10px] text-muted-foreground">Survived</span>
                      <span className="font-mono tabular-nums text-emerald-400">{gen.agentsSurvived}</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-[10px] text-muted-foreground">Evolved</span>
                      <span className="font-mono tabular-nums text-cyan-400">{gen.agentsEvolved}</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-[10px] text-muted-foreground">Dissolved</span>
                      <span className="font-mono tabular-nums text-red-400">{gen.agentsDissolved}</span>
                    </div>
                  </div>
                </div>

                {/* Mutations and Improvements */}
                <div className="mt-3 flex flex-wrap gap-4">
                  {mutations.length > 0 && (
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Mutations</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {mutations.map((m: string, i: number) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {improvements.length > 0 && (
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Improvements</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {improvements.map((imp: string, i: number) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400"
                          >
                            {imp}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
