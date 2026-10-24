#!/usr/bin/env bash
# zz-uo-ab-s67.sh — one-command A/B gate for surface 6 (theme editor chrome)
# and surface 7 (expanded settings).
#
#   strip S6+S7 -> run the shot harness as "before" -> restore -> run as "after"
#   -> print the probe diff and the shot-pair hashes.
#
# Both runs go through the SAME harness, so every probe has a matching
# before/after line. Only the two blocks under review are un-shipped for the
# "before" pass (S1–S4/S23 stay in place), and --restore is verified against
# the pre-strip md5s, so a crash can never leave the tree stripped.
#
# Usage (repo root, Jekyll on 127.0.0.1:4000):
#   bash scene-lab/zz-uo-ab-s67.sh
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

STRIP='scene-lab/zz-uo-remove-uos.mjs'
LOG_B=scene-lab/zz-uo-ab-s67-before.txt
LOG_A=scene-lab/zz-uo-ab-s67-after.txt
PRE=/tmp/zz-uo-ab-pre-md5.txt
POST=/tmp/zz-uo-ab-post-md5.txt

if [ -f assets/css/timer.css.uosbak ] || [ -f assets/css/theme-editor.css.uosbak ]; then
  echo "leftover .uosbak — restoring first"
  node "$STRIP" --restore
fi

md5sum assets/css/timer.css assets/css/theme-editor.css >"$PRE"

cleanup() {
  if [ -f assets/css/timer.css.uosbak ] || [ -f assets/css/theme-editor.css.uosbak ]; then
    echo '!! restoring stripped CSS'
    node "$STRIP" --restore
  fi
}
trap cleanup EXIT

echo '== strip S6 + S7 (leave S1–S4/S23 shipped)'
node "$STRIP" --only s6,s7 || exit 1
echo "   S6 blocks left: $(grep -c '_UO-S6-START_' assets/css/theme-editor.css || true)"
echo "   S7 blocks left: $(grep -c '_UO-S7-START_' assets/css/timer.css || true)"
echo "   S23 still shipped: $(grep -c '_UO-S23-START_' assets/css/timer.css || true)"

echo '== before pass'
node scene-lab/zz-uo-shot-s67.mjs before >"$LOG_B" 2>&1 || echo '   (harness exited non-zero — see log)'

echo '== restore'
node "$STRIP" --restore || exit 1
md5sum assets/css/timer.css assets/css/theme-editor.css >"$POST"
if diff -q "$PRE" "$POST" >/dev/null; then
  echo '   CSS restored byte-identically (md5 match)'
else
  echo '!! CSS DID NOT restore to the pre-strip bytes — stopping'
  diff "$PRE" "$POST"
  exit 1
fi

echo '== after pass'
node scene-lab/zz-uo-shot-s67.mjs after >"$LOG_A" 2>&1 || echo '   (harness exited non-zero — see log)'

echo
echo '== page errors'
printf 'before: %s\n' "$(grep '^page errors' "$LOG_B" | tail -1)"
printf 'after : %s\n' "$(grep '^page errors' "$LOG_A" | tail -1)"

echo
echo '== probe diff (before → after)'
diff \
  <(grep '^probe ' "$LOG_B") \
  <(grep '^probe ' "$LOG_A") || true

echo
echo '== shot pairs (md5; identical hashes = no visual change)'
for n in editor footermenu general general-focus theme tllib extras; do
  b=$(md5sum "scene-lab/zz-uo-before-s67-$n.png" 2>/dev/null | cut -d' ' -f1)
  a=$(md5sum "scene-lab/zz-uo-after-s67-$n.png" 2>/dev/null | cut -d' ' -f1)
  if [ -z "$b" ]; then printf '  %-14s before missing\n' "$n"
  elif [ "$b" = "$a" ]; then printf '  %-14s IDENTICAL (no change?)\n' "$n"
  else printf '  %-14s changed  %s -> %s\n' "$n" "${b:0:8}" "${a:0:8}"; fi
done
echo
echo "logs: $LOG_B , $LOG_A"
