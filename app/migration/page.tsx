'use client'

import { useEffect, useState } from 'react'
import { ArrowRightLeft, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { formatCents } from '@/lib/utils'

interface Mapping {
  id: string; legacy_module: string; legacy_transaction: string | null
  legacy_users: number; migration_status: string; migration_pct: number
  complexity: string; estimated_savings_cents: number; actual_savings_cents: number
  target_date: string | null; notes: string | null
  capability: { name: string; domain: string; status: string } | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  legacy:   { label: 'Legacy', color: 'hsl(215,15%,50%)', bg: 'hsl(222,15%,14%)' },
  analysis: { label: 'Analysis', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  parallel: { label: 'Parallel Run', color: '#F5A623', bg: 'rgba(245,166,35,0.1)' },
  cutover:  { label: 'Cutover', color: '#00D4FF', bg: 'rgba(0,212,255,0.1)' },
  migrated: { label: 'Migrated ✓', color: '#00E5A0', bg: 'rgba(0,229,160,0.1)' },
}
const COMPLEXITY: Record<string, string> = {
  low: '#00E5A0', medium: '#F5A623', high: '#FF4757', critical: '#FF4757',
}

export default function MigrationPage() {
  const [mappings, setMappings] = useState<Mapping[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/migration').then(r => r.json()).then(d => {
      setMappings(d.mappings ?? [])
      setLoading(false)
    })
  }, [])

  const totalEstSavings = mappings.reduce((s, m) => s + m.estimated_savings_cents, 0)
  const totalActSavings = mappings.reduce((s, m) => s + m.actual_savings_cents, 0)
  const migrated = mappings.filter(m => m.migration_status === 'migrated').length
  const inProgress = mappings.filter(m => ['analysis','parallel','cutover'].includes(m.migration_status)).length

  const statusOrder = ['legacy', 'analysis', 'parallel', 'cutover', 'migrated']
  const sorted = [...mappings].sort((a, b) => statusOrder.indexOf(b.migration_status) - statusOrder.indexOf(a.migration_status))

  return (
    <div style={{ minHeight: '100vh' }}>
      <PageHeader
        title="Migration Planner"
        subtitle="SAP S/4HANA → Fluid Enterprise · Module-by-module transition tracker"
        badge={{ label: `${migrated} migrated · ${inProgress} in progress`, color: 'amber' }}
      />

      {/* Stats */}
      <div className="grid border-b" style={{ gridTemplateColumns: 'repeat(5,1fr)', borderColor: 'hsl(222,15%,18%)', background: 'hsl(222,20%,7.5%)' }}>
        {[
          { label: 'Total Modules', value: mappings.length, color: 'hsl(210,20%,70%)' },
          { label: 'Migrated', value: migrated, color: '#00E5A0' },
          { label: 'In Progress', value: inProgress, color: '#F5A623' },
          { label: 'Est. Annual Savings', value: formatCents(totalEstSavings), color: '#00D4FF' },
          { label: 'Realized Savings', value: formatCents(totalActSavings), color: '#00E5A0' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ padding: '16px 24px', borderRight: '1px solid hsl(222,15%,18%)' }}>
            <div style={{ fontSize: value.toString().length > 8 ? 16 : 22, fontWeight: 700, letterSpacing: '-0.04em', color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 11, color: 'hsl(215,15%,48%)', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      <div className="p-8">
        {/* Progress swimlanes */}
        <div className="fluid-card mb-6" style={{ padding: '20px 24px' }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'hsl(215,15%,60%)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Migration Pipeline
          </h3>
          <div className="flex items-center gap-2">
            {statusOrder.map((s, i) => {
              const count = mappings.filter(m => m.migration_status === s).length
              const cfg = STATUS_CONFIG[s]
              return (
                <div key={s} className="flex-1" style={{ position: 'relative' }}>
                  <div style={{
                    padding: '10px 12px', borderRadius: 6,
                    background: cfg.bg,
                    border: `1px solid ${cfg.color}30`,
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: cfg.color, lineHeight: 1 }}>{count}</div>
                    <div style={{ fontSize: 10, color: cfg.color, fontFamily: 'IBM Plex Mono, monospace', marginTop: 3, opacity: 0.8 }}>{cfg.label.toUpperCase()}</div>
                  </div>
                  {i < statusOrder.length - 1 && (
                    <div style={{ position: 'absolute', right: -12, top: '50%', transform: 'translateY(-50%)', zIndex: 1, color: 'hsl(215,15%,30%)', fontSize: 16 }}>›</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Module table */}
        <div className="fluid-card" style={{ padding: 0 }}>
          <table className="fluid-table">
            <thead>
              <tr>
                <th>SAP Module</th><th>Fluid Capability</th><th>Status</th>
                <th>Progress</th><th>Users</th><th>Complexity</th>
                <th>Est. Savings</th><th>Target Date</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(m => {
                const cfg = STATUS_CONFIG[m.migration_status] ?? STATUS_CONFIG.legacy
                return (
                  <tr key={m.id}>
                    <td>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'hsl(210,20%,80%)' }}>{m.legacy_module}</div>
                      {m.legacy_transaction && (
                        <div style={{ fontSize: 10, color: 'hsl(215,15%,42%)', fontFamily: 'IBM Plex Mono, monospace', marginTop: 2 }}>{m.legacy_transaction}</div>
                      )}
                    </td>
                    <td>
                      {m.capability ? (
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 500, color: '#00D4FF' }}>{m.capability.name}</div>
                          <div style={{ fontSize: 10, color: 'hsl(215,15%,45%)', fontFamily: 'IBM Plex Mono, monospace', marginTop: 1 }}>{m.capability.status}</div>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: 'hsl(215,15%,38%)', fontFamily: 'IBM Plex Mono, monospace' }}>— unmapped</span>
                      )}
                    </td>
                    <td>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30`, fontFamily: 'IBM Plex Mono, monospace' }}>
                        {cfg.label}
                      </span>
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <div className="flex items-center gap-2">
                        <div style={{ flex: 1, height: 4, background: 'hsl(222,15%,18%)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${m.migration_pct}%`, height: '100%', background: cfg.color, borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: cfg.color, minWidth: 28, textAlign: 'right' }}>{m.migration_pct}%</span>
                      </div>
                    </td>
                    <td><span style={{ fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', color: 'hsl(210,20%,70%)' }}>{m.legacy_users}</span></td>
                    <td>
                      <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: COMPLEXITY[m.complexity] ?? 'hsl(215,15%,50%)', textTransform: 'uppercase' }}>
                        {m.complexity}
                      </span>
                    </td>
                    <td><span style={{ fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', color: 'hsl(210,20%,65%)' }}>{formatCents(m.estimated_savings_cents)}</span></td>
                    <td><span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: 'hsl(215,15%,45%)' }}>{m.target_date ?? '—'}</span></td>
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
