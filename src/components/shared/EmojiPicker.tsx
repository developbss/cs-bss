'use client';

import { useState, useRef, useEffect } from 'react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

const emojiCategories = [
  {
    name: 'Sering',
    icon: '🕐',
    emojis: ['😀', '😂', '❤️', '👍', '🙏', '😊', '🔥', '😍', '😭', '😘', '🥰', '😁', '🤣', '😎', '😢', '🤔', '😅', '🥺', '💕', '😏', '🙄', '😉', '🤗', '😋']
  },
  {
    name: 'Wajah',
    icon: '😀',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '🤖']
  },
  {
    name: 'Gestur',
    icon: '👋',
    emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '💪', '🦾']
  },
  {
    name: 'Hati',
    icon: '❤️',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️']
  },
  {
    name: 'Hewan',
    icon: '🐱',
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞']
  },
  {
    name: 'Objek',
    icon: '🎉',
    emojis: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🎱', '🏓', '🏸', '🎯', '🎮', '🕹️', '🎲', '🧩', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎵', '🎶', '🎹', '🎸', '🎺', '🎻', '🪘', '🎉', '🎊', '🎈', '🎁', '🎀', '🛒', '💰', '💳', '📱', '💻', '⌨️', '🖥️', '📷', '🔧', '🔨']
  },
];

export default function EmojiPicker({ onSelect, onClose, theme = 'dark' }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState(0);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const isDark = theme === 'dark';

  return (
    <div
      ref={pickerRef}
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        background: isDark ? '#1f2c34' : '#fff',
        borderRadius: '12px 12px 0 0',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
        zIndex: 50,
        overflow: 'hidden',
      }}
    >
      {/* Category tabs */}
      <div style={{
        display: 'flex',
        borderBottom: `1px solid ${isDark ? '#2a3942' : '#e4e6eb'}`,
        padding: '0 4px',
        overflowX: 'auto',
      }}>
        {emojiCategories.map((cat, i) => (
          <button
            key={cat.name}
            onClick={() => setActiveCategory(i)}
            style={{
              flex: '0 0 auto',
              padding: '10px 12px',
              background: 'none',
              border: 'none',
              fontSize: 18,
              cursor: 'pointer',
              opacity: activeCategory === i ? 1 : 0.5,
              borderBottom: activeCategory === i ? `2px solid ${isDark ? '#00a884' : '#1877f2'}` : '2px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            {cat.icon}
          </button>
        ))}
      </div>

      {/* Category name */}
      <div style={{
        padding: '8px 14px 4px',
        fontSize: 11,
        fontWeight: 600,
        color: isDark ? '#8696a0' : '#65676b',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}>
        {emojiCategories[activeCategory].name}
      </div>

      {/* Emoji grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: 2,
        padding: '4px 8px 10px',
        maxHeight: 200,
        overflowY: 'auto',
      }}>
        {emojiCategories[activeCategory].emojis.map((emoji, i) => (
          <button
            key={`${emoji}-${i}`}
            onClick={() => onSelect(emoji)}
            style={{
              padding: 6,
              fontSize: 22,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 8,
              transition: 'background 0.15s',
              lineHeight: 1,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
