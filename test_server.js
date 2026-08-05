const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const rootDir = __dirname;

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.xml': 'application/xml',
  '.txt': 'text/plain'
};

const server = http.createServer((req, res) => {
  let reqUrl = req.url.split('?')[0];
  console.log(`[REQUEST] ${req.method} ${req.url}`);

  // Simulate GitHub Pages repository subpath /Rushup/
  if (reqUrl === '/Rushup' || reqUrl === '/Rushup/') {
    reqUrl = '/Rushup/index.html';
  }

  if (reqUrl.startsWith('/Rushup/')) {
    const relPath = decodeURIComponent(reqUrl.substring('/Rushup/'.length));
    const filePath = path.join(rootDir, relPath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/html' });
  res.end('<h1>404 Not Found (Subpath Test Server)</h1>');
});

server.listen(PORT, async () => {
  console.log(`🌐 Test Server running at http://localhost:${PORT}/Rushup/`);
  
  // Test URLs
  const urlsToTest = [
    '/Rushup/',
    '/Rushup/index.html',
    '/Rushup/leagues.html',
    '/Rushup/tournament-details.html',
    '/Rushup/register.html',
    '/Rushup/contact.html',
    '/Rushup/privacy.html',
    '/Rushup/terms.html',
    '/Rushup/404.html',
    '/Rushup/css/style.css',
    '/Rushup/css/responsive.css',
    '/Rushup/js/app.js',
    '/Rushup/manifest.json',
    '/Rushup/sitemap.xml',
    '/Rushup/robots.txt',
    '/Rushup/icons/rushup_logo.png',
    '/Rushup/icons/rushup_icon.png',
    '/Rushup/images/screenshot (1).jpg',
    '/Rushup/images/screenshot (6).jpg',
    '/Rushup/google02dd7d263e157df0.html'
  ];

  let failed = false;
  for (const urlPath of urlsToTest) {
    try {
      const res = await fetch(`http://localhost:${PORT}${urlPath}`);
      if (res.status === 200) {
        console.log(`  ✓ 200 OK: http://localhost:${PORT}${urlPath} [${res.headers.get('content-type')}]`);
      } else {
        console.error(`  ❌ FAIL ${res.status}: http://localhost:${PORT}${urlPath}`);
        failed = true;
      }
    } catch (err) {
      console.error(`  ❌ ERROR fetching http://localhost:${PORT}${urlPath}: ${err.message}`);
      failed = true;
    }
  }

  server.close(() => {
    if (!failed) {
      console.log('\n✅ ALL 16 SUBPATH ENDPOINTS RETURNED 200 OK!');
      process.exit(0);
    } else {
      console.error('\n❌ SOME ENDPOINTS FAILED!');
      process.exit(1);
    }
  });
});
