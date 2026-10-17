import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';

import {
  getSuperChatTier,
  SuperChatTier,
} from '../lib/donation-rules';

import { supabase } from '../lib/supabase';

import {
  resolveYouTubeChannel,
  detectYouTubeLiveStream,
  normalizeHandle,
  isValidHandle,
  YouTubeChannelData,
  YouTubeLiveStreamData,
} from '../lib/youtube';

// ============================================
// TYPES
// ============================================

export interface Donation {
  id: string;
  supporterName: string;
  amount: number;
  currency: 'INR';
  message: string;
  timestamp: number;
  tier: number;
  status:
    | 'completed'
    | 'successful'
    | 'pending'
    | 'failed'
    | 'flagged'
    | 'refunded';
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

  saveChannelHandle: (
    handle: string
  ) => Promise<{
    success: boolean;
    error?: string;
    channel?: YouTubeChannelData;
  }>;

  testChannelConnection: (
    handle: string
  ) => Promise<{
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

  activeOverlayAlert:
    | (Donation & { tierConfig: SuperChatTier })
    | null;

  dismissOverlayAlert: () => void;

  // Donations
  donations: Donation[];

  addDonation: (
    donation: Omit<
      Donation,
      'id' | 'timestamp' | 'tier' | 'status' | 'currency'
    >
  ) => Donation;

  exportDonationsCsv: () => void;

  // Authentication
  isAdminLoggedIn: boolean;
  loginAdmin: (user: string, pass: string) => Promise<boolean>;
  logoutAdmin: () => void | Promise<void>;

  // Toasts
  toasts: ToastMessage[];
  showToast: (
    message: string,
    type?: 'success' | 'info' | 'error'
  ) => void;

  removeToast: (id: string) => void;
}

const StreamContext = createContext<StreamContextType | null>(null);

// ============================================
// DEFAULT VALUES
// ============================================

const DEFAULT_THANK_YOU =
  'Thank you for fueling the stream with your Super Chat support! 💜';

const DEFAULT_PROFILE: StreamerProfile = {
  handle: '',
  channelName: 'StreamerPay Creator',
  channelId: '',
  avatarUrl: '',
  channelUrl: '',
  isConfigured: false,
  customThankYou: DEFAULT_THANK_YOU,
  currency: 'INR',
};

// ============================================
// DEMO DONATIONS
// These are sample records, not real payments.
// ============================================

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
    message:
      'HUGE MILESTONE! Dropping the magenta super chat for the community goal! 🇮🇳✨',
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

// ============================================
// AUDIO ALERT
// ============================================

export function playSuperChatChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (
        window as unknown as {
          webkitAudioContext: typeof AudioContext;
        }
      ).webkitAudioContext;

    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    const notes = [587.33, 880.0, 1174.66];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.08;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(
        0.2,
        startTime + 0.02
      );
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        startTime + 0.45
      );

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });

    // Close the audio context after the chime finishes.
    window.setTimeout(() => {
      void ctx.close();
    }, 1000);
  } catch (error) {
    console.debug(
      'Audio chime unable to play without user gesture',
      error
    );
  }
        }
// ============================================
// STREAM PROVIDER
// ============================================

export const StreamProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  // --------------------------------------------
  // PROFILE STATE
  // --------------------------------------------

  const [profile, setProfile] = useState<StreamerProfile>(() => {
    try {
      const saved = localStorage.getItem(
        'streamerpay_channel_config'
      );

      if (saved) {
        const parsed = JSON.parse(saved);

        return {
          ...DEFAULT_PROFILE,
          ...parsed,
          currency: 'INR',
        };
      }
    } catch (error) {
      console.warn('Unable to load local profile:', error);
    }

    return DEFAULT_PROFILE;
  });

  const [isDiscoveringChannel, setIsDiscoveringChannel] =
    useState(false);

  const profileRef = useRef(profile);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // --------------------------------------------
  // TOASTS
  // --------------------------------------------

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((previous) =>
      previous.filter((toast) => toast.id !== id)
    );
  }, []);

  const showToast = useCallback(
    (
      message: string,
      type: 'success' | 'info' | 'error' = 'info'
    ) => {
      const id = Math.random()
        .toString(36)
        .substring(2, 9);

      setToasts((previous) => [
        ...previous,
        { id, message, type },
      ]);

      window.setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  // --------------------------------------------
  // LOAD PROFILE FROM SUPABASE
  // --------------------------------------------

  useEffect(() => {
    let active = true;

    const loadChannelProfile = async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!active || authError || !user) return;

      const { data, error } = await supabase
        .from('streamer_channels')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error(
          'Unable to load channel profile:',
          error.message
        );
        return;
      }

      if (!data) return;

      const loadedProfile: StreamerProfile = {
        handle: data.channel_handle || '',
        channelName: data.display_name || '',
        channelId: data.channel_id || '',
        avatarUrl: data.avatar_url || '',
        channelUrl: data.channel_url || '',
        isConfigured: Boolean(
          data.channel_handle && data.display_name
        ),
        customThankYou:
          data.custom_thank_you || DEFAULT_THANK_YOU,
        currency: 'INR',
      };

      setProfile(loadedProfile);

      localStorage.setItem(
        'streamerpay_channel_config',
        JSON.stringify(loadedProfile)
      );
    };

    loadChannelProfile().catch((error) => {
      console.error('Profile loading failed:', error);
    });

    // Reload the user's profile after authentication changes.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === 'SIGNED_IN' ||
        event === 'SIGNED_OUT' ||
        event === 'USER_UPDATED'
      ) {
        if (event === 'SIGNED_OUT') {
          if (active) {
            setProfile(DEFAULT_PROFILE);
            localStorage.removeItem(
              'streamerpay_channel_config'
            );
          }
        } else {
          window.setTimeout(() => {
            if (active) {
              void loadChannelProfile();
            }
          }, 0);
        }
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // --------------------------------------------
  // LIVE STREAM STATE
  // --------------------------------------------

  const [liveStream, setLiveStream] =
    useState<LiveStreamInfo>({
      isLive: false,
      videoId: null,
      title: null,
      thumbnailUrl: null,
      watchUrl: null,
      checkedAt: Date.now(),
      isLoading: false,
      error: null,
    });

  const isCheckingRef = useRef(false);
  const timerRef =
    useRef<ReturnType<typeof setInterval> | null>(null);

  // --------------------------------------------
  // LIVE STREAM CHECK
  // --------------------------------------------

  const performLiveCheck = useCallback(
    async (manual = false) => {
      const current = profileRef.current;

      if (!current.handle || isCheckingRef.current) return;

      isCheckingRef.current = true;

      setLiveStream((previous) => ({
        ...previous,
        isLoading: true,
      }));

      try {
        const result = await detectYouTubeLiveStream(
          current.handle,
          current.channelId
        );

        if (result.error) {
          setLiveStream((previous) => ({
            ...previous,
            isLoading: false,
            error: result.error,
            checkedAt: Date.now(),
          }));

          if (manual) {
            showToast(
              `Live status check failed: ${result.error}`,
              'error'
            );
          }

          return;
        }

        if (result.isLive) {
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
            showToast(
              `Channel is ONLINE: "${result.title || 'Live Stream'}"`,
              'success'
            );
          }
        } else {
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
            showToast(
              'Channel is currently OFFLINE.',
              'info'
            );
          }
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown network error';

        setLiveStream((previous) => ({
          ...previous,
          isLoading: false,
          error: message,
          checkedAt: Date.now(),
        }));

        if (manual) {
          showToast(
            `Live status check failed: ${message}`,
            'error'
          );
        }
      } finally {
        isCheckingRef.current = false;
      }
    },
    [showToast]
  );

  // --------------------------------------------
  // REFRESH LIVE STATUS
  // --------------------------------------------

  const refreshLiveStatus = useCallback(
    async (manual = true) => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      await performLiveCheck(manual);

      if (profileRef.current.handle) {
        timerRef.current = setInterval(() => {
          void performLiveCheck(false);
        }, 60000);
      }
    },
    [performLiveCheck]
  );

  // Automatically refresh live status every 60 seconds.
  useEffect(() => {
    if (!profile.handle) {
      setLiveStream((previous) => ({
        ...previous,
        isLive: false,
        videoId: null,
        title: null,
        thumbnailUrl: null,
        watchUrl: null,
        isLoading: false,
      }));

      return;
    }

    void performLiveCheck(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      void performLiveCheck(false);
    }, 60000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [profile.handle, performLiveCheck]);
    // ============================================
  // SAVE CHANNEL TO SUPABASE
  // ============================================

  const saveChannelHandle = async (
    rawHandle: string
  ): Promise<{
    success: boolean;
    error?: string;
    channel?: YouTubeChannelData;
  }> => {
    const handle = normalizeHandle(rawHandle);

    if (!isValidHandle(handle)) {
      return {
        success: false,
        error:
          'Invalid YouTube handle. Must start with @ and be 3-30 characters (e.g. @MyGamingChannel).',
      };
    }

    setIsDiscoveringChannel(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return {
          success: false,
          error: 'Please sign in before saving your channel.',
        };
      }

      const discovery = await resolveYouTubeChannel(handle);

      if (!discovery.success || !discovery.channel) {
        return {
          success: false,
          error:
            discovery.error ||
            `Could not find YouTube channel with handle ${handle}.`,
        };
      }

      const { channel } = discovery;

      const { data: existing, error: lookupError } =
        await supabase
          .from('streamer_channels')
          .select('id')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

      if (lookupError) {
        console.error(lookupError);

        return {
          success: false,
          error: 'Could not check your saved channel.',
        };
      }

      const channelData = {
        owner_id: user.id,
        channel_handle: channel.handle,
        channel_id: channel.channelId,
        display_name: channel.title,
        avatar_url: channel.avatarUrl || null,
        channel_url: channel.url || null,
        updated_at: new Date().toISOString(),
      };

      let saveError;

      if (existing) {
        const result = await supabase
          .from('streamer_channels')
          .update(channelData)
          .eq('id', existing.id)
          .eq('owner_id', user.id);

        saveError = result.error;
      } else {
        const result = await supabase
          .from('streamer_channels')
          .insert({
            ...channelData,
            custom_thank_you:
              profileRef.current.customThankYou ||
              DEFAULT_THANK_YOU,
          });

        saveError = result.error;
      }

      if (saveError) {
        console.error('Channel save failed:', saveError.message);

        return {
          success: false,
          error:
            'Could not save your channel to the database. Please try again.',
        };
      }

      const newProfile: StreamerProfile = {
        handle: channel.handle,
        channelName: channel.title,
        channelId: channel.channelId,
        avatarUrl: channel.avatarUrl || '',
        channelUrl: channel.url || '',
        isConfigured: true,
        customThankYou:
          profileRef.current.customThankYou ||
          DEFAULT_THANK_YOU,
        currency: 'INR',
      };

      profileRef.current = newProfile;
      setProfile(newProfile);

      localStorage.setItem(
        'streamerpay_channel_config',
        JSON.stringify(newProfile)
      );

      showToast(
        `Channel "${channel.title}" saved successfully!`,
        'success'
      );

      return {
        success: true,
        channel,
      };
    } catch (error) {
      console.error('Channel save failed:', error);

      return {
        success: false,
        error:
          'An unexpected error occurred while saving your channel.',
      };
    } finally {
      setIsDiscoveringChannel(false);
    }
  };

  // ============================================
  // TEST CHANNEL CONNECTION
  // ============================================

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
        error:
          'Invalid handle format. Must start with @ (e.g. @MyGamingChannel).',
      };
    }

    try {
      const discovery = await resolveYouTubeChannel(handle);

      if (!discovery.success || !discovery.channel) {
        return {
          success: false,
          error:
            discovery.error ||
            `Channel ${handle} could not be resolved.`,
        };
      }

      const liveStream = await detectYouTubeLiveStream(
        discovery.channel.handle,
        discovery.channel.channelId
      );

      return {
        success: true,
        channel: discovery.channel,
        liveStream,
      };
    } catch (error) {
      console.error('Channel test failed:', error);

      return {
        success: false,
        error: 'Unable to test the channel connection.',
      };
    }
  };

  // ============================================
  // UPDATE THANK-YOU MESSAGE
  // ============================================

  const updateCustomThankYou = (msg: string) => {
    const updated = {
      ...profileRef.current,
      customThankYou: msg,
    };

    profileRef.current = updated;
    setProfile(updated);

    localStorage.setItem(
      'streamerpay_channel_config',
      JSON.stringify(updated)
    );

    const saveMessage = async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        showToast('Please sign in to save your settings.', 'error');
        return;
      }

      const { data: channel, error: lookupError } =
        await supabase
          .from('streamer_channels')
          .select('id')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

      if (lookupError || !channel) {
        showToast(
          'Save your YouTube channel before changing this message.',
          'error'
        );
        return;
      }

      const { error } = await supabase
        .from('streamer_channels')
        .update({
          custom_thank_you: msg,
          updated_at: new Date().toISOString(),
        })
        .eq('id', channel.id)
        .eq('owner_id', user.id);

      if (error) {
        console.error(error);

        showToast(
          'Could not save the thank-you message.',
          'error'
        );
        return;
      }

      showToast('Thank-you message saved!', 'success');
    };

    void saveMessage().catch((error) => {
      console.error('Thank-you message update failed:', error);
    });
  };

  // ============================================
  // OVERLAY CONFIGURATION
  // ============================================

  const [overlayConfig, setOverlayConfig] =
    useState<OverlayConfig>(() => {
      try {
        const saved = localStorage.getItem(
          'streamerpay_overlay_config'
        );

        if (saved) {
          return JSON.parse(saved);
        }
      } catch (error) {
        console.warn(error);
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

  const updateOverlayConfig = (
    updates: Partial<OverlayConfig>
  ) => {
    setOverlayConfig((previous) => {
      const next = {
        ...previous,
        ...updates,
      };

      localStorage.setItem(
        'streamerpay_overlay_config',
        JSON.stringify(next)
      );

      return next;
    });
  };
    // ─── Overlay Alert ──────────────────────────────────────────────

  const [activeOverlayAlert, setActiveOverlayAlert] = useState<Donation | null>(
    null
  );

  const dismissOverlayAlert = useCallback(() => {
    setActiveOverlayAlert(null);
  }, []);

  const triggerDonationAlert = useCallback(
    (donation: Donation) => {
      setActiveOverlayAlert(donation);

      if (overlayConfig.playAlertSound) {
        playSuperChatChime();
      }

      try {
        const channel = new BroadcastChannel('streamerpay_overlay_channel');
        channel.postMessage({ type: 'NEW_SUPERCHAT', donation });
        channel.close();
      } catch (error) {
        console.warn('Overlay broadcast failed:', error);
      }
    },
    [overlayConfig.playAlertSound]
  );

  // Listen for alerts sent from other app components/tabs.
  useEffect(() => {
    let channel: BroadcastChannel | null = null;

    try {
      channel = new BroadcastChannel('streamerpay_overlay_channel');

      channel.onmessage = (event) => {
        if (event.data?.type === 'NEW_SUPERCHAT' && event.data?.donation) {
          setActiveOverlayAlert(event.data.donation as Donation);
        }
      };
    } catch (error) {
      console.warn('Overlay listener could not start:', error);
    }

    return () => channel?.close();
  }, []);

  const triggerTestAlert = useCallback(() => {
    const testDonation: Donation = {
      id: `test-${Date.now()}`,
      donorName: 'Test Viewer',
      amount: 100,
      message: 'This is a test Super Chat!',
      timestamp: new Date().toISOString(),
      tier: 'blue',
      status: 'completed',
      currency: 'INR',
    };

    triggerDonationAlert(testDonation);
    showToast('Test alert triggered!', 'success');
  }, [triggerDonationAlert, showToast]);

  // ─── Donations ──────────────────────────────────────────────────

  const [donations, setDonations] = useState<Donation[]>(() => {
    try {
      const saved = localStorage.getItem('streamerpay_donations');
      return saved ? JSON.parse(saved) : DEMO_DONATIONS;
    } catch {
      return DEMO_DONATIONS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('streamerpay_donations', JSON.stringify(donations));
    } catch (error) {
      console.warn('Could not save donations locally:', error);
    }
  }, [donations]);

  const addDonation = useCallback(
    (
      donationData: Omit<
        Donation,
        'id' | 'timestamp' | 'tier' | 'status' | 'currency'
      >
    ): Donation => {
      const donation: Donation = {
        ...donationData,
        id: `donation-${Date.now()}`,
        timestamp: new Date().toISOString(),
        tier: 'blue',
        status: 'completed',
        currency: 'INR',
      };

      setDonations((previous) => [donation, ...previous]);
      triggerDonationAlert(donation);

      return donation;
    },
    [triggerDonationAlert]
  );

  const exportDonationsCSV = useCallback(() => {
    const headers = [
      'Donor Name',
      'Amount',
      'Currency',
      'Message',
      'Timestamp',
      'Status',
    ];

    const rows = donations.map((donation) => [
      donation.donorName,
      donation.amount,
      donation.currency,
      donation.message,
      donation.timestamp,
      donation.status,
    ]);

    const escapeCSV = (value: unknown) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`;

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCSV).join(','))
      .join('\n');

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'streamerpay-donations.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [donations]);

  // ─── Supabase Authentication ────────────────────────────────────

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.error('Could not check Supabase session:', error);
        setIsAdminLoggedIn(false);
      } else {
        setIsAdminLoggedIn(Boolean(data.session?.user));
      }

      setIsAuthLoading(false);
    };

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setIsAdminLoggedIn(Boolean(session?.user));
        setIsAuthLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loginAdmin = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      const normalizedEmail = email.trim();

      if (!normalizedEmail || !password) {
        showToast('Please enter your email and password.', 'error');
        return false;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        showToast(error.message || 'Login failed.', 'error');
        return false;
      }

      showToast('Login successful!', 'success');
      return true;
    },
    [showToast]
  );

  const logoutAdmin = useCallback(async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      showToast('Logout failed. Please try again.', 'error');
      console.error('Supabase logout failed:', error);
      return;
    }

    setIsAdminLoggedIn(false);
    showToast('Logged out successfully.', 'success');
  }, [showToast]);

  // ─── Context Value ───────────────────────────────────────────────

  const value: StreamContextType = {
    profile,
    isDiscoveringChannel,
    liveStream,
    toasts,
    showToast,
    removeToast,
    saveChannelHandle,
    testChannelConnection,
    updateCustomThankYou,
    overlayConfig,
    updateOverlayConfig,
    activeOverlayAlert,
    dismissOverlayAlert,
    triggerTestAlert,
    donations,
    addDonation,
    exportDonationsCSV,
    isAdminLoggedIn,
    isAuthLoading,
    loginAdmin,
    logoutAdmin,
  };

  return (
    <StreamContext.Provider value={value}>
      {children}
    </StreamContext.Provider>
  );
};

export const useStream = (): StreamContextType => {
  const context = useContext(StreamContext);

  if (!context) {
    throw new Error('useStream must be used inside a StreamProvider');
  }

  return context;
};
