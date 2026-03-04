import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/neon';

export async function POST(req: NextRequest) {
  try {
    const { session_id, reader_type } = await req.json();

    // Mark messages as read
    const oppositeType = reader_type === 'customer' ? 'admin' : 'customer';
    await sql`
      UPDATE chat_messages
      SET is_read = true
      WHERE session_id = ${session_id}
      AND sender_type = ${oppositeType}
      AND is_read = false
    `;

    // Reset unread count
    if (reader_type === 'customer') {
      await sql`UPDATE chat_sessions SET unread_customer = 0 WHERE id = ${session_id}`;
    } else {
      await sql`UPDATE chat_sessions SET unread_admin = 0 WHERE id = ${session_id}`;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
