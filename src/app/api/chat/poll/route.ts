import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/neon';

// Polling endpoint for real-time updates
export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('session_id');
    const lastId = req.nextUrl.searchParams.get('last_id') || '0';
    const userType = req.nextUrl.searchParams.get('user_type') || 'customer';

    if (!sessionId) {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 });
    }

    // Get new messages since last_id
    const messages = await sql`
      SELECT * FROM chat_messages
      WHERE session_id = ${Number(sessionId)}
      AND id > ${Number(lastId)}
      ORDER BY created_at ASC
    `;

    // Get typing status of opposite party
    const oppositeType = userType === 'customer' ? 'admin' : 'customer';
    const typingResult = await sql`
      SELECT is_typing, updated_at FROM typing_status
      WHERE session_id = ${Number(sessionId)} AND user_type = ${oppositeType}
      LIMIT 1
    `;

    let isTyping = false;
    if (typingResult.length > 0 && typingResult[0].is_typing) {
      const updatedAt = new Date(typingResult[0].updated_at as string);
      const now = new Date();
      isTyping = (now.getTime() - updatedAt.getTime()) < 5000;
    }

    // Get session info (for CS name / avatar updates)
    const session = await sql`
      SELECT cs_name, cs_avatar, status, unread_customer, unread_admin
      FROM chat_sessions WHERE id = ${Number(sessionId)}
    `;

    // Get read status updates
    const readStatus = await sql`
      SELECT id, is_read FROM chat_messages
      WHERE session_id = ${Number(sessionId)}
      AND sender_type = ${userType}
      AND is_read = true
      ORDER BY id DESC LIMIT 50
    `;

    return NextResponse.json({
      messages,
      is_typing: isTyping,
      session: session[0] || null,
      read_message_ids: readStatus.map(r => r.id),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
