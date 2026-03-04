import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/neon';

// Get messages for a session
export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('session_id');
    if (!sessionId) {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 });
    }

    const messages = await sql`
      SELECT * FROM chat_messages
      WHERE session_id = ${Number(sessionId)}
      ORDER BY created_at ASC
    `;

    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// Check if current time (WIB/UTC+7) is outside operating hours
function isOffHours(): boolean {
  const now = new Date();
  // Convert to WIB (UTC+7)
  const wibOffset = 7 * 60; // minutes
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const wibMinutes = (utcMinutes + wibOffset) % (24 * 60);
  const wibHour = Math.floor(wibMinutes / 60);
  const wibMinute = wibMinutes % 60;
  const totalMinutes = wibHour * 60 + wibMinute;

  // Get WIB day of week (0=Sunday)
  const wibTime = new Date(now.getTime() + wibOffset * 60 * 1000);
  const wibDay = wibTime.getUTCDay();

  // Sunday (0) = full day off
  if (wibDay === 0) return true;

  // Off hours: after 20:30 (1230 min) OR before 09:00 (540 min)
  return totalMinutes >= 1230 || totalMinutes < 540;
}

// Send message
export async function POST(req: NextRequest) {
  try {
    const { session_id, sender_type, sender_name, message, message_type, media_url, media_name } = await req.json();

    if (!session_id || !sender_type || (!message && !media_url)) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const msgType = message_type || 'text';
    const msgText = message || (msgType === 'image' ? '📷 Foto' : '🎥 Video');

    // Lookup CS avatar for admin messages
    let senderAvatar: string | null = null;
    if (sender_type === 'admin' && sender_name && sender_name !== 'Sistem') {
      const csProfile = await sql`
        SELECT avatar_url FROM cs_profiles WHERE name = ${sender_name} LIMIT 1
      `;
      senderAvatar = csProfile.length > 0 ? csProfile[0].avatar_url : null;
    }

    const result = await sql`
      INSERT INTO chat_messages (session_id, sender_type, sender_name, sender_avatar, message, message_type, media_url, media_name, is_read)
      VALUES (${session_id}, ${sender_type}, ${sender_name || null}, ${senderAvatar}, ${msgText}, ${msgType}, ${media_url || null}, ${media_name || null}, false)
      RETURNING *
    `;

    // Update session last message
    const lastMsgPreview = msgType === 'image' ? '📷 Foto' : msgType === 'video' ? '🎥 Video' : msgText;

    if (sender_type === 'customer') {
      await sql`
        UPDATE chat_sessions
        SET last_message = ${lastMsgPreview}, last_message_sender = ${sender_name || 'Customer'}, last_message_at = NOW(), unread_admin = unread_admin + 1, updated_at = NOW()
        WHERE id = ${session_id}
      `;

      // Auto-reply if outside operating hours (20:30 - 09:00 WIB)
      if (isOffHours()) {
        // Check if we already sent an auto-reply recently (within last 30 min) to avoid spam
        const recentAutoReply = await sql`
          SELECT id FROM chat_messages
          WHERE session_id = ${session_id}
          AND sender_type = 'admin'
          AND sender_name = 'Sistem'
          AND created_at > NOW() - INTERVAL '30 minutes'
          LIMIT 1
        `;

        if (recentAutoReply.length === 0) {
          const autoReplyText = 'Halo kak, maaf operasional BSS sedang tutup, namun kk bisa melihat harga perbaikan di pricelist atau melihat status service kapan saja. Terima kasih 😊';
          await sql`
            INSERT INTO chat_messages (session_id, sender_type, sender_name, sender_avatar, message, message_type, is_read)
            VALUES (${session_id}, 'admin', 'Sistem', ${null}, ${autoReplyText}, 'text', false)
          `;
          await sql`
            UPDATE chat_sessions
            SET last_message = ${autoReplyText}, last_message_sender = 'Sistem', last_message_at = NOW(), unread_customer = unread_customer + 1, updated_at = NOW()
            WHERE id = ${session_id}
          `;
        }
      }
    } else {
      await sql`
        UPDATE chat_sessions
        SET last_message = ${lastMsgPreview}, last_message_sender = ${sender_name || 'CS'}, last_message_at = NOW(), unread_customer = unread_customer + 1, updated_at = NOW()
        WHERE id = ${session_id}
      `;
    }

    return NextResponse.json({ message: result[0] });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
