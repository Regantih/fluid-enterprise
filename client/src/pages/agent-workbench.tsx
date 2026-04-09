import { useState, useRef, useEffect } from 'react';
import {
  Play,
  ChevronDown,
  ChevronRight,
  Zap,
  Brain,
  GitMerge,
  CheckCircle2,
  BookOpen,
  Trophy,
  AlertTriangle,
} from 'lucide-react';

interface ExecutionStep {
  step: string;
  title: string;
  content: string;
  detail?: any;
  timestamp: string;
  fitness_delta?: string;
  risk_level?: string;
  confidence?: number;
  action_type?: string;
  governance_hash?: string;
  trust_delta?: string;
  pattern_count?: number;
  signal_id?: string;
  agent_name?: string;
}

const SIGNALS = [
  {
    type: 'vendor_risk',
    label: 'Vendor Risk Signal',
    color: 'orange',
    classes: 'border-orange-500/40 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 hover:border-orange-400',
    activeClasses: 'border-orange-400 bg-orange-500/25 text-orange-200',
    dot: 'bg-orange-400',
  },
  {
    type: 'month_end_close',
    label: 'Month-End Close Signal',
    color: 'blue',
    classes: 'border-blue-500/40 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 hover:border-blue-400',
    activeClasses: 'border-blue-400 bg-blue-500/25 text-blue-200',
    dot: 'bg-blue-400',
  },
  {
    type: 'onboarding',
    label: 'Onboarding Signal',
    color: 'green',
    classes: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400',
    activeClasses: 'border-emerald-400 bg-emerald-500/25 text-emerald-200',
    dot: 'bg-emerald-400',
  },
];

function riskColor(level?: string) {
  if (!level) return { text: 'text-slate-400', bg: 'bg-slate-500/10', bar: 'bg-slate-400' };
  const l = level.toUpperCase();
  if (l === 'CRITICAL') return { text: 'text-red-400', bg: 'bg-red-500/10', bar: 'bg-red-500' };
  if (l === 'HIGH') return { text: 'text-orange-400', bg: 'bg-orange-500/10', bar: 'bg-orange-500' };
  if (l === 'MEDIUM') return { text: 'text-amber-400', bg: 'bg-amber-500/10', bar: 'bg-amber-400' };
  return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', bar: 'bg-emerald-400' };
}

function stepBorderColor(step: string) {
  if (step === 'signal') return 'border-cyan-500';
  if (step === 'reasoning_complete') return 'border-violet-500';
  if (step === 'decision') return 'border-amber-500';
  if (step === 'action') return 'border-blue-500';
  if (step === 'governance') return 'border-emerald-500';
  if (step === 'complete') return 'border-cyan-400';
  return 'border-slate-600';
}

function stepIcon(step: string) {
  if (step === 'signal') return <Zap className="w-3.5 h-3.5" />;
  if (step === 'reasoning_complete') return <Brain className="w-3.5 h-3.5" />;
  if (step === 'decision') return <GitMerge className="w-3.5 h-3.5" />;
  if (step === 'action') return <Play className="w-3.5 h-3.5" />;
  if (step === 'governance') return <BookOpen className="w-3.5 h-3.5" />;
  if (step === 'complete') return <Trophy className="w-3.5 h-3.5" />;
  return <CheckCircle2 className="w-3.5 h-3.5" />;
}

function stepIconBg(step: string) {
  if (step === 'signal') return 'bg-cyan-500/20 text-cyan-400';
  if (step === 'reasoning_complete') return 'bg-violet-500/20 text-violet-400';
  if (step === 'decision') return 'bg-amber-500/20 text-amber-400';
  if (step === 'action') return 'bg-blue-500/20 text-blue-400';
  if (step === 'governance') return 'bg-emerald-500/20 text-emerald-400';
  if (step === 'complete') return 'bg-cyan-500/20 text-cyan-400';
  return 'bg-slate-500/20 text-slate-400';
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return iso;
  }
}

function JsonDetail({ data }: { data: any }) {
  return (
    <pre className="text-[10px] font-mono text-slate-400 bg-[hsl(228,28%,5%)] rounded-md p-3 overflow-x-auto leading-relaxed whitespace-pre-wrap">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function StepCard({
  step,
  index,
  reasoningBuffer,
}: {
  step: ExecutionStep;
  index: number;
  reasoningBuffer?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isReasoning = step.step === 'reasoning_complete';
  const displayContent = isReasoning && reasoningBuffer !== undefined ? reasoningBuffer : step.content;
  const rc = riskColor(step.risk_level);

  return (
    <div
      className={`relative flex gap-4 animate-in fade-in slide-in-from-bottom-3 duration-500`}
      style={{ animationFillMode: 'both' }}
    >
      {/* Connector line */}
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${stepIconBg(step.step)}`}>
          {stepIcon(step.step)}
        </div>
        <div className="w-px flex-1 bg-slate-800 mt-2" />
      </div>

      {/* Card */}
      <div
        className={`flex-1 mb-4 rounded-lg border-l-4 ${stepBorderColor(step.step)} bg-[hsl(228,28%,9%)] border border-[hsl(225,20%,14%)] overflow-hidden`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(225,20%,12%)]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500">STEP {index + 1}</span>
            <span className="text-sm font-semibold text-slate-100">{step.title}</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 tabular-nums">{formatTime(step.timestamp)}</span>
        </div>

        {/* Content */}
        <div className="px-4 py-3 space-y-3">
          {/* Reasoning: streaming text */}
          {isReasoning ? (
            <p className="text-sm text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">{displayContent}<span className="inline-block w-1.5 h-4 bg-violet-400 animate-pulse ml-0.5 align-middle" /></p>
          ) : (
            <p className="text-sm text-slate-300 leading-relaxed">{displayContent}</p>
          )}

          {/* Risk level badge */}
          {step.risk_level && (
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${rc.bg} ${rc.text}`}>
                {step.risk_level.toUpperCase()} RISK
              </span>
              {step.confidence !== undefined && (
                <div className="flex items-center gap-2 flex-1 max-w-xs">
                  <span className="text-[10px] text-slate-500 shrink-0">Confidence</span>
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${rc.bar} rounded-full transition-all duration-1000`}
                      style={{ width: `${step.confidence}%` }}
                    />
                  </div>
                  <span className={`text-xs font-mono font-bold ${rc.text}`}>{step.confidence}%</span>
                </div>
              )}
            </div>
          )}

          {/* Pattern match */}
          {step.pattern_count !== undefined && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="text-cyan-400 font-mono font-bold">{step.pattern_count}</span>
              <span>historical patterns analyzed</span>
            </div>
          )}

          {/* Action */}
          {step.action_type && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-xs">Action</span>
              <span className="text-xs text-blue-300 font-mono bg-blue-500/10 px-2 py-0.5 rounded">→ {step.action_type}</span>
            </div>
          )}

          {/* Governance */}
          {step.governance_hash && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Gov Hash</span>
                <span className="font-mono text-emerald-400 text-[11px]">{step.governance_hash}</span>
              </div>
              {step.trust_delta && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Trust Delta</span>
                  <span className="font-mono text-emerald-400 font-bold">{step.trust_delta}</span>
                </div>
              )}
            </div>
          )}

          {/* Fitness */}
          {step.fitness_delta && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Fitness Δ</span>
              <span className="font-mono text-cyan-400 font-bold">{step.fitness_delta}</span>
            </div>
          )}

          {/* Expandable detail */}
          {step.detail && (
            <div>
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
              >
                {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {expanded ? 'Hide' : 'Show'} raw payload
              </button>
              {expanded && (
                <div className="mt-2 animate-in fade-in duration-200">
                  <JsonDetail data={step.detail} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function buildSummary(steps: ExecutionStep[], signalType: string): string {
  const signal = steps.find(s => s.step === 'signal');
  const decision = steps.find(s => s.step === 'decision');
  const action = steps.find(s => s.step === 'action');
  const gov = steps.find(s => s.step === 'governance');

  const signalId = signal?.signal_id ?? signal?.detail?.id ?? '#4521';
  const source = signal?.detail?.source ?? 'Slack';
  const agentName = signal?.agent_name ?? 'Vendor Risk Agent';
  const patterns = decision?.pattern_count ?? 57;
  const riskLvl = decision?.risk_level ?? 'HIGH';
  const vendor = decision?.detail?.vendor ?? 'Apex Precision Parts';
  const confidence = decision?.confidence ?? 89;
  const actionType = action?.action_type ?? 'escalation workflow';
  const trustDelta = gov?.trust_delta ?? '+0.02';

  return `The ${agentName} received signal ${signalId} from ${source}, analyzed it against ${patterns} historical patterns, determined ${riskLvl} risk for ${vendor} with ${confidence}% confidence, triggered an ${actionType}, and recorded the action in the governance chain. Trust score: ${trustDelta}. The agent learned from this interaction and will handle similar signals more efficiently next time.`;
}

export default function AgentWorkbench() {
  const [steps, setSteps] = useState<ExecutionStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [reasoningBuffer, setReasoningBuffer] = useState('');
  const [activeSignal, setActiveSignal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const reasoningStepRef = useRef<string>('');

  const executeTask = async (signalType: string) => {
    setSteps([]);
    setReasoningBuffer('');
    setActiveSignal(signalType);
    setIsRunning(true);
    setError(null);
    setIsComplete(false);
    reasoningStepRef.current = '';

    try {
      const response = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signal_type: signalType }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentReasoning = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));

              if (event.step === 'reasoning_stream') {
                currentReasoning += event.content;
                setReasoningBuffer(currentReasoning);
              } else {
                if (event.step === 'decision' && currentReasoning) {
                  setSteps(prev => [...prev, {
                    step: 'reasoning_complete',
                    title: 'Agent Analysis Complete',
                    content: currentReasoning,
                    timestamp: event.timestamp,
                  }]);
                  currentReasoning = '';
                  setReasoningBuffer('');
                }
                if (event.step === 'complete') {
                  setIsComplete(true);
                }
                setSteps(prev => [...prev, event]);
              }
            } catch {
              // skip malformed lines
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message ?? 'Unknown error');
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps, reasoningBuffer]);

  const completeSteps = steps.filter(s => s.step !== 'reasoning_stream');
  const showSummary = isComplete && completeSteps.length > 0;
  const activeSig = SIGNALS.find(s => s.type === activeSignal);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-[hsl(225,20%,12%)] px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Play className="w-5 h-5 text-cyan-400" />
              Agent Workbench
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Watch agents reason, decide, and act — step by step
            </p>
          </div>
          {isRunning && (
            <div className="flex items-center gap-2 text-xs text-cyan-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              EXECUTING
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-6 max-w-4xl mx-auto space-y-8">
        {/* Signal Picker */}
        <section>
          <div className="text-xs font-semibold text-slate-500 tracking-widest uppercase mb-3">
            Pick a Signal
          </div>
          <div className="flex flex-wrap gap-3">
            {SIGNALS.map(sig => {
              const isActive = activeSignal === sig.type && isRunning;
              return (
                <button
                  key={sig.type}
                  onClick={() => !isRunning && executeTask(sig.type)}
                  disabled={isRunning}
                  className={`
                    flex items-center gap-2.5 px-5 py-3 rounded-lg border text-sm font-medium
                    transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                    ${activeSignal === sig.type ? sig.activeClasses : sig.classes}
                  `}
                >
                  <span className={`w-2 h-2 rounded-full ${sig.dot} ${isActive ? 'animate-pulse' : ''}`} />
                  {sig.label}
                  {isActive && <span className="text-[10px] font-mono opacity-70">running…</span>}
                </button>
              );
            })}
          </div>
          {!isRunning && steps.length === 0 && (
            <p className="text-xs text-slate-600 mt-3">
              Click a signal to watch the agent work in real time.
            </p>
          )}
        </section>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-300">Execution failed</p>
              <p className="text-xs text-red-400/70 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Execution Timeline */}
        {(steps.length > 0 || (isRunning && reasoningBuffer)) && (
          <section>
            <div className="text-xs font-semibold text-slate-500 tracking-widest uppercase mb-4">
              Execution Timeline
              {activeSig && (
                <span className="ml-3 text-slate-600 normal-case font-normal tracking-normal">
                  — {activeSig.label}
                </span>
              )}
            </div>

            <div className="space-y-0">
              {/* Render completed steps */}
              {completeSteps.map((step, i) => (
                <StepCard
                  key={`${step.step}-${i}`}
                  step={step}
                  index={i}
                  reasoningBuffer={step.step === 'reasoning_complete' ? undefined : undefined}
                />
              ))}

              {/* Live reasoning stream card (while still streaming) */}
              {isRunning && reasoningBuffer && !steps.find(s => s.step === 'reasoning_complete') && (
                <div className="relative flex gap-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-violet-500/20 text-violet-400">
                      <Brain className="w-3.5 h-3.5" />
                    </div>
                    <div className="w-px flex-1 bg-slate-800 mt-2" />
                  </div>
                  <div className="flex-1 mb-4 rounded-lg border-l-4 border-violet-500 bg-[hsl(228,28%,9%)] border border-[hsl(225,20%,14%)] overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(225,20%,12%)]">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-500">LIVE</span>
                        <span className="text-sm font-semibold text-slate-100">Agent Reasoning</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-violet-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                        Streaming
                      </div>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-sm text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
                        {reasoningBuffer}
                        <span className="inline-block w-1.5 h-4 bg-violet-400 animate-pulse ml-0.5 align-middle" />
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Running indicator */}
              {isRunning && steps.length === 0 && !reasoningBuffer && (
                <div className="flex items-center gap-3 py-4 text-sm text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  Waiting for agent response…
                </div>
              )}
            </div>
          </section>
        )}

        {/* Summary Panel */}
        {showSummary && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold text-cyan-300">What just happened?</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                {buildSummary(completeSteps, activeSignal ?? 'vendor_risk')}
              </p>
              <div className="mt-4 pt-4 border-t border-cyan-500/10 flex items-center gap-6">
                {completeSteps.find(s => s.step === 'governance')?.trust_delta && (
                  <div className="text-xs">
                    <span className="text-slate-500">Trust Score </span>
                    <span className="font-mono font-bold text-emerald-400">
                      {completeSteps.find(s => s.step === 'governance')?.trust_delta}
                    </span>
                  </div>
                )}
                {completeSteps.find(s => s.step === 'complete')?.fitness_delta && (
                  <div className="text-xs">
                    <span className="text-slate-500">Fitness Δ </span>
                    <span className="font-mono font-bold text-cyan-400">
                      {completeSteps.find(s => s.step === 'complete')?.fitness_delta}
                    </span>
                  </div>
                )}
                <div className="text-xs text-slate-500">
                  {completeSteps.length} steps · {activeSignal?.replace(/_/g, ' ')}
                </div>
              </div>
            </div>
          </section>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
