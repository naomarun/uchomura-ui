#!/bin/bash
# run-exporter-loop.sh — Run export-status.sh every 30 seconds
# Usage: nohup bash scripts/run-exporter-loop.sh &

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🔄 Starting exporter loop (every 30s). PID: $$"

while true; do
  bash "$SCRIPT_DIR/export-status.sh" 2>&1 | tail -2
  sleep 30
done
