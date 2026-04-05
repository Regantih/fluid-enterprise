'use client'

import { useEffect, useState } from 'react'
import { ScrollText, RefreshCw, Filter } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { timeAgo } from '@/lib/utils'

interface LogEntry {
  id: string; actor: string; action: string; resource_type: string
  resource_id: string | null; details: string | null
  severity: string; created_at: string; capability_id: string | null
}

const SEV_COLORS: Record<string, string> = {
  info: '#00D4FF', warning: '#F5A623', error: '#FF4757', critical: '#FF4757',
}

export default function ActivityPage() {
  const [log, setLog] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetch('/api/activity-log?limit=200').then(r => r.json()).then(d => {
      setLog(d.log ?? [])
      setLoading(false)
    })
  }, [])

  const displayed = filter ? log.filter(e => e.severity === filter || e.action.includes(filter.toUpperCase())) : log

  return (
    <div style={{ minHeight: '100vh' }}>
      <PageHeader
        title="Activity Log"
        subtitle="Immutable audit trail — all capability, governance, and system events"
        badge={{ label: `${log.length} entries`, color: 'blue' }}
        actions={
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => fetch('/api/activity-log?limit=200').then(r => r.json()).then(d => setLog(d.log ?? []))}>
            <RefreshCw size={13} /> Refresh
          </button>
        }
      />

      {/* Severity filter */}
      <div className="flex items-center gap-2 px-8 py-3 border-b" style={{ borderColor: 'hsl(222,15%,18%)', background: 'hsl(222,20%,7.5%)' }}>
        {['', 'info', 'warning', 'error', 'critical'].map(s => (
          <button key={s || 'all'} onClick={() => setFilter(s)} style={{
            padding: '4px 12px', borderRadius: 5, fontSize: 11,
            fontFamily: 'IBM Plex Mono, monospace', cursor: 'pointer',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            border: filter === s ? `1px solid ${SEV_COLORS[s] ?? 'rgba(0,212,255,0.3)'}` : '1px solid hsl(222,15%,22%)',
            background: filter === s ? `${SEV_COLORS[s] ?? 'rgba(0,212,255,0.08)'}18` : 'hsl(222,15%,14%)',
            color: filter === s ? (SEV_COLORS[s] ?? '#00D4FF') : 'hsl(215,15%,50%)',
          }}>
            {s || 'All'}
          </button>
        ))}
        <span style={{ marginLeft: 8, fontSize: 11, color: 'hsl(215,15%,42%)', fontFamily: 'IBM Plex Mono, monospace' }}>
          {displayed.length} events
        </span>
      </div>

      <div className="p-8">
        <div className="fluid-card" style={{ padding: 0 }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="status-dot running" style={{ width: 8, height: 8 }} />
                <span style={{ marginLeft: 8, fontSize: 12, color: 'hsl(215,15%,50%)' }}>Loading audit trail...</span>
              </div>
            ) : displayed.map((entry, i) => {
              const details = entry.details ? (() => { try { return JSON.parse(entry.details!) } catch { return {} } })() : {}
              const sevColor = SEV_COLORS[entry.severity] ?? '#00D4FF'
              return (
                <div key={entry.id} style={{
                  display: 'grid', gridTemplateColumns: '140px 80px 1fr 1fr auto',
                  alignItems: 'start', gap: 16, padding: '11px 20px',
                  borderBottom: i < displayed.length - 1 ? '1px solid hsl(222,15%,14%)' : 'none',
                  transition: 'background 0.1s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'hsl(222,15%,11%)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: 10, color: 'hsl(215,15%,40%)', whiteSpace: 'nowrap' }}>
                    {timeAgo(entry.created_at)}
                  </span>
                  <span style={{
                    fontSize: 9, color: sevColor,
                    background: `${sevColor}12`, border: `1px solid ${sevColor}25`,
                    padding: '1px 5px', borderRadius: 3, textTransform: 'uppercase',
                    letterSpacing: '0.05em', alignSelf: 'center',
                  }}>
                    {entry.severity}
                  </span>
                  <span style={{ fontSize: 11, color: '#00D4FF', background: 'rgba(0,212,255,0.06)', padding: '1px 6px', borderRadius: 3, alignSelf: 'center', letterSpacing: '0.02em' }}>
                    {entry.action.replace(/_/g, '.')}
                  </span>
                  <span style={{ fontSize: 11, color: 'hsl(215,15%,58%)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {details.message ?? `${entry.resource_type}:${entry.resource_id ?? ''}`}
                  </span>
                  <span style={{ fontSize: 10, color: 'hsl(215,15%,38%)', whiteSpace: 'nowrap', textAlign: 'right' }}>
                    {entry.actor}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
