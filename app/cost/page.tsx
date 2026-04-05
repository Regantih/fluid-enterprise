'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Cell } from 'recharts'
import { DollarSign, AlertTriangle, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { formatCents, getBudgetStatus } from '@/lib/utils'

interface CostData {
  by_capability: {
    capability_id: string; capability_name: string; domain: string
    budget_monthly_cents: number; spent_monthly_cents: number
    token_usage: number; pct_used: number; by_type: Record<string, number>
  }[]
  trend: { date: string; amount: number }[]
  month: string
}

const DOMAIN_COLORS: Record<string, string> = {
  Finance: '#00D4FF', 'Supply Chain': '#F5A623', Revenue: '#00E5A0', HR: '#8B5CF6', Operations: '#FF4757',
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'hsl(222,18%,12%)', border: '1px solid hsl(222,15%,20%)', borderRadius: 6, padding: '8px 12px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11 }}>
      <div style={{ color: 'hsl(215,15%,52%)', marginBottom: 4 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color ?? '#00D4FF' }}>{p.name}: ${p.value?.toLocaleString()}</div>
      ))}
    </div>
  )
}

export default function CostPage() {
  const [data, setData] = useState<CostData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/cost-events').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading || !data) return (
    <div style={{ minHeight: '100vh' }}>
      <PageHeader title="Cost Dashboard" subtitle="Monthly AI spend tracking across all capabilities" />
      <div className="flex items-center justify-center py-20">
        <div className="status-dot scaling" style={{ width: 10, height: 10 }} />
        <span style={{ marginLeft: 8, fontSize: 13, color: 'hsl(215,15%,50%)', fontFamily: 'IBM Plex Mono, monospace' }}>Loading cost data...</span>
      </div>
    </div>
  )

  const totalBudget = data.by_capability.reduce((s, c) => s + c.budget_monthly_cents, 0)
  const totalSpent = data.by_capability.reduce((s, c) => s + c.spent_monthly_cents, 0)
  const overBudget = data.by_capability.filter(c => c.pct_used >= 100).length
  const atRisk = data.by_capability.filter(c => c.pct_used >= 80 && c.pct_used < 100).length

  const barData = data.by_capability
    .filter(c => c.budget_monthly_cents > 0)
    .sort((a, b) => b.spent_monthly_cents - a.spent_monthly_cents)
    .map(c => ({
      name: c.capability_name.split(' ').slice(0, 2).join(' '),
      budget: Math.round(c.budget_monthly_cents / 100),
      spent: Math.round(c.spent_monthly_cents / 100),
      domain: c.domain,
      pct: c.pct_used,
    }))

  return (
    <div style={{ minHeight: '100vh' }}>
      <PageHeader
        title="Cost Dashboard"
        subtitle={`${data.month} · AI inference, tool calls, and storage costs`}
        badge={{ label: overBudget > 0 ? `${overBudget} over budget` : `${atRisk} at risk`, color: overBudget > 0 ? 'red' : atRisk > 0 ? 'amber' : 'green' }}
      />

      {/* Stats */}
      <div className="grid border-b" style={{ gridTemplateColumns: 'repeat(4,1fr)', borderColor: 'hsl(222,15%,18%)', background: 'hsl(222,20%,7.5%)' }}>
        {[
          { label: 'Total Budget', value: formatCents(totalBudget), color: 'hsl(210,20%,70%)' },
          { label: 'Total Spent', value: formatCents(totalSpent), color: Math.round(totalSpent/totalBudget*100) >= 80 ? '#F5A623' : '#00E5A0' },
          { label: 'Over Budget', value: overBudget, color: overBudget > 0 ? '#FF4757' : 'hsl(215,15%,50%)' },
          { label: 'At Risk (>80%)', value: atRisk, color: atRisk > 0 ? '#F5A623' : 'hsl(215,15%,50%)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ padding: '16px 24px', borderRight: '1px solid hsl(222,15%,18%)' }}>
            <div style={{ fontSize: typeof value === 'string' ? 18 : 22, fontWeight: 700, letterSpacing: '-0.04em', color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 11, color: 'hsl(215,15%,48%)', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      <div className="p-8 space-y-6">
        {/* Charts row */}
        <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {/* Spend trend */}
          <div className="fluid-card p-6">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Daily Spend Trend</h3>
            <p style={{ fontSize: 12, color: 'hsl(215,15%,50%)', marginBottom: 20 }}>30-day cumulative across all capabilities</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.trend}>
                <defs>
                  <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F5A623" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#F5A623" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,15%,16%)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fontFamily: 'IBM Plex Mono, monospace', fill: 'hsl(215,15%,40%)' }} axisLine={false} tickLine={false} interval={5} />
                <YAxis tick={{ fontSize: 9, fontFamily: 'IBM Plex Mono, monospace', fill: 'hsl(215,15%,40%)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} width={35} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="amount" name="Spend" stroke="#F5A623" strokeWidth={2} fill="url(#costGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Budget vs Spent */}
          <div className="fluid-card p-6">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Budget vs Spend by Capability</h3>
            <p style={{ fontSize: 12, color: 'hsl(215,15%,50%)', marginBottom: 20 }}>Monthly allocation utilization</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,15%,16%)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fontFamily: 'IBM Plex Mono, monospace', fill: 'hsl(215,15%,40%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fontFamily: 'IBM Plex Mono, monospace', fill: 'hsl(215,15%,40%)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} width={35} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="budget" name="Budget" fill="hsl(222,15%,22%)" radius={[2,2,0,0]} />
                <Bar dataKey="spent" name="Spent" radius={[2,2,0,0]}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.pct >= 100 ? '#FF4757' : entry.pct >= 80 ? '#F5A623' : '#00E5A0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budget utilization table */}
        <div className="fluid-card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid hsl(222,15%,18%)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>Budget Utilization Detail</h3>
          </div>
          <table className="fluid-table">
            <thead>
              <tr>
                <th>Capability</th><th>Domain</th><th>Spent</th><th>Budget</th><th>Utilization</th><th>Alert</th>
              </tr>
            </thead>
            <tbody>
              {data.by_capability.sort((a, b) => b.pct_used - a.pct_used).map(c => {
                const bStatus = getBudgetStatus(c.pct_used)
                const color = bStatus === 'critical' ? '#FF4757' : bStatus === 'warning' ? '#F5A623' : '#00E5A0'
                return (
                  <tr key={c.capability_id}>
                    <td style={{ fontWeight: 500, color: 'hsl(210,20%,85%)' }}>{c.capability_name}</td>
                    <td><span style={{ fontSize: 10, color: DOMAIN_COLORS[c.domain], fontFamily: 'IBM Plex Mono, monospace' }}>{c.domain}</span></td>
                    <td><span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>{formatCents(c.spent_monthly_cents)}</span></td>
                    <td><span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: 'hsl(215,15%,50%)' }}>{formatCents(c.budget_monthly_cents)}</span></td>
                    <td style={{ minWidth: 160 }}>
                      <div className="flex items-center gap-2">
                        <div style={{ flex: 1, height: 4, background: 'hsl(222,15%,18%)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(c.pct_used, 100)}%`, height: '100%', background: color, borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color, minWidth: 30 }}>{c.pct_used}%</span>
                      </div>
                    </td>
                    <td>
                      {bStatus !== 'ok' && (
                        <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color, background: `${color}12`, border: `1px solid ${color}25`, padding: '1px 6px', borderRadius: 3 }}>
                          {bStatus === 'critical' ? '⬟ OVER LIMIT' : '▲ AT RISK'}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
