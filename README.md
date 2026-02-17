# mcp-turtle-noir

MCP server for Turtle Soup (lateral thinking puzzles).

This package is a thin MCP layer over Turtle Noir backend APIs and is designed for `stdio` transport.

[Homepage](https://turtlenoir.com/) | [中文文档](./README.zh-CN.md) | [日本語](./README.ja-JP.md)

## Features

- `start_session`: start a new puzzle session
- `ask_question`: ask one question and receive a structured result
- `give_up_and_reveal`: reveal the solution (subject to backend reveal policy)
- Multilingual MCP output (`zh-CN`, `en-US`, `ja-JP`) via `language`
- Keeps puzzle solutions on the backend during normal gameplay

## Transport

- Supported: `stdio`
- Not included in this package: SSE/HTTP MCP transport

## Requirements

- Node.js 18+

## Install and Run

```bash
npx -y mcp-turtle-noir
```

## MCP Client Config

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

With environment variables:

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

## Tools

### 1) `start_session`

Input (all optional):

```json
{
  "region": "US",
  "keyword": "island",
  "language": "en-US"
}
```

Output:

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

Input:

```json
{
  "session_id": "...",
  "question": "...",
  "language": "en-US"
}
```

Output:

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

Input:

```json
{
  "session_id": "...",
  "language": "en-US"
}
```

Output:

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

Note: backend may reject reveal if progress is below a threshold (for example `progress < 60`).

## Environment Variables

- `TURTLE_NOIR_API_BASE_URL` (default: `https://turtlenoir.com/api/mcp`)
- `TURTLE_NOIR_API_TIMEOUT_MS` (default: `10000`)
- `TURTLE_NOIR_API_KEY` (optional Bearer token)

## Development

```bash
npm install
npm run build
node dist/index.js
```

## Quick Start

See `QUICKSTART.md`.

## Chinese Docs

See `README.zh-CN.md`.

## License

MIT. See `LICENSE`.
