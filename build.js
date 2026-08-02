const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');

console.log('🚀 Starting GitHub Pages Production Build for RushUp Esports...');

// 1. Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 2. Helper to copy folder recursively
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Auto-discover Google verification HTML files (e.g. google02dd7d263e157df0.html)
const rootFiles = fs.readdirSync(rootDir);
const googleVerificationFiles = rootFiles.filter(f => f.startsWith('google') && f.endsWith('.html'));

// Files & Subdirectories to include in production build
const filesToCopy = [
  'index.html',
  'contact.html',
  'privacy.html',
  'terms.html',
  '404.html',
  'manifest.json',
  'sitemap.xml',
  'robots.txt',
  'worker.js',
  ...googleVerificationFiles
];

const dirsToCopy = [
  'css',
  'js',
  'images',
  'icons'
];

// Copy files to dist
for (let file of filesToCopy) {
  const src = path.join(rootDir, file);
  const dest = path.join(distDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`  ✓ Copied ${file} -> dist/${file}`);
  } else {
    console.warn(`  ⚠️ Warning: File not found: ${file}`);
  }
}

// Copy directories to dist
for (let dir of dirsToCopy) {
  const src = path.join(rootDir, dir);
  const dest = path.join(distDir, dir);
  if (fs.existsSync(src)) {
    copyDir(src, dest);
    console.log(`  ✓ Copied directory ${dir} -> dist/${dir}`);
  } else {
    console.warn(`  ⚠️ Warning: Directory not found: ${dir}`);
  }
}

// 3. Zip dist directory into rushup-github-pages.zip using Node zlib/archiver or PowerShell
console.log('📦 Creating rushup-github-pages.zip...');
try {
  const zipPath = path.join(rootDir, 'rushup-github-pages.zip');
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }
  // Use PowerShell Compress-Archive for native Windows zip generation
  const psCommand = `powershell -Command "Compress-Archive -Path '${distDir}\\*' -DestinationPath '${zipPath}' -Force"`;
  execSync(psCommand);
  console.log(`  ✓ Successfully generated ${zipPath}`);
} catch (err) {
  console.error('  ❌ Error creating zip file:', err.message);
}

// 4. Asset Audit & Path Verification
console.log('\n🔍 Running Automated Path & Asset Link Audit...');

let hasErrors = false;
const htmlFiles = ['index.html', 'contact.html', 'privacy.html', 'terms.html', '404.html'];

htmlFiles.forEach(file => {
  const filePath = path.join(rootDir, file);
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');

  // Check for absolute asset paths like href="/..." or src="/..."
  const absMatch = content.match(/(href|src)=["']\/[a-zA-Z0-9_\-\.\/]+/gi);
  if (absMatch) {
    console.error(`  ❌ FAIL: Absolute paths found in ${file}:`, absMatch);
    hasErrors = true;
  } else {
    console.log(`  ✓ PASS: No absolute asset paths in ${file}`);
  }

  // Check that all linked local CSS, JS, images, icons exist
  const relMatches = content.matchAll(/(href|src)=["'](\.\/)?(css|js|images|icons|manifest\.json|contact\.html|privacy\.html|terms\.html|404\.html|index\.html)[^"']*["']/gi);
  for (const match of relMatches) {
    const rawPath = match[0].split('=')[1].replace(/["']/g, '');
    const cleanPath = rawPath.replace(/^\.\//, '');
    const targetPath = path.join(rootDir, cleanPath);
    if (!fs.existsSync(targetPath)) {
      console.error(`  ❌ FAIL: Broken reference in ${file}: ${rawPath} -> ${targetPath} does not exist!`);
      hasErrors = true;
    }
  }
});

// Audit manifest.json
const manifestPath = path.join(rootDir, 'manifest.json');
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.start_url && manifest.start_url.startsWith('/') && !manifest.start_url.startsWith('./')) {
    console.error(`  ❌ FAIL: Absolute start_url in manifest.json: ${manifest.start_url}`);
    hasErrors = true;
  } else {
    console.log(`  ✓ PASS: manifest.json start_url is relative: ${manifest.start_url}`);
  }

  if (manifest.icons) {
    manifest.icons.forEach(icon => {
      if (icon.src && icon.src.startsWith('/')) {
        console.error(`  ❌ FAIL: Absolute icon src in manifest.json: ${icon.src}`);
        hasErrors = true;
      } else {
        console.log(`  ✓ PASS: manifest.json icon src is relative: ${icon.src}`);
      }
    });
  }
}

if (!hasErrors) {
  console.log('\n🎉 ALL CHECKS PASSED SUCCESSFULLY! Production build is 100% ready for GitHub Pages.');
} else {
  console.error('\n⚠️ AUDIT FAILED WITH ERRORS!');
  process.exit(1);
}
