# Quick Start

## 1. Run from npm

```bash
npx -y mcp-turtle-noir
```

## 2. Add MCP config

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

## 3. Optional env settings

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

## 4. Typical flow

1. Ask the LLM: "Start a new turtle soup puzzle."
2. LLM calls `start_session` with `language` (for example `en-US`).
3. Ask questions; LLM calls `ask_question` each turn.
4. If needed, call `give_up_and_reveal`.

## 5. Common issues

- `Failed to start session`: check `TURTLE_NOIR_API_BASE_URL`.
- `Request timeout`: increase `TURTLE_NOIR_API_TIMEOUT_MS`.
- Reveal rejected: progress may be below backend threshold.
