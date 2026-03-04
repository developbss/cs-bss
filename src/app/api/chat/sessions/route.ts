import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/neon';
import { normalizePhone } from '@/lib/auth';

// Create or get session for customer
export async function POST(req: NextRequest) {
  try {
    const { name, phone } = await req.json();
    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone required' }, { status: 400 });
    }

    const normalized = normalizePhone(phone);

    // Check existing active session
    const existing = await sql`
      SELECT * FROM chat_sessions
      WHERE customer_phone = ${normalized}
      AND status != 'closed'
      ORDER BY created_at DESC LIMIT 1
    `;

    if (existing.length > 0) {
      // Update name if different
      if (existing[0].customer_name !== name) {
        await sql`UPDATE chat_sessions SET customer_name = ${name} WHERE id = ${existing[0].id}`;
      }
      return NextResponse.json({ session: { ...existing[0], customer_name: name } });
    }

    // Create new session
    const result = await sql`
      INSERT INTO chat_sessions (customer_name, customer_phone, status)
      VALUES (${name}, ${normalized}, 'waiting')
      RETURNING *
    `;

    return NextResponse.json({ session: result[0] });
  } catch (error) {
    console.error('Session create error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// Get all sessions (admin)
export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get('status');

    let sessions;
    if (status) {
      sessions = await sql`
        SELECT * FROM chat_sessions
        WHERE status = ${status}
        ORDER BY last_message_at DESC
      `;
    } else {
      sessions = await sql`
        SELECT * FROM chat_sessions
        ORDER BY
          CASE WHEN status = 'waiting' THEN 0
               WHEN status = 'active' THEN 1
               ELSE 2 END,
          last_message_at DESC
      `;
    }

    return NextResponse.json({ sessions });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
