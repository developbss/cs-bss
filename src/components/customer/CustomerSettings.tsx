'use client';

import { useState, useRef, useEffect } from 'react';
import {
  User, Shield, Star, Crown, Info, Globe, Users, Clock, Wrench, ChevronRight,
  Camera, Lock, Eye, EyeOff, AlertTriangle, Loader2, Check, ChevronLeft,
  MapPin, ExternalLink, Phone, ArrowRight, Microscope
} from 'lucide-react';
import { SocialIcon } from '@/components/admin/SiteSettings';

// ====== TYPES ======
interface AccountUser {
  id: number; nama: string; phone: string; username: string; isDefaultPassword: boolean;
}
interface About { title: string; description: string; }
interface WebLink { label: string; url: string; }
interface TeamMember { name: string; role: string; photo: string; }
interface ScheduleHour { day: string; open: string; close: string; }
interface Schedule { address: string; gps_lat: string; gps_lng: string; hours: ScheduleHour[]; }
interface ServiceItem { title: string; desc: string; }
interface SocialMediaItem { platform: string; label: string; url: string; }
interface EquipmentItem { photo: string; title: string; description: string; }

interface CustomerSettingsProps {
  customer: { name: string; phone: string } | null;
  onLogin?: (name: string, phone: string) => void;
}

type SubPage = null | 'about' | 'websites' | 'team' | 'schedule' | 'services' | 'equipment';

// Platform colors
const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E4405F', facebook: '#1877F2', tiktok: '#f5f5f5', youtube: '#FF0000',
  twitter: '#1DA1F2', whatsapp: '#25D366', telegram: '#0088cc', shopee: '#EE4D2D', tokopedia: '#42B549',
};

export default function CustomerSettings({ customer, onLogin }: CustomerSettingsProps) {
  const [accountUser, setAccountUser] = useState<AccountUser | null>(null);
  const [isAccountUnlocked, setIsAccountUnlocked] = useState(false);
  const [subPage, setSubPage] = useState<SubPage>(null);

  // Auth states
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestResult, setRequestResult] = useState<{ username: string; password: string; message: string } | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Inline name/phone form (when user hasn't chatted yet)
  const [showNameForm, setShowNameForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formError, setFormError] = useState('');

  // Change password
  const [showChangePw, setShowChangePw] = useState(false);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [changePwMsg, setChangePwMsg] = useState('');
  const [changePwLoading, setChangePwLoading] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Site settings from API
  const [about, setAbout] = useState<About | null>(null);
  const [websites, setWebsites] = useState<WebLink[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [socialMedia, setSocialMedia] = useState<SocialMediaItem[]>([]);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Load site settings
  useEffect(() => {
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => {
        if (data.settings) {
          if (data.settings.about) setAbout(data.settings.about);
          if (data.settings.websites) setWebsites(data.settings.websites);
          if (data.settings.team) setTeam(data.settings.team);
          if (data.settings.schedule) setSchedule(data.settings.schedule);
          if (data.settings.services) setServices(data.settings.services);
          if (data.settings.social_media) setSocialMedia(data.settings.social_media);
          if (data.settings.equipment) setEquipment(data.settings.equipment);
        }
        setSettingsLoaded(true);
      })
      .catch(() => setSettingsLoaded(true));
  }, []);

  // Load saved avatar and account on mount
  useEffect(() => {
    const saved = localStorage.getItem('bss_avatar');
    if (saved) setAvatarUrl(saved);
    const savedAccount = localStorage.getItem('bss_account');
    if (savedAccount) {
      try {
        const acc = JSON.parse(savedAccount);
        setAccountUser(acc);
        setIsAccountUnlocked(true);
      } catch { /* ignore */ }
    }
  }, []);

  // Request username — needs name + phone
  const handleRequestAccount = async (name: string, phone: string) => {
    setRequestLoading(true);
    setRequestResult(null);
    try {
      const res = await fetch('/api/account', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', name, phone }),
      });
      const data = await res.json();
      if (data.success) {
        setRequestResult({ username: data.username, password: data.password, message: data.message });
        // If API returns full user object, auto-login directly
        if (data.user) {
          setAccountUser(data.user);
          setIsAccountUnlocked(true);
          localStorage.setItem('bss_account', JSON.stringify(data.user));
        } else {
          setLoginUsername(data.username);
          setLoginPassword(data.password);
          setTimeout(() => handleLogin(data.username, data.password), 500);
        }
        // Also register as chat customer if not already logged in
        if (!customer && onLogin) {
          onLogin(name, phone);
        }
      }
    } catch (e) { console.error(e); }
    setRequestLoading(false);
    setShowNameForm(false);
  };

  // Called when user clicks Request but hasn't chatted yet
  const handleRequestClick = () => {
    if (customer && customer.name && customer.phone) {
      // Already has chat session — use that name/phone
      handleRequestAccount(customer.name, customer.phone);
    } else {
      // No chat session — show inline form to collect name/phone
      setShowNameForm(true);
    }
  };

  // Submit inline name/phone form
  const handleNameFormSubmit = () => {
    if (!formName.trim()) { setFormError('Nama harus diisi'); return; }
    if (!formPhone.trim() || formPhone.replace(/[^0-9]/g, '').length < 10) {
      setFormError('Nomor HP tidak valid (minimal 10 digit)'); return;
    }
    setFormError('');
    handleRequestAccount(formName.trim(), formPhone.trim());
  };

  // Login
  const handleLogin = async (u?: string, p?: string) => {
    const username = u || loginUsername;
    const password = p || loginPassword;
    if (!username || !password) { setLoginError('Isi username dan password'); return; }
    setLoginLoading(true); setLoginError('');
    try {
      const res = await fetch('/api/account', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username, password }),
      });
      const data = await res.json();
      if (data.success) {
        setAccountUser(data.user); setIsAccountUnlocked(true);
        localStorage.setItem('bss_account', JSON.stringify(data.user));
        // Also set as customer if not logged in
        if (!customer && onLogin && data.user) {
          onLogin(data.user.nama, data.user.phone);
        }
      } else { setLoginError(data.message || 'Login gagal'); }
    } catch (e) { console.error(e); setLoginError('Koneksi error'); }
    setLoginLoading(false);
  };

  // Change password
  const handleChangePassword = async () => {
    if (!accountUser) return;
    if (newPw !== confirmPw) { setChangePwMsg('Password baru tidak cocok'); return; }
    if (newPw.length < 6) { setChangePwMsg('Minimal 6 karakter'); return; }
    setChangePwLoading(true); setChangePwMsg('');
    try {
      const res = await fetch('/api/account', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_password', username: accountUser.username, old_password: oldPw, new_password: newPw }),
      });
      const data = await res.json();
      setChangePwMsg(data.message);
      if (data.success) {
        const updated = { ...accountUser, isDefaultPassword: false };
        setAccountUser(updated);
        localStorage.setItem('bss_account', JSON.stringify(updated));
        setOldPw(''); setNewPw(''); setConfirmPw('');
        setTimeout(() => setShowChangePw(false), 1500);
      }
    } catch (e) { console.error(e); setChangePwMsg('Error'); }
    setChangePwLoading(false);
  };

  // Avatar upload
  const handleAvatarUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/chat/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) { setAvatarUrl(data.url); localStorage.setItem('bss_avatar', data.url); }
    } catch (e) { console.error(e); }
    setUploading(false);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#2a3942', color: '#e9edef', border: '1.5px solid #3b4a54',
    borderRadius: 12, padding: '12px 16px', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  };

  // ====== ACCOUNT UNLOCK FORM (not logged in to settings yet) ======
  if (!isAccountUnlocked) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0b141a' }}>
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <div style={{ filter: 'blur(6px)', opacity: 0.3, padding: '20px 14px', pointerEvents: 'none' }}>
            <div style={{ width: 70, height: 70, borderRadius: '50%', background: '#1f2c34', margin: '0 auto 12px' }} />
            <div style={{ height: 16, background: '#1f2c34', borderRadius: 8, width: '60%', margin: '0 auto 8px' }} />
            <div style={{ height: 12, background: '#1f2c34', borderRadius: 6, width: '40%', margin: '0 auto 20px' }} />
            {[1,2,3,4,5].map(i => <div key={i} style={{ height: 52, background: '#1f2c34', borderRadius: 12, marginBottom: 6 }} />)}
          </div>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(11,20,26,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>
            <div style={{ width: '100%', maxWidth: 360 }}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(0,168,132,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <Lock size={26} color="#00a884" />
                </div>
                <div style={{ color: '#e9edef', fontSize: 17, fontWeight: 600, marginBottom: 6 }}>Pengaturan Akun</div>
                <div style={{ color: '#8696a0', fontSize: 13, lineHeight: 1.5 }}>
                  Silahkan request Username dan Password terlebih dahulu supaya bisa menikmati fitur lanjutan
                </div>
              </div>

              {/* INLINE NAME/PHONE FORM (shown when user hasn't chatted yet) */}
              {showNameForm ? (
                <div style={{ background: '#1f2c34', borderRadius: 16, padding: 20, marginBottom: 16 }}>
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e9edef', marginBottom: 4 }}>Kenalan dulu yuk! 👋</div>
                    <div style={{ fontSize: 12, color: '#8696a0' }}>Masukkan nama dan nomor HP untuk membuat akun</div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', color: '#8696a0', fontSize: 11, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Nama Lengkap</label>
                    <div style={{ position: 'relative' }}>
                      <User size={15} color="#8696a0" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                      <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Masukkan nama anda" autoFocus
                        style={{ ...inputStyle, paddingLeft: 40 }}
                        onFocus={e => (e.target.style.borderColor = '#00a884')}
                        onBlur={e => (e.target.style.borderColor = '#3b4a54')} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', color: '#8696a0', fontSize: 11, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Nomor HP (WhatsApp)</label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={15} color="#8696a0" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                      <input type="tel" value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="085xxxxxxxxx"
                        style={{ ...inputStyle, paddingLeft: 40 }}
                        onFocus={e => (e.target.style.borderColor = '#00a884')}
                        onBlur={e => (e.target.style.borderColor = '#3b4a54')}
                        onKeyDown={e => { if (e.key === 'Enter') handleNameFormSubmit(); }} />
                    </div>
                  </div>
                  {formError && <div style={{ color: '#f87171', fontSize: 12, marginBottom: 10 }}>{formError}</div>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setShowNameForm(false); setFormError(''); }}
                      style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: '#2a3942', color: '#8696a0', cursor: 'pointer', fontSize: 13 }}>
                      Batal
                    </button>
                    <button onClick={handleNameFormSubmit} disabled={requestLoading}
                      style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: requestLoading ? '#1f7a65' : '#00a884', color: '#fff', cursor: requestLoading ? 'wait' : 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      {requestLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                      {requestLoading ? 'Memproses...' : 'Buat Akun'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button onClick={handleRequestClick} disabled={requestLoading}
                    style={{ width: '100%', padding: '13px 20px', borderRadius: 12, border: 'none', background: requestLoading ? '#1f7a65' : 'linear-gradient(135deg, #00a884, #02735e)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: requestLoading ? 'wait' : 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {requestLoading ? <Loader2 size={18} className="animate-spin" /> : <User size={18} />}
                    {requestLoading ? 'Memproses...' : 'Request Username & Password'}
                  </button>
                  {requestResult && (
                    <div style={{ background: 'rgba(0,168,132,0.1)', border: '1px solid rgba(0,168,132,0.2)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: '#00a884', fontWeight: 600, marginBottom: 6 }}>✓ {requestResult.message}</div>
                      <div style={{ fontSize: 13, color: '#e9edef' }}>Username: <strong>{requestResult.username}</strong></div>
                      <div style={{ fontSize: 13, color: '#e9edef' }}>Password: <strong>{requestResult.password}</strong></div>
                    </div>
                  )}
                </>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0 16px' }}>
                <div style={{ flex: 1, height: 1, background: '#2a3942' }} />
                <span style={{ color: '#8696a0', fontSize: 11 }}>atau login</span>
                <div style={{ flex: 1, height: 1, background: '#2a3942' }} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <input type="text" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} placeholder="Username atau Nomor HP" style={inputStyle} />
              </div>
              <div style={{ marginBottom: 14, position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Password" style={inputStyle} onKeyDown={e => { if (e.key === 'Enter') handleLogin(); }} />
                <button onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', padding: 2 }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {loginError && <div style={{ color: '#f87171', fontSize: 12, marginBottom: 10 }}>{loginError}</div>}
              <button onClick={() => handleLogin()} disabled={loginLoading}
                style={{ width: '100%', padding: '13px 20px', borderRadius: 12, border: 'none', background: '#2a3942', color: '#e9edef', fontSize: 14, fontWeight: 600, cursor: loginLoading ? 'wait' : 'pointer' }}>
                {loginLoading ? 'Loading...' : 'Login'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ====== SUB PAGES ======
  if (subPage) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0b141a' }}>
        {/* Sub-page Header */}
        <div style={{ flexShrink: 0, background: '#1f2c34', padding: '12px 14px', borderBottom: '1px solid #2a3942', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setSubPage(null)} style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', padding: 0, display: 'flex' }}>
            <ChevronLeft size={22} />
          </button>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#e9edef' }}>
            {subPage === 'about' ? 'Tentang BSS' : subPage === 'websites' ? 'Website' : subPage === 'team' ? 'Tim BSS' : subPage === 'schedule' ? 'Jadwal & Lokasi' : subPage === 'equipment' ? 'Peralatan Service' : 'Layanan BSS'}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px' }}>
          {subPage === 'about' && about && (
            <div style={{ position: 'relative', minHeight: '100%' }}>
              {/* Dimmed background image */}
              <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundImage: 'url(/tentang.png)',
                backgroundSize: 'cover', backgroundPosition: 'center',
                opacity: 0.08, zIndex: 0, pointerEvents: 'none',
              }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <img src="/logo.png" alt="BSS Logo" style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 16, margin: '0 auto' }} />
                </div>
                {/* Title */}
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#e9edef', lineHeight: 1.3, marginBottom: 6 }}>{about.title}</div>
                  <div style={{ width: 40, height: 3, borderRadius: 2, background: '#00a884', margin: '0 auto' }} />
                </div>
                {/* Description as readable paragraphs */}
                <div style={{
                  background: 'rgba(31,44,52,0.85)', backdropFilter: 'blur(8px)',
                  borderRadius: 16, padding: '20px 18px',
                }}>
                  {about.description.split('\n').filter(p => p.trim()).map((paragraph, i) => (
                    <p key={i} style={{
                      fontSize: 14, color: '#d1d7db', lineHeight: 1.8,
                      margin: 0, marginBottom: i < about.description.split('\n').filter(p => p.trim()).length - 1 ? 14 : 0,
                      textAlign: 'justify', textIndent: '1.5em',
                    }}>
                      {paragraph.trim()}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
          {subPage === 'websites' && (
            <div>
              {websites.map((w, i) => (
                <a key={i} href={w.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#1f2c34', borderRadius: 12, marginBottom: 8, textDecoration: 'none' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(6,182,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Globe size={20} color="#06b6d4" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#e9edef' }}>{w.label}</div>
                    <div style={{ fontSize: 12, color: '#00a884', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.url}</div>
                  </div>
                  <ExternalLink size={16} color="#3b4a54" />
                </a>
              ))}
              {websites.length === 0 && <div style={{ textAlign: 'center', color: '#8696a0', padding: 30, fontSize: 13 }}>Belum ada website</div>}
            </div>
          )}
          {subPage === 'team' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {team.map((m, i) => (
                <div key={i} style={{ background: '#1f2c34', borderRadius: 14, padding: '18px 14px', textAlign: 'center' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#2a3942', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', overflow: 'hidden' }}>
                    {m.photo ? <img src={m.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={26} color="#8696a0" />}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#e9edef' }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: '#00a884', marginTop: 3 }}>{m.role}</div>
                </div>
              ))}
              {team.length === 0 && <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#8696a0', padding: 30, fontSize: 13 }}>Belum ada data tim</div>}
            </div>
          )}
          {subPage === 'schedule' && schedule && (
            <div>
              <div style={{ background: '#1f2c34', borderRadius: 14, padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <MapPin size={18} color="#f97316" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 12, color: '#8696a0', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 }}>Alamat</div>
                    <div style={{ fontSize: 14, color: '#e9edef', lineHeight: 1.5 }}>{schedule.address || '-'}</div>
                  </div>
                </div>
                {schedule.gps_lat && schedule.gps_lng && (
                  <a href={`https://www.google.com/maps?q=${schedule.gps_lat},${schedule.gps_lng}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, padding: '10px 16px', borderRadius: 10, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', textDecoration: 'none', color: '#f97316', fontSize: 13, fontWeight: 600 }}>
                    <MapPin size={14} /> Buka di Google Maps
                  </a>
                )}
              </div>
              <div style={{ background: '#1f2c34', borderRadius: 14, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Clock size={16} color="#f97316" />
                  <span style={{ fontSize: 12, color: '#8696a0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Jam Operasional</span>
                </div>
                {schedule.hours.map((h, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < schedule.hours.length - 1 ? '1px solid #2a3942' : 'none' }}>
                    <span style={{ fontSize: 14, color: '#e9edef', fontWeight: 500 }}>{h.day}</span>
                    <span style={{ fontSize: 14, color: h.open === 'Tutup' ? '#ef4444' : '#00a884', fontWeight: 600 }}>
                      {h.open === 'Tutup' ? 'Tutup' : `${h.open} - ${h.close}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {subPage === 'services' && (
            <div>
              {services.map((s, i) => (
                <div key={i} style={{ background: '#1f2c34', borderRadius: 12, padding: '14px 16px', marginBottom: 8, borderLeft: '3px solid #6366f1' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#e9edef', marginBottom: 4 }}>{s.title}</div>
                  <div style={{ fontSize: 13, color: '#8696a0' }}>{s.desc}</div>
                </div>
              ))}
              {services.length === 0 && <div style={{ textAlign: 'center', color: '#8696a0', padding: 30, fontSize: 13 }}>Belum ada data layanan</div>}
            </div>
          )}
          {subPage === 'equipment' && (
            <div>
              {equipment.map((eq, i) => (
                <div key={i} style={{ background: '#1f2c34', borderRadius: 14, marginBottom: 12, overflow: 'hidden' }}>
                  {eq.photo && (
                    <div style={{ width: '100%', height: 180, overflow: 'hidden', background: '#2a3942' }}>
                      <img src={eq.photo} alt={eq.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Microscope size={16} color="#eab308" />
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#e9edef' }}>{eq.title}</div>
                    </div>
                    <div style={{ fontSize: 13, color: '#8696a0', lineHeight: 1.6 }}>{eq.description}</div>
                  </div>
                </div>
              ))}
              {equipment.length === 0 && (
                <div style={{ textAlign: 'center', color: '#8696a0', padding: 30, fontSize: 13 }}>Belum ada data peralatan</div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ====== MAIN UNLOCKED VIEW ======
  const menuItems: { icon: React.ReactNode; label: string; desc: string; color: string; action: () => void; comingSoon?: boolean }[] = [
    { icon: <Shield size={20} />, label: 'Keamanan Akun', desc: 'Ubah password', color: '#ef4444', action: () => setShowChangePw(true) },
    { icon: <Star size={20} />, label: 'Point Service', desc: 'Coming soon', color: '#f59e0b', action: () => {}, comingSoon: true },
    { icon: <Crown size={20} />, label: 'Pelanggan VIP', desc: 'Coming soon', color: '#8b5cf6', action: () => {}, comingSoon: true },
    { icon: <Info size={20} />, label: 'Tentang BSS', desc: about?.title || '', color: '#3b82f6', action: () => setSubPage('about') },
    { icon: <Globe size={20} />, label: 'Website', desc: `${websites.length} link`, color: '#06b6d4', action: () => setSubPage('websites') },
    { icon: <Users size={20} />, label: 'Tim BSS', desc: `${team.length} anggota`, color: '#10b981', action: () => setSubPage('team') },
    { icon: <Clock size={20} />, label: 'Jadwal Buka', desc: schedule?.address ? 'Lihat jadwal & lokasi' : '', color: '#f97316', action: () => setSubPage('schedule') },
    { icon: <Wrench size={20} />, label: 'Layanan BSS', desc: `${services.length} layanan`, color: '#6366f1', action: () => setSubPage('services') },
    { icon: <Microscope size={20} />, label: 'Peralatan Service', desc: `${equipment.length} alat`, color: '#eab308', action: () => setSubPage('equipment') },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0b141a', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, background: '#1f2c34', padding: '12px 14px', borderBottom: '1px solid #2a3942' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#e9edef' }}>Settings</div>
      </div>

      {/* Default password warning */}
      {accountUser?.isDefaultPassword && (
        <div style={{ margin: '12px 14px 0', background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(234,88,12,0.2)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={20} color="#ea580c" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, color: '#ea580c', fontWeight: 600 }}>Ganti Password!</div>
            <div style={{ fontSize: 11, color: '#8696a0' }}>Password Anda masih default. Segera ubah di Keamanan Akun.</div>
          </div>
        </div>
      )}

      {/* Profile section */}
      <div style={{ padding: '20px 14px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#1f2c34', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={28} color="#8696a0" />}
          </div>
          <button onClick={() => fileRef.current?.click()}
            style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: '50%', background: '#00a884', border: '2px solid #0b141a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            {uploading ? <Loader2 size={11} color="#fff" className="animate-spin" /> : <Camera size={11} color="#fff" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); e.target.value = ''; }} />
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 600, color: '#e9edef' }}>{accountUser?.nama || customer?.name}</div>
          <div style={{ fontSize: 13, color: '#8696a0', marginTop: 2 }}>{accountUser?.phone || customer?.phone}</div>
          <div style={{ fontSize: 11, color: '#00a884', marginTop: 2 }}>@{accountUser?.username}</div>
        </div>
      </div>

      {/* Menu items */}
      <div style={{ padding: '0 14px' }}>
        {menuItems.map((item, idx) => (
          <div key={idx} onClick={() => { if (!item.comingSoon) item.action(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0',
              borderBottom: idx < menuItems.length - 1 ? '1px solid #1f2c34' : 'none',
              cursor: item.comingSoon ? 'default' : 'pointer',
              opacity: item.comingSoon ? 0.5 : 1,
            }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${item.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, flexShrink: 0 }}>
              {item.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: '#e9edef', fontWeight: 500 }}>{item.label}</div>
              {item.desc && <div style={{ fontSize: 11, color: item.comingSoon ? '#00a884' : '#8696a0', marginTop: 1 }}>{item.desc}</div>}
            </div>
            {item.comingSoon ? (
              <span style={{ fontSize: 10, color: '#00a884', background: 'rgba(0,168,132,0.1)', padding: '3px 8px', borderRadius: 8, fontWeight: 600 }}>SOON</span>
            ) : (
              <ChevronRight size={18} color="#3b4a54" />
            )}
          </div>
        ))}
      </div>

      {/* Social media footer */}
      {socialMedia.length > 0 && (
        <div style={{ padding: '20px 14px', marginTop: 'auto' }}>
          <div style={{ fontSize: 11, color: '#8696a0', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5, marginBottom: 10 }}>Social Media</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {socialMedia.map((sm, i) => {
              const color = PLATFORM_COLORS[sm.platform] || '#8696a0';
              return (
                <a key={i} href={sm.url} target="_blank" rel="noopener noreferrer"
                  style={{ flex: '1 1 auto', minWidth: 90, padding: '10px 12px', borderRadius: 12, background: '#1f2c34', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <SocialIcon platform={sm.platform} size={16} color={color} />
                  <span style={{ fontSize: 11, color, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sm.label || sm.platform}
                  </span>
                </a>
              );
            })}
          </div>
          <div style={{ textAlign: 'center', color: '#3b4a54', fontSize: 11, marginTop: 16 }}>
            {about?.title || 'BSS iPhone & Android Repair'} · Lumajang
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePw && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="fade-in" style={{ width: '100%', maxWidth: 360, background: '#1f2c34', borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#e9edef', marginBottom: 4 }}>Ubah Password</div>

            {/* Show default password hint */}
            {accountUser?.isDefaultPassword && (
              <div style={{ background: 'rgba(0,168,132,0.08)', border: '1px solid rgba(0,168,132,0.15)', borderRadius: 10, padding: '10px 12px', marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: '#00a884', lineHeight: 1.5 }}>
                  💡 Password default Anda adalah: <strong>123456</strong>
                </div>
                <div style={{ fontSize: 11, color: '#8696a0', marginTop: 4 }}>Silahkan ganti password untuk keamanan akun Anda.</div>
              </div>
            )}

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: '#8696a0', fontWeight: 600, marginBottom: 4, display: 'block' }}>Password Lama</label>
              <input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} placeholder={accountUser?.isDefaultPassword ? '123456' : ''} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: '#8696a0', fontWeight: 600, marginBottom: 4, display: 'block' }}>Password Baru</label>
              <div style={{ position: 'relative' }}>
                <input type={showNewPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} style={inputStyle} />
                <button onClick={() => setShowNewPw(!showNewPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', padding: 2 }}>
                  {showNewPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: '#8696a0', fontWeight: 600, marginBottom: 4, display: 'block' }}>Konfirmasi Password Baru</label>
              <div style={{ position: 'relative' }}>
                <input type={showConfirmPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} style={inputStyle} onKeyDown={e => { if (e.key === 'Enter') handleChangePassword(); }} />
                <button onClick={() => setShowConfirmPw(!showConfirmPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', padding: 2 }}>
                  {showConfirmPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {changePwMsg && (
              <div style={{ fontSize: 12, color: changePwMsg.includes('berhasil') ? '#00a884' : '#f87171', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                {changePwMsg.includes('berhasil') ? <Check size={14} /> : <AlertTriangle size={14} />} {changePwMsg}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowChangePw(false); setOldPw(''); setNewPw(''); setConfirmPw(''); setChangePwMsg(''); setShowNewPw(false); setShowConfirmPw(false); }}
                style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: '#2a3942', color: '#8696a0', cursor: 'pointer', fontSize: 14 }}>
                Batal
              </button>
              <button onClick={handleChangePassword} disabled={changePwLoading}
                style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: '#00a884', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                {changePwLoading ? 'Saving...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
