// Renders a composition frame by frame in headless Chrome and encodes a 1080×1920 H.264 MP4.
//   flags: --page dashboard.html --out cir-dashboard-promo-9x16.mp4 --music assets/music-dashboard.wav
//   node scripts/render.mjs                 → output/cir-bookings-promo-9x16.mp4
//   node scripts/render.mjs --stills 2,6,14 → output/stills/t-<sec>.png
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'output');
const FPS = 30;
const W = 1080, H = 1920;

const args = process.argv.slice(2);
const arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const PAGE = arg('--page', 'index.html');
const OUT = arg('--out', 'cir-bookings-promo-9x16.mp4');
const MUSIC = arg('--music', 'assets/music.wav');
const stillsArg = args.includes('--stills') ? args[args.indexOf('--stills') + 1] : null;

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.goto(pathToFileURL(path.join(root, PAGE)).href);
await page.evaluate(() => window.ready);
const duration = await page.evaluate(() => DURATION);

const frame = async (t) => {
  await page.evaluate((t) => window.render(t), t);
  return page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: W, height: H } });
};

if (stillsArg) {
  const dir = path.join(out, 'stills', path.basename(PAGE, '.html'));
  fs.mkdirSync(dir, { recursive: true });
  for (const s of stillsArg.split(',').map(Number)) {
    fs.writeFileSync(path.join(dir, `t-${String(s).replace('.', '_')}.png`), await frame(s));
    console.log('still', s);
  }
} else {
  fs.mkdirSync(out, { recursive: true });
  const file = path.join(out, OUT);
  const music = path.join(root, MUSIC); // from scripts/music.mjs
  const ff = spawn('ffmpeg', [
    '-y', '-v', 'error',
    '-framerate', String(FPS), '-f', 'image2pipe', '-c:v', 'png', '-i', '-',
    ...(fs.existsSync(music) ? ['-i', music] : ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo']),
    '-map', '0:v', '-map', '1:a', '-shortest',
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '48000',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-r', String(FPS), '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart',
    file,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = Math.round(duration * FPS);
  for (let i = 0; i < total; i++) {
    const buf = await frame(i / FPS);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 60 === 0) console.log(`frame ${i}/${total}`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log('wrote', file);
}
await browser.close();
