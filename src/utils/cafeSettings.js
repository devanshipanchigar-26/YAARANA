import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const DEFAULT_SETTINGS = {
  // 1. Cafe Profile
  cafeName: 'YAARANA Cafe',
  logoUrl: '',
  address: '123 Yaarana Street, Foodie Hub, City',
  contactNumber: '+91 98765 43210',
  aboutStory: '',
  openingTime: '10:00',
  closingTime: '23:00',
  weeklyClosingDays: [], // e.g. ['Tuesday'] or empty for 7 days open

  // 2. Order & Takeaway Settings
  minOrderAmount: 0,
  estimatedPrepTime: '20-25 mins',
  acceptingOrders: true,
  autoCloseOutsideHours: true, // Automatically pauses orders when outside operating hours or on weekly closing days

  // 3. Payment Settings
  cashPaymentEnabled: true,
  upiPaymentEnabled: true,
  razorpayPaymentEnabled: true,
  upiId: 'yaarana@upi',

  // 4. Notifications
  newOrderAlerts: true,
  orderStatusNotifications: true,
  lowStockAlerts: false,
  emailNotificationsEnabled: false,
  notificationEmail: 'admin@yaarana.com',

  // 5. Social Media Links
  instagramUrl: '',
  facebookUrl: '',
  whatsappNumber: '',
};

/**
 * Validates that an Instagram URL is a legitimate HTTPS profile link.
 * Format: https://instagram.com/username or https://www.instagram.com/username
 */
export function isValidInstagramUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (host !== 'instagram.com' && host !== 'www.instagram.com') return false;
    const pathname = parsed.pathname.replace(/^\/|\/$/g, '');
    if (!pathname) return false;
    const username = pathname.split('/')[0];
    return /^[a-zA-Z0-9._]{1,30}$/.test(username);
  } catch {
    return false;
  }
}

/**
 * Formats WhatsApp contact to a valid wa.me link
 */
export function formatWhatsAppUrl(number) {
  if (!number) return '';
  const digits = String(number).replace(/[^0-9]/g, '');
  if (!digits) return '';
  return `https://wa.me/${digits}`;
}

const STORAGE_KEY = 'yaarana_cafe_settings';
const EVENT_KEY = 'yaarana_settings_updated';

/**
 * Synchronously retrieves current settings merged with default fallback values
 */
export function getCafeSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (err) {
    console.error('Failed to parse local cafe settings:', err);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Saves settings to localStorage and dispatches a window event so all components react instantly.
 * Also attempts an asynchronous best-effort sync with Supabase `cafe_settings` table.
 */
export async function saveCafeSettings(newSettings) {
  const merged = { ...getCafeSettings(), ...newSettings };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (err) {
    console.error('Failed to save settings to localStorage:', err);
  }

  // Notify active components immediately
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: merged }));
  }

  // Best-effort remote sync with Supabase (if table exists)
  try {
    await supabase
      .from('cafe_settings')
      .upsert({ id: 'default', data: merged, updated_at: new Date().toISOString() });
  } catch (err) {
    // Graceful fallback: table might not exist yet, which is completely fine
  }

  return merged;
}

/**
 * Subscribes to settings updates (both intra-tab via CustomEvent and cross-tab via StorageEvent)
 */
export function subscribeCafeSettings(callback) {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (e) => {
    callback(e.detail || getCafeSettings());
  };

  const handleStorageEvent = (e) => {
    if (e.key === STORAGE_KEY) {
      callback(getCafeSettings());
    }
  };

  window.addEventListener(EVENT_KEY, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(EVENT_KEY, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

/**
 * React hook to read and observe cafe settings in any component
 */
export function useCafeSettings() {
  const [settings, setSettings] = useState(getCafeSettings);

  useEffect(() => {
    // Initial fetch from Supabase in the background if possible
    async function syncRemote() {
      try {
        const { data, error } = await supabase
          .from('cafe_settings')
          .select('data')
          .eq('id', 'default')
          .maybeSingle();

        if (data && data.data && !error) {
          const merged = { ...DEFAULT_SETTINGS, ...data.data };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          setSettings(merged);
        }
      } catch {
        // Table not present or offline - use localStorage
      }
    }
    syncRemote();

    const unsubscribe = subscribeCafeSettings((updated) => {
      setSettings(updated);
    });
    return unsubscribe;
  }, []);

  const update = async (newValues) => {
    const updated = await saveCafeSettings(newValues);
    setSettings(updated);
    return updated;
  };

  return [settings, update];
}

/**
 * Checks whether the cafe is currently open and accepting orders based on:
 * 1. Manual acceptingOrders toggle
 * 2. Weekly closing days (if autoCloseOutsideHours is enabled)
 * 3. Opening & closing operating hours (if autoCloseOutsideHours is enabled)
 */
export function checkStoreOpenStatus(settings = getCafeSettings()) {
  const format12 = (timeStr) => {
    if (!timeStr) return '';
    const [hStr, mStr] = timeStr.split(':');
    const h = parseInt(hStr, 10);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  // 1. Manual override by admin
  if (settings.acceptingOrders === false) {
    return {
      isOpen: false,
      status: 'paused',
      badge: '🟠 Manually Paused by Admin',
      reason: 'manually_paused',
      message: 'The cafe is currently not accepting new orders. Please check back later.',
    };
  }

  // 2. Schedule-based checks (if autoCloseOutsideHours is enabled)
  if (settings.autoCloseOutsideHours !== false) {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[now.getDay()];

    // Weekly closing days check
    if (Array.isArray(settings.weeklyClosingDays) && settings.weeklyClosingDays.includes(currentDay)) {
      return {
        isOpen: false,
        status: 'weekly_closed',
        badge: `🔴 Closed Today (${currentDay})`,
        reason: 'weekly_closing_day',
        message: `The cafe is closed today (${currentDay}) for our weekly off. We look forward to serving you tomorrow!`,
      };
    }

    // Operating hours check
    if (settings.openingTime && settings.closingTime) {
      const [openH, openM] = settings.openingTime.split(':').map(Number);
      const [closeH, closeM] = settings.closingTime.split(':').map(Number);
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const openMinutes = openH * 60 + (openM || 0);
      const closeMinutes = closeH * 60 + (closeM || 0);

      const openFormatted = format12(settings.openingTime);
      const closeFormatted = format12(settings.closingTime);

      if (openMinutes <= closeMinutes) {
        // Daytime schedule, e.g. 10:00 to 23:00
        if (currentMinutes < openMinutes || currentMinutes >= closeMinutes) {
          return {
            isOpen: false,
            status: 'outside_hours',
            badge: '🔴 Closed (Outside Hours)',
            reason: 'outside_hours',
            message: `The cafe is currently closed. Today's hours: ${openFormatted} – ${closeFormatted}. Orders are paused.`,
            openFormatted,
            closeFormatted,
          };
        }
      } else {
        // Overnight schedule, e.g. 18:00 to 02:00
        if (currentMinutes < openMinutes && currentMinutes >= closeMinutes) {
          return {
            isOpen: false,
            status: 'outside_hours',
            badge: '🔴 Closed (Outside Hours)',
            reason: 'outside_hours',
            message: `The cafe is currently closed. Today's hours: ${openFormatted} – ${closeFormatted}. Orders are paused.`,
            openFormatted,
            closeFormatted,
          };
        }
      }
    }
  }

  return {
    isOpen: true,
    status: 'open',
    badge: '🟢 Open & Accepting Orders',
    reason: 'open',
    message: 'Store is currently open and accepting orders.',
  };
}

/**
 * Plays the notification sound from the user's sounds folder.
 * Plays /sounds/freesound_community-service-bell-ring-14610 (1).mp3 or /sounds/bell.mp3,
 * falling back gracefully to synthesized counter bell if the audio cannot play.
 */
export function playOrderChimeSound() {
  try {
    const audioPaths = [
      '/sounds/bell.mp3',
      '/bell.mp3',
      '/sounds/freesound_community-service-bell-ring-14610 (1).mp3',
      encodeURI('/sounds/freesound_community-service-bell-ring-14610 (1).mp3'),
    ];

    let played = false;
    const tryPlay = (index = 0) => {
      if (index >= audioPaths.length) {
        if (!played) {
          playSynthesizedServiceBell();
        }
        return;
      }
      const audio = new Audio(audioPaths[index]);
      audio.volume = 1.0;
      audio.currentTime = 0;
      const promise = audio.play();
      if (promise !== undefined) {
        promise
          .then(() => {
            played = true;
          })
          .catch(() => {
            tryPlay(index + 1);
          });
      } else {
        tryPlay(index + 1);
      }
    };

    tryPlay(0);
  } catch (err) {
    playSynthesizedServiceBell();
  }
}

/**
 * High-precision counter service bell synthesized via Web Audio API.
 */
export function playSynthesizedServiceBell() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const triggerTones = () => {
      const now = ctx.currentTime;

      // Master volume control
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.85, now);
      master.connect(ctx.destination);

      // 1. Initial metallic tap / plunger strike transient ("clink" attack ~5.8 kHz)
      const oscStrike = ctx.createOscillator();
      const gainStrike = ctx.createGain();
      oscStrike.type = 'triangle';
      oscStrike.frequency.setValueAtTime(5873, now);
      gainStrike.gain.setValueAtTime(0.35, now);
      gainStrike.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      oscStrike.connect(gainStrike);
      gainStrike.connect(master);
      oscStrike.start(now);
      oscStrike.stop(now + 0.05);

      // 2. Fundamental high-pitched bell dome ring (D7: 2349.3 Hz)
      const oscDome = ctx.createOscillator();
      const gainDome = ctx.createGain();
      oscDome.type = 'sine';
      oscDome.frequency.setValueAtTime(2349.3, now);
      gainDome.gain.setValueAtTime(0.85, now);
      gainDome.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
      oscDome.connect(gainDome);
      gainDome.connect(master);
      oscDome.start(now);
      oscDome.stop(now + 1.4);

      // 3. Shimmer overtone (slight 5 Hz detune creates natural metallic acoustic beating)
      const oscShimmer = ctx.createOscillator();
      const gainShimmer = ctx.createGain();
      oscShimmer.type = 'sine';
      oscShimmer.frequency.setValueAtTime(2354.5, now);
      gainShimmer.gain.setValueAtTime(0.55, now);
      gainShimmer.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);
      oscShimmer.connect(gainShimmer);
      gainShimmer.connect(master);
      oscShimmer.start(now);
      oscShimmer.stop(now + 1.25);

      // 4. Harmonic overtone (metallic ping resonance ~4.7 kHz)
      const oscHarmonic = ctx.createOscillator();
      const gainHarmonic = ctx.createGain();
      oscHarmonic.type = 'sine';
      oscHarmonic.frequency.setValueAtTime(4720, now);
      gainHarmonic.gain.setValueAtTime(0.3, now);
      gainHarmonic.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      oscHarmonic.connect(gainHarmonic);
      gainHarmonic.connect(master);
      oscHarmonic.start(now);
      oscHarmonic.stop(now + 0.6);
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(triggerTones).catch(triggerTones);
    } else {
      triggerTones();
    }
  } catch (err) {
    console.warn('Service bell audio could not play:', err);
  }
}

// Pre-warm audio capability on first user interaction so browser autoplay policy allows sound
if (typeof window !== 'undefined') {
  const unlockAudioContext = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const dummy = new AudioCtx();
        if (dummy.state === 'suspended') {
          dummy.resume();
        }
      }
    } catch {}
    window.removeEventListener('click', unlockAudioContext);
    window.removeEventListener('keydown', unlockAudioContext);
    window.removeEventListener('touchstart', unlockAudioContext);
  };
  window.addEventListener('click', unlockAudioContext, { once: true });
  window.addEventListener('keydown', unlockAudioContext, { once: true });
  window.addEventListener('touchstart', unlockAudioContext, { once: true });
}



