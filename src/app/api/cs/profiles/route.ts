import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/neon';

export async function GET() {
  try {
    const profiles = await sql`SELECT * FROM cs_profiles ORDER BY name`;
    return NextResponse.json({ profiles });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'name required' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO cs_profiles (name)
      VALUES (${name.trim()})
      RETURNING *
    `;

    return NextResponse.json({ profile: result[0] });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, name, avatar_url, is_active } = await req.json();

    if (avatar_url !== undefined) {
      await sql`UPDATE cs_profiles SET avatar_url = ${avatar_url} WHERE id = ${id}`;
    }
    if (name !== undefined) {
      await sql`UPDATE cs_profiles SET name = ${name} WHERE id = ${id}`;
    }
    if (is_active !== undefined) {
      await sql`UPDATE cs_profiles SET is_active = ${is_active} WHERE id = ${id}`;
    }

    const updated = await sql`SELECT * FROM cs_profiles WHERE id = ${id}`;
    return NextResponse.json({ profile: updated[0] });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    await sql`DELETE FROM cs_profiles WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
