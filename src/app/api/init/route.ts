import { NextResponse } from 'next/server';
import { initChatTables } from '@/lib/neon';

export async function POST() {
  try {
    await initChatTables();
    return NextResponse.json({ success: true, message: 'Tables initialized' });
  } catch (error) {
    console.error('Init error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
