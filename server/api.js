/**
 * Express API Server for TeachTribe
 * Configured for both local development and Vercel Serverless Functions.
 *
 * Local dev:  node server/api.js           → starts on PORT
 * Vercel:     api/index.js re-exports app  → no .listen()
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const YouTubeSearchService = require('./services/youtubeSearch');
const { router: videoSuggestionsRouter, setYoutubeService } = require('./routes/videoSuggestions');
const { router: authRouter } = require('./routes/auth');

// Load environment variables
dotenv.config();

const app = express();

// --------------- Middleware ---------------
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:8080',
];
// In production on Vercel the API is same-origin, so also allow the VERCEL_URL.
if (process.env.VERCEL_URL) {
  allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, same-origin on Vercel)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Allow any *.vercel.app preview deploys
    if (origin && origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    callback(null, false);
  },
  credentials: true,
}));
app.use(express.json());

// --------------- Initialize YouTube Service ---------------
let youtubeService = null;

try {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error('ERROR: YOUTUBE_API_KEY not set in environment variables');
  } else {
    youtubeService = new YouTubeSearchService(apiKey);
    setYoutubeService(youtubeService);
    console.log('✓ YouTube API Service initialized');
  }
} catch (error) {
  console.error('Failed to initialize YouTube service:', error.message);
}

// --------------- Health check ---------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    youtubeServiceReady: !!youtubeService,
  });
});

// Also support /health for backwards compatibility
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    youtubeServiceReady: !!youtubeService,
  });
});

// --------------- API Routes ---------------
app.use('/api/videos', videoSuggestionsRouter);
app.use('/api/auth', authRouter);

// --------------- Error handling ---------------
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
  });
});

// --------------- 404 handler ---------------
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
  });
});

// --------------- Local development only ---------------
// When running directly (`node server/api.js`), start listening.
// On Vercel the app is imported by api/index.js — no .listen() needed.
if (require.main === module) {
  const PORT = process.env.VIDEO_API_PORT || 3001;
  app.listen(PORT, () => {
    console.log(`\n✓ TeachTribe API Server running on http://localhost:${PORT}`);
    console.log(`  Health check: http://localhost:${PORT}/api/health`);
    console.log(`  Video API:    http://localhost:${PORT}/api/videos`);
    console.log(`  Auth API:     http://localhost:${PORT}/api/auth\n`);

    if (!youtubeService) {
      console.warn('⚠ WARNING: YouTube API service not initialized');
      console.warn('  Set YOUTUBE_API_KEY environment variable to enable video suggestions\n');
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
  });
}

module.exports = app;
