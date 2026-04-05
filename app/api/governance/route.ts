import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { governanceApprovals, activityLog } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { nanoid } from 'nanoid'

export async function GET(req: NextRequest) {
  try {
    const db = getDb()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const companyId = searchParams.get('company_id') ?? 'comp_acme_global'

    let rows
    if (status) {
      rows = db.select().from(governanceApprovals)
        .where(eq(governanceApprovals.status, status))
        .orderBy(desc(governanceApprovals.created_at))
        .all()
    } else {
      rows = db.select().from(governanceApprovals)
        .orderBy(desc(governanceApprovals.created_at))
        .all()
    }

    return NextResponse.json({ approvals: rows })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
