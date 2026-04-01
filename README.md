# frames-mcp

Install the [Frames](https://frames.yibby.ai) MCP server and agent skills for Claude Code.

## Install

```bash
npx frames-mcp
```

This adds the Frames MCP server to your Claude Code config and installs the Frames skill for guided AI video pipeline building.

## What you get

- **MCP Server** — 38 tools for creating, building, executing, and publishing AI video workflows
- **Agent Skill** — teaches Claude how to use Frames tools effectively, with workflow patterns and domain knowledge

## Manual setup

If the installer doesn't work, you can set up manually:

```bash
# Add MCP server
claude mcp add frames --transport streamable-http https://frames-backend-ugzz.onrender.com/mcp

# Install skill (via skills CLI)
npx skills add briarbearrr/frames-mcp
```
