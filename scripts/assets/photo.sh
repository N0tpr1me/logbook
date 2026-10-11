#!/usr/bin/env bash
# Headshot for the paper version.
# Source: a 1000x1000 JPEG, face centred (eyes ~y=410, chin ~y=690, head top ~y=60).
# Outputs: zain.jpg (4:5, 800x1000), zain@2x.jpg (1600x2000, upscaled - the source is only
# 1000px, so this carries no extra detail), zain-square.jpg (256x256 head-and-shoulders).
# All outputs: metadata stripped (-map_metadata -1), auto-oriented from EXIF, JPEG ~85%.
set -euo pipefail

FFMPEG="${FFMPEG:-/opt/homebrew/bin/ffmpeg}"
SRC="${1:-/Users/zainali/Desktop/My Photo.jpeg}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/public/assets/photos"
mkdir -p "$OUT"

# 4:5 portrait: the full 1000px height, 800px wide, x offset 100 so the face (centre x~490)
# sits in the middle with ~6% headroom above the hair. Native resolution, no resampling.
PORTRAIT="crop=800:1000:100:0"
# Square: 720px window from (140,40): hair to collar, eyes on the upper third.
SQUARE="crop=720:720:140:40"
Q=4   # ffmpeg mjpeg q scale (2 best .. 31 worst); 4 is roughly libjpeg quality 85

$FFMPEG -y -v error -autorotate -i "$SRC" -map_metadata -1 \
  -vf "$PORTRAIT" -q:v "$Q" "$OUT/zain.jpg"

$FFMPEG -y -v error -autorotate -i "$SRC" -map_metadata -1 \
  -vf "$PORTRAIT,scale=1600:2000:flags=lanczos" -q:v "$Q" "$OUT/zain@2x.jpg"

$FFMPEG -y -v error -autorotate -i "$SRC" -map_metadata -1 \
  -vf "$SQUARE,scale=256:256:flags=lanczos" -q:v "$Q" "$OUT/zain-square.jpg"

ls -la "$OUT"
