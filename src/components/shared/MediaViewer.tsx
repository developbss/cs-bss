'use client';

import { X } from 'lucide-react';

interface MediaViewerProps {
  url: string;
  type: 'image' | 'video';
  onClose: () => void;
}

export default function MediaViewer({ url, type, onClose }: MediaViewerProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.92)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
        }}
      >
        <X size={22} />
      </button>

      <div onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '85vh' }}>
        {type === 'image' ? (
          <img
            src={url}
            alt=""
            style={{
              maxWidth: '90vw',
              maxHeight: '85vh',
              borderRadius: 8,
              objectFit: 'contain',
            }}
          />
        ) : (
          <video
            src={url}
            controls
            autoPlay
            style={{
              maxWidth: '90vw',
              maxHeight: '85vh',
              borderRadius: 8,
            }}
          />
        )}
      </div>
    </div>
  );
}
