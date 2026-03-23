# うちょ村UI

OpenClaw の状態を、別の Mac から常時ひと目で確認するための軽量 static web app です。  
1キャラ = 1リクエスト or 1サブエージェント。`waiting_approval` を最優先で、かわいさより glanceability を優先しています。

## 何が入っているか

- `index.html`  
  ゼロビルドの画面本体
- `styles.css`  
  レイアウト、色、状態別表現、微アニメーション
- `app.js`  
  `status.json` の fetch、埋め込み fallback、ポーリング、詳細表示
- `status.json`  
  ローカル確認用のモックデータ
- `scripts/export-status-example.sh`  
  将来の OpenClaw exporter 統合用の最小サンプル

## 画面の要点

- 最上段に `waiting_approval` の優先バナー
- 状態別 lane: `waiting_approval`, `error`, `running`, `new`, `done`
- 集計カードと直近イベント
- キャラ選択で右側に詳細表示
- `updatedAt` が古い場合の stale warning
- `status.json` の fetch 失敗時は埋め込みモックへ graceful fallback

## ローカルで動かす

`file://` 直開きだと `fetch("./status.json")` がブラウザ制約で失敗しやすいので、簡単なローカル HTTP サーバーで開くのが前提です。

```bash
cd /private/tmp/uchomura-ui
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000` を開きます。

`status.json` が読めればそれを表示し、読めない場合でも埋め込みモックで画面は崩れません。

## `status.json` スキーマ

最小形は次です。

```json
{
  "updatedAt": "2026-03-23T20:43:00+09:00",
  "connection": "ok",
  "headline": "なお待ち 2件、running 3件",
  "summary": {
    "new": 2,
    "running": 3,
    "waitingApproval": 2,
    "done": 6,
    "error": 1
  },
  "items": [
    {
      "id": "req_101",
      "kind": "request",
      "label": "価格判断",
      "state": "waiting_approval",
      "needsNao": true,
      "ageMin": 12,
      "owner": "Nao",
      "detail": "返信前の最終判断が必要",
      "source": "slack",
      "children": 0
    }
  ],
  "events": [
    {
      "at": "20:43",
      "level": "waiting_approval",
      "text": "公開判断が なお待ち に移動"
    }
  ]
}
```

### 状態

- `new`
- `running`
- `waiting_approval`
- `done`
- `error`

`summary.waitingApproval` は camelCase、`items[].state` は `waiting_approval` です。MVP ではこのまま扱っています。

## 今のデータ読み込みルール

1. `app.js` が `./status.json` を `fetch()`
2. 成功したらその JSON を描画
3. 失敗したら埋め込み fallback モックを描画
4. 15 秒ごとに再取得
5. `updatedAt` が 2 分より古ければ stale warning を表示

## OpenClaw との今後の統合

MVP としては、別 Mac 側で `status.json` を定期生成して静的配信するのが一番軽いです。

想定フロー:

```text
OpenClaw / logs / task state
  -> exporter script
  -> status.json
  -> static file server
  -> main Mac browser
```

### 最小 integration path

1. サブ Mac で OpenClaw の状態ソースを読む
2. 5状態に正規化する
3. `status.json` を定期上書きする
4. Caddy, nginx, `python3 -m http.server`, GitHub Pages, Netlify, Vercel などで配信する

### まず精度を上げるべき判定

`waiting_approval` です。  
Nao の確認が必要かどうかだけは、他状態より優先して確実に拾う設計にしてください。

## サンプル exporter

`scripts/export-status-example.sh` は最小の雛形です。今は OpenClaw 本体を読まず、環境変数や固定値から `status.json` を生成します。

実運用ではこのスクリプトの中で以下を置き換えます。

- OpenClaw のタスク一覧取得
- approval pending 判定
- running / done / error 集計
- 直近イベント整形

使い方:

```bash
cd /private/tmp/uchomura-ui
./scripts/export-status-example.sh
```

必要なら出力先を変えられます。

```bash
./scripts/export-status-example.sh /path/to/status.json
```

## 配置とデプロイ

ビルド不要です。以下をそのまま配信できます。

- `index.html`
- `styles.css`
- `app.js`
- `status.json`

### 例: LAN 内の軽量配信

```bash
cd /private/tmp/uchomura-ui
python3 -m http.server 8000 --bind 0.0.0.0
```

### 例: 静的ホスティング

- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages

注意点:

- `status.json` は cache を強くしすぎない
- 機密情報は載せない
- LAN/Tailscale 内配信が最初は安全

## 手元での確認ポイント

- `index.html` から `styles.css` と `app.js` を相対参照している
- `app.js` は `./status.json` を参照している
- `status.json` が存在し、JSON として読める
- fetch 失敗時も埋め込みモックで表示が続く
- 画面幅が狭くても lane と詳細が崩れない
