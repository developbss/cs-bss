import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/neon';
import { queryMySQL } from '@/lib/mysql';
import { phoneVariants } from '@/lib/auth';

// Vercel serverless config
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const DEFAULT_PASSWORD = '123456';

function generateUsername(nama: string): string {
  // Generate from name: lowercase, remove spaces/special chars, add _3digit
  const base = nama.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 12);
  const rand = Math.floor(100 + Math.random() * 900);
  return `${base || 'user'}_${rand}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // ========== REQUEST USERNAME ==========
    // Flow:
    // 1. Check if phone already exists in Neon chat_customers → return existing
    // 2. If not, check BSS MySQL for name → use that name
    // 3. If not in BSS either, use provided name (from form)
    // 4. Always store in Neon chat_customers with password 123456
    if (action === 'request') {
      const { phone, name } = body;
      if (!phone || !name) return NextResponse.json({ error: 'Name and phone required' }, { status: 400 });

      // Ensure chat_customers table exists
      await sql`
        CREATE TABLE IF NOT EXISTS chat_customers (
          id SERIAL PRIMARY KEY,
          nama VARCHAR(150) NOT NULL,
          phone VARCHAR(30) NOT NULL,
          username VARCHAR(50) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL DEFAULT '123456',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // Step 1: Check if already exists in Neon by phone
      const variants = phoneVariants(phone);
      const existing = await sql`
        SELECT id, nama, phone, username, password FROM chat_customers
        WHERE phone = ANY(${variants})
        LIMIT 1
      `;

      if (existing.length > 0) {
        const user = existing[0];
        // Already has account — auto login
        return NextResponse.json({
          success: true,
          isNew: false,
          username: user.username,
          password: DEFAULT_PASSWORD,
          nama: user.nama,
          message: 'Akun ditemukan',
          user: {
            id: user.id,
            nama: user.nama,
            phone: user.phone,
            username: user.username,
            isDefaultPassword: user.password === DEFAULT_PASSWORD,
          },
        });
      }

      // Step 2: Check BSS MySQL for customer name (optional - may fail if MySQL down)
      let customerName = name; // default to provided name
      try {
        const placeholders = variants.map(() => '?').join(',');
        const bssCustomers = await queryMySQL<{ nama: string }>(`
          SELECT nama FROM customers
          WHERE wa IN (${placeholders})
             OR REPLACE(REPLACE(wa, '+', ''), '-', '') IN (${placeholders})
          LIMIT 1
        `, [...variants, ...variants]);

        if (bssCustomers.length > 0 && bssCustomers[0].nama) {
          customerName = bssCustomers[0].nama;
        }
      } catch (e) {
        // MySQL might be down — no problem, use provided name
        console.warn('[Account] BSS MySQL lookup failed, using provided name:', (e as Error).message?.slice(0, 60));
      }

      // Step 3: Generate username from name (format: name_3digits)
      const username = generateUsername(customerName);

      // Step 4: Insert into Neon
      const newUser = await sql`
        INSERT INTO chat_customers (nama, phone, username, password)
        VALUES (${customerName}, ${phone}, ${username}, ${DEFAULT_PASSWORD})
        RETURNING id, nama, phone, username, password
      `;

      return NextResponse.json({
        success: true,
        isNew: true,
        username: newUser[0].username,
        password: DEFAULT_PASSWORD,
        nama: newUser[0].nama,
        message: 'Username berhasil dibuat',
        user: {
          id: newUser[0].id,
          nama: newUser[0].nama,
          phone: newUser[0].phone,
          username: newUser[0].username,
          isDefaultPassword: true,
        },
      });
    }

    // ========== LOGIN ==========
    // Accepts username OR phone number in the 'username' field
    if (action === 'login') {
      const { username, password } = body;
      if (!username || !password) return NextResponse.json({ error: 'Username dan password diperlukan' }, { status: 400 });

      // Check if input looks like a phone number (starts with 0, 62, +62, or 8 and mostly digits)
      const cleanInput = username.replace(/[^0-9]/g, '');
      const isPhone = cleanInput.length >= 8 && /^[0-9+]/.test(username);

      let users;
      if (isPhone) {
        // Search by phone with all variants
        const variants = phoneVariants(username);
        users = await sql`
          SELECT id, nama, phone, username, password FROM chat_customers
          WHERE phone = ANY(${variants})
          LIMIT 1
        `;
      } else {
        // Search by username
        users = await sql`
          SELECT id, nama, phone, username, password FROM chat_customers
          WHERE username = ${username} LIMIT 1
        `;
      }

      // If not found by primary search, try the other method as fallback
      if (users.length === 0 && isPhone) {
        users = await sql`
          SELECT id, nama, phone, username, password FROM chat_customers
          WHERE username = ${username} LIMIT 1
        `;
      } else if (users.length === 0 && !isPhone) {
        const variants = phoneVariants(username);
        users = await sql`
          SELECT id, nama, phone, username, password FROM chat_customers
          WHERE phone = ANY(${variants})
          LIMIT 1
        `;
      }

      if (users.length === 0) {
        return NextResponse.json({ success: false, message: 'Username atau nomor HP tidak ditemukan' });
      }

      const user = users[0];
      if (user.password !== password) {
        return NextResponse.json({ success: false, message: 'Password salah' });
      }

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          nama: user.nama,
          phone: user.phone,
          username: user.username,
          isDefaultPassword: user.password === DEFAULT_PASSWORD,
        },
      });
    }

    // ========== CHANGE PASSWORD ==========
    if (action === 'change_password') {
      const { username, old_password, new_password } = body;
      if (!username || !old_password || !new_password) {
        return NextResponse.json({ error: 'All fields required' }, { status: 400 });
      }
      if (new_password.length < 6) {
        return NextResponse.json({ success: false, message: 'Password minimal 6 karakter' });
      }

      const users = await sql`
        SELECT id, password FROM chat_customers WHERE username = ${username} LIMIT 1
      `;

      if (users.length === 0) return NextResponse.json({ success: false, message: 'User not found' });
      if (users[0].password !== old_password) return NextResponse.json({ success: false, message: 'Password lama salah' });

      await sql`
        UPDATE chat_customers SET password = ${new_password}, updated_at = NOW()
        WHERE id = ${users[0].id}
      `;

      return NextResponse.json({ success: true, message: 'Password berhasil diubah' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Account error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
