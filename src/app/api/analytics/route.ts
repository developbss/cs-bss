import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/neon';
import { queryMySQL } from '@/lib/mysql';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const ANALYTICS_PIN = '0000';

export async function GET(req: NextRequest) {
  try {
    const pin = req.nextUrl.searchParams.get('pin');
    if (pin !== ANALYTICS_PIN) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    // ============== NEON (Chat Data) ==============

    // 1. CS Performance: messages sent per CS
    const csMessages = await sql`
      SELECT sender_name as cs_name,
        COUNT(*) as total_messages,
        COUNT(DISTINCT session_id) as total_sessions,
        MIN(created_at) as first_message,
        MAX(created_at) as last_message
      FROM chat_messages
      WHERE sender_type = 'admin' AND sender_name IS NOT NULL
      GROUP BY sender_name
      ORDER BY total_messages DESC
    `;

    // 2. CS Activity log summary
    const csActivity = await sql`
      SELECT cs_name,
        COUNT(*) as total_actions,
        COUNT(DISTINCT session_id) as unique_sessions,
        COUNT(*) FILTER (WHERE action = 'send_message') as messages_sent,
        COUNT(*) FILTER (WHERE action = 'open_chat') as chats_opened
      FROM cs_activity_log
      GROUP BY cs_name
      ORDER BY total_actions DESC
    `;

    // 3. Total stats
    const totalStats = await sql`
      SELECT
        (SELECT COUNT(*) FROM chat_sessions) as total_sessions,
        (SELECT COUNT(*) FROM chat_sessions WHERE status = 'active') as active_sessions,
        (SELECT COUNT(*) FROM chat_sessions WHERE status = 'waiting') as waiting_sessions,
        (SELECT COUNT(*) FROM chat_messages) as total_messages,
        (SELECT COUNT(*) FROM chat_messages WHERE sender_type = 'customer') as customer_messages,
        (SELECT COUNT(*) FROM chat_messages WHERE sender_type = 'admin') as admin_messages,
        (SELECT COUNT(DISTINCT customer_phone) FROM chat_sessions) as total_contacts,
        (SELECT COUNT(*) FROM chat_customers) as total_registered_users
    `;

    // 4. Daily chat growth (last 30 days)
    const dailyChats = await sql`
      SELECT DATE(created_at) as date,
        COUNT(*) as new_sessions
      FROM chat_sessions
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // 5. Daily messages (last 30 days)
    const dailyMessages = await sql`
      SELECT DATE(created_at) as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE sender_type = 'customer') as from_customer,
        COUNT(*) FILTER (WHERE sender_type = 'admin') as from_admin
      FROM chat_messages
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // 6. New users per day (last 30 days)
    const dailyNewUsers = await sql`
      SELECT DATE(created_at) as date,
        COUNT(*) as new_users
      FROM chat_customers
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // 7. Top chatting customers (most messages)
    const topCustomers = await sql`
      SELECT cs.customer_name, cs.customer_phone,
        COUNT(cm.id) as message_count,
        cs.created_at as first_chat
      FROM chat_sessions cs
      LEFT JOIN chat_messages cm ON cm.session_id = cs.id AND cm.sender_type = 'customer'
      GROUP BY cs.id, cs.customer_name, cs.customer_phone, cs.created_at
      ORDER BY message_count DESC
      LIMIT 20
    `;

    // 8. Hourly activity distribution (WIB) - for heatmap
    const hourlyActivity = await sql`
      SELECT EXTRACT(HOUR FROM created_at + INTERVAL '7 hours') as hour_wib,
        EXTRACT(DOW FROM created_at + INTERVAL '7 hours') as day_of_week,
        COUNT(*) as msg_count
      FROM chat_messages
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY hour_wib, day_of_week
      ORDER BY day_of_week, hour_wib
    `;

    // 9. Average response time per CS (time from customer message to admin reply)
    const csResponseTime = await sql`
      WITH customer_msgs AS (
        SELECT id, session_id, created_at as customer_sent
        FROM chat_messages
        WHERE sender_type = 'customer'
      ),
      admin_replies AS (
        SELECT DISTINCT ON (cm.id)
          cm.id as customer_msg_id,
          am.sender_name as cs_name,
          am.created_at as admin_sent,
          cm.customer_sent
        FROM customer_msgs cm
        INNER JOIN chat_messages am ON am.session_id = cm.session_id
          AND am.sender_type = 'admin'
          AND am.created_at > cm.customer_sent
        ORDER BY cm.id, am.created_at ASC
      )
      SELECT cs_name,
        COUNT(*) as replies,
        AVG(EXTRACT(EPOCH FROM (admin_sent - customer_sent))) as avg_response_seconds,
        MIN(EXTRACT(EPOCH FROM (admin_sent - customer_sent))) as min_response_seconds,
        MAX(EXTRACT(EPOCH FROM (admin_sent - customer_sent))) as max_response_seconds
      FROM admin_replies
      WHERE cs_name IS NOT NULL
      GROUP BY cs_name
      ORDER BY avg_response_seconds ASC
    `;

    // ============== MySQL (Service/Transaction Data) ==============

    let serviceStats = { total: 0, taken: 0, totalRevenue: 0, byStatus: [] as { status: string; count: number }[] };
    let topTransactors: { customer_nama: string; customer_wa: string; total_services: number; total_paid: number }[] = [];
    let monthlyRevenue: { month: string; revenue: number; count: number }[] = [];

    try {
      // Service status breakdown
      const statusBreakdown = await queryMySQL<{ status: string; cnt: number; total_revenue: number }>(`
        SELECT status, COUNT(*) as cnt,
          SUM(CASE WHEN status = 'taken' THEN total_bayar ELSE 0 END) as total_revenue
        FROM bss_service_antrian
        GROUP BY status
        ORDER BY cnt DESC
      `);

      let totalSvc = 0, takenSvc = 0, revenue = 0;
      const byStatus = statusBreakdown.map(r => {
        totalSvc += Number(r.cnt);
        if (r.status === 'taken') { takenSvc = Number(r.cnt); revenue = Number(r.total_revenue); }
        return { status: r.status, count: Number(r.cnt) };
      });
      serviceStats = { total: totalSvc, taken: takenSvc, totalRevenue: revenue, byStatus };

      // Top transactors (customers with most services, status=taken means paid)
      topTransactors = (await queryMySQL<{ customer_nama: string; customer_wa: string; total_services: number; total_paid: number }>(`
        SELECT c.nama as customer_nama, c.wa as customer_wa,
          COUNT(*) as total_services,
          SUM(CASE WHEN s.status = 'taken' THEN s.total_bayar ELSE 0 END) as total_paid
        FROM bss_service_antrian s
        LEFT JOIN customers c ON s.id_customer = c.id
        WHERE c.nama IS NOT NULL
        GROUP BY c.id, c.nama, c.wa
        ORDER BY total_paid DESC
        LIMIT 20
      `)).map(r => ({ ...r, total_services: Number(r.total_services), total_paid: Number(r.total_paid) }));

      // Monthly revenue (last 12 months)
      monthlyRevenue = (await queryMySQL<{ month: string; revenue: number; count: number }>(`
        SELECT DATE_FORMAT(tanggal_diambil, '%Y-%m') as month,
          SUM(total_bayar) as revenue,
          COUNT(*) as count
        FROM bss_service_antrian
        WHERE status = 'taken' AND tanggal_diambil IS NOT NULL
          AND tanggal_diambil >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(tanggal_diambil, '%Y-%m')
        ORDER BY month ASC
      `)).map(r => ({ month: r.month, revenue: Number(r.revenue), count: Number(r.count) }));
    } catch (e) {
      console.error('MySQL analytics error (non-fatal):', e);
    }

    return NextResponse.json({
      csMessages,
      csActivity,
      totalStats: totalStats[0] || {},
      dailyChats,
      dailyMessages,
      dailyNewUsers,
      topCustomers,
      hourlyActivity,
      csResponseTime,
      serviceStats,
      topTransactors,
      monthlyRevenue,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
