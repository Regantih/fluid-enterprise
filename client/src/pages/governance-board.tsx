import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Sparkles,
  Zap,
  Dna,
  Play,
} from "lucide-react";

// ─── Badge helpers ────────────────────────────────────────────────────────────

function riskBadge(level: string) {
  const map: Record<string, string> = {
    critical: "bg-red-500/10 text-red-400 border border-red-500/20",
    high: "bg-amber-500/10 text-amber-400",
    medium: "bg-cyan-500/10 text-cyan-400",
    low: "bg-slate-500/10 text-slate-400",
  };
  return map[level] ?? "bg-slate-500/10 text-slate-400";
}

function categoryBadge(cat: string) {
  const map: Record<string, string> = {
    budget_breach: "bg-amber-500/10 text-amber-400",
    compliance: "bg-purple-500/10 text-purple-400",
    policy_change: "bg-cyan-500/10 text-cyan-400",
    capability_lifecycle: "bg-emerald-500/10 text-emerald-400",
    anomaly: "bg-red-500/10 text-red-400",
  };
  return map[cat] ?? "bg-slate-500/10 text-slate-400";
}

function consensusBadge(consensus: string) {
  const map: Record<string, string> = {
    unanimous: "bg-emerald-500/10 text-emerald-400",
    majority: "bg-cyan-500/10 text-cyan-400",
    split: "bg-amber-500/10 text-amber-400",
    deadlock: "bg-red-500/10 text-red-400",
  };
  return map[consensus] ?? "bg-slate-500/10 text-slate-400";
}

function stageBadge(stage: string) {
  const map: Record<string, string> = {
    proposed: "bg-slate-500/10 text-slate-400",
    shadow: "bg-amber-500/10 text-amber-400",
    canary: "bg-cyan-500/10 text-cyan-400",
    production: "bg-emerald-500/10 text-emerald-400",
  };
  return map[stage] ?? "bg-slate-500/10 text-slate-400";
}

function gapStatusBadge(status: string) {
  const map: Record<string, string> = {
    open: "bg-red-500/10 text-red-400 border border-red-500/20",
    generated: "bg-amber-500/10 text-amber-400",
    closed: "bg-emerald-500/10 text-emerald-400",
  };
  return map[status] ?? "bg-slate-500/10 text-slate-400";
}

function formatCurrency(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
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

function fitnessBadgeColor(score: number) {
  if (score >= 0.8) return "text-emerald-400";
  if (score >= 0.5) return "text-amber-400";
  return "text-red-400";
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GovernanceBoard() {
  const { toast } = useToast();

  // ── Section 1 state ────────────────────────────────────────────────────────
  const [selectedGapId, setSelectedGapId] = useState<number | null>(null);
  const [generatedCapId, setGeneratedCapId] = useState<Record<number, number>>({});
  const [generateResults, setGenerateResults] = useState<Record<number, any>>({});
  const [arenaResults, setArenaResults] = useState<Record<number, any>>({});
  const [transitionDone, setTransitionDone] = useState<Record<number, boolean>>({});
  const [showEvidence, setShowEvidence] = useState(false);
  const [generatingGap, setGeneratingGap] = useState<number | null>(null);
  const [arenaRunning, setArenaRunning] = useState<number | null>(null);
  const [transitioning, setTransitioning] = useState<number | null>(null);

  // ── Section 3 state ────────────────────────────────────────────────────────
  const [responses, setResponses] = useState<Record<number, string>>({});

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: gaps, isLoading: gapsLoading } = useQuery<any[]>({
    queryKey: ["/api/gaps"],
    refetchInterval: 5000,
  });

  const { data: evidenceSignals, isLoading: evidenceLoading } = useQuery<any[]>({
    queryKey: [`/api/gaps/${selectedGapId}/signals`],
    enabled: selectedGapId !== null && showEvidence,
  });

  const { data: realCaps, isLoading: capsLoading } = useQuery<any[]>({
    queryKey: ["/api/real/capabilities"],
    refetchInterval: 5000,
  });

  const { data: govItems, isLoading: govLoading } = useQuery<any[]>({
    queryKey: ["/api/governance"],
    refetchInterval: 5000,
  });

  const { data: councilReviews } = useQuery<any[]>({
    queryKey: ["/api/council"],
    refetchInterval: 5000,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const generateMutation = useMutation({
    mutationFn: async (gapId: number) => {
      const res = await apiRequest("POST", `/api/generator/generate`, { gap_id: gapId });
      return res.json();
    },
    onSuccess: (data: any, gapId: number) => {
      setGenerateResults((prev) => ({ ...prev, [gapId]: data }));
      if (data?.id) {
        setGeneratedCapId((prev) => ({ ...prev, [gapId]: data.id }));
      }
      queryClient.invalidateQueries({ queryKey: ["/api/gaps"] });
      queryClient.invalidateQueries({ queryKey: ["/api/real/capabilities"] });
      setGeneratingGap(null);
      toast({ title: "Capability generated", description: data?.name ?? "" });
    },
    onError: () => {
      setGeneratingGap(null);
      toast({ title: "Generation failed", variant: "destructive" });
    },
  });

  const arenaMutation = useMutation({
    mutationFn: async (capId: number) => {
      const res = await apiRequest("POST", `/api/arena/evaluate/${capId}`, {});
      return res.json();
    },
    onSuccess: (data: any, capId: number) => {
      // find which gapId owns this capId
      const gapId = Object.entries(generatedCapId).find(([, cId]) => cId === capId)?.[0];
      if (gapId) {
        setArenaResults((prev) => ({ ...prev, [Number(gapId)]: data }));
      }
      setArenaRunning(null);
      toast({ title: "Arena evaluation complete" });
    },
    onError: () => {
      setArenaRunning(null);
      toast({ title: "Arena evaluation failed", variant: "destructive" });
    },
  });

  const transitionMutation = useMutation({
    mutationFn: async ({ capId, gapId }: { capId: number; gapId: number }) => {
      const res = await apiRequest("POST", `/api/real/capabilities/${capId}/transition`, {
        to_stage: "shadow",
        actor: "governance_council",
        rationale: "Approved after arena evaluation",
      });
      return res.json();
    },
    onSuccess: (data: any, { gapId }: { capId: number; gapId: number }) => {
      setTransitionDone((prev) => ({ ...prev, [gapId]: true }));
      queryClient.invalidateQueries({ queryKey: ["/api/real/capabilities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gaps"] });
      setTransitioning(null);
      toast({ title: "Capability promoted to Shadow stage" });
    },
    onError: () => {
      setTransitioning(null);
      toast({ title: "Transition failed", variant: "destructive" });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("POST", `/api/governance/${id}/resolve`, {
        status,
        response: responses[id] || "",
        reviewedBy: "Human Operator",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/governance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Governance item resolved" });
    },
  });

  // ── Derived ────────────────────────────────────────────────────────────────

  const pendingCount = (govItems ?? []).filter((g: any) => g.status === "pending").length;

  const sortedGov = [...(govItems ?? [])].sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (a.status !== "pending" && b.status === "pending") return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const sortedGaps = [...(gaps ?? [])].sort(
    (a, b) => (b.expected_fitness_impact ?? 0) - (a.expected_fitness_impact ?? 0)
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground" data-testid="page-title">
            Governance Board
          </h1>
          <p className="text-sm text-muted-foreground">
            Human-in-the-loop — Council peer review protocol
          </p>
        </div>
        {pendingCount > 0 && (
          <span
            className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-sm font-mono font-bold"
            data-testid="pending-count"
          >
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1 — CAPABILITY GAP QUEUE
         ══════════════════════════════════════════════════════════════════════ */}
      <section data-testid="gap-queue" className="space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-semibold text-foreground">Capability Gap Queue</h2>
          <span className="ml-auto text-[10px] text-muted-foreground font-mono">
            Live · 5s refresh
          </span>
        </div>

        {gapsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : sortedGaps.length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No capability gaps detected.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {sortedGaps.map((gap: any, idx: number) => {
              const isTopGap = idx === 0;
              const genResult = generateResults[gap.id];
              const capId = generatedCapId[gap.id];
              const arena = arenaResults[gap.id];
              const done = transitionDone[gap.id];
              const isGenerating = generatingGap === gap.id;
              const isArena = arenaRunning === gap.id;
              const isTransitioning = transitioning === gap.id;

              return (
                <Card
                  key={gap.id}
                  className={`border ${
                    isTopGap
                      ? "border-amber-500/40 bg-amber-500/5 shadow-lg shadow-amber-500/10"
                      : "border-border"
                  }`}
                >
                  <CardContent className="p-5 space-y-4">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {isTopGap && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              ★ Highest Impact
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${gapStatusBadge(gap.status)}`}>
                            {gap.status}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-500/10 text-slate-400">
                            {gap.suggested_kind}
                          </span>
                          {gap.signal_count > 0 && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-400">
                              {gap.signal_count} signals
                            </span>
                          )}
                        </div>
                        <div className="font-semibold text-sm text-foreground">{gap.suggested_name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{gap.summary}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="text-[10px] text-muted-foreground font-mono">Fitness Impact</div>
                        <div className={`text-xl font-bold font-mono ${fitnessBadgeColor(gap.expected_fitness_impact ?? 0)}`}>
                          {((gap.expected_fitness_impact ?? 0) * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    {/* Rationale */}
                    {gap.rationale && (
                      <div className="text-[11px] text-muted-foreground italic bg-muted/20 rounded px-3 py-2 border border-border/50">
                        {gap.rationale}
                      </div>
                    )}

                    {/* Action row */}
                    <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10 text-xs h-7"
                        onClick={() => {
                          setSelectedGapId(gap.id);
                          setShowEvidence(true);
                        }}
                        data-testid={`gap-evidence-${gap.id}`}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View Evidence
                      </Button>

                      {(gap.status === "open" || gap.status === "generated") && !genResult && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 text-xs h-7"
                          onClick={() => {
                            setGeneratingGap(gap.id);
                            generateMutation.mutate(gap.id);
                          }}
                          disabled={isGenerating}
                          data-testid={`gap-generate-${gap.id}`}
                        >
                          {isGenerating ? (
                            <>
                              <Sparkles className="w-3 h-3 mr-1 animate-spin" />
                              Generating…
                            </>
                          ) : (
                            <>
                              <Dna className="w-3 h-3 mr-1" />
                              Generate Capability
                            </>
                          )}
                        </Button>
                      )}

                      {/* Generation result */}
                      {genResult && (
                        <div className="w-full mt-1 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="text-xs font-semibold text-emerald-400">Generated</span>
                            <span className="text-xs font-mono text-foreground">{genResult.name}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-500/10 text-slate-400 font-mono">
                              {genResult.slug}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-mono">
                            {genResult.kind && <span>kind: {genResult.kind}</span>}
                            {genResult.generation !== undefined && <span>gen: {genResult.generation}</span>}
                            {genResult.code_lines !== undefined && <span>{genResult.code_lines} lines</span>}
                            {genResult.eval_cases !== undefined && <span>{genResult.eval_cases} eval cases</span>}
                          </div>

                          {/* Run Arena */}
                          {!arena && capId && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-purple-400 border-purple-500/30 hover:bg-purple-500/10 text-xs h-7"
                              onClick={() => {
                                setArenaRunning(gap.id);
                                arenaMutation.mutate(capId);
                              }}
                              disabled={isArena}
                              data-testid={`gap-arena-${gap.id}`}
                            >
                              {isArena ? (
                                <>
                                  <Play className="w-3 h-3 mr-1 animate-pulse" />
                                  Running Arena…
                                </>
                              ) : (
                                <>
                                  <Play className="w-3 h-3 mr-1" />
                                  Run Arena
                                </>
                              )}
                            </Button>
                          )}

                          {/* Arena result */}
                          {arena && (
                            <div className="p-2.5 rounded bg-purple-500/5 border border-purple-500/20 space-y-2">
                              <div className="flex items-center gap-3 text-xs flex-wrap">
                                <span className="text-muted-foreground">Arena Result</span>
                                <span className={`font-bold font-mono ${fitnessBadgeColor(arena.composite ?? 0)}`}>
                                  {((arena.composite ?? 0) * 100).toFixed(1)}% composite
                                </span>
                                {arena.success_rate !== undefined && (
                                  <span className="text-muted-foreground font-mono">
                                    {((arena.success_rate ?? 0) * 100).toFixed(0)}% success
                                  </span>
                                )}
                                {arena.passed !== undefined && arena.total !== undefined && (
                                  <span className="text-muted-foreground font-mono">
                                    {arena.passed}/{arena.total} passed
                                  </span>
                                )}
                              </div>

                              {/* Approve → Shadow */}
                              {!done && capId && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 text-xs h-7"
                                  onClick={() => {
                                    setTransitioning(gap.id);
                                    transitionMutation.mutate({ capId, gapId: gap.id });
                                  }}
                                  disabled={isTransitioning}
                                  data-testid={`gap-approve-shadow-${gap.id}`}
                                >
                                  {isTransitioning ? (
                                    <>
                                      <CheckCircle className="w-3 h-3 mr-1 animate-spin" />
                                      Promoting…
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Approve → Shadow
                                    </>
                                  )}
                                </Button>
                              )}

                              {done && (
                                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Generation counter updated · Promoted to Shadow
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Evidence Drawer */}
      {showEvidence && selectedGapId !== null && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowEvidence(false);
              setSelectedGapId(null);
            }}
          />
          {/* Panel */}
          <div className="w-full max-w-md bg-background border-l border-border flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold text-foreground">Evidence Signals</span>
              </div>
              <button
                className="text-muted-foreground hover:text-foreground text-xs"
                onClick={() => {
                  setShowEvidence(false);
                  setSelectedGapId(null);
                }}
              >
                ✕ Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {evidenceLoading ? (
                <>
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </>
              ) : (evidenceSignals ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  No evidence signals found.
                </p>
              ) : (
                (evidenceSignals ?? []).map((sig: any) => (
                  <div
                    key={sig.id}
                    className="p-3 rounded-lg border border-border bg-muted/10 space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400">
                        {sig.source ?? sig.kind ?? "signal"}
                      </span>
                      {sig.createdAt && (
                        <span className="text-[10px] text-muted-foreground font-mono ml-auto">
                          {timeAgo(sig.createdAt)}
                        </span>
                      )}
                    </div>
                    {(sig.payload?.subject || sig.payload?.body) && (
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {sig.payload.subject
                          ? <><span className="text-foreground font-medium">{sig.payload.subject}</span> — </>
                          : null}
                        {sig.payload.body
                          ? String(sig.payload.body).slice(0, 200)
                          : null}
                      </p>
                    )}
                    {!sig.payload?.subject && !sig.payload?.body && (
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {JSON.stringify(sig.payload ?? sig).slice(0, 120)}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2 — GENERATED CAPABILITIES
         ══════════════════════════════════════════════════════════════════════ */}
      <section data-testid="generated-capabilities" className="space-y-4">
        <div className="flex items-center gap-2">
          <Dna className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-semibold text-foreground">Generated Capabilities</h2>
        </div>

        <Card className="border-border">
          <CardContent className="p-0">
            {capsLoading ? (
              <div className="p-5 space-y-3">
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
              </div>
            ) : (realCaps ?? []).length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No capabilities generated yet.
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Name</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Kind</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Stage</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">Gen</th>
                  </tr>
                </thead>
                <tbody>
                  {(realCaps ?? []).map((cap: any) => (
                    <tr
                      key={cap.id}
                      className="border-b border-border/50 hover:bg-muted/10 transition-colors"
                    >
                      <td className="px-4 py-2.5 font-medium text-foreground">{cap.name}</td>
                      <td className="px-4 py-2.5 font-mono text-muted-foreground">{cap.kind}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${stageBadge(cap.stage)}`}>
                          {cap.stage}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                        {cap.generation ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3 — GOVERNANCE QUEUE (simulation)
         ══════════════════════════════════════════════════════════════════════ */}

      {/* Governance Queue */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            Governance Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {govLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : (
            <div className="space-y-3">
              {sortedGov.map((g: any) => {
                const isPending = g.status === "pending";
                return (
                  <div
                    key={g.id}
                    className={`p-4 rounded-lg border ${isPending ? "border-border bg-muted/20" : "border-border/50 bg-muted/5 opacity-75"}`}
                    data-testid={`gov-item-${g.id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${riskBadge(g.riskLevel)} ${g.riskLevel === "critical" ? "pulse-live" : ""}`}
                        >
                          {g.riskLevel}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${categoryBadge(g.category)}`}>
                          {g.category.replace("_", " ")}
                        </span>
                        {!isPending && (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              g.status === "approved"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : g.status === "rejected"
                                ? "bg-red-500/10 text-red-400"
                                : "bg-slate-500/10 text-slate-400"
                            }`}
                          >
                            {g.status}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {timeAgo(g.createdAt)}
                      </span>
                    </div>

                    <div className="font-medium text-sm text-foreground mb-1">{g.title}</div>
                    <div className="text-xs text-muted-foreground mb-2">{g.description}</div>

                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground mb-2">
                      <span>
                        Requested by:{" "}
                        <span className="text-foreground font-mono">{g.requestedBy}</span>
                      </span>
                      {g.financialImpact > 0 && (
                        <span>
                          Impact:{" "}
                          <span className="text-amber-400 font-mono">
                            {formatCurrency(g.financialImpact)}
                          </span>
                        </span>
                      )}
                    </div>

                    {isPending && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                        <input
                          type="text"
                          placeholder="Response (optional)..."
                          className="flex-1 px-3 py-1.5 rounded bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500"
                          value={responses[g.id] || ""}
                          onChange={(e) => setResponses({ ...responses, [g.id]: e.target.value })}
                          data-testid={`gov-response-${g.id}`}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 text-xs h-7"
                          onClick={() => resolveMutation.mutate({ id: g.id, status: "approved" })}
                          disabled={resolveMutation.isPending}
                          data-testid={`gov-approve-${g.id}`}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-400 border-red-500/30 hover:bg-red-500/10 text-xs h-7"
                          onClick={() => resolveMutation.mutate({ id: g.id, status: "rejected" })}
                          disabled={resolveMutation.isPending}
                          data-testid={`gov-reject-${g.id}`}
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}

                    {!isPending && g.humanResponse && (
                      <div className="mt-2 p-2 rounded bg-muted/30 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{g.reviewedBy}:</span>{" "}
                        {g.humanResponse}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Council Reviews */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-purple-400" />
            Council Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(councilReviews ?? []).map((review: any) => {
              const reviewerAgents = JSON.parse(review.reviewerAgents || "[]");
              const votes = JSON.parse(review.votes || "{}");

              return (
                <div
                  key={review.id}
                  className="p-4 rounded-lg border border-border bg-muted/10"
                  data-testid={`council-${review.id}`}
                >
                  <div className="text-xs text-muted-foreground mb-2">{review.triggerEvent}</div>

                  <div className="flex items-center gap-2 mb-3">
                    {reviewerAgents.map((name: string) => (
                      <div
                        key={name}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-muted/40 border border-border"
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${votes[name] === "approve" ? "bg-emerald-400" : "bg-red-400"}`}
                        />
                        <span className="text-[10px] font-mono text-foreground">{name}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${consensusBadge(review.consensus)}`}
                    >
                      {review.consensus}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] ${
                        review.outcome === "approved"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : review.outcome === "rejected"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {review.outcome.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono ml-auto">
                      {timeAgo(review.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
