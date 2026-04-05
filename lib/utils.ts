import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function formatBudgetPct(spent: number, budget: number): number {
  if (budget === 0) return 0
  return Math.round((spent / budget) * 100)
}

export function getBudgetStatus(pct: number): 'ok' | 'warning' | 'critical' {
  if (pct >= 100) return 'critical'
  if (pct >= 80) return 'warning'
  return 'ok'
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}K`
  return tokens.toString()
}

export function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    active: 'text-fluid-green',
    scaling: 'text-fluid-amber',
    dormant: 'text-muted-foreground',
    paused: 'text-fluid-amber',
    error: 'text-fluid-red',
    completed: 'text-fluid-green',
    running: 'text-fluid-blue',
    pending: 'text-muted-foreground',
    failed: 'text-fluid-red',
    awaiting_approval: 'text-fluid-amber',
    migrated: 'text-fluid-green',
    cutover: 'text-fluid-blue',
    parallel: 'text-fluid-amber',
    analysis: 'text-fluid-purple',
    legacy: 'text-muted-foreground',
    approved: 'text-fluid-green',
    rejected: 'text-fluid-red',
    expired: 'text-muted-foreground',
  }
  return map[status] ?? 'text-foreground'
}

export function statusBg(status: string): string {
  const map: Record<string, string> = {
    active: 'bg-fluid-green/10 text-fluid-green border-fluid-green/20',
    scaling: 'bg-fluid-amber/10 text-fluid-amber border-fluid-amber/20',
    dormant: 'bg-muted/50 text-muted-foreground border-border',
    paused: 'bg-fluid-amber/10 text-fluid-amber border-fluid-amber/20',
    error: 'bg-fluid-red/10 text-fluid-red border-fluid-red/20',
    completed: 'bg-fluid-green/10 text-fluid-green border-fluid-green/20',
    running: 'bg-fluid-blue/10 text-fluid-blue border-fluid-blue/20',
    pending: 'bg-muted/50 text-muted-foreground border-border',
    failed: 'bg-fluid-red/10 text-fluid-red border-fluid-red/20',
    awaiting_approval: 'bg-fluid-amber/10 text-fluid-amber border-fluid-amber/20',
    migrated: 'bg-fluid-green/10 text-fluid-green border-fluid-green/20',
    cutover: 'bg-fluid-blue/10 text-fluid-blue border-fluid-blue/20',
    parallel: 'bg-fluid-amber/10 text-fluid-amber border-fluid-amber/20',
    analysis: 'bg-fluid-purple/10 text-fluid-purple border-fluid-purple/20',
    legacy: 'bg-muted/50 text-muted-foreground border-border',
    approved: 'bg-fluid-green/10 text-fluid-green border-fluid-green/20',
    rejected: 'bg-fluid-red/10 text-fluid-red border-fluid-red/20',
    high: 'bg-fluid-red/10 text-fluid-red border-fluid-red/20',
    medium: 'bg-fluid-amber/10 text-fluid-amber border-fluid-amber/20',
    low: 'bg-fluid-green/10 text-fluid-green border-fluid-green/20',
    critical: 'bg-fluid-red/10 text-fluid-red border-fluid-red/20',
  }
  return map[status] ?? 'bg-muted text-foreground border-border'
}

export function riskIcon(risk: string): string {
  const map: Record<string, string> = {
    low: '●',
    medium: '◆',
    high: '▲',
    critical: '⬟',
  }
  return map[risk] ?? '●'
}
