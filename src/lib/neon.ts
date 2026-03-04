import { neon, types } from '@neondatabase/serverless';

// Fix timezone: Prevent pg from parsing TIMESTAMP strings as local time.
// Without this, on a WIB (UTC+7) server, "2026-02-25 01:44:00" (UTC)
// gets wrongly interpreted as 01:44 WIB = 18:44 UTC, causing 7-hour shift.
// By returning raw strings, our client-side parseDbDate() correctly forces UTC.
types.setTypeParser(1114, (val: string) => val); // TIMESTAMP WITHOUT TIMEZONE
types.setTypeParser(1184, (val: string) => val); // TIMESTAMP WITH TIMEZONE

const sql = neon(process.env.DATABASE_URL!);

export default sql;

export async function initChatTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS cs_profiles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE,
      avatar_url TEXT DEFAULT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id SERIAL PRIMARY KEY,
      customer_name VARCHAR(150) NOT NULL,
      customer_phone VARCHAR(20) NOT NULL,
      cs_name VARCHAR(50) DEFAULT NULL,
      cs_avatar TEXT DEFAULT NULL,
      status VARCHAR(20) DEFAULT 'waiting',
      last_message TEXT DEFAULT NULL,
      last_message_at TIMESTAMP DEFAULT NOW(),
      unread_admin INT DEFAULT 0,
      unread_customer INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      session_id INT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('customer', 'admin')),
      sender_name VARCHAR(150) DEFAULT NULL,
      message TEXT NOT NULL,
      message_type VARCHAR(10) DEFAULT 'text',
      media_url TEXT DEFAULT NULL,
      media_name TEXT DEFAULT NULL,
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS typing_status (
      id SERIAL PRIMARY KEY,
      session_id INT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      user_type VARCHAR(10) NOT NULL CHECK (user_type IN ('customer', 'admin')),
      is_typing BOOLEAN DEFAULT false,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Add columns if not exist (for existing databases)
  await sql`
    DO $$ BEGIN
      ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(10) DEFAULT 'text';
      ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS media_url TEXT DEFAULT NULL;
      ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS media_name TEXT DEFAULT NULL;
      ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS sender_avatar TEXT DEFAULT NULL;
      ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS last_message_sender VARCHAR(150) DEFAULT NULL;
    EXCEPTION WHEN OTHERS THEN NULL;
    END $$;
  `;

  // CS Activity Log table (private analytics)
  await sql`
    CREATE TABLE IF NOT EXISTS cs_activity_log (
      id SERIAL PRIMARY KEY,
      session_id INT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      cs_name VARCHAR(50) NOT NULL,
      action VARCHAR(30) NOT NULL DEFAULT 'open_chat',
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Stories table (Instagram-like feature)
  await sql`
    CREATE TABLE IF NOT EXISTS stories (
      id SERIAL PRIMARY KEY,
      image_url TEXT NOT NULL,
      media_type VARCHAR(10) DEFAULT 'image',
      caption TEXT DEFAULT '',
      link_url TEXT DEFAULT NULL,
      duration INT DEFAULT 5,
      sort_order INT DEFAULT 0,
      expires_at TIMESTAMP NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_by VARCHAR(50) DEFAULT 'admin',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Add media_type column if not exists (for existing databases)
  await sql`
    DO $$ BEGIN
      ALTER TABLE stories ADD COLUMN IF NOT EXISTS media_type VARCHAR(10) DEFAULT 'image';
      ALTER TABLE stories ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP DEFAULT NULL;
      ALTER TABLE stories ADD COLUMN IF NOT EXISTS auto_down_at TIMESTAMP DEFAULT NULL;
    EXCEPTION WHEN OTHERS THEN NULL;
    END $$;
  `;

  // Site settings table (key-value store for admin-configurable content)
  await sql`
    CREATE TABLE IF NOT EXISTS site_settings (
      id SERIAL PRIMARY KEY,
      setting_key VARCHAR(100) NOT NULL UNIQUE,
      setting_value JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Seed CS profiles if empty
  const existing = await sql`SELECT COUNT(*) as count FROM cs_profiles`;
  if (Number(existing[0].count) === 0) {
    await sql`INSERT INTO cs_profiles (name) VALUES ('Toni'), ('Indri'), ('Lilla'), ('Memei'), ('Windy')`;
  }

  // Chat customers table (username/password stored in Neon, NOT in BSS MySQL)
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

  // Seed default site settings if empty
  const settingsCount = await sql`SELECT COUNT(*) as count FROM site_settings`;
  if (Number(settingsCount[0].count) === 0) {
    await sql`
      INSERT INTO site_settings (setting_key, setting_value) VALUES
      ('about', ${JSON.stringify({ title: 'BSS iPhone & Android Repair', description: 'Bengkel service HP terpercaya di Lumajang. Melayani perbaikan iPhone, Android, dan berbagai perangkat elektronik lainnya dengan teknisi berpengalaman dan spare part berkualitas.' })}::jsonb),
      ('websites', ${JSON.stringify([{ label: 'Website Utama', url: 'https://www.bsslumajang.site' }, { label: 'Pricelist Online', url: 'https://mybss.cloud/pricelist' }])}::jsonb),
      ('team', ${JSON.stringify([{ name: 'Toni', role: 'Teknisi Senior', photo: '' }, { name: 'Indri', role: 'Customer Service', photo: '' }, { name: 'Lilla', role: 'Customer Service', photo: '' }, { name: 'Memei', role: 'Customer Service', photo: '' }, { name: 'Windy', role: 'Customer Service', photo: '' }])}::jsonb),
      ('schedule', ${JSON.stringify({ address: 'Jl. Raya Lumajang', gps_lat: '-8.1333', gps_lng: '113.2247', hours: [{ day: 'Senin - Sabtu', open: '08:00', close: '17:00' }, { day: 'Minggu', open: 'Tutup', close: '' }] })}::jsonb),
      ('services', ${JSON.stringify([{ title: 'Ganti LCD / Touchscreen', desc: 'Original & KW dengan garansi' }, { title: 'Ganti Baterai', desc: 'Baterai original bergaransi' }, { title: 'Service Mesin', desc: 'Perbaikan IC, motherboard, dll' }, { title: 'Unlock & Bypass', desc: 'iCloud, FRP, pattern lock' }, { title: 'Recovery Data', desc: 'Pemulihan data dari HP rusak' }])}::jsonb),
      ('social_media', ${JSON.stringify([{ platform: 'instagram', label: 'bss.lumajang', url: 'https://instagram.com/bss.lumajang' }, { platform: 'facebook', label: 'BSS Lumajang', url: 'https://facebook.com/bss.lumajang' }, { platform: 'tiktok', label: '@bss.lumajang', url: 'https://tiktok.com/@bss.lumajang' }])}::jsonb),
      ('chat_header', ${JSON.stringify({ title: 'BSS.id iphone & android repair', logo_size: 36, banner_url: null, offline_after: '20:30', offline_before: '09:00', offline_days: [0] })}::jsonb),
      ('ramadan_theme', ${JSON.stringify({ enabled: true, led_text: 'Selamat menunaikan ibadah puasa Ramadhan 1447 H', led_color: '#FFD700', led_bg_color: 'rgba(26,92,26,0.8)', start_date: '2026-02-18', end_date: '2026-03-19' })}::jsonb)
    `;
  }
}
