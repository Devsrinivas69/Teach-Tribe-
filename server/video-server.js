/*
 Simple Express video streaming server with CORS and range support.
 - Serves files from `server/videos` directory
 - Supports Range requests for streaming/seeking
 - Enables CORS for the frontend at any origin (adjust in production)

Run: node server/video-server.js
*/

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.VIDEO_SERVER_PORT || 4000;

// CORS: allow your dev frontend origin (or use '*' for local testing)
app.use(cors({ origin: true }));

// Simple health
app.get('/', (req, res) => res.send('Video streaming server running'));

// Serve static directories (thumbnails, etc.) if needed
app.use('/static', express.static(path.join(__dirname, 'static')));

// Video endpoint: GET /video/:fileName
// fileName may be e.g. c1-les-0-0.mp4 (map course/lesson to file names)
app.get('/video/:file', (req, res) => {
  const file = req.params.file;
  const videoPath = path.join(__dirname, 'videos', file);

  if (!fs.existsSync(videoPath)) {
    return res.status(404).send('Video not found');
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    // Parse Range header
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = (end - start) + 1;
    const fileStream = fs.createReadStream(videoPath, { start, end });
    const contentType = mimeType(videoPath);

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
    });
    fileStream.pipe(res);
  } else {
    // No range header — send entire file
    const contentType = mimeType(videoPath);
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(videoPath).pipe(res);
  }
});

function mimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.mp4': return 'video/mp4';
    case '.webm': return 'video/webm';
    case '.ogg': return 'video/ogg';
    default: return 'application/octet-stream';
  }
}

app.listen(PORT, () => {
  console.log(`Video server listening on http://localhost:${PORT}`);
});
