import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { migrationMappings, capabilities } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  try {
    const db = getDb()
    const rows = db.select().from(migrationMappings)
      .where(eq(migrationMappings.company_id, 'comp_acme_global'))
      .all()

    const caps = db.select().from(capabilities)
      .where(eq(capabilities.company_id, 'comp_acme_global'))
      .all()

    const enriched = rows.map(row => ({
      ...row,
      capability: caps.find(c => c.id === row.capability_id) ?? null,
    }))

    return NextResponse.json({ mappings: enriched })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = getDb()
    const body = await req.json()
    const now = new Date().toISOString()

    db.update(migrationMappings)
      .set({ migration_status: body.status, migration_pct: body.pct, updated_at: now })
      .where(eq(migrationMappings.id, body.id))
      .run()

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
