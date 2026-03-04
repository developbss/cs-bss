import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/neon';

// GET /api/admin/settings - Get all settings
// GET /api/admin/settings?key=about - Get specific setting
export async function GET(req: NextRequest) {
  try {
    const key = req.nextUrl.searchParams.get('key');

    if (key) {
      const rows = await sql`SELECT setting_key, setting_value FROM site_settings WHERE setting_key = ${key}`;
      if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ key: rows[0].setting_key, value: rows[0].setting_value });
    }

    const rows = await sql`SELECT setting_key, setting_value, updated_at FROM site_settings ORDER BY setting_key`;
    const settings: Record<string, unknown> = {};
    for (const row of rows) {
      settings[row.setting_key] = row.setting_value;
    }
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// PUT /api/admin/settings { key: 'about', value: { ... } }
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'key and value required' }, { status: 400 });
    }

    const jsonValue = JSON.stringify(value);

    await sql`
      INSERT INTO site_settings (setting_key, setting_value, updated_at)
      VALUES (${key}, ${jsonValue}::jsonb, NOW())
      ON CONFLICT (setting_key)
      DO UPDATE SET setting_value = ${jsonValue}::jsonb, updated_at = NOW()
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Settings PUT error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
