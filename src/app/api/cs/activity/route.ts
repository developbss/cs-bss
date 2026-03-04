import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/neon';

// POST /api/cs/activity - Log CS activity
export async function POST(req: NextRequest) {
  try {
    const { session_id, cs_name, action, metadata } = await req.json();

    if (!session_id || !cs_name || !action) {
      return NextResponse.json({ error: 'session_id, cs_name, and action required' }, { status: 400 });
    }

    const metadataJson = metadata ? JSON.stringify(metadata) : '{}';

    const result = await sql`
      INSERT INTO cs_activity_log (session_id, cs_name, action, metadata)
      VALUES (${session_id}, ${cs_name}, ${action}, ${metadataJson}::jsonb)
      RETURNING *
    `;

    return NextResponse.json({ success: true, activity: result[0] });
  } catch (error) {
    console.error('CS activity log error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// GET /api/cs/activity - Query CS activity analytics
// Optional query params: cs_name, from, to
export async function GET(req: NextRequest) {
  try {
    const csName = req.nextUrl.searchParams.get('cs_name');
    const from = req.nextUrl.searchParams.get('from');
    const to = req.nextUrl.searchParams.get('to');

    let activities;

    if (csName && from && to) {
      activities = await sql`
        SELECT * FROM cs_activity_log
        WHERE cs_name = ${csName}
          AND created_at >= ${from}::timestamp
          AND created_at <= ${to}::timestamp
        ORDER BY created_at DESC
      `;
    } else if (csName) {
      activities = await sql`
        SELECT * FROM cs_activity_log
        WHERE cs_name = ${csName}
        ORDER BY created_at DESC
      `;
    } else if (from && to) {
      activities = await sql`
        SELECT * FROM cs_activity_log
        WHERE created_at >= ${from}::timestamp
          AND created_at <= ${to}::timestamp
        ORDER BY created_at DESC
      `;
    } else {
      activities = await sql`
        SELECT * FROM cs_activity_log
        ORDER BY created_at DESC
        LIMIT 100
      `;
    }

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('CS activity query error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
