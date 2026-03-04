import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/neon';

// GET /api/stories - Get active, visible stories (public)
export async function GET() {
  try {
    // Auto-cleanup: delete stories where auto_down_at has passed
    await sql`DELETE FROM stories WHERE auto_down_at IS NOT NULL AND auto_down_at <= NOW()`;

    // Also cleanup legacy stories using old expires_at logic
    await sql`DELETE FROM stories WHERE auto_down_at IS NULL AND expires_at <= NOW()`;

    const stories = await sql`
      SELECT * FROM stories
      WHERE is_active = true
        AND (expires_at > NOW() OR auto_down_at IS NOT NULL)
        AND (auto_down_at IS NULL OR auto_down_at > NOW())
        AND (scheduled_at IS NULL OR scheduled_at <= NOW())
      ORDER BY sort_order ASC, created_at DESC
    `;

    return NextResponse.json({ stories });
  } catch (error) {
    console.error('Stories GET error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST /api/stories - Create a new story
export async function POST(req: NextRequest) {
  try {
    const { image_url, media_type, caption, link_url, duration, expires_at, scheduled_at, auto_down_at } = await req.json();

    if (!image_url) {
      return NextResponse.json({ error: 'image_url required' }, { status: 400 });
    }

    // Default auto_down_at: next day 04:00 WIB (21:00 UTC)
    let downAt = auto_down_at;
    if (!downAt) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yyyy = tomorrow.toISOString().split('T')[0];
      downAt = `${yyyy}T04:00:00+07:00`;
    }

    // Default expires_at to auto_down_at if not provided
    const expiresAt = expires_at || downAt;

    const result = await sql`
      INSERT INTO stories (image_url, media_type, caption, link_url, duration, expires_at, scheduled_at, auto_down_at)
      VALUES (
        ${image_url},
        ${media_type || 'image'},
        ${caption || ''},
        ${link_url || null},
        ${duration || 5},
        ${expiresAt}::timestamp,
        ${scheduled_at || null}::timestamp,
        ${downAt}::timestamp
      )
      RETURNING *
    `;

    return NextResponse.json({ success: true, story: result[0] });
  } catch (error) {
    console.error('Stories POST error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// PUT /api/stories - Update a story
export async function PUT(req: NextRequest) {
  try {
    const { id, is_active, caption, expires_at, scheduled_at, auto_down_at, duration } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    if (is_active !== undefined) {
      await sql`UPDATE stories SET is_active = ${is_active} WHERE id = ${id}`;
    }
    if (caption !== undefined) {
      await sql`UPDATE stories SET caption = ${caption} WHERE id = ${id}`;
    }
    if (expires_at !== undefined) {
      await sql`UPDATE stories SET expires_at = ${expires_at}::timestamp WHERE id = ${id}`;
    }
    if (scheduled_at !== undefined) {
      await sql`UPDATE stories SET scheduled_at = ${scheduled_at ? scheduled_at : null}::timestamp WHERE id = ${id}`;
    }
    if (auto_down_at !== undefined) {
      await sql`UPDATE stories SET auto_down_at = ${auto_down_at ? auto_down_at : null}::timestamp WHERE id = ${id}`;
    }
    if (duration !== undefined) {
      await sql`UPDATE stories SET duration = ${duration} WHERE id = ${id}`;
    }

    const updated = await sql`SELECT * FROM stories WHERE id = ${id}`;
    return NextResponse.json({ success: true, story: updated[0] });
  } catch (error) {
    console.error('Stories PUT error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// DELETE /api/stories - Delete a story (reads id from body JSON)
export async function DELETE(req: NextRequest) {
  try {
    // Support both query param and body JSON for backwards compat
    let id = req.nextUrl.searchParams.get('id');
    if (!id) {
      try {
        const body = await req.json();
        id = body.id ? String(body.id) : null;
      } catch {
        // No body
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    await sql`DELETE FROM stories WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Stories DELETE error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
