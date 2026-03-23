#!/usr/bin/env bash

set -euo pipefail

out="${1:-status.json}"
updated_at="$(date '+%Y-%m-%dT%H:%M:%S%z')"
offset="${updated_at:0:22}:${updated_at:22:2}"
updated_at="${offset}"

waiting="${WAITING_APPROVAL_COUNT:-1}"
running="${RUNNING_COUNT:-2}"
new_items="${NEW_COUNT:-1}"
done="${DONE_COUNT:-4}"
error_count="${ERROR_COUNT:-0}"

cat > "$out" <<EOF
{
  "updatedAt": "${updated_at}",
  "connection": "ok",
  "headline": "なお待ち ${waiting}件、実行中 ${running}件",
  "summary": {
    "new": ${new_items},
    "running": ${running},
    "waitingApproval": ${waiting},
    "done": ${done},
    "error": ${error_count}
  },
  "items": [
    {
      "id": "req_exporter_1",
      "kind": "request",
      "label": "exporter sample",
      "state": "waiting_approval",
      "needsNao": true,
      "ageMin": 3,
      "owner": "Nao",
      "detail": "ここを OpenClaw の実データ変換に置き換える",
      "source": "exporter",
      "children": 0
    },
    {
      "id": "sub_exporter_1",
      "kind": "subagent",
      "label": "running sample",
      "state": "running",
      "needsNao": false,
      "ageMin": 7,
      "owner": "Ucho",
      "detail": "最小サンプル",
      "source": "exporter",
      "children": 0
    }
  ],
  "events": [
    {
      "at": "$(date '+%H:%M')",
      "level": "waiting_approval",
      "text": "export-status-example.sh で status.json を生成"
    }
  ]
}
EOF

echo "wrote ${out}"
