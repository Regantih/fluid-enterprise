import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function fitnessColor(score: number) {
  if (score > 0.85) return "#34d399"; // emerald-400
  if (score > 0.7) return "#22d3ee"; // cyan-400
  if (score > 0.55) return "#fbbf24"; // amber-400
  return "#f87171"; // red-400
}

function fitnessBgClass(score: number) {
  if (score > 0.85) return "border-emerald-500/30 bg-emerald-500/5";
  if (score > 0.7) return "border-cyan-500/30 bg-cyan-500/5";
  if (score > 0.55) return "border-amber-500/30 bg-amber-500/5";
  return "border-red-500/30 bg-red-500/5";
}

function linkTypeColor(lt: string) {
  const map: Record<string, string> = {
    data_flow: "#22d3ee",
    trigger: "#fbbf24",
    dependency: "#a78bfa",
    feedback: "#34d399",
  };
  return map[lt] ?? "#94a3b8";
}

function linkTypeBadge(lt: string) {
  const map: Record<string, string> = {
    data_flow: "bg-cyan-500/10 text-cyan-400",
    trigger: "bg-amber-500/10 text-amber-400",
    dependency: "bg-purple-500/10 text-purple-400",
    feedback: "bg-emerald-500/10 text-emerald-400",
  };
  return map[lt] ?? "bg-slate-500/10 text-slate-400";
}

// Layout positions for 8 nodes in 2 rows of 4
const NODE_POSITIONS: Record<number, { x: number; y: number }> = {};
function getPositions(caps: any[]) {
  const positions: Record<number, { x: number; y: number }> = {};
  const topRow = caps.slice(0, 4);
  const bottomRow = caps.slice(4, 8);

  topRow.forEach((cap, i) => {
    positions[cap.id] = { x: 100 + i * 220, y: 80 };
  });
  bottomRow.forEach((cap, i) => {
    positions[cap.id] = { x: 100 + i * 220, y: 280 };
  });

  return positions;
}

export default function CompositionEngine() {
  const { data: capabilities, isLoading: capsLoading } = useQuery<any[]>({
    queryKey: ["/api/capabilities"],
    refetchInterval: 10000,
  });

  const { data: links, isLoading: linksLoading } = useQuery<any[]>({
    queryKey: ["/api/composition"],
    refetchInterval: 10000,
  });

  if (capsLoading || linksLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  const caps = capabilities ?? [];
  const allLinks = links ?? [];
  const positions = getPositions(caps);
  const svgW = 980;
  const svgH = 420;
  const nodeW = 170;
  const nodeH = 70;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground" data-testid="page-title">
          Composition Engine
        </h1>
        <p className="text-sm text-muted-foreground">
          How capabilities evolve their connections
        </p>
      </div>

      <Card className="border-border">
        <CardContent className="p-4">
          <div className="relative" style={{ width: svgW, height: svgH }} data-testid="composition-diagram">
            {/* SVG connections */}
            <svg
              className="absolute inset-0"
              width={svgW}
              height={svgH}
              style={{ pointerEvents: "none" }}
            >
              {allLinks.map((link: any, i: number) => {
                const from = positions[link.sourceCapabilityId];
                const to = positions[link.targetCapabilityId];
                if (!from || !to) return null;

                const x1 = from.x + nodeW / 2;
                const y1 = from.y + nodeH / 2;
                const x2 = to.x + nodeW / 2;
                const y2 = to.y + nodeH / 2;
                const color = linkTypeColor(link.linkType);

                // Midpoint for label
                const mx = (x1 + x2) / 2;
                const my = (y1 + y2) / 2;

                return (
                  <g key={i}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={color}
                      strokeWidth={Math.max(1, link.strength * 2)}
                      opacity={0.4}
                      strokeDasharray={link.linkType === "feedback" ? "4 4" : "none"}
                    />
                    {/* Arrow */}
                    <circle
                      cx={x2 - (x2 - x1) * 0.15}
                      cy={y2 - (y2 - y1) * 0.15}
                      r={2.5}
                      fill={color}
                      opacity={0.6}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Node overlays */}
            {caps.map((cap: any) => {
              const pos = positions[cap.id];
              if (!pos) return null;

              return (
                <div
                  key={cap.id}
                  className={`absolute rounded-lg border p-3 ${fitnessBgClass(cap.fitnessScore)} transition-all`}
                  style={{
                    left: pos.x,
                    top: pos.y,
                    width: nodeW,
                    height: nodeH,
                  }}
                  data-testid={`comp-node-${cap.id}`}
                >
                  <div className="text-xs font-semibold text-foreground truncate">
                    {cap.name}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="font-mono text-[10px] tabular-nums" style={{ color: fitnessColor(cap.fitnessScore) }}>
                      F: {cap.fitnessScore.toFixed(2)}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                      Gen {cap.generation}
                    </span>
                  </div>
                  {/* Tiny fitness bar */}
                  <div className="mt-1.5 h-0.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${cap.fitnessScore * 100}%`,
                        backgroundColor: fitnessColor(cap.fitnessScore),
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Link legend and table */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Composition Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            {["data_flow", "trigger", "feedback", "dependency"].map((lt) => (
              <div key={lt} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-0.5 rounded"
                  style={{ backgroundColor: linkTypeColor(lt), ...(lt === "feedback" ? { backgroundImage: "repeating-linear-gradient(90deg, transparent 0 2px, transparent 2px 4px)" } : {}) }}
                />
                <span className="text-[10px] text-muted-foreground">{lt.replace("_", " ")}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {allLinks.map((link: any) => {
              const source = caps.find((c: any) => c.id === link.sourceCapabilityId);
              const target = caps.find((c: any) => c.id === link.targetCapabilityId);
              return (
                <div
                  key={link.id}
                  className="flex items-center gap-3 text-xs p-2 rounded bg-muted/30 border border-border"
                  data-testid={`link-${link.id}`}
                >
                  <span className="font-medium text-foreground min-w-[140px]">
                    {source?.name ?? "?"}
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium text-foreground min-w-[140px]">
                    {target?.name ?? "?"}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${linkTypeBadge(link.linkType)}`}>
                    {link.linkType}
                  </span>
                  <span className="text-muted-foreground flex-1 truncate">
                    {link.label}
                  </span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {link.strength.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
