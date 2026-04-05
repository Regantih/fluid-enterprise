import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { activityLog } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  try {
    const db = getDb()
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') ?? '100')

    const rows = db.select().from(activityLog)
      .orderBy(desc(activityLog.created_at))
      .limit(limit)
      .all()

    return NextResponse.json({ log: rows })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
