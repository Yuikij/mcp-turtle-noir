# mcp-turtle-noir

Turtle Soup（水平思考クイズ）向けの MCP サーバーです。

このパッケージは Turtle Noir バックエンド API の薄い MCP ラッパーで、現在は `stdio` トランスポートで動作します。

[ホームページ](https://turtlenoir.com/) | [English README](./README.md) | [中文文档](./README.zh-CN.md)

## 主な機能

- `start_session`：新しい問題セッションを開始
- `ask_question`：現在のセッションに質問して構造化レスポンスを取得
- `give_up_and_reveal`：ギブアップして真相を表示（バックエンドの公開ポリシーに従う）
- `language` による多言語 MCP 出力（`zh-CN`、`en-US`、`ja-JP`）
- 通常プレイ中、真相はバックエンド側に保持され、MCP クライアントには配信しない

## トランスポート

- 対応：`stdio`
- このパッケージには SSE/HTTP MCP トランスポートは含まれません

## 動作要件

- Node.js 18+

## インストールと実行

```bash
npx -y mcp-turtle-noir
```

## MCP クライアント設定

```json
{
  "mcpServers": {
    "turtle-noir": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-turtle-noir"
      ]
    }
  }
}
```

環境変数付きの例：

```json
{
  "mcpServers": {
    "turtle-noir": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-turtle-noir"
      ],
      "env": {
        "TURTLE_NOIR_API_BASE_URL": "https://turtlenoir.com/api/mcp",
        "TURTLE_NOIR_API_TIMEOUT_MS": "10000",
        "TURTLE_NOIR_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

## ツール

### 1) `start_session`

入力（すべて任意）：

```json
{
  "region": "US",
  "keyword": "island",
  "language": "ja-JP"
}
```

出力：

```json
{
  "session_id": "...",
  "puzzle_id": "...",
  "title": "...",
  "content": "...",
  "language": "ja-JP",
  "instruction": "...",
  "translation_instruction": "..."
}
```

### 2) `ask_question`

入力：

```json
{
  "session_id": "...",
  "question": "...",
  "language": "ja-JP"
}
```

出力：

```json
{
  "session_id": "...",
  "language": "ja-JP",
  "answer_key": "irrelevant",
  "answer": "無関係",
  "answer_original": "...",
  "short_reason": "...",
  "solved": false,
  "progress": 35,
  "translation_instruction": "..."
}
```

### 3) `give_up_and_reveal`

入力：

```json
{
  "session_id": "...",
  "language": "ja-JP"
}
```

出力：

```json
{
  "session_id": "...",
  "language": "ja-JP",
  "title": "...",
  "solution": "...",
  "cta_url": "https://turtlenoir.com",
  "cta_text": "...",
  "translation_instruction": "..."
}
```

注：進捗が閾値未満の場合（例：`progress < 60`）、バックエンドが公開を拒否する場合があります。

## 環境変数

- `TURTLE_NOIR_API_BASE_URL`（既定：`https://turtlenoir.com/api/mcp`）
- `TURTLE_NOIR_API_TIMEOUT_MS`（既定：`10000`）
- `TURTLE_NOIR_API_KEY`（任意、Bearer Token）

## 開発

```bash
npm install
npm run build
node dist/index.js
```

## クイックスタート

`QUICKSTART.md` を参照してください。

## ライセンス

MIT（`LICENSE` を参照）。

## リンク

- 公式サイト：[Turtle Noir](https://turtlenoir.com/)
- 中国語版ミラー：[出前一汤](https://haiguitang.net/)
