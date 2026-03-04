'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { MessageCircle, Wrench, Tag, Settings } from 'lucide-react';
import CustomerChat from '@/components/customer/CustomerChat';
import ServiceStatus from '@/components/customer/ServiceStatus';
import LoginOverlay from '@/components/customer/LoginOverlay';

const Pricelist = dynamic(() => import('@/components/customer/Pricelist'), { ssr: false });
const CustomerSettings = dynamic(() => import('@/components/customer/CustomerSettings'), { ssr: false });

type Tab = 'chat' | 'service' | 'pricelist' | 'settings';

export default function CustomerPage() {
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [customer, setCustomer] = useState<{ name: string; phone: string } | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('bss_customer');
    if (saved) {
      const parsed = JSON.parse(saved);
      setCustomer(parsed);
      setIsLoggedIn(true);
      restoreSession(parsed.name, parsed.phone);
    }
    fetch('/api/init', { method: 'POST' }).catch(() => {});
  }, []);

  const restoreSession = async (name: string, phone: string) => {
    try {
      const res = await fetch('/api/chat/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, phone }) });
      const data = await res.json();
      if (data.session) setSessionId(data.session.id);
    } catch (e) { console.error('Session restore error:', e); }
  };

  const handleLogin = useCallback(async (name: string, phone: string) => {
    localStorage.setItem('bss_customer', JSON.stringify({ name, phone }));
    setCustomer({ name, phone });
    setIsLoggedIn(true);
    setShowLogin(false);
    await restoreSession(name, phone);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('bss_customer');
    localStorage.removeItem('bss_account');
    setCustomer(null);
    setSessionId(null);
    setIsLoggedIn(false);
    setActiveTab('chat');
  }, []);

  const requireLogin = useCallback(() => {
    if (!isLoggedIn) {
      setShowLogin(true);
      return false;
    }
    return true;
  }, [isLoggedIn]);

  const handleTabSwitch = (tab: Tab) => {
    // Service requires login
    if (tab === 'service' && !isLoggedIn) {
      setShowLogin(true);
      return;
    }
    setActiveTab(tab);
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px 0 6px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: active ? '#00a884' : '#8696a0',
    transition: 'color 0.2s',
    position: 'relative',
    minWidth: 0,
  });

  const tabs: { id: Tab; label: string; icon: React.ReactNode; requireAuth?: boolean }[] = [
    { id: 'chat', label: 'Chat', icon: <MessageCircle size={20} /> },
    { id: 'service', label: 'Service', icon: <Wrench size={20} />, requireAuth: true },
    { id: 'pricelist', label: 'Pricelist', icon: <Tag size={20} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  return (
    <div style={{ height: '100dvh', width: '100%', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', background: '#0b141a', position: 'relative' }}>
      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div style={{ display: activeTab === 'chat' ? 'flex' : 'none', height: '100%', flexDirection: 'column' }}>
          <CustomerChat
            customer={customer || { name: '', phone: '' }}
            sessionId={sessionId}
            onLogout={handleLogout}
            isLoggedIn={isLoggedIn}
            onRequireLogin={requireLogin}
          />
        </div>
        <div style={{ display: activeTab === 'service' ? 'flex' : 'none', height: '100%', flexDirection: 'column' }}>
          {isLoggedIn && customer ? <ServiceStatus customer={customer} /> : null}
        </div>
        <div style={{ display: activeTab === 'pricelist' ? 'flex' : 'none', height: '100%', flexDirection: 'column' }}>
          <Pricelist />
        </div>
        <div style={{ display: activeTab === 'settings' ? 'flex' : 'none', height: '100%', flexDirection: 'column' }}>
          <CustomerSettings customer={customer} onLogin={handleLogin} />
        </div>

        {/* Login Overlay */}
        {showLogin && (
          <LoginOverlay
            onLogin={handleLogin}
            onClose={() => setShowLogin(false)}
          />
        )}
      </div>

      {/* Bottom Navigation - 4 tabs */}
      <div style={{ flexShrink: 0, background: '#1f2c34', borderTop: '1px solid #2a3942', zIndex: 10 }}>
        <div style={{ display: 'flex' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => handleTabSwitch(tab.id)} style={tabStyle(activeTab === tab.id)}>
              {activeTab === tab.id && (
                <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 3, background: '#00a884', borderRadius: '0 0 3px 3px' }} />
              )}
              {tab.icon}
              <span style={{ fontSize: 9, marginTop: 2, fontWeight: 500 }}>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
