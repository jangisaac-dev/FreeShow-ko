#!/usr/bin/env bash
# FreeShow-ko: build, sign and upload a macOS release as a draft to github.com/jangisaac-dev/FreeShow-ko/releases
# test the draft's dmg, then publish it: installed apps with "auto updates" on download it and install it on quit
# version = <upstream version>-ko.<n> (e.g. 1.6.6-ko.1), so a rebased upstream version sorts higher (1.6.7-ko.1)
# optional notarization: xcrun notarytool store-credentials freeshow-notary, then run with APPLE_KEYCHAIN_PROFILE=freeshow-notary
set -euo pipefail
cd "$(dirname "$0")/../.."

REPO=jangisaac-dev/FreeShow-ko

git diff --quiet HEAD || { echo "Commit your changes first."; exit 1; }
[ "$(git rev-parse HEAD)" = "$(git ls-remote "https://github.com/$REPO" refs/heads/main | cut -f1)" ] || { echo "Push this commit to $REPO main first."; exit 1; }

base=$(node -p 'require("./package.json").version')
last=$(gh release list -R "$REPO" --limit 100 --json tagName -q '.[].tagName' | sed -n "s/^v$base-ko\.\([0-9]*\)\$/\1/p" | sort -n | tail -1)
version="$base-ko.$((${last:-0} + 1))"
echo "Releasing FreeShow $version"

rm -rf dist
npm run build
GH_TOKEN=$(gh auth token) npx electron-builder --mac --config config/building/electron-builder.yaml -c.extraMetadata.version="$version" --publish always
node scripts/cleanBuilds.js

echo "Uploaded draft https://github.com/$REPO/releases (v$version). Test the dmg, then publish it:"
echo "  gh release edit v$version -R $REPO --draft=false --latest"
