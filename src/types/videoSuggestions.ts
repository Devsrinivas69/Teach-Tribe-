/**
 * YouTube Video Suggestion System - TypeScript Types
 */

/**
 * YouTube Video Metadata
 */
export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  thumbnailUrl: string;
  publishedAt: string;
  duration: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  engagementScore: number;
  embedUrl: string;
  watchUrl: string;
  channelUrl: string;
  recommendedFor?: 'general' | 'intro' | 'advanced' | 'example';
}

export interface CourseContent {
  id: string;
  title: string;
  description?: string;
  topics?: string[];
  what_you_learn?: string[];
  requirements?: string[];
  category?: string;
  level?: string;
}

export interface KeywordAnalysis {
  courseId: string;
  keywords: string[];
  searchQueries: string[];
  extractedAt: string;
}

export interface VideoSuggestion {
  id: string;
  courseId: string;
  youtubeVideoId: string;
  title: string;
  description: string;
  channelTitle: string;
  thumbnailUrl: string;
  watchUrl: string;
  embedUrl: string;
  channelUrl?: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  engagementScore: number;
  duration: string;
  publishedAt: string;
  searchQuery: string;
  keywordMatchScore: number;
  suggestedBy?: string;
  suggestedAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'archived';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  topicId?: string;
  lessonId?: string;
  recommendedFor?: 'general' | 'intro' | 'advanced' | 'example';
  estimatedPosition?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovedVideo {
  id: string;
  videoSuggestionId: string;
  courseId: string;
  lessonId?: string;
  sectionIndex?: number;
  lessonIndex?: number;
  positionInLesson: number;
  displayOrder: number;
  usageNotes?: string;
  internalNotes?: string;
  viewCount: number;
  clickCount: number;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  videoSuggestions?: VideoSuggestion;
}

export interface VideoAnalysisJob {
  id: string;
  courseId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  keywords: string[];
  searchQueries: string[];
  resultsCount: number;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyzeCourseRequest {
  courseId: string;
  course: CourseContent;
}

export interface AnalyzeCourseResponse {
  success: boolean;
  courseId: string;
  analysis: KeywordAnalysis;
  suggestions: YouTubeVideo[];
  totalFound: number;
}

export interface SaveSuggestionsRequest {
  courseId: string;
  suggestions: YouTubeVideo[];
}

export interface SaveSuggestionsResponse {
  success: boolean;
  saved: number;
  failed: number;
  errors?: Array<{ videoId: string; error: string }>;
}

export interface ApproveSuggestionRequest {
  suggestionId: string;
  courseId: string;
  lessonId?: string;
}

export interface ApproveSuggestionResponse {
  success: boolean;
  message: string;
  approvedVideo?: ApprovedVideo;
}

export interface RejectSuggestionRequest {
  suggestionId: string;
  reason?: string;
}

export interface RejectSuggestionResponse {
  success: boolean;
  message: string;
}

export interface FetchSuggestionsRequest {
  courseId: string;
  status?: 'pending' | 'approved' | 'rejected' | 'archived';
}

export interface FetchSuggestionsResponse {
  success: boolean;
  suggestions: VideoSuggestion[];
}

export interface FetchApprovedVideosRequest {
  courseId: string;
}

export interface FetchApprovedVideosResponse {
  success: boolean;
  approvedVideos: ApprovedVideo[];
}

export interface YouTubeSearchOptions {
  maxResults?: number;
  order?: 'relevance' | 'rating' | 'viewCount' | 'videoCount';
  videoDuration?: 'short' | 'medium' | 'long';
  videoType?: 'video' | 'playlist' | 'channel';
}

export interface BatchSearchResults {
  [query: string]: YouTubeVideo[];
}

export interface UseVideoSuggestionsReturn {
  loading: boolean;
  error: string | null;
  suggestions: VideoSuggestion[] | YouTubeVideo[];
  analysis: KeywordAnalysis | null;
  analyzeCourse: (courseId: string, course: CourseContent) => Promise<void>;
  saveSuggestions: (courseId: string, suggestions: YouTubeVideo[]) => Promise<void>;
  approveSuggestion: (suggestionId: string, courseId: string) => Promise<void>;
  rejectSuggestion: (suggestionId: string, reason: string) => Promise<void>;
  fetchSuggestions: (courseId: string, status?: string) => Promise<void>;
}

export interface VideoSuggestionReviewProps {
  courseId?: string;
}

export interface YouTubeEmbedProps {
  video: YouTubeVideo;
  title?: string;
  description?: string;
  showMetadata?: boolean;
  showRelated?: boolean;
  allowFullscreen?: boolean;
  onVideoClick?: () => void;
  className?: string;
  aspectRatio?: 'auto' | '16/9' | '4/3';
}

export interface CompactVideoCardProps {
  video: YouTubeVideo;
  onSelect?: (video: YouTubeVideo) => void;
}

export interface VideoSuggestionCardProps {
  video: YouTubeVideo;
  isSelected: boolean;
  onToggleSelect: () => void;
  onApprove: () => void;
  onReject: () => void;
  loading: boolean;
  autoApproveThreshold: number;
}

export interface EnvConfig {
  YOUTUBE_API_KEY: string;
  VIDEO_API_PORT: number;
  FRONTEND_URL: string;
  NODE_ENV: 'development' | 'staging' | 'production';
  YOUTUBE_MAX_RESULTS_PER_QUERY?: number;
  YOUTUBE_PREFERRED_DURATION?: 'short' | 'medium' | 'long';
  YOUTUBE_SEARCH_ORDER?: 'relevance' | 'rating' | 'viewCount';
  AUTO_APPROVE_THRESHOLD?: number;
  ENABLE_AUTO_APPROVE?: boolean;
}

export interface APIErrorResponse {
  error: string;
  message?: string;
  timestamp?: string;
}

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  youtubeServiceReady: boolean;
}

export interface EngagementMetrics {
  viewCount: number;
  likeCount: number;
  commentCount: number;
  engagementScore: number;
  engagementRatio: number;
  averageViews: number;
  totalVideos: number;
}

export interface VideoAnalytics {
  videoId: string;
  courseId: string;
  viewCount: number;
  clickCount: number;
  averageWatchTime?: number;
  completionRate?: number;
  lastViewedAt?: string;
}

export default {};
