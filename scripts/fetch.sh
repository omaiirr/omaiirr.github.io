#!/usr/bin/env bash
set -e

PRIVATE_REPO="omaiirr/media-private"
TARGET_DIR="media"
TMP_DIR="$(mktemp -d)"

rm -rf "$TARGET_DIR"
mkdir -p "$TARGET_DIR"

git clone --depth 1 "https://x-access-token:${GH_TOKEN}@github.com/${PRIVATE_REPO}.git" "$TMP_DIR"
cp -R "$TMP_DIR"/* "$TARGET_DIR"/
rm -rf "$TMP_DIR"
