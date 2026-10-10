#!/usr/bin/env bash
# Runs scripts/playtest.ts on every CPU core and prints the merged table.
set -euo pipefail
n=${SHARDS:-$(nproc)}
out=$(mktemp -d)
for i in $(seq 0 $((n - 1))); do
  SHARD=$i SHARDS=$n node --import tsx scripts/playtest.ts --json "$out/$i.json" "$@" &
done
wait
node --import tsx -e "
const fs=require('fs');const rows=[];for(const f of fs.readdirSync('$out'))rows.push(...JSON.parse(fs.readFileSync('$out/'+f)));
fs.writeFileSync('$out/all.json',JSON.stringify(rows));console.error('$out/all.json');
" 
SHARDS=1 node --import tsx scripts/playtest.ts --report "$out/all.json"
