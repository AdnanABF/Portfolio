const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const CLIENT_ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(CLIENT_ROOT, 'public');
const APP_DIR = path.join(CLIENT_ROOT, 'src', 'app');

function createIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + count * dirEntrySize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const entries = [];
  for (const item of pngBuffers) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(item.width >= 256 ? 0 : item.width, 0);
    entry.writeUInt8(item.height >= 256 ? 0 : item.height, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(item.buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += item.buffer.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map((p) => p.buffer)]);
}

async function main() {
  console.log('Generating Cyber Mint & Midnight Navy Neo-Brutalist assets...');

  // 1. Load original logo and extract letter mask
  const srcLogoPath = path.join(PUBLIC_DIR, 'abf_logo.png');
  const backupLogoPath = path.join(PUBLIC_DIR, 'abf_logo.old.png');
  if (!fs.existsSync(backupLogoPath) && fs.existsSync(srcLogoPath)) {
    fs.copyFileSync(srcLogoPath, backupLogoPath);
  }

  const { data, info } = await sharp(backupLogoPath || srcLogoPath).raw().toBuffer({ resolveWithObject: true });

  const minX = 18, maxX = 500, minY = 114, maxY = 390;
  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  const letterBuf = Buffer.alloc(cropW * cropH * 4);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const srcIdx = (y * info.width + x) * 4;
      const dstIdx = ((y - minY) * cropW + (x - minX)) * 4;

      const r = data[srcIdx];
      const a = data[srcIdx + 3];

      const t = Math.max(0, Math.min(1, (r - 18) / (255 - 18)));

      if (t > 0.02 && a === 255) {
        // Vibrant Cyber Mint #00f0a0 (R: 0, G: 240, B: 160)
        letterBuf[dstIdx] = 0;
        letterBuf[dstIdx + 1] = Math.round(240 * t);
        letterBuf[dstIdx + 2] = Math.round(160 * t);
        letterBuf[dstIdx + 3] = Math.round(255 * t);
      }
    }
  }

  const lettersPng = await sharp(letterBuf, { raw: { width: cropW, height: cropH, channels: 4 } })
    .resize(360, 210, { fit: 'inside' })
    .png()
    .toBuffer();

  const lMeta = await sharp(lettersPng).metadata();

  // 2. Generate 512x512 Master Badge
  const svgBadge = Buffer.from(`
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <!-- 3D Tactile Neo-Brutalist Offset Shadow in Hyper Violet -->
      <rect x="36" y="36" width="440" height="440" rx="96" fill="#6c5ce7" stroke="#0a0f1d" stroke-width="12" />
      <!-- Main Badge in Midnight Navy with Cyber Mint Border -->
      <rect x="20" y="20" width="440" height="440" rx="96" fill="#0a0f1d" stroke="#00b894" stroke-width="12" />
    </svg>
  `);

  const masterBadgeBuffer = await sharp(svgBadge)
    .composite([
      {
        input: lettersPng,
        top: Math.round(20 + (440 - lMeta.height) / 2),
        left: Math.round(20 + (440 - lMeta.width) / 2),
      },
    ])
    .png()
    .toBuffer();

  // Save master 512x512 PNGs
  await sharp(masterBadgeBuffer).toFile(path.join(PUBLIC_DIR, 'abf_logo.png'));
  await sharp(masterBadgeBuffer).toFile(path.join(APP_DIR, 'icon.png'));
  await sharp(masterBadgeBuffer).toFile(path.join(PUBLIC_DIR, 'icon-512.png'));

  // 192x192 for PWA
  await sharp(masterBadgeBuffer).resize(192, 192).toFile(path.join(PUBLIC_DIR, 'icon-192.png'));

  // 180x180 for Apple Touch Icon
  await sharp(masterBadgeBuffer).resize(180, 180).toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));
  await sharp(masterBadgeBuffer).resize(180, 180).toFile(path.join(APP_DIR, 'apple-icon.png'));

  // 3. Generate multi-resolution favicon.ico
  const p16 = await sharp(masterBadgeBuffer).resize(16, 16).png().toBuffer();
  const p32 = await sharp(masterBadgeBuffer).resize(32, 32).png().toBuffer();
  const p48 = await sharp(masterBadgeBuffer).resize(48, 48).png().toBuffer();

  const icoBuffer = createIco([
    { width: 16, height: 16, buffer: p16 },
    { width: 32, height: 32, buffer: p32 },
    { width: 48, height: 48, buffer: p48 },
  ]);

  fs.writeFileSync(path.join(APP_DIR, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), icoBuffer);

  // 4. Generate SVG Logo
  const base64Png = masterBadgeBuffer.toString('base64');
  const svgFavicon = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <image width="512" height="512" xlink:href="data:image/png;base64,${base64Png}"/>
</svg>`;
  fs.writeFileSync(path.join(APP_DIR, 'icon.svg'), svgFavicon, 'utf8');
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.svg'), svgFavicon, 'utf8');

  console.log('✓ Successfully created favicon.ico, icon.png, apple-icon.png, icon.svg, and PWA icons!');

  // 5. Generate Neo-Brutalist OpenGraph Image (1200 x 630)
  console.log('Generating OpenGraph preview image (1200x630)...');
  const photoPath = path.join(PUBLIC_DIR, 'adnan_photo.webp');

  // Adnan photo in a neo-card avatar
  const avatarSize = 360;
  const avatarCropped = await sharp(photoPath)
    .resize(avatarSize, avatarSize, { fit: 'cover', position: 'top' })
    .png()
    .toBuffer();

  const avatarCardSvg = Buffer.from(`
    <svg width="420" height="420" viewBox="0 0 420 420" xmlns="http://www.w3.org/2000/svg">
      <rect x="24" y="24" width="372" height="372" rx="40" fill="#6c5ce7" stroke="#0a0f1d" stroke-width="8" />
      <rect x="12" y="12" width="372" height="372" rx="40" fill="#111827" stroke="#00b894" stroke-width="8" />
      <clipPath id="avatarClip">
        <rect x="18" y="18" width="360" height="360" rx="34" />
      </clipPath>
    </svg>
  `);

  // Mask avatar into rounded card
  const avatarMask = Buffer.from(`
    <svg width="${avatarSize}" height="${avatarSize}" viewBox="0 0 ${avatarSize} ${avatarSize}">
      <rect x="0" y="0" width="${avatarSize}" height="${avatarSize}" rx="32" fill="#fff" />
    </svg>
  `);
  const avatarWithRoundedCorners = await sharp(avatarCropped)
    .composite([{ input: avatarMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  const avatarFullCard = await sharp(avatarCardSvg)
    .composite([{ input: avatarWithRoundedCorners, left: 18, top: 18 }])
    .png()
    .toBuffer();

  // Resize logo for OG badge
  const ogLogoBadge = await sharp(masterBadgeBuffer).resize(110, 110).png().toBuffer();

  // Open Graph Base SVG Graphic (1200 x 630)
  const ogSvg = Buffer.from(`
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Background Grid Pattern -->
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="20" cy="20" r="1.5" fill="#1e293b" />
        </pattern>
        <linearGradient id="mintGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#00f0a0" />
          <stop offset="100%" stop-color="#00b894" />
        </linearGradient>
      </defs>

      <!-- Background Canvas -->
      <rect width="1200" height="630" fill="#0a0f1d" />
      <rect width="1200" height="630" fill="url(#grid)" opacity="0.8" />

      <!-- Decorative Neo-Brutalist Border Frame -->
      <rect x="20" y="20" width="1160" height="590" rx="24" fill="none" stroke="#1e293b" stroke-width="3" />
      <rect x="28" y="28" width="1144" height="574" rx="18" fill="none" stroke="#00b894" stroke-width="2" stroke-dasharray="8 8" opacity="0.4" />

      <!-- Top Status Badge -->
      <g transform="translate(520, 75)">
        <rect x="0" y="0" width="320" height="40" rx="10" fill="#1e293b" stroke="#00b894" stroke-width="2" />
        <circle cx="20" cy="20" r="6" fill="#00f0a0" />
        <text x="36" y="25" fill="#00f0a0" font-family="monospace" font-size="14" font-weight="bold" letter-spacing="1">AVAILABLE FOR HIRE</text>
      </g>

      <!-- Main Heading: Adnan Bin Farook -->
      <text x="520" y="175" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="56" font-weight="900" letter-spacing="-1">Adnan Bin Farook</text>

      <!-- Role / Title -->
      <text x="520" y="225" fill="#a29bfe" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="700">Senior Software Engineer</text>

      <!-- Description / Tagline in Neo Card -->
      <g transform="translate(520, 260)">
        <rect x="6" y="6" width="610" height="80" rx="14" fill="#020617" />
        <rect x="0" y="0" width="610" height="80" rx="14" fill="#111827" stroke="#1e293b" stroke-width="2" />
        <text x="24" y="36" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="500">Specializing in high-performance web systems,</text>
        <text x="24" y="62" fill="#00f0a0" font-family="monospace" font-size="16" font-weight="bold">.NET, Next.js &amp; Scalable Cloud Architectures</text>
      </g>

      <!-- Stack Badges / Pills -->
      <!-- Pill 1: .NET & C# -->
      <g transform="translate(520, 375)">
        <rect x="3" y="3" width="135" height="42" rx="10" fill="#020617" />
        <rect x="0" y="0" width="135" height="42" rx="10" fill="#1e1b4b" stroke="#6366f1" stroke-width="2" />
        <text x="18" y="26" fill="#a5b4fc" font-family="monospace" font-size="15" font-weight="bold">.NET / C#</text>
      </g>

      <!-- Pill 2: Next.js & React -->
      <g transform="translate(670, 375)">
        <rect x="3" y="3" width="165" height="42" rx="10" fill="#020617" />
        <rect x="0" y="0" width="165" height="42" rx="10" fill="#064e3b" stroke="#00b894" stroke-width="2" />
        <text x="18" y="26" fill="#6ee7b7" font-family="monospace" font-size="15" font-weight="bold">Next.js / React</text>
      </g>

      <!-- Pill 3: TypeScript -->
      <g transform="translate(850, 375)">
        <rect x="3" y="3" width="145" height="42" rx="10" fill="#020617" />
        <rect x="0" y="0" width="145" height="42" rx="10" fill="#082f49" stroke="#38bdf8" stroke-width="2" />
        <text x="18" y="26" fill="#7dd3fc" font-family="monospace" font-size="15" font-weight="bold">TypeScript</text>
      </g>

      <!-- Pill 4: Cloud & SQL -->
      <g transform="translate(1010, 375)">
        <rect x="3" y="3" width="120" height="42" rx="10" fill="#020617" />
        <rect x="0" y="0" width="120" height="42" rx="10" fill="#451a03" stroke="#f59e0b" stroke-width="2" />
        <text x="16" y="26" fill="#fcd34d" font-family="monospace" font-size="15" font-weight="bold">Cloud/SQL</text>
      </g>

      <!-- Footer website url bar -->
      <g transform="translate(520, 460)">
        <line x1="0" y1="0" x2="610" y2="0" stroke="#1e293b" stroke-width="2" />
        <text x="0" y="35" fill="#94a3b8" font-family="monospace" font-size="16">portfolio: </text>
        <text x="100" y="35" fill="#00f0a0" font-family="monospace" font-size="16" font-weight="bold">adnanabf.com</text>
      </g>
    </svg>
  `);

  await sharp(ogSvg)
    .composite([
      // Avatar photo card on left
      { input: avatarFullCard, left: 60, top: 105 },
      // Brand logo badge above avatar
      { input: ogLogoBadge, left: 70, top: 50 },
    ])
    .png()
    .toFile(path.join(PUBLIC_DIR, 'og-image.png'));

  console.log('✓ Successfully created Cyber Mint OpenGraph preview image (og-image.png)!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
