import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import type { Escalation } from "@shared/schema";

const priorityConfig: Record<string, { color: string; pulse: boolean }> = {
  critical: { color: "bg-red-500/10 text-red-400", pulse: true },
  high: { color: "bg-amber-500/10 text-amber-400", pulse: false },
  medium: { color: "bg-cyan-500/10 text-cyan-400", pulse: false },
  low: { color: "bg-muted text-muted-foreground", pulse: false },
};

const statusConfig: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400",
  reviewing: "bg-cyan-500/10 text-cyan-400",
  approved: "bg-emerald-500/10 text-emerald-400",
  rejected: "bg-red-500/10 text-red-400",
  deferred: "bg-purple-500/10 text-purple-400",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function EscalationCard({ escalation }: { escalation: Escalation }) {
  const [response, setResponse] = useState("");
  const isPending = escalation.status === "pending" || escalation.status === "reviewing";

  const resolveMutation = useMutation({
    mutationFn: async ({ status, response }: { status: string; response: string }) => {
      const res = await apiRequest("POST", `/api/escalations/${escalation.id}/resolve`, {
        status,
        response,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/escalations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setResponse("");
    },
  });

  const context = (() => {
    try {
      return JSON.parse(escalation.context);
    } catch {
      return {};
    }
  })();

  const priConfig = priorityConfig[escalation.priority] || priorityConfig.medium;

  return (
    <div
      className="bg-card border border-card-border rounded-lg p-4"
      data-testid={`escalation-${escalation.id}`}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${priConfig.color} ${
              priConfig.pulse ? "pulse-live" : ""
            }`}
            data-testid={`escalation-priority-${escalation.id}`}
          >
            {escalation.priority}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
            #{escalation.id}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              statusConfig[escalation.status] || ""
            }`}
            data-testid={`escalation-status-${escalation.id}`}
          >
            {escalation.status}
          </span>
          <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
            {timeAgo(escalation.createdAt)}
          </span>
        </div>
      </div>

      <p className="text-[13px] font-medium text-foreground mb-1">{escalation.reason}</p>
      <p className="text-[11px] text-muted-foreground mb-2">
        Agent #{escalation.agentId}
        {context.title && ` — ${context.title}`}
      </p>

      {/* Context details */}
      {context.description && (
        <p className="text-[11px] text-muted-foreground/70 mb-3 border-l-2 border-border pl-2">
          {context.description}
        </p>
      )}

      {isPending ? (
        <div className="mt-3 space-y-2" data-testid={`escalation-actions-${escalation.id}`}>
          <input
            type="text"
            placeholder="Add your response (optional)..."
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-cyan-400/50 transition-colors"
            data-testid={`escalation-response-input-${escalation.id}`}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => resolveMutation.mutate({ status: "approved", response })}
              disabled={resolveMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-md text-[11px] font-medium transition-colors disabled:opacity-50"
              data-testid={`approve-${escalation.id}`}
            >
              {resolveMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3 h-3" />
              )}
              Approve
            </button>
            <button
              onClick={() => resolveMutation.mutate({ status: "rejected", response })}
              disabled={resolveMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-md text-[11px] font-medium transition-colors disabled:opacity-50"
              data-testid={`reject-${escalation.id}`}
            >
              {resolveMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <XCircle className="w-3 h-3" />
              )}
              Reject
            </button>
          </div>
        </div>
      ) : (
        escalation.humanResponse && (
          <div className="mt-3 p-2 rounded bg-background/50 border border-border/30">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-0.5">
              Human Response
            </span>
            <p className="text-[11px] text-foreground">{escalation.humanResponse}</p>
          </div>
        )
      )}
    </div>
  );
}

export default function EscalationQueue() {
  const { data: escalations, isLoading } = useQuery<Escalation[]>({
    queryKey: ["/api/escalations"],
    refetchInterval: 4000,
  });

  if (isLoading || !escalations) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64 rounded-lg" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))}
      </div>
    );
  }

  // Sort: pending first, then by priority (critical > high > medium > low), then by createdAt desc
  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...escalations].sort((a, b) => {
    const aPending = a.status === "pending" || a.status === "reviewing" ? 0 : 1;
    const bPending = b.status === "pending" || b.status === "reviewing" ? 0 : 1;
    if (aPending !== bPending) return aPending - bPending;
    const aPri = priorityOrder[a.priority] ?? 2;
    const bPri = priorityOrder[b.priority] ?? 2;
    if (aPri !== bPri) return aPri - bPri;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const pendingCount = escalations.filter(
    (e) => e.status === "pending" || e.status === "reviewing"
  ).length;

  return (
    <div className="p-6 space-y-6" data-testid="escalation-queue">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h1 className="text-lg font-semibold text-foreground">Escalation Queue</h1>
          </div>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Human-in-the-loop — review and resolve agent escalations
          </p>
        </div>
        <div
          className={`flex items-center gap-2 bg-card border border-card-border rounded-lg px-3 py-2 ${
            pendingCount > 0 ? "glow-amber" : ""
          }`}
          data-testid="pending-count"
        >
          {pendingCount > 0 && <Clock className="w-3.5 h-3.5 text-amber-400 pulse-live" />}
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Pending</span>
          <span
            className={`text-lg font-mono font-semibold tabular-nums ${
              pendingCount > 0 ? "text-amber-400" : "text-muted-foreground"
            }`}
          >
            {pendingCount}
          </span>
        </div>
      </div>

      {/* Escalation Cards */}
      <div className="space-y-3">
        {sorted.map((escalation) => (
          <EscalationCard key={escalation.id} escalation={escalation} />
        ))}
        {sorted.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-[12px]">
            No escalations in the queue.
          </div>
        )}
      </div>
    </div>
  );
}
