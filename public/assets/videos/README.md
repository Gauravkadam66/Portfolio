# Video Placement Guide — Gaurav Portfolio

Drop video files into this folder:
`Directories\test\public\assets\videos\`

The site references these exact filenames. To swap a video:

1. Replace the file here **with the same name**.
2. Run `npm run videos` (from `Directories\test`). It will:
   - back up your original to `video_originals\` (not uploaded to GitHub),
   - compress the video for the web,
   - rebuild its light 720p preview (`previews\`) and its poster image (`posters\`).
3. Commit and push:
   `git add -A` → `git commit -m "Update videos"` → `git push`

Skipping step 2 still works (the site falls back to the full file), but the video will be
heavier to load and the poster will show the old video's frame until it starts playing.

| Section | Position | Filename | Aspect |
|---|---|---|---|
| Hero | Full-screen background | `hero_bg.mp4` | 16:9 (cropped to fill) |
| The Work | 01 — Rareliquid | `flagship_01.mp4` | 16:9 |
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

## How loading works

- Every card shows its **poster** instantly, so there's never a black box.
- After the hero is ready, videos **buffer in the background in page order** (2 at a time;
  anything about to scroll into view jumps the queue), so they're ready before you reach them.
- Grid cards play the light **720p preview**; **Expand** and the flagship use the full-quality file.
- Only videos actually on screen are decoded/playing.
