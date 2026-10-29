# About-section photos (three-photo focus gallery)

The gallery in the About section shows these three, in this starting order:

| Start position | File | Caption |
|---|---|---|
| In focus | `about-main.jpg` | Most of the job happens here, usually after dark. |
| Right | `about-02.jpg` (the desk) | Behind the final frame. |
| Left | `about-03.jpg` (the video call) | Not all of it is solo. Some of it is a lot of faces on one screen. |

Where it's configured: `index.html`, search for `data-pf-panel`. Each photo is one
`<button class="pf-panel">` with:

    data-caption="…"                   the caption shown when it's in focus
    <img src="/assets/photos/…" alt="…" style="object-position: 50% 70%">

- To swap a photo, overwrite the file with the same name (and update its alt text/caption).
- The first panel in the markup is the one in focus when the page loads.
- `object-position` is the crop focus point (x% y%). The centre photo is wide and the
  side ones are narrow slivers, so keep the subject inside the frame at both shapes.
- A photo that fails to load is removed and the gallery re-balances (2 → wide + one side,
  1 → full width).

Preparing a photo (around 2000px, under ~400 KB, location data stripped):

    ffmpeg -i in.jpg -map_metadata -1 -vf "scale='min(2000,iw)':-2" -q:v 4 about-main.jpg

Full-size originals are kept outside the site in `media_originals/` (not uploaded).
