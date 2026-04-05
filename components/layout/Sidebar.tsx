'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Boxes,
  GitBranch,
  Shield,
  Activity,
  ArrowRightLeft,
  DollarSign,
  ScrollText,
  Zap,
  ChevronRight,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/capabilities', label: 'Capability Registry', icon: Boxes },
  { href: '/composition', label: 'Composition Engine', icon: GitBranch },
  { href: '/governance', label: 'Governance Board', icon: Shield, badge: 5 },
  { href: '/heartbeat', label: 'Heartbeat Monitor', icon: Activity },
  { href: '/migration', label: 'Migration Planner', icon: ArrowRightLeft },
  { href: '/cost', label: 'Cost Dashboard', icon: DollarSign },
  { href: '/activity', label: 'Activity Log', icon: ScrollText },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="flex flex-col shrink-0 h-screen border-r border-[hsl(222,15%,18%)]"
      style={{
        width: 240,
        background: 'hsl(222,20%,7%)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[hsl(222,15%,18%)]" style={{ minHeight: 56 }}>
        <div
          className="flex items-center justify-center rounded-md"
          style={{
            width: 28,
            height: 28,
            background: 'linear-gradient(135deg, #00D4FF22 0%, #00D4FF44 100%)',
            border: '1px solid rgba(0,212,255,0.3)',
          }}
        >
          <Zap size={14} style={{ color: '#00D4FF' }} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.02em', color: 'hsl(210,20%,92%)' }}>
            FLUID
          </div>
          <div style={{ fontSize: 10, color: 'hsl(215,15%,45%)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.08em', marginTop: -2 }}>
            ENTERPRISE
          </div>
        </div>
      </div>

      {/* Company pill */}
      <div className="px-4 py-3 border-b border-[hsl(222,15%,18%)]">
        <div
          className="flex items-center gap-2 rounded-md px-3 py-2"
          style={{ background: 'hsl(222,15%,12%)', border: '1px solid hsl(222,15%,18%)' }}
        >
          <div
            className="rounded-sm shrink-0"
            style={{
              width: 20, height: 20,
              background: 'linear-gradient(135deg, #F5A62322, #F5A62344)',
              border: '1px solid rgba(245,166,35,0.3)',
            }}
          />
          <div className="min-w-0">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'hsl(210,20%,88%)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              ACME Global Industries
            </div>
            <div style={{ fontSize: 10, color: 'hsl(215,15%,45%)', fontFamily: 'IBM Plex Mono, monospace' }}>
              SAP → Fluid · Phase 2
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <div style={{ fontSize: 10, fontWeight: 500, color: 'hsl(215,15%,40%)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 10px 8px', fontFamily: 'IBM Plex Mono, monospace' }}>
          Control Plane
        </div>
        {NAV_ITEMS.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className="nav-item"
              style={active ? {
                background: 'rgba(0,212,255,0.07)',
                color: '#00D4FF',
                border: '1px solid rgba(0,212,255,0.12)',
              } : {}}
            >
              <Icon size={15} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13 }}>{label}</span>
              {badge && (
                <span style={{
                  fontSize: 10,
                  fontFamily: 'IBM Plex Mono, monospace',
                  background: 'rgba(245,166,35,0.15)',
                  color: '#F5A623',
                  border: '1px solid rgba(245,166,35,0.25)',
                  borderRadius: 4,
                  padding: '1px 5px',
                }}>
                  {badge}
                </span>
              )}
              {active && <ChevronRight size={12} style={{ opacity: 0.5 }} />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[hsl(222,15%,18%)]">
        <div className="flex items-center gap-2">
          <div
            className="rounded-full shrink-0"
            style={{ width: 26, height: 26, background: 'linear-gradient(135deg, #8B5CF6, #00D4FF)', opacity: 0.9 }}
          />
          <div className="min-w-0">
            <div style={{ fontSize: 12, fontWeight: 500, color: 'hsl(210,20%,85%)' }}>Hemanth Reganti</div>
            <div style={{ fontSize: 10, color: 'hsl(215,15%,45%)', fontFamily: 'IBM Plex Mono, monospace' }}>CTA · Board Member</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
