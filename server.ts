import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

app.use(express.json());

// -------------------------------------------------------------
// Supabase server-side connection check
// The secret key must exist only in the server environment (Render), never in Vite/client code.
// This endpoint checks connectivity only; it does not expose database rows or credentials.
// -------------------------------------------------------------
app.get('/api/health/supabase', async (_req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/$/, '');
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY?.trim();

  if (!supabaseUrl || !supabaseSecretKey) {
    return res.status(503).json({
      success: false,
      connected: false,
      error: 'Supabase server environment variables are not configured.',
    });
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/streamer_channels?select=id&limit=1`, {
      method: 'GET',
      headers: {
        apikey: supabaseSecretKey,
        Authorization: `Bearer ${supabaseSecretKey}`,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      // Do not return raw provider errors or headers to public callers.
      console.error(`Supabase health check failed with HTTP ${response.status}`);
      return res.status(502).json({
        success: false,
        connected: false,
        error: 'Supabase rejected the connection. Check the server key and table setup.',
      });
    }

    return res.json({ success: true, connected: true });
  } catch (error) {
    console.error('Supabase health check request failed:', error instanceof Error ? error.message : 'unknown error');
    return res.status(502).json({
      success: false,
      connected: false,
      error: 'Could not reach Supabase from the server.',
    });
  }
});

// Helper for clean User-Agent on external requests
const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// -------------------------------------------------------------
// GET /api/youtube/channel
// Resolves channel handle (@handle) to official channel metadata
// -------------------------------------------------------------
app.get('/api/youtube/channel', async (req, res) => {
  try {
    const rawHandle = (req.query.handle as string) || '';
    if (!rawHandle.trim()) {
      return res.status(400).json({
        success: false,
        error: 'YouTube channel handle is required. Example: @MyGamingChannel',
      });
    }

    // Normalize handle format (must start with @)
    let handle = rawHandle.trim();
    if (!handle.startsWith('@')) {
      handle = `@${handle}`;
    }

    // Validate handle characters
    if (!/^@[a-zA-Z0-9_.-]{3,30}$/.test(handle)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid handle format. Handles must start with @ and be 3-30 characters long.',
      });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;

    // Option 1: Official YouTube Data API v3 if API key is provided
    if (apiKey) {
      try {
        const apiUrl = `https://www.googleapis.com/youtube/v3/channels?forHandle=${encodeURIComponent(
          handle
        )}&part=snippet,contentDetails&key=${apiKey}`;
        const ytRes = await fetch(apiUrl);
        if (ytRes.ok) {
          const data = await ytRes.json();
          if (data.items && data.items.length > 0) {
            const item = data.items[0];
            return res.json({
              success: true,
              source: 'api',
              channel: {
                handle,
                channelId: item.id,
                title: item.snippet.title,
                avatarUrl:
                  item.snippet.thumbnails?.high?.url ||
                  item.snippet.thumbnails?.medium?.url ||
                  item.snippet.thumbnails?.default?.url,
                url: `https://www.youtube.com/${handle}`,
              },
            });
          }
        }
      } catch (err) {
        console.warn('YouTube API call failed, falling back to handle resolver', err);
      }
    }

    // Option 2: Server-side canonical YouTube handle resolver
    const channelUrl = `https://www.youtube.com/${encodeURIComponent(handle)}`;
    const response = await fetch(channelUrl, {
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({
          success: false,
          error: `Channel ${handle} was not found on YouTube. Please double check the handle spelling.`,
        });
      }
      return res.status(502).json({
        success: false,
        error: `YouTube returned status ${response.status} when accessing channel.`,
      });
    }

    const html = await response.text();

    // Check if YouTube redirected to home page (handle does not exist)
    if (html.includes('This page isn\'t available') || html.includes('404 Not Found')) {
      return res.status(404).json({
        success: false,
        error: `Channel ${handle} does not exist on YouTube.`,
      });
    }

    // Extract official metadata from HTML meta tags
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
    const channelIdMatch =
      html.match(/https:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})/) ||
      html.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/);

    if (!titleMatch && !channelIdMatch) {
      return res.status(404).json({
        success: false,
        error: `Could not parse official channel details for ${handle}.`,
      });
    }

    const officialTitle = titleMatch ? titleMatch[1] : handle;
    const avatarUrl = imageMatch ? imageMatch[1] : '';
    const channelId = channelIdMatch ? channelIdMatch[1] : '';

    return res.json({
      success: true,
      source: 'web',
      channel: {
        handle,
        channelId,
        title: officialTitle,
        avatarUrl,
        url: `https://www.youtube.com/${handle}`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error resolving YouTube channel:', message);
    return res.status(500).json({
      success: false,
      error: `Server failed to resolve YouTube channel: ${message}`,
    });
  }
});

// -------------------------------------------------------------
// GET /api/youtube/live
// Checks whether the channel currently has an active public live stream
// -------------------------------------------------------------
app.get('/api/youtube/live', async (req, res) => {
  try {
    const rawHandle = (req.query.handle as string) || '';
    const rawChannelId = (req.query.channelId as string) || '';

    if (!rawHandle.trim() && !rawChannelId.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Either channel handle or channelId is required.',
      });
    }

    let handle = rawHandle.trim();
    if (handle && !handle.startsWith('@')) {
      handle = `@${handle}`;
    }
    const channelId = rawChannelId.trim();

    const apiKey = process.env.YOUTUBE_API_KEY;

    // Option 1: Official YouTube API if key provided and channelId available
    if (apiKey && channelId) {
      try {
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${encodeURIComponent(
          channelId
        )}&eventType=live&type=video&key=${apiKey}`;
        const searchRes = await fetch(searchUrl);
        if (searchRes.ok) {
          const data = await searchRes.json();
          if (data.items && data.items.length > 0) {
            const liveItem = data.items[0];
            const itemChannelId = liveItem.snippet?.channelId;
            // Confirm the video belongs to the configured channel ID
            if (!itemChannelId || itemChannelId === channelId) {
              const videoId = liveItem.id?.videoId;
              if (videoId) {
                return res.json({
                  success: true,
                  isLive: true,
                  source: 'api',
                  videoId,
                  title: liveItem.snippet.title,
                  thumbnailUrl:
                    liveItem.snippet.thumbnails?.high?.url ||
                    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                  watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
                  checkedAt: Date.now(),
                });
              }
            }
          }
          return res.json({
            success: true,
            isLive: false,
            source: 'api',
            videoId: null,
            title: null,
            thumbnailUrl: null,
            watchUrl: null,
            checkedAt: Date.now(),
          });
        }
      } catch (err) {
        console.warn('YouTube live API check failed, falling back to handle check', err);
      }
    }

    // Option 2: Live endpoint check (authoritative by channelId if known, else handle)
    const targetUrl = channelId
      ? `https://www.youtube.com/channel/${encodeURIComponent(channelId)}/live`
      : `https://www.youtube.com/${encodeURIComponent(handle)}/live`;

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({
          success: false,
          error: `Channel ${handle || channelId} was not found on YouTube.`,
        });
      }
      return res.status(502).json({
        success: false,
        error: `YouTube returned HTTP status ${response.status} when accessing live stream.`,
      });
    }

    const finalUrl = response.url;
    const html = await response.text();

    if (html.includes("This page isn't available") || html.includes('404 Not Found')) {
      return res.status(404).json({
        success: false,
        error: `Channel ${handle || channelId} does not exist on YouTube.`,
      });
    }

    // Strictly verify if there is an active live stream
    const isLiveFlag =
      html.includes('"isLive":true') ||
      html.includes('"isLiveBroadcast":true');
    const isExplicitOffline =
      html.includes('LIVE_STREAM_OFFLINE') ||
      html.includes('Stream is offline') ||
      html.includes('This live event has ended');

    if (isLiveFlag && !isExplicitOffline) {
      let videoId: string | null = null;
      let liveTitle: string | null = null;
      let streamOwnerChannelId: string | null = null;

      // Parse ytInitialData to extract videoId, title, and owner channel together
      const dataMatch = html.match(/var ytInitialData = ({.+?});<\/script>/);
      if (dataMatch) {
        try {
          const ytData = JSON.parse(dataMatch[1]);
          videoId = ytData.currentVideoEndpoint?.watchEndpoint?.videoId || null;
          const playerOverlay =
            ytData.playerOverlays?.playerOverlayRenderer?.videoDetails?.playerOverlayVideoDetailsRenderer;
          liveTitle = playerOverlay?.title?.simpleText || null;

          const contents =
            ytData.contents?.twoColumnWatchNextResults?.results?.results?.contents || [];
          for (const item of contents) {
            if (item.videoSecondaryInfoRenderer) {
              const owner = item.videoSecondaryInfoRenderer.owner?.videoOwnerRenderer;
              streamOwnerChannelId =
                owner?.navigationEndpoint?.browseEndpoint?.browseId || null;
            }
            if (!liveTitle && item.videoPrimaryInfoRenderer) {
              liveTitle =
                item.videoPrimaryInfoRenderer.title?.runs?.map((r: any) => r.text).join('') || null;
            }
          }
        } catch (e) {
          console.warn('ytInitialData parse failed in live check', e);
        }
      }

      // Fallback extraction strictly for the primary stream
      if (!videoId) {
        const cveMatch = html.match(/"currentVideoEndpoint":\{[^}]*"videoId":"([a-zA-Z0-9_-]{11})"/);
        if (cveMatch) {
          videoId = cveMatch[1];
        } else {
          const urlMatch = finalUrl.match(/[\?&]v=([a-zA-Z0-9_-]{11})/);
          if (urlMatch) videoId = urlMatch[1];
        }
      }

      if (!liveTitle) {
        const titleMatch =
          html.match(/"videoPrimaryInfoRenderer":\{"title":\{"runs":\[\{"text":"([^"]+)"/) ||
          html.match(/<meta property="og:title" content="([^"]+)"/) ||
          html.match(/<title>([^<]+) - YouTube<\/title>/);
        liveTitle = titleMatch ? titleMatch[1] : 'Live Stream';
      }

      // If owner channel ID was identified and a channelId was configured, confirm they match!
      if (channelId && streamOwnerChannelId && streamOwnerChannelId !== channelId) {
        console.warn(
          `Detected stream belongs to channel ${streamOwnerChannelId}, but configured channel is ${channelId}. Discarding mismatch.`
        );
        return res.json({
          success: true,
          isLive: false,
          source: 'web',
          videoId: null,
          title: null,
          thumbnailUrl: null,
          watchUrl: null,
          checkedAt: Date.now(),
        });
      }

      if (videoId) {
        try {
          liveTitle = JSON.parse(`"${(liveTitle || 'Live Stream').replace(/"/g, '\\"')}"`);
        } catch {
          // ignore
        }

        // The thumbnail and watchUrl are strictly derived from the same verified video ID
        const verifiedWatchUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const verifiedThumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

        return res.json({
          success: true,
          isLive: true,
          source: 'web',
          videoId,
          title: liveTitle,
          thumbnailUrl: verifiedThumbnailUrl,
          watchUrl: verifiedWatchUrl,
          checkedAt: Date.now(),
        });
      }
    }

    // Channel is confirmed offline
    return res.json({
      success: true,
      isLive: false,
      source: 'web',
      videoId: null,
      title: null,
      thumbnailUrl: null,
      watchUrl: null,
      checkedAt: Date.now(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error detecting live stream:', message);
    return res.status(500).json({
      success: false,
      error: `Failed to check live stream: ${message}`,
      isLive: false,
      checkedAt: Date.now(),
    });
  }
});

// -------------------------------------------------------------
// Vite middleware mounting in development & static serving in prod
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, HOST, () => {
    console.log(`StreamerPay Server running at http://${HOST}:${PORT}`);
  });
}

startServer();
