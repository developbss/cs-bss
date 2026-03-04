import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/neon';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { csName } = await req.json();

    if (!csName) {
      return NextResponse.json({ error: 'CS name required' }, { status: 400 });
    }

    // Atomically claim ONLY if still waiting (prevents duplicate claims)
    const claimed = await sql`
      UPDATE chat_sessions
      SET cs_name = ${csName}, status = 'active', updated_at = NOW()
      WHERE id = ${Number(id)} AND status = 'waiting'
      RETURNING *
    `;

    // If no rows updated, chat was already claimed
    if (claimed.length === 0) {
      return NextResponse.json({ error: 'Chat sudah diambil CS lain', alreadyClaimed: true }, { status: 409 });
    }

    // Get CS avatar and update
    const csProfile = await sql`
      SELECT avatar_url FROM cs_profiles WHERE name = ${csName} LIMIT 1
    `;
    const avatarUrl = csProfile.length > 0 ? csProfile[0].avatar_url : null;

    await sql`
      UPDATE chat_sessions
      SET cs_avatar = ${avatarUrl}
      WHERE id = ${Number(id)}
    `;

    const customerName = claimed[0]?.customer_name || 'Customer';

    // Auto send greeting (only once since claim is atomic)
    const greeting = `Halo kak ${customerName}, cs ${csName} disini 😊 , ada yang bisa kami bantu ?`;
    await sql`
      INSERT INTO chat_messages (session_id, sender_type, sender_name, sender_avatar, message, is_read)
      VALUES (${Number(id)}, 'admin', ${csName}, ${avatarUrl}, ${greeting}, false)
    `;

    await sql`
      UPDATE chat_sessions
      SET last_message = ${greeting}, last_message_sender = ${csName}, last_message_at = NOW(), unread_customer = unread_customer + 1
      WHERE id = ${Number(id)}
    `;

    return NextResponse.json({ success: true, greeting });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
