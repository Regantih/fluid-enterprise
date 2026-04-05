'use client'

import { useEffect, useState } from 'react'
import { GitBranch, ArrowRight, Zap, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'

interface Capability {
  id: string; name: string; domain: string; status: string
}
interface Composition {
  id: string; name: string; source_capability_id: string
  target_capability_id: string; flow_type: string
}

const DOMAIN_COLORS: Record<string, string> = {
  Finance: '#00D4FF', 'Supply Chain': '#F5A623',
  Revenue: '#00E5A0', HR: '#8B5CF6', Operations: '#FF4757',
}
const FLOW_COLORS: Record<string, string> = {
  sequential: '#00D4FF', parallel: '#00E5A0', conditional: '#F5A623',
}

// Fixed layout positions for the demo
const POSITIONS: Record<string, { x: number; y: number }> = {
  cap_demand: { x: 80, y: 200 },
  cap_p2p: { x: 300, y: 130 },
  cap_ap_ar: { x: 520, y: 130 },
  cap_treasury: { x: 740, y: 60 },
  cap_interco: { x: 740, y: 260 },
  cap_customer_intel: { x: 300, y: 360 },
  cap_rev: { x: 520, y: 360 },
  cap_hr_ops: { x: 80, y: 400 },
}

export default function CompositionPage() {
  const [caps, setCaps] = useState<Capability[]>([])
  const [compositions, setCompositions] = useState<Composition[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredCap, setHoveredCap] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/capabilities').then(r => r.json()),
    ]).then(([capsData]) => {
      setCaps(capsData.capabilities ?? [])
      setLoading(false)
    })
    // Hardcode compositions since we don't have a dedicated API for listing them
    setCompositions([
      { id: '1', name: 'Demand-Driven Procurement', source_capability_id: 'cap_demand', target_capability_id: 'cap_p2p', flow_type: 'sequential' },
      { id: '2', name: 'PO → Invoice Processing', source_capability_id: 'cap_p2p', target_capability_id: 'cap_ap_ar', flow_type: 'sequential' },
      { id: '3', name: 'Payment → Cash Position', source_capability_id: 'cap_ap_ar', target_capability_id: 'cap_treasury', flow_type: 'sequential' },
      { id: '4', name: 'IC Invoice Elimination', source_capability_id: 'cap_ap_ar', target_capability_id: 'cap_interco', flow_type: 'conditional' },
      { id: '5', name: 'Order → Revenue Event', source_capability_id: 'cap_customer_intel', target_capability_id: 'cap_rev', flow_type: 'sequential' },
      { id: '6', name: 'Cross-Entity Rev Allocation', source_capability_id: 'cap_rev', target_capability_id: 'cap_interco', flow_type: 'conditional' },
      { id: '7', name: 'IC Netting Settlement', source_capability_id: 'cap_treasury', target_capability_id: 'cap_interco', flow_type: 'parallel' },
    ])
  }, [])

  const capMap = new Map(caps.map(c => [c.id, c]))

  // SVG arrow path between two nodes
  function getPath(srcId: string, tgtId: string) {
    const src = POSITIONS[srcId]
    const tgt = POSITIONS[tgtId]
    if (!src || !tgt) return ''
    const NODE_W = 160, NODE_H = 64
    const sx = src.x + NODE_W, sy = src.y + NODE_H / 2
    const tx = tgt.x, ty = tgt.y + NODE_H / 2
    const cx = (sx + tx) / 2
    return `M ${sx} ${sy} C ${cx} ${sy}, ${cx} ${ty}, ${tx} ${ty}`
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <PageHeader
        title="Composition Engine"
        subtitle="Visual flow of how capabilities compose into end-to-end business processes"
        badge={{ label: `${compositions.length} flows`, color: 'blue' }}
        actions={
          <div className="flex items-center gap-3">
            {/* Legend */}
            {Object.entries(FLOW_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div style={{ width: 20, height: 2, background: color, borderRadius: 1, opacity: type === 'sequential' ? 1 : type === 'parallel' ? 1 : 1,
                  ...(type === 'conditional' ? { borderTop: `2px dashed ${color}`, height: 0, background: 'none' } : {})
                }} />
                <span style={{ fontSize: 10, color: 'hsl(215,15%,48%)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase' }}>{type}</span>
              </div>
            ))}
          </div>
        }
      />

      <div style={{ padding: 32 }}>
        {/* Composition Canvas */}
        <div className="fluid-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ position: 'relative', width: '100%', minHeight: 540, overflowX: 'auto' }}>
            <svg
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}
              viewBox="0 0 960 520"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {Object.entries(FLOW_COLORS).map(([type, color]) => (
                  <marker key={type} id={`arrow-${type}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill={color} opacity={0.8} />
                  </marker>
                ))}
              </defs>

              {/* Edges */}
              {compositions.map(comp => {
                const path = getPath(comp.source_capability_id, comp.target_capability_id)
                const color = FLOW_COLORS[comp.flow_type] ?? '#00D4FF'
                const isActive = hoveredCap === comp.source_capability_id || hoveredCap === comp.target_capability_id
                return (
                  <path
                    key={comp.id}
                    d={path}
                    stroke={color}
                    strokeWidth={isActive ? 2 : 1.5}
                    fill="none"
                    strokeDasharray={comp.flow_type === 'conditional' ? '6,4' : comp.flow_type === 'parallel' ? '2,3' : 'none'}
                    opacity={isActive ? 0.9 : 0.45}
                    markerEnd={`url(#arrow-${comp.flow_type})`}
                    style={{ transition: 'opacity 0.2s, stroke-width 0.2s' }}
                  />
                )
              })}
            </svg>

            {/* Nodes */}
            <div style={{ position: 'relative', zIndex: 2, minHeight: 520 }}>
              {caps.map(cap => {
                const pos = POSITIONS[cap.id]
                if (!pos) return null
                const domainColor = DOMAIN_COLORS[cap.domain] ?? '#8B5CF6'
                const isHovered = hoveredCap === cap.id
                const isConnected = hoveredCap && compositions.some(c =>
                  (c.source_capability_id === hoveredCap && c.target_capability_id === cap.id) ||
                  (c.target_capability_id === hoveredCap && c.source_capability_id === cap.id)
                )

                return (
                  <div
                    key={cap.id}
                    style={{
                      position: 'absolute',
                      left: pos.x,
                      top: pos.y,
                      width: 160,
                      height: 64,
                      borderRadius: 8,
                      background: isHovered ? `${domainColor}18` : isConnected ? `${domainColor}10` : 'hsl(222,18%,12%)',
                      border: `1px solid ${isHovered ? domainColor + '60' : isConnected ? domainColor + '35' : 'hsl(222,15%,20%)'}`,
                      padding: '10px 12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: isHovered ? `0 0 16px ${domainColor}30` : 'none',
                    }}
                    onMouseEnter={() => setHoveredCap(cap.id)}
                    onMouseLeave={() => setHoveredCap(null)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`status-dot ${cap.status}`} />
                      <span style={{ fontSize: 11, color: domainColor, fontFamily: 'IBM Plex Mono, monospace', fontSize: 10 }}>
                        {cap.domain.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'hsl(210,20%,88%)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cap.name}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Composition list */}
        <div className="fluid-card mt-6" style={{ padding: 0 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid hsl(222,15%,18%)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>Registered Flows</h3>
          </div>
          <table className="fluid-table">
            <thead>
              <tr>
                <th>Flow Name</th><th>Source</th><th>Target</th><th>Type</th>
              </tr>
            </thead>
            <tbody>
              {compositions.map(comp => {
                const src = capMap.get(comp.source_capability_id)
                const tgt = capMap.get(comp.target_capability_id)
                const color = FLOW_COLORS[comp.flow_type]
                return (
                  <tr key={comp.id}>
                    <td style={{ fontSize: 13, fontWeight: 500, color: 'hsl(210,20%,85%)' }}>{comp.name}</td>
                    <td>
                      <span style={{ fontSize: 12, color: src ? DOMAIN_COLORS[src.domain] : 'hsl(215,15%,50%)' }}>
                        {src?.name ?? comp.source_capability_id}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <ArrowRight size={11} style={{ color: 'hsl(215,15%,40%)' }} />
                        <span style={{ fontSize: 12, color: tgt ? DOMAIN_COLORS[tgt.domain] : 'hsl(215,15%,50%)' }}>
                          {tgt?.name ?? comp.target_capability_id}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        fontSize: 10, fontFamily: 'IBM Plex Mono, monospace',
                        color, background: `${color}12`, border: `1px solid ${color}25`,
                        padding: '1px 7px', borderRadius: 3, textTransform: 'uppercase',
                      }}>
                        {comp.flow_type}
                      </span>
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
