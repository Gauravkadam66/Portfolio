# Video Placement Guide — Gaurav Portfolio

Drop video files into this folder:
`Directories\test\public\assets\videos\`

The site references these exact filenames. To swap a video, replace the file
**with the same name** — no code changes needed. Refresh the page (hard refresh
with Ctrl+Shift+R if the browser cached the old file).

Any file that is missing shows an animated placeholder (or, for the hero,
just the dark navy background), so the site never looks broken.

| Section | Position | Filename | Aspect |
|---|---|---|---|
| Hero | Full-screen background | `hero_bg.mp4` | 16:9 (cropped to fill) |
| The Work | 01 / Figuring It Out — Rareliquid | `flagship_01.mp4` | 16:9 |
| VSL | 01 | `vsl_01.mp4` | 16:9 |
| VSL | 02 | `vsl_02.mp4` | 16:9 |
| VSL | 03 | `vsl_03.mp4` | 16:9 |
| VSL | 04 | `vsl_04.mp4` | 16:9 |
| Long-form / YouTube | Explainers 01 | `explainer_01.mp4` | 16:9 |
| Long-form / YouTube | Explainers 02 | `explainer_02.mp4` | 16:9 |
| Long-form / YouTube | Explainers 03 | `explainer_03.mp4` | 16:9 |
| Long-form / YouTube | Explainers 04 | `explainer_04.mp4` | 16:9 |
| Long-form / YouTube | Podcasts 01 | `podcast_01.mp4` | 16:9 |
| Long-form / YouTube | Podcasts 02 | `podcast_02.mp4` | 16:9 |
| Short-form / Social | 01 / | `reel_01.mp4` | 9:16 |
| Short-form / Social | 02 / | `reel_02.mp4` | 9:16 |
| Short-form / Social | 03 / | `reel_03.mp4` | 9:16 |

## Tips

- **Hero background:** keep it short (10–20 s loop), 1080p, H.264, no audio track,
  ideally under ~10 MB. It is muted, darkened and plays behind the text.
- **Card videos:** use H.264 `.mp4` with `+faststart` so playback begins before the
  whole file downloads. Very large files (100 MB+) will be slow for visitors.
  Example (ffmpeg):
  `ffmpeg -i input.mov -c:v libx264 -crf 23 -preset slow -c:a aac -b:a 128k -movflags +faststart output.mp4`
