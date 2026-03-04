'use client';

import { useState, useRef } from 'react';
import { Camera, User, Check, Loader2, Plus, Trash2, Pencil, X } from 'lucide-react';

interface CSProfile {
  id: number;
  name: string;
  avatar_url: string | null;
  is_active: boolean;
}

interface CSSettingsProps {
  profiles: CSProfile[];
  onUpdate: (profiles: CSProfile[]) => void;
}

export default function CSSettings({ profiles, onUpdate }: CSSettingsProps) {
  const [localProfiles, setLocalProfiles] = useState<CSProfile[]>(profiles);
  const [uploading, setUploading] = useState<number | null>(null);
  const [success, setSuccess] = useState<number | null>(null);
  const [editingName, setEditingName] = useState<number | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const handleAvatarUpload = async (csId: number, csName: string, file: File) => {
    setUploading(csId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('csName', csName);

      const res = await fetch('/api/cs/upload-avatar', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.url) {
        await fetch('/api/cs/profiles', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: csId, avatar_url: data.url }),
        });

        const updated = localProfiles.map(p =>
          p.id === csId ? { ...p, avatar_url: data.url } : p
        );
        setLocalProfiles(updated);
        onUpdate(updated);
        setSuccess(csId);
        setTimeout(() => setSuccess(null), 2000);
      }
    } catch (e) {
      console.error('Upload error:', e);
    }
    setUploading(null);
  };

  const toggleActive = async (csId: number, currentActive: boolean) => {
    try {
      await fetch('/api/cs/profiles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: csId, is_active: !currentActive }),
      });

      const updated = localProfiles.map(p =>
        p.id === csId ? { ...p, is_active: !currentActive } : p
      );
      setLocalProfiles(updated);
      onUpdate(updated);
    } catch (e) {
      console.error('Toggle error:', e);
    }
  };

  const startEditName = (cs: CSProfile) => {
    setEditingName(cs.id);
    setEditNameValue(cs.name);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  const saveEditName = async (csId: number) => {
    const trimmed = editNameValue.trim();
    if (!trimmed) {
      setEditingName(null);
      return;
    }
    try {
      await fetch('/api/cs/profiles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: csId, name: trimmed }),
      });
      const updated = localProfiles.map(p =>
        p.id === csId ? { ...p, name: trimmed } : p
      );
      setLocalProfiles(updated);
      onUpdate(updated);
    } catch (e) {
      console.error('Edit name error:', e);
    }
    setEditingName(null);
  };

  const handleAddCS = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      const res = await fetch('/api/cs/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (data.profile) {
        const updated = [...localProfiles, data.profile];
        setLocalProfiles(updated);
        onUpdate(updated);
        setNewName('');
      }
    } catch (e) {
      console.error('Add CS error:', e);
    }
    setAdding(false);
  };

  const handleDeleteCS = async (csId: number) => {
    setDeleting(null);
    try {
      await fetch('/api/cs/profiles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: csId }),
      });
      const updated = localProfiles.filter(p => p.id !== csId);
      setLocalProfiles(updated);
      onUpdate(updated);
    } catch (e) {
      console.error('Delete CS error:', e);
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
      <div style={{ padding: '8px 4px 12px', fontSize: 12, fontWeight: 600, color: '#708499', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Profil Customer Service
      </div>

      {localProfiles.map(cs => (
        <div key={cs.id} style={{
          background: '#0e1621',
          borderRadius: 10,
          padding: 12,
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', background: '#5eb5f7',
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}>
              {cs.avatar_url ? (
                <img src={cs.avatar_url} alt={cs.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={22} color="#fff" />
              )}
            </div>
            <button
              onClick={() => fileInputRefs.current[cs.id]?.click()}
              style={{
                position: 'absolute', bottom: -2, right: -2, width: 22, height: 22,
                background: '#242f3d', borderRadius: '50%', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid #17212b', cursor: 'pointer',
              }}
            >
              {uploading === cs.id ? (
                <Loader2 size={11} color="#5eb5f7" className="animate-spin" />
              ) : success === cs.id ? (
                <Check size={11} color="#4dcd5e" />
              ) : (
                <Camera size={11} color="#708499" />
              )}
            </button>
            <input
              ref={(el) => { fileInputRefs.current[cs.id] = el; }}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarUpload(cs.id, cs.name, file);
              }}
            />
          </div>

          {/* Name & Role */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingName === cs.id ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={editNameValue}
                  onChange={e => setEditNameValue(e.target.value)}
                  onBlur={() => saveEditName(cs.id)}
                  onKeyDown={e => { if (e.key === 'Enter') saveEditName(cs.id); if (e.key === 'Escape') setEditingName(null); }}
                  style={{
                    flex: 1, background: '#242f3d', color: '#f5f5f5', border: '1px solid #5eb5f7',
                    borderRadius: 6, padding: '4px 8px', fontSize: 14, fontWeight: 500, outline: 'none',
                  }}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#f5f5f5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cs.name}</div>
                <button onClick={() => startEditName(cs)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                  display: 'flex', alignItems: 'center', opacity: 0.5,
                }}>
                  <Pencil size={12} color="#708499" />
                </button>
              </div>
            )}
            <div style={{ fontSize: 12, color: '#708499', marginTop: 1 }}>Customer Service</div>
          </div>

          {/* Delete Confirmation */}
          {deleting === cs.id ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <button onClick={() => handleDeleteCS(cs.id)} style={{
                padding: '4px 8px', borderRadius: 6, border: 'none', background: 'rgba(239,68,68,0.15)',
                color: '#ef4444', fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}>Hapus</button>
              <button onClick={() => setDeleting(null)} style={{
                padding: '4px 6px', borderRadius: 6, border: 'none', background: '#242f3d',
                color: '#708499', cursor: 'pointer', display: 'flex', alignItems: 'center',
              }}><X size={12} /></button>
            </div>
          ) : (
            <>
              {/* Active Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: cs.is_active ? '#4dcd5e' : '#708499', fontWeight: 500 }}>
                  {cs.is_active ? 'Aktif' : 'Off'}
                </span>
                <button
                  onClick={() => toggleActive(cs.id, cs.is_active)}
                  style={{
                    width: 38, height: 22, borderRadius: 11, position: 'relative',
                    background: cs.is_active ? '#4dcd5e' : '#242f3d',
                    border: 'none', cursor: 'pointer', transition: 'background 0.2s',
                  }}
                >
                  <div style={{
                    width: 18, height: 18, background: '#fff', borderRadius: '50%',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)', position: 'absolute', top: 2,
                    left: cs.is_active ? 18 : 2, transition: 'left 0.2s',
                  }} />
                </button>
              </div>
              <button onClick={() => setDeleting(cs.id)} style={{
                padding: 6, background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', opacity: 0.4, flexShrink: 0,
              }}>
                <Trash2 size={14} color="#ef4444" />
              </button>
            </>
          )}
        </div>
      ))}

      {/* Add CS */}
      <div style={{
        background: '#0e1621', borderRadius: 10, padding: 12, marginTop: 4,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAddCS(); }}
          placeholder="Nama CS baru..."
          style={{
            flex: 1, background: '#242f3d', color: '#f5f5f5', border: '1px solid #2b3a4a',
            borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none',
          }}
        />
        <button
          onClick={handleAddCS}
          disabled={adding || !newName.trim()}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            borderRadius: 8, border: 'none', background: newName.trim() ? '#5eb5f7' : '#242f3d',
            color: newName.trim() ? '#fff' : '#708499', fontSize: 13, fontWeight: 600,
            cursor: newName.trim() ? 'pointer' : 'default', transition: 'all 0.2s',
          }}
        >
          {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Tambah CS
        </button>
      </div>
    </div>
  );
}
