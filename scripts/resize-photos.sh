#!/bin/sh
# Resize speaker photos for the web (macOS sips) as ~600px JPEGs.
set -e
cd "$(dirname "$0")/.."
mkdir -p public/speaker
rm -f public/speaker/*.png
for name in nasir aidul; do
  sips -Z 600 -s format jpeg -s formatOptions 80 "speaker/$name.png" --out "public/speaker/$name.jpg" >/dev/null
done
ls -l public/speaker
