import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Bell,
  CheckCircle,
  Tag,
  DollarSign,
  Clock,
  CheckCheck,
  Megaphone,
  Users,
  Calendar,
  Volume2,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { api } from '../../services/api.js';
import { NotificationItem } from '../../types/index.js';
import { useRealtimeEvents } from '../../hooks/useRealtimeEvents.js';

/**
 * Synthesizes a crisp, elegant, high-end notification chime via Web Audio API.
 * Uses gentle dual bell frequencies with soft exponential fade.
 */
function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Harmonic bell 1 (D5: 587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.32);

    // Harmonic bell 2 (A5: 880 Hz) - slightly offset for sparkling chime
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.08);
    gain2.gain.setValueAtTime(0.0001, now);
    gain2.gain.setValueAtTime(0.22, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.52);

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 700);
  } catch {
    // Autoplay restrictions or audio context unavailable
  }
}

interface SwipeableNotificationCardProps {
  item: NotificationItem;
  lang: string;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}

const SwipeableNotificationCard: React.FC<SwipeableNotificationCardProps> = ({
  item,
  lang,
  onRead,
  onDismiss,
}) => {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const startXRef = useRef<number>(0);
  const currentXRef = useRef<number>(0);
  const isTouchRef = useRef<boolean>(false);

  const handleStart = (clientX: number, isTouch: boolean) => {
    startXRef.current = clientX;
    currentXRef.current = clientX;
    isTouchRef.current = isTouch;
    setIsDragging(true);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    currentXRef.current = clientX;
    const diff = clientX - startXRef.current;
    // Allow natural responsive swipe with dampening
    setTranslateX(diff);
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const diff = currentXRef.current - startXRef.current;
    const DISMISS_THRESHOLD = 85;

    if (Math.abs(diff) >= DISMISS_THRESHOLD) {
      // Swipe-to-dismiss triggered
      setIsDismissing(true);
      setTranslateX(diff > 0 ? 420 : -420);
      setTimeout(() => {
        onDismiss(item.id);
      }, 220);
    } else {
      // Tap or short drag - snap back
      if (Math.abs(diff) < 6) {
        onRead(item.id);
      }
      setTranslateX(0);
    }
  };

  // Determine icon and color scheme based on notification type
  const getTypeConfig = () => {
    switch (item.type) {
      case 'COMMISSION':
        return {
          icon: DollarSign,
          iconBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        };
      case 'SALE':
        return {
          icon: Tag,
          iconBg: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800',
        };
      case 'EMPLOYEE':
        return {
          icon: Users,
          iconBg: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border-violet-200 dark:border-violet-800',
        };
      case 'ANNOUNCEMENT':
        return {
          icon: Megaphone,
          iconBg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        };
      default:
        return {
          icon: Bell,
          iconBg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        };
    }
  };

  const { icon: Icon, iconBg } = getTypeConfig();

  const formattedTime = (() => {
    try {
      const d = new Date(item.createdAt);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  })();

  const progress = Math.min(Math.abs(translateX) / 120, 1);

  return (
    <div
      className={`relative w-full max-w-full overflow-hidden rounded-xl transition-all duration-300 ${
        isDismissing ? 'max-h-0 opacity-0 mb-0 py-0' : 'max-h-96 opacity-100'
      }`}
    >
      {/* Background Swipe Action Reveal Layer */}
      <div
        className={`absolute inset-0 rounded-xl flex items-center justify-between px-4 transition-colors ${
          progress > 0.4
            ? 'bg-rose-100/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800'
            : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
        }`}
      >
        <div
          className={`flex items-center gap-1.5 text-xs font-bold transition-opacity ${
            translateX > 20 ? 'opacity-100 text-rose-600 dark:text-rose-400' : 'opacity-0'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          <span>{lang === 'bn' ? 'মুছে ফেলুন' : 'Dismiss'}</span>
        </div>
        <div
          className={`flex items-center gap-1.5 text-xs font-bold transition-opacity ${
            translateX < -20 ? 'opacity-100 text-rose-600 dark:text-rose-400' : 'opacity-0'
          }`}
        >
          <span>{lang === 'bn' ? 'মুছে ফেলুন' : 'Dismiss'}</span>
          <Trash2 className="w-4 h-4" />
        </div>
      </div>

      {/* Foreground Swipeable Card Surface */}
      <div
        style={{
          transform: `translateX(${translateX}px)`,
          opacity: isDismissing ? 0 : 1 - progress * 0.45,
          transition: isDragging ? 'none' : 'transform 0.24s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.24s ease-out',
        }}
        onTouchStart={(e) => handleStart(e.touches[0].clientX, true)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
        onMouseDown={(e) => handleStart(e.clientX, false)}
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={() => {
          if (isDragging) handleEnd();
        }}
        className={`relative w-full min-w-0 max-w-full p-3.5 sm:p-4 rounded-xl border flex items-start gap-3 select-none cursor-grab active:cursor-grabbing transition-colors ${
          item.isRead
            ? 'bg-slate-50/90 dark:bg-slate-800/60 border-slate-200/90 dark:border-slate-700/80 hover:bg-slate-100/70 shadow-2xs'
            : 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-300/80 dark:border-emerald-700/60 shadow-xs'
        }`}
      >
        {/* Type Icon Badge */}
        <div
          className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs mt-0.5 ${iconBg}`}
        >
          <Icon className="w-4 h-4" />
        </div>

        {/* Content Section with strict word break to prevent any mobile horizontal overflow */}
        <div className="space-y-1 flex-1 min-w-0 max-w-full overflow-hidden">
          <div className="flex items-start justify-between gap-2 min-w-0 max-w-full">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug break-words [overflow-wrap:anywhere] flex-1 min-w-0">
              {lang === 'bn' ? item.titleBn : item.titleEn}
            </h4>
            <div className="flex items-center gap-1.5 shrink-0 ml-1">
              <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-semibold bg-white/90 dark:bg-slate-700/80 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-600/50 shrink-0 tabular-nums whitespace-nowrap">
                {formattedTime}
              </span>
              {!item.isRead && (
                <span className="w-2 h-2 rounded-full bg-[#009245] shrink-0" title="Unread" />
              )}
            </div>
          </div>

          <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed break-words [overflow-wrap:anywhere] [word-break:break-word] select-text">
            {lang === 'bn' ? item.messageBn : item.messageEn}
          </p>
        </div>
      </div>
    </div>
  );
};

export const ResellerNotificationsTab: React.FC = () => {
  const { lang, employee, employeeToken } = useApp();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Auto-cleanup retention period (7 days default, toggleable to 15 days)
  const [retentionDays, setRetentionDays] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('tawzoon_notif_retention_days');
      return saved ? parseInt(saved, 10) : 7;
    } catch {
      return 7;
    }
  });

  // Track dismissed notifications per employee so they never reappear
  const storageKey = employee ? `tawzoon_dismissed_notifs_${employee.id}` : 'tawzoon_dismissed_notifs';
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  // Sound triggering refs
  const isFirstLoadRef = useRef<boolean>(true);
  const knownIdsRef = useRef<Set<string>>(new Set());

  // Unlock browser audio autoplay on first interaction
  useEffect(() => {
    const unlockAudio = () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const dummy = new AudioCtx();
          dummy.resume().then(() => dummy.close()).catch(() => {});
        }
      } catch {}
    };
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  const fetchNotifs = useCallback(async () => {
    if (!employeeToken) return;
    setLoading(true);
    try {
      const data = await api.employeeGetNotifications(employeeToken);
      setNotifications(data || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [employeeToken]);

  useEffect(() => {
    fetchNotifs();
  }, [fetchNotifs]);

  // Audio trigger on newly arrived notifications
  useEffect(() => {
    if (notifications.length === 0) return;

    if (isFirstLoadRef.current) {
      // First load: record existing notification IDs without playing sound
      notifications.forEach((n) => knownIdsRef.current.add(n.id));
      isFirstLoadRef.current = false;
      return;
    }

    // Subsequent updates: check if any truly new notification has arrived
    const hasFresh = notifications.some((n) => !knownIdsRef.current.has(n.id));
    if (hasFresh) {
      playNotificationChime();
      notifications.forEach((n) => knownIdsRef.current.add(n.id));
    }
  }, [notifications]);

  // Real-time synchronization
  useRealtimeEvents((event) => {
    if (
      event.type === 'NEW_NOTIFICATION' ||
      event.type === 'NOTIFICATION_ADDED' ||
      event.type === 'BRANDING_UPDATED' ||
      (event.type === 'STATE_UPDATED' &&
        (event.data?.type === 'NOTIFICATION_ADDED' || event.data?.type === 'BRANDING_UPDATED'))
    ) {
      fetchNotifs();
    }
  });

  const handleMarkAsRead = async (id: string) => {
    if (!employeeToken) return;
    try {
      await api.employeeMarkNotificationRead(employeeToken, id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      window.dispatchEvent(new CustomEvent('tawzoon_notifications_updated'));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!employeeToken) return;
    try {
      await api.employeeMarkAllNotificationsRead(employeeToken);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      window.dispatchEvent(new CustomEvent('tawzoon_notifications_updated'));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleDismiss = useCallback(
    (id: string) => {
      setDismissedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        try {
          localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
        } catch {}
        return next;
      });
      // Also mark as read in backend
      handleMarkAsRead(id);
    },
    [storageKey]
  );

  const handleToggleRetention = (days: number) => {
    setRetentionDays(days);
    try {
      localStorage.setItem('tawzoon_notif_retention_days', String(days));
    } catch {}
  };

  // Filter out notifications that are:
  // 1. Manually dismissed via swipe
  // 2. Older than the retention cutoff (7 days or 15 days)
  const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const visibleNotifications = notifications.filter((item) => {
    if (dismissedIds.has(item.id)) return false;
    const itemDate = new Date(item.createdAt).getTime();
    if (!isNaN(itemDate) && itemDate < cutoffTime) return false;
    return true;
  });

  const unreadCount = visibleNotifications.filter((n) => !n.isRead).length;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 max-w-full overflow-hidden">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-[#009245] flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-800/60">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
              {lang === 'bn' ? 'রিসেলার নোটিফিকেশন ও ঘোষণা' : 'Notifications & Announcements'}
            </h2>
            <p className="text-[10px] text-slate-400 font-medium">
              {lang === 'bn' ? 'সোয়াইপ করে মুছে ফেলুন' : 'Swipe card to dismiss'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Retention Setting Selector (7 days vs 15 days) */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-lg p-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
            <Calendar className="w-3 h-3 text-slate-400 ml-1.5" />
            <button
              type="button"
              onClick={() => handleToggleRetention(7)}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                retentionDays === 7
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {lang === 'bn' ? '৭ দিন' : '7d'}
            </button>
            <button
              type="button"
              onClick={() => handleToggleRetention(15)}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                retentionDays === 15
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {lang === 'bn' ? '১৫ দিন' : '15d'}
            </button>
          </div>

          {unreadCount > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-50 text-[#e31b23] border border-rose-200 font-bold shrink-0">
              {unreadCount} {lang === 'bn' ? 'টি নতুন' : 'unread'}
            </span>
          )}

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#009245] border border-emerald-200 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer shrink-0"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{lang === 'bn' ? 'সব পড়া হয়েছে' : 'Mark all read'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main notifications list */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">
          {lang === 'bn' ? 'নোটিফিকেশন লোড হচ্ছে...' : 'Loading notifications...'}
        </div>
      ) : visibleNotifications.length === 0 ? (
        <div className="py-14 text-center space-y-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-200/50">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            {lang === 'bn' ? 'কোনো সক্রিয় নোটিফিকেশন নেই' : 'No notifications'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            {lang === 'bn'
              ? 'আপনার জন্য বর্তমানে কোনো নতুন নোটিফিকেশন নেই। নতুন কোনো সেল, কমিশন বা আপডেট এলে এখানে দেখতে পাবেন।'
              : 'You have no active notifications. New orders, commissions, or updates will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3 w-full max-w-full overflow-hidden">
          {visibleNotifications.map((item) => (
            <SwipeableNotificationCard
              key={item.id}
              item={item}
              lang={lang}
              onRead={handleMarkAsRead}
              onDismiss={handleDismiss}
            />
          ))}

          <p className="text-[10.5px] text-slate-400 dark:text-slate-500 font-medium text-center pt-1.5 flex items-center justify-center gap-1">
            <span>💡</span>
            <span>{lang === 'bn' ? 'নোটিফিকেশন কার্ড ডানে বা বামে টেনে সরালে লিস্ট থেকে মুছে যাবে' : 'Swipe card left or right to dismiss'}</span>
          </p>
        </div>
      )}
    </div>
  );
};

