# Music section tracks

The music section ("A little something to listen to.") plays these files:

| Card | File | Note |
|---|---|---|
| EDM | `tracks/edm.mp3` | |
| The Weeknd | `tracks/the-weeknd.mp3` | Pressing its play shows "If you just want the drop, skip to 0:47." |
| Classical | `tracks/classical.mp3` | |

To replace a track, overwrite the file with the same name. Nothing else to change.

Everything else about a track lives on its card in `index.html` (search for `data-ms-card`):

    data-src="/assets/audio/tracks/edm.mp3"   which file plays
    data-title="EDM"                          card / player title
    data-mood="Loud, bright, fast."           the line under the title
    data-art=""                               optional artwork, e.g. "/assets/audio/art/edm.jpg"
    data-drop-note="47"                       (The Weeknd only) the seconds the 0:47 link jumps to

The visible card text is also written inside each card (`ms-card-title`, `ms-card-mood`,
`ms-art-type`), so change it there too if you rename a track.

Artwork: put a square image (around 800×800 JPG) in `public/assets/audio/art/` and set
its path in `data-art`. Without one, the card uses its own type-led design.

Behaviour
- A track whose file is missing is left out; if none exist, the whole section hides.
- Nothing ever autoplays. Only one track plays at a time. Starting a video's sound
  pauses the music; starting the music mutes the videos.

Converting a WAV (keeps it light: a 3-minute song is about 3.5 MB):

    ffmpeg -i song.wav -map_metadata -1 -c:a libmp3lame -b:a 160k tracks/edm.mp3

Full-size originals are kept outside the site in `media_originals/` (not uploaded).
