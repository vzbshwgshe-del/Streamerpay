export interface YouTubeChannelData {
  handle: string;
  channelId: string;
  title: string;
  avatarUrl: string;
  url: string;
}

export interface YouTubeLiveStreamData {
  isLive: boolean;
  videoId: string | null;
  title: string | null;
  thumbnailUrl: string | null;
  watchUrl: string | null;
  checkedAt: number;
  error?: string;
}

export function normalizeHandle(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

export function isValidHandle(handle: string): boolean {
  const normalized = normalizeHandle(handle);
  return /^@[a-zA-Z0-9_.-]{3,30}$/.test(normalized);
}

export function extractYouTubeVideoId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();

  // If already an 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // youtube.com/watch?v=ID or /live/ID or youtu.be/ID
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = trimmed.match(regExp);
  return match ? match[1] : null;
}

export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function getYouTubeLiveChatUrl(videoId: string, domain: string = window.location.hostname): string {
  return `https://www.youtube.com/live_chat?v=${videoId}&embed_domain=${domain}`;
}

/**
 * Calls server-side proxy to automatically discover the channel by handle
 */
export async function resolveYouTubeChannel(
  handle: string
): Promise<{ success: boolean; channel?: YouTubeChannelData; error?: string }> {
  const normalized = normalizeHandle(handle);
  if (!isValidHandle(normalized)) {
    return {
      success: false,
      error: 'Invalid handle format. Example: @MyGamingChannel',
    };
  }

  try {
    const res = await fetch(`/api/youtube/channel?handle=${encodeURIComponent(normalized)}`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || `Could not find YouTube channel for ${normalized}`,
      };
    }
    return {
      success: true,
      channel: data.channel,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return {
      success: false,
      error: `Failed to connect to YouTube resolver: ${msg}`,
    };
  }
}

/**
 * Calls server-side proxy to detect if channel currently has an active public live stream
 */
export async function detectYouTubeLiveStream(
  handle: string,
  channelId?: string
): Promise<YouTubeLiveStreamData> {
  const normalized = normalizeHandle(handle);
  try {
    const query = new URLSearchParams({ handle: normalized });
    if (channelId) query.set('channelId', channelId);

    const res = await fetch(`/api/youtube/live?${query.toString()}`);
    const data = await res.json();

    if (!res.ok || !data.success) {
      return {
        isLive: false,
        videoId: null,
        title: null,
        thumbnailUrl: null,
        watchUrl: null,
        checkedAt: Date.now(),
        error: data.error || 'Failed to detect live stream',
      };
    }

    return {
      isLive: Boolean(data.isLive),
      videoId: data.videoId || null,
      title: data.title || null,
      thumbnailUrl: data.thumbnailUrl || null,
      watchUrl: data.watchUrl || null,
      checkedAt: data.checkedAt || Date.now(),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return {
      isLive: false,
      videoId: null,
      title: null,
      thumbnailUrl: null,
      watchUrl: null,
      checkedAt: Date.now(),
      error: msg,
    };
  }
}
