'use client'

import { useEffect, useState } from 'react'
import {
  Plus, Search, Filter, Edit2, Trash2, Power,
  PauseCircle, TrendingUp, ChevronDown, X, Save,
  Zap, Clock, DollarSign, CheckCircle, XCircle, AlertTriangle
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { formatCents, timeAgo, statusBg, getBudgetStatus, formatTokens } from '@/lib/utils'

interface Capability {
  id: string
  name: string
  description: string
  domain: string
  status: string
  agent_type: string
  budget_monthly_cents: number
  spent_monthly_cents: number
  sla_target_ms: number
  last_heartbeat: string | null
  token_usage_month: number
  tasks_completed: number
  tasks_failed: number
  created_at: string
}

const DOMAINS = ['Finance', 'Supply Chain', 'Revenue', 'HR', 'Operations']
const AGENT_TYPES = ['autonomous', 'supervised', 'hybrid']
const STATUSES = ['dormant', 'active', 'scaling', 'paused', 'error']

const DOMAIN_COLORS: Record<string, string> = {
  Finance: '#00D4FF',
  'Supply Chain': '#F5A623',
  Revenue: '#00E5A0',
  HR: '#8B5CF6',
  Operations: '#FF4757',
}

const STATUS_COLORS: Record<string, string> = {
  active: '#00E5A0',
  scaling: '#F5A623',
  dormant: 'hsl(215,15%,45%)',
  paused: '#F5A623',
  error: '#FF4757',
}

function BudgetBar({ pct, status }: { pct: number; status: string }) {
  const color = status === 'critical' ? '#FF4757' : status === 'warning' ? '#F5A623' : '#00E5A0'
  return (
    <div style={{ height: 3, background: 'hsl(222,15%,18%)', borderRadius: 2, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 2 }} />
    </div>
  )
}

function CapabilityModal({
  cap, onClose, onSave
}: {
  cap: Partial<Capability> | null
  onClose: () => void
  onSave: (data: Partial<Capability>) => void
}) {
  const [form, setForm] = useState<Partial<Capability>>(cap ?? {
    name: '', description: '', domain: 'Finance', status: 'dormant',
    agent_type: 'supervised', budget_monthly_cents: 0, sla_target_ms: 5000,
  })

  const set = (k: keyof Capability, v: any) => setForm(f => ({ ...f, [k]: v }))
  const isEdit = !!cap?.id

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="fluid-card animate-fade-up"
        style={{ width: 560, maxHeight: '90vh', overflowY: 'auto', padding: 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'hsl(222,15%,18%)' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>
              {isEdit ? 'Edit Capability' : 'Register Capability'}
            </h2>
            <p style={{ fontSize: 12, color: 'hsl(215,15%,50%)', marginTop: 2 }}>
              {isEdit ? `Updating: ${cap.name}` : 'Define a new AI-native business capability'}
            </p>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '6px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'hsl(210,20%,72%)', display: 'block', marginBottom: 6 }}>
              Capability Name <span style={{ color: '#FF4757' }}>*</span>
            </label>
            <input
              value={form.name ?? ''}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Procure-to-Pay, Revenue Recognition..."
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'hsl(210,20%,72%)', display: 'block', marginBottom: 6 }}>
              Description
            </label>
            <textarea
              value={form.description ?? ''}
              onChange={e => set('description', e.target.value)}
              rows={3}
              placeholder="What business process does this capability orchestrate?"
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Domain + Agent Type */}
          <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'hsl(210,20%,72%)', display: 'block', marginBottom: 6 }}>
                Domain
              </label>
              <select value={form.domain ?? 'Finance'} onChange={e => set('domain', e.target.value)}>
                {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'hsl(210,20%,72%)', display: 'block', marginBottom: 6 }}>
                Agent Type
              </label>
              <select value={form.agent_type ?? 'supervised'} onChange={e => set('agent_type', e.target.value)}>
                {AGENT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {/* Status */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'hsl(210,20%,72%)', display: 'block', marginBottom: 6 }}>
              Status
            </label>
            <div className="flex gap-2 flex-wrap">
              {STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => set('status', s)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 5,
                    fontSize: 12,
                    fontFamily: 'IBM Plex Mono, monospace',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    border: form.status === s
                      ? `1px solid ${STATUS_COLORS[s]}`
                      : '1px solid hsl(222,15%,22%)',
                    background: form.status === s
                      ? `${STATUS_COLORS[s]}18`
                      : 'hsl(222,15%,14%)',
                    color: form.status === s ? STATUS_COLORS[s] : 'hsl(215,15%,55%)',
                    transition: 'all 0.15s',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Budget + SLA */}
          <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'hsl(210,20%,72%)', display: 'block', marginBottom: 6 }}>
                Monthly Budget ($)
              </label>
              <input
                type="number"
                value={Math.round((form.budget_monthly_cents ?? 0) / 100)}
                onChange={e => set('budget_monthly_cents', parseInt(e.target.value) * 100 || 0)}
                placeholder="5000"
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'hsl(210,20%,72%)', display: 'block', marginBottom: 6 }}>
                SLA Target (ms)
              </label>
              <input
                type="number"
                value={form.sla_target_ms ?? 5000}
                onChange={e => set('sla_target_ms', parseInt(e.target.value) || 5000)}
                placeholder="5000"
              />
            </div>
          </div>

          {/* Agent type info */}
          <div style={{
            padding: '10px 14px',
            background: 'hsl(222,15%,13%)',
            borderRadius: 6,
            border: '1px solid hsl(222,15%,20%)',
          }}>
            <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#00D4FF', marginBottom: 4 }}>
              AGENT TYPE: {(form.agent_type ?? 'supervised').toUpperCase()}
            </div>
            <div style={{ fontSize: 12, color: 'hsl(215,15%,55%)' }}>
              {form.agent_type === 'autonomous' && 'Operates without human approval for routine tasks. Escalates exceptions only. Highest throughput, lowest oversight.'}
              {form.agent_type === 'supervised' && 'All significant actions require human confirmation. Suitable for high-risk financial processes. Recommended for initial deployment.'}
              {form.agent_type === 'hybrid' && 'Autonomous for routine operations, supervised for high-value or exception cases. Configurable thresholds per task type.'}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: 'hsl(222,15%,18%)' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() => onSave(form)}
            disabled={!form.name}
            style={{ opacity: form.name ? 1 : 0.5 }}
          >
            <Save size={14} />
            {isEdit ? 'Save Changes' : 'Register Capability'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CapabilitiesPage() {
  const [caps, setCaps] = useState<Capability[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterDomain, setFilterDomain] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [modalCap, setModalCap] = useState<Partial<Capability> | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function load() {
    const res = await fetch('/api/capabilities')
    const json = await res.json()
    setCaps(json.capabilities ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSave(data: Partial<Capability>) {
    if (data.id) {
      await fetch(`/api/capabilities/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    } else {
      await fetch('/api/capabilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    }
    setModalCap(undefined)
    await load()
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    await fetch(`/api/capabilities/${id}`, { method: 'DELETE' })
    setDeleting(null)
    await load()
  }

  async function handleStatusChange(cap: Capability, newStatus: string) {
    await fetch(`/api/capabilities/${cap.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, _previous: cap.status }),
    })
    await load()
  }

  const filtered = caps.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.domain.toLowerCase().includes(q)
    const matchDomain = !filterDomain || c.domain === filterDomain
    const matchStatus = !filterStatus || c.status === filterStatus
    return matchSearch && matchDomain && matchStatus
  })

  const activeCnt = caps.filter(c => c.status === 'active' || c.status === 'scaling').length
  const totalBudget = caps.reduce((s, c) => s + c.budget_monthly_cents, 0)
  const totalSpent = caps.reduce((s, c) => s + c.spent_monthly_cents, 0)

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Modal */}
      {modalCap !== undefined && (
        <CapabilityModal
          cap={modalCap}
          onClose={() => setModalCap(undefined)}
          onSave={handleSave}
        />
      )}

      <PageHeader
        title="Capability Registry"
        subtitle={`${activeCnt} active · ${caps.length} total · ${formatCents(totalSpent)} of ${formatCents(totalBudget)} spent this month`}
        badge={{ label: `${filtered.length} shown`, color: 'blue' }}
        actions={
          <button className="btn btn-primary" onClick={() => setModalCap(null)}>
            <Plus size={14} />
            Register Capability
          </button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 px-8 py-4 border-b" style={{ borderColor: 'hsl(222,15%,18%)', background: 'hsl(222,20%,7.5%)' }}>
        {/* Search */}
        <div className="flex items-center gap-2 flex-1" style={{ maxWidth: 320, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, color: 'hsl(215,15%,45%)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search capabilities..."
            style={{ paddingLeft: 32 }}
          />
        </div>

        {/* Domain filter */}
        <select
          value={filterDomain}
          onChange={e => setFilterDomain(e.target.value)}
          style={{ width: 'auto', minWidth: 140 }}
        >
          <option value="">All Domains</option>
          {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ width: 'auto', minWidth: 130 }}
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>

        {(search || filterDomain || filterStatus) && (
          <button className="btn btn-ghost" onClick={() => { setSearch(''); setFilterDomain(''); setFilterStatus('') }} style={{ fontSize: 12, padding: '6px 10px' }}>
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* Main content */}
      <div className="p-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="status-dot scaling" style={{ width: 10, height: 10 }} />
            <span style={{ marginLeft: 8, fontSize: 13, color: 'hsl(215,15%,50%)', fontFamily: 'IBM Plex Mono, monospace' }}>Loading registry...</span>
          </div>
        ) : (
          <div className="grid gap-4 stagger" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))' }}>
            {filtered.map((cap) => {
              const pct = cap.budget_monthly_cents > 0
                ? Math.round((cap.spent_monthly_cents / cap.budget_monthly_cents) * 100) : 0
              const bStatus = getBudgetStatus(pct)
              const budgetColor = bStatus === 'critical' ? '#FF4757' : bStatus === 'warning' ? '#F5A623' : '#00E5A0'
              const domainColor = DOMAIN_COLORS[cap.domain] ?? '#8B5CF6'
              const statusColor = STATUS_COLORS[cap.status] ?? 'hsl(215,15%,45%)'

              return (
                <div key={cap.id} className="fluid-card animate-fade-up" style={{ padding: 0 }}>
                  {/* Card header */}
                  <div className="flex items-start justify-between p-5 pb-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Domain indicator */}
                      <div style={{
                        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                        background: `${domainColor}12`,
                        border: `1px solid ${domainColor}25`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Zap size={15} style={{ color: domainColor }} />
                      </div>
                      <div className="min-w-0">
                        <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.02em', color: 'hsl(210,20%,92%)' }}>
                          {cap.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span style={{
                            fontSize: 10, fontFamily: 'IBM Plex Mono, monospace',
                            color: domainColor, background: `${domainColor}12`,
                            border: `1px solid ${domainColor}25`,
                            padding: '1px 6px', borderRadius: 3,
                          }}>{cap.domain}</span>
                          <span style={{
                            fontSize: 10, fontFamily: 'IBM Plex Mono, monospace',
                            color: 'hsl(215,15%,48%)', background: 'hsl(222,15%,14%)',
                            border: '1px solid hsl(222,15%,20%)',
                            padding: '1px 6px', borderRadius: 3, textTransform: 'uppercase',
                          }}>{cap.agent_type}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status + Actions */}
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <div className={`status-dot ${cap.status}`} />
                        <span style={{ fontSize: 11, color: statusColor, textTransform: 'capitalize', fontFamily: 'IBM Plex Mono, monospace' }}>
                          {cap.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div style={{ padding: '0 20px 14px', fontSize: 12.5, color: 'hsl(215,15%,55%)', lineHeight: 1.55 }}>
                    {cap.description}
                  </div>

                  {/* Metrics row */}
                  <div className="grid border-t" style={{ borderColor: 'hsl(222,15%,18%)', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                    {[
                      { label: 'Tasks Done', value: cap.tasks_completed.toLocaleString(), icon: CheckCircle, color: '#00E5A0' },
                      { label: 'Fail Rate', value: `${cap.tasks_failed + cap.tasks_completed > 0 ? Math.round((cap.tasks_failed / (cap.tasks_completed + cap.tasks_failed)) * 100) : 0}%`, icon: XCircle, color: cap.tasks_failed > 5 ? '#FF4757' : 'hsl(215,15%,45%)' },
                      { label: 'Tokens', value: formatTokens(cap.token_usage_month), icon: TrendingUp, color: '#8B5CF6' },
                      { label: 'SLA Target', value: `${cap.sla_target_ms}ms`, icon: Clock, color: 'hsl(215,15%,50%)' },
                    ].map(({ label, value, icon: Icon, color }, i) => (
                      <div key={i} style={{
                        padding: '10px 14px',
                        borderRight: i < 3 ? '1px solid hsl(222,15%,18%)' : 'none',
                      }}>
                        <div style={{ fontSize: 10, color: 'hsl(215,15%,44%)', marginBottom: 3, fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color, fontFamily: 'IBM Plex Mono, monospace' }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Budget bar */}
                  <div style={{ padding: '12px 20px 14px', borderTop: '1px solid hsl(222,15%,18%)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <DollarSign size={12} style={{ color: 'hsl(215,15%,45%)' }} />
                        <span style={{ fontSize: 11, color: 'hsl(215,15%,50%)' }}>Monthly Budget</span>
                        {bStatus !== 'ok' && (
                          <AlertTriangle size={11} style={{ color: budgetColor }} />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', color: budgetColor, fontWeight: 600 }}>
                          {pct}%
                        </span>
                        <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: 'hsl(215,15%,42%)' }}>
                          {formatCents(cap.spent_monthly_cents)} / {formatCents(cap.budget_monthly_cents)}
                        </span>
                      </div>
                    </div>
                    <BudgetBar pct={pct} status={bStatus} />
                  </div>

                  {/* Footer actions */}
                  <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'hsl(222,15%,18%)', background: 'hsl(222,20%,9%)' }}>
                    <div style={{ fontSize: 11, color: 'hsl(215,15%,40%)', fontFamily: 'IBM Plex Mono, monospace' }}>
                      ♥ {timeAgo(cap.last_heartbeat)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {/* Pause/Activate toggle */}
                      {cap.status === 'active' || cap.status === 'scaling' ? (
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '4px 8px', fontSize: 11 }}
                          onClick={() => handleStatusChange(cap, 'paused')}
                          title="Pause capability"
                        >
                          <PauseCircle size={13} /> Pause
                        </button>
                      ) : cap.status === 'paused' || cap.status === 'dormant' ? (
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '4px 8px', fontSize: 11, color: '#00E5A0' }}
                          onClick={() => handleStatusChange(cap, 'active')}
                          title="Activate capability"
                        >
                          <Power size={13} /> Activate
                        </button>
                      ) : null}

                      <button
                        className="btn btn-ghost"
                        style={{ padding: '4px 8px', fontSize: 11 }}
                        onClick={() => setModalCap(cap)}
                        title="Edit"
                      >
                        <Edit2 size={13} />
                      </button>

                      <button
                        className="btn btn-ghost"
                        style={{ padding: '4px 8px', fontSize: 11, color: deleting === cap.id ? '#FF4757' : undefined }}
                        onClick={() => {
                          if (deleting === cap.id) handleDelete(cap.id)
                          else setDeleting(cap.id)
                        }}
                        title={deleting === cap.id ? 'Confirm delete' : 'Delete'}
                      >
                        <Trash2 size={13} />
                        {deleting === cap.id && <span style={{ fontSize: 10 }}>Confirm</span>}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Empty state */}
            {filtered.length === 0 && !loading && (
              <div style={{ gridColumn: '1/-1' }}>
                <div className="fluid-card" style={{ padding: '60px 40px', textAlign: 'center' }}>
                  <Zap size={32} style={{ color: 'hsl(215,15%,30%)', margin: '0 auto 16px' }} />
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: 'hsl(210,20%,70%)', marginBottom: 8 }}>
                    No capabilities found
                  </h3>
                  <p style={{ fontSize: 13, color: 'hsl(215,15%,45%)', marginBottom: 20 }}>
                    {search || filterDomain || filterStatus
                      ? 'Try adjusting your filters'
                      : 'Register your first AI-native capability to get started'}
                  </p>
                  {!search && !filterDomain && !filterStatus && (
                    <button className="btn btn-primary" onClick={() => setModalCap(null)}>
                      <Plus size={14} /> Register First Capability
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
