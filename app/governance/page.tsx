'use client'

import { useEffect, useState } from 'react'
import {
  Shield, CheckCircle2, XCircle, Clock, AlertTriangle,
  ChevronDown, Filter, RefreshCw, AlertOctagon, Info,
  ArrowRight, Zap, DollarSign, Scale, TrendingUp, Power,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { timeAgo } from '@/lib/utils'

interface Approval {
  id: string
  company_id: string
  capability_id: string | null
  task_id: string | null
  approval_type: string
  title: string
  description: string
  requested_by: string
  status: string
  risk_level: string
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  expires_at: string | null
  created_at: string
}

const RISK_CONFIG: Record<string, { color: string; label: string; icon: any; glow: string }> = {
  low: { color: '#00E5A0', label: 'LOW', icon: Info, glow: '0 0 16px rgba(0,229,160,0.15)' },
  medium: { color: '#F5A623', label: 'MEDIUM', icon: AlertTriangle, glow: '0 0 16px rgba(245,166,35,0.15)' },
  high: { color: '#FF4757', label: 'HIGH', icon: AlertOctagon, glow: '0 0 16px rgba(255,71,87,0.15)' },
  critical: { color: '#FF4757', label: 'CRITICAL', icon: AlertOctagon, glow: '0 0 20px rgba(255,71,87,0.25)' },
}

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  budget_override: { label: 'Budget Override', icon: DollarSign, color: '#F5A623' },
  capability_activation: { label: 'Capability Activation', icon: Power, color: '#00D4FF' },
  emergency_pause: { label: 'Emergency Pause', icon: AlertOctagon, color: '#FF4757' },
  scale_up: { label: 'Scale Up', icon: TrendingUp, color: '#00E5A0' },
  model_upgrade: { label: 'Model Upgrade', icon: Zap, color: '#8B5CF6' },
}

function RejectionModal({ onConfirm, onCancel }: { onConfirm: (reason: string) => void; onCancel: () => void }) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="fluid-card p-6 animate-fade-up" style={{ width: 440 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Reject Approval Request</h3>
        <p style={{ fontSize: 13, color: 'hsl(215,15%,52%)', marginBottom: 16 }}>Provide a reason for rejection (required for audit trail)</p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
          placeholder="e.g. False positive confirmed, insufficient risk analysis, policy violation..."
          style={{ marginBottom: 16 }}
        />
        <div className="flex gap-3 justify-end">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button
            className="btn btn-danger"
            onClick={() => reason.trim() && onConfirm(reason)}
            style={{ opacity: reason.trim() ? 1 : 0.5 }}
          >
            <XCircle size={14} /> Reject
          </button>
        </div>
      </div>
    </div>
  )
}

function ApprovalCard({ item, onApprove, onReject }: {
  item: Approval
  onApprove: (id: string) => void
  onReject: (id: string) => void
}) {
  const risk = RISK_CONFIG[item.risk_level] ?? RISK_CONFIG.medium
  const type = TYPE_CONFIG[item.approval_type] ?? { label: item.approval_type, icon: Shield, color: '#00D4FF' }
  const RiskIcon = risk.icon
  const TypeIcon = type.icon
  const isPending = item.status === 'pending'

  const isExpiringSoon = item.expires_at && new Date(item.expires_at) > new Date()
    && (new Date(item.expires_at).getTime() - Date.now()) < 6 * 3600 * 1000

  const isExpired = item.expires_at && new Date(item.expires_at) < new Date()

  return (
    <div
      className="fluid-card animate-fade-up"
      style={{
        border: isPending ? `1px solid ${risk.color}22` : '1px solid hsl(222,15%,18%)',
        boxShadow: isPending ? risk.glow : 'none',
      }}
    >
      {/* Top strip for risk level */}
      {isPending && (
        <div style={{
          height: 3,
          background: `linear-gradient(90deg, ${risk.color}60, ${risk.color}20, transparent)`,
          borderRadius: '6px 6px 0 0',
        }} />
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          {/* Type icon */}
          <div style={{
            width: 40, height: 40, borderRadius: 8, flexShrink: 0,
            background: `${type.color}12`,
            border: `1px solid ${type.color}25`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TypeIcon size={18} style={{ color: type.color }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <h3 style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.02em', color: 'hsl(210,20%,92%)', lineHeight: 1.3 }}>
                {item.title}
              </h3>
              {/* Risk badge */}
              <div className="flex items-center gap-1.5 shrink-0" style={{
                padding: '3px 8px',
                borderRadius: 4,
                background: `${risk.color}12`,
                border: `1px solid ${risk.color}25`,
              }}>
                <RiskIcon size={10} style={{ color: risk.color }} />
                <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: risk.color, fontWeight: 600, letterSpacing: '0.06em' }}>
                  {risk.label}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-1.5">
              <span style={{
                fontSize: 10, fontFamily: 'IBM Plex Mono, monospace',
                color: type.color, background: `${type.color}10`,
                border: `1px solid ${type.color}20`,
                padding: '1px 6px', borderRadius: 3,
              }}>
                {type.label.toUpperCase()}
              </span>
              <span style={{ fontSize: 11, color: 'hsl(215,15%,45%)', fontFamily: 'IBM Plex Mono, monospace' }}>
                {item.requested_by}
              </span>
              <span style={{ fontSize: 11, color: 'hsl(215,15%,42%)', fontFamily: 'IBM Plex Mono, monospace' }}>
                {timeAgo(item.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p style={{ fontSize: 13, color: 'hsl(215,15%,58%)', lineHeight: 1.6, marginBottom: 16 }}>
          {item.description}
        </p>

        {/* Expiry warning */}
        {isExpiringSoon && isPending && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 6, marginBottom: 14,
            background: 'rgba(255,71,87,0.08)',
            border: '1px solid rgba(255,71,87,0.2)',
          }}>
            <Clock size={13} style={{ color: '#FF4757' }} />
            <span style={{ fontSize: 12, color: '#FF4757' }}>
              Expires {timeAgo(item.expires_at!)} — action required
            </span>
          </div>
        )}

        {/* Status footer */}
        <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'hsl(222,15%,18%)' }}>
          {isPending ? (
            <>
              <div style={{ fontSize: 11, color: 'hsl(215,15%,42%)', fontFamily: 'IBM Plex Mono, monospace' }}>
                {item.expires_at ? `Expires: ${new Date(item.expires_at).toLocaleDateString()}` : 'No expiry'}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="btn btn-danger"
                  style={{ padding: '6px 14px', fontSize: 12 }}
                  onClick={() => onReject(item.id)}
                >
                  <XCircle size={13} /> Reject
                </button>
                <button
                  className="btn btn-primary"
                  style={{ padding: '6px 14px', fontSize: 12 }}
                  onClick={() => onApprove(item.id)}
                >
                  <CheckCircle2 size={13} /> Approve
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 w-full">
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '3px 10px', borderRadius: 4,
                background: item.status === 'approved' ? 'rgba(0,229,160,0.08)' : 'rgba(255,71,87,0.08)',
                border: `1px solid ${item.status === 'approved' ? 'rgba(0,229,160,0.2)' : 'rgba(255,71,87,0.2)'}`,
              }}>
                {item.status === 'approved'
                  ? <CheckCircle2 size={12} style={{ color: '#00E5A0' }} />
                  : <XCircle size={12} style={{ color: '#FF4757' }} />
                }
                <span style={{
                  fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase',
                  color: item.status === 'approved' ? '#00E5A0' : '#FF4757',
                }}>
                  {item.status}
                </span>
              </div>
              {item.approved_by && (
                <span style={{ fontSize: 11, color: 'hsl(215,15%,45%)', fontFamily: 'IBM Plex Mono, monospace' }}>
                  by {item.approved_by} · {timeAgo(item.approved_at!)}
                </span>
              )}
              {item.rejection_reason && (
                <span style={{ fontSize: 12, color: 'hsl(215,15%,55%)', fontStyle: 'italic', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  "{item.rejection_reason}"
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function GovernancePage() {
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pending' | 'all'>('pending')
  const [rejectingId, setRejectingId] = useState<string | null>(null)

  async function load() {
    const res = await fetch('/api/governance')
    const json = await res.json()
    setApprovals(json.approvals ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleApprove(id: string) {
    await fetch(`/api/governance/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', approved_by: 'hemanth.reganti@acme.com' }),
    })
    await load()
  }

  async function handleReject(id: string, reason: string) {
    await fetch(`/api/governance/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', approved_by: 'hemanth.reganti@acme.com', reason }),
    })
    setRejectingId(null)
    await load()
  }

  const pending = approvals.filter(a => a.status === 'pending')
  const resolved = approvals.filter(a => a.status !== 'pending')
  const displayed = tab === 'pending' ? pending : approvals

  const criticalCount = pending.filter(a => a.risk_level === 'critical' || a.risk_level === 'high').length

  return (
    <div style={{ minHeight: '100vh' }}>
      {rejectingId && (
        <RejectionModal
          onConfirm={(reason) => handleReject(rejectingId, reason)}
          onCancel={() => setRejectingId(null)}
        />
      )}

      <PageHeader
        title="Governance Board"
        subtitle="Human-in-the-loop approvals, budget controls, and capability oversight"
        badge={pending.length > 0 ? { label: `${pending.length} pending`, color: 'amber' } : { label: 'All clear', color: 'green' }}
        actions={
          <button className="btn btn-ghost" onClick={load} style={{ fontSize: 12 }}>
            <RefreshCw size={13} /> Refresh
          </button>
        }
      />

      {/* Risk summary strip */}
      {criticalCount > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 32px',
          background: 'rgba(255,71,87,0.06)',
          borderBottom: '1px solid rgba(255,71,87,0.15)',
        }}>
          <AlertOctagon size={15} style={{ color: '#FF4757' }} />
          <span style={{ fontSize: 13, color: '#FF4757', fontWeight: 500 }}>
            {criticalCount} high-risk item{criticalCount > 1 ? 's' : ''} require immediate board review
          </span>
          <ArrowRight size={13} style={{ color: '#FF4757' }} />
        </div>
      )}

      {/* Stats row */}
      <div className="grid border-b" style={{ gridTemplateColumns: 'repeat(5, 1fr)', borderColor: 'hsl(222,15%,18%)', background: 'hsl(222,20%,7.5%)' }}>
        {[
          { label: 'Pending', value: pending.length, color: pending.length > 0 ? '#F5A623' : 'hsl(215,15%,55%)' },
          { label: 'High / Critical', value: criticalCount, color: criticalCount > 0 ? '#FF4757' : 'hsl(215,15%,55%)' },
          { label: 'Approved (all)', value: approvals.filter(a => a.status === 'approved').length, color: '#00E5A0' },
          { label: 'Rejected (all)', value: approvals.filter(a => a.status === 'rejected').length, color: 'hsl(215,15%,55%)' },
          { label: 'Total Requests', value: approvals.length, color: 'hsl(210,20%,70%)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ padding: '16px 24px', borderRight: '1px solid hsl(222,15%,18%)' }}>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em', color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 11, color: 'hsl(215,15%,48%)', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-8 pt-6 pb-2">
        {(['pending', 'all'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              border: tab === t ? '1px solid rgba(0,212,255,0.2)' : '1px solid transparent',
              background: tab === t ? 'rgba(0,212,255,0.07)' : 'transparent',
              color: tab === t ? '#00D4FF' : 'hsl(215,15%,52%)',
              transition: 'all 0.15s',
            }}
          >
            {t === 'pending' ? `Pending (${pending.length})` : `All Requests (${approvals.length})`}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="p-8 pt-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="status-dot scaling" style={{ width: 10, height: 10 }} />
            <span style={{ marginLeft: 8, fontSize: 13, color: 'hsl(215,15%,50%)', fontFamily: 'IBM Plex Mono, monospace' }}>Loading board...</span>
          </div>
        ) : displayed.length === 0 ? (
          <div className="fluid-card" style={{ padding: '60px 40px', textAlign: 'center' }}>
            <CheckCircle2 size={32} style={{ color: '#00E5A0', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'hsl(210,20%,70%)', marginBottom: 8 }}>
              {tab === 'pending' ? 'No pending approvals' : 'No governance requests yet'}
            </h3>
            <p style={{ fontSize: 13, color: 'hsl(215,15%,45%)' }}>
              {tab === 'pending' ? 'The board is clear — all requests have been resolved' : 'Approval requests from capabilities will appear here'}
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gap: 16,
              gridTemplateColumns: tab === 'pending'
                ? 'repeat(auto-fill, minmax(520px, 1fr))'
                : 'repeat(auto-fill, minmax(480px, 1fr))',
            }}
            className="stagger"
          >
            {displayed
              .sort((a, b) => {
                // Sort: critical first, then high, then by date
                const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 }
                const ra = riskOrder[a.risk_level as keyof typeof riskOrder] ?? 4
                const rb = riskOrder[b.risk_level as keyof typeof riskOrder] ?? 4
                if (ra !== rb) return ra - rb
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              })
              .map(item => (
                <ApprovalCard
                  key={item.id}
                  item={item}
                  onApprove={handleApprove}
                  onReject={setRejectingId}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
