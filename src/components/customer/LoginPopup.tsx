'use client';

import { useState } from 'react';
import { MessageCircle, Phone, User, ArrowRight } from 'lucide-react';

interface LoginPopupProps {
  onLogin: (name: string, phone: string) => void;
}

export default function LoginPopup({ onLogin }: LoginPopupProps) {
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
        minHeight: '100dvh',
        width: '100%',
        maxWidth: 480,
        margin: '0 auto',
        background: '#0b141a',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Green wave header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #00a884 0%, #02735e 100%)',
          height: '35vh',
          minHeight: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: -40,
            left: 0,
            right: 0,
            height: 80,
            background: '#0b141a',
            borderTopLeftRadius: '50% 100%',
            borderTopRightRadius: '50% 100%',
          }}
        />
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <MessageCircle size={36} color="white" />
        </div>
        <h1
          style={{
            color: 'white',
            fontSize: 22,
            fontWeight: 700,
            margin: 0,
            letterSpacing: -0.5,
          }}
        >
          BSS Customer Service
        </h1>
        <p
          style={{
            color: 'rgba(255,255,255,0.75)',
            fontSize: 13,
            margin: '6px 0 0',
          }}
        >
          Layanan Chat & Cek Status Service
        </p>
      </div>

      {/* Form card */}
      <div
        style={{
          flex: 1,
          padding: '0 24px 40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          position: 'relative',
          zIndex: 2,
          marginTop: -12,
        }}
      >
        <div
          style={{
            background: '#1f2c34',
            borderRadius: 20,
            padding: '28px 24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <p
            style={{
              color: '#8696a0',
              fontSize: 13,
              marginBottom: 20,
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            Masukkan nama dan nomor HP untuk memulai percakapan
          </p>

          <form onSubmit={handleSubmit}>
            {/* Name field */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: 'block',
                  color: '#8696a0',
                  fontSize: 11,
                  fontWeight: 600,
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Nama Lengkap
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={16}
                  color="#8696a0"
                  style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masukkan nama anda"
                  style={{
                    width: '100%',
                    background: '#2a3942',
                    color: '#e9edef',
                    border: '1px solid #3b4a54',
                    borderRadius: 12,
                    padding: '14px 16px 14px 42px',
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

            {/* Phone field */}
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: 'block',
                  color: '#8696a0',
                  fontSize: 11,
                  fontWeight: 600,
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Nomor HP (WhatsApp)
              </label>
              <div style={{ position: 'relative' }}>
                <Phone
                  size={16}
                  color="#8696a0"
                  style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="085xxxxxxxxx"
                  style={{
                    width: '100%',
                    background: '#2a3942',
                    color: '#e9edef',
                    border: '1px solid #3b4a54',
                    borderRadius: 12,
                    padding: '14px 16px 14px 42px',
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
              <div
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  marginBottom: 16,
                }}
              >
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
                color: 'white',
                border: 'none',
                borderRadius: 12,
                padding: '15px 24px',
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
      </div>
    </div>
  );
}
