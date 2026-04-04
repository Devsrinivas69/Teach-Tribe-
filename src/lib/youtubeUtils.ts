/**
 * YouTube URL Parser & Embed Utility
 * Converts any YouTube URL format to embeddable format with security headers
 * Handles: standard URLs, shorts, youtu.be, playlist links
 * Includes validation, sanitization, and CORS/security header support
 */

/**
 * Extract video ID from various YouTube URL formats
 * @param url - YouTube URL (any format)
 * @returns Video ID or null if invalid
 */
export const extractVideoId = (url: string | undefined | null): string | null => {
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return null;
  }

  url = url.trim();

  // Just the video ID by itself (11 chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }

  // Try robust URL parsing first for links that include extra query params.
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, '');

    if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
      const fromQuery = parsed.searchParams.get('v');
      if (fromQuery && /^[a-zA-Z0-9_-]{11}$/.test(fromQuery)) {
        return fromQuery;
      }

      const shortsMatch = parsed.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/);
      if (shortsMatch?.[1]) return shortsMatch[1];

      const embedMatch = parsed.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})/);
      if (embedMatch?.[1]) return embedMatch[1];
    }

    if (hostname === 'youtu.be') {
      const shortId = parsed.pathname.replace('/', '').split('/')[0];
      if (/^[a-zA-Z0-9_-]{11}$/.test(shortId)) {
        return shortId;
      }
    }

    if (hostname === 'youtube-nocookie.com') {
      const noCookieMatch = parsed.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})/);
      if (noCookieMatch?.[1]) return noCookieMatch[1];
    }
  } catch {
    // Fall back to regex extraction for non-URL inputs.
  }

  // Already an embed URL
  if (url.includes('youtube.com/embed/') || url.includes('youtube-nocookie.com/embed/')) {
    const match = url.match(/embed\/([a-zA-Z0-9_-]{11})/);
    return match?.[1] || null;
  }

  // Standard youtube.com URL (with or without www)
  const standardMatch = url.match(/(?:(?:www\.)?youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/);
  if (standardMatch) return standardMatch[1];

  // youtu.be short URL
  const shortMatch = url.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // YouTube Shorts
  const shortsMatch = url.match(/(?:(?:www\.)?youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) return shortsMatch[1];

  return null;
};

/**
 * MANDATORY: Convert any YouTube URL to nocookie embed format
 * This bypasses CORS restrictions and privacy policies blocking on localhost
 * Format: https://www.youtube-nocookie.com/embed/[VIDEO_ID]
 * @param url - YouTube URL (any format)
 * @returns Embeddable URL with nocookie domain or null if invalid
 */
export const getEmbedUrl = (url: string | undefined | null): string | null => {
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return null;
  }

  const videoId = extractVideoId(url);
  
  if (!videoId || videoId.length !== 11) {
    console.warn('[YouTube Safety] Invalid video ID extracted', { url, videoId });
    return null;
  }

  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`;
  return embedUrl;
};

/**
 * Validate if a URL is a valid YouTube URL
 * @param url - URL to validate
 * @returns true if valid YouTube URL  
 */
export const isValidYoutubeUrl = (url: string | undefined | null): boolean => {
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return false;
  }

  const trimmedUrl = url.trim();

  // Check for 11-character video ID pattern
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmedUrl)) {
    return true;
  }

  // Check for embed URLs
  if (/(?:youtube\.com|youtube-nocookie\.com)\/embed\/[a-zA-Z0-9_-]{11}/.test(trimmedUrl)) {
    return true;
  }

  // Check for standard youtube.com watch URLs
  if (/(?:www\.)?youtube\.com\/watch\?v=[a-zA-Z0-9_-]{11}/.test(trimmedUrl)) {
    return true;
  }

  // Check for youtu.be short URLs
  if (/youtu\.be\/[a-zA-Z0-9_-]{11}/.test(trimmedUrl)) {
    return true;
  }

  // Check for YouTube Shorts
  if (/(?:www\.)?youtube\.com\/shorts\/[a-zA-Z0-9_-]{11}/.test(trimmedUrl)) {
    return true;
  }

  return false;
};

/**
 * Convert YouTube URL to no-cookie embed format
 * @param url - YouTube URL (any format)
 * @param useNoCookie - Use no-cookie domain (default: true)
 * @returns Embeddable URL with no-cookie domain
 */
export const getEmbedUrlWithNoCookie = (
  url: string | undefined,
  useNoCookie = true
): string | null => {
  if (!url) return null;

  const videoId = extractVideoId(url);
  if (!videoId) return null;

  const domain = useNoCookie
    ? 'https://www.youtube-nocookie.com/embed'
    : 'https://www.youtube.com/embed';

  return `${domain}/${videoId}`;
};

/**
 * Universal YouTube link formatter
 * Converts any YouTube link format to standardized embed URL with all required parameters
 * @param url - YouTube URL (any format)
 * @param options - Configuration options
 * @returns Fully formatted embed URL
 */
export const formatYouTubeEmbed = (
  url: string | undefined,
  options: {
    useNoCookie?: boolean;
    autoplay?: boolean;
    showRelated?: boolean;
    modestBranding?: boolean;
    controls?: boolean;
  } = {}
): string | null => {
  if (!url) return null;

  const {
    useNoCookie = true,
    autoplay = false,
    showRelated = false,
    modestBranding = true,
    controls = true
  } = options;

  const videoId = extractVideoId(url);
  if (!videoId) return null;

  const domain = useNoCookie
    ? 'https://www.youtube-nocookie.com/embed'
    : 'https://www.youtube.com/embed';

  const params = new URLSearchParams();
  if (autoplay) params.set('autoplay', '1');
  if (!showRelated) params.set('rel', '0');
  if (modestBranding) params.set('modestbranding', '1');
  if (!controls) params.set('controls', '0');
  params.set('fs', '1');
  params.set('enablejsapi', '1');

  const paramString = params.toString();
  return paramString ? `${domain}/${videoId}?${paramString}` : `${domain}/${videoId}`;
};

/**
 * Get responsive iframe attributes for YouTube embedding with security
 * Includes: accelerator, autoplay, clipboard-write, encrypted-media, gyroscope, picture-in-picture
 * @returns Object with safe iframe attributes for production use
 */
export const getIframeAttributes = () => ({
  frameBorder: '0',
  allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
  allowFullScreen: true,
  referrerPolicy: 'strict-origin-when-cross-origin' as const,
  title: 'YouTube Video Player',
  loading: 'lazy' as const,
});

/**
 * Sanitize and convert video URL to safe nocookie embed format
 * Handles multiple input formats and ensures CORS-safe playback
 * @param videoUrl - Raw video URL or ID
 * @returns Sanitized embed URL with nocookie domain and all params, or null
 */
export const sanitizeVideoUrl = (videoUrl: string | undefined | null): string | null => {
  if (!videoUrl || typeof videoUrl !== 'string') {
    return null;
  }

  const embedUrl = getEmbedUrl(videoUrl);
  if (!embedUrl) {
    console.warn('[Video Sanitization] Failed to sanitize URL:', videoUrl);
    return null;
  }

  return embedUrl;
};

/**
 * Safe video player setup for reactive re-rendering
 * Returns unique key for iframe to force React to destroy and recreate on change
 * @param lessonId - Lesson ID for iframe keying
 * @returns Unique key string for iframe
 */
export const getVideoFrameKey = (lessonId: string | undefined): string => {
  return `iframe-${lessonId || Date.now()}`;
};
