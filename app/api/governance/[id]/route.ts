import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { governanceApprovals, activityLog } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb()
    const body = await req.json()
    const now = new Date().toISOString()

    const approval = db.select().from(governanceApprovals).where(eq(governanceApprovals.id, params.id)).get()
    if (!approval) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updates: Record<string, any> = {}

    if (body.action === 'approve') {
      updates.status = 'approved'
      updates.approved_by = body.approved_by ?? 'human:user'
      updates.approved_at = now
    } else if (body.action === 'reject') {
      updates.status = 'rejected'
      updates.approved_by = body.approved_by ?? 'human:user'
      updates.approved_at = now
      updates.rejection_reason = body.reason ?? 'Rejected by governance board'
    }

    db.update(governanceApprovals).set(updates).where(eq(governanceApprovals.id, params.id)).run()

    // Log the decision
    db.insert(activityLog).values({
      id: `act_${nanoid(8)}`,
      company_id: approval.company_id,
      capability_id: approval.capability_id,
      actor: body.approved_by ?? 'human:user',
      action: body.action === 'approve' ? 'GOVERNANCE_APPROVED' : 'GOVERNANCE_REJECTED',
      resource_type: 'governance',
      resource_id: params.id,
      details: JSON.stringify({ title: approval.title, reason: body.reason }),
      severity: 'info',
      created_at: now,
    }).run()

    const updated = db.select().from(governanceApprovals).where(eq(governanceApprovals.id, params.id)).get()
    return NextResponse.json({ approval: updated })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
