import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { capabilities } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'

export async function GET(req: NextRequest) {
  try {
    const db = getDb()
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('company_id') ?? 'comp_acme_global'

    const rows = db.select().from(capabilities)
      .where(eq(capabilities.company_id, companyId))
      .all()

    return NextResponse.json({ capabilities: rows })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb()
    const body = await req.json()
    const id = `cap_${nanoid(8)}`
    const now = new Date().toISOString()

    db.insert(capabilities).values({
      id,
      company_id: body.company_id ?? 'comp_acme_global',
      name: body.name,
      description: body.description,
      domain: body.domain,
      status: body.status ?? 'dormant',
      agent_type: body.agent_type,
      budget_monthly_cents: body.budget_monthly_cents ?? 0,
      spent_monthly_cents: 0,
      sla_target_ms: body.sla_target_ms ?? 5000,
      token_usage_month: 0,
      tasks_completed: 0,
      tasks_failed: 0,
      created_at: now,
      updated_at: now,
    }).run()

    const newCap = db.select().from(capabilities).where(eq(capabilities.id, id)).get()
    return NextResponse.json({ capability: newCap }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
