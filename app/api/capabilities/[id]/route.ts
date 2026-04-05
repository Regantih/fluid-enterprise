import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { capabilities, activityLog } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb()
    const cap = db.select().from(capabilities).where(eq(capabilities.id, params.id)).get()
    if (!cap) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ capability: cap })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb()
    const body = await req.json()
    const now = new Date().toISOString()

    const allowed = ['name', 'description', 'status', 'agent_type', 'budget_monthly_cents', 'sla_target_ms', 'domain']
    const updates: Record<string, any> = { updated_at: now }
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key]
    }

    db.update(capabilities).set(updates).where(eq(capabilities.id, params.id)).run()

    // Log activity
    if (body.status) {
      db.insert(activityLog).values({
        id: `act_${nanoid(8)}`,
        company_id: 'comp_acme_global',
        capability_id: params.id,
        actor: body.actor ?? 'human:user',
        action: `CAPABILITY_STATUS_CHANGED`,
        resource_type: 'capability',
        resource_id: params.id,
        details: JSON.stringify({ status: body.status, previous: body._previous }),
        severity: 'info',
        created_at: now,
      }).run()
    }

    const updated = db.select().from(capabilities).where(eq(capabilities.id, params.id)).get()
    return NextResponse.json({ capability: updated })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb()
    db.delete(capabilities).where(eq(capabilities.id, params.id)).run()
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
