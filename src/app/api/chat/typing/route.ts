import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/neon';

export async function POST(req: NextRequest) {
  try {
    const { session_id, user_type, is_typing } = await req.json();

    // Upsert typing status
    const existing = await sql`
      SELECT id FROM typing_status
      WHERE session_id = ${session_id} AND user_type = ${user_type}
    `;

    if (existing.length > 0) {
      await sql`
        UPDATE typing_status
        SET is_typing = ${is_typing}, updated_at = NOW()
        WHERE session_id = ${session_id} AND user_type = ${user_type}
      `;
    } else {
      await sql`
        INSERT INTO typing_status (session_id, user_type, is_typing)
        VALUES (${session_id}, ${user_type}, ${is_typing})
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('session_id');
    const userType = req.nextUrl.searchParams.get('user_type');

    if (!sessionId) {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 });
    }

    // Get opposite party typing status
    const oppositeType = userType === 'customer' ? 'admin' : 'customer';
    const result = await sql`
      SELECT is_typing, updated_at FROM typing_status
      WHERE session_id = ${Number(sessionId)} AND user_type = ${oppositeType}
      LIMIT 1
    `;

    const isTyping = result.length > 0 && result[0].is_typing;
    // Auto-expire typing after 5 seconds
    if (isTyping && result[0].updated_at) {
      const updatedAt = new Date(result[0].updated_at as string);
      const now = new Date();
      if (now.getTime() - updatedAt.getTime() > 5000) {
        return NextResponse.json({ is_typing: false });
      }
    }

    return NextResponse.json({ is_typing: isTyping });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
