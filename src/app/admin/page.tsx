'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Settings, LogOut, Search, User, ArrowLeft, BarChart3, Lock, TrendingUp, UserCheck, Clock, Users, DollarSign } from 'lucide-react';
import AdminChatBox from '@/components/admin/AdminChatBox';
import CSSettings from '@/components/admin/CSSettings';
import SiteSettings from '@/components/admin/SiteSettings';
import { AnalyticsData, ANALYTICS_SECTIONS, AnalyticsPinEntry, AnalyticsSectionContent } from '@/components/admin/Analytics';
import { initNotifications, showNotification } from '@/lib/notifications';
import { parseDbDate, formatTimeWIB } from '@/lib/date-utils';


interface ChatSession {
  id: number;
  customer_name: string;
  customer_phone: string;
  cs_name: string | null;
  cs_avatar: string | null;
  status: string;
  last_message: string | null;
  last_message_sender: string | null;
  last_message_at: string;
  unread_admin: number;
  created_at: string;
}
interface CSProfile { id: number; name: string; avatar_url: string | null; is_active: boolean; }

export default function AdminDashboard() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [csProfiles, setCsProfiles] = useState<CSProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'settings' | 'analytics'>('chat');
  const [isMobile, setIsMobile] = useState(false);
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);
  const [currentCs, setCurrentCs] = useState<string | null>(null);
  const [showCsPicker, setShowCsPicker] = useState(false);
  const [pendingSessionId, setPendingSessionId] = useState<number | null>(null);
  const [analyticsPin, setAnalyticsPin] = useState('');
  const [analyticsAuthed, setAnalyticsAuthed] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsPinError, setAnalyticsPinError] = useState(false);
  const [analyticsSection, setAnalyticsSection] = useState('overview');
  const prevSessionIdsRef = useRef<Set<number>>(new Set());
  const prevUnreadMapRef = useRef<Map<number, number>>(new Map());
  const initialLoadDoneRef = useRef(false);
  const blinkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const originalTitleRef = useRef('BSS Customer Service');

  // Auth check + init + setup notifications + load CS identity
  useEffect(() => {
    fetch('/api/auth/check').then(res => { if (!res.ok) router.push('/admin/login'); });
    fetch('/api/init', { method: 'POST' }).catch(() => {});
    initNotifications();
    originalTitleRef.current = document.title || 'BSS Customer Service';
    // Load per-browser CS identity
    const saved = localStorage.getItem('bss_current_cs');
    if (saved) setCurrentCs(saved);
  }, [router]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Blinking tab title when there are unread messages
  const startBlinking = useCallback((count: number) => {
    if (blinkIntervalRef.current) return; // Already blinking
    let show = true;
    blinkIntervalRef.current = setInterval(() => {
      document.title = show ? `(${count}) Pesan Baru!` : originalTitleRef.current;
      show = !show;
    }, 1000);
  }, []);

  const stopBlinking = useCallback(() => {
    if (blinkIntervalRef.current) {
      clearInterval(blinkIntervalRef.current);
      blinkIntervalRef.current = null;
    }
    document.title = originalTitleRef.current;
  }, []);

  // Stop blinking when window gets focus
  useEffect(() => {
    const handleFocus = () => stopBlinking();
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      stopBlinking();
    };
  }, [stopBlinking]);

  // Load CS profiles
  useEffect(() => {
    fetch('/api/cs/profiles').then(res => res.json()).then(data => {
      if (data.profiles) setCsProfiles(data.profiles);
    });
  }, []);

  // Load sessions with polling + notifications
  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/sessions');
      const data = await res.json();
      if (data.sessions) {
        const newSessions = data.sessions as ChatSession[];

        // Detect new chats or new unread messages (not on initial load)
        if (initialLoadDoneRef.current) {
          for (const s of newSessions) {
            const isNewSession = !prevSessionIdsRef.current.has(s.id) && s.status === 'waiting';
            const prevUnread = prevUnreadMapRef.current.get(s.id) || 0;
            const hasNewUnread = s.unread_admin > prevUnread;

            if (isNewSession || hasNewUnread) {
              const title = isNewSession ? '💬 Chat Baru' : `💬 ${s.customer_name}`;
              const body = isNewSession
                ? `${s.customer_name} mengirim pesan baru`
                : s.last_message || 'Pesan baru';
              showNotification(title, body, {
                tag: `bss-admin-${s.id}`,
                sound: '/sound/notification-chat.mp3',
                url: '/admin',
              });
              break; // Only one notification per poll cycle
            }
          }
        }

        // Update tracking refs
        prevSessionIdsRef.current = new Set(newSessions.map(s => s.id));
        prevUnreadMapRef.current = new Map(newSessions.map(s => [s.id, s.unread_admin]));
        initialLoadDoneRef.current = true;

        // Blinking tab title for unread messages
        const totalUnread = newSessions.reduce((sum, s) => sum + (s.unread_admin || 0), 0);
        const waitingCount = newSessions.filter(s => s.status === 'waiting').length;
        const alertCount = totalUnread + waitingCount;
        if (alertCount > 0 && document.hidden) {
          startBlinking(alertCount);
        } else if (alertCount === 0) {
          stopBlinking();
        }

        // Update document title with unread count
        if (!document.hidden) {
          document.title = alertCount > 0
            ? `(${alertCount}) BSS Customer Service`
            : originalTitleRef.current;
        }

        setSessions(newSessions);
      }
    } catch (e) { console.error(e); }
  }, [startBlinking, stopBlinking]);

  useEffect(() => {
    loadSessions();
    const i = setInterval(loadSessions, 2000);
    return () => clearInterval(i);
  }, [loadSessions]);

  // Claim chat handler (atomic - prevents duplicate)
  const handleClaimChat = async (sessionId: number, csName: string) => {
    const res = await fetch(`/api/chat/sessions/${sessionId}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csName }),
    });
    if (res.status === 409) {
      // Already claimed by another CS
      loadSessions();
      return;
    }
    loadSessions();
  };

  const handleLogout = () => {
    document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    localStorage.removeItem('admin_token');
    router.push('/admin/login');
  };

  // Filter sessions
  const filtered = sessions.filter(s => {
    const ms = !searchQuery || s.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) || s.customer_phone.includes(searchQuery);
    const mf = activeFilter === 'all' || (activeFilter === 'unread' && (s.status === 'waiting' || s.unread_admin > 0));
    return ms && mf;
  });

  const unreadCount = sessions.filter(s => s.status === 'waiting' || s.unread_admin > 0).length;

  // Selected session object
  const selectedSession = selectedSessionId ? sessions.find(s => s.id === selectedSessionId) : null;

  // Format time for sidebar
  const fmtTime = (d: string) => {
    if (!d) return '';
    const dt = parseDbDate(d), diff = Date.now() - dt.getTime();
    if (diff < 60000) return 'baru';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return formatTimeWIB(d);
    return dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' });
  };

  // Log CS activity
  const logActivity = useCallback((sessionId: number, csName: string, action: string, metadata?: Record<string, unknown>) => {
    fetch('/api/cs/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, cs_name: csName, action, metadata }),
    }).catch(() => {});
  }, []);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async (p: string) => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`/api/analytics?pin=${p}`);
      if (res.status === 401) { setAnalyticsPinError(true); setAnalyticsAuthed(false); setAnalyticsLoading(false); return; }
      const json = await res.json();
      setAnalyticsData(json);
      setAnalyticsAuthed(true);
      setAnalyticsPinError(false);
    } catch (e) { console.error(e); }
    setAnalyticsLoading(false);
  }, []);

  // Handle CS picker selection
  const handleCsSelect = (csName: string) => {
    setCurrentCs(csName);
    localStorage.setItem('bss_current_cs', csName);
    setShowCsPicker(false);
    if (pendingSessionId !== null) {
      const session = sessions.find(s => s.id === pendingSessionId);
      if (session) {
        if (session.status === 'waiting') {
          handleClaimChat(pendingSessionId, csName);
        }
        logActivity(pendingSessionId, csName, 'open_chat', { status: session.status });
      }
      setSelectedSessionId(pendingSessionId);
      if (isMobile) setShowChatOnMobile(true);
      setPendingSessionId(null);
    }
  };

  // Handle session click - show CS picker if no identity set
  const handleSessionClick = (id: number) => {
    const session = sessions.find(s => s.id === id);
    if (!currentCs) {
      setPendingSessionId(id);
      setShowCsPicker(true);
      return;
    }
    // For waiting chats, claim with current CS
    if (session?.status === 'waiting') {
      handleClaimChat(id, currentCs);
    }
    logActivity(id, currentCs, 'open_chat', { status: session?.status });
    setSelectedSessionId(id);
    if (isMobile) setShowChatOnMobile(true);
  };

  const handleMobileBack = () => {
    setShowChatOnMobile(false);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0e1621' }}>

      {/* ======= LEFT SIDEBAR ======= */}
      <div style={{
        width: isMobile ? '100%' : 350,
        flexShrink: 0,
        background: '#17212b',
        display: isMobile && showChatOnMobile ? 'none' : 'flex',
        flexDirection: 'column',
        borderRight: isMobile ? 'none' : '1px solid #0e1621',
      }}>
        {/* Tab Bar (compact) */}
        <div style={{
          display: 'flex', alignItems: 'center', flexShrink: 0,
          borderBottom: '1px solid #0e1621',
        }}>
          {([
            { key: 'chat' as const, icon: <MessageCircle size={14} />, label: 'Chat' },
            { key: 'settings' as const, icon: <Settings size={14} />, label: 'Settings' },
            { key: 'analytics' as const, icon: <BarChart3 size={14} />, label: 'Analytics' },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                padding: '10px 2px', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                background: 'transparent',
                color: activeTab === tab.key ? '#5eb5f7' : '#708499',
                borderBottom: activeTab === tab.key ? '2px solid #5eb5f7' : '2px solid transparent',
                transition: 'all 0.2s',
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.key === 'chat' && unreadCount > 0 && (
                <span style={{
                  background: '#5eb5f7', color: '#fff', fontSize: 9, fontWeight: 700,
                  minWidth: 16, height: 16, borderRadius: 8, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                }}>{unreadCount}</span>
              )}
            </button>
          ))}
          {/* CS Identity Badge */}
          {currentCs && (
            <button
              onClick={() => { setPendingSessionId(null); setShowCsPicker(true); }}
              title={`Login sebagai: ${currentCs}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 3, padding: '4px 6px',
                borderRadius: 12, border: '1px solid #242f3d', background: '#242f3d',
                cursor: 'pointer', color: '#5eb5f7', fontSize: 10, fontWeight: 600,
                flexShrink: 0, margin: '0 2px', maxWidth: 80,
                overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
              }}
            >
              <User size={10} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentCs}</span>
            </button>
          )}
          <button
            onClick={handleLogout}
            style={{
              width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '10px 0', border: 'none', cursor: 'pointer', background: 'transparent',
              color: '#708499', flexShrink: 0,
            }}
            title="Logout"
          >
            <LogOut size={14} />
          </button>
        </div>

        {activeTab === 'chat' ? (
          <>
            {/* Search */}
            <div style={{ padding: '10px 12px 6px', flexShrink: 0 }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} color="#708499" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cari..."
                  style={{
                    width: '100%', background: '#242f3d', borderRadius: 22, padding: '9px 14px 9px 36px',
                    fontSize: 13, border: 'none', outline: 'none', color: '#f5f5f5', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Filter pills */}
            <div style={{ display: 'flex', gap: 6, padding: '4px 12px 8px', flexShrink: 0 }}>
              {(['all', 'unread'] as const).map(f => (
                <button key={f} onClick={() => setActiveFilter(f)}
                  style={{
                    padding: '5px 14px', borderRadius: 16, fontSize: 12, fontWeight: 600,
                    border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                    background: activeFilter === f ? '#5eb5f7' : '#242f3d',
                    color: activeFilter === f ? '#fff' : '#708499',
                  }}>
                  {f === 'all' ? 'Semua' : `Belum Dibaca${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
                </button>
              ))}
            </div>

            {/* Chat List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filtered.map(s => {
                const isSelected = selectedSessionId === s.id;
                const hasUnread = s.unread_admin > 0;
                const isWaiting = s.status === 'waiting';
                return (
                  <div
                    key={s.id}
                    onClick={() => handleSessionClick(s.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                      cursor: 'pointer', transition: 'background 0.15s',
                      background: isSelected ? '#2b5278' : 'transparent',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#202b36'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Avatar */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{
                        width: 46, height: 46, borderRadius: '50%', background: '#5eb5f7',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 18, fontWeight: 700,
                      }}>
                        {s.customer_name.charAt(0).toUpperCase()}
                      </div>
                      {/* Status dot */}
                      <div style={{
                        position: 'absolute', bottom: 0, right: 0, width: 12, height: 12,
                        borderRadius: '50%', border: '2px solid #17212b',
                        background: isWaiting ? '#ea580c' : '#4dcd5e',
                      }} />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{
                          fontSize: 14, fontWeight: hasUnread || isWaiting ? 700 : 400,
                          color: '#f5f5f5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {s.customer_name}
                        </span>
                        <span style={{
                          fontSize: 11, flexShrink: 0, marginLeft: 8,
                          color: hasUnread || isWaiting ? '#5eb5f7' : '#708499',
                        }}>
                          {fmtTime(s.last_message_at)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {s.last_message_sender && (
                            <span style={{ fontSize: 11, color: '#5eb5f7', marginRight: 4 }}>{s.last_message_sender}:</span>
                          )}
                          <span style={{
                            fontSize: 13, color: hasUnread ? '#f5f5f5' : '#708499',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            display: 'inline',
                          }}>
                            {s.last_message || (isWaiting ? 'Chat baru' : '-')}
                          </span>
                        </div>
                        {/* Unread badge */}
                        {(hasUnread || isWaiting) && (
                          <span style={{
                            background: '#5eb5f7', color: '#fff', fontSize: 10, fontWeight: 700,
                            minWidth: 20, height: 20, borderRadius: 10, display: 'flex',
                            alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 8,
                            padding: '0 5px',
                          }}>
                            {hasUnread ? s.unread_admin : '!'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#708499', fontSize: 13 }}>
                  {searchQuery ? 'Tidak ada hasil' : 'Belum ada chat masuk'}
                </div>
              )}
            </div>
          </>
        ) : activeTab === 'settings' ? (
          /* Settings Tab - CS Profiles + Site Settings link */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <CSSettings profiles={csProfiles} onUpdate={setCsProfiles} />
          </div>
        ) : (
          /* Analytics Tab - section navigation in sidebar */
          analyticsAuthed ? (
            <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
              <div style={{ padding: '8px 12px 12px', color: '#708499', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Sections</div>
              {ANALYTICS_SECTIONS.map(s => {
                const iconMap: Record<string, React.ReactNode> = {
                  overview: <TrendingUp size={16} />, cs: <UserCheck size={16} />, growth: <TrendingUp size={16} />,
                  heatmap: <Clock size={16} />, customers: <Users size={16} />, transactions: <DollarSign size={16} />, revenue: <DollarSign size={16} />,
                };
                return (
                  <button key={s.id} onClick={() => setAnalyticsSection(s.id)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    background: analyticsSection === s.id ? '#2b5278' : 'transparent',
                    border: 'none', cursor: 'pointer', borderRadius: 10, marginBottom: 2,
                    transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => { if (analyticsSection !== s.id) e.currentTarget.style.background = '#202b36'; }}
                    onMouseLeave={e => { if (analyticsSection !== s.id) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ color: analyticsSection === s.id ? '#5eb5f7' : '#708499', flexShrink: 0 }}>{iconMap[s.id]}</div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ color: analyticsSection === s.id ? '#f5f5f5' : '#adb5bd', fontSize: 13, fontWeight: analyticsSection === s.id ? 600 : 400 }}>{s.label}</div>
                      <div style={{ color: '#708499', fontSize: 10 }}>{s.subtitle}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', padding: 20 }}>
                <Lock size={28} color="#708499" style={{ margin: '0 auto 10px', display: 'block' }} />
                <div style={{ color: '#708499', fontSize: 12, lineHeight: 1.5 }}>Masukkan PIN<br />di panel kanan</div>
              </div>
            </div>
          )
        )}
      </div>

      {/* ======= RIGHT MAIN AREA ======= */}
      <div style={{
        flex: 1,
        display: isMobile && !showChatOnMobile ? 'none' : 'flex',
        flexDirection: 'column',
        background: '#0e1621',
        minWidth: 0,
        width: isMobile ? '100%' : undefined,
      }}>
        {activeTab === 'settings' ? (
          /* Site Settings Panel */
          <SiteSettings />
        ) : activeTab === 'analytics' ? (
          /* Analytics: PIN entry or section content */
          analyticsAuthed && analyticsData ? (
            <AnalyticsSectionContent data={analyticsData} section={analyticsSection} onRefresh={() => fetchAnalytics(analyticsPin)} />
          ) : (
            <AnalyticsPinEntry
              pin={analyticsPin}
              onPinChange={(v) => { setAnalyticsPin(v); setAnalyticsPinError(false); }}
              pinError={analyticsPinError}
              loading={analyticsLoading}
              onSubmit={() => analyticsPin.length === 4 && fetchAnalytics(analyticsPin)}
            />
          )
        ) : !selectedSession ? (
          /* Empty State */
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 100, height: 100, borderRadius: '50%', background: '#17212b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <MessageCircle size={44} color="#5eb5f7" />
              </div>
              <div style={{ color: '#f5f5f5', fontSize: 18, fontWeight: 500, marginBottom: 8 }}>
                BSS Chat Admin
              </div>
              <div style={{ color: '#708499', fontSize: 14, maxWidth: 320, lineHeight: 1.5 }}>
                Pilih chat dari sidebar untuk mulai percakapan dengan customer
              </div>
            </div>
          </div>
        ) : selectedSession.status === 'waiting' ? (
          /* Waiting chat - claiming in progress */
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              {isMobile && (
                <button onClick={handleMobileBack} style={{
                  position: 'absolute', top: 12, left: 12,
                  width: 36, height: 36, borderRadius: '50%', border: 'none',
                  background: 'transparent', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: '#5eb5f7',
                }}>
                  <ArrowLeft size={22} />
                </button>
              )}
              <div style={{
                width: 72, height: 72, borderRadius: '50%', background: '#17212b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <MessageCircle size={32} color="#5eb5f7" />
              </div>
              <div style={{ color: '#f5f5f5', fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
                Mengklaim chat...
              </div>
              <div style={{ color: '#708499', fontSize: 13 }}>
                Customer <strong style={{ color: '#f5f5f5' }}>{selectedSession.customer_name}</strong> sedang menunggu
              </div>
            </div>
          </div>
        ) : (
          /* Active Chat */
          <AdminChatBox key={selectedSession.id} session={selectedSession} currentCs={currentCs} onBack={isMobile ? handleMobileBack : undefined} />
        )}
      </div>

      {/* CS Picker Modal */}
      {showCsPicker && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => { setShowCsPicker(false); setPendingSessionId(null); }}>
          <div style={{
            background: '#17212b', borderRadius: 16, padding: 24, maxWidth: 400, width: '90%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: '#0e1621',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <User size={26} color="#5eb5f7" />
              </div>
              <div style={{ color: '#f5f5f5', fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                {currentCs ? 'Ganti CS' : 'Pilih CS'}
              </div>
              <div style={{ color: '#708499', fontSize: 12 }}>
                Siapa yang menggunakan browser ini?
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
              {csProfiles.filter(c => c.is_active).map(cs => (
                <button
                  key={cs.id}
                  onClick={() => handleCsSelect(cs.name)}
                  style={{
                    background: currentCs === cs.name ? '#2b5278' : '#0e1621',
                    border: currentCs === cs.name ? '2px solid #5eb5f7' : '1px solid #242f3d',
                    borderRadius: 12, padding: '14px 8px', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { if (currentCs !== cs.name) { e.currentTarget.style.background = '#1a2736'; e.currentTarget.style.borderColor = '#5eb5f7'; } }}
                  onMouseLeave={e => { if (currentCs !== cs.name) { e.currentTarget.style.background = '#0e1621'; e.currentTarget.style.borderColor = '#242f3d'; } }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', background: '#5eb5f7',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                  }}>
                    {cs.avatar_url ? (
                      <img src={cs.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>{cs.name.charAt(0)}</span>
                    )}
                  </div>
                  <span style={{ color: '#f5f5f5', fontSize: 12, fontWeight: 500 }}>{cs.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
