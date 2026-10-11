#!/usr/bin/env bash
# DroneMedic clips for the logbook pages: three silent 6-second H.264 loops with JPEG poster frames.
# Sources are 2560x1440 HEVC screen recordings in the DroneMedic project folder (read-only; never modified).
# Output: 960 px wide, yuv420p, 30 fps, crf 26, +faststart, about 1 MB each, poster = the clip's first frame.
#
# Window choices (from a per-second frame-difference scan plus looking at the frames):
#   dashboard  19.4-25.4 s  the camera settles from the wide shot onto the live route; the drone moves along
#                           the cyan route line with the status cards live. 3-9 s is the launch zoom (drone still
#                           at the depot, no route yet); 10-16 s scores highest but shows grey map tiles reloading.
#   routing     3.0-9.0 s   the terminal prints the banner, "Computing routes for 2 drones, 4 clinics", the route
#                           assignment and the first flight lines (lines land at 3.0, 3.7, 4.4, 5.9, 7.4, 8.9 s).
#                           The recording is 26.5 s but only prints between ~3 s and ~11 s.
#   simulator  44.0-50.0 s  one continuous shot: the drone circles the domed tower with its orange path rings
#                           while the camera orbits. 11-17 s scores about the same but has a scene cut at ~14 s.
# Crops: the dashboard and simulator recordings include the browser tab strip and address bar (top 88 px of
# 1440), which is cropped off: 2560x1350 -> 960x506. The routing terminal is cropped to its text area
# (1600x844 from the top-left corner) so the type stays legible at 960 px, and lands on the same 960x506.
set -euo pipefail

FFMPEG="${FFMPEG:-/opt/homebrew/bin/ffmpeg}"
FFPROBE="${FFPROBE:-/opt/homebrew/bin/ffprobe}"
SRC_DIR="${SRC_DIR:-/Users/zainali/Desktop/Projects/DroneMedic Project Video/Clips}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/public/assets/clips"
mkdir -p "$OUT"

DURATION=6
WIDTH=960
HEIGHT=506
FPS=30
CRF="${CRF:-26}"
POSTER_Q=4   # ffmpeg mjpeg q scale (2 best .. 31 worst); 4 is roughly libjpeg quality 85

# make_clip <name> <source file> <start seconds> <crop w:h:x:y>
make_clip() {
  local name="$1" src="$SRC_DIR/$2" start="$3" crop="$4"
  local vf="crop=${crop},scale=${WIDTH}:${HEIGHT}:flags=lanczos"
  # Read half a second extra, clone the last frame if the (variable-rate) source runs short, then cut at
  # exactly DURATION so every clip is the same length.
  "$FFMPEG" -y -v error -ss "$start" -t "$(echo "$DURATION + 0.5" | bc)" -i "$src" -an \
    -vf "${vf},setpts=PTS-STARTPTS,fps=${FPS},tpad=stop_mode=clone:stop_duration=2,format=yuv420p" \
    -t "$DURATION" -c:v libx264 -preset slow -crf "$CRF" -profile:v high -level 4.0 -g 60 \
    -movflags +faststart "$OUT/$name.mp4"
  "$FFMPEG" -y -v error -ss "$start" -i "$src" -frames:v 1 \
    -vf "$vf" -q:v "$POSTER_Q" "$OUT/$name.jpg"
}

make_clip dronemedic-dashboard "Dashboard.mov"       19.4 2560:1350:0:88
make_clip dronemedic-routing   "Multi-drone VRP.mov"  3.0 1600:844:0:0
make_clip dronemedic-simulator "3D Simulator.mov"    44.0 2560:1350:0:88

for f in "$OUT"/*.mp4; do
  echo "== $(basename "$f")  $(stat -f %z "$f") bytes"
  "$FFPROBE" -v error -select_streams v:0 \
    -show_entries stream=codec_name,profile,pix_fmt,width,height,r_frame_rate,nb_frames:format=duration,bit_rate \
    -of default=noprint_wrappers=1 "$f"
done
ls -la "$OUT"
