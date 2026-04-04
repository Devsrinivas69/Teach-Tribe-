# YouTube Video Suggestion System - Testing Guide

Comprehensive testing strategies, examples, and patterns for the video suggestion feature.

---

## Unit Tests - Keyword Extractor

Test the keyword extraction logic with different course types.

### Test 1: Basic Keyword Extraction

```typescript
import { extractKeywords, generateSearchQueries, analyzeCourse } from './server/services/keywordExtractor';

describe('Keyword Extraction', () => {
  test('extracts keywords from course data', () => {
    const course = {
      id: 'test-1',
      title: 'Advanced React Patterns',
      description: 'Learn advanced React patterns and best practices for building scalable applications',
      topics: ['hooks', 'context', 'performance optimization', 'code splitting']
    };

    const keywords = extractKeywords(course);
    
    expect(keywords).toContain('react');
    expect(keywords).toContain('hooks');
    expect(keywords).toContain('context');
    expect(keywords.length).toBeGreaterThan(0);
    expect(keywords.length).toBeLessThanOrEqual(12);
  });
});
```

**What it tests:**
- Keywords are extracted from all text sources
- Related keywords are included
- Output is within expected bounds (0-12 keywords)

---

### Test 2: Stop Word Filtering

```typescript
test('filters out stop words', () => {
  const course = {
    id: 'test-2',
    title: 'The Ultimate Guide to Web Development',
    description: 'Learn everything about web development and building websites',
    topics: []
  };

  const keywords = extractKeywords(course);
  
  expect(keywords).not.toContain('the');
  expect(keywords).not.toContain('and');
  expect(keywords).not.toContain('a');
});
```

**What it tests:**
- Common words (stop words) are filtered out
- Only meaningful keywords remain
- Results are cleaner for search

---

### Test 3: Search Query Generation

```typescript
test('generates diverse search queries', () => {
  const keywords = ['react', 'hooks', 'patterns', 'performance'];
  const queries = generateSearchQueries(keywords, 'Advanced React');

  expect(queries).toContain('Advanced React');
  expect(queries.length).toBeGreaterThan(1);
  expect(queries.length).toBeLessThanOrEqual(8);
});
```

**What it tests:**
- Multiple search queries are generated
- Title is included in queries
- Variety of keyword combinations
- Limited to 8 queries to conserve API quota

---

### Test 4: Complete Course Analysis

```typescript
test('performs complete course analysis', () => {
  const course = {
    id: 'test-3',
    title: 'Machine Learning Fundamentals',
    description: 'Introduction to machine learning algorithms',
    topics: ['neural networks', 'supervised learning', 'data preprocessing']
  };

  const analysis = analyzeCourse(course);

  expect(analysis.courseId).toBe('test-3');
  expect(analysis.keywords).toBeDefined();
  expect(analysis.searchQueries).toBeDefined();
  expect(analysis.extractedAt).toBeDefined();
});
```

**What it tests:**
- Complete analysis workflow
- All required fields are present
- Metadata is correctly captured

---

## Integration Tests - YouTube Search

Test the YouTube API integration and video filtering.

### Test 5: Basic Video Search

```typescript
import YouTubeSearchService from './server/services/youtubeSearch';

describe('YouTube Search Service', () => {
  let youtubeService: YouTubeSearchService;

  beforeAll(() => {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      throw new Error('YOUTUBE_API_KEY not set in tests');
    }
    youtubeService = new YouTubeSearchService(apiKey);
  });

  test('searches for YouTube videos', async () => {
    const results = await youtubeService.searchEmbeddableVideos('React Hooks Tutorial', {
      maxResults: 3
    });

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(3);
  });
});
```

**What it tests:**
- API connection works
- Results are returned as array
- Result count respects max limit
- **Note:** Requires valid YOUTUBE_API_KEY

---

### Test 6: Video Object Format

```typescript
test('returns properly formatted video objects', async () => {
  const results = await youtubeService.searchEmbeddableVideos('Web Development', {
    maxResults: 1
  });

  expect(results.length).toBeGreaterThan(0);

  const video = results[0];
  expect(video.id).toBeDefined();
  expect(video.title).toBeDefined();
  expect(video.embedUrl).toBeDefined();
  expect(video.engagementScore).toBeDefined();
  expect(typeof video.engagementScore).toBe('number');
});
```

**What it tests:**
- All required video fields are present
- Engagement score is calculated
- Engagement score is numeric

---

### Test 7: Batch Searches

```typescript
test('performs batch searches', async () => {
  const queries = ['JavaScript', 'Python', 'Ruby'];
  const results = await youtubeService.batchSearch(queries, { maxResults: 2 });

  expect(Object.keys(results).length).toBe(3);
  Object.values(results).forEach(videos => {
    expect(Array.isArray(videos)).toBe(true);
  });
});
```

**What it tests:**
- Multiple queries can be searched concurrently
- All queries return results
- Results structure is consistent

---

### Test 8: Engagement Scoring

```typescript
test('calculates engagement scores', () => {
  // Mock calculation test
  const views = 1000000;
  const likes = 50000;
  const comments = 10000;

  // Expected: (50000/1000000 * 100 * 0.7) + (10000/1000000 * 100 * 0.3)
  // = 3.5 + 0.3 = 3.8 * 20 = 76%
  const score = youtubeService.calculateEngagementScore(views, likes, comments);

  expect(score).toBeGreaterThan(0);
  expect(score).toBeLessThanOrEqual(100);
});
```

**What it tests:**
- Engagement scores are within valid range (0-100)
- Higher engagement = higher score
- Formula produces reasonable values

---

## API Tests - Express Endpoints

Test the REST API endpoints using supertest.

### Test 9: Health Check

```typescript
import request from 'supertest';
import app from './server/api';

describe('Video Suggestion API', () => {
  test('GET /health returns healthy status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.youtubeServiceReady).toBeDefined();
  });
});
```

**What it tests:**
- Server is running
- Health endpoint is accessible
- Response format is correct

---

### Test 10: Course Analysis Endpoint

```typescript
test('POST /api/videos/analyze-and-suggest analyzes course', async () => {
  const courseData = {
    courseId: 'test-course-1',
    course: {
      title: 'React Fundamentals',
      description: 'Learn React basics and build web applications',
      topics: ['components', 'state', 'hooks']
    }
  };

  const response = await request(app)
    .post('/api/videos/analyze-and-suggest')
    .set('x-user-role', 'instructor')
    .send(courseData);

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.analysis.keywords).toBeDefined();
  expect(response.body.analysis.searchQueries).toBeDefined();
  expect(response.body.suggestions).toBeDefined();
});
```

**What it tests:**
- API endpoint is accessible
- Course data is processed
- Response includes analysis and suggestions
- Authentication headers are respected

---

## Component Tests - VideoSuggestionReview

Test the admin dashboard component.

### Test 11: Dashboard Rendering

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VideoSuggestionReview from './src/components/VideoSuggestionReview';

describe('Video Suggestion E2E', () => {
  test('Admin dashboard renders correctly', () => {
    render(<VideoSuggestionReview />);

    expect(screen.getByText(/Video Suggestion Review/i)).toBeInTheDocument();
    expect(screen.getByText(/Select Course/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Analyze Course/i })).toBeInTheDocument();
  });
});
```

**What it tests:**
- Component mounts without error
- All main UI elements are present
- Text content is correct

---

### Test 12: Video Suggestion Workflow

```typescript
test('User can analyze and review suggestions', async () => {
  render(<VideoSuggestionReview courseId="test-course-1" />);

  // Initially no suggestions shown
  expect(screen.queryByText(/To Review/i)).not.toBeInTheDocument();

  // Click analyze button (mocked API response would follow)
  const analyzeBtn = screen.getByRole('button', { name: /Analyze Course/i });
  fireEvent.click(analyzeBtn);

  // Wait for suggestions to appear
  await waitFor(() => {
    expect(screen.getByText(/To Review/i)).toBeInTheDocument();
  });
});
```

**What it tests:**
- User interactions work
- State updates trigger re-render
- UI responds to user actions

---

### Test 13: Video Embed Component

```typescript
import YouTubeEmbed from './src/components/YouTubeEmbed';

test('YouTube embed component renders without error', () => {
  const videoData = {
    id: 'dQw4w9WgXcQ',
    title: 'Sample Video',
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    watchUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    channelTitle: 'Test Channel',
    duration: '3:33'
  };

  render(
    <YouTubeEmbed
      video={videoData}
      title="Test Video"
      showMetadata={true}
    />
  );

  expect(screen.getByText('Test Video')).toBeInTheDocument();
  expect(screen.getByText('Test Channel')).toBeInTheDocument();
});
```

**What it tests:**
- Component renders without crashing
- Video data displays correctly
- Metadata is shown

---

## Test Data

Sample data for testing throughout the system.

### Sample Courses

```typescript
export const TEST_COURSES = [
  {
    id: 'course-1',
    title: 'React Advanced Patterns',
    description: 'Master advanced React patterns for building scalable applications',
    topics: ['hooks', 'context', 'performance optimization']
  },
  {
    id: 'course-2',
    title: 'Machine Learning Fundamentals',
    description: 'Introduction to machine learning with Python',
    topics: ['supervised learning', 'neural networks', 'data preprocessing']
  },
  {
    id: 'course-3',
    title: 'Web Development with Node.js',
    description: 'Build full-stack web applications using Node.js and Express',
    topics: ['REST API', 'database design', 'authentication']
  },
  {
    id: 'course-4',
    title: 'Mobile App Development',
    description: 'Create cross-platform mobile apps with React Native',
    topics: ['components', 'navigation', 'state management']
  }
];
```

### Sample Videos

```typescript
export const TEST_VIDEOS = [
  {
    id: 'vid-1',
    title: 'React Hooks Explained',
    channelTitle: 'Tech Academy',
    viewCount: 500000,
    likeCount: 25000,
    engagementScore: 85.5
  },
  {
    id: 'vid-2',
    title: 'Machine Learning with Python',
    channelTitle: 'Data Science Hub',
    viewCount: 250000,
    likeCount: 15000,
    engagementScore: 72.3
  },
  {
    id: 'vid-3',
    title: 'Node.js API Development',
    channelTitle: 'Web Dev Masters',
    viewCount: 150000,
    likeCount: 8000,
    engagementScore: 68.9
  }
];
```

---

## Manual Testing Checklist

Complete these manual tests before deploying to production.

### Setup & Configuration
- [ ] YouTube API key is valid and active
- [ ] Database migrations have run successfully
- [ ] Backend server starts without errors on port 3001
- [ ] Frontend connects to backend (no CORS errors)
- [ ] .env variables are properly configured

### Keyword Extraction
- [ ] Test with different course titles (short, long, generic)
- [ ] Keywords are relevant to course content
- [ ] Stop words are filtered out
- [ ] Generated search queries are diverse
- [ ] No errors with special characters in titles

### YouTube Search
- [ ] Can search for multiple keywords
- [ ] Results show embeddable videos only
- [ ] Engagement scores are calculated and displayed
- [ ] Video metadata is complete (title, channel, duration, views)
- [ ] No CORS errors when fetching videos
- [ ] Handles API errors gracefully

### Admin Dashboard
- [ ] Course dropdown loads with all courses
- [ ] "Analyze Course" button triggers search
- [ ] Shows loading indicator during analysis
- [ ] Suggestions display with thumbnail, title, metadata
- [ ] Can scroll through multiple suggestions
- [ ] "Watch" button opens video in new tab
- [ ] "Approve" button works and updates status
- [ ] "Reject" button shows reason prompt
- [ ] Batch select/approve works correctly
- [ ] "Save Suggestions" button saves to database
- [ ] Success message appears after save

### Video Embed
- [ ] Videos play without autoplay on page load
- [ ] Fullscreen mode works
- [ ] Video metadata displays correctly
- [ ] "Watch on YouTube" link works
- [ ] Video embed is responsive (scales on mobile)
- [ ] No console errors during playback
- [ ] Aspect ratio adjusts correctly
- [ ] Loading spinner shows during buffer

### Database
- [ ] Approved videos save to approved_videos table
- [ ] Suggestions save with correct status
- [ ] Rejection reasons are stored
- [ ] Updated timestamps are correct
- [ ] Can query approved videos for course
- [ ] RLS policies work correctly
- [ ] Duplicate suggestions are handled
- [ ] Cascade delete works properly

### Performance
- [ ] Analysis completes within 10 seconds
- [ ] Dashboard is responsive during loading
- [ ] No network timeouts on slow connections
- [ ] API quota usage is reasonable
- [ ] Large suggestions lists scroll smoothly
- [ ] Images load lazily (thumbnails)

### Security
- [ ] YouTube API key is hidden in network requests
- [ ] Only admins can approve/reject
- [ ] Database RLS policies work correctly
- [ ] No sensitive data in browser console
- [ ] CORS headers are correct
- [ ] API validates input properly

### Edge Cases
- [ ] Empty course description handled gracefully
- [ ] No suggestions found shows appropriate message
- [ ] API errors show user-friendly messages
- [ ] Approved video can be rejected later
- [ ] Same video can't be suggested twice
- [ ] Very long video titles truncate properly
- [ ] Special characters in course names work
- [ ] Unicode/emoji in text handled correctly

---

## Running Tests

### Unit Tests
```bash
npm test -- keywordExtractor.test.ts
npm test -- youtubeSearch.test.ts
```

### Integration Tests
```bash
npm test -- api.test.ts
```

### Component Tests
```bash
npm test -- VideoSuggestionReview.test.tsx
npm test -- YouTubeEmbed.test.tsx
```

### All Tests
```bash
npm test
```

### With Coverage
```bash
npm test -- --coverage
```

### Watch Mode
```bash
npm test -- --watch
```

### Specific Test
```bash
npm test -- --testNamePattern="extracts keywords"
```

---

## Debugging Tests

### Enable Debug Logging
```bash
DEBUG=* npm test
```

### Run Single Test File
```bash
npm test -- VideoSuggestionReview.test.tsx --verbose
```

### Debug in Chrome
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

Then open `chrome://inspect` in Chrome.

---

## Performance Testing

### Load Testing Keyword Extraction
```typescript
test('keyword extraction performance', () => {
  const startTime = performance.now();

  for (let i = 0; i < 1000; i++) {
    extractKeywords({
      title: 'React Patterns',
      description: 'Learn advanced patterns',
      topics: ['hooks', 'context']
    });
  }

  const endTime = performance.now();
  const avgTime = (endTime - startTime) / 1000;

  expect(avgTime).toBeLessThan(10); // < 10ms average
});
```

### Load Testing API
```bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost:3001/health

# Using hey
go install github.com/rakyll/hey@latest
hey -n 1000 -c 10 http://localhost:3001/health
```

---

## Monitoring in Production

### Key Metrics to Track
- API response times
- YouTube API quota usage
- Database query times
- Error rates
- Video approval workflow metrics
- User engagement with videos

### Alerting
Set up alerts for:
- YouTube API quota > 80%
- API response time > 2 seconds
- Database query time > 500ms
- Error rate > 1%
- Suggestions analysis failures

---

## Continuous Integration

### GitHub Actions Example
```yaml
name: Run Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --coverage
      - run: npm run lint
```

---

## Best Practices

1. **Write tests as you code** - Don't wait until the end
2. **Test edge cases** - Empty inputs, errors, large datasets
3. **Mock external APIs** - Don't depend on real YouTube API in tests
4. **Use meaningful test names** - Describe what is being tested
5. **Keep tests isolated** - Each test should be independent
6. **Use test data** - Keep separate test data files
7. **Aim for >80% coverage** - But quality > quantity
8. **Run tests before committing** - Use git hooks

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Cannot find module" | Check import paths, ensure files exist |
| "Timeout" | Increase timeout for slow tests |
| "API quota exceeded" | Mock API calls in tests |
| "Database connection error" | Ensure Supabase is running |
| "Jest not found" | Run `npm install --save-dev @jest/globals` |

---

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/react)
- [Supertest](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Last Updated:** February 15, 2026  
**Version:** 1.0
