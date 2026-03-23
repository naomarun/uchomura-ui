# うちょ村 UI

OpenClaw セッション + Notion プロジェクト管理の状態を可視化するダッシュボード。

**Live:** https://uchomura-ui.vercel.app

## アーキテクチャ

```
サブMac (OpenClaw)          Vercel (静的ホスティング)
┌──────────────────┐       ┌──────────────────┐
│ export-status.sh │──git──▶│  status.json     │
│  30秒ごとに実行  │ push  │  index.html      │
│                  │       │  app.js / CSS     │
│ データソース:    │       │                  │
│  - openclaw CLI  │       │  15秒ごとにfetch  │
│  - Notion API    │       │  でポーリング     │
└──────────────────┘       └──────────────────┘
```

## セットアップ

### 前提条件
- `/opt/homebrew/bin/openclaw` がインストール済み
- `~/.config/notion/api_key` に Notion API キーが設定済み
- Git remote `origin` が `naomarun/uchomura-ui` に設定済み

### エクスポーターを1回実行
```bash
bash scripts/export-status.sh
```

### ループで自動実行（30秒間隔）
```bash
nohup bash scripts/run-exporter-loop.sh > /tmp/uchomura-exporter.log 2>&1 &
```

### 停止
```bash
kill $(pgrep -f run-exporter-loop)
```

## データソース

| ソース | 取得方法 | 内容 |
|--------|----------|------|
| OpenClaw | `openclaw status --json` | アクティブセッション（サブエージェント含む） |
| Notion | プロジェクト管理DB API | タスク状態（🟡なお待ち / 🟢進行中 / 📋未着手 / ✅完了 / 🔵うちょ次やる） |

## UI機能

- **サマリーカード**: なお待ち / エラー / 実行中 / 新着 / 完了の件数
- **レーン表示**: 状態ごとにキャラクターを配置
- **詳細カード**: キャラクタークリックで詳細表示
- **イベントログ**: 直近の変更履歴
- **Live/Stale バッジ**: データの鮮度表示（2分以上古いと Stale）
