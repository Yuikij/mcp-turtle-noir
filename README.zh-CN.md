# mcp-turtle-noir

Turtle Soup（海龟汤）MCP 服务端。

这个包是 Turtle Noir 后端 API 的一层轻量 MCP 封装，当前采用 `stdio` 传输。

[首页](https://turtlenoir.com/) | [English README](./README.md) | [日本語](./README.ja-JP.md)

## 功能

- `start_session`：开始一局新题
- `ask_question`：针对当前会话提问并获取结构化判定结果
- `give_up_and_reveal`：放弃并揭晓（受后端揭晓策略限制）
- 通过 `language` 支持多语言 MCP 输出（`zh-CN`、`en-US`、`ja-JP`）
- 正常流程中汤底只保留在后端，不下发给 MCP 客户端

## 传输方式

- 支持：`stdio`
- 本包未包含：SSE/HTTP MCP 传输实现

## 环境要求

- Node.js 18+

## 安装与运行

```bash
npx -y mcp-turtle-noir
```

## MCP 客户端配置

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

带环境变量的示例：

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

## 工具说明

### 1) `start_session`

输入（全可选）：

```json
{
  "region": "US",
  "keyword": "island",
  "language": "en-US"
}
```

输出：

```json
{
  "session_id": "...",
  "puzzle_id": "...",
  "title": "...",
  "content": "...",
  "language": "en-US",
  "instruction": "...",
  "translation_instruction": "..."
}
```

### 2) `ask_question`

输入：

```json
{
  "session_id": "...",
  "question": "...",
  "language": "en-US"
}
```

输出：

```json
{
  "session_id": "...",
  "language": "en-US",
  "answer_key": "irrelevant",
  "answer": "Irrelevant",
  "answer_original": "...",
  "short_reason": "...",
  "solved": false,
  "progress": 35,
  "translation_instruction": "..."
}
```

### 3) `give_up_and_reveal`

输入：

```json
{
  "session_id": "...",
  "language": "en-US"
}
```

输出：

```json
{
  "session_id": "...",
  "language": "en-US",
  "title": "...",
  "solution": "...",
  "cta_url": "https://turtlenoir.com",
  "cta_text": "...",
  "translation_instruction": "..."
}
```

说明：当进度低于阈值时（例如 `progress < 60`），后端可能拒绝揭晓。

## 环境变量

- `TURTLE_NOIR_API_BASE_URL`（默认：`https://turtlenoir.com/api/mcp`）
- `TURTLE_NOIR_API_TIMEOUT_MS`（默认：`10000`）
- `TURTLE_NOIR_API_KEY`（可选，Bearer Token）

## 本地开发

```bash
npm install
npm run build
node dist/index.js
```

## 快速开始

见 `QUICKSTART.md`。

## 许可证

MIT，见 `LICENSE`。
