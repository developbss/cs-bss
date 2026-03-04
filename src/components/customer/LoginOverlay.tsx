'use client';

import { useState } from 'react';
import { User, Phone, ArrowRight, X, MessageCircle } from 'lucide-react';

interface LoginOverlayProps {
  onLogin: (name: string, phone: string) => void;
  onClose: () => void;
}

export default function LoginOverlay({ onLogin, onClose }: LoginOverlayProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama harus diisi');
      return;
    }
    if (!phone.trim() || phone.replace(/[^0-9]/g, '').length < 10) {
      setError('Nomor HP tidak valid (minimal 10 digit)');
      return;
    }
    setError('');
    setLoading(true);
    onLogin(name.trim(), phone.trim());
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: 'rgba(11,20,26,0.7)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      {/* Card sliding up from bottom */}
      <div
        className="fade-in"
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#1f2c34',
          borderRadius: '24px 24px 0 0',
          padding: '0 0 24px',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
          position: 'relative',
          animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#3b4a54' }} />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 16,
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            color: '#8696a0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={18} />
        </button>

        {/* Icon + Text */}
        <div style={{ textAlign: 'center', padding: '8px 24px 20px' }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(0,168,132,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <MessageCircle size={28} color="#00a884" />
          </div>
          <h3 style={{ color: '#e9edef', fontSize: 18, fontWeight: 600, margin: '0 0 6px' }}>
            Kenalan dulu yuk! 👋
          </h3>
          <p style={{ color: '#8696a0', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
            Agar CS kami bisa mengenal kamu dan memberikan layanan terbaik
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '0 24px' }}>
          {/* Name */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', color: '#8696a0', fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Nama Lengkap
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} color="#8696a0" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama anda"
                autoFocus
                style={{
                  width: '100%',
                  background: '#2a3942',
                  color: '#e9edef',
                  border: '1.5px solid #3b4a54',
                  borderRadius: 12,
                  padding: '13px 16px 13px 42px',
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#00a884')}
                onBlur={(e) => (e.target.style.borderColor = '#3b4a54')}
              />
            </div>
          </div>

          {/* Phone */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', color: '#8696a0', fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Nomor HP (WhatsApp)
            </label>
            <div style={{ position: 'relative' }}>
              <Phone size={16} color="#8696a0" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="085xxxxxxxxx"
                style={{
                  width: '100%',
                  background: '#2a3942',
                  color: '#e9edef',
                  border: '1.5px solid #3b4a54',
                  borderRadius: 12,
                  padding: '13px 16px 13px 42px',
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#00a884')}
                onBlur={(e) => (e.target.style.borderColor = '#3b4a54')}
              />
            </div>
            <p style={{ color: '#8696a0', fontSize: 11, marginTop: 6, paddingLeft: 2 }}>
              Format: 085xxx / 6285xxx / 85xxx semuanya diterima
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 10,
              padding: '10px 14px',
              marginBottom: 14,
            }}>
              <p style={{ color: '#f87171', fontSize: 12, margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: loading ? '#1f7a65' : 'linear-gradient(135deg, #00a884 0%, #02735e 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '14px 24px',
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Memproses...' : 'Mulai Chat'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0.5; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
