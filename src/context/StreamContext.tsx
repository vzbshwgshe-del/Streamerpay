import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { getSuperChatTier, SuperChatTier } from '../lib/donation-rules';
import {
  resolveYouTubeChannel,
  detectYouTubeLiveStream,
  normalizeHandle,
  isValidHandle,
  YouTubeChannelData,
  YouTubeLiveStreamData,
} from '../lib/youtube';

export interface Donation {
  id: string;
  supporterName: string;
  amount: number;
  currency: 'INR';
  message: string;
  timestamp: number;
  tier: number;
  status: 'completed' | 'successful' | 'pending' | 'failed' | 'flagged' | 'refunded';
  paymentMethod: 'UPI' | 'Card' | 'NetBanking' | 'GooglePay';
  isSample?: boolean;
}

export interface StreamerProfile {
  handle: string;
  channelName: string;
  channelId: string;
  avatarUrl: string;
  channelUrl: string;
  isConfigured: boolean;
  customThankYou: string;
  currency: 'INR';
}

export interface LiveStreamInfo {
  isLive: boolean;
  videoId: string | null;
  title: string | null;
  thumbnailUrl: string | null;
  watchUrl: string | null;
  checkedAt: number;
  isLoading: boolean;
  error?: string | null;
}

export interface OverlayConfig {
  token: string;
  alertDurationSec: number;
  playAlertSound: boolean;
  enableTts: boolean;
  minAmountForAlert: number;
  fontScale: 'normal' | 'large';
}

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

interface StreamContextType {
  // Profile & Channel
  profile: StreamerProfile;
  liveStream: LiveStreamInfo;
  isDiscoveringChannel: boolean;
  saveChannelHandle: (handle: string) => Promise<{ success: boolean; error?: string; channel?: YouTubeChannelData }>;
  testChannelConnection: (handle: string) => Promise<{
    success: boolean;
    error?: string;
    channel?: YouTubeChannelData;
    liveStream?: YouTubeLiveStreamData;
  }>;
  refreshLiveStatus: (manual?: boolean) => Promise<void>;
  updateCustomThankYou: (msg: string) => void;

  // Overlay Settings
  overlayConfig: OverlayConfig;
  updateOverlayConfig: (updates: Partial<OverlayConfig>) => void;
  triggerTestAlert: (customDonation?: Partial<Donation>) => void;
  activeOverlayAlert: (Donation & { tierConfig: SuperChatTier }) | null;
  dismissOverlayAlert: () => void;

  // Donations
  donations: Donation[];
  addDonation: (donation: Omit<Donation, 'id' | 'timestamp' | 'tier' | 'status' | 'currency'>) => Donation;
  exportDonationsCsv: () => void;

  // Auth
  isAdminLoggedIn: boolean;
  loginAdmin: (user: string, pass: string) => boolean;
  logoutAdmin: () => void;

  // Toasts
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  removeToast: (id: string) => void;
}

const StreamContext = createContext<StreamContextType | null>(null);

// Authentic demo community activity data in Indian Rupees (INR)
const INITIAL_DEMO_DONATIONS: Donation[] = [
  {
    id: 'sc-101',
    supporterName: 'Arjun_Gamer',
    amount: 500,
    currency: 'INR',
    message: 'Awesome stream bhai! Keep dominating the tournament! 🔥🚀',
    timestamp: Date.now() - 1000 * 60 * 4,
    tier: 5,
    status: 'completed',
    paymentMethod: 'UPI',
    isSample: true,
  },
  {
    id: 'sc-102',
    supporterName: 'RohanPlays',
    amount: 200,
    currency: 'INR',
    message: 'That clutch play was legendary! Super Chat for you!',
    timestamp: Date.now() - 1000 * 60 * 18,
    tier: 4,
    status: 'completed',
    paymentMethod: 'UPI',
    isSample: true,
  },
  {
    id: 'sc-103',
    supporterName: 'Neha_Sharma',
    amount: 100,
    currency: 'INR',
    message: 'Greetings from Mumbai! Loving the live vibes tonight 🎧',
    timestamp: Date.now() - 1000 * 60 * 35,
    tier: 3,
    status: 'completed',
    paymentMethod: 'GooglePay',
    isSample: true,
  },
  {
    id: 'sc-104',
    supporterName: 'Vikram_S',
    amount: 50,
    currency: 'INR',
    message: 'Hydrate check streamer! 💧 Stay energized!',
    timestamp: Date.now() - 1000 * 60 * 52,
    tier: 2,
    status: 'completed',
    paymentMethod: 'UPI',
    isSample: true,
  },
  {
    id: 'sc-105',
    supporterName: 'Pooja_Patel',
    amount: 1000,
    currency: 'INR',
    message: 'HUGE MILESTONE! Dropping the magenta super chat for the community goal! 🇮🇳✨',
    timestamp: Date.now() - 1000 * 60 * 75,
    tier: 6,
    status: 'completed',
    paymentMethod: 'Card',
    isSample: true,
  },
  {
    id: 'sc-106',
    supporterName: 'Ankit_99',
    amount: 20,
    currency: 'INR',
    message: 'First time live chat! GG!',
    timestamp: Date.now() - 1000 * 60 * 95,
    tier: 1,
    status: 'completed',
    paymentMethod: 'UPI',
    isSample: true,
  },
];

// Synthesized YouTube Super Chat chime via Web Audio API
export function playSuperChatChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;
    const notes = [587.33, 880.0, 1174.66]; // D5, A5, D6 triumphant ascending chime

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.5);
    });
  } catch (e) {
    console.debug('Audio chime unable to play without user gesture', e);
  }
}

export const StreamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Streamer channel profile (Loaded from localStorage)
  const [profile, setProfile] = useState<StreamerProfile>(() => {
    const saved = localStorage.getItem('streamerpay_channel_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          handle: parsed.handle || '',
          channelName: parsed.channelName || '',
          channelId: parsed.channelId || '',
          avatarUrl: parsed.avatarUrl || '',
          channelUrl: parsed.channelUrl || '',
          isConfigured: Boolean(parsed.handle && parsed.channelName),
          customThankYou:
            parsed.customThankYou ||
            'Thank you for fueling the stream with your Super Chat support! 💜',
          currency: 'INR',
        };
      } catch (e) {
        console.warn(e);
      }
    }
    // Default initial unconfigured state (no hardcoded fake creator)
    return {
      handle: '',
      channelName: 'StreamerPay Creator',
      channelId: '',
      avatarUrl: '',
      channelUrl: '',
      isConfigured: false,
      customThankYou: 'Thank you for fueling the stream with your Super Chat support! 💜',
      currency: 'INR',
    };
  });

  const [isDiscoveringChannel, setIsDiscoveringChannel] = useState<boolean>(false);

  // Live Stream Information
  const [liveStream, setLiveStream] = useState<LiveStreamInfo>({
    isLive: false,
    videoId: null,
    title: null,
    thumbnailUrl: null,
    watchUrl: null,
    checkedAt: Date.now(),
    isLoading: false,
    error: null,
  });

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: 'success' | 'info' | 'error' = 'info') => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  // Track profile ref for interval callbacks
  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Concurrency guard to prevent overlapping live checks and duplicate requests
  const isCheckingRef = useRef<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Core live check implementation with error handling
  const performLiveCheck = useCallback(
    async (manual = false) => {
      const current = profileRef.current;
      if (!current.handle) return;

      if (isCheckingRef.current) {
        // Prevent overlapping requests
        return;
      }

      isCheckingRef.current = true;
      setLiveStream((prev) => ({ ...prev, isLoading: true }));

      try {
        const result = await detectYouTubeLiveStream(current.handle, current.channelId);

        if (result.error) {
          // Failed check: update error without faking offline
          setLiveStream((prev) => ({
            ...prev,
            isLoading: false,
            error: result.error,
            checkedAt: Date.now(),
          }));
          if (manual) {
            showToast(`Live status check failed: ${result.error}`, 'error');
          }
        } else if (result.isLive) {
          // Channel is ONLINE with live stream details
          setLiveStream({
            isLive: true,
            videoId: result.videoId,
            title: result.title,
            thumbnailUrl: result.thumbnailUrl,
            watchUrl: result.watchUrl,
            checkedAt: result.checkedAt,
            isLoading: false,
            error: null,
          });
          if (manual) {
            showToast(`Channel is ONLINE: "${result.title || 'Live Stream'}"`, 'success');
          }
        } else {
          // Channel is OFFLINE - clear stream details gracefully
          setLiveStream({
            isLive: false,
            videoId: null,
            title: null,
            thumbnailUrl: null,
            watchUrl: null,
            checkedAt: result.checkedAt,
            isLoading: false,
            error: null,
          });
          if (manual) {
            showToast('Channel is currently OFFLINE.', 'info');
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown network error';
        setLiveStream((prev) => ({
          ...prev,
          isLoading: false,
          error: msg,
          checkedAt: Date.now(),
        }));
        if (manual) {
          showToast(`Live status check failed: ${msg}`, 'error');
        }
      } finally {
        isCheckingRef.current = false;
      }
    },
    [showToast]
  );

  // Public refresh function: performs immediate check and resets 60s timer
  const refreshLiveStatus = useCallback(
    async (manual = true) => {
      // Clear current interval so next automatic check is 60s after this manual refresh
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      await performLiveCheck(manual);

      if (profileRef.current.handle) {
        timerRef.current = setInterval(() => {
          performLiveCheck(false);
        }, 60000);
      }
    },
    [performLiveCheck]
  );

  // Automatic 60-second periodic live stream refresh with clean unmount handling
  useEffect(() => {
    if (!profile.handle) return;

    // Check immediately on mount or when handle changes
    performLiveCheck(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // 60-second polling timer
    timerRef.current = setInterval(() => {
      performLiveCheck(false);
    }, 60000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [profile.handle, performLiveCheck]);

  // Save Channel Handle action
  const saveChannelHandle = async (
    rawHandle: string
  ): Promise<{ success: boolean; error?: string; channel?: YouTubeChannelData }> => {
    const handle = normalizeHandle(rawHandle);
    if (!isValidHandle(handle)) {
      return {
        success: false,
        error: 'Invalid YouTube handle. Must start with @ and be 3-30 characters (e.g. @MyGamingChannel).',
      };
    }

    setIsDiscoveringChannel(true);
    const discovery = await resolveYouTubeChannel(handle);
    setIsDiscoveringChannel(false);

    if (!discovery.success || !discovery.channel) {
      return {
        success: false,
        error: discovery.error || `Could not find YouTube channel with handle ${handle}.`,
      };
    }

    const { channel } = discovery;
    const newProfile: StreamerProfile = {
      handle: channel.handle,
      channelName: channel.title,
      channelId: channel.channelId,
      avatarUrl: channel.avatarUrl,
      channelUrl: channel.url,
      isConfigured: true,
      customThankYou: profile.customThankYou,
      currency: 'INR',
    };

    setProfile(newProfile);
    localStorage.setItem('streamerpay_channel_config', JSON.stringify(newProfile));

    // Reset interval and perform immediate check
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    performLiveCheck(false);
    timerRef.current = setInterval(() => {
      performLiveCheck(false);
    }, 60000);

    showToast(`Channel "${channel.title}" connected successfully!`, 'success');
    return { success: true, channel };
  };

  // Test Channel Connection action
  const testChannelConnection = async (
    rawHandle: string
  ): Promise<{
    success: boolean;
    error?: string;
    channel?: YouTubeChannelData;
    liveStream?: YouTubeLiveStreamData;
  }> => {
    const handle = normalizeHandle(rawHandle);
    if (!isValidHandle(handle)) {
      return {
        success: false,
        error: 'Invalid handle format. Must start with @ (e.g. @MyGamingChannel).',
      };
    }

    const discovery = await resolveYouTubeChannel(handle);
    if (!discovery.success || !discovery.channel) {
      return {
        success: false,
        error: discovery.error || `Channel ${handle} could not be resolved.`,
      };
    }

    const liveRes = await detectYouTubeLiveStream(discovery.channel.handle, discovery.channel.channelId);

    return {
      success: true,
      channel: discovery.channel,
      liveStream: liveRes,
    };
  };

  const updateCustomThankYou = (msg: string) => {
    setProfile((prev) => {
      const updated = { ...prev, customThankYou: msg };
      localStorage.setItem('streamerpay_channel_config', JSON.stringify(updated));
      return updated;
    });
  };

  // Overlay configuration
  const [overlayConfig, setOverlayConfig] = useState<OverlayConfig>(() => {
    const saved = localStorage.getItem('streamerpay_overlay_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn(e);
      }
    }
    return {
      token: 'obs_token_88a3f91b',
      alertDurationSec: 8,
      playAlertSound: true,
      enableTts: false,
      minAmountForAlert: 40,
      fontScale: 'normal',
    };
  });

  const updateOverlayConfig = (updates: Partial<OverlayConfig>) => {
    setOverlayConfig((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem('streamerpay_overlay_config', JSON.stringify(next));
      return next;
    });
  };

  // Active overlay alert state
  const [activeOverlayAlert, setActiveOverlayAlert] = useState<
    (Donation & { tierConfig: SuperChatTier }) | null
  >(null);

  const dismissOverlayAlert = useCallback(() => {
    setActiveOverlayAlert(null);
  }, []);

  // Broadcast channel for OBS Overlay synchronization across tabs/browser sources
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('streamerpay_overlay_channel');
      channel.onmessage = (event) => {
        if (event.data?.type === 'TRIGGER_ALERT') {
          const donation: Donation = event.data.payload;
          const tierConfig = getSuperChatTier(donation.amount);
          setActiveOverlayAlert({ ...donation, tierConfig });
          if (overlayConfig.playAlertSound) {
            playSuperChatChime();
          }
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported in this browser', e);
    }

    return () => {
      channel?.close();
    };
  }, [overlayConfig.playAlertSound]);

  // Alert dismiss timer
  useEffect(() => {
    if (!activeOverlayAlert) return;
    const timer = setTimeout(() => {
      dismissOverlayAlert();
    }, overlayConfig.alertDurationSec * 1000);
    return () => clearTimeout(timer);
  }, [activeOverlayAlert, overlayConfig.alertDurationSec, dismissOverlayAlert]);

  const triggerTestAlert = (customDonation?: Partial<Donation>) => {
    const amount = customDonation?.amount ?? 200;
    const testDonation: Donation = {
      id: `test-${Date.now()}`,
      supporterName: customDonation?.supporterName || 'SuperFan_India',
      amount,
      currency: 'INR',
      message:
        customDonation?.message ||
        'Testing the OBS stream overlay alert in INR! Super Chat looks awesome! 🔥🇮🇳',
      timestamp: Date.now(),
      tier: getSuperChatTier(amount).tier,
      status: 'completed',
      paymentMethod: 'UPI',
      isSample: true,
    };

    const tierConfig = getSuperChatTier(testDonation.amount);
    setActiveOverlayAlert({ ...testDonation, tierConfig });

    if (overlayConfig.playAlertSound) {
      playSuperChatChime();
    }

    try {
      const channel = new BroadcastChannel('streamerpay_overlay_channel');
      channel.postMessage({ type: 'TRIGGER_ALERT', payload: testDonation });
      channel.close();
    } catch (e) {
      console.warn(e);
    }

    showToast(`Test Super Chat (₹${testDonation.amount}) triggered on stream overlay!`, 'success');
  };

  // Donations list
  const [donations, setDonations] = useState<Donation[]>(() => {
    const saved = localStorage.getItem('streamerpay_donations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize existing currency to INR safely
          return parsed.map((d: Donation) => ({ ...d, currency: 'INR' }));
        }
      } catch (e) {
        console.warn(e);
      }
    }
    return INITIAL_DEMO_DONATIONS;
  });

  const addDonation = (
    donationData: Omit<Donation, 'id' | 'timestamp' | 'tier' | 'status' | 'currency'>
  ): Donation => {
    const tierConfig = getSuperChatTier(donationData.amount);
    const newDonation: Donation = {
      ...donationData,
      currency: 'INR',
      id: `sc-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: Date.now(),
      tier: tierConfig.tier,
      status: 'completed',
    };

    setDonations((prev) => {
      const next = [newDonation, ...prev];
      localStorage.setItem('streamerpay_donations', JSON.stringify(next));
      return next;
    });

    // Also trigger overlay alert if above threshold
    if (newDonation.amount >= overlayConfig.minAmountForAlert) {
      setActiveOverlayAlert({ ...newDonation, tierConfig });
      if (overlayConfig.playAlertSound) {
        playSuperChatChime();
      }
      try {
        const channel = new BroadcastChannel('streamerpay_overlay_channel');
        channel.postMessage({ type: 'TRIGGER_ALERT', payload: newDonation });
        channel.close();
      } catch (e) {
        console.warn(e);
      }
    }

    return newDonation;
  };

  const exportDonationsCsv = () => {
    if (donations.length === 0) {
      showToast('No donation records to export', 'info');
      return;
    }

    const headers = [
      'ID',
      'Date',
      'Supporter',
      'Amount (INR)',
      'Currency',
      'Tier',
      'Status',
      'Payment Method',
      'Message',
    ];
    const rows = donations.map((d) => [
      d.id,
      new Date(d.timestamp).toISOString(),
      `"${d.supporterName.replace(/"/g, '""')}"`,
      d.amount,
      'INR',
      d.tier,
      d.status,
      d.paymentMethod,
      `"${(d.message || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `streamerpay_donations_inr_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${donations.length} records to CSV!`, 'success');
  };

  // Auth State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return sessionStorage.getItem('streamerpay_admin_auth') === 'true';
  });

  const loginAdmin = (user: string, pass: string): boolean => {
    if ((user.trim().toLowerCase() === 'admin' || user.includes('@')) && pass.length >= 6) {
      setIsAdminLoggedIn(true);
      sessionStorage.setItem('streamerpay_admin_auth', 'true');
      showToast('Welcome back, Creator! Authenticated to Creator Studio.', 'success');
      return true;
    }
    showToast('Invalid login. Use demo credentials (admin / streamer2026)', 'error');
    return false;
  };

  const logoutAdmin = () => {
    setIsAdminLoggedIn(false);
    sessionStorage.removeItem('streamerpay_admin_auth');
    showToast('You have been logged out of the creator dashboard.', 'info');
  };


  return (
    <StreamContext.Provider
      value={{
        profile,
        liveStream,
        isDiscoveringChannel,
        saveChannelHandle,
        testChannelConnection,
        refreshLiveStatus,
        updateCustomThankYou,
        overlayConfig,
        updateOverlayConfig,
        triggerTestAlert,
        activeOverlayAlert,
        dismissOverlayAlert,
        donations,
        addDonation,
        exportDonationsCsv,
        isAdminLoggedIn,
        loginAdmin,
        logoutAdmin,
        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}
    </StreamContext.Provider>
  );
};

export function useStream(): StreamContextType {
  const context = useContext(StreamContext);
  if (!context) {
    throw new Error('useStream must be used within a StreamProvider');
  }
  return context;
}
