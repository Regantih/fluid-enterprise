'use client'

import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  Zap, TrendingUp, AlertTriangle, CheckCircle2,
  Clock, DollarSign, Activity, Shield,
  ChevronRight, ArrowUpRight, RefreshCw,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { formatCents, timeAgo, statusBg, getBudgetStatus } from '@/lib/utils'

interface DashboardData {
  summary: {
    active_capabilities: number
    total_capabilities: number
    running_tasks: number
    pending_approvals: number
    critical_alerts: number
    total_budget_cents: number
    total_spent_cents: number
    budget_pct: number
  }
  spend_trend: { date: string; amount: number }[]
  domain_breakdown: { domain: string; amount: number }[]
  cap_health: {
    id: string; name: string; domain: string; status: string
    agent_type: string; budget_pct: number; fail_rate: number
    tasks_completed: number; last_heartbeat: string | null
    spent_monthly_cents: number; budget_monthly_cents: number
  }[]
  recent_activity: {
    id: string; actor: string; action: string
    severity: string; created_at: string; details: string | null
    capability_id: string | null
  }[]
  pending_approvals: {
    id: string; title: string; risk_level: string
    approval_type: string; created_at: string
  }[]
}

const DOMAIN_COLORS: Record<string, string> = {
  Finance: '#00D4FF',
  'Supply Chain': '#F5A623',
  Revenue: '#00E5A0',
  HR: '#8B5CF6',
  Operations: '#FF4757',
}

const SEVERITY_COLORS: Record<string, string> = {
  info: 'hsl(215,15%,50%)',
  warning: '#F5A623',
  error: '#FF4757',
  critical: '#FF4757',
}

function StatCard({ label, value, sub, icon: Icon, color, pulse }: {
  label: string; value: string | number; sub?: string
  icon: any; color: string; pulse?: boolean
}) {
  return (
    <div className="fluid-card p-5 animate-fade-up">
      <div className="flex items-start justify-between mb-3">
        <div
          className="flex items-center justify-center rounded-md"
          style={{
            width: 36, height: 36,
            background: `${color}15`,
            border: `1px solid ${color}25`,
          }}
        >
          <Icon size={16} style={{ color }} />
        </div>
        {pulse && (
          <div className="flex items-center gap-1.5">
            <div className="status-dot active" />
            <span style={{ fontSize: 10, color: '#00E5A0', fontFamily: 'IBM Plex Mono, monospace' }}>LIVE</span>
          </div>
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.04em', color: 'hsl(210,20%,94%)', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'hsl(215,15%,52%)', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color, marginTop: 4, fontFamily: 'IBM Plex Mono, monospace' }}>{sub}</div>}
    </div>
  )
}

function BudgetBar({ pct, status }: { pct: number; status: string }) {
  const color = status === 'critical' ? '#FF4757' : status === 'warning' ? '#F5A623' : '#00E5A0'
  return (
    <div style={{ height: 3, background: 'hsl(222,15%,18%)', borderRadius: 2, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'hsl(222,18%,12%)',
      border: '1px solid hsl(222,15%,20%)',
      borderRadius: 6,
      padding: '8px 12px',
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: 12,
    }}>
      <div style={{ color: 'hsl(215,15%,52%)', marginBottom: 4 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color ?? '#00D4FF' }}>
          ${p.value?.toLocaleString()}
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  async function load() {
    try {
      const res = await fetch('/api/dashboard')
      if (!res.ok) throw new Error()
      const json = await res.json()
      setData(json)
      setLastRefresh(new Date())
    } catch {
      // Try seeding first
      if (!seeding) {
        setSeeding(true)
        await fetch('/api/seed', { method: 'POST' })
        setSeeding(false)
        const res = await fetch('/api/dashboard')
        const json = await res.json()
        setData(json)
        setLastRefresh(new Date())
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading || seeding) {
    return (
      <div className="flex items-center justify-center h-full" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <div className="status-dot scaling mx-auto mb-4" style={{ width: 12, height: 12 }} />
          <p style={{ fontSize: 13, color: 'hsl(215,15%,50%)', fontFamily: 'IBM Plex Mono, monospace' }}>
            {seeding ? 'INITIALIZING · SEEDING ACME GLOBAL...' : 'LOADING CONTROL PLANE...'}
          </p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { summary, spend_trend, domain_breakdown, cap_health, recent_activity, pending_approvals } = data

  return (
    <div style={{ minHeight: '100vh' }}>
      <PageHeader
        title="Control Plane"
        subtitle={`ACME Global Industries · SAP S/4HANA → Fluid · Last refresh ${timeAgo(lastRefresh.toISOString())}`}
        badge={{ label: 'Phase 2 · Parallel Run', color: 'amber' }}
        actions={
          <button className="btn btn-ghost" onClick={load} style={{ fontSize: 12 }}>
            <RefreshCw size={13} />
            Refresh
          </button>
        }
      />

      <div className="p-8 space-y-8">

        {/* ── KPI Row ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 stagger" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <StatCard
            label="Active Capabilities"
            value={summary.active_capabilities}
            sub={`of ${summary.total_capabilities} total`}
            icon={Zap}
            color="#00D4FF"
            pulse
          />
          <StatCard
            label="Running Tasks"
            value={summary.running_tasks}
            sub="executing now"
            icon={Activity}
            color="#00E5A0"
            pulse
          />
          <StatCard
            label="Monthly Spend"
            value={formatCents(summary.total_spent_cents)}
            sub={`${summary.budget_pct}% of budget`}
            icon={DollarSign}
            color={summary.budget_pct >= 80 ? '#F5A623' : '#00E5A0'}
          />
          <StatCard
            label="Pending Approvals"
            value={summary.pending_approvals}
            sub={summary.critical_alerts > 0 ? `${summary.critical_alerts} over 80% budget` : 'no budget alerts'}
            icon={Shield}
            color={summary.pending_approvals > 0 ? '#F5A623' : '#00E5A0'}
          />
        </div>

        {/* ── Charts Row ───────────────────────────────────── */}
        <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 340px' }}>

          {/* Spend Trend */}
          <div className="fluid-card p-6 animate-fade-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.02em' }}>30-Day Spend Trend</h3>
                <p style={{ fontSize: 12, color: 'hsl(215,15%,50%)', marginTop: 2 }}>Daily AI inference & tool costs across all capabilities</p>
              </div>
              <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: 'hsl(215,15%,45%)' }}>
                {new Date().toISOString().slice(0, 7)}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={spend_trend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00D4FF" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#00D4FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,15%,16%)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', fill: 'hsl(215,15%,42%)' }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', fill: 'hsl(215,15%,42%)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="amount" stroke="#00D4FF" strokeWidth={2} fill="url(#spendGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Domain Breakdown */}
          <div className="fluid-card p-6 animate-fade-up" style={{ animationDelay: '160ms' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>Spend by Domain</h3>
            <p style={{ fontSize: 12, color: 'hsl(215,15%,50%)', marginBottom: 20 }}>Month-to-date allocation</p>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={domain_breakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="amount" paddingAngle={3}>
                  {domain_breakdown.map((entry, i) => (
                    <Cell key={i} fill={DOMAIN_COLORS[entry.domain] ?? '#8B5CF6'} stroke="none" />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => [`$${v.toLocaleString()}`, 'Spend']} contentStyle={{ background: 'hsl(222,18%,12%)', border: '1px solid hsl(222,15%,20%)', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {domain_breakdown.sort((a, b) => b.amount - a.amount).map((d) => (
                <div key={d.domain} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: DOMAIN_COLORS[d.domain] ?? '#8B5CF6' }} />
                    <span style={{ fontSize: 12, color: 'hsl(215,15%,60%)' }}>{d.domain}</span>
                  </div>
                  <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: 'hsl(210,20%,75%)' }}>
                    ${d.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Capability Health Grid ────────────────────────── */}
        <div className="fluid-card animate-fade-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'hsl(222,15%,18%)' }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.02em' }}>Capability Health</h3>
              <p style={{ fontSize: 12, color: 'hsl(215,15%,50%)', marginTop: 1 }}>Live status across all registered capabilities</p>
            </div>
            <a href="/capabilities" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#00D4FF', textDecoration: 'none' }}>
              View all <ChevronRight size={12} />
            </a>
          </div>
          <table className="fluid-table">
            <thead>
              <tr>
                <th>Capability</th>
                <th>Domain</th>
                <th>Status</th>
                <th>Agent</th>
                <th>Tasks Done</th>
                <th>Fail Rate</th>
                <th>Budget</th>
                <th>Heartbeat</th>
              </tr>
            </thead>
            <tbody>
              {cap_health.map((cap) => {
                const bStatus = getBudgetStatus(cap.budget_pct)
                const budgetColor = bStatus === 'critical' ? '#FF4757' : bStatus === 'warning' ? '#F5A623' : '#00E5A0'
                return (
                  <tr key={cap.id} style={{ cursor: 'pointer' }} onClick={() => window.location.href = '/capabilities'}>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'hsl(210,20%,88%)' }}>{cap.name}</div>
                    </td>
                    <td>
                      <span style={{
                        fontSize: 10, fontFamily: 'IBM Plex Mono, monospace',
                        color: DOMAIN_COLORS[cap.domain] ?? '#8B5CF6',
                        background: `${DOMAIN_COLORS[cap.domain] ?? '#8B5CF6'}15`,
                        border: `1px solid ${DOMAIN_COLORS[cap.domain] ?? '#8B5CF6'}25`,
                        padding: '1px 6px', borderRadius: 3,
                      }}>
                        {cap.domain}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className={`status-dot ${cap.status}`} />
                        <span style={{ fontSize: 12, textTransform: 'capitalize', color: 'hsl(210,20%,75%)' }}>{cap.status}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: 'hsl(215,15%,55%)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {cap.agent_type}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', color: 'hsl(210,20%,75%)' }}>
                        {cap.tasks_completed.toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        fontSize: 11, fontFamily: 'IBM Plex Mono, monospace',
                        color: cap.fail_rate > 5 ? '#FF4757' : cap.fail_rate > 2 ? '#F5A623' : 'hsl(215,15%,55%)',
                      }}>
                        {cap.fail_rate}%
                      </span>
                    </td>
                    <td style={{ minWidth: 130 }}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: budgetColor }}>
                          {cap.budget_pct}%
                        </span>
                        <span style={{ fontSize: 10, color: 'hsl(215,15%,45%)', fontFamily: 'IBM Plex Mono, monospace' }}>
                          {formatCents(cap.spent_monthly_cents)} / {formatCents(cap.budget_monthly_cents)}
                        </span>
                      </div>
                      <BudgetBar pct={cap.budget_pct} status={bStatus} />
                    </td>
                    <td>
                      <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: 'hsl(215,15%,50%)' }}>
                        {timeAgo(cap.last_heartbeat)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── Bottom Row: Activity + Pending Approvals ──────── */}
        <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 400px' }}>

          {/* Recent Activity */}
          <div className="fluid-card animate-fade-up" style={{ animationDelay: '260ms' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'hsl(222,15%,18%)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600 }}>Recent Activity</h3>
              <a href="/activity" style={{ fontSize: 12, color: '#00D4FF', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                Full log <ChevronRight size={12} />
              </a>
            </div>
            <div className="divide-y" style={{ borderColor: 'hsl(222,15%,18%)' }}>
              {recent_activity.map((item) => {
                const details = item.details ? JSON.parse(item.details) : {}
                return (
                  <div key={item.id} className="flex gap-3 px-5 py-3">
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: SEVERITY_COLORS[item.severity], marginTop: 5, flexShrink: 0 }} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#00D4FF', background: 'rgba(0,212,255,0.08)', padding: '1px 5px', borderRadius: 3 }}>
                          {item.action.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'hsl(210,20%,72%)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {details.message ?? item.action}
                      </div>
                      <div style={{ fontSize: 11, color: 'hsl(215,15%,42%)', marginTop: 2, fontFamily: 'IBM Plex Mono, monospace' }}>
                        {item.actor} · {timeAgo(item.created_at)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Pending Approvals */}
          <div className="fluid-card animate-fade-up" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'hsl(222,15%,18%)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600 }}>Pending Approvals</h3>
              <a href="/governance" style={{ fontSize: 12, color: '#F5A623', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                Governance <ChevronRight size={12} />
              </a>
            </div>
            <div className="divide-y" style={{ borderColor: 'hsl(222,15%,18%)' }}>
              {pending_approvals.length === 0 && (
                <div className="px-5 py-8 text-center">
                  <CheckCircle2 size={24} style={{ color: '#00E5A0', margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 13, color: 'hsl(215,15%,50%)' }}>All clear — no pending approvals</p>
                </div>
              )}
              {pending_approvals.slice(0, 5).map((item) => {
                const riskColors: Record<string, string> = { low: '#00E5A0', medium: '#F5A623', high: '#FF4757', critical: '#FF4757' }
                const rc = riskColors[item.risk_level] ?? '#F5A623'
                return (
                  <a key={item.id} href="/governance" style={{ display: 'block', padding: '12px 20px', textDecoration: 'none' }}
                    className="hover:bg-[hsl(222,15%,13%)] transition-colors">
                    <div className="flex items-start gap-3">
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: rc, marginTop: 6, flexShrink: 0 }} />
                      <div className="min-w-0 flex-1">
                        <div style={{ fontSize: 12, fontWeight: 500, color: 'hsl(210,20%,84%)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: rc, background: `${rc}15`, border: `1px solid ${rc}25`, padding: '1px 5px', borderRadius: 3, textTransform: 'uppercase' }}>
                            {item.risk_level}
                          </span>
                          <span style={{ fontSize: 10, color: 'hsl(215,15%,42%)', fontFamily: 'IBM Plex Mono, monospace' }}>
                            {item.approval_type.replace(/_/g, ' ')} · {timeAgo(item.created_at)}
                          </span>
                        </div>
                      </div>
                      <ArrowUpRight size={13} style={{ color: 'hsl(215,15%,42%)', flexShrink: 0, marginTop: 2 }} />
                    </div>
                  </a>
                )
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
