import { useState, useEffect, useRef } from "react";

interface AgentExecutionStreamProps {
  gapId: string | number;
  gapName: string;
  onComplete: (result: any) => void;
  onClose: () => void;
}

type LogType = "status" | "thinking" | "code" | "eval" | "complete";

interface LogEntry {
  id: number;
  type: LogType;
  content: string;
  passed?: boolean;
  caseNum?: number;
  caseName?: string;
}

export function AgentExecutionStream({ gapId, gapName, onComplete, onClose }: AgentExecutionStreamProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const startTime = useRef(Date.now());
  const logCounter = useRef(0);
  const evalCount = useRef(0);

  function addLog(entry: Omit<LogEntry, "id">) {
    setLogs(prev => [...prev, { id: logCounter.current++, ...entry }]);
  }

  // Auto-scroll to bottom as new log entries arrive
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);

    addLog({ type: "status", content: "Connecting to agent runtime..." });

    let aborted = false;
    const controller = new AbortController();

    async function runStream() {
      try {
        const res = await fetch("/api/generator/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gap_id: gapId }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          addLog({ type: "status", content: `Connection failed (HTTP ${res.status}).` });
          return;
        }

        addLog({ type: "status", content: "Agent online. Executing..." });

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let currentEvent = "";

        while (!aborted) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("event:")) {
              currentEvent = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              const raw = line.slice(5).trim();
              if (!raw || raw === "[DONE]") continue;

              let payload: any;
              try {
                payload = JSON.parse(raw);
              } catch {
                addLog({ type: "status", content: raw });
                continue;
              }

              if (currentEvent === "thinking") {
                addLog({
                  type: "thinking",
                  content: payload.message ?? payload.content ?? raw,
                });
              } else if (currentEvent === "code") {
                const chunk = payload.content ?? payload.chunk ?? "";
                // Accumulate code chunks into the same log entry
                setLogs(prev => {
                  const last = prev[prev.length - 1];
                  if (last?.type === "code") {
                    return [...prev.slice(0, -1), { ...last, content: last.content + chunk }];
                  }
                  return [...prev, { id: logCounter.current++, type: "code", content: chunk }];
                });
              } else if (currentEvent === "eval") {
                evalCount.current += 1;
                addLog({
                  type: "eval",
                  content: "",
                  passed: payload.passed ?? payload.result === "pass",
                  caseNum: evalCount.current,
                  caseName: payload.name ?? String(payload.case_id ?? `Case ${evalCount.current}`),
                });
              } else if (currentEvent === "complete") {
                const score = payload.fitness ?? payload.composite ?? payload.score;
                addLog({
                  type: "complete",
                  content: score !== undefined ? (score * 100).toFixed(1) : "N/A",
                });
                setIsDone(true);
                onComplete(payload);
              } else {
                // Fallback for untyped events
                addLog({ type: "status", content: raw });
              }

              // Reset event type after each data dispatch
              currentEvent = "";
            }
          }
        }
      } catch (err: any) {
        if (!aborted) {
          addLog({ type: "status", content: `Stream error: ${err.message}` });
        }
      }
    }

    runStream();

    return () => {
      aborted = true;
      controller.abort();
      clearInterval(timer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/75 backdrop-blur-sm">
      <div
        className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl shadow-green-950/30 flex flex-col"
        style={{ maxHeight: "82vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-2 h-2 rounded-full bg-green-400 ${!isDone ? "animate-pulse" : ""}`}
            />
            <span className="font-mono text-sm font-bold text-green-400 truncate max-w-xs">
              Agent Execution — {gapName}
            </span>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <span className="text-xs font-mono text-zinc-600 tabular-nums">
              {mm}:{ss}
            </span>
            {isDone && (
              <button
                className="text-xs font-mono text-zinc-400 hover:text-zinc-100 transition-colors"
                onClick={onClose}
              >
                ✕ Close
              </button>
            )}
          </div>
        </div>

        {/* Log area */}
        <div
          ref={logRef}
          className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-xs leading-relaxed"
          style={{ minHeight: "280px" }}
        >
          {logs.map(entry => {
            if (entry.type === "status") {
              return (
                <p key={entry.id} className="text-zinc-600 italic">
                  {entry.content}
                </p>
              );
            }

            if (entry.type === "thinking") {
              return (
                <p key={entry.id} className="text-cyan-700 italic">
                  🧠 {entry.content}
                </p>
              );
            }

            if (entry.type === "code") {
              return (
                <pre
                  key={entry.id}
                  className="text-green-400 whitespace-pre-wrap break-all mt-1 mb-1"
                >
                  {entry.content}
                </pre>
              );
            }

            if (entry.type === "eval") {
              return (
                <p
                  key={entry.id}
                  className={entry.passed ? "text-green-400" : "text-red-400"}
                >
                  {entry.passed ? "✓" : "✗"} Case {entry.caseNum}: {entry.caseName} —{" "}
                  <span className="font-bold">{entry.passed ? "PASS" : "FAIL"}</span>
                </p>
              );
            }

            if (entry.type === "complete") {
              return (
                <div
                  key={entry.id}
                  className="mt-3 p-3 rounded-lg border border-green-500/30 bg-green-500/5"
                >
                  <p className="text-green-300 font-bold text-sm mb-1">
                    ✓ Capability Generated Successfully
                  </p>
                  <p className="text-green-400">
                    Final Fitness Score:{" "}
                    <span className="text-lg font-bold">{entry.content}%</span>
                  </p>
                </div>
              );
            }

            return null;
          })}

          {!isDone && (
            <div className="flex items-center gap-1.5 text-green-600 pt-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span>Processing...</span>
            </div>
          )}
        </div>

        {/* Footer */}
        {isDone && (
          <div className="px-5 py-3 border-t border-zinc-800 flex items-center justify-between shrink-0">
            <span className="text-xs font-mono text-zinc-500">
              Stream complete · {elapsed}s elapsed
            </span>
            <button
              className="px-4 py-1.5 rounded text-xs font-mono text-green-400 border border-green-500/30 hover:bg-green-500/10 transition-colors"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
