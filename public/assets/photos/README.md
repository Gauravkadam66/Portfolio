# About-section photos

Drop your working photographs here using these exact names. Any that are missing
are simply left out and the layout closes up around them, so you can add them
one at a time.

| File | Where it appears | Shape it's cropped to | Pick |
|---|---|---|---|
| `about-main.jpg` | Large photo, left (top on phones) | Tall, 4:5 | Your strongest shot of you working |
| `about-02.jpg` | Supporting photo under the intro text | Landscape, 3:2 | A second angle / wider shot |
| `about-03.jpg` | Small square beside the "150 songs" / osu! notes | Square, 1:1 | A candid detail (hands, setup, screen) |

Tips
- JPG, around 1600–2000px on the long side, under ~400 KB each is plenty.
  (`ffmpeg -i in.jpg -vf "scale='min(2000,iw)':-2" -q:v 4 about-main.jpg`)
- Photos are cropped to fill their shape. If an important part gets cut off,
  add a focus point in `index.html` on that `<img>`, e.g. `style="object-position: 50% 30%"`.
- Captions and alt text live next to each `<img>` in `index.html` (search for `about-photo`).
  Update the alt text to describe the actual photo.
- Then run the site, check, commit and push as usual.
