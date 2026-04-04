# YouTube Video Suggestion System

Auto-analyze course content and suggest relevant YouTube videos for embedding with admin approval workflow.

## Features

- **Automated Analysis**: Extract keywords from course titles, descriptions, and topics
- **Smart Search**: Generate targeted YouTube search queries from extracted keywords
- **Video Filtering**: Only fetch embeddable videos with engagement metrics
- **Admin Dashboard**: Review, approve, or reject suggestions with batch actions
- **Database Integration**: Store suggestions and approved videos in Supabase
- **Embed Component**: Flexible React component for displaying approved YouTube videos
- **Engagement Scoring**: Rate videos by view count, likes, and comments

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       React Frontend                             │
├──────────────────────────────────────────────────────────────────┤
│ • VideoSuggestionReview.tsx - Admin dashboard                   │
│ • YouTubeEmbed.tsx - Video player component                      │
│ • useVideoSuggestions.ts - Custom hook for API calls             │
└──────────────────────────────────────────────────────────────────┘
                              ↓ HTTP (REST API)
┌──────────────────────────────────────────────────────────────────┐
│                    Node.js Express Backend                        │
├──────────────────────────────────────────────────────────────────┤
│ • api.js - Express server                                        │
│ • routes/videoSuggestions.js - API endpoints                    │
│ • services/keywordExtractor.js - Keyword extraction logic        │
│ • services/youtubeSearch.js - YouTube API integration            │
└──────────────────────────────────────────────────────────────────┘
                              ↓ GitHub API
                    ┌─────────────────────────────────────────┐
                    │    YouTube Data API v3                  │
                    └─────────────────────────────────────────┘
                              ↓ Postgre SQL
┌──────────────────────────────────────────────────────────────────┐
│                      Supabase Database                            │
├──────────────────────────────────────────────────────────────────┤
│ • video_suggestions - Pending/approved/rejected suggestions      │
│ • approved_videos - Final approved videos linked to courses      │
│ • video_analysis_jobs - Track analysis job progress              │
└──────────────────────────────────────────────────────────────────┘
```

## Setup Instructions

### 1. Get YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable "YouTube Data API v3"
4. Create an API key credential (API keys section)
5. Copy the API key

**Note**: Keep your API key secure. Use environment variables in production.

### 2. Environment Variables

Create `.env.local` (for local development) or `.env` (for production deployment):

```bash
# Backend API
VIDEO_API_PORT=3001
FRONTEND_URL=http://localhost:5173

# YouTube API
YOUTUBE_API_KEY=your_actual_api_key_here

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Optional: Custom video API URL for production
REACT_APP_VIDEO_API_URL=http://localhost:3001/api/videos
```

### 3. Database Setup

Run the migration to create necessary tables:

```bash
# Using Supabase CLI
supabase migration up

# Or manually execute the SQL:
# supabase/migrations/20260214_video_suggestions_schema.sql
```

The migration creates:
- `video_suggestions` - Stores suggested videos (pending/approved/rejected)
- `approved_videos` - Final approved videos with position info
- `video_analysis_jobs` - Tracks analysis job status
- Triggers for `updated_at` timestamps
- Row-level security (RLS) policies

### 4. Install Dependencies

The backend requires additional npm packages:

```bash
npm install express cors dotenv axios
```

Update `package.json` if not already included:

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "axios": "^1.6.0"
  }
}
```

### 5. Start Services

**Terminal 1 - Frontend (Vite dev server):**
```bash
npm run dev
```

**Terminal 2 - Backend API:**
```bash
npm run start:api
```

Check health:
```bash
curl http://localhost:3001/health
```

Response should be:
```json
{
  "status": "ok",
  "timestamp": "2026-02-14T12:00:00.000Z",
  "youtubeServiceReady": true
}
```

## Usage

### For Admins (Through Dashboard)

1. Navigate to the Video Suggestion Review admin page
2. Select a course to analyze
3. Click "Analyze Course" to extract keywords and search YouTube
4. Review the found videos with engagement metrics
5. Approve videos individually or in bulk
6. Approved videos are saved to the database

### In Course Pages

```tsx
import YouTubeEmbed from '@/components/YouTubeEmbed';

export default function CoursePage() {
  const video = {
    id: 'dQw4w9WgXcQ',
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    watchUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    title: 'How to Learn Web Development',
    description: 'Complete guide...',
    channelTitle: 'Dev Academy',
    duration: '45:30',
    viewCount: 1000000
  };

  return (
    <YouTubeEmbed
      video={video}
      title="Introductory Video"
      showMetadata={true}
      allowFullscreen={true}
    />
  );
}
```

## API Endpoints

### POST `/api/videos/analyze-and-suggest`

Analyze a course and suggest YouTube videos.

**Request:**
```json
{
  "courseId": "course-123",
  "course": {
    "title": "React Advanced Patterns",
    "description": "Learn advanced React patterns...",
    "topics": ["hooks", "context", "performance"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "courseId": "course-123",
  "analysis": {
    "keywords": ["react", "hooks", "patterns", ...],
    "searchQueries": ["React Advanced Patterns", "React Hooks", ...]
  },
  "suggestions": [
    {
      "id": "video-id",
      "title": "Advanced React Patterns",
      "embedUrl": "https://www.youtube.com/embed/...",
      "engagementScore": 87.5,
      "viewCount": 500000,
      ...
    }
  ],
  "totalFound": 15
}
```

### POST `/api/videos/approve`

Approve a suggested video.

**Request:**
```json
{
  "suggestionId": "suggestion-uuid",
  "courseId": "course-123",
  "lessonId": "lesson-456"
}
```

### POST `/api/videos/reject`

Reject a suggested video.

**Request:**
```json
{
  "suggestionId": "suggestion-uuid",
  "reason": "Outdated content"
}
```

### GET `/api/videos/:courseId/approved`

Get all approved videos for a course (public endpoint).

**Response:**
```json
{
  "success": true,
  "approvedVideos": [
    {
      "id": "approved-video-uuid",
      "video_suggestions": {
        "title": "...",
        "embed_url": "...",
        "thumbnail_url": "..."
      },
      "position_in_lesson": 0,
      "is_active": true
    }
  ]
}
```

## Keyword Extraction Algorithm

The system uses a multi-step approach:

1. **Text Processing**
   - Combine title, description, and topics
   - Remove special characters
   - Filter to words > 3 characters

2. **Stop Word Filtering**
   - Remove common words (the, and, is, etc.)
   - Improves signal-to-noise ratio

3. **Frequency Analysis**
   - Count word occurrences
   - Higher frequency = more relevant

4. **Scoring**
   - Title words: 2x multiplier
   - Course-related terms: 1.5x multiplier
   - Uncommon words: higher weight

5. **Top Selection**
   - Extract top 10 keywords
   - Generate 8 search queries from combinations

## YouTube Video Filtering

Videos are filtered using:

- **Embeddable Status**: Only videos marked embeddable by YouTube
- **Duration**: Medium length (5 min - 1 hour) preferred
- **Engagement Score**: Calculated from:
  - Like ratio: (likes / views) × 0.7
  - Comment ratio: (comments / views) × 0.3
- **Content Safety**: Skip known problematic channels/categories

## Database Schema

### video_suggestions
```sql
{
  id: UUID PRIMARY KEY,
  course_id: UUID FOREIGN KEY,
  youtube_video_id: VARCHAR(255),
  title: VARCHAR(500),
  description: TEXT,
  ... (40+ fields for metadata)
  status: VARCHAR(50), -- pending, approved, rejected, archived
  approved_by: UUID,
  approved_at: TIMESTAMP,
  rejection_reason: TEXT
}
```

### approved_videos
```sql
{
  id: UUID PRIMARY KEY,
  video_suggestion_id: UUID FOREIGN KEY,
  course_id: UUID FOREIGN KEY,
  lesson_id: UUID,
  ... (metadata)
  position_in_lesson: INT, -- 0: intro, 1: main, 2: supplement
  is_active: BOOLEAN,
  is_featured: BOOLEAN,
  view_count: INT DEFAULT 0,
  click_count: INT DEFAULT 0
}
```

## Rate Limiting

YouTube API quota:
- Free tier: 10,000 units/day
- 1 search call = ~100 units
- 1 video details call = ~1 unit
- ~80-100 videos per day recommended

Implement caching and batch operations to maximize quota.

## Error Handling

Common errors:

| Error | Cause | Solution |
|-------|-------|----------|
| 403 Forbidden | API quota exceeded | Wait until next day or upgrade quota |
| 400 Bad Request | Wrong API key | Check YOUTUBE_API_KEY in .env |
| 404 Not Found | Invalid course ID | Verify course exists in database |
| Timeout | Slow internet/API | Increase timeout, retry logic |

## Security Considerations

1. **API Key Protection**
   - Never commit `.env` file
   - Use environment variables
   - Rotate keys periodically

2. **User Permissions**
   - Only admins/instructors can analyze and approve
   - Students can only view approved videos
   - Use RLS policies in Supabase

3. **Content Moderation**
   - Review videos before approval
   - Engagement scoring helps identify quality
   - Manual review recommended for sensitive courses

4. **CORS Policy**
   - Configure CORS origins in backend
   - Restrict to known frontend URLs

## Troubleshooting

### "YouTube API key is required"
- Check `YOUTUBE_API_KEY` set in .env
- Restart backend server after adding key

### "Video failed to load"
- Check browser console for CORS errors
- Verify YouTube video is still available
- Try opening in new tab via "Watch on YouTube" button

### Slow analysis
- YouTube API requests may take 5-10 seconds total
- Batch searches to improve throughput
- Consider caching results

### No suggestions found
- Course title/description may be too generic
- Try manually selecting keywords
- More detailed course content = better results

## Performance Optimization

### Frontend
- Virtualize long video lists with `react-window`
- Lazy load video thumbnails
- Cache recent analysis results

### Backend
- Implement result caching (Redis)
- Batch YouTube API requests
- Use worker threads for keyword extraction

### Database
- Index on `course_id` and `status`
- Archive old suggestions periodically
- Monitor query performance

## Future Enhancements

1. **Multi-source Videos**
   - Support Vimeo, AWS IVS, self-hosted
   - Video provider abstraction layer

2. **ML-Based Filtering**
   - Content classification models
   - Automatic quality scoring
   - Personalized recommendations

3. **Workflow Automation**
   - Auto-approve high-quality videos
   - Scheduled analysis jobs
   - Batch processing improvements

4. **Analytics**
   - Track which approved videos get watched
   - Engagement metrics per lesson
   - Student feedback integration

5. **International**
   - Multi-language search
   - Regional video preferences
   - Subtitle extraction

## Support & Contributing

For issues or improvements:
1. Check existing issues in repository
2. Provide error messages and environment info
3. Include steps to reproduce

## License

MIT - Use in commercial projects freely

---

**Last Updated**: February 14, 2026  
**API Version**: 1.0  
**Node Version**: 18+
