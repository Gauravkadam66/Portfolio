# Site music

Put your track here as:

    music.mp3

That's the only step. The player (bottom-right) and the "Hear one" link in the
About section stay hidden until this file exists, and the music never starts on
its own: only when a visitor clicks play.

To use a different filename or title, edit the player in `index.html`
(search for `id="music-player"`):

    data-src="/assets/audio/music.mp3"
    data-title="Original music by Gaurav"

Tips
- MP3 at 128–192 kbps keeps it light; a 3-minute song is ~3–4 MB.
  (`ffmpeg -i song.wav -c:a libmp3lame -b:a 160k music.mp3`)
- The track loops while someone browses. Starting a video's sound pauses the
  music, and starting the music mutes the videos, so they never play over each other.
