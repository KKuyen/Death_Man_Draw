#!/bin/sh
# usage: scripts/sim/run.sh OUTDIR [games-per-shard=200] [first-seed=21] [extra sim flags]
set -eu
out=${1:-/tmp/simout}; n=${2:-200}; seed=${3:-21}
if [ "$#" -gt 0 ]; then shift; fi
if [ "$#" -gt 0 ]; then shift; fi
if [ "$#" -gt 0 ]; then shift; fi
mkdir -p "$out"
for prior in "$out"/*.raw.json; do
  if [ -f "$prior" ]; then
    echo "Thư mục đã có kết quả: $out; hãy chọn thư mục mới." >&2
    exit 1
  fi
done
pids=""
for offset in 0 1 2 3; do
  s=$((seed + offset))
  node --import tsx scripts/sim/sim.ts --games "$n" --seed "$s" --json "$out/s$s.json" "$@" > "$out/s$s.log" 2>&1 &
  pids="$pids $!"
done
status=0
for pid in $pids; do wait "$pid" || status=1; done
python3 scripts/sim/merge.py "$out" || status=1
exit "$status"
