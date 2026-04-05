import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { capabilities, tasks, governanceApprovals, costEvents, activityLog } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET() {
  try {
    const db = getDb()
    const MONTH = new Date().toISOString().slice(0, 7)

    const allCaps = db.select().from(capabilities).where(eq(capabilities.company_id, 'comp_acme_global')).all()
    const allTasks = db.select().from(tasks).orderBy(desc(tasks.created_at)).limit(200).all()
    const pendingApprovals = db.select().from(governanceApprovals).where(eq(governanceApprovals.status, 'pending')).all()
    const recentActivity = db.select().from(activityLog).orderBy(desc(activityLog.created_at)).limit(8).all()
    const monthCosts = db.select().from(costEvents).where(eq(costEvents.month_bucket, MONTH)).all()

    const totalBudget = allCaps.reduce((s, c) => s + c.budget_monthly_cents, 0)
    const totalSpent = allCaps.reduce((s, c) => s + c.spent_monthly_cents, 0)
    const activeCaps = allCaps.filter(c => c.status === 'active' || c.status === 'scaling').length
    const runningTasks = allTasks.filter(t => t.status === 'running').length
    const criticalAlerts = allCaps.filter(c => c.budget_monthly_cents > 0 && (c.spent_monthly_cents / c.budget_monthly_cents) >= 0.8).length

    // 30-day spend trend
    const trend: Record<string, number> = {}
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      trend[d.toISOString().slice(0, 10)] = 0
    }
    monthCosts.forEach(e => {
      const day = e.created_at.slice(0, 10)
      if (trend[day] !== undefined) trend[day] += e.amount_cents
    })
    const spendTrend = Object.entries(trend).map(([date, amount]) => ({
      date: date.slice(5), // MM-DD
      amount: Math.round(amount / 100),
    }))

    // Capability health
    const capHealth = allCaps.map(c => {
      const pct = c.budget_monthly_cents > 0 ? Math.round((c.spent_monthly_cents / c.budget_monthly_cents) * 100) : 0
      const failRate = (c.tasks_completed + c.tasks_failed) > 0
        ? Math.round((c.tasks_failed / (c.tasks_completed + c.tasks_failed)) * 100) : 0
      return {
        id: c.id,
        name: c.name,
        domain: c.domain,
        status: c.status,
        agent_type: c.agent_type,
        budget_pct: pct,
        fail_rate: failRate,
        tasks_completed: c.tasks_completed,
        last_heartbeat: c.last_heartbeat,
        spent_monthly_cents: c.spent_monthly_cents,
        budget_monthly_cents: c.budget_monthly_cents,
      }
    })

    // Domain spend breakdown
    const domainSpend: Record<string, number> = {}
    allCaps.forEach(c => {
      domainSpend[c.domain] = (domainSpend[c.domain] ?? 0) + c.spent_monthly_cents
    })
    const domainBreakdown = Object.entries(domainSpend).map(([domain, amount]) => ({ domain, amount: Math.round(amount / 100) }))

    return NextResponse.json({
      summary: {
        active_capabilities: activeCaps,
        total_capabilities: allCaps.length,
        running_tasks: runningTasks,
        pending_approvals: pendingApprovals.length,
        critical_alerts: criticalAlerts,
        total_budget_cents: totalBudget,
        total_spent_cents: totalSpent,
        budget_pct: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
      },
      spend_trend: spendTrend,
      domain_breakdown: domainBreakdown,
      cap_health: capHealth,
      recent_activity: recentActivity,
      pending_approvals: pendingApprovals,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
