'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Info, Globe, Users, Clock, Wrench, Share2, Plus, Trash2, Save,
  Loader2, Check, MapPin, Camera, ChevronDown, ChevronUp, GripVertical, X, Microscope,
  MessageSquare, Moon, BookImage, Upload, Image
} from 'lucide-react';

// ====== TYPES ======
interface About { title: string; description: string; }
interface WebLink { label: string; url: string; }
interface TeamMember { name: string; role: string; photo: string; }
interface ScheduleHour { day: string; open: string; close: string; }
interface Schedule { address: string; gps_lat: string; gps_lng: string; hours: ScheduleHour[]; }
interface ServiceItem { title: string; desc: string; }
interface EquipmentItem { photo: string; title: string; description: string; }
interface SocialMedia { platform: string; label: string; url: string; }
interface ChatHeader { title: string; logo_size: number; banner_url: string | null; offline_after: string; offline_before: string; offline_days: number[]; }
interface RamadanTheme { enabled: boolean; led_text: string; led_color: string; led_bg_color: string; start_date: string; end_date: string; }
interface StoryItem { id: number; image_url: string; media_type?: string; caption: string; link_url: string | null; duration: number; sort_order: number; expires_at: string; is_active: boolean; scheduled_at: string | null; auto_down_at: string | null; }

const SOCIAL_PLATFORMS = [
  { id: 'instagram', name: 'Instagram', color: '#E4405F' },
  { id: 'facebook', name: 'Facebook', color: '#1877F2' },
  { id: 'tiktok', name: 'TikTok', color: '#000000' },
  { id: 'youtube', name: 'YouTube', color: '#FF0000' },
  { id: 'twitter', name: 'X / Twitter', color: '#1DA1F2' },
  { id: 'whatsapp', name: 'WhatsApp', color: '#25D366' },
  { id: 'telegram', name: 'Telegram', color: '#0088cc' },
  { id: 'shopee', name: 'Shopee', color: '#EE4D2D' },
  { id: 'tokopedia', name: 'Tokopedia', color: '#42B549' },
];

// ====== STYLES ======
const cardStyle: React.CSSProperties = {
  background: '#17212b', borderRadius: 12, marginBottom: 12, overflow: 'hidden',
};
const cardHeaderStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '14px 16px', cursor: 'pointer', userSelect: 'none',
};
const cardBodyStyle: React.CSSProperties = { padding: '0 16px 16px' };
const inputStyle: React.CSSProperties = {
  width: '100%', background: '#242f3d', color: '#f5f5f5', border: '1px solid #2b3a4a',
  borderRadius: 8, padding: '10px 14px', fontSize: 13, outline: 'none', boxSizing: 'border-box',
};
const textareaStyle: React.CSSProperties = {
  ...inputStyle, minHeight: 80, resize: 'vertical' as const, fontFamily: 'inherit',
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, color: '#708499', fontWeight: 600, marginBottom: 4, display: 'block',
  textTransform: 'uppercase', letterSpacing: 0.3,
};
const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px',
  borderRadius: 8, border: 'none', background: '#5eb5f7', color: '#fff',
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const btnSecondary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
  borderRadius: 8, border: '1px solid #2b3a4a', background: '#242f3d', color: '#708499',
  fontSize: 12, fontWeight: 500, cursor: 'pointer',
};
const btnDanger: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', padding: '6px',
  borderRadius: 6, border: 'none', background: 'rgba(239,68,68,0.12)', color: '#ef4444',
  cursor: 'pointer',
};
const rowStyle: React.CSSProperties = {
  background: '#0e1621', borderRadius: 8, padding: 12, marginBottom: 8,
};

export default function SiteSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  // Data
  const [about, setAbout] = useState<About>({ title: '', description: '' });
  const [websites, setWebsites] = useState<WebLink[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [schedule, setSchedule] = useState<Schedule>({ address: '', gps_lat: '', gps_lng: '', hours: [] });
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [socialMedia, setSocialMedia] = useState<SocialMedia[]>([]);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [chatHeader, setChatHeader] = useState<ChatHeader>({
    title: 'BSS.id iphone & android repair', logo_size: 36, banner_url: null,
    offline_after: '20:30', offline_before: '09:00', offline_days: [0],
  });
  const [ramadanTheme, setRamadanTheme] = useState<RamadanTheme>({
    enabled: false, led_text: '', led_color: '#FFD700', led_bg_color: 'rgba(26,92,26,0.8)',
    start_date: '', end_date: '',
  });
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [storyUploading, setStoryUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const bannerFileRef = useRef<HTMLInputElement | null>(null);
  const storyFileRef = useRef<HTMLInputElement | null>(null);

  // Collapsed state
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ about: true });

  // GPS
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');

  // Upload refs
  const teamFileRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const equipFileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // Load all settings
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.settings) {
        if (data.settings.about) setAbout(data.settings.about);
        if (data.settings.websites) setWebsites(data.settings.websites);
        if (data.settings.team) setTeam(data.settings.team);
        if (data.settings.schedule) setSchedule(data.settings.schedule);
        if (data.settings.services) setServices(data.settings.services);
        if (data.settings.social_media) setSocialMedia(data.settings.social_media);
        if (data.settings.equipment) setEquipment(data.settings.equipment);
        if (data.settings.chat_header) setChatHeader(data.settings.chat_header);
        if (data.settings.ramadan_theme) setRamadanTheme(data.settings.ramadan_theme);
      }
      // Also load stories
      try {
        const sRes = await fetch('/api/stories');
        const sData = await sRes.json();
        if (sData.stories) setStories(sData.stories);
      } catch {}
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const saveKey = async (key: string, value: unknown) => {
    setSaving(key);
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      setSaved(key);
      setTimeout(() => setSaved(null), 2000);
    } catch (e) { console.error(e); }
    setSaving(null);
  };

  const handleTeamPhotoUpload = async (index: number, file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('csName', `team_${team[index].name}`);
      const res = await fetch('/api/cs/upload-avatar', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        const updated = [...team];
        updated[index] = { ...updated[index], photo: data.url };
        setTeam(updated);
      }
    } catch (e) { console.error(e); }
  };

  const handleEquipPhotoUpload = async (index: number, file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('csName', `equip_${index}`);
      const res = await fetch('/api/cs/upload-avatar', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        const updated = [...equipment];
        updated[index] = { ...updated[index], photo: data.url };
        setEquipment(updated);
      }
    } catch (e) { console.error(e); }
  };

  const getMyLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Browser tidak mendukung GPS');
      return;
    }
    setGpsLoading(true);
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSchedule({
          ...schedule,
          gps_lat: pos.coords.latitude.toFixed(7),
          gps_lng: pos.coords.longitude.toFixed(7),
        });
        setGpsLoading(false);
      },
      (err) => {
        setGpsError(
          err.code === 1 ? 'Izin GPS ditolak. Aktifkan di pengaturan browser.' :
          err.code === 2 ? 'GPS tidak tersedia.' :
          'Waktu habis, coba lagi.'
        );
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Banner upload
  const handleBannerUpload = async (file: File) => {
    setBannerUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload-banner', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        setChatHeader(prev => ({ ...prev, banner_url: data.url }));
      }
    } catch (e) { console.error(e); }
    setBannerUploading(false);
  };

  // Story upload (image or video)
  const handleStoryUpload = async (file: File) => {
    setStoryUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch('/api/stories/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (uploadData.url) {
        const mediaType = uploadData.media_type || (file.type.startsWith('video/') ? 'video' : 'image');
        // Default auto_down_at: next day 04:00 WIB
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yyyy = tomorrow.toISOString().split('T')[0];
        const autoDown = `${yyyy}T04:00:00+07:00`;
        const res = await fetch('/api/stories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: uploadData.url,
            media_type: mediaType,
            caption: '',
            duration: mediaType === 'video' ? 15 : 5,
            expires_at: autoDown,
            scheduled_at: null,
            auto_down_at: autoDown,
          }),
        });
        const data = await res.json();
        if (data.story) {
          setStories(prev => [...prev, data.story]);
        }
      }
    } catch (e) { console.error(e); }
    setStoryUploading(false);
  };

  // Delete story
  const handleDeleteStory = async (id: number) => {
    try {
      await fetch('/api/stories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setStories(prev => prev.filter(s => s.id !== id));
    } catch (e) { console.error(e); }
  };

  // Update story
  const handleUpdateStory = async (story: StoryItem) => {
    try {
      await fetch('/api/stories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: story.id,
          caption: story.caption,
          duration: story.duration,
          expires_at: story.auto_down_at || story.expires_at,
          scheduled_at: story.scheduled_at || null,
          auto_down_at: story.auto_down_at || null,
        }),
      });
    } catch (e) { console.error(e); }
  };

  const toggleSection = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const SaveBtn = ({ sKey, onClick }: { sKey: string; onClick: () => void }) => (
    <button onClick={onClick} disabled={saving === sKey}
      style={{ ...btnPrimary, background: saved === sKey ? '#4dcd5e' : '#5eb5f7', opacity: saving === sKey ? 0.7 : 1 }}>
      {saving === sKey ? <Loader2 size={14} className="animate-spin" /> : saved === sKey ? <Check size={14} /> : <Save size={14} />}
      {saving === sKey ? 'Menyimpan...' : saved === sKey ? 'Tersimpan!' : 'Simpan'}
    </button>
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <Loader2 size={24} color="#5eb5f7" className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
      <div style={{ padding: '8px 4px 12px', fontSize: 12, fontWeight: 600, color: '#708499', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Pengaturan Chat & Website
      </div>

      {/* ====== HEADER CHAT ====== */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle} onClick={() => toggleSection('chat_header')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(249,115,22,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={16} color="#f97316" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#f5f5f5' }}>Header Chat</span>
          </div>
          {expanded.chat_header ? <ChevronUp size={18} color="#708499" /> : <ChevronDown size={18} color="#708499" />}
        </div>
        {expanded.chat_header && (
          <div style={cardBodyStyle}>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Judul Header</label>
              <input type="text" value={chatHeader.title} onChange={e => setChatHeader({ ...chatHeader, title: e.target.value })}
                style={inputStyle} placeholder="BSS.id iphone & android repair" />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Offline Setelah (WIB)</label>
                <input type="text" value={chatHeader.offline_after} onChange={e => setChatHeader({ ...chatHeader, offline_after: e.target.value })}
                  style={inputStyle} placeholder="20:30" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Offline Sebelum (WIB)</label>
                <input type="text" value={chatHeader.offline_before} onChange={e => setChatHeader({ ...chatHeader, offline_before: e.target.value })}
                  style={inputStyle} placeholder="09:00" />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Hari Libur (angka hari: 0=Minggu, 6=Sabtu)</label>
              <input type="text" value={chatHeader.offline_days.join(',')}
                onChange={e => setChatHeader({ ...chatHeader, offline_days: e.target.value.split(',').map(Number).filter(n => !isNaN(n)) })}
                style={inputStyle} placeholder="0" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Banner Background</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {chatHeader.banner_url ? (
                  <div style={{ position: 'relative', width: 120, height: 60, borderRadius: 8, overflow: 'hidden', background: '#242f3d' }}>
                    <img src={chatHeader.banner_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={() => setChatHeader({ ...chatHeader, banner_url: null })}
                      style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={10} color="#fff" />
                    </button>
                  </div>
                ) : null}
                <button onClick={() => bannerFileRef.current?.click()} disabled={bannerUploading}
                  style={{ ...btnSecondary, color: '#f97316', borderColor: 'rgba(249,115,22,0.3)' }}>
                  {bannerUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {bannerUploading ? 'Uploading...' : 'Upload Banner'}
                </button>
                <input ref={bannerFileRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleBannerUpload(f); e.target.value = ''; }} />
              </div>
            </div>
            <SaveBtn sKey="chat_header" onClick={() => saveKey('chat_header', chatHeader)} />
          </div>
        )}
      </div>

      {/* ====== TEMA RAMADAN ====== */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle} onClick={() => toggleSection('ramadan_theme')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(234,179,8,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Moon size={16} color="#eab308" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#f5f5f5' }}>Tema Ramadan</span>
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 10,
              background: ramadanTheme.enabled ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
              color: ramadanTheme.enabled ? '#4ade80' : '#f87171',
              fontWeight: 600,
            }}>{ramadanTheme.enabled ? 'ON' : 'OFF'}</span>
          </div>
          {expanded.ramadan_theme ? <ChevronUp size={18} color="#708499" /> : <ChevronDown size={18} color="#708499" />}
        </div>
        {expanded.ramadan_theme && (
          <div style={cardBodyStyle}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={ramadanTheme.enabled}
                  onChange={e => setRamadanTheme({ ...ramadanTheme, enabled: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: '#5eb5f7' }} />
                Aktifkan Tema Ramadan
              </label>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Teks LED Berjalan</label>
              <input type="text" value={ramadanTheme.led_text}
                onChange={e => setRamadanTheme({ ...ramadanTheme, led_text: e.target.value })}
                style={inputStyle} placeholder="Selamat menunaikan ibadah puasa Ramadhan..." />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Warna Teks LED</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="color" value={ramadanTheme.led_color}
                    onChange={e => setRamadanTheme({ ...ramadanTheme, led_color: e.target.value })}
                    style={{ width: 32, height: 32, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'transparent' }} />
                  <input type="text" value={ramadanTheme.led_color}
                    onChange={e => setRamadanTheme({ ...ramadanTheme, led_color: e.target.value })}
                    style={{ ...inputStyle, flex: 1 }} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Warna BG LED</label>
                <input type="text" value={ramadanTheme.led_bg_color}
                  onChange={e => setRamadanTheme({ ...ramadanTheme, led_bg_color: e.target.value })}
                  style={inputStyle} placeholder="rgba(26,92,26,0.8)" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Tanggal Mulai</label>
                <input type="date" value={ramadanTheme.start_date}
                  onChange={e => setRamadanTheme({ ...ramadanTheme, start_date: e.target.value })}
                  style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Tanggal Selesai</label>
                <input type="date" value={ramadanTheme.end_date}
                  onChange={e => setRamadanTheme({ ...ramadanTheme, end_date: e.target.value })}
                  style={inputStyle} />
              </div>
            </div>
            <SaveBtn sKey="ramadan_theme" onClick={() => saveKey('ramadan_theme', ramadanTheme)} />
          </div>
        )}
      </div>

      {/* ====== STORIES ====== */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle} onClick={() => toggleSection('stories')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(236,72,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookImage size={16} color="#ec4899" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#f5f5f5' }}>Stories</span>
            <span style={{ fontSize: 11, color: '#708499' }}>({stories.length})</span>
          </div>
          {expanded.stories ? <ChevronUp size={18} color="#708499" /> : <ChevronDown size={18} color="#708499" />}
        </div>
        {expanded.stories && (
          <div style={cardBodyStyle}>
            {/* Story List */}
            {stories.map((s, i) => (
              <div key={s.id} style={{ ...rowStyle, display: 'flex', gap: 12 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 8, background: '#242f3d', overflow: 'hidden', flexShrink: 0,
                  position: 'relative',
                }}>
                  {s.media_type === 'video' ? (
                    <>
                      <video src={s.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                      <div style={{
                        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(0,0,0,0.3)',
                      }}>
                        <span style={{ color: '#fff', fontSize: 20 }}>▶</span>
                      </div>
                    </>
                  ) : (
                    <img src={s.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input type="text" value={s.caption} placeholder="Caption (opsional)"
                    onChange={e => {
                      const u = [...stories]; u[i] = { ...u[i], caption: e.target.value }; setStories(u);
                    }}
                    onBlur={() => handleUpdateStory(stories[i])}
                    style={inputStyle} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ ...labelStyle, fontSize: 9, marginBottom: 2 }}>Jadwal Naik</label>
                      <input type="datetime-local"
                        value={s.scheduled_at ? s.scheduled_at.slice(0, 16) : ''}
                        onChange={e => {
                          const u = [...stories]; u[i] = { ...u[i], scheduled_at: e.target.value || null }; setStories(u);
                        }}
                        onBlur={() => handleUpdateStory(stories[i])}
                        style={{ ...inputStyle, fontSize: 11, padding: '6px 8px' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ ...labelStyle, fontSize: 9, marginBottom: 2 }}>Jadwal Turun</label>
                      <input type="datetime-local"
                        value={s.auto_down_at ? s.auto_down_at.slice(0, 16) : ''}
                        onChange={e => {
                          const u = [...stories]; u[i] = { ...u[i], auto_down_at: e.target.value || null }; setStories(u);
                        }}
                        onBlur={() => handleUpdateStory(stories[i])}
                        style={{ ...inputStyle, fontSize: 11, padding: '6px 8px' }} />
                    </div>
                    <div style={{ flex: '0 0 60px' }}>
                      <label style={{ ...labelStyle, fontSize: 9, marginBottom: 2 }}>Durasi</label>
                      <input type="number" value={s.duration} min={1} max={30}
                        onChange={e => {
                          const u = [...stories]; u[i] = { ...u[i], duration: Number(e.target.value) }; setStories(u);
                        }}
                        onBlur={() => handleUpdateStory(stories[i])}
                        style={{ ...inputStyle, fontSize: 11, padding: '6px 8px' }} />
                    </div>
                  </div>
                </div>
                <button onClick={() => handleDeleteStory(s.id)} style={{ ...btnDanger, alignSelf: 'flex-start', marginTop: 4 }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <button onClick={() => storyFileRef.current?.click()} disabled={storyUploading}
                style={{ ...btnSecondary, color: '#ec4899', borderColor: 'rgba(236,72,153,0.3)' }}>
                {storyUploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {storyUploading ? 'Uploading...' : 'Tambah Story'}
              </button>
              <input ref={storyFileRef} type="file" accept="image/*,video/mp4,video/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleStoryUpload(f); e.target.value = ''; }} />
            </div>
          </div>
        )}
      </div>

      {/* ====== TENTANG BSS ====== */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle} onClick={() => toggleSection('about')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Info size={16} color="#3b82f6" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#f5f5f5' }}>Tentang BSS</span>
          </div>
          {expanded.about ? <ChevronUp size={18} color="#708499" /> : <ChevronDown size={18} color="#708499" />}
        </div>
        {expanded.about && (
          <div style={cardBodyStyle}>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Judul</label>
              <input type="text" value={about.title} onChange={e => setAbout({ ...about, title: e.target.value })}
                style={inputStyle} placeholder="BSS iPhone & Android Repair" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Deskripsi</label>
              <textarea value={about.description} onChange={e => setAbout({ ...about, description: e.target.value })}
                style={textareaStyle} placeholder="Deskripsi tentang BSS..." />
            </div>
            <SaveBtn sKey="about" onClick={() => saveKey('about', about)} />
          </div>
        )}
      </div>

      {/* ====== WEBSITE LINKS ====== */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle} onClick={() => toggleSection('websites')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(6,182,212,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Globe size={16} color="#06b6d4" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#f5f5f5' }}>Website Links</span>
            <span style={{ fontSize: 11, color: '#708499' }}>({websites.length})</span>
          </div>
          {expanded.websites ? <ChevronUp size={18} color="#708499" /> : <ChevronDown size={18} color="#708499" />}
        </div>
        {expanded.websites && (
          <div style={cardBodyStyle}>
            {websites.map((w, i) => (
              <div key={i} style={{ ...rowStyle, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                  <input type="text" value={w.label} placeholder="Label"
                    onChange={e => { const u = [...websites]; u[i] = { ...u[i], label: e.target.value }; setWebsites(u); }}
                    style={{ ...inputStyle, flex: '0 0 140px' }} />
                  <input type="text" value={w.url} placeholder="https://..."
                    onChange={e => { const u = [...websites]; u[i] = { ...u[i], url: e.target.value }; setWebsites(u); }}
                    style={{ ...inputStyle, flex: 1 }} />
                </div>
                <button onClick={() => setWebsites(websites.filter((_, j) => j !== i))} style={btnDanger}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <button onClick={() => setWebsites([...websites, { label: '', url: '' }])} style={btnSecondary}>
                <Plus size={14} /> Tambah Link
              </button>
              <SaveBtn sKey="websites" onClick={() => saveKey('websites', websites)} />
            </div>
          </div>
        )}
      </div>

      {/* ====== TIM BSS ====== */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle} onClick={() => toggleSection('team')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={16} color="#10b981" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#f5f5f5' }}>Tim BSS</span>
            <span style={{ fontSize: 11, color: '#708499' }}>({team.length})</span>
          </div>
          {expanded.team ? <ChevronUp size={18} color="#708499" /> : <ChevronDown size={18} color="#708499" />}
        </div>
        {expanded.team && (
          <div style={cardBodyStyle}>
            {team.map((m, i) => (
              <div key={i} style={{ ...rowStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Photo */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%', background: '#242f3d',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                  }}>
                    {m.photo ? (
                      <img src={m.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Users size={20} color="#708499" />
                    )}
                  </div>
                  <button onClick={() => teamFileRefs.current[i]?.click()}
                    style={{
                      position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: '50%',
                      background: '#242f3d', border: '2px solid #0e1621', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}>
                    <Camera size={10} color="#708499" />
                  </button>
                  <input ref={el => { teamFileRefs.current[i] = el; }} type="file" accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleTeamPhotoUpload(i, f); e.target.value = ''; }} />
                </div>
                {/* Fields */}
                <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                  <input type="text" value={m.name} placeholder="Nama"
                    onChange={e => { const u = [...team]; u[i] = { ...u[i], name: e.target.value }; setTeam(u); }}
                    style={{ ...inputStyle, flex: 1 }} />
                  <input type="text" value={m.role} placeholder="Jabatan"
                    onChange={e => { const u = [...team]; u[i] = { ...u[i], role: e.target.value }; setTeam(u); }}
                    style={{ ...inputStyle, flex: 1 }} />
                </div>
                <button onClick={() => setTeam(team.filter((_, j) => j !== i))} style={btnDanger}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <button onClick={() => setTeam([...team, { name: '', role: '', photo: '' }])} style={btnSecondary}>
                <Plus size={14} /> Tambah Anggota
              </button>
              <SaveBtn sKey="team" onClick={() => saveKey('team', team)} />
            </div>
          </div>
        )}
      </div>

      {/* ====== JADWAL BUKA ====== */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle} onClick={() => toggleSection('schedule')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(249,115,22,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={16} color="#f97316" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#f5f5f5' }}>Jadwal & Lokasi</span>
          </div>
          {expanded.schedule ? <ChevronUp size={18} color="#708499" /> : <ChevronDown size={18} color="#708499" />}
        </div>
        {expanded.schedule && (
          <div style={cardBodyStyle}>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Alamat Lengkap</label>
              <textarea value={schedule.address} onChange={e => setSchedule({ ...schedule, address: e.target.value })}
                style={{ ...textareaStyle, minHeight: 50 }} placeholder="Jl. Raya ..." />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Latitude (GPS)</label>
                <input type="text" value={schedule.gps_lat} onChange={e => setSchedule({ ...schedule, gps_lat: e.target.value })}
                  style={inputStyle} placeholder="-8.1333" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Longitude (GPS)</label>
                <input type="text" value={schedule.gps_lng} onChange={e => setSchedule({ ...schedule, gps_lng: e.target.value })}
                  style={inputStyle} placeholder="113.2247" />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <button onClick={getMyLocation} disabled={gpsLoading}
                style={{ ...btnSecondary, color: gpsLoading ? '#5eb5f7' : '#f97316', borderColor: gpsLoading ? '#2b3a4a' : 'rgba(249,115,22,0.3)' }}>
                {gpsLoading ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                {gpsLoading ? 'Mencari lokasi...' : 'Gunakan Lokasi Saya (GPS)'}
              </button>
              {schedule.gps_lat && schedule.gps_lng && (
                <a href={`https://www.google.com/maps?q=${schedule.gps_lat},${schedule.gps_lng}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ ...btnSecondary, textDecoration: 'none', color: '#5eb5f7', borderColor: 'rgba(94,181,247,0.3)' }}>
                  <MapPin size={14} /> Lihat di Maps
                </a>
              )}
              {gpsError && <span style={{ fontSize: 11, color: '#ef4444' }}>{gpsError}</span>}
            </div>

            <label style={{ ...labelStyle, marginBottom: 8 }}>Jam Operasional</label>
            {schedule.hours.map((h, i) => (
              <div key={i} style={{ ...rowStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="text" value={h.day} placeholder="Hari"
                  onChange={e => { const u = { ...schedule, hours: [...schedule.hours] }; u.hours[i] = { ...h, day: e.target.value }; setSchedule(u); }}
                  style={{ ...inputStyle, flex: '0 0 150px' }} />
                <input type="text" value={h.open} placeholder="Buka"
                  onChange={e => { const u = { ...schedule, hours: [...schedule.hours] }; u.hours[i] = { ...h, open: e.target.value }; setSchedule(u); }}
                  style={{ ...inputStyle, flex: 1 }} />
                <span style={{ color: '#708499', fontSize: 12 }}>-</span>
                <input type="text" value={h.close} placeholder="Tutup"
                  onChange={e => { const u = { ...schedule, hours: [...schedule.hours] }; u.hours[i] = { ...h, close: e.target.value }; setSchedule(u); }}
                  style={{ ...inputStyle, flex: 1 }} />
                <button onClick={() => { const u = { ...schedule, hours: schedule.hours.filter((_, j) => j !== i) }; setSchedule(u); }} style={btnDanger}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <button onClick={() => setSchedule({ ...schedule, hours: [...schedule.hours, { day: '', open: '', close: '' }] })} style={btnSecondary}>
                <Plus size={14} /> Tambah Jadwal
              </button>
              <SaveBtn sKey="schedule" onClick={() => saveKey('schedule', schedule)} />
            </div>
          </div>
        )}
      </div>

      {/* ====== LAYANAN BSS ====== */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle} onClick={() => toggleSection('services')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wrench size={16} color="#6366f1" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#f5f5f5' }}>Layanan BSS</span>
            <span style={{ fontSize: 11, color: '#708499' }}>({services.length})</span>
          </div>
          {expanded.services ? <ChevronUp size={18} color="#708499" /> : <ChevronDown size={18} color="#708499" />}
        </div>
        {expanded.services && (
          <div style={cardBodyStyle}>
            {services.map((s, i) => (
              <div key={i} style={{ ...rowStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                  <input type="text" value={s.title} placeholder="Judul layanan"
                    onChange={e => { const u = [...services]; u[i] = { ...u[i], title: e.target.value }; setServices(u); }}
                    style={{ ...inputStyle, flex: 1 }} />
                  <input type="text" value={s.desc} placeholder="Deskripsi singkat"
                    onChange={e => { const u = [...services]; u[i] = { ...u[i], desc: e.target.value }; setServices(u); }}
                    style={{ ...inputStyle, flex: 1 }} />
                </div>
                <button onClick={() => setServices(services.filter((_, j) => j !== i))} style={btnDanger}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <button onClick={() => setServices([...services, { title: '', desc: '' }])} style={btnSecondary}>
                <Plus size={14} /> Tambah Layanan
              </button>
              <SaveBtn sKey="services" onClick={() => saveKey('services', services)} />
            </div>
          </div>
        )}
      </div>

      {/* ====== SOCIAL MEDIA ====== */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle} onClick={() => toggleSection('social_media')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(236,72,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Share2 size={16} color="#ec4899" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#f5f5f5' }}>Social Media</span>
            <span style={{ fontSize: 11, color: '#708499' }}>({socialMedia.length})</span>
          </div>
          {expanded.social_media ? <ChevronUp size={18} color="#708499" /> : <ChevronDown size={18} color="#708499" />}
        </div>
        {expanded.social_media && (
          <div style={cardBodyStyle}>
            {socialMedia.map((sm, i) => {
              const plat = SOCIAL_PLATFORMS.find(p => p.id === sm.platform);
              return (
                <div key={i} style={{ ...rowStyle, display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Platform circle */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: plat ? `${plat.color}22` : '#242f3d',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <SocialIcon platform={sm.platform} size={18} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select value={sm.platform}
                      onChange={e => { const u = [...socialMedia]; u[i] = { ...u[i], platform: e.target.value }; setSocialMedia(u); }}
                      style={{ ...inputStyle, flex: '0 0 130px', cursor: 'pointer' }}>
                      <option value="">Pilih...</option>
                      {SOCIAL_PLATFORMS.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <input type="text" value={sm.label} placeholder="@username"
                      onChange={e => { const u = [...socialMedia]; u[i] = { ...u[i], label: e.target.value }; setSocialMedia(u); }}
                      style={{ ...inputStyle, flex: '0 0 140px' }} />
                    <input type="text" value={sm.url} placeholder="https://..."
                      onChange={e => { const u = [...socialMedia]; u[i] = { ...u[i], url: e.target.value }; setSocialMedia(u); }}
                      style={{ ...inputStyle, flex: 1 }} />
                  </div>
                  <button onClick={() => setSocialMedia(socialMedia.filter((_, j) => j !== i))} style={btnDanger}>
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <button onClick={() => setSocialMedia([...socialMedia, { platform: '', label: '', url: '' }])} style={btnSecondary}>
                <Plus size={14} /> Tambah Sosmed
              </button>
              <SaveBtn sKey="social_media" onClick={() => saveKey('social_media', socialMedia)} />
            </div>
          </div>
        )}
      </div>

      {/* ====== PERALATAN SERVICE ====== */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle} onClick={() => toggleSection('equipment')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(234,179,8,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Microscope size={16} color="#eab308" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#f5f5f5' }}>Peralatan Service</span>
            <span style={{ fontSize: 11, color: '#708499' }}>({equipment.length})</span>
          </div>
          {expanded.equipment ? <ChevronUp size={18} color="#708499" /> : <ChevronDown size={18} color="#708499" />}
        </div>
        {expanded.equipment && (
          <div style={cardBodyStyle}>
            {equipment.map((eq, i) => (
              <div key={i} style={{ ...rowStyle, display: 'flex', gap: 12 }}>
                {/* Photo */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: 10, background: '#242f3d',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                  }}>
                    {eq.photo ? (
                      <img src={eq.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Microscope size={28} color="#708499" />
                    )}
                  </div>
                  <button onClick={() => equipFileRefs.current[i]?.click()}
                    style={{
                      position: 'absolute', bottom: -4, right: -4, width: 22, height: 22, borderRadius: '50%',
                      background: '#242f3d', border: '2px solid #0e1621', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}>
                    <Camera size={10} color="#708499" />
                  </button>
                  <input ref={el => { equipFileRefs.current[i] = el; }} type="file" accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleEquipPhotoUpload(i, f); e.target.value = ''; }} />
                </div>
                {/* Fields */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input type="text" value={eq.title} placeholder="Nama alat (contoh: Mikroskop)"
                    onChange={e => { const u = [...equipment]; u[i] = { ...u[i], title: e.target.value }; setEquipment(u); }}
                    style={inputStyle} />
                  <textarea value={eq.description} placeholder="Deskripsi fungsi alat..."
                    onChange={e => { const u = [...equipment]; u[i] = { ...u[i], description: e.target.value }; setEquipment(u); }}
                    style={{ ...textareaStyle, minHeight: 50 }} />
                </div>
                <button onClick={() => setEquipment(equipment.filter((_, j) => j !== i))} style={{ ...btnDanger, alignSelf: 'flex-start', marginTop: 4 }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <button onClick={() => setEquipment([...equipment, { photo: '', title: '', description: '' }])} style={btnSecondary}>
                <Plus size={14} /> Tambah Alat
              </button>
              <SaveBtn sKey="equipment" onClick={() => saveKey('equipment', equipment)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ====== Social Media SVG Icons ======
export function SocialIcon({ platform, size = 20, color }: { platform: string; size?: number; color?: string }) {
  const p = SOCIAL_PLATFORMS.find(p => p.id === platform);
  const c = color || p?.color || '#708499';

  switch (platform) {
    case 'instagram':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="20" height="20" rx="5" stroke={c} strokeWidth="2"/>
          <circle cx="12" cy="12" r="5" stroke={c} strokeWidth="2"/>
          <circle cx="17.5" cy="6.5" r="1.5" fill={c}/>
        </svg>
      );
    case 'facebook':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={c}>
          <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/>
        </svg>
      );
    case 'tiktok':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={c}>
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48V13a8.2 8.2 0 005.58 2.18v-3.45a4.85 4.85 0 01-3.59-1.45V6.69h3.59z"/>
        </svg>
      );
    case 'youtube':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={c}>
          <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      );
    case 'twitter':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={c}>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      );
    case 'whatsapp':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={c}>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      );
    case 'telegram':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={c}>
          <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0h-.056zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      );
    case 'shopee':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={c}>
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-.385 4.5c1.69 0 3.07 1.343 3.14 3.017h1.718c.13 0 .236.106.236.236v.02a.236.236 0 01-.236.236h-9.46a.236.236 0 01-.236-.236v-.02c0-.13.106-.236.236-.236h1.717c.07-1.674 1.45-3.017 3.14-3.017zm0 .945c-1.15 0-2.09.9-2.17 2.033h4.34a2.177 2.177 0 00-2.17-2.033zM7.2 9.422h9.6c.198 0 .36.161.36.36v.18a7.2 7.2 0 01-3.38 6.104l.74 2.098a.36.36 0 01-.34.469H9.82a.36.36 0 01-.34-.469l.74-2.098A7.2 7.2 0 016.84 9.962v-.18c0-.199.162-.36.36-.36z"/>
        </svg>
      );
    case 'tokopedia':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={c}>
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4.8a2.4 2.4 0 012.4 2.4h-4.8A2.4 2.4 0 0112 4.8zM6 9.6h12c.663 0 1.2.537 1.2 1.2v6c0 1.988-1.612 3.6-3.6 3.6H8.4A3.6 3.6 0 014.8 16.8v-6c0-.663.537-1.2 1.2-1.2zm6 2.4a2.4 2.4 0 100 4.8 2.4 2.4 0 000-4.8zm0 1.2a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"/>
        </svg>
      );
    default:
      return <Globe size={size} color={c} />;
  }
}
