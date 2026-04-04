# YouTube Video Suggestion System - Implementation Guide

Complete solution for auto-analyzing course content and suggesting relevant YouTube videos with admin approval workflow.

## 📦 What's Included

### Backend Services
- ✅ **Keyword Extraction** (`server/services/keywordExtractor.js`) - Extract keywords from course content
- ✅ **YouTube Search** (`server/services/youtubeSearch.js`) - Search and filter embeddable YouTube videos
- ✅ **REST API** (`server/api.js`, `server/routes/videoSuggestions.js`) - Express endpoints for video analysis
- ✅ **Database Migrations** (`supabase/migrations/20260214_video_suggestions_schema.sql`) - Supabase tables & RLS policies

### Frontend Components
- ✅ **Admin Dashboard** (`src/components/VideoSuggestionReview.tsx`) - Review and approve video suggestions
- ✅ **Video Embed** (`src/components/YouTubeEmbed.tsx`) - Reusable YouTube player component with metadata
- ✅ **Custom Hook** (`src/hooks/useVideoSuggestions.ts`) - React hook for API integration

### Documentation
- ✅ **Setup Guide** (`docs/YOUTUBE_SUGGESTIONS_SETUP.md`) - Complete setup and configuration instructions
- ✅ **Integration Examples** (`docs/INTEGRATION_EXAMPLES.tsx`) - Code examples for different use cases
- ✅ **Environment Template** (`.env.example`) - Environment variables reference

---

## 🚀 Quick Start (5 Steps)

### Step 1: Get YouTube API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project → Enable "YouTube Data API v3" → Create API key
3. Copy the API key

### Step 2: Configure Environment
Create `.env.local`:
```bash
YOUTUBE_API_KEY=your_api_key_here
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VIDEO_API_PORT=3001
FRONTEND_URL=http://localhost:5173
```

### Step 3: Run Database Migration
```bash
# Execute SQL in your Supabase console:
# docs/database-schema.sql
# Or use Supabase CLI:
supabase migration up
```

### Step 4: Install Dependencies
```bash
npm install express cors dotenv axios
```

### Step 5: Start Services
**Terminal 1:**
```bash
npm run dev
```

**Terminal 2:**
```bash
npm run start:api
```

Done! Access admin dashboard at `http://localhost:5173/admin/videos`

---

## 📋 File Structure

```
teach-tribe/
├── server/
│   ├── api.js                              # Express API server
│   ├── services/
│   │   ├── keywordExtractor.js             # Keyword extraction logic
│   │   └── youtubeSearch.js                # YouTube API integration
│   └── routes/
│       └── videoSuggestions.js             # API endpoints
│
├── src/
│   ├── components/
│   │   ├── VideoSuggestionReview.tsx       # Admin dashboard
│   │   └── YouTubeEmbed.tsx                # Video player
│   ├── hooks/
│   │   └── useVideoSuggestions.ts          # React hook
│   └── ...
│
├── supabase/
│   └── migrations/
│       └── 20260214_video_suggestions_schema.sql  # DB schema
│
├── docs/
│   ├── YOUTUBE_SUGGESTIONS_SETUP.md        # Full setup guide
│   ├── INTEGRATION_EXAMPLES.tsx            # Code examples
│   └── API_ENDPOINTS.md                    # API reference
│
└── .env.example                            # Environment template
```

---

## 🔑 Key Features

### 1. Automated Keyword Extraction
```javascript
// Automatically extract keywords from course content
const keywords = extractKeywords({
  title: "React Advanced Patterns",
  description: "Learn advanced React patterns...",
  topics: ["hooks", "context", "performance"]
});
// Result: ["react", "hooks", "patterns", ...]
```

### 2. Intelligent Search Queries
```javascript
// Generate targeted YouTube search queries
const queries = generateSearchQueries(keywords, courseTitle);
// Result: ["React Advanced Patterns", "React Hooks", "React Context", ...]
```

### 3. Smart Video Filtering
- Only embeddable videos
- Engagement scoring (likes + comments per views)
- Duration filtering (prefer 5-60 minute videos)
- Avoid restricted content

### 4. Admin Approval Workflow
- Review videos in dashboard
- See engagement metrics
- Approve individually or in batch
- Reject with custom reasons
- Store approved videos in database

### 5. Flexible Embedding
```tsx
import YouTubeEmbed from '@/components/YouTubeEmbed';

<YouTubeEmbed
  video={videoData}
  title="Introductory Video"
  showMetadata={true}
  allowFullscreen={true}
/>
```

---

## 📊 Architecture Diagram

```
┌────────────────────────────────────────────────────────────┐
│                 React Frontend (Vite)                       │
├────────────────────────────────────────────────────────────┤
│ • VideoSuggestionReview (Admin Dashboard)                  │
│ • YouTubeEmbed (Video Player)                              │
│ • useVideoSuggestions (React Hook)                         │
└──────────────────────┬─────────────────────────────────────┘
                       │ HTTP (POST/GET)
                       │ /api/videos/analyze-and-suggest
                       │ /api/videos/approve
                       │ /api/videos/reject
                       ↓
┌────────────────────────────────────────────────────────────┐
│             Express.js API Server (Port 3001)              │
├────────────────────────────────────────────────────────────┤
│ • API Routes (videoSuggestions.js)                         │
│ • Logic Layer (middleware)                                 │
└──────────────────────┬──────────────────────┬──────────────┘
                       │                      │
                       ↓                      ↓
          ┌──────────────────────┐  ┌─────────────────────┐
          │  YouTube Data API    │  │ Supabase Database   │
          │  (Search & Filter)   │  │ (Store Suggestions) │
          └──────────────────────┘  └─────────────────────┘
```

---

## 💾 Database Schema

### video_suggestions
Stores all suggested videos (pending, approved, rejected)
```sql
{
  id, course_id, youtube_video_id, title, description,
  channel_title, thumbnail_url, watch_url, embed_url,
  view_count, like_count, comment_count, engagement_score,
  search_query, status, approved_by, approved_at,
  rejection_reason, created_at, updated_at
}
```

### approved_videos
Final approved videos linked to lessons
```sql
{
  id, video_suggestion_id, course_id, lesson_id,
  position_in_lesson, is_active, view_count, click_count,
  created_at, updated_at
}
```

### video_analysis_jobs
Track analysis job progress
```sql
{
  id, course_id, status, keywords, search_queries,
  results_count, error_message, started_at, completed_at
}
```

---

## 🎯 Usage Scenarios

### For Admin
1. Go to `/admin/videos`
2. Select a course
3. Click "Analyze Course"
4. Review suggested videos
5. Approve or reject each video
6. Click "Save Suggestions"

### For Instructor (In Lesson)
1. See "Suggested Videos" section
2. Click "Analyze & Suggest Videos"
3. Review top 3 suggestions
4. Request approval from admin

### For Student (Course Page)
1. See approved videos embedded in course content
2. Play videos directly
3. Click "Watch on YouTube" for full version
4. See video metadata (channel, duration, views)

---

## 🔌 API Reference

### Analyze & Suggest Videos
```
POST /api/videos/analyze-and-suggest

Request:
{
  "courseId": "123",
  "course": {
    "title": "React Advanced",
    "description": "Learn React...",
    "topics": ["hooks", "context"]
  }
}

Response:
{
  "success": true,
  "analysis": {
    "keywords": ["react", "hooks", ...],
    "searchQueries": ["React Advanced", ...]
  },
  "suggestions": [
    {
      "id": "vid1",
      "title": "Advanced React Patterns",
      "engagementScore": 87.5,
      ...
    }
  ],
  "totalFound": 15
}
```

### Approve Video
```
POST /api/videos/approve

Request:
{
  "suggestionId": "uuid",
  "courseId": "123",
  "lessonId": "lesson-456"
}

Response:
{ "success": true, "message": "Video approved" }
```

### Reject Video
```
POST /api/videos/reject

Request:
{
  "suggestionId": "uuid",
  "reason": "Outdated content"
}

Response:
{ "success": true, "message": "Video rejected" }
```

### Get Approved Videos
```
GET /api/videos/:courseId/approved

Response:
{
  "success": true,
  "approvedVideos": [
    {
      "id": "uuid",
      "video_suggestions": {
        "title": "...",
        "embed_url": "...",
        ...
      },
      "position_in_lesson": 0
    }
  ]
}
```

---

## 🛡️ Security Features

- ✅ Row-level security (RLS) policies in Supabase
- ✅ API key environment variables (not hardcoded)
- ✅ Permission checks (only admins/instructors can approve)
- ✅ CORS configuration
- ✅ JWT authentication ready

---

## ⚙️ Configuration

All settings in `.env.local`:
```bash
# Required
YOUTUBE_API_KEY=...
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...

# Optional
VIDEO_API_PORT=3001
YOUTUBE_MAX_RESULTS_PER_QUERY=5
YOUTUBE_PREFERRED_DURATION=medium
AUTO_APPROVE_THRESHOLD=85
ENABLE_AUTO_APPROVE=false
```

See `.env.example` for all options.

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "YouTube API key is required" | Set `YOUTUBE_API_KEY` in `.env.local`, restart backend |
| "Video failed to load" | Check browser console for CORS errors, verify video still exists |
| Slow suggestions | YouTube API calls take 5-10 seconds, normal behavior |
| No suggestions found | Course title/description might be too generic |
| 403 Quota exceeded | YouTube API daily quota exceeded, wait until next day |

---

## 📈 Performance Tips

- Cache recent analysis results
- Virtualize long video lists with `react-window`
- Batch multiple course analyses
- Clean up old suggestions periodically
- Index database on `course_id` and `status`

---

## 🚢 Production Deployment

1. **Use Secrets Manager** (AWS Secrets, Azure Key Vault)
2. **Environment-specific keys**: dev, staging, production
3. **API Rate Limiting**: Implement throttling on backend
4. **Reverse Proxy**: Use Nginx/CloudFlare for HTTPS
5. **Monitoring**: Track YouTube quota usage daily
6. **Caching**: Redis for frequently accessed data

---

## 📚 Learn More

- [YouTube Data API Docs](https://developers.google.com/youtube/v3)
- [Supabase Row Level Security](https://supabase.com/docs/learn/auth-deep-dive/row-level-security)
- [React Hooks Guide](https://react.dev/reference/react)
- [Express.js Tutorial](https://expressjs.com/)

---

## 🤝 Support

For issues or questions:
1. Check `.env` variables are set correctly
2. Verify YouTube API key is active
3. Check browser console for errors
4. Review database migration status
5. Check server logs (`npm run start:api`)

---

## ✨ Next Steps

1. Copy code to your project
2. Follow "Quick Start" section above
3. Test with sample course
4. Customize engagement scoring if needed
5. Deploy to production

---

**Version**: 1.0  
**Last Updated**: February 14, 2026  
**Node**: 18+  
**React**: 18+  
