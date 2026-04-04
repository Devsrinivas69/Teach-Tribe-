/**
 * YouTube API Search Service
 * Searches for embeddable YouTube videos matching course topics
 */

const https = require('https');

class YouTubeSearchService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('YouTube API key is required');
    }
    this.apiKey = apiKey;
    this.baseUrl = 'https://www.googleapis.com/youtube/v3';
    this.maxResults = 10; // Get more to filter for embeddable
  }

  /**
   * Search YouTube for embeddable videos
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} - Array of video suggestions
   */
  async searchEmbeddableVideos(query, options = {}) {
    const {
      maxResults = 5,
      order = 'relevance',
      videoDuration = 'medium', // short, medium, long
      videoType = 'video'
    } = options;

    try {
      // First search call to get video IDs
      const searchParams = new URLSearchParams({
        q: query,
        part: 'snippet',
        type: videoType,
        videoDuration: videoDuration,
        order: order,
        regionCode: 'US',
        relevanceLanguage: 'en',
        maxResults: Math.min(maxResults * 3, 50), // Get extra to filter
        key: this.apiKey,
        videoEmbeddable: true // Only embeddable videos
      });

      const searchUrl = `${this.baseUrl}/search?${searchParams.toString()}`;
      const searchResults = await this.makeRequest(searchUrl);

      if (!searchResults.items || searchResults.items.length === 0) {
        return [];
      }

      // Extract video IDs
      const videoIds = searchResults.items
        .filter(item => item.id.videoId)
        .map(item => item.id.videoId)
        .slice(0, maxResults * 2);

      if (videoIds.length === 0) {
        return [];
      }

      // Get detailed statistics and check for embeddability
      const videosUrl = `${this.baseUrl}/videos?${new URLSearchParams({
        id: videoIds.join(','),
        part: 'snippet,contentDetails,statistics,processingDetails',
        key: this.apiKey
      }).toString()}`;

      const videosDetails = await this.makeRequest(videosUrl);

      // Filter and format results
      const videos = videosDetails.items
        .filter(video => this.isEmbeddable(video))
        .map(video => this.formatVideoResult(video))
        .slice(0, maxResults);

      return videos;
    } catch (error) {
      console.error('YouTube search error:', error.message);
      throw new Error(`YouTube search failed: ${error.message}`);
    }
  }

  /**
   * Check if video is embeddable
   * @param {Object} video - Video object from YouTube API
   * @returns {boolean}
   */
  isEmbeddable(video) {
    // Check if video has required data
    if (!video.snippet || !video.id) {
      return false;
    }

    // Avoid videos that might be restricted
    const title = video.snippet.title || '';
    const channelTitle = video.snippet.channelTitle || '';

    // Skip if title or channel contains certain keywords
    const restrictedKeywords = ['music video', 'official video', 'trailer'];
    const isRestricted = restrictedKeywords.some(keyword =>
      title.toLowerCase().includes(keyword)
    );

    return !isRestricted;
  }

  /**
   * Format YouTube API response to standard format
   * @param {Object} video - Video from YouTube API
   * @returns {Object} - Formatted video result
   */
  formatVideoResult(video) {
    const {
      id,
      snippet = {},
      statistics = {},
      contentDetails = {}
    } = video;

    const videoId = id;
    const thumbnail = snippet.thumbnails?.medium?.url || '';
    const viewCount = parseInt(statistics.viewCount || 0);
    const likeCount = parseInt(statistics.likeCount || 0);
    const commentCount = parseInt(statistics.commentCount || 0);

    // Estimate engagement score (simple algorithm)
    const engagementScore = this.calculateEngagementScore(
      viewCount,
      likeCount,
      commentCount
    );

    return {
      id: videoId,
      title: snippet.title || 'Untitled',
      description: snippet.description || '',
      channelTitle: snippet.channelTitle || '',
      thumbnailUrl: thumbnail,
      publishedAt: snippet.publishedAt || new Date().toISOString(),
      duration: this.parseDuration(contentDetails.duration || 'PT0S'),
      viewCount: viewCount,
      likeCount: likeCount,
      commentCount: commentCount,
      engagementScore: engagementScore,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
      channelUrl: `https://www.youtube.com/channel/${snippet.channelId || ''}`,
      recommendedFor: 'general' // Will be set by approval system
    };
  }

  /**
   * Calculate engagement score based on views and interactions
   * @param {number} views - Video view count
   * @param {number} likes - Video like count
   * @param {number} comments - Video comment count
   * @returns {number} - Score between 0 and 100
   */
  calculateEngagementScore(views, likes, comments) {
    if (views === 0) return 0;

    // Like ratio + comment ratio
    const likeRatio = (likes / views) * 100;
    const commentRatio = (comments / views) * 100;

    // Weighted average (higher weight on likes)
    const engagementRatio = (likeRatio * 0.7) + (commentRatio * 0.3);

    // Normalize to 0-100 scale (typical engagement is 1-5%)
    return Math.min(engagementRatio * 20, 100);
  }

  /**
   * Parse ISO 8601 duration to readable format
   * @param {string} duration - ISO 8601 duration (e.g., PT1H30M45S)
   * @returns {string} - Formatted duration (e.g., "1:30:45")
   */
  parseDuration(duration) {
    const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const matches = duration.match(regex);

    const hours = parseInt(matches?.[1] || 0);
    const minutes = parseInt(matches?.[2] || 0);
    const seconds = parseInt(matches?.[3] || 0);

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  /**
   * Make HTTP request to YouTube API
   * @param {string} url - Full URL with query params
   * @returns {Promise<Object>} - API response
   */
  makeRequest(url) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('YouTube API request timeout'));
      }, 10000);

      https.get(url, (response) => {
        let data = '';

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          clearTimeout(timeout);

          try {
            if (response.statusCode === 403) {
              return reject(new Error('YouTube API quota exceeded'));
            }
            if (response.statusCode >= 400) {
              return reject(new Error(`API returned status ${response.statusCode}`));
            }

            const parsed = JSON.parse(data);

            if (parsed.error) {
              return reject(new Error(parsed.error.message || 'Unknown API error'));
            }

            resolve(parsed);
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        });
      }).on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Batch search for multiple queries
   * @param {Array<string>} queries - Array of search queries
   * @param {Object} options - Search options
   * @returns {Promise<Object>} - Results grouped by query
   */
  async batchSearch(queries, options = {}) {
    const results = {};

    for (const query of queries) {
      try {
        results[query] = await this.searchEmbeddableVideos(query, options);
      } catch (error) {
        console.error(`Search failed for query "${query}":`, error.message);
        results[query] = [];
      }
    }

    return results;
  }
}

module.exports = YouTubeSearchService;
