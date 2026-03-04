'use client';

import { useState, useCallback } from 'react';
import { Lock, TrendingUp, Users, MessageCircle, DollarSign, BarChart3, Clock, UserCheck, ShieldCheck, Wrench, RefreshCw, Loader2 } from 'lucide-react';

// ====== Types ======
export interface AnalyticsData {
  csMessages: { cs_name: string; total_messages: number; total_sessions: number }[];
  csActivity: { cs_name: string; total_actions: number; unique_sessions: number; messages_sent: number; chats_opened: number }[];
  totalStats: {
    total_sessions: number; active_sessions: number; waiting_sessions: number;
    total_messages: number; customer_messages: number; admin_messages: number;
    total_contacts: number; total_registered_users: number;
  };
  dailyChats: { date: string; new_sessions: number }[];
  dailyMessages: { date: string; total: number; from_customer: number; from_admin: number }[];
  dailyNewUsers: { date: string; new_users: number }[];
  topCustomers: { customer_name: string; customer_phone: string; message_count: number }[];
  hourlyActivity: { hour_wib: number; day_of_week: number; msg_count: number }[];
  csResponseTime: { cs_name: string; replies: number; avg_response_seconds: number }[];
  serviceStats: { total: number; taken: number; totalRevenue: number; byStatus: { status: string; count: number }[] };
  topTransactors: { customer_nama: string; customer_wa: string; total_services: number; total_paid: number }[];
  monthlyRevenue: { month: string; revenue: number; count: number }[];
}

// ====== Section definitions ======
export const ANALYTICS_SECTIONS = [
  { id: 'overview', label: 'Overview', subtitle: 'Ringkasan keseluruhan' },
  { id: 'cs', label: 'Performa CS', subtitle: 'Pesan, respons, aktivitas' },
  { id: 'growth', label: 'Pertumbuhan', subtitle: 'Chat & pesan harian' },
  { id: 'heatmap', label: 'Heatmap Jam', subtitle: 'Aktivitas per jam (WIB)' },
  { id: 'customers', label: 'Top Customer', subtitle: 'Paling sering chat' },
  { id: 'transactions', label: 'Top Transaksi', subtitle: 'Pembayaran terbesar' },
  { id: 'revenue', label: 'Revenue', subtitle: 'Pendapatan 12 bulan' },
];

// ====== Helpers ======
const formatRp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${Math.round(seconds)}dtk`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}mnt`;
  return `${(seconds / 3600).toFixed(1)}jam`;
};

const svcStatusLabels: Record<string, string> = {
  queue: 'Antrian', process: 'Dikerjakan', 'running test': 'Running Test',
  done: 'Selesai', taken: 'Diambil', cancel: 'Dibatalkan', annul: 'Annul', pending: 'Pending',
};
const svcStatusColors: Record<string, string> = {
  queue: '#facc15', process: '#60a5fa', 'running test': '#c084fc',
  done: '#4ade80', taken: '#34d399', cancel: '#f87171', annul: '#9ca3af', pending: '#fb923c',
};
const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

// ====== Mini Bar Chart ======
const MiniBar = ({ value, max, color = '#5eb5f7' }: { value: number; max: number; color?: string }) => (
  <div style={{ flex: 1, background: '#0e1621', borderRadius: 4, height: 20, overflow: 'hidden' }}>
    <div style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.5s' }} />
  </div>
);

// ====== PIN Entry Component (for content area) ======
interface PinEntryProps {
  pin: string;
  onPinChange: (pin: string) => void;
  pinError: boolean;
  loading: boolean;
  onSubmit: () => void;
}

export function AnalyticsPinEntry({ pin, onPinChange, pinError, loading, onSubmit }: PinEntryProps) {
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e1621' }}>
      <div style={{ textAlign: 'center', maxWidth: 320, width: '90%' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', background: '#17212b',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
        }}>
          <Lock size={32} color="#5eb5f7" />
        </div>
        <div style={{ color: '#f5f5f5', fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Analytics</div>
        <div style={{ color: '#708499', fontSize: 13, marginBottom: 24 }}>Masukkan PIN untuk mengakses</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{
              width: 48, height: 56, borderRadius: 12,
              background: '#17212b', border: `2px solid ${pinError ? '#f87171' : pin.length > i ? '#5eb5f7' : '#242f3d'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 700, color: '#f5f5f5', transition: 'border 0.2s',
            }}>
              {pin[i] ? '\u2022' : ''}
            </div>
          ))}
        </div>
        {pinError && <div style={{ color: '#f87171', fontSize: 12, marginBottom: 12 }}>PIN salah, coba lagi</div>}
        <input
          type="number"
          value={pin}
          onChange={e => onPinChange(e.target.value.slice(0, 4))}
          onKeyDown={e => e.key === 'Enter' && onSubmit()}
          autoFocus
          inputMode="numeric"
          pattern="[0-9]*"
          style={{
            width: '100%', background: '#17212b', borderRadius: 12, padding: '14px 16px',
            fontSize: 18, border: '1px solid #242f3d', outline: 'none', color: '#f5f5f5',
            textAlign: 'center', letterSpacing: 8, boxSizing: 'border-box',
          }}
        />
        <button
          onClick={onSubmit}
          disabled={pin.length !== 4 || loading}
          style={{
            width: '100%', marginTop: 12, padding: '14px 0', borderRadius: 12,
            border: 'none', cursor: pin.length === 4 ? 'pointer' : 'default',
            background: pin.length === 4 ? '#5eb5f7' : '#242f3d',
            color: pin.length === 4 ? '#fff' : '#708499',
            fontSize: 14, fontWeight: 600, transition: 'all 0.2s',
          }}
        >
          {loading ? 'Memuat...' : 'Masuk'}
        </button>
      </div>
    </div>
  );
}

// ====== Section Content Component (for content area) ======
interface SectionContentProps {
  data: AnalyticsData;
  section: string;
  onRefresh: () => void;
}

export function AnalyticsSectionContent({ data, section, onRefresh }: SectionContentProps) {
  const stats = data.totalStats;
  const maxCsMsg = Math.max(...(data.csMessages.map(c => Number(c.total_messages)) || [1]));
  const maxDailyChat = Math.max(...(data.dailyChats.map(d => Number(d.new_sessions)) || [1]));
  const maxDailyMsg = Math.max(...(data.dailyMessages.map(d => Number(d.total)) || [1]));
  const maxHourly = Math.max(...(data.hourlyActivity.map(h => Number(h.msg_count)) || [1]));

  const sectionInfo = ANALYTICS_SECTIONS.find(s => s.id === section);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0e1621' }}>
      {/* Header */}
      <div style={{
        flexShrink: 0, background: '#17212b', padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #0e1621',
      }}>
        <BarChart3 size={22} color="#5eb5f7" />
        <div style={{ flex: 1 }}>
          <div style={{ color: '#f5f5f5', fontSize: 16, fontWeight: 700 }}>{sectionInfo?.label || 'Analytics'}</div>
          <div style={{ color: '#708499', fontSize: 11 }}>{sectionInfo?.subtitle || 'Data 30 hari terakhir'}</div>
        </div>
        <button onClick={onRefresh} style={{
          width: 36, height: 36, borderRadius: '50%', border: 'none',
          background: '#242f3d', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: '#5eb5f7',
        }}>
          <RefreshCw size={16} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {/* ===== OVERVIEW ===== */}
        {section === 'overview' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              {[
                { label: 'Total Chat', value: Number(stats.total_sessions), icon: <MessageCircle size={16} />, color: '#5eb5f7' },
                { label: 'Total Kontak', value: Number(stats.total_contacts), icon: <Users size={16} />, color: '#4ade80' },
                { label: 'User Terdaftar', value: Number(stats.total_registered_users), icon: <UserCheck size={16} />, color: '#a78bfa' },
                { label: 'Total Pesan', value: Number(stats.total_messages), icon: <MessageCircle size={16} />, color: '#fb923c' },
                { label: 'Pesan Customer', value: Number(stats.customer_messages), icon: <Users size={16} />, color: '#34d399' },
                { label: 'Pesan Admin', value: Number(stats.admin_messages), icon: <ShieldCheck size={16} />, color: '#60a5fa' },
                { label: 'Chat Aktif', value: Number(stats.active_sessions), icon: <MessageCircle size={16} />, color: '#4ade80' },
                { label: 'Menunggu', value: Number(stats.waiting_sessions), icon: <Clock size={16} />, color: '#facc15' },
              ].map((card, i) => (
                <div key={i} style={{ background: '#17212b', borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${card.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color, flexShrink: 0 }}>
                    {card.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#f5f5f5' }}>{card.value.toLocaleString('id-ID')}</div>
                    <div style={{ fontSize: 10, color: '#708499', marginTop: -2 }}>{card.label}</div>
                  </div>
                </div>
              ))}
            </div>
            {/* Service stats */}
            <div style={{ background: '#17212b', borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Wrench size={14} color="#f97316" />
                <span style={{ color: '#f5f5f5', fontSize: 12, fontWeight: 600 }}>Service & Transaksi</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#f5f5f5' }}>{data.serviceStats.total}</div>
                  <div style={{ fontSize: 10, color: '#708499' }}>Total Service</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#4ade80' }}>{data.serviceStats.taken}</div>
                  <div style={{ fontSize: 10, color: '#708499' }}>Selesai Bayar</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#facc15' }}>{formatRp(data.serviceStats.totalRevenue)}</div>
                  <div style={{ fontSize: 10, color: '#708499' }}>Total Revenue</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 10 }}>
                {data.serviceStats.byStatus.map(s => (
                  <span key={s.status} style={{
                    fontSize: 10, padding: '3px 8px', borderRadius: 8,
                    background: `${svcStatusColors[s.status] || '#9ca3af'}15`,
                    color: svcStatusColors[s.status] || '#9ca3af', fontWeight: 600,
                  }}>
                    {svcStatusLabels[s.status] || s.status}: {s.count}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ===== CS PERFORMANCE ===== */}
        {section === 'cs' && (
          <>
            {data.csMessages.map(cs => {
              const activity = data.csActivity.find(a => a.cs_name === cs.cs_name);
              const responseTime = data.csResponseTime.find(r => r.cs_name === cs.cs_name);
              return (
                <div key={cs.cs_name} style={{ background: '#17212b', borderRadius: 12, padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%', background: '#5eb5f7',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 16, fontWeight: 700,
                    }}>
                      {cs.cs_name.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#f5f5f5', fontSize: 14, fontWeight: 600 }}>{cs.cs_name}</div>
                      <div style={{ color: '#708499', fontSize: 11 }}>{Number(cs.total_sessions)} sesi chat</div>
                    </div>
                    {responseTime && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#4ade80' }}>
                          {formatDuration(Number(responseTime.avg_response_seconds))}
                        </div>
                        <div style={{ fontSize: 9, color: '#708499' }}>avg respon</div>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ color: '#708499', fontSize: 11, width: 70, flexShrink: 0 }}>{Number(cs.total_messages)} pesan</span>
                    <MiniBar value={Number(cs.total_messages)} max={maxCsMsg} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {activity && (
                      <>
                        <span style={{ fontSize: 10, color: '#5eb5f7', background: 'rgba(94,181,247,0.1)', padding: '2px 8px', borderRadius: 6 }}>
                          {Number(activity.chats_opened)} chat dibuka
                        </span>
                        <span style={{ fontSize: 10, color: '#4ade80', background: 'rgba(74,222,128,0.1)', padding: '2px 8px', borderRadius: 6 }}>
                          {Number(activity.messages_sent)} pesan dikirim
                        </span>
                      </>
                    )}
                    {responseTime && (
                      <span style={{ fontSize: 10, color: '#fb923c', background: 'rgba(251,146,60,0.1)', padding: '2px 8px', borderRadius: 6 }}>
                        {Number(responseTime.replies)} balasan
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {data.csMessages.length === 0 && (
              <div style={{ textAlign: 'center', padding: 20, color: '#708499', fontSize: 12 }}>Belum ada data CS</div>
            )}
          </>
        )}

        {/* ===== DAILY GROWTH ===== */}
        {section === 'growth' && (
          <>
            <div style={{ background: '#17212b', borderRadius: 12, padding: 14, marginBottom: 8 }}>
              <div style={{ color: '#f5f5f5', fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Chat Baru per Hari</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 120 }}>
                {data.dailyChats.slice(-14).map((d, i) => {
                  const h = maxDailyChat > 0 ? (Number(d.new_sessions) / maxDailyChat) * 100 : 0;
                  const dateStr = new Date(d.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 9, color: '#708499' }}>{Number(d.new_sessions)}</span>
                      <div style={{
                        width: '100%', height: `${Math.max(h, 4)}%`,
                        background: 'linear-gradient(to top, #5eb5f7, #3b82f6)', borderRadius: 3,
                      }} />
                      <span style={{ fontSize: 8, color: '#708499' }}>{dateStr}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ background: '#17212b', borderRadius: 12, padding: 14, marginBottom: 8 }}>
              <div style={{ color: '#f5f5f5', fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Pesan per Hari</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 120 }}>
                {data.dailyMessages.slice(-14).map((d, i) => {
                  const h = maxDailyMsg > 0 ? (Number(d.total) / maxDailyMsg) * 100 : 0;
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 9, color: '#708499' }}>{Number(d.total)}</span>
                      <div style={{
                        width: '100%', height: `${Math.max(h, 4)}%`,
                        background: 'linear-gradient(to top, #4ade80, #22c55e)', borderRadius: 3,
                      }} />
                    </div>
                  );
                })}
              </div>
            </div>
            {data.dailyNewUsers.length > 0 && (
              <div style={{ background: '#17212b', borderRadius: 12, padding: 14 }}>
                <div style={{ color: '#f5f5f5', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>User Baru per Hari</div>
                {data.dailyNewUsers.slice(-14).map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: '#708499', width: 50, flexShrink: 0 }}>
                      {new Date(d.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </span>
                    <MiniBar value={Number(d.new_users)} max={Math.max(...data.dailyNewUsers.map(x => Number(x.new_users)))} color="#a78bfa" />
                    <span style={{ fontSize: 10, color: '#f5f5f5', width: 20, textAlign: 'right' }}>{Number(d.new_users)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ===== HOURLY HEATMAP ===== */}
        {section === 'heatmap' && (
          <div style={{ background: '#17212b', borderRadius: 12, padding: 14, overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '30px repeat(24, 1fr)', gap: 2, minWidth: 500 }}>
              <div />
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} style={{ fontSize: 8, color: '#708499', textAlign: 'center' }}>{h}</div>
              ))}
              {dayNames.map((day, d) => (
                <div key={d} style={{ display: 'contents' }}>
                  <div style={{ fontSize: 9, color: '#708499', display: 'flex', alignItems: 'center' }}>{day}</div>
                  {Array.from({ length: 24 }, (_, h) => {
                    const entry = data.hourlyActivity.find(a => Number(a.day_of_week) === d && Number(a.hour_wib) === h);
                    const count = entry ? Number(entry.msg_count) : 0;
                    const intensity = maxHourly > 0 ? count / maxHourly : 0;
                    return (
                      <div key={h} title={`${day} ${h}:00 - ${count} pesan`} style={{
                        aspectRatio: '1', borderRadius: 2, minWidth: 10,
                        background: count === 0 ? '#0e1621' : `rgba(94,181,247,${0.15 + intensity * 0.85})`,
                      }} />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== TOP CUSTOMERS ===== */}
        {section === 'customers' && (
          <>
            {data.topCustomers.slice(0, 20).map((c, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                background: '#17212b', borderRadius: 10, marginBottom: 4,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: i < 3 ? ['#facc15', '#c0c0c0', '#cd7f32'][i] : '#242f3d',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: i < 3 ? '#000' : '#708499', fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#f5f5f5', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.customer_name}
                  </div>
                  <div style={{ color: '#708499', fontSize: 11 }}>{c.customer_phone}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: '#5eb5f7', fontSize: 14, fontWeight: 700 }}>{Number(c.message_count)}</div>
                  <div style={{ color: '#708499', fontSize: 9 }}>pesan</div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ===== TOP TRANSACTORS ===== */}
        {section === 'transactions' && (
          <>
            {data.topTransactors.map((t, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                background: '#17212b', borderRadius: 10, marginBottom: 4,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: i < 3 ? ['#facc15', '#c0c0c0', '#cd7f32'][i] : '#242f3d',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: i < 3 ? '#000' : '#708499', fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#f5f5f5', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.customer_nama}
                  </div>
                  <div style={{ color: '#708499', fontSize: 10 }}>{t.total_services} service</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: '#4ade80', fontSize: 13, fontWeight: 700 }}>{formatRp(t.total_paid)}</div>
                  <div style={{ color: '#708499', fontSize: 9 }}>total bayar</div>
                </div>
              </div>
            ))}
            {data.topTransactors.length === 0 && (
              <div style={{ textAlign: 'center', padding: 20, color: '#708499', fontSize: 12 }}>Belum ada data transaksi</div>
            )}
          </>
        )}

        {/* ===== MONTHLY REVENUE ===== */}
        {section === 'revenue' && (
          <div style={{ background: '#17212b', borderRadius: 12, padding: 14 }}>
            {data.monthlyRevenue.map((m, i) => {
              const maxRev = Math.max(...data.monthlyRevenue.map(x => x.revenue));
              const monthLabel = new Date(m.month + '-01').toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: '#708499', width: 60, flexShrink: 0 }}>{monthLabel}</span>
                  <MiniBar value={m.revenue} max={maxRev} color="#facc15" />
                  <span style={{ fontSize: 11, color: '#facc15', fontWeight: 600, width: 90, textAlign: 'right', flexShrink: 0 }}>
                    {formatRp(m.revenue)}
                  </span>
                </div>
              );
            })}
            {data.monthlyRevenue.length === 0 && (
              <div style={{ textAlign: 'center', padding: 16, color: '#708499', fontSize: 12 }}>Belum ada data revenue</div>
            )}
          </div>
        )}

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}

// ====== Default export (standalone mode - backwards compat) ======
export default function Analytics() {
  const [pin, setPin] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [section, setSection] = useState('overview');

  const fetchData = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?pin=${p}`);
      if (res.status === 401) { setPinError(true); setAuthenticated(false); setLoading(false); return; }
      const json = await res.json();
      setData(json);
      setAuthenticated(true);
      setPinError(false);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  if (!authenticated) {
    return (
      <AnalyticsPinEntry
        pin={pin}
        onPinChange={(v) => { setPin(v); setPinError(false); }}
        pinError={pinError}
        loading={loading}
        onSubmit={() => pin.length === 4 && fetchData(pin)}
      />
    );
  }

  if (loading || !data) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e1621' }}>
        <Loader2 size={32} color="#5eb5f7" className="animate-spin" />
      </div>
    );
  }

  return <AnalyticsSectionContent data={data} section={section} onRefresh={() => fetchData(pin)} />;
}
