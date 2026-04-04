# Video Suggestions Integration Guide

Complete examples for integrating the Video Suggestions feature into your application.

## Quick Start: Import Components & Hooks

```typescript
import React from 'react';
import VideoSuggestionReview from '@/components/VideoSuggestionReview';
import YouTubeEmbed from '@/components/YouTubeEmbed';
import { useVideoSuggestions } from '@/hooks/useVideoSuggestions';
import { supabase } from '@/integrations/supabase/client';
```

---

## 1. Admin Dashboard Page (Complete Example)

Admin interface for reviewing and approving video suggestions:

```typescript
export function AdminVideoSuggestionsPage() {
  return (
    <div className="container mx-auto py-8">
      <VideoSuggestionReview />
    </div>
  );
}
```

---

## 2. Course Detail Page with Approved Videos

Display approved supplementary videos on the course detail page:

```typescript
export function CourseDetailWithVideo({ courseId }: { courseId: string }) {
  const [approvedVideos, setApprovedVideos] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadApprovedVideos() {
      try {
        const { data, error } = await supabase
          .from('approved_videos')
          .select(`
            *,
            video_suggestions:video_suggestion_id (
              title,
              embed_url,
              watch_url,
              thumbnail_url,
              duration,
              channel_title,
              view_count
            )
          `)
          .eq('course_id', courseId)
          .eq('is_active', true)
          .order('display_order');

        if (error) throw error;
        setApprovedVideos(data || []);
      } catch (error) {
        console.error('Failed to load approved videos:', error);
      } finally {
        setLoading(false);
      }
    }

    loadApprovedVideos();
  }, [courseId]);

  return (
    <div className="space-y-8">
      {/* Course content */}
      <section>
        <h1 className="text-3xl font-bold">Course Title</h1>
        <p>Course description...</p>
      </section>

      {/* Approved Videos Section */}
      {approvedVideos.length > 0 && (
        <section className="border-t pt-8">
          <h2 className="text-2xl font-bold mb-6">Supplementary Videos</h2>

          <div className="grid grid-cols-1 gap-6">
            {approvedVideos.map((item) => {
              const video = item.video_suggestions;
              return (
                <YouTubeEmbed
                  key={item.id}
                  video={{
                    id: video.id,
                    title: video.title,
                    embedUrl: video.embed_url,
                    watchUrl: video.watch_url,
                    thumbnailUrl: video.thumbnail_url,
                    duration: video.duration,
                    channelTitle: video.channel_title,
                    viewCount: video.view_count
                  }}
                  title={`Part ${item.display_order + 1}`}
                  showMetadata={true}
                />
              );
            })}
          </div>
        </section>
      )}

      {!loading && approvedVideos.length === 0 && (
        <section className="text-center py-12 text-gray-600">
          <p>No supplementary videos available for this course yet.</p>
        </section>
      )}
    </div>
  );
}
```

---

## 3. Lesson Page with Video Suggestions (for Instructors)

Instructor page to analyze and get video suggestions for a specific lesson:

```typescript
export function LessonPageWithSuggestions({
  courseId,
  lessonId
}: {
  courseId: string;
  lessonId: string;
}) {
  const { loading, suggestions, analyzeCourse } = useVideoSuggestions(supabase);
  const [course, setCourse] = React.useState(null);

  React.useEffect(() => {
    async function loadCourse() {
      const { data } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();
      setCourse(data);
    }
    loadCourse();
  }, [courseId]);

  const handleAnalyzeAndSuggest = async () => {
    if (course) {
      await analyzeCourse(courseId, course);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main lesson content */}
      <section>
        <h1 className="text-3xl font-bold">Lesson: Advanced React Patterns</h1>
        <p className="text-gray-600 mt-2">
          Learn about advanced patterns in React including custom hooks, render props, and more.
        </p>
      </section>

      {/* Video Suggestions Section */}
      <section className="border-t pt-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Suggested Videos</h2>
          <button
            onClick={handleAnalyzeAndSuggest}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : 'Analyze & Get Suggestions'}
          </button>
        </div>

        {loading && <p className="text-center text-gray-500">Finding relevant videos...</p>}

        {!loading && suggestions.length > 0 && (
          <div className="grid grid-cols-1 gap-6">
            {suggestions.slice(0, 3).map((video: any) => (
              <YouTubeEmbed
                key={video.id}
                video={video}
                title={`Suggested Video`}
                showMetadata={true}
              />
            ))}
          </div>
        )}

        {!loading && suggestions.length === 0 && (
          <p className="text-center text-gray-500">
            Click "Analyze & Get Suggestions" to find relevant videos
          </p>
        )}
      </section>
    </div>
  );
}
```

---

## 4. Manual Video Suggestion Integration (Without Hook)

If you need more control or want to handle video suggestions manually:

```typescript
export function ManualVideoSuggestionIntegration() {
  const [suggestions, setSuggestions] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [course, setCourse] = React.useState(null);

  React.useEffect(() => {
    async function loadCourse() {
      const { data } = await supabase
        .from('courses')
        .select('*')
        .eq('id', 'sample-course-id')
        .single();
      setCourse(data);
    }
    loadCourse();
  }, []);

  const handleGetSuggestions = async () => {
    if (!course) return;

    setLoading(true);
    try {
      const response = await fetch(
        'http://localhost:3001/api/video-suggestions/analyze',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data?.session?.access_token || ''}`
          },
          body: JSON.stringify({
            courseId: course.id,
            course: {
              title: course.title,
              description: course.description,
              topics: course.topics,
              what_you_learn: course.what_you_learn
            }
          })
        }
      );

      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Failed to get suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleGetSuggestions}
        disabled={loading}
        className="px-4 py-2 bg-green-600 text-white rounded"
      >
        {loading ? 'Loading...' : 'Get Suggestions'}
      </button>

      <div className="grid grid-cols-1 gap-4">
        {suggestions.slice(0, 3).map((video: any) => (
          <YouTubeEmbed
            key={video.id}
            video={video}
            title="Suggested Video"
            showMetadata={true}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## 5. API-Only Integration (Backend Example)

Direct API calls for video analysis and approval:

```typescript
// Analyze course and get video suggestions
export async function analyzeCourseDirect(courseId: string, courseData: any) {
  const response = await fetch(
    'http://localhost:3001/api/video-suggestions/analyze',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data?.session?.access_token || ''}`
      },
      body: JSON.stringify({ courseId, course: courseData })
    }
  );

  return response.json();
}

// Approve a specific video suggestion for a course
export async function approveSuggestionDirect(
  suggestionId: string,
  courseId: string
) {
  const response = await fetch(
    'http://localhost:3001/api/video-suggestions/approve',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data?.session?.access_token || ''}`
      },
      body: JSON.stringify({
        suggestionId,
        courseId,
        supabaseClient: supabase
      })
    }
  );

  return response.json();
}
```

---

## Integration Patterns

### Pattern 1: Quick Integration in Existing Pages

Add the `VideoSuggestionReview` component to your admin dashboard:

```typescript
// pages/AdminDashboard.tsx
import VideoSuggestionReview from '@/components/VideoSuggestionReview';

export default function AdminDashboard() {
  return (
    <div className="container mx-auto">
      <VideoSuggestionReview />
    </div>
  );
}
```

### Pattern 2: Add to Course Detail Page

Enhance course pages with approved videos:

```typescript
// pages/CourseDetail.tsx
import { CourseDetailWithVideo } from '@/integration-examples';

export default function CourseDetail() {
  const { courseId } = useParams();
  return <CourseDetailWithVideo courseId={courseId} />;
}
```

### Pattern 3: Lesson Page Enhancement

Show video suggestions while teaching:

```typescript
// pages/LearningPage.tsx
import { LessonPageWithSuggestions } from '@/integration-examples';

export default function LearningPage() {
  const { courseId, lessonId } = useParams();
  return <LessonPageWithSuggestions courseId={courseId} lessonId={lessonId} />;
}
```

---

## Configuration

### Environment Variables

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_YOUTUBE_API_KEY=your_youtube_api_key
VITE_BACKEND_URL=http://localhost:3001
```

### API Endpoints

- **POST** `/api/video-suggestions/analyze` - Analyze course and get suggestions
- **POST** `/api/video-suggestions/approve` - Approve a video suggestion
- **GET** `/api/video-suggestions/suggestions/:courseId` - Get all suggestions for a course
- **GET** `/api/video-suggestions/approved/:courseId` - Get approved videos for a course

---

## Error Handling

Always wrap API calls in try-catch blocks and provide user feedback:

```typescript
try {
  const result = await analyzeCourse(courseId, courseData);
  console.log('Analysis complete:', result);
} catch (error) {
  console.error('Analysis failed:', error);
  // Show error to user
}
```

---

## Testing

For testing the video suggestions feature:

```typescript
// Mock data for testing
const mockCourse = {
  id: 'test-course-123',
  title: 'Advanced React Patterns',
  description: 'Learn advanced React development patterns',
  topics: ['React', 'Custom Hooks', 'Performance'],
  what_you_learn: ['Build custom hooks', 'Optimize performance']
};

// Call analyze with mock data
const suggestions = await analyzeCourse('test-course-123', mockCourse);
```
