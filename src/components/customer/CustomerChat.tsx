'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MoreVertical, Send, CheckCheck, LogOut, X, Smile, Image, Loader2 } from 'lucide-react';
import EmojiPicker from '@/components/shared/EmojiPicker';
import MediaViewer from '@/components/shared/MediaViewer';
import StoryViewer from '@/components/customer/StoryViewer';
import { initNotifications, showNotification } from '@/lib/notifications';
import { formatTimeWIB, getDateLabelWIB, getWibDateString } from '@/lib/date-utils';

interface Message {
  id: number;
  session_id: number;
  sender_type: 'customer' | 'admin';
  sender_name: string | null;
  sender_avatar?: string | null;
  message: string;
  message_type?: string;
  media_url?: string | null;
  media_name?: string | null;
  is_read: boolean;
  created_at: string;
}

interface Story {
  id: number;
  image_url: string;
  media_type?: string;
  caption: string;
  link_url: string | null;
  duration: number;
}

interface ChatHeaderSettings {
  title: string;
  logo_size: number;
  banner_url: string | null;
  offline_after: string;
  offline_before: string;
  offline_days: number[];
}

interface RamadanSettings {
  enabled: boolean;
  led_text: string;
  led_color: string;
  led_bg_color: string;
  start_date: string;
  end_date: string;
}

interface CustomerChatProps {
  customer: { name: string; phone: string };
  sessionId: number | null;
  onLogout: () => void;
  isLoggedIn: boolean;
  onRequireLogin: () => boolean;
}

// Schedule-based online check (WIB time)
function isOnlineBySchedule(settings: ChatHeaderSettings): boolean {
  const now = new Date();
  const wibOffset = 7 * 60;
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const wibMinutes = (utcMinutes + wibOffset) % (24 * 60);
  const wibTime = new Date(now.getTime() + wibOffset * 60 * 1000);
  const wibDay = wibTime.getUTCDay();
  if (settings.offline_days.includes(wibDay)) return false;
  const parseTime = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const offAfter = parseTime(settings.offline_after);
  const offBefore = parseTime(settings.offline_before);
  return wibMinutes >= offBefore && wibMinutes < offAfter;
}

function isRamadanActive(settings: RamadanSettings): boolean {
  if (!settings.enabled) return false;
  const now = new Date();
  const start = new Date(settings.start_date);
  const end = new Date(settings.end_date);
  end.setHours(23, 59, 59);
  return now >= start && now <= end;
}

export default function CustomerChat({ customer, sessionId, onLogout, isLoggedIn, onRequireLogin }: CustomerChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [csName, setCsName] = useState<string | null>(null);
  const [csAvatar, setCsAvatar] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewMedia, setViewMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [showStories, setShowStories] = useState(false);
  const [viewedStoryIds, setViewedStoryIds] = useState<Set<number>>(new Set());
  const [headerSettings, setHeaderSettings] = useState<ChatHeaderSettings>({
    title: 'BSS.id iphone & android repair', logo_size: 36, banner_url: null,
    offline_after: '20:30', offline_before: '09:00', offline_days: [0],
  });
  const [ramadanSettings, setRamadanSettings] = useState<RamadanSettings>({
    enabled: false, led_text: '', led_color: '#FFD700', led_bg_color: 'rgba(26,92,26,0.8)',
    start_date: '', end_date: '',
  });
  const [isOnline, setIsOnline] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialLoadDoneRef = useRef(false);
  const isNearBottomRef = useRef(true);

  const updateScrollPosition = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  }, []);

  const scrollToBottom = useCallback((force = false) => {
    if (force || isNearBottomRef.current) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: force ? 'auto' : 'smooth' }), 50);
    }
  }, []);

  // Setup notification system
  useEffect(() => {
    initNotifications();
  }, []);

  // Realtime settings polling (header, ramadan) — refresh every 10s so admin changes appear instantly
  useEffect(() => {
    const lastJson = { header: '', ramadan: '' };
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings');
        const data = await res.json();
        if (data.settings?.chat_header) {
          const json = JSON.stringify(data.settings.chat_header);
          if (json !== lastJson.header) { lastJson.header = json; setHeaderSettings(data.settings.chat_header); }
        }
        if (data.settings?.ramadan_theme) {
          const json = JSON.stringify(data.settings.ramadan_theme);
          if (json !== lastJson.ramadan) { lastJson.ramadan = json; setRamadanSettings(data.settings.ramadan_theme); }
        }
      } catch { /* use defaults */ }
    };
    fetchSettings();
    const interval = setInterval(fetchSettings, 10000);
    return () => clearInterval(interval);
  }, []);

  // Realtime stories polling — refresh every 10s so admin uploads appear instantly
  useEffect(() => {
    let lastStoriesJson = '';
    const fetchStories = async () => {
      try {
        const res = await fetch('/api/stories');
        const data = await res.json();
        const json = JSON.stringify(data.stories || []);
        if (json !== lastStoriesJson) {
          lastStoriesJson = json;
          setStories(data.stories || []);
        }
      } catch { /* silent */ }
    };
    fetchStories();
    const interval = setInterval(fetchStories, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load viewed story IDs from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bss_viewed_stories');
      if (saved) setViewedStoryIds(new Set(JSON.parse(saved)));
    } catch { /* ignore */ }
  }, []);

  // Update online status every 30 seconds
  useEffect(() => {
    const checkOnline = () => setIsOnline(isOnlineBySchedule(headerSettings));
    checkOnline();
    const interval = setInterval(checkOnline, 30000);
    return () => clearInterval(interval);
  }, [headerSettings]);

  const showChatNotification = useCallback((senderName: string, message: string) => {
    showNotification(senderName || 'CS BSS', message, {
      tag: 'bss-chat',
      sound: '/sound/notification-chat.mp3',
      url: '/',
    });
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/chat/poll?session_id=${sessionId}&last_id=${lastMessageIdRef.current}&user_type=customer`);
        const data = await res.json();
        if (data.messages?.length > 0) {
          setMessages(prev => {
            const existingSet = new Set(prev.map(m => m.id));
            const freshMsgs = data.messages.filter((m: Message) => !existingSet.has(m.id));
            if (freshMsgs.length > 0) {
              if (initialLoadDoneRef.current) {
                const adminMsgs = freshMsgs.filter((m: Message) => m.sender_type === 'admin');
                if (adminMsgs.length > 0) {
                  const lastAdminMsg = adminMsgs[adminMsgs.length - 1];
                  showChatNotification(lastAdminMsg.sender_name || 'CS BSS', lastAdminMsg.message);
                }
              }
              lastMessageIdRef.current = Math.max(...data.messages.map((m: Message) => m.id));
              const merged = [...prev, ...freshMsgs];
              const seen = new Set<number>();
              return merged.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
            }
            return prev;
          });
          scrollToBottom();
          fetch('/api/chat/messages/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, reader_type: 'customer' }),
          });
        }
        if (data.read_message_ids?.length > 0) {
          const readIds = new Set(data.read_message_ids);
          setMessages(prev => prev.map(m => readIds.has(m.id) ? { ...m, is_read: true } : m));
        }
        setIsTyping(data.is_typing || false);
        if (data.session) {
          setCsName(data.session.cs_name || null);
          setCsAvatar(data.session.cs_avatar || null);
        }
      } catch (e) { console.error('Poll error:', e); }
    };
    const loadMessages = async () => {
      const res = await fetch(`/api/chat/messages?session_id=${sessionId}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
        if (data.messages.length > 0) lastMessageIdRef.current = Math.max(...data.messages.map((m: Message) => m.id));
        scrollToBottom(true);
      }
      initialLoadDoneRef.current = true;
    };
    loadMessages();
    const interval = setInterval(poll, 1000);
    return () => clearInterval(interval);
  }, [sessionId, scrollToBottom, showChatNotification]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    if (!onRequireLogin()) return;
    if (!sessionId) return;

    const msg = input.trim();
    setInput('');
    setShowEmoji(false);

    const tempMsg: Message = { id: Date.now(), session_id: sessionId, sender_type: 'customer', sender_name: customer.name, message: msg, message_type: 'text', is_read: false, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, tempMsg]);
    scrollToBottom(true);
    try {
      const res = await fetch('/api/chat/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: sessionId, sender_type: 'customer', sender_name: customer.name, message: msg }) });
      const data = await res.json();
      if (data.message) {
        setMessages(prev => {
          const updated = prev.map(m => m.id === tempMsg.id ? data.message : m);
          const seen = new Set<number>();
          return updated.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
        });
        lastMessageIdRef.current = Math.max(lastMessageIdRef.current, data.message.id);
      }
    } catch (e) { console.error('Send error:', e); }
    fetch('/api/chat/typing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: sessionId, user_type: 'customer', is_typing: false }) });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!onRequireLogin()) return;
    if (!sessionId) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/chat/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();

      if (uploadData.url) {
        const tempMsg: Message = {
          id: Date.now(), session_id: sessionId, sender_type: 'customer', sender_name: customer.name,
          message: uploadData.messageType === 'image' ? '📷 Foto' : '🎥 Video',
          message_type: uploadData.messageType, media_url: uploadData.url, media_name: file.name,
          is_read: false, created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempMsg]);
        scrollToBottom(true);

        const res = await fetch('/api/chat/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId, sender_type: 'customer', sender_name: customer.name,
            message: uploadData.messageType === 'image' ? '📷 Foto' : '🎥 Video',
            message_type: uploadData.messageType, media_url: uploadData.url, media_name: file.name,
          }),
        });
        const data = await res.json();
        if (data.message) {
          setMessages(prev => {
            const updated = prev.map(m => m.id === tempMsg.id ? data.message : m);
            const seen = new Set<number>();
            return updated.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
          });
          lastMessageIdRef.current = Math.max(lastMessageIdRef.current, data.message.id);
        }
      }
    } catch (e) { console.error('Upload error:', e); }
    setUploading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (!sessionId) return;
    fetch('/api/chat/typing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: sessionId, user_type: 'customer', is_typing: true }) });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      fetch('/api/chat/typing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: sessionId, user_type: 'customer', is_typing: false }) });
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const handleInputFocus = () => {
    if (!isLoggedIn) {
      onRequireLogin();
    }
  };

  const handleStoriesClose = () => {
    setShowStories(false);
    const allIds = new Set(stories.map(s => s.id));
    setViewedStoryIds(allIds);
    localStorage.setItem('bss_viewed_stories', JSON.stringify([...allIds]));
  };

  const filteredMessages = searchQuery ? messages.filter(m => m.message.toLowerCase().includes(searchQuery.toLowerCase())) : messages;

  const formatTime = (dateStr: string) => formatTimeWIB(dateStr);

  const shouldShowDateSeparator = (idx: number): string | null => {
    const msgDateWib = getWibDateString(filteredMessages[idx].created_at);
    if (idx === 0) return getDateLabelWIB(filteredMessages[idx].created_at);
    const prevDateWib = getWibDateString(filteredMessages[idx - 1].created_at);
    if (msgDateWib !== prevDateWib) return getDateLabelWIB(filteredMessages[idx].created_at);
    return null;
  };

  const isFirstInGroup = (idx: number) => {
    if (idx === 0) return true;
    const cur = filteredMessages[idx];
    const prev = filteredMessages[idx - 1];
    if (cur.sender_type !== prev.sender_type) return true;
    // Also start new group if different CS sender
    if (cur.sender_type === 'admin' && cur.sender_name !== prev.sender_name) return true;
    return false;
  };

  const renderMessageText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (/^https?:\/\//.test(part)) {
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer"
            style={{ color: '#53bdeb', textDecoration: 'underline', wordBreak: 'break-all' }}
            onClick={e => e.stopPropagation()}
          >{part}</a>
        );
      }
      return part;
    });
  };

  const renderMediaContent = (msg: Message) => {
    if (msg.message_type === 'image' && msg.media_url) {
      return (
        <div
          onClick={() => setViewMedia({ url: msg.media_url!, type: 'image' })}
          style={{ cursor: 'pointer', borderRadius: 6, overflow: 'hidden', marginBottom: 4 }}
        >
          <img src={msg.media_url} alt="" style={{ maxWidth: 240, width: '100%', display: 'block', borderRadius: 6 }} />
        </div>
      );
    }
    if (msg.message_type === 'video' && msg.media_url) {
      return (
        <div
          onClick={() => setViewMedia({ url: msg.media_url!, type: 'video' })}
          style={{ cursor: 'pointer', borderRadius: 6, overflow: 'hidden', marginBottom: 4, position: 'relative' }}
        >
          <video src={msg.media_url} style={{ maxWidth: 240, width: '100%', display: 'block', borderRadius: 6 }} />
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20,
          }}>▶</div>
        </div>
      );
    }
    return null;
  };

  const hasStories = stories.length > 0;
  const showRamadan = isRamadanActive(ramadanSettings);
  const logoSize = headerSettings.logo_size || 36;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0b141a' }}>
      {/* CSS Animations */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        flexShrink: 0,
        background: headerSettings.banner_url
          ? `linear-gradient(rgba(31,44,52,0.35), rgba(31,44,52,0.5)), url(${headerSettings.banner_url}) center/cover`
          : '#1f2c34',
        padding: '8px 10px',
        display: 'flex', flexDirection: 'column',
        borderBottom: '1px solid #2a3942',
      }}>
        {/* Main header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Logo with Story Ring */}
          {hasStories ? (
            <div
              onClick={() => setShowStories(true)}
              style={{ position: 'relative', width: logoSize + 12, height: logoSize + 12, cursor: 'pointer', flexShrink: 0 }}
            >
              <svg width={logoSize + 12} height={logoSize + 12} style={{ position: 'absolute', top: 0, left: 0 }}>
                <defs>
                  <linearGradient id="storyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#A855F7" />
                    <stop offset="100%" stopColor="#3B82F6" />
                  </linearGradient>
                </defs>
                {(() => {
                  const count = stories.length;
                  const center = (logoSize + 12) / 2;
                  const r = center - 3;
                  const circ = 2 * Math.PI * r;
                  const gapDeg = count > 1 ? 8 : 0;
                  const segDeg = (360 - count * gapDeg) / count;
                  const segLen = (segDeg / 360) * circ;
                  return stories.map((s, i) => {
                    const viewed = viewedStoryIds.has(s.id);
                    const rot = -90 + i * (segDeg + gapDeg);
                    return (
                      <circle
                        key={s.id}
                        cx={center} cy={center} r={r}
                        fill="none"
                        stroke={viewed ? '#3b4a54' : 'url(#storyGrad)'}
                        strokeWidth={2.5}
                        strokeDasharray={`${segLen} ${circ - segLen}`}
                        strokeLinecap="round"
                        transform={`rotate(${rot} ${center} ${center})`}
                      />
                    );
                  });
                })()}
              </svg>
              <div style={{
                position: 'absolute', top: 4, left: 4,
                width: logoSize + 4, height: logoSize + 4, borderRadius: '50%',
                overflow: 'hidden', background: '#1f2c34',
              }}>
                <img src="/logo.png" alt="BSS" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>
          ) : (
            <div style={{
              width: logoSize + 6, height: logoSize + 6, borderRadius: '50%',
              overflow: 'hidden', flexShrink: 0, border: '2px solid #2a3942',
            }}>
              <img src="/logo.png" alt="BSS" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}

          {/* Title & Status */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#e9edef', fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {headerSettings.title}
            </div>
            <div style={{ fontSize: 12, marginTop: 1 }}>
              {isTyping ? (
                <span style={{ color: '#00a884' }}>sedang mengetik...</span>
              ) : isOnline ? (
                <span style={{ color: '#00a884' }}>online</span>
              ) : (
                <span style={{ color: '#8696a0' }}>offline</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button onClick={() => { setSearchMode(!searchMode); setSearchQuery(''); }} style={{ padding: 8, background: 'none', border: 'none', color: '#aebac1', cursor: 'pointer', borderRadius: '50%', display: 'flex' }}>
              {searchMode ? <X size={20} /> : <Search size={20} />}
            </button>
            {isLoggedIn && (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowMenu(!showMenu)} style={{ padding: 8, background: 'none', border: 'none', color: '#aebac1', cursor: 'pointer', borderRadius: '50%', display: 'flex' }}>
                  <MoreVertical size={20} />
                </button>
                {showMenu && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowMenu(false)} />
                    <div style={{ position: 'absolute', right: 0, top: 40, background: '#233138', borderRadius: 8, boxShadow: '0 4px 24px rgba(0,0,0,0.4)', zIndex: 50, padding: '6px 0', width: 180 }}>
                      <button onClick={() => { onLogout(); setShowMenu(false); }} style={{ width: '100%', padding: '12px 16px', textAlign: 'left', color: '#e9edef', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <LogOut size={16} /> Keluar
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Ramadan LED Scrolling Text */}
        {showRamadan && (
          <div style={{
            overflow: 'hidden', marginTop: 6, borderRadius: 4,
            background: ramadanSettings.led_bg_color, padding: '3px 0',
          }}>
            <div style={{
              display: 'inline-block', whiteSpace: 'nowrap',
              animation: 'marquee 18s linear infinite',
              color: ramadanSettings.led_color, fontSize: 11, fontWeight: 600,
              letterSpacing: 0.5, textShadow: '0 0 6px rgba(255,215,0,0.4)',
            }}>
              ☪ {ramadanSettings.led_text} ☪
            </div>
          </div>
        )}
      </div>

      {/* Search */}
      {searchMode && (
        <div style={{ background: '#1f2c34', padding: '0 12px 10px' }}>
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari pesan..." autoFocus
            style={{ width: '100%', background: '#2a3942', color: '#e9edef', borderRadius: 8, padding: '10px 16px', fontSize: 14, border: 'none', outline: 'none', boxSizing: 'border-box' }} />
        </div>
      )}

      {/* Messages area */}
      <div ref={messagesContainerRef} onScroll={updateScrollPosition} style={{
        flex: 1, overflowY: 'auto',
        position: 'relative',
        backgroundImage: 'url(/wallpaper.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          pointerEvents: 'none',
          zIndex: 0,
        }} />

        <div style={{ position: 'relative', zIndex: 1, padding: '8px 12px', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        {messages.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, textAlign: 'center', padding: '0 32px' }}>
            <div>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'rgba(0,168,132,0.15)',
                boxShadow: '0 4px 20px rgba(0,168,132,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                overflow: 'hidden',
              }}>
                <img src="/logo.png" alt="BSS" style={{ width: 52, height: 52, objectFit: 'contain' }} />
              </div>
              <div style={{ color: '#fff', fontSize: 17, fontWeight: 500, marginBottom: 6, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{headerSettings.title}</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 1.5, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                {isLoggedIn ? 'Kirim pesan untuk memulai percakapan dengan CS kami' : 'Silahkan chat, CS kami siap membantu 😊'}
              </div>
            </div>
          </div>
        )}

        {filteredMessages.map((msg, idx) => {
          const isOut = msg.sender_type === 'customer';
          const showTail = isFirstInGroup(idx);
          const isMedia = msg.message_type === 'image' || msg.message_type === 'video';
          const dateLabel = shouldShowDateSeparator(idx);
          return (
            <div key={`msg-${msg.id}`}>
            {dateLabel && (
              <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0 8px' }}>
                <span style={{
                  background: 'rgba(31,44,52,0.92)', color: '#8696a0', fontSize: 12, fontWeight: 500,
                  padding: '5px 14px', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                }}>{dateLabel}</span>
              </div>
            )}
            <div className="msg-animate" style={{
              display: 'flex', justifyContent: isOut ? 'flex-end' : 'flex-start',
              marginBottom: showTail ? 8 : 2,
              paddingLeft: isOut ? 0 : (showTail ? 0 : 36),
              paddingRight: isOut ? (showTail ? 0 : 10) : 0,
            }}>
              {/* CS Avatar on incoming messages */}
              {!isOut && showTail && (() => {
                const avatarSrc = msg.sender_avatar || (msg.sender_name === csName ? csAvatar : null);
                return (
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                    marginRight: 6, marginTop: 2, background: '#2a3942',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {avatarSrc ? (
                      <img src={avatarSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ color: '#8696a0', fontSize: 11, fontWeight: 700 }}>
                        {msg.sender_name?.charAt(0)?.toUpperCase() || 'C'}
                      </span>
                    )}
                  </div>
                );
              })()}
              <div className={showTail ? (isOut ? 'bubble-out' : 'bubble-in') : ''} style={{
                maxWidth: '78%',
                background: isOut ? '#005c4b' : 'rgba(31,44,52,0.95)',
                borderRadius: 10,
                padding: isMedia ? '4px 4px 4px' : '6px 8px 4px',
                position: 'relative',
                boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
              }}>
                {!isOut && msg.sender_name && showTail && (
                  <div style={{ color: '#00a884', fontSize: 12, fontWeight: 600, marginBottom: 2, padding: isMedia ? '0 4px' : 0 }}>{msg.sender_name}</div>
                )}

                {renderMediaContent(msg)}

                {(!isMedia || msg.message) && msg.message_type !== 'image' && msg.message_type !== 'video' && (
                  <div style={{ fontSize: 14.2, color: '#fff', lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {renderMessageText(msg.message)}
                    <span style={{ display: 'inline-block', width: isOut ? 68 : 48 }} />
                  </div>
                )}

                <div style={{
                  display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end',
                  marginTop: isMedia ? 2 : -16,
                  float: isMedia ? undefined : 'right',
                  marginLeft: isMedia ? 0 : 8,
                  padding: isMedia ? '0 4px 2px' : 0,
                }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{formatTime(msg.created_at)}</span>
                  {isOut && (
                    <CheckCheck size={16} style={{ color: msg.is_read ? '#53bdeb' : 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
                  )}
                </div>
              </div>
            </div>
            </div>
          );
        })}

        {isTyping && (
          <div style={{ display: 'flex', marginBottom: 4, paddingLeft: 36 }}>
            <div style={{ background: 'rgba(31,44,52,0.95)', borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 4, boxShadow: '0 1px 4px rgba(0,0,0,0.35)' }}>
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Emoji Picker */}
      <div style={{ position: 'relative' }}>
        {showEmoji && (
          <EmojiPicker
            theme="dark"
            onSelect={(emoji) => {
              setInput(prev => prev + emoji);
              inputRef.current?.focus();
            }}
            onClose={() => setShowEmoji(false)}
          />
        )}
      </div>

      {/* Input bar */}
      <div style={{ flexShrink: 0, background: '#1f2c34', padding: '8px 8px', display: 'flex', alignItems: 'center', gap: 6, borderTop: '1px solid #2a3942' }}>
        <button
          onClick={() => setShowEmoji(!showEmoji)}
          style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none',
            background: 'transparent', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: showEmoji ? '#00a884' : '#8696a0',
            flexShrink: 0,
          }}
        >
          <Smile size={22} />
        </button>
        <button
          onClick={() => {
            if (!isLoggedIn) { onRequireLogin(); return; }
            fileInputRef.current?.click();
          }}
          disabled={uploading}
          style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none',
            background: 'transparent', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: '#8696a0',
            flexShrink: 0,
          }}
        >
          {uploading ? <Loader2 size={20} className="animate-spin" /> : <Image size={22} />}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
        <div style={{ flex: 1, background: '#2a3942', borderRadius: 24, display: 'flex', alignItems: 'center', padding: '0 16px' }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            placeholder="Ketik pesan"
            style={{ flex: 1, background: 'transparent', color: '#e9edef', padding: '11px 0', fontSize: 14, border: 'none', outline: 'none' }}
          />
        </div>
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          style={{
            width: 42, height: 42, borderRadius: '50%', border: 'none',
            background: input.trim() ? '#00a884' : '#2a3942',
            color: input.trim() ? 'white' : '#8696a0',
            cursor: input.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s', flexShrink: 0,
          }}
        >
          <Send size={18} />
        </button>
      </div>

      {/* Media Viewer */}
      {viewMedia && (
        <MediaViewer url={viewMedia.url} type={viewMedia.type} onClose={() => setViewMedia(null)} />
      )}

      {/* Story Viewer */}
      {showStories && stories.length > 0 && (
        <StoryViewer stories={stories} onClose={handleStoriesClose} />
      )}
    </div>
  );
}
