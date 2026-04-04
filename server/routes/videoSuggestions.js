/**
 * YouTube Video Suggestion API Routes
 * Backend endpoints for analyzing courses and managing video suggestions
 */

const express = require('express');
const YouTubeSearchService = require('../services/youtubeSearch');
const { analyzeCourse } = require('../services/keywordExtractor');

const router = express.Router();

// Middleware to verify API key and user role
const verifyAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  const apiKey = req.headers['x-api-key'];

  // In production, validate JWT token and check user role
  if (!token && !apiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // For demo: simple validation
  req.user = { role: req.headers['x-user-role'] || 'instructor' };
  next();
};

const isAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'instructor') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

// Initialize YouTube service (set in main server file)
let youtubeService = null;

/**
 * POST /api/suggest-videos
 * Analyze a course and suggest related YouTube videos
 */
router.post('/analyze-and-suggest', verifyAuth, isAdmin, async (req, res) => {
  try {
    const { courseId, course } = req.body;

    if (!course || !course.title) {
      return res.status(400).json({ error: 'Course data with title is required' });
    }

    if (!youtubeService) {
      return res.status(500).json({ error: 'YouTube service not configured' });
    }

    // Step 1: Extract keywords
    const analysis = analyzeCourse(course);
    console.log(`[Video Suggestion] Analyzed course: ${course.title}`);
    console.log(`[Video Suggestion] Keywords: ${analysis.keywords.join(', ')}`);

    // Step 2: Search for videos for each query
    const videoResults = {};
    for (const query of analysis.searchQueries) {
      try {
        const videos = await youtubeService.searchEmbeddableVideos(query, {
          maxResults: 5,
          order: 'relevance'
        });
        videoResults[query] = videos;
        console.log(`[Video Suggestion] Found ${videos.length} videos for query: ${query}`);
      } catch (error) {
        console.error(`Failed to search for "${query}":`, error.message);
        videoResults[query] = [];
      }
    }

    // Step 3: Prepare suggestions response
    const suggestions = [];
    let suggestionIndex = 0;

    for (const [query, videos] of Object.entries(videoResults)) {
      for (const video of videos) {
        if (suggestionIndex >= 15) break; // Limit total suggestions

        suggestions.push({
          ...video,
          courseId: courseId,
          searchQuery: query,
          matchedKeywords: analysis.keywords.filter(kw => 
            query.toLowerCase().includes(kw.toLowerCase())
          ),
          suggestAt: new Date().toISOString()
        });

        suggestionIndex++;
      }
    }

    res.json({
      success: true,
      courseId,
      analysis: {
        keywords: analysis.keywords,
        searchQueries: analysis.searchQueries
      },
      suggestions: suggestions.sort((a, b) => b.engagementScore - a.engagementScore),
      totalFound: suggestions.length
    });

  } catch (error) {
    console.error('[Video Suggestion] Error:', error.message);
    res.status(500).json({
      error: 'Failed to analyze course and suggest videos',
      message: error.message
    });
  }
});

/**
 * POST /api/suggest-videos/save-suggestions
 * Save VideoSuggestion records to database
 */
router.post('/save-suggestions', verifyAuth, isAdmin, async (req, res) => {
  try {
    const { courseId, suggestions, supabaseClient } = req.body;

    if (!courseId || !suggestions || !Array.isArray(suggestions)) {
      return res.status(400).json({ error: 'courseId and suggestions array required' });
    }

    if (!supabaseClient) {
      return res.status(400).json({ error: 'Supabase client required' });
    }

    // Save each suggestion to database
    const savedSuggestions = [];
    const errors = [];

    for (const suggestion of suggestions) {
      try {
        const { data, error } = await supabaseClient
          .from('video_suggestions')
          .upsert(
            {
              course_id: courseId,
              youtube_video_id: suggestion.id,
              title: suggestion.title,
              description: suggestion.description.substring(0, 1000),
              channel_title: suggestion.channelTitle,
              thumbnail_url: suggestion.thumbnailUrl,
              watch_url: suggestion.watchUrl,
              embed_url: suggestion.embedUrl,
              channel_url: suggestion.channelUrl,
              view_count: suggestion.viewCount,
              like_count: suggestion.likeCount,
              comment_count: suggestion.commentCount,
              engagement_score: suggestion.engagementScore,
              duration: suggestion.duration,
              published_at: suggestion.publishedAt,
              search_query: suggestion.searchQuery,
              keyword_match_score: suggestion.matchedKeywords?.length || 0,
              status: 'pending'
            },
            { onConflict: 'course_id,youtube_video_id' }
          );

        if (error) {
          errors.push({ videoId: suggestion.id, error: error.message });
        } else {
          savedSuggestions.push(suggestion.id);
        }
      } catch (err) {
        errors.push({ videoId: suggestion.id, error: err.message });
      }
    }

    res.json({
      success: true,
      saved: savedSuggestions.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('[Save Suggestions] Error:', error.message);
    res.status(500).json({
      error: 'Failed to save suggestions',
      message: error.message
    });
  }
});

/**
 * POST /api/suggest-videos/approve
 * Approve a video suggestion
 */
router.post('/approve', verifyAuth, isAdmin, async (req, res) => {
  try {
    const { sugestionId, courseId, lessonId, supabaseClient } = req.body;

    if (!sugestionId || !courseId) {
      return res.status(400).json({ error: 'suggestionId and courseId required' });
    }

    // Update suggestion status
    const { data: suggestionData, error: suggestionError } = await supabaseClient
      .from('video_suggestions')
      .update({
        status: 'approved',
        approved_by: req.user?.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', sugestionId);

    if (suggestionError) {
      return res.status(400).json({ error: suggestionError.message });
    }

    // Create approved_video record
    const { data: approvedData, error: approvedError } = await supabaseClient
      .from('approved_videos')
      .insert({
        video_suggestion_id: sugestionId,
        course_id: courseId,
        lesson_id: lessonId,
        position_in_lesson: 0,
        is_active: true
      });

    if (approvedError) {
      return res.status(400).json({ error: approvedError.message });
    }

    res.json({
      success: true,
      message: 'Video approved',
      approvedVideo: approvedData?.[0]
    });

  } catch (error) {
    console.error('[Approve Video] Error:', error.message);
    res.status(500).json({
      error: 'Failed to approve video',
      message: error.message
    });
  }
});

/**
 * POST /api/suggest-videos/reject
 * Reject a video suggestion
 */
router.post('/reject', verifyAuth, isAdmin, async (req, res) => {
  try {
    const { suggestionId, reason, supabaseClient } = req.body;

    if (!suggestionId) {
      return res.status(400).json({ error: 'suggestionId required' });
    }

    const { error } = await supabaseClient
      .from('video_suggestions')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        approved_by: req.user?.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', suggestionId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      success: true,
      message: 'Video rejected'
    });

  } catch (error) {
    console.error('[Reject Video] Error:', error.message);
    res.status(500).json({
      error: 'Failed to reject video',
      message: error.message
    });
  }
});

/**
 * GET /api/suggest-videos/:courseId/suggestions
 * Get pending video suggestions for a course
 */
router.get('/:courseId/suggestions', verifyAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { status = 'pending', supabaseClient } = req.body;

    const { data, error } = await supabaseClient
      .from('video_suggestions')
      .select('*')
      .eq('course_id', courseId)
      .eq('status', status)
      .order('engagement_score', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      success: true,
      suggestions: data || []
    });

  } catch (error) {
    console.error('[Get Suggestions] Error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch suggestions',
      message: error.message
    });
  }
});

/**
 * GET /api/suggest-videos/:courseId/approved
 * Get approved videos for a course
 */
router.get('/:courseId/approved', async (req, res) => {
  try {
    const { courseId } = req.params;
    const { supabaseClient } = req.body;

    const { data, error } = await supabaseClient
      .from('approved_videos')
      .select(`
        *,
        video_suggestions:video_suggestion_id (
          title,
          embed_url,
          watch_url,
          thumbnail_url,
          duration
        )
      `)
      .eq('course_id', courseId)
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      success: true,
      approvedVideos: data || []
    });

  } catch (error) {
    console.error('[Get Approved Videos] Error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch approved videos',
      message: error.message
    });
  }
});

// Export router and function to set YouTube service
module.exports = {
  router,
  setYoutubeService: (service) => {
    youtubeService = service;
  }
};
