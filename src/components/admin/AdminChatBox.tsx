'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, CheckCheck, Check, Image, Smile, Loader2, Paperclip, LayoutTemplate, Clock, MapPin, ArrowLeft, Search, ShoppingBag, X, Wrench, ShieldCheck, ChevronDown, ChevronUp, Package } from 'lucide-react';
import EmojiPicker from '@/components/shared/EmojiPicker';
import MediaViewer from '@/components/shared/MediaViewer';
import { initNotifications, showNotification } from '@/lib/notifications';
import { formatTimeWIB, getDateLabelWIB, getWibDateString } from '@/lib/date-utils';

interface ChatSession {
  id: number;
  customer_name: string;
  customer_phone: string;
  cs_name: string | null;
  cs_avatar: string | null;
  status: string;
  last_message: string | null;
  last_message_at: string;
  unread_admin: number;
}

interface Message {
  id: number;
  session_id: number;
  sender_type: 'customer' | 'admin';
  sender_name: string | null;
  message: string;
  message_type?: string;
  media_url?: string | null;
  media_name?: string | null;
  is_read: boolean;
  created_at: string;
}

interface PricelistProduct {
  produk_id: number;
  type: string;
  foto_filename: string;
  nama_kategori: string;
  nama_merek: string;
  variasi_count: number;
  price_min: number;
  price_max: number;
}

interface PricelistVariasi {
  id: number;
  nama_variasi: string;
  harga_jual: number;
  garansi_angka: number;
  garansi_satuan: string;
  deskripsi: string;
}

interface ServiceData {
  id: number;
  nota_dinas: string;
  jenis_item: string;
  merk_item: string;
  model_type: string;
  imei_sn: string;
  gejala_pilihan: string;
  kondisi_masuk: string;
  kelengkapan_pilihan: string;
  layanan_pilihan: string;
  layanan_dikerjakan: string;
  sparepart_dipakai: string;
  status: string;
  nominal_dp: number;
  total_biaya: number;
  sisa_bayar: number;
  total_bayar: number;
  diskon: number;
  keterangan: string;
  penginput_nama: string;
  teknisi_nama: string;
  tanggal_masuk: string;
  tanggal_proses: string;
  tanggal_selesai: string;
  tanggal_diambil: string;
  customer_nama: string;
  customer_wa: string;
  running_test: null | Record<string, string>;
  spareparts: SparepartDetail[];
}

interface SparepartDetail {
  id: number;
  nama_sparepart: string;
  kategori: string;
  merk: string;
  type: string;
  varian: string;
  harga: number;
  qty: number;
  subtotal: number;
  garansi_durasi: number;
  garansi_satuan: string;
  garansi_mulai: string;
  garansi_selesai: string;
  is_garansi_aktif: number;
}

interface AdminChatBoxProps {
  session: ChatSession;
  currentCs?: string | null;
  onBack?: () => void;
}

const svcStatusConfig: Record<string, { color: string; label: string; bg: string }> = {
  queue: { color: '#facc15', label: 'Antrian', bg: 'rgba(250,204,21,0.1)' },
  process: { color: '#60a5fa', label: 'Dikerjakan', bg: 'rgba(96,165,250,0.1)' },
  'running test': { color: '#c084fc', label: 'Running Test', bg: 'rgba(192,132,252,0.1)' },
  done: { color: '#4ade80', label: 'Selesai', bg: 'rgba(74,222,128,0.1)' },
  taken: { color: '#34d399', label: 'Diambil', bg: 'rgba(52,211,153,0.1)' },
  cancel: { color: '#f87171', label: 'Dibatalkan', bg: 'rgba(248,113,113,0.1)' },
  annul: { color: '#9ca3af', label: 'Annul', bg: 'rgba(156,163,175,0.1)' },
  pending: { color: '#fb923c', label: 'Pending', bg: 'rgba(251,146,60,0.1)' },
};

export default function AdminChatBox({ session, currentCs, onBack }: AdminChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isCustomerTyping, setIsCustomerTyping] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewMedia, setViewMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPricelist, setShowPricelist] = useState(false);
  const [plSearch, setPlSearch] = useState('');
  const [plProducts, setPlProducts] = useState<PricelistProduct[]>([]);
  const [plLoading, setPlLoading] = useState(false);
  const [showService, setShowService] = useState(false);
  const [svcData, setSvcData] = useState<ServiceData[]>([]);
  const [svcLoading, setSvcLoading] = useState(false);
  const [svcLoaded, setSvcLoaded] = useState(false);
  const [svcExpandedId, setSvcExpandedId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialLoadDoneRef = useRef(false);
  const isNearBottomRef = useRef(true);

  // Check if user is near the bottom of scroll (within 150px)
  const updateScrollPosition = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  }, []);

  // Only scroll to bottom if user is near the bottom, or force=true (initial load / own message)
  const scrollToBottom = useCallback((force = false) => {
    if (force || isNearBottomRef.current) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: force ? 'auto' : 'smooth' }), 50);
    }
  }, []);

  // Setup notification system
  useEffect(() => {
    initNotifications();
  }, []);

  const showChatNotification = useCallback((senderName: string, message: string) => {
    showNotification(`💬 ${senderName}`, message, {
      tag: `bss-chat-${session.id}`,
      sound: '/sound/notification-chat.mp3',
      url: '/admin',
    });
  }, [session.id]);

  // Load messages + polling
  useEffect(() => {
    const loadMessages = async () => {
      const res = await fetch(`/api/chat/messages?session_id=${session.id}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
        if (data.messages.length > 0) {
          lastMessageIdRef.current = Math.max(...data.messages.map((m: Message) => m.id));
        }
        scrollToBottom(true);
      }
      fetch('/api/chat/messages/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.id, reader_type: 'admin' }),
      });
      initialLoadDoneRef.current = true;
    };

    loadMessages();

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/chat/poll?session_id=${session.id}&last_id=${lastMessageIdRef.current}&user_type=admin`
        );
        const data = await res.json();

        if (data.messages?.length > 0) {
          setMessages(prev => {
            const existing = new Set(prev.map(m => m.id));
            const newMsgs = data.messages.filter((m: Message) => !existing.has(m.id));
            if (newMsgs.length > 0) {
              // Notify for new customer messages (not on initial load)
              if (initialLoadDoneRef.current) {
                const customerMsgs = newMsgs.filter((m: Message) => m.sender_type === 'customer');
                if (customerMsgs.length > 0) {
                  const lastMsg = customerMsgs[customerMsgs.length - 1];
                  showChatNotification(lastMsg.sender_name || session.customer_name, lastMsg.message);
                }
              }
              lastMessageIdRef.current = Math.max(...data.messages.map((m: Message) => m.id));
              return [...prev, ...newMsgs];
            }
            return prev;
          });
          scrollToBottom();
          fetch('/api/chat/messages/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: session.id, reader_type: 'admin' }),
          });
        }

        if (data.read_message_ids?.length > 0) {
          const readIds = new Set(data.read_message_ids);
          setMessages(prev => prev.map(m =>
            readIds.has(m.id) ? { ...m, is_read: true } : m
          ));
        }

        setIsCustomerTyping(data.is_typing || false);
      } catch (e) {
        console.error('Admin poll error:', e);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session.id, scrollToBottom, showChatNotification, session.customer_name]);

  // Resolve sender name: prefer currentCs, fallback to session.cs_name
  const senderName = currentCs || session.cs_name;

  // Log CS activity helper
  const logCsActivity = useCallback((action: string, metadata?: Record<string, unknown>) => {
    if (!senderName) return;
    fetch('/api/cs/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id, cs_name: senderName, action, metadata }),
    }).catch(() => {});
  }, [session.id, senderName]);

  // Load service data
  const loadServiceData = useCallback(async () => {
    if (!session.customer_phone) return;
    setSvcLoading(true);
    try {
      const res = await fetch(`/api/service/status?phone=${encodeURIComponent(session.customer_phone)}`);
      const data = await res.json();
      setSvcData(data.services || []);
      setSvcLoaded(true);
    } catch { setSvcData([]); }
    setSvcLoading(false);
  }, [session.customer_phone]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const msg = input.trim();
    setInput('');
    setShowEmoji(false);
    setShowTemplates(false);

    const tempMsg: Message = {
      id: Date.now(), session_id: session.id, sender_type: 'admin',
      sender_name: senderName, message: msg, message_type: 'text',
      is_read: false, created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);
    scrollToBottom(true);

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id, sender_type: 'admin',
          sender_name: senderName, message: msg,
        }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages(prev => prev.map(m => m.id === tempMsg.id ? data.message : m));
        lastMessageIdRef.current = Math.max(lastMessageIdRef.current, data.message.id);
      }
    } catch (e) { console.error('Send error:', e); }

    // Log activity
    logCsActivity('send_message', { message_preview: msg.substring(0, 50) });

    fetch('/api/chat/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id, user_type: 'admin', is_typing: false }),
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/chat/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();

      if (uploadData.url) {
        const tempMsg: Message = {
          id: Date.now(), session_id: session.id, sender_type: 'admin',
          sender_name: senderName,
          message: uploadData.messageType === 'image' ? '📷 Foto' : '🎥 Video',
          message_type: uploadData.messageType, media_url: uploadData.url,
          media_name: file.name, is_read: false, created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempMsg]);
        scrollToBottom(true);

        const res = await fetch('/api/chat/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: session.id, sender_type: 'admin', sender_name: senderName,
            message: uploadData.messageType === 'image' ? '📷 Foto' : '🎥 Video',
            message_type: uploadData.messageType, media_url: uploadData.url, media_name: file.name,
          }),
        });
        const data = await res.json();
        if (data.message) {
          setMessages(prev => prev.map(m => m.id === tempMsg.id ? data.message : m));
          lastMessageIdRef.current = Math.max(lastMessageIdRef.current, data.message.id);
        }
      }
    } catch (e) { console.error('Upload error:', e); }
    setUploading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    fetch('/api/chat/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id, user_type: 'admin', is_typing: true }),
    });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      fetch('/api/chat/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.id, user_type: 'admin', is_typing: false }),
      });
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // FAQ Templates
  const faqTemplates = [
    {
      icon: <Clock size={16} />,
      label: 'Jam Buka',
      text: 'Kami buka setiap hari Senin - Sabtu\nPukul 09.00 - 20.30 WIB\nHari Minggu Libur 😊',
    },
    {
      icon: <MapPin size={16} />,
      label: 'Share Lokasi',
      text: 'Berikut lokasi kami kak 📍\nhttps://google.com/maps?sca_esv=33649ae82cf5c68d&rlz=1C5GCEM_enID1163ID1163&sxsrf=ANbL-n6RK30dV52SDfeNw3WZrqYYxUG1ZQ:1771814266169&kgmid=/g/11xdmz60d4&shndl=30&kgs=be774980f6749f0f&shem=shrtsdl&um=1&ie=UTF-8&fb=1&gl=id&sa=X&geocode=KW274aHvZ9YtMS3B7UJjYSrM&daddr=Sebelah+indomaret+suwandak,+Jl.+Kapten+Suwandak+No.106,+Jogotrunan,+Kec.+Lumajang,+Kabupaten+Lumajang,+Jawa+Timur+56312',
    },
  ];

  const handleTemplateSelect = (text: string) => {
    setInput(text);
    setShowTemplates(false);
    inputRef.current?.focus();
  };

  // Pricelist search
  const plSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handlePlSearch = (q: string) => {
    setPlSearch(q);
    if (plSearchTimeoutRef.current) clearTimeout(plSearchTimeoutRef.current);
    if (q.length < 2) { setPlProducts([]); return; }
    plSearchTimeoutRef.current = setTimeout(async () => {
      setPlLoading(true);
      try {
        const res = await fetch(`/api/pricelist?action=search&q=${encodeURIComponent(q)}&limit=20`);
        const data = await res.json();
        setPlProducts(data.products || []);
      } catch { setPlProducts([]); }
      setPlLoading(false);
    }, 400);
  };

  const formatPrice = (n: number | null | undefined) => {
    if (n == null || isNaN(n)) return 'Rp 0';
    return 'Rp ' + Number(n).toLocaleString('id-ID');
  };

  const getProductImageUrl = (filename: string) => {
    if (!filename) return '';
    return `https://mybss.cloud/pricelist/assets/img/lcd/${filename.replace('.jpg', '.png')}`;
  };

  // Click product → fetch all variants → insert formatted text with frames into chat input
  const handlePlInsert = async (product: PricelistProduct) => {
    setPlLoading(true);
    try {
      const res = await fetch(`/api/pricelist?action=detail&id=${product.produk_id}`);
      const data = await res.json();
      const variants: PricelistVariasi[] = data.variasi || [];

      let text = `📱 ${product.nama_merek} ${product.type}\n`;
      text += `━━━━━━━━━━━━━━━━━━━━\n`;

      if (variants.length > 0) {
        variants.forEach((v, i) => {
          text += `\n▸ ${v.nama_variasi.toUpperCase()}\n`;
          text += `   💰 ${formatPrice(v.harga_jual)}\n`;
          if (v.garansi_angka > 0) {
            text += `   🛡️ Garansi ${v.garansi_angka} ${v.garansi_satuan}\n`;
          }
          if (v.deskripsi) {
            text += `   📝 ${v.deskripsi}\n`;
          }
          if (i < variants.length - 1) {
            text += `   ─────────────────\n`;
          }
        });
      } else {
        if (product.price_min === product.price_max) {
          text += `💰 ${formatPrice(product.price_min)}\n`;
        } else {
          text += `💰 ${formatPrice(product.price_min)} - ${formatPrice(product.price_max)}\n`;
        }
      }

      text += `\n━━━━━━━━━━━━━━━━━━━━`;

      setInput(text);
      setShowPricelist(false);
      inputRef.current?.focus();
      // Auto resize textarea after setting input
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.style.height = 'auto';
          inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
        }
      }, 50);
    } catch {
      // Fallback if detail fetch fails
      let text = `📱 ${product.nama_merek} ${product.type}\n`;
      text += `━━━━━━━━━━━━━━━━━━━━\n`;
      if (product.price_min === product.price_max) {
        text += `💰 ${formatPrice(product.price_min)}\n`;
      } else {
        text += `💰 ${formatPrice(product.price_min)} - ${formatPrice(product.price_max)}\n`;
      }
      text += `━━━━━━━━━━━━━━━━━━━━`;
      setInput(text);
      setShowPricelist(false);
      inputRef.current?.focus();
    }
    setPlLoading(false);
  };

  const formatTime = (dateStr: string) => formatTimeWIB(dateStr);

  const shouldShowDateSeparator = (idx: number): string | null => {
    const msgDateWib = getWibDateString(messages[idx].created_at);
    if (idx === 0) return getDateLabelWIB(messages[idx].created_at);
    const prevDateWib = getWibDateString(messages[idx - 1].created_at);
    if (msgDateWib !== prevDateWib) return getDateLabelWIB(messages[idx].created_at);
    return null;
  };

  const isFirstInGroup = (idx: number) => {
    if (idx === 0) return true;
    return messages[idx].sender_type !== messages[idx - 1].sender_type;
  };

  // Render message text with clickable URLs
  const renderMessageText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (/^https?:\/\//.test(part)) {
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer"
            style={{ color: '#5eb5f7', textDecoration: 'underline', wordBreak: 'break-all' }}
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
        <div onClick={() => setViewMedia({ url: msg.media_url!, type: 'image' })}
          style={{ cursor: 'pointer', borderRadius: 8, overflow: 'hidden', marginBottom: 4, maxWidth: 320 }}>
          <img src={msg.media_url} alt="" style={{ width: '100%', display: 'block', borderRadius: 8 }} />
        </div>
      );
    }
    if (msg.message_type === 'video' && msg.media_url) {
      return (
        <div onClick={() => setViewMedia({ url: msg.media_url!, type: 'video' })}
          style={{ cursor: 'pointer', borderRadius: 8, overflow: 'hidden', marginBottom: 4, maxWidth: 320, position: 'relative' }}>
          <video src={msg.media_url} style={{ width: '100%', display: 'block', borderRadius: 8 }} />
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        background: '#17212b', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12,
        flexShrink: 0, borderBottom: '1px solid #0e1621',
      }}>
        {onBack && (
          <button onClick={onBack} style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none',
            background: 'transparent', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: '#5eb5f7',
            flexShrink: 0, marginRight: -4,
          }}>
            <ArrowLeft size={22} />
          </button>
        )}
        <div style={{
          width: 42, height: 42, borderRadius: '50%', background: '#5eb5f7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 18, fontWeight: 700, flexShrink: 0,
        }}>
          {session.customer_name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#f5f5f5', fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {session.customer_name}
          </div>
          <div style={{ fontSize: 12, marginTop: 1 }}>
            {isCustomerTyping ? (
              <span style={{ color: '#5eb5f7' }}>sedang mengetik...</span>
            ) : (
              <span style={{ color: '#708499' }}>
                {session.customer_phone}{session.cs_name ? ` · CS: ${session.cs_name}` : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div ref={messagesContainerRef} onScroll={updateScrollPosition} style={{ flex: 1, overflowY: 'auto', background: '#0e1621', padding: onBack ? '12px 12px' : '12px 60px' }}>
        {messages.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{ textAlign: 'center', color: '#708499', fontSize: 14 }}>
              Belum ada pesan
            </div>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isOut = msg.sender_type === 'admin';
          const showTail = isFirstInGroup(idx);
          const isMedia = msg.message_type === 'image' || msg.message_type === 'video';
          const dateLabel = shouldShowDateSeparator(idx);

          return (
            <div key={msg.id}>
            {dateLabel && (
              <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0 8px' }}>
                <span style={{
                  background: '#182533', color: '#708499', fontSize: 12, fontWeight: 500,
                  padding: '5px 14px', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                }}>{dateLabel}</span>
              </div>
            )}
            <div className="msg-animate" style={{
              display: 'flex', justifyContent: isOut ? 'flex-end' : 'flex-start',
              marginBottom: showTail ? 8 : 2,
              paddingLeft: isOut ? 0 : (showTail ? 0 : 10),
              paddingRight: isOut ? (showTail ? 0 : 10) : 0,
            }}>
              <div className={showTail ? (isOut ? 'tg-bubble-out' : 'tg-bubble-in') : ''}
                style={{
                  maxWidth: '65%',
                  background: isOut ? '#2b5278' : '#182533',
                  borderRadius: 12,
                  padding: isMedia ? '4px 4px 4px' : '8px 12px 6px',
                  position: 'relative',
                }}>
                {!isOut && msg.sender_name && showTail && (
                  <div style={{ color: '#5eb5f7', fontSize: 12, fontWeight: 600, marginBottom: 2, padding: isMedia ? '0 4px' : 0 }}>
                    {msg.sender_name}
                  </div>
                )}

                {renderMediaContent(msg)}

                {(!isMedia || msg.message) && msg.message_type !== 'image' && msg.message_type !== 'video' && (
                  <div style={{ fontSize: 14, color: '#f5f5f5', lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
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
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{formatTime(msg.created_at)}</span>
                  {isOut && (
                    msg.is_read ? (
                      <CheckCheck size={14} style={{ color: '#5eb5f7', flexShrink: 0 }} />
                    ) : (
                      <Check size={14} style={{ color: '#708499', flexShrink: 0 }} />
                    )
                  )}
                </div>
              </div>
            </div>
            </div>
          );
        })}

        {isCustomerTyping && (
          <div style={{ display: 'flex', marginBottom: 4 }}>
            <div style={{ background: '#182533', borderRadius: 12, padding: '10px 14px', display: 'flex', gap: 4 }}>
              <span className="typing-dot-tg" />
              <span className="typing-dot-tg" />
              <span className="typing-dot-tg" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
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

      {/* Template Dropdown */}
      <div style={{ position: 'relative' }}>
        {showTemplates && (
          <div style={{
            position: 'absolute', bottom: '100%', left: 12, marginBottom: 6,
            background: '#17212b', borderRadius: 12, border: '1px solid #242f3d',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)', overflow: 'hidden', zIndex: 50,
            minWidth: 220,
          }}>
            <div style={{ padding: '10px 14px 6px', color: '#708499', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Template FAQ
            </div>
            {faqTemplates.map((t, i) => (
              <button key={i} onClick={() => handleTemplateSelect(t.text)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', border: 'none', cursor: 'pointer',
                  background: 'transparent', color: '#f5f5f5', fontSize: 13,
                  textAlign: 'left', transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#242f3d'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ color: '#5eb5f7', flexShrink: 0 }}>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pricelist Search Panel */}
      {showPricelist && (
        <div style={{
          background: '#17212b', borderTop: '1px solid #242f3d',
          maxHeight: 340, display: 'flex', flexDirection: 'column', flexShrink: 0,
        }}>
          {/* Pricelist Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
            borderBottom: '1px solid #0e1621',
          }}>
            <ShoppingBag size={18} color="#5eb5f7" />
            <span style={{ color: '#f5f5f5', fontSize: 13, fontWeight: 600, flex: 1 }}>Cari Pricelist</span>
            <button onClick={() => setShowPricelist(false)} style={{
              width: 28, height: 28, borderRadius: '50%', border: 'none',
              background: 'transparent', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: '#708499',
            }}>
              <X size={16} />
            </button>
          </div>
          {/* Search Input */}
          <div style={{ padding: '8px 14px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} color="#708499" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text" value={plSearch} onChange={e => handlePlSearch(e.target.value)}
                placeholder="Cari produk... (min 2 huruf)"
                autoFocus
                style={{
                  width: '100%', background: '#242f3d', borderRadius: 20, padding: '8px 12px 8px 32px',
                  fontSize: 13, border: 'none', outline: 'none', color: '#f5f5f5', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
          {/* Results */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
            {plLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                <Loader2 size={20} className="animate-spin" color="#5eb5f7" />
              </div>
            ) : plProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 16, color: '#708499', fontSize: 12 }}>
                {plSearch.length >= 2 ? 'Tidak ditemukan' : 'Ketik untuk mencari produk'}
              </div>
            ) : (
              plProducts.map(p => (
                <div key={p.produk_id}
                  onClick={() => handlePlInsert(p)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                    background: '#0e1621', borderRadius: 10, cursor: 'pointer',
                    transition: 'background 0.15s', marginBottom: 4,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#1a2736'}
                  onMouseLeave={e => e.currentTarget.style.background = '#0e1621'}
                >
                  {/* Product Image */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 8, background: '#242f3d',
                    overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {p.foto_filename ? (
                      <img src={getProductImageUrl(p.foto_filename)} alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <ShoppingBag size={20} color="#708499" />
                    )}
                  </div>
                  {/* Product Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#f5f5f5', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.nama_merek} {p.type}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span style={{ color: '#5eb5f7', fontSize: 12, fontWeight: 600 }}>
                        {p.price_min === p.price_max
                          ? formatPrice(p.price_min)
                          : `${formatPrice(p.price_min)} - ${formatPrice(p.price_max)}`
                        }
                      </span>
                      {p.variasi_count > 1 && (
                        <span style={{ color: '#708499', fontSize: 11 }}>· {p.variasi_count} variasi</span>
                      )}
                    </div>
                  </div>
                  {/* Send icon */}
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: '#2b5278', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', color: '#5eb5f7', flexShrink: 0,
                  }}>
                    <Send size={14} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Service Data Panel */}
      {showService && (
        <div style={{
          background: '#17212b', borderTop: '1px solid #242f3d',
          maxHeight: 380, display: 'flex', flexDirection: 'column', flexShrink: 0,
        }}>
          {/* Service Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
            borderBottom: '1px solid #0e1621',
          }}>
            <Wrench size={18} color="#f97316" />
            <span style={{ color: '#f5f5f5', fontSize: 13, fontWeight: 600, flex: 1 }}>Data Service</span>
            <button onClick={() => setShowService(false)} style={{
              width: 28, height: 28, borderRadius: '50%', border: 'none',
              background: 'transparent', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: '#708499',
            }}>
              <X size={16} />
            </button>
          </div>
          {/* Service Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {svcLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                <Loader2 size={20} className="animate-spin" color="#f97316" />
              </div>
            ) : (() => {
              if (svcData.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: 20, color: '#708499', fontSize: 12 }}>
                    {svcLoaded ? 'Tidak ada data service' : 'Memuat...'}
                  </div>
                );
              }
              return svcData.map(svc => {
                const cfg = svcStatusConfig[svc.status] || svcStatusConfig.queue;
                const isExpanded = svcExpandedId === svc.id;
                const activeWarranties = svc.spareparts.filter(sp => Number(sp.is_garansi_aktif) === 1);
                return (
                  <div key={svc.id} style={{ background: '#0e1621', borderRadius: 10, marginBottom: 6, overflow: 'hidden' }}>
                    <button
                      onClick={() => setSvcExpandedId(isExpanded ? null : svc.id)}
                      style={{
                        width: '100%', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
                        textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
                      }}
                    >
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%', background: cfg.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: cfg.color, flexShrink: 0,
                      }}>
                        <Wrench size={14} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <span style={{ color: '#f5f5f5', fontSize: 12, fontWeight: 600 }}>{svc.nota_dinas}</span>
                          <span style={{
                            fontSize: 9, padding: '1px 6px', borderRadius: 10, fontWeight: 500,
                            background: cfg.bg, color: cfg.color,
                          }}>{cfg.label}</span>
                          {activeWarranties.length > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 9, color: '#4ade80' }}>
                              <ShieldCheck size={10} /> Garansi
                            </span>
                          )}
                        </div>
                        <div style={{ color: '#708499', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {svc.merk_item} {svc.model_type} &bull; {svc.gejala_pilihan || '-'}
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={16} color="#708499" /> : <ChevronDown size={16} color="#708499" />}
                    </button>

                    {isExpanded && (
                      <div style={{ padding: '0 12px 12px' }}>
                        {/* Device Info */}
                        <div style={{ background: '#17212b', borderRadius: 8, padding: 10, marginBottom: 6 }}>
                          <div style={{ fontSize: 10, color: '#5eb5f7', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Info Perangkat</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px', fontSize: 11 }}>
                            <span style={{ color: '#708499' }}>Merk</span><span style={{ color: '#f5f5f5' }}>{svc.merk_item}</span>
                            <span style={{ color: '#708499' }}>Model</span><span style={{ color: '#f5f5f5' }}>{svc.model_type}</span>
                            {svc.imei_sn && <><span style={{ color: '#708499' }}>IMEI/SN</span><span style={{ color: '#f5f5f5' }}>{svc.imei_sn}</span></>}
                            <span style={{ color: '#708499' }}>Gejala</span><span style={{ color: '#f5f5f5' }}>{svc.gejala_pilihan || '-'}</span>
                            <span style={{ color: '#708499' }}>Layanan</span><span style={{ color: '#f5f5f5' }}>{svc.layanan_dikerjakan || svc.layanan_pilihan || '-'}</span>
                            <span style={{ color: '#708499' }}>Teknisi</span><span style={{ color: '#f5f5f5' }}>{svc.teknisi_nama || '-'}</span>
                          </div>
                        </div>
                        {/* Biaya */}
                        <div style={{ background: '#17212b', borderRadius: 8, padding: 10, marginBottom: 6 }}>
                          <div style={{ fontSize: 10, color: '#5eb5f7', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Biaya</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                            <span style={{ color: '#708499' }}>Total</span>
                            <span style={{ color: '#f5f5f5', fontWeight: 600 }}>Rp {(svc.total_biaya || 0).toLocaleString('id-ID')}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                            <span style={{ color: '#708499' }}>DP</span>
                            <span style={{ color: '#f5f5f5' }}>Rp {(svc.nominal_dp || 0).toLocaleString('id-ID')}</span>
                          </div>
                          <div style={{ borderTop: '1px solid #242f3d', paddingTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                            <span style={{ color: '#708499', fontWeight: 500 }}>Sisa</span>
                            <span style={{ color: '#facc15', fontWeight: 700 }}>Rp {(svc.sisa_bayar || 0).toLocaleString('id-ID')}</span>
                          </div>
                        </div>
                        {/* Timeline */}
                        <div style={{ background: '#17212b', borderRadius: 8, padding: 10, marginBottom: 6 }}>
                          <div style={{ fontSize: 10, color: '#5eb5f7', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Timeline</div>
                          {[
                            { l: 'Masuk', d: svc.tanggal_masuk },
                            { l: 'Proses', d: svc.tanggal_proses },
                            { l: 'Selesai', d: svc.tanggal_selesai },
                            { l: 'Diambil', d: svc.tanggal_diambil },
                          ].map((t, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, fontSize: 11 }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: t.d ? '#5eb5f7' : '#242f3d', flexShrink: 0 }} />
                              <span style={{ width: 48, color: t.d ? '#f5f5f5' : '#708499' }}>{t.l}</span>
                              <span style={{ color: t.d ? '#708499' : 'rgba(112,132,153,0.4)' }}>
                                {t.d ? new Date(t.d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                              </span>
                            </div>
                          ))}
                        </div>
                        {/* Spareparts + Garansi */}
                        {svc.spareparts.length > 0 && (
                          <div style={{ background: '#17212b', borderRadius: 8, padding: 10 }}>
                            <div style={{ fontSize: 10, color: '#5eb5f7', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Package size={10} /> Sparepart & Garansi
                            </div>
                            {svc.spareparts.map(sp => (
                              <div key={sp.id} style={{ background: '#0e1621', borderRadius: 6, padding: 8, marginBottom: 4 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ color: '#f5f5f5', fontSize: 11, fontWeight: 500 }}>{sp.nama_sparepart}</span>
                                  <span style={{ color: '#5eb5f7', fontSize: 11, fontWeight: 600 }}>Rp {(sp.subtotal || 0).toLocaleString('id-ID')}</span>
                                </div>
                                {sp.garansi_durasi > 0 && (
                                  <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <ShieldCheck size={10} color={Number(sp.is_garansi_aktif) === 1 ? '#4ade80' : '#f87171'} />
                                    <span style={{ fontSize: 10, color: Number(sp.is_garansi_aktif) === 1 ? '#4ade80' : '#f87171' }}>
                                      Garansi {sp.garansi_durasi} {sp.garansi_satuan}
                                      {sp.garansi_selesai && ` (s/d ${new Date(sp.garansi_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})`}
                                      {Number(sp.is_garansi_aktif) === 1 ? ' - AKTIF' : ' - Expired'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Keterangan */}
                        {svc.keterangan && (
                          <div style={{ background: '#17212b', borderRadius: 8, padding: 10, marginTop: 6 }}>
                            <div style={{ fontSize: 10, color: '#5eb5f7', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Keterangan</div>
                            <div style={{ fontSize: 11, color: '#f5f5f5', lineHeight: 1.4 }}>{svc.keterangan}</div>
                          </div>
                        )}
                        {/* Send to Chat buttons */}
                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                          <button
                            onClick={() => {
                              let text = `📋 INFO SERVICE #${svc.nota_dinas}\n`;
                              text += `━━━━━━━━━━━━━━━━━━━━\n`;
                              text += `📱 ${svc.merk_item} ${svc.model_type}\n`;
                              if (svc.imei_sn) text += `🔢 IMEI/SN: ${svc.imei_sn}\n`;
                              text += `🔧 Gejala: ${svc.gejala_pilihan || '-'}\n`;
                              text += `⚙️ Layanan: ${svc.layanan_dikerjakan || svc.layanan_pilihan || '-'}\n`;
                              text += `👨‍🔧 Teknisi: ${svc.teknisi_nama || '-'}\n`;
                              text += `━━━━━━━━━━━━━━━━━━━━\n`;
                              text += `📊 Status: ${cfg.label}\n`;
                              text += `💰 Total: Rp ${(svc.total_biaya || 0).toLocaleString('id-ID')}\n`;
                              text += `💵 DP: Rp ${(svc.nominal_dp || 0).toLocaleString('id-ID')}\n`;
                              text += `💳 Sisa: Rp ${(svc.sisa_bayar || 0).toLocaleString('id-ID')}\n`;
                              text += `━━━━━━━━━━━━━━━━━━━━\n`;
                              if (svc.tanggal_masuk) text += `📅 Masuk: ${new Date(svc.tanggal_masuk).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}\n`;
                              if (svc.tanggal_proses) text += `📅 Proses: ${new Date(svc.tanggal_proses).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}\n`;
                              if (svc.tanggal_selesai) text += `📅 Selesai: ${new Date(svc.tanggal_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}\n`;
                              if (svc.tanggal_diambil) text += `📅 Diambil: ${new Date(svc.tanggal_diambil).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}\n`;
                              if (svc.spareparts.length > 0) {
                                text += `━━━━━━━━━━━━━━━━━━━━\n`;
                                text += `🔩 Sparepart:\n`;
                                svc.spareparts.forEach(sp => {
                                  text += `  ▸ ${sp.nama_sparepart} - Rp ${(sp.subtotal || 0).toLocaleString('id-ID')}`;
                                  if (sp.garansi_durasi > 0) text += ` (Garansi ${sp.garansi_durasi} ${sp.garansi_satuan}${Number(sp.is_garansi_aktif) === 1 ? ' ✅' : ''})`;
                                  text += `\n`;
                                });
                              }
                              text += `━━━━━━━━━━━━━━━━━━━━`;
                              setInput(text);
                              setShowService(false);
                              inputRef.current?.focus();
                              setTimeout(() => {
                                if (inputRef.current) {
                                  inputRef.current.style.height = 'auto';
                                  inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
                                }
                              }, 50);
                            }}
                            style={{
                              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                              padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                              background: '#2b5278', color: '#5eb5f7', fontSize: 12, fontWeight: 600,
                            }}
                          >
                            <Send size={13} /> Kirim ke Chat
                          </button>
                          {activeWarranties.length > 0 && (
                            <button
                              onClick={() => {
                                let text = `🛡️ INFO GARANSI #${svc.nota_dinas}\n`;
                                text += `━━━━━━━━━━━━━━━━━━━━\n`;
                                text += `📱 ${svc.merk_item} ${svc.model_type}\n\n`;
                                text += `✅ Sparepart bergaransi aktif:\n`;
                                activeWarranties.forEach(sp => {
                                  text += `\n▸ ${sp.nama_sparepart}\n`;
                                  text += `  Garansi: ${sp.garansi_durasi} ${sp.garansi_satuan}\n`;
                                  if (sp.garansi_selesai) {
                                    const end = new Date(sp.garansi_selesai);
                                    const now = new Date();
                                    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                    text += `  Berlaku s/d: ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}\n`;
                                    text += `  Sisa: ${diffDays > 0 ? diffDays + ' hari lagi' : 'Sudah berakhir'}\n`;
                                  }
                                });
                                text += `\n━━━━━━━━━━━━━━━━━━━━`;
                                setInput(text);
                                setShowService(false);
                                inputRef.current?.focus();
                                setTimeout(() => {
                                  if (inputRef.current) {
                                    inputRef.current.style.height = 'auto';
                                    inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
                                  }
                                }, 50);
                              }}
                              style={{
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                background: 'rgba(74,222,128,0.12)', color: '#4ade80', fontSize: 12, fontWeight: 600,
                              }}
                            >
                              <ShieldCheck size={13} /> Kirim Garansi
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div style={{
        background: '#17212b', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8,
        flexShrink: 0, borderTop: '1px solid #0e1621',
      }}>
        <button onClick={() => { setShowTemplates(!showTemplates); setShowEmoji(false); setShowPricelist(false); setShowService(false); }}
          title="Template FAQ"
          style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none',
            background: 'transparent', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: showTemplates ? '#5eb5f7' : '#708499', flexShrink: 0,
          }}>
          <LayoutTemplate size={20} />
        </button>
        <button onClick={() => { setShowPricelist(!showPricelist); setShowEmoji(false); setShowTemplates(false); setShowService(false); }}
          title="Cari Pricelist"
          style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none',
            background: 'transparent', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: showPricelist ? '#5eb5f7' : '#708499', flexShrink: 0,
          }}>
          <ShoppingBag size={20} />
        </button>
        <button onClick={() => {
            const next = !showService;
            setShowService(next);
            setShowEmoji(false); setShowTemplates(false); setShowPricelist(false);
            if (next && !svcLoaded) loadServiceData();
          }}
          title="Data Service Customer"
          style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none',
            background: 'transparent', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: showService ? '#f97316' : '#708499', flexShrink: 0,
          }}>
          <Wrench size={20} />
        </button>
        <button onClick={() => { setShowEmoji(!showEmoji); setShowTemplates(false); setShowPricelist(false); setShowService(false); }}
          style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none',
            background: 'transparent', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: showEmoji ? '#5eb5f7' : '#708499', flexShrink: 0,
          }}>
          <Smile size={22} />
        </button>
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
          style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none',
            background: 'transparent', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: '#708499', flexShrink: 0,
          }}>
          {uploading ? <Loader2 size={20} className="animate-spin" /> : <Paperclip size={22} />}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFileUpload} />
        <div style={{ flex: 1, background: '#242f3d', borderRadius: 21, display: 'flex', alignItems: 'center', padding: '0 16px' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              handleInputChange(e as unknown as React.ChangeEvent<HTMLInputElement>);
              // Auto-resize textarea
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
            }}
            placeholder="Tulis pesan..."
            rows={1}
            style={{
              flex: 1, background: 'transparent', color: '#f5f5f5', padding: '10px 0',
              fontSize: 14, border: 'none', outline: 'none', resize: 'none',
              lineHeight: 1.4, maxHeight: 120, overflowY: 'auto',
              fontFamily: 'inherit',
            }}
          />
        </div>
        <button onClick={sendMessage} disabled={!input.trim()}
          style={{
            width: 40, height: 40, borderRadius: '50%', border: 'none',
            background: input.trim() ? '#5eb5f7' : 'transparent',
            color: input.trim() ? '#fff' : '#708499',
            cursor: input.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s', flexShrink: 0,
          }}>
          <Send size={18} />
        </button>
      </div>

      {/* Media Viewer */}
      {viewMedia && (
        <MediaViewer url={viewMedia.url} type={viewMedia.type} onClose={() => setViewMedia(null)} />
      )}
    </div>
  );
}
