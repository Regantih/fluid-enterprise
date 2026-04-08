import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Shield, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

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

export default function GovernanceBoard() {
  const { toast } = useToast();
  const [responses, setResponses] = useState<Record<number, string>>({});

  const { data: govItems, isLoading } = useQuery<any[]>({
    queryKey: ["/api/governance"],
    refetchInterval: 5000,
  });

  const { data: councilReviews } = useQuery<any[]>({
    queryKey: ["/api/council"],
    refetchInterval: 5000,
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

  const pendingCount = (govItems ?? []).filter((g: any) => g.status === "pending").length;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  // Sort: pending first
  const sorted = [...(govItems ?? [])].sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (a.status !== "pending" && b.status === "pending") return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="p-6 space-y-6">
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
          <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-sm font-mono font-bold" data-testid="pending-count">
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Governance Queue */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            Governance Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sorted.map((g: any) => {
              const isPending = g.status === "pending";
              return (
                <div
                  key={g.id}
                  className={`p-4 rounded-lg border ${isPending ? "border-border bg-muted/20" : "border-border/50 bg-muted/5 opacity-75"}`}
                  data-testid={`gov-item-${g.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${riskBadge(g.riskLevel)} ${g.riskLevel === "critical" ? "pulse-live" : ""}`}>
                        {g.riskLevel}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${categoryBadge(g.category)}`}>
                        {g.category.replace("_", " ")}
                      </span>
                      {!isPending && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${g.status === "approved" ? "bg-emerald-500/10 text-emerald-400" : g.status === "rejected" ? "bg-red-500/10 text-red-400" : "bg-slate-500/10 text-slate-400"}`}>
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
                    <span>Requested by: <span className="text-foreground font-mono">{g.requestedBy}</span></span>
                    {g.financialImpact > 0 && (
                      <span>Impact: <span className="text-amber-400 font-mono">{formatCurrency(g.financialImpact)}</span></span>
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
                      <span className="font-medium text-foreground">{g.reviewedBy}:</span> {g.humanResponse}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
                      <div key={name} className="flex items-center gap-1 px-2 py-0.5 rounded bg-muted/40 border border-border">
                        <div className={`w-1.5 h-1.5 rounded-full ${votes[name] === "approve" ? "bg-emerald-400" : "bg-red-400"}`} />
                        <span className="text-[10px] font-mono text-foreground">{name}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${consensusBadge(review.consensus)}`}>
                      {review.consensus}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] ${review.outcome === "approved" ? "bg-emerald-500/10 text-emerald-400" : review.outcome === "rejected" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"}`}>
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
