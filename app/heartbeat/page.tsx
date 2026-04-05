'use client'

import { useEffect, useState } from 'react'
import { Activity, Heart, AlertTriangle, CheckCircle2, Clock, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { formatCents, timeAgo, formatTokens } from '@/lib/utils'

interface Capability {
  id: string; name: string; domain: string; status: string
  last_heartbeat: string | null; tasks_completed: number
  tasks_failed: number; token_usage_month: number
  spent_monthly_cents: number; budget_monthly_cents: number
  agent_type: string; sla_target_ms: number
}

const DOMAIN_COLORS: Record<string, string> = {
  Finance: '#00D4FF', 'Supply Chain': '#F5A623',
  Revenue: '#00E5A0', HR: '#8B5CF6', Operations: '#FF4757',
}

function HeartbeatPulse({ status }: { status: string }) {
  const active = status === 'active' || status === 'scaling'
  const color = status === 'error' ? '#FF4757' : status === 'scaling' ? '#F5A623' : status === 'active' ? '#00E5A0' : 'hsl(215,15%,40%)'
  return (
    <svg width="80" height="28" viewBox="0 0 80 28">
      {active ? (
        <polyline
          points="0,14 10,14 16,4 22,24 28,4 34,24 40,14 50,14 56,8 62,20 68,14 80,14"
          fill="none" stroke={color} strokeWidth="1.5" opacity="0.8"
        />
      ) : (
        <line x1="0" y1="14" x2="80" y2="14" stroke={color} strokeWidth="1.5" opacity="0.4" />
      )}
    </svg>
  )
}

export default function HeartbeatPage() {
  const [caps, setCaps] = useState<Capability[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  async function load() {
    const res = await fetch('/api/capabilities')
    const json = await res.json()
    setCaps(json.capabilities ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const refresh = setInterval(() => { load(); setTick(t => t + 1) }, 5000)
    return () => clearInterval(refresh)
  }, [])

  const active = caps.filter(c => c.status === 'active' || c.status === 'scaling')
  const errored = caps.filter(c => c.status === 'error')
  const dormant = caps.filter(c => c.status === 'dormant' || c.status === 'paused')

  return (
    <div style={{ minHeight: '100vh' }}>
      <PageHeader
        title="Heartbeat Monitor"
        subtitle="Live agent execution status across all active capabilities"
        badge={{ label: 'LIVE · 5s refresh', color: 'green' }}
        actions={
          <button className="btn btn-ghost" onClick={load} style={{ fontSize: 12 }}>
            <RefreshCw size={13} /> Refresh
          </button>
        }
      />

      {/* Summary strip */}
      <div className="grid border-b" style={{ gridTemplateColumns: 'repeat(4,1fr)', borderColor: 'hsl(222,15%,18%)', background: 'hsl(222,20%,7.5%)' }}>
        {[
          { label: 'Active Agents', value: active.length, color: '#00E5A0' },
          { label: 'In Error', value: errored.length, color: errored.length > 0 ? '#FF4757' : 'hsl(215,15%,50%)' },
          { label: 'Dormant', value: dormant.length, color: 'hsl(215,15%,50%)' },
          { label: 'Last Refresh', value: new Date().toLocaleTimeString(), color: 'hsl(210,20%,65%)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ padding: '16px 24px', borderRight: '1px solid hsl(222,15%,18%)' }}>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em', color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 11, color: 'hsl(215,15%,48%)', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      <div className="p-8">
        <div className="grid gap-4 stagger" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))' }}>
          {caps.map(cap => {
            const domainColor = DOMAIN_COLORS[cap.domain] ?? '#8B5CF6'
            const hbAge = cap.last_heartbeat ? (Date.now() - new Date(cap.last_heartbeat).getTime()) / 1000 : Infinity
            const hbStatus = hbAge < 60 ? 'ok' : hbAge < 300 ? 'stale' : 'missing'
            const hbColor = hbStatus === 'ok' ? '#00E5A0' : hbStatus === 'stale' ? '#F5A623' : '#FF4757'

            return (
              <div key={cap.id} className="fluid-card animate-fade-up p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'hsl(210,20%,90%)' }}>{cap.name}</div>
                    <div style={{ fontSize: 11, color: domainColor, fontFamily: 'IBM Plex Mono, monospace', marginTop: 2 }}>{cap.domain}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`status-dot ${cap.status}`} />
                    <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', textTransform: 'capitalize', color: 'hsl(210,20%,65%)' }}>
                      {cap.status}
                    </span>
                  </div>
                </div>

                {/* Heartbeat visualization */}
                <div style={{ background: 'hsl(222,20%,9%)', borderRadius: 6, padding: '8px 12px', marginBottom: 12 }}>
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ fontSize: 10, color: 'hsl(215,15%,42%)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase' }}>Heartbeat</span>
                    <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: hbColor }}>{timeAgo(cap.last_heartbeat)}</span>
                  </div>
                  <HeartbeatPulse status={cap.status} />
                </div>

                {/* Metrics */}
                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
                  {[
                    { label: 'Completed', value: cap.tasks_completed.toLocaleString(), color: '#00E5A0' },
                    { label: 'Tokens', value: formatTokens(cap.token_usage_month), color: '#8B5CF6' },
                    { label: 'SLA', value: `${cap.sla_target_ms}ms`, color: 'hsl(215,15%,50%)' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: 'hsl(222,15%,13%)', borderRadius: 5, padding: '7px 10px' }}>
                      <div style={{ fontSize: 9, color: 'hsl(215,15%,42%)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color, fontFamily: 'IBM Plex Mono, monospace' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
