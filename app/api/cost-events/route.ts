import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { costEvents, capabilities } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  try {
    const db = getDb()
    const { searchParams } = new URL(req.url)
    const capId = searchParams.get('capability_id')
    const month = searchParams.get('month') ?? new Date().toISOString().slice(0, 7)

    const allCaps = db.select().from(capabilities).where(eq(capabilities.company_id, 'comp_acme_global')).all()
    const allEvents = db.select().from(costEvents).where(eq(costEvents.month_bucket, month)).all()

    // Aggregate by capability
    const byCap = allCaps.map(cap => {
      const events = allEvents.filter(e => e.capability_id === cap.id)
      const totalSpent = events.reduce((sum, e) => sum + e.amount_cents, 0)
      const totalTokens = events.reduce((sum, e) => sum + e.token_count, 0)
      const byType: Record<string, number> = {}
      events.forEach(e => { byType[e.event_type] = (byType[e.event_type] ?? 0) + e.amount_cents })
      return {
        capability_id: cap.id,
        capability_name: cap.name,
        domain: cap.domain,
        budget_monthly_cents: cap.budget_monthly_cents,
        spent_monthly_cents: totalSpent || cap.spent_monthly_cents,
        token_usage: totalTokens || cap.token_usage_month,
        by_type: byType,
        pct_used: cap.budget_monthly_cents > 0 
          ? Math.round(((totalSpent || cap.spent_monthly_cents) / cap.budget_monthly_cents) * 100) 
          : 0,
      }
    })

    // Daily trend data for last 30 days
    const trend: Record<string, number> = {}
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      trend[key] = 0
    }

    allEvents.forEach(e => {
      const day = e.created_at.slice(0, 10)
      if (trend[day] !== undefined) trend[day] += e.amount_cents
    })

    const trendArray = Object.entries(trend).map(([date, amount]) => ({ date, amount }))

    return NextResponse.json({ by_capability: byCap, trend: trendArray, month })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
