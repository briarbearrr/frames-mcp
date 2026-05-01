# wyren-mcp

Install the [Wyren](https://wyren.yibby.ai) MCP server and agent skills for Claude Code.

## Install

```bash
# Project-only (current directory)
npx wyren-mcp

# Global (all projects)
npx wyren-mcp --global
```

This adds the Wyren MCP server to your Claude Code config and installs the Wyren skill for guided AI pipeline building.

## What you get

- **MCP Server** — 38 tools for creating, building, executing, and publishing AI workflows
- **Agent Skill** — teaches Claude how to use Wyren tools effectively, with workflow patterns and domain knowledge

## Manual setup

If the installer doesn't work, you can set up manually:

```bash
# Add MCP server (local)
claude mcp add --transport http wyren https://api.wyren.ai/mcp

# Add MCP server (global)
claude mcp add --transport http --scope user wyren https://api.wyren.ai/mcp

# Install skill (via skills CLI)
npx skills add briarbearrr/wyren-mcp
```
