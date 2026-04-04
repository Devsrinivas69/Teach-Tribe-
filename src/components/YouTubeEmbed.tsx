/**
 * YouTubeEmbed Component
 * Reusable component for embedding YouTube videos with robust error handling
 * Uses no-cookie domain by default to bypass embedding restrictions
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ExternalLink, PlayCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatYouTubeEmbed, extractVideoId, getIframeAttributes, getVideoFrameKey } from '@/lib/youtubeUtils';

export interface YouTubeVideoData {
  id: string;
  embedUrl: string;
  watchUrl: string;
  title: string;
  description?: string;
  channelTitle?: string;
  channelUrl?: string;
  duration?: string;
  publishedAt?: string;
  viewCount?: number;
  thumbnail?: string;
}

interface YouTubeEmbedProps {
  video: YouTubeVideoData;
  title?: string;
  description?: string;
  showMetadata?: boolean;
  showRelated?: boolean;
  allowFullscreen?: boolean;
  useNoCookie?: boolean;
  onVideoClick?: () => void;
  className?: string;
  aspectRatio?: '16/9' | '4/3' | 'auto';
}

/**
 * Main YouTube Embed Component
 * Displays a YouTube video with comprehensive error handling and fallback UI
 */
export const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({
  video,
  title,
  description,
  showMetadata = true,
  showRelated = false,
  allowFullscreen = true,
  useNoCookie = true,
  onVideoClick,
  className = '',
  aspectRatio = '16/9'
}) => {
  const [isLoadingVideo, setIsLoadingVideo] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  const displayTitle = title || video.title || 'Course Video';
  const displayDescription = description || video.description || '';
  const videoId = extractVideoId(video.embedUrl || video.id);
  const videoFrameKey = getVideoFrameKey(videoId);

  const getEmbedUrl = () => {
    return formatYouTubeEmbed(video.embedUrl || video.id, {
      useNoCookie,
      showRelated,
      modestBranding: true,
      controls: true,
      autoplay: false
    });
  };

  const handleIframeLoad = () => {
    setIsLoadingVideo(false);
    setVideoError(null);
  };

  const handleIframeError = () => {
    setVideoError('Video unavailable. The video owner may have disabled embedding.');
    setIsLoadingVideo(false);
  };

  const handleRetry = () => {
    setIsLoadingVideo(true);
    setVideoError(null);
    setIframeKey(prev => prev + 1);
  };

  const containerClasses = {
    'auto': 'w-full',
    '16/9': 'w-full pt-[56.25%]',
    '4/3': 'w-full pt-[75%]'
  };

  const embedUrl = getEmbedUrl();

  if (!videoId || !embedUrl) {
    return <VideoUnavailableFallback title={displayTitle} />;
  }

  return (
    <div className={className}>
      <Card className="overflow-hidden bg-white">
        {/* Responsive Video Container */}
        <div className="relative bg-black w-full">
          {aspectRatio === 'auto' ? (
            <div className="h-96">
              {videoError ? (
                <VideoErrorState
                  error={videoError}
                  title={displayTitle}
                  watchUrl={video.watchUrl}
                  onRetry={handleRetry}
                />
              ) : (
                <>
                  {isLoadingVideo && <VideoLoadingState />}
                  <iframe
                    key={`${videoFrameKey}-${iframeKey}`}
                    src={embedUrl}
                    width="100%"
                    height="100%"
                    title={displayTitle}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen={allowFullscreen}
                    referrerPolicy="strict-origin-when-cross-origin"
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                    onClick={onVideoClick}
                    className="w-full h-full"
                  />
                </>
              )}
            </div>
          ) : (
            <div
              className={`relative ${containerClasses[aspectRatio as keyof typeof containerClasses]} w-full`}
              style={{ paddingBottom: aspectRatio === '16/9' ? '56.25%' : '75%' }}
            >
              <div className="absolute inset-0 w-full h-full">
                {videoError ? (
                  <VideoErrorState
                    error={videoError}
                    title={displayTitle}
                    watchUrl={video.watchUrl}
                    onRetry={handleRetry}
                  />
                ) : (
                  <>
                    {isLoadingVideo && <VideoLoadingState />}
                    <iframe
                      key={`${videoFrameKey}-${iframeKey}`}
                      src={embedUrl}
                      width="100%"
                      height="100%"
                      title={displayTitle}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                      allowFullScreen={allowFullscreen}
                      referrerPolicy="strict-origin-when-cross-origin"
                      onLoad={handleIframeLoad}
                      onError={handleIframeError}
                      onClick={onVideoClick}
                      className="absolute inset-0 w-full h-full"
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Metadata Section */}
        {showMetadata && (
          <CardContent className="p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold line-clamp-2 text-gray-900">
                {displayTitle}
              </h3>
              {displayDescription && (
                <p className="text-sm text-gray-600 mt-2 line-clamp-3">
                  {displayDescription}
                </p>
              )}
            </div>

            {/* Video Metadata */}
            <VideoMetadata video={video} />

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => window.open(video.watchUrl, '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
                Watch on YouTube
              </Button>
              {videoError && (
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={handleRetry}
                >
                  Retry
                </Button>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

/**
 * Video Loading State Component
 */
const VideoLoadingState: React.FC = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
    <div className="text-center">
      <div className="animate-spin mx-auto mb-4">
        <div className="h-12 w-12 border-4 border-gray-700 border-t-white rounded-full" />
      </div>
      <p className="text-white text-sm">Loading video...</p>
    </div>
  </div>
);

/**
 * Video Error State Component
 */
interface VideoErrorStateProps {
  error: string;
  title: string;
  watchUrl: string;
  onRetry: () => void;
}

const VideoErrorState: React.FC<VideoErrorStateProps> = ({
  error,
  title,
  watchUrl,
  onRetry
}) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 p-4">
    <div className="text-center">
      <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h3 className="text-white font-semibold mb-2">Video Unavailable</h3>
      <p className="text-gray-300 text-sm mb-4 max-w-xs">{error}</p>
      <div className="flex gap-2 justify-center">
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
        <Button
          size="sm"
          variant="default"
          onClick={() => window.open(watchUrl, '_blank')}
          className="gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          Watch on YouTube
        </Button>
      </div>
    </div>
  </div>
);

/**
 * Video Unavailable Fallback Component
 */
interface VideoUnavailableFallbackProps {
  title: string;
}

const VideoUnavailableFallback: React.FC<VideoUnavailableFallbackProps> = ({ title }) => (
  <Card className="overflow-hidden bg-white">
    <div className="relative w-full pt-[56.25%] bg-gray-900">
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <PlayCircle className="w-16 h-16 text-gray-500 mb-4" />
        <h3 className="text-gray-300 font-semibold mb-2">Video Preview Unavailable</h3>
        <p className="text-gray-400 text-sm">This video cannot be embedded</p>
      </div>
    </div>
    <CardContent className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <Button
        variant="default"
        className="w-full gap-2"
        onClick={() => window.open(
          `https://www.youtube.com/search?q=${encodeURIComponent(title)}`,
          '_blank'
        )}
      >
        <ExternalLink className="w-4 h-4" />
        Find on YouTube
      </Button>
    </CardContent>
  </Card>
);

/**
 * Video Metadata Component
 * Displays YouTube video metadata
 */
interface VideoMetadataProps {
  video: YouTubeVideoData;
}

const VideoMetadata: React.FC<VideoMetadataProps> = ({ video }) => {
  const publishDate = video.publishedAt ? new Date(video.publishedAt).toLocaleDateString() : null;
  const viewCount = video.viewCount ? new Intl.NumberFormat().format(video.viewCount) : null;

  return (
    <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
      <div className="flex flex-wrap gap-2">
        {video.channelTitle && (
          <Badge variant="secondary">{video.channelTitle}</Badge>
        )}
        {video.duration && (
          <Badge variant="outline">{video.duration}</Badge>
        )}
      </div>

      <div className="text-xs text-gray-600 space-y-1">
        {viewCount && <p>Views: {viewCount}</p>}
        {publishDate && <p>Published: {publishDate}</p>}
      </div>
    </div>
  );
};

/**
 * Compact Video Card Component
 * Minimal video card for course content pages
 */
interface CompactVideoCardProps {
  video: YouTubeVideoData;
  onSelect?: (video: YouTubeVideoData) => void;
}

export const CompactVideoCard: React.FC<CompactVideoCardProps> = ({ video, onSelect }) => {
  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
      onClick={() => onSelect?.(video)}
    >
      <div className="aspect-video bg-gray-300 relative overflow-hidden">
        {video.thumbnail && (
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform"
          />
        )}
        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <div className="ml-1">▶</div>
          </div>
        </div>
      </div>

      <CardContent className="p-3">
        <h4 className="font-semibold line-clamp-2 text-sm">{video.title}</h4>
        {video.channelTitle && (
          <p className="text-xs text-gray-600 mt-1">{video.channelTitle}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default YouTubeEmbed;
