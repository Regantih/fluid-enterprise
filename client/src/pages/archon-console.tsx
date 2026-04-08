import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, Send, Loader2 } from "lucide-react";
import type { Intent } from "@shared/schema";

const statusColors: Record<string, string> = {
  processing: "bg-amber-500/10 text-amber-400",
  orchestrating: "bg-cyan-500/10 text-cyan-400",
  executing: "bg-purple-500/10 text-purple-400",
  completed: "bg-emerald-500/10 text-emerald-400",
  failed: "bg-red-500/10 text-red-400",
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

export default function ArchonConsole() {
  const [intentText, setIntentText] = useState("");

  const { data: intents, isLoading } = useQuery<Intent[]>({
    queryKey: ["/api/intents"],
    refetchInterval: 3000,
  });

  const mutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/intents", {
        humanText: text,
        archonInterpretation: "Analyzing intent and orchestrating guild response...",
        guildsInvolved: "[]",
        agentsAssigned: "[]",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/intents"] });
      setIntentText("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (intentText.trim()) {
      mutation.mutate(intentText.trim());
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="archon-console">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Brain className="w-6 h-6 text-cyan-400" />
          <h1 className="text-lg font-semibold text-foreground tracking-wide">ARCHON</h1>
        </div>
        <p className="text-[12px] text-muted-foreground">
          Central Orchestrator — Intent → Action
        </p>
      </div>

      {/* Intent Input */}
      <form onSubmit={handleSubmit} className="relative" data-testid="intent-form">
        <div className="bg-card border border-card-border rounded-lg p-4">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium block mb-2">
            Human Intent
          </label>
          <textarea
            value={intentText}
            onChange={(e) => setIntentText(e.target.value)}
            placeholder="Describe what you want the enterprise to do..."
            className="w-full bg-background border border-border rounded-md px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-cyan-400/50 transition-colors min-h-[80px]"
            data-testid="intent-input"
          />
          <div className="flex justify-end mt-3">
            <button
              type="submit"
              disabled={!intentText.trim() || mutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-[12px] font-medium text-background rounded-md transition-colors"
              data-testid="submit-intent"
            >
              {mutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Submit Intent
            </button>
          </div>
        </div>
      </form>

      {/* Past Intents */}
      <div>
        <h2 className="text-[13px] font-semibold text-foreground mb-3 uppercase tracking-wider">
          Intent History
        </h2>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {intents?.map((intent) => {
              const guilds = (() => {
                try { return JSON.parse(intent.guildsInvolved); } catch { return []; }
              })();
              const agents = (() => {
                try { return JSON.parse(intent.agentsAssigned); } catch { return []; }
              })();

              return (
                <div
                  key={intent.id}
                  className="bg-card border border-card-border rounded-lg p-4"
                  data-testid={`intent-${intent.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground mb-1">
                        "{intent.humanText}"
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {intent.archonInterpretation}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          statusColors[intent.status] || ""
                        }`}
                        data-testid={`intent-status-${intent.id}`}
                      >
                        {intent.status}
                      </span>
                      <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
                        {timeAgo(intent.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground">Progress</span>
                      <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
                        {(intent.progress * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${intent.progress * 100}%`,
                          background:
                            intent.status === "completed"
                              ? "hsl(160 60% 45%)"
                              : intent.status === "failed"
                              ? "hsl(0 72% 51%)"
                              : "hsl(187 85% 48%)",
                        }}
                        data-testid={`intent-progress-${intent.id}`}
                      />
                    </div>
                  </div>

                  {/* Guilds and agents involved */}
                  {(guilds.length > 0 || agents.length > 0) && (
                    <div className="mt-3 flex items-center gap-4 text-[10px] text-muted-foreground">
                      {guilds.length > 0 && (
                        <span>{guilds.length} guild{guilds.length !== 1 ? "s" : ""} involved</span>
                      )}
                      {agents.length > 0 && (
                        <span>{agents.length} agent{agents.length !== 1 ? "s" : ""} assigned</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {(!intents || intents.length === 0) && (
              <div className="text-center py-12 text-muted-foreground text-[12px]">
                No intents yet. Submit your first intent above.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
