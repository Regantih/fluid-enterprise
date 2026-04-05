import React from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  badge?: { label: string; color?: 'blue' | 'amber' | 'green' | 'red' }
}

export function PageHeader({ title, subtitle, actions, badge }: PageHeaderProps) {
  const badgeColors = {
    blue: { bg: 'rgba(0,212,255,0.1)', color: '#00D4FF', border: 'rgba(0,212,255,0.2)' },
    amber: { bg: 'rgba(245,166,35,0.1)', color: '#F5A623', border: 'rgba(245,166,35,0.2)' },
    green: { bg: 'rgba(0,229,160,0.1)', color: '#00E5A0', border: 'rgba(0,229,160,0.2)' },
    red: { bg: 'rgba(255,71,87,0.1)', color: '#FF4757', border: 'rgba(255,71,87,0.2)' },
  }
  const bc = badge ? badgeColors[badge.color ?? 'blue'] : null

  return (
    <div
      className="flex items-start justify-between px-8 py-6 border-b"
      style={{ borderColor: 'hsl(222,15%,18%)', background: 'hsl(222,20%,7.5%)' }}
    >
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', color: 'hsl(210,20%,94%)' }}>
              {title}
            </h1>
            {badge && bc && (
              <span style={{
                fontSize: 10,
                fontFamily: 'IBM Plex Mono, monospace',
                background: bc.bg,
                color: bc.color,
                border: `1px solid ${bc.border}`,
                borderRadius: 4,
                padding: '2px 7px',
                fontWeight: 500,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}>
                {badge.label}
              </span>
            )}
          </div>
          {subtitle && (
            <p style={{ fontSize: 13, color: 'hsl(215,15%,50%)', marginTop: 2 }}>{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
