'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Lock, User, Eye, EyeOff } from 'lucide-react';

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      const data = await res.json();
      if (data.success) { localStorage.setItem('admin_token', data.token); router.push('/admin'); }
      else { setError(data.message || 'Login gagal'); }
    } catch { setError('Terjadi kesalahan'); }
    setLoading(false);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1.5px solid #dddfe2', borderRadius: 10, padding: '14px 16px 14px 44px',
    fontSize: 15, outline: 'none', background: '#fff', color: '#1c1e21', transition: 'border-color 0.2s', boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 60, height: 60, background: '#1877f2', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: '0 4px 16px rgba(24,119,242,0.3)' }}>
            <MessageCircle size={30} color="white" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1c1e21', margin: '0 0 4px' }}>BSS Admin Panel</h1>
          <p style={{ color: '#65676b', fontSize: 14, margin: 0 }}>Customer Service Dashboard</p>
        </div>

        {/* Form card */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16, position: 'relative' }}>
              <User size={18} color="#65676b" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#1877f2')} onBlur={(e) => (e.target.style.borderColor = '#dddfe2')} />
            </div>
            <div style={{ marginBottom: 20, position: 'relative' }}>
              <Lock size={18} color="#65676b" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
              <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
                style={{ ...inputStyle, paddingRight: 44 }}
                onFocus={(e) => (e.target.style.borderColor = '#1877f2')} onBlur={(e) => (e.target.style.borderColor = '#dddfe2')} />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#65676b', cursor: 'pointer', zIndex: 1, display: 'flex' }}>
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && (
              <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>{error}</div>
            )}

            <button type="submit" disabled={loading}
              style={{ width: '100%', background: loading ? '#4293f5' : '#1877f2', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 24px', fontSize: 15, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'all 0.2s' }}>
              {loading ? 'Memproses...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
