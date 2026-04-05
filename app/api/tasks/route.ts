import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { tasks, capabilities } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  try {
    const db = getDb()
    const { searchParams } = new URL(req.url)
    const capId = searchParams.get('capability_id')
    const limit = parseInt(searchParams.get('limit') ?? '50')

    let query = db.select().from(tasks).orderBy(desc(tasks.created_at)).limit(limit)
    if (capId) {
      query = db.select().from(tasks).where(eq(tasks.capability_id, capId)).orderBy(desc(tasks.created_at)).limit(limit) as any
    }

    const rows = query.all()
    return NextResponse.json({ tasks: rows })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
