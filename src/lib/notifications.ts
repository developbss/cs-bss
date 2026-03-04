'use client';

let swRegistration: ServiceWorkerRegistration | null = null;

// Register service worker and request notification permission
export async function initNotifications(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // Register service worker
  if ('serviceWorker' in navigator) {
    try {
      swRegistration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
    } catch (e) {
      console.error('SW registration failed:', e);
    }
  }

  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return Notification.permission === 'granted';
}

// Show notification via Service Worker (works even when tab is in background/minimized)
export function showNotification(
  title: string,
  body: string,
  options?: {
    icon?: string;
    tag?: string;
    url?: string;
    sound?: string;
  }
) {
  // Play sound (must be from main thread, SW can't play audio)
  if (options?.sound) {
    const audio = new Audio(options.sound);
    audio.play().catch(() => {});
  }

  if ('Notification' in window && Notification.permission !== 'granted') return;

  // Use Service Worker notification (shows in system notification bar, even on mobile)
  if (swRegistration) {
    swRegistration.showNotification(title, {
      body,
      icon: options?.icon || '/logo.png',
      badge: '/logo.png',
      tag: options?.tag || 'bss-notification',
      data: { url: options?.url || '/' },
      silent: true, // We handle sound ourselves

    }).catch(() => {
      // Fallback to regular Notification API
      fallbackNotification(title, body, options);
    });
  } else if (navigator.serviceWorker?.ready) {
    // SW not cached yet, wait for it
    navigator.serviceWorker.ready.then((reg) => {
      swRegistration = reg;
      reg.showNotification(title, {
        body,
        icon: options?.icon || '/logo.png',
        badge: '/logo.png',
        tag: options?.tag || 'bss-notification',
        data: { url: options?.url || '/' },
        silent: true,
  
      }).catch(() => {
        fallbackNotification(title, body, options);
      });
    }).catch(() => {
      fallbackNotification(title, body, options);
    });
  } else {
    fallbackNotification(title, body, options);
  }
}

// Fallback: regular Notification API (only works when tab is open)
function fallbackNotification(
  title: string,
  body: string,
  options?: { icon?: string; tag?: string }
) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notif = new Notification(title, {
      body,
      icon: options?.icon || '/logo.png',
      tag: options?.tag || 'bss-notification',
    });
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
  }
}
