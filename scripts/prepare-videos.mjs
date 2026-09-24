/**
 * PREPARE VIDEOS — GAURAV PORTFOLIO
 *
 * Run after adding/replacing any file in public/assets/videos:
 *   npm run videos
 *
 * For every <name>.mp4 it makes sure these exist and are up to date:
 *   public/assets/videos/<name>.mp4            web-compressed master (1080p, used for Expand / flagship)
 *   public/assets/videos/previews/<name>.mp4   light 720p version the grid cards autoplay
 *   public/assets/videos/posters/<name>.jpg    first frame, shown instantly before the video loads
 *
 * New or replaced videos are backed up to video_originals/ (not committed) and compressed.
 * Videos already processed are skipped (tracked in public/assets/videos/.video-manifest.json).
 *
 * Flags:
 *   --mark-current   treat the current masters as already compressed (no re-encode), only build previews/posters
 *   --force          rebuild previews and posters for everything
 *
 * Requires ffmpeg + ffprobe on PATH.
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync, copyFileSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const videosDir = join(root, 'public', 'assets', 'videos');
const previewsDir = join(videosDir, 'previews');
const postersDir = join(videosDir, 'posters');
const backupDir = join(root, 'video_originals');
const manifestPath = join(videosDir, '.video-manifest.json');

const args = new Set(process.argv.slice(2));
const markCurrent = args.has('--mark-current');
const force = args.has('--force');

// Masters that never need a grid preview
const NO_PREVIEW = (name) => name.startsWith('hero') || name.startsWith('flagship');

for (const dir of [previewsDir, postersDir, backupDir]) mkdirSync(dir, { recursive: true });

const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
// Content hash (not modified-time) so a fresh clone on another machine doesn't re-compress everything
const fingerprint = (file) => ({
  size: statSync(file).size,
  sha1: createHash('sha1').update(readFileSync(file)).digest('hex'),
});
const sameFingerprint = (a, b) => a && b && a.size === b.size && a.sha1 === b.sha1;

const ffmpeg = (argv) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...argv], { stdio: 'inherit' });
const hasAudio = (file) =>
  execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', file])
    .toString().trim().length > 0;

// Encode into a temp file first so a failed run never leaves a broken video behind
const encode = (input, output, argv) => {
  const tmp = `${output}.tmp.mp4`;
  ffmpeg(['-i', input, ...argv, tmp]);
  if (existsSync(output)) unlinkSync(output);
  renameSync(tmp, output);
};

const X264 = ['-c:v', 'libx264', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];
// Keyframe every 2s → fast seeking and quick start
const KEYFRAMES = ['-force_key_frames', 'expr:gte(t,n_forced*2)'];
// Fit the SHORT side to N px (works for 16:9 and 9:16)
const shortSide = (n) => `scale='if(gt(iw,ih),-2,${n})':'if(gt(iw,ih),${n},-2)'`;

const files = readdirSync(videosDir).filter((f) => f.toLowerCase().endsWith('.mp4') && !f.endsWith('.tmp.mp4'));
let changed = 0;

for (const file of files) {
  const name = file.replace(/\.mp4$/i, '');
  const master = join(videosDir, file);
  const preview = join(previewsDir, file);
  const poster = join(postersDir, `${name}.jpg`);
  const isHero = name.startsWith('hero');
  const entry = manifest[file];
  const masterIsCurrent = sameFingerprint(entry?.master, fingerprint(master));

  // 1. New / replaced master → back up the original, then compress it in place
  if (!masterIsCurrent && !markCurrent) {
    console.log(`• ${file}: new or replaced — backing up and compressing`);
    const backup = join(backupDir, file);
    copyFileSync(master, backup);
    const audio = !isHero && hasAudio(backup);
    encode(backup, master, [
      '-map', '0:v:0', ...(audio ? ['-map', '0:a:0'] : []),
      '-vf', shortSide(1080), ...X264, ...KEYFRAMES,
      '-crf', isHero ? '26' : '24', '-maxrate', isHero ? '3M' : '3.5M', '-bufsize', isHero ? '6M' : '7M',
      ...(audio ? ['-c:a', 'aac', '-b:a', '128k'] : ['-an']),
    ]);
  }

  const masterChanged = !masterIsCurrent || force;

  // 2. Light preview for grid cards
  if (!NO_PREVIEW(name) && (masterChanged || !existsSync(preview))) {
    console.log(`• ${file}: building 720p preview`);
    const audio = hasAudio(master);
    encode(master, preview, [
      '-map', '0:v:0', ...(audio ? ['-map', '0:a:0'] : []),
      '-vf', shortSide(720), ...X264, ...KEYFRAMES,
      '-crf', '26', '-maxrate', '1.6M', '-bufsize', '3.2M',
      ...(audio ? ['-c:a', 'aac', '-b:a', '96k'] : ['-an']),
    ]);
  }

  // 3. Poster = first frame with visible content (many edits open on black) within the first 5s
  if (masterChanged || !existsSync(poster)) {
    console.log(`• ${file}: building poster`);
    const tmp = `${poster}.tmp.jpg`;
    const scale = shortSide(isHero ? 1080 : 720);
    if (existsSync(tmp)) unlinkSync(tmp);
    ffmpeg(['-t', '5', '-i', master, '-vf',
      `signalstats,metadata=select:key=lavfi.signalstats.YAVG:value=28:function=greater,${scale}`,
      '-frames:v', '1', '-q:v', '4', tmp]);
    // Entire opening is dark → fall back to the very first frame
    if (!existsSync(tmp)) ffmpeg(['-i', master, '-frames:v', '1', '-vf', scale, '-q:v', '4', tmp]);
    if (existsSync(poster)) unlinkSync(poster);
    renameSync(tmp, poster);
  }

  if (masterChanged) changed++;
  manifest[file] = { master: fingerprint(master) };
}

// Drop manifest entries for videos that no longer exist
for (const key of Object.keys(manifest)) if (!files.includes(key)) delete manifest[key];
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Done. ${files.length} videos checked, ${changed} processed.`);
