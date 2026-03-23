#!/bin/bash
# export-status.sh — Collect real data from OpenClaw + Notion → status.json → git push
# Runs on the sub Mac where OpenClaw is installed.

set -euo pipefail

REPO_DIR="/tmp/uchomura-ui"
STATUS_FILE="$REPO_DIR/status.json"
OPENCLAW="/opt/homebrew/bin/openclaw"
NOTION_KEY=$(cat ~/.config/notion/api_key)
NOTION_DB="645b4fa807eb4e2ea309adeb0d0f149e"
NOW_ISO=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
NOW_LOCAL=$(TZ=Asia/Tokyo date +"%H:%M")

# --- 1. Fetch OpenClaw sessions ---
OC_JSON=$($OPENCLAW status --json 2>/dev/null | grep -v '^\[plugins\]' || echo '{}')
SESSIONS=$(echo "$OC_JSON" | jq -r '[
  .sessions.recent // [] | .[] |
  {
    id: .key,
    kind: (if (.key | test("subagent")) then "subagent" else "request" end),
    label: (
      if (.key | test("subagent")) then
        "サブエージェント"
      elif (.key | test("slack")) then
        "Slack session"
      elif (.key | test("heartbeat")) then
        "ハートビート"
      elif (.key | test("cron")) then
        "定期タスク"
      else
        (.key | split(":") | last)
      end
    ),
    state: "running",
    needsNao: false,
    ageMin: ((.age // 0) / 60000 | floor),
    owner: "Ucho",
    detail: ("model: " + (.model // "unknown") + " / " + ((.percentUsed // 0) | tostring) + "% used"),
    source: "openclaw",
    children: 0
  }
] | if length > 20 then .[0:20] else . end')

# --- 2. Fetch Notion project tasks ---
NOTION_RAW=$(curl -s -X POST "https://api.notion.com/v1/databases/$NOTION_DB/query" \
  -H "Authorization: Bearer $NOTION_KEY" -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{"filter":{"property":"ステータス","select":{"does_not_equal":"🗑️ 中止"}}}')

NOTION_ITEMS=$(echo "$NOTION_RAW" | jq -r '[
  .results[] |
  {
    title: (.properties["プロジェクト名"].title[0].plain_text // "無題"),
    statusRaw: (.properties["ステータス"].select.name // "不明"),
    priority: (.properties["優先度"].select.name // "不明"),
    nextAction: (.properties["次のアクション"].rich_text[0].plain_text // null),
    id: .id
  } |
  {
    id: .id,
    kind: "request",
    label: .title,
    state: (
      if (.statusRaw | test("🟡")) then "waiting_approval"
      elif (.statusRaw | test("🟢")) then "running"
      elif (.statusRaw | test("📋")) then "new"
      elif (.statusRaw | test("✅")) then "done"
      elif (.statusRaw | test("🔵")) then "new"
      elif (.statusRaw | test("⏸")) then "done"
      else "new"
      end
    ),
    needsNao: (if (.statusRaw | test("🟡")) then true else false end),
    ageMin: 0,
    owner: (if (.statusRaw | test("🟡")) then "Nao" elif (.statusRaw | test("🔵")) then "Ucho" else "Ucho" end),
    detail: (.nextAction // .statusRaw),
    source: "notion",
    children: 0,
    priority: .priority
  }
]')

# --- 3. Merge and build status.json ---
ALL_ITEMS=$(echo "$SESSIONS" "$NOTION_ITEMS" | jq -s 'add')

# Count by state
WAITING=$(echo "$ALL_ITEMS" | jq '[.[] | select(.state == "waiting_approval")] | length')
RUNNING=$(echo "$ALL_ITEMS" | jq '[.[] | select(.state == "running")] | length')
NEW=$(echo "$ALL_ITEMS" | jq '[.[] | select(.state == "new")] | length')
DONE=$(echo "$ALL_ITEMS" | jq '[.[] | select(.state == "done")] | length')
ERROR=$(echo "$ALL_ITEMS" | jq '[.[] | select(.state == "error")] | length')

# Headline
if [ "$WAITING" -gt 0 ]; then
  HEADLINE="なお待ち ${WAITING}件あり"
elif [ "$ERROR" -gt 0 ]; then
  HEADLINE="エラー ${ERROR}件 — 確認が必要"
elif [ "$RUNNING" -gt 0 ]; then
  HEADLINE="進行中 ${RUNNING}件"
else
  HEADLINE="落ち着いています"
fi

# Session count for event
SESSION_COUNT=$(echo "$SESSIONS" | jq 'length')

# Build events
EVENTS=$(jq -n --arg now "$NOW_LOCAL" --arg sc "$SESSION_COUNT" --arg w "$WAITING" --arg r "$RUNNING" '[
  {at: $now, level: "running", text: ("ステータス更新 — セッション " + $sc + "件取得")},
  (if ($w | tonumber) > 0 then {at: $now, level: "waiting_approval", text: ("なお待ち " + $w + "件")} else empty end),
  (if ($r | tonumber) > 0 then {at: $now, level: "running", text: ("進行中 " + $r + "件")} else empty end)
]')

# Assemble final JSON
jq -n \
  --arg updatedAt "$NOW_ISO" \
  --arg headline "$HEADLINE" \
  --argjson summary "{\"new\":$NEW,\"running\":$RUNNING,\"waitingApproval\":$WAITING,\"done\":$DONE,\"error\":$ERROR}" \
  --argjson items "$ALL_ITEMS" \
  --argjson events "$EVENTS" \
  '{
    updatedAt: $updatedAt,
    connection: "ok",
    headline: $headline,
    summary: $summary,
    items: $items,
    events: $events
  }' > "$STATUS_FILE"

echo "✅ status.json generated: waiting=$WAITING running=$RUNNING new=$NEW done=$DONE error=$ERROR"

# --- 4. Git push if changed ---
cd "$REPO_DIR"
if ! git diff --quiet status.json 2>/dev/null; then
  git add status.json
  git commit -m "auto: update status.json $(TZ=Asia/Tokyo date +'%Y-%m-%d %H:%M')" --no-verify
  git push origin main
  echo "✅ Pushed to origin/main"
else
  echo "ℹ️  No changes in status.json, skipping push"
fi
