# Sounds

Three generated sound effects, 33 KB in total (budget 150 KB). Regenerate with
`node scripts/assets/make-sounds.mjs`; the script is deterministic.

| File | What it is | Played when |
| --- | --- | --- |
| `page.wav` | 180ms band-passed noise swish | a page turn passes halfway |
| `clink.wav` | decaying sine at 3.2 kHz with an inharmonic partial | the teaspoon taps the mug's rim |
| `lamp-click.wav` | two 8ms clicks, 55ms apart | the lamp switch |

All are 32 kHz mono 16-bit WAV, decoded once through the Web Audio API
(`src/book/audio/engine.ts`) on the first user gesture. Nothing plays until the
visitor turns Sound on.

## Music

There is no music file here yet. Zain picks the track: calm, instrumental,
70 to 90 bpm, 2 to 3 minutes, from Pixabay Music (licence allows use on a
website without credit; the file is never offered as a download). Save the
licence page with the download date next to the file.

Shortlist (Pixabay, checked 12 October 2026; most lo-fi jazz on Pixabay is now
labelled AI generated, which the first two are not):

| Track | Artist | Length | Notes |
| --- | --- | --- | --- |
| [Good Night - Lofi Cozy Chill Music](https://pixabay.com/music/beats-good-night-lofi-cozy-chill-music-160166/) | FASSounds | 2:27 | lo-fi beat, warm, the closest to the DroneMedic video's track |
| [Soft Piano](https://pixabay.com/music/small-drama-soft-piano-589658/) | leberch | 2:32 | solo piano, quieter and more neutral |
| [Jazz — Late Train](https://pixabay.com/music/smooth-jazz-jazz-late-train-594993/) | Ornave | 2:28 | lo-fi jazz piano; labelled AI generated |

When it arrives:

1. Encode it as AAC at about 96 kbps (roughly 2 MB for 2.5 minutes), for
   example `ffmpeg -i track.wav -c:a aac -b:a 96k music.m4a`.
2. Save it as `public/assets/sounds/music.m4a`.
3. Call `audio.loadMusic('/assets/sounds/music.m4a')` after the reveal (the
   dev harness does this with `/?dev=desk&music=1`). The engine decodes it
   once, trims encoder silence for a seamless loop, fades it in over 3 seconds
   when Sound is on, fades it out when the tab is hidden, and stops it when
   the visitor switches to the simple version.
