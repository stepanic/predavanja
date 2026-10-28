#!/usr/bin/env bash
# Dekodiranje je softversko: VideoToolbox ne dekodira LUMIX (svaki frame greška), a moto je
# na CPU-u 2,5× brži (2026-10-26, test 10 s). Encoder ostaje h264_videotoolbox.
# Proxyji za pregled u montaza web appu: 540p H.264 bez zvuka (keyframe svake sekunde,
# vremena okvira ista kao u originalu) i zasebni AAC zvuk po izvoru, pa vrhovi valnog oblika.
set -euo pipefail
RAW=/Volumes/DOMOVINA2TB/ai_edukacija_startupvg_20261020_raw_montaza
P="$RAW/proxy"
HERE=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$P"

video() { # ulaz ime [audio]
  local in="$RAW/$1" name=$2
  [[ -s "$P/$name.mp4" ]] && { echo "preskačem $name"; return; }
  local args=(-map 0:v:0 -vf "scale=-2:540" -c:v h264_videotoolbox -b:v 1500k -g 30
              -fps_mode passthrough -movflags +faststart -an "$P/$name.mp4.tmp.mp4")
  if [[ ${3:-} == audio ]]; then
    args+=(-map 0:a:0 -ac 1 -c:a aac -b:a 96k -movflags +faststart "$P/${name}_audio.m4a")
  fi
  ffmpeg -nostdin -v error -y -i "$in" "${args[@]}"
  mv "$P/$name.mp4.tmp.mp4" "$P/$name.mp4"
}
audio() { # ulaz ime kanali kbps
  [[ -s "$P/$2_audio.m4a" ]] && { echo "preskačem $2"; return; }
  ffmpeg -nostdin -v error -y -i "$RAW/$1" -vn -ac "$3" -c:a aac -b:a "$4" -movflags +faststart "$P/$2_audio.m4a"
}

audio "Recording 6.wav" rode 2 160k
audio "StartupVG AI radionica 2026-10-20.m4a" m4a 1 96k
video "20261020-1601-22.4383047.mp4" screen
video "P1400725.MP4" lumix audio
video "VID_20261020_174551574.mp4" moto audio
python3 -I "$HERE/peaks.py" "$P" "$HERE/../app/peaks"
echo gotovo
