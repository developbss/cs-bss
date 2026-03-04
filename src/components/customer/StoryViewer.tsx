'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react';

interface Story {
  id: number;
  image_url: string;
  media_type?: string; // 'image' | 'video'
  caption: string;
  link_url: string | null;
  duration: number;
}

interface StoryViewerProps {
  stories: Story[];
  onClose: () => void;
}

export default function StoryViewer({ stories, onClose }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [isEntering, setIsEntering] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);
  const [fadeKey, setFadeKey] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());
  const preloadedRef = useRef<Set<string>>(new Set());
  const videoPoolRef = useRef<Map<string, HTMLVideoElement>>(new Map());

  const story = stories[currentIndex];
  const isVideo = story?.media_type === 'video';
  const imageDuration = (story?.duration || 5) * 1000;

  // Preload all media on mount
  useEffect(() => {
    stories.forEach((s, i) => {
      if (preloadedRef.current.has(s.image_url)) return;
      if (s.media_type === 'video') {
        const vid = document.createElement('video');
        vid.preload = 'auto';
        vid.muted = true;
        vid.src = s.image_url;
        vid.load();
        videoPoolRef.current.set(s.image_url, vid);
      } else {
        const img = new Image();
        img.src = s.image_url;
      }
      preloadedRef.current.add(s.image_url);
    });
  }, [stories]);

  // Entry animation
  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsEntering(false));
    });
  }, []);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onClose(), 200);
  }, [onClose]);

  const goNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
      setMediaReady(false);
      setFadeKey(k => k + 1);
    } else {
      handleClose();
    }
  }, [currentIndex, stories.length, handleClose]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
      setMediaReady(false);
      setFadeKey(k => k + 1);
    }
  }, [currentIndex]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Handle story change - setup timer for images, video handles itself
  useEffect(() => {
    setProgress(0);
    setPaused(false);

    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (isVideo) {
      // Video: progress is handled by onTimeUpdate event
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    } else {
      // For images: check if already cached, then start timer
      const img = new Image();
      img.src = story.image_url;
      const startTimer = () => {
        setMediaReady(true);
        startTimeRef.current = Date.now();
        timerRef.current = setInterval(() => {
          const elapsed = Date.now() - startTimeRef.current;
          const pct = Math.min((elapsed / imageDuration) * 100, 100);
          setProgress(pct);
          if (pct >= 100) {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            goNext();
          }
        }, 30);
      };
      if (img.complete) {
        startTimer();
      } else {
        img.onload = startTimer;
        img.onerror = startTimer; // proceed even on error
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, isVideo, imageDuration]);

  // Video time update handler
  const handleVideoTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const pct = (video.currentTime / video.duration) * 100;
    setProgress(pct);
  }, []);

  // Video ended handler
  const handleVideoEnded = useCallback(() => {
    setProgress(100);
    goNext();
  }, [goNext]);

  const handleVideoCanPlay = useCallback(() => {
    setMediaReady(true);
  }, []);

  // Handle long press to pause
  const handlePointerDown = useCallback(() => {
    setPaused(true);
    if (isVideo && videoRef.current) {
      videoRef.current.pause();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [isVideo]);

  const handlePointerUp = useCallback(() => {
    setPaused(false);
    if (isVideo && videoRef.current) {
      videoRef.current.play().catch(() => {});
    } else if (!isVideo) {
      // Resume image timer from where we left off
      const elapsed = (progress / 100) * imageDuration;
      startTimeRef.current = Date.now() - elapsed;
      timerRef.current = setInterval(() => {
        const totalElapsed = Date.now() - startTimeRef.current;
        const pct = Math.min((totalElapsed / imageDuration) * 100, 100);
        setProgress(pct);
        if (pct >= 100) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          goNext();
        }
      }, 30);
    }
  }, [isVideo, progress, imageDuration, goNext]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'Escape') handleClose();
      else if (e.key === ' ') {
        e.preventDefault();
        if (paused) handlePointerUp();
        else handlePointerDown();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev, handleClose, paused, handlePointerDown, handlePointerUp]);

  if (!story) return null;

  const containerStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 200, background: '#000',
    display: 'flex', flexDirection: 'column',
    opacity: isEntering || isExiting ? 0 : 1,
    transform: isEntering ? 'scale(0.95)' : isExiting ? 'scale(0.95)' : 'scale(1)',
    transition: 'opacity 0.2s ease-out, transform 0.2s ease-out',
  };

  return (
    <div style={containerStyle}>
      {/* CSS Animations */}
      <style>{`
        @keyframes storyFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .story-media-fade {
          animation: storyFadeIn 0.15s ease-out;
        }
      `}</style>

      {/* Multi-segment progress bars (Instagram-style) */}
      <div style={{ display: 'flex', gap: 3, padding: '8px 8px 0', flexShrink: 0 }}>
        {stories.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 2.5, borderRadius: 2,
            background: 'rgba(255,255,255,0.25)', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 2,
              background: '#fff',
              width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%',
              transition: i === currentIndex ? 'none' : 'width 0.3s',
            }} />
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', marginRight: 10,
          border: '2px solid #fff',
        }}>
          <img src="/logo.png" alt="BSS" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#1f2c34' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>BSS.id</div>
        </div>
        {isVideo && (
          <button onClick={() => setMuted(!muted)} style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none',
            background: 'transparent', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}>
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        )}
        <button onClick={handleClose} style={{
          width: 36, height: 36, borderRadius: '50%', border: 'none',
          background: 'transparent', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: '#fff',
        }}>
          <X size={22} />
        </button>
      </div>

      {/* Story Content */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {/* Tap zones */}
        <div
          onClick={goPrev}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: '30%', zIndex: 2,
            cursor: currentIndex > 0 ? 'pointer' : 'default',
          }}
        />
        <div
          onClick={goNext}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: '70%', zIndex: 2,
            cursor: 'pointer',
          }}
        />

        {/* Media with fade transition */}
        <div key={fadeKey} className="story-media-fade" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', height: '100%',
        }}>
          {isVideo ? (
            <video
              ref={videoRef}
              src={story.image_url}
              muted={muted}
              playsInline
              autoPlay
              preload="auto"
              onTimeUpdate={handleVideoTimeUpdate}
              onEnded={handleVideoEnded}
              onCanPlay={handleVideoCanPlay}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          ) : (
            <img
              src={story.image_url}
              alt=""
              onLoad={() => setMediaReady(true)}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          )}
        </div>

        {/* Loading spinner - only shows if media takes time to load */}
        {!mediaReady && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)', zIndex: 1,
          }}>
            <div style={{
              width: 36, height: 36, border: '3px solid rgba(255,255,255,0.2)',
              borderTopColor: '#fff', borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Navigation arrows (desktop) */}
        {currentIndex > 0 && (
          <button onClick={goPrev} style={{
            position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 3,
            width: 36, height: 36, borderRadius: '50%', border: 'none',
            background: 'rgba(0,0,0,0.5)', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}>
            <ChevronLeft size={22} />
          </button>
        )}
        {currentIndex < stories.length - 1 && (
          <button onClick={goNext} style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 3,
            width: 36, height: 36, borderRadius: '50%', border: 'none',
            background: 'rgba(0,0,0,0.5)', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}>
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {/* Caption */}
      {story.caption && (
        <div style={{
          padding: '12px 16px', textAlign: 'center', flexShrink: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
        }}>
          <p style={{ color: '#fff', fontSize: 14, margin: 0, lineHeight: 1.5, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
            {story.caption}
          </p>
          {story.link_url && (
            <a href={story.link_url} target="_blank" rel="noopener noreferrer"
              style={{ color: '#53bdeb', fontSize: 12, marginTop: 6, display: 'inline-block' }}>
              Selengkapnya
            </a>
          )}
        </div>
      )}
    </div>
  );
}
