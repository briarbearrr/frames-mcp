# frames-mcp

Install the [Frames](https://frames.yibby.ai) MCP server and agent skills for Claude Code.

## Install

```bash
# Project-only (current directory)
npx frames-mcp

# Global (all projects)
npx frames-mcp --global
```

This adds the Frames MCP server to your Claude Code config and installs the Frames skill for guided AI pipeline building.

## What you get

- **MCP Server** — 38 tools for creating, building, executing, and publishing AI workflows
- **Agent Skill** — teaches Claude how to use Frames tools effectively, with workflow patterns and domain knowledge

## Manual setup

If the installer doesn't work, you can set up manually:

```bash
# Add MCP server (local)
claude mcp add --transport http frames https://frames-backend-ugzz.onrender.com/mcp

# Add MCP server (global)
claude mcp add --transport http --scope user frames https://frames-backend-ugzz.onrender.com/mcp

# Install skill (via skills CLI)
npx skills add briarbearrr/frames-mcp
```
