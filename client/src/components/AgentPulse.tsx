import { useState, useEffect, useRef } from "react";

interface ActivityEvent {
  id: number;
  agent: string;
  action: string;
  level: "info" | "success" | "warning";
  ts: number;
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function dotClass(level: string) {
  if (level === "success") return "bg-blue-400";
  if (level === "warning") return "bg-amber-400";
  return "bg-green-400";
}

export function AgentPulse() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [tick, setTick] = useState(0);
  const counter = useRef(0);

  // Refresh relative timestamps every 5 s
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/agents/activity/stream");

    function ingest(data: string) {
      try {
        const p = JSON.parse(data);
        const ev: ActivityEvent = {
          id: counter.current++,
          agent: p.agent ?? p.agent_id ?? p.name ?? "Agent",
          action: p.action ?? p.message ?? p.event ?? JSON.stringify(p),
          level: p.level ?? "info",
          ts: Date.now(),
        };
        setEvents(prev => [ev, ...prev].slice(0, 20));
      } catch {
        // ignore unparseable lines
      }
    }

    es.onmessage = (e) => ingest(e.data);
    es.addEventListener("activity", (e: MessageEvent) => ingest(e.data));
    es.addEventListener("agent_event", (e: MessageEvent) => ingest(e.data));

    return () => es.close();
  }, []);

  return (
    <div className="border-t border-[hsl(225,20%,12%)]">
      {/* Collapsible header */}
      <button
        className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-white/[0.025] transition-colors"
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
        <span className="text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase flex-1 text-left">
          Agent Activity
        </span>
        <span className="text-[9px] text-slate-600 font-mono">
          {collapsed ? "▲" : "▼"}
        </span>
      </button>

      {!collapsed && (
        <div className="pb-2 max-h-44 overflow-y-auto custom-scrollbar">
          {events.length === 0 ? (
            <p className="text-[10px] text-slate-700 italic px-4 py-1">
              Waiting for agent activity…
            </p>
          ) : (
            events.map(ev => (
              <div
                key={ev.id}
                className="flex items-start gap-2 px-3 py-1 hover:bg-white/[0.02] transition-colors"
                style={{ animation: "slideInFromTop 0.2s ease-out" }}
              >
                <div className={`w-1.5 h-1.5 rounded-full mt-[3px] shrink-0 ${dotClass(ev.level)}`} />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-slate-300">{ev.agent} </span>
                  <span className="text-[10px] text-slate-500 break-words">{ev.action}</span>
                </div>
                {/* tick is used to force re-render for relative time updates */}
                <span className="text-[9px] text-slate-700 font-mono shrink-0" data-tick={tick}>
                  {timeAgo(ev.ts)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
