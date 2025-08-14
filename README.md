# MCP-MCP

A zero-dependency CLI tool to scan, view, and manage MCP (Model Context Protocol) server configurations across all your Claude projects.

## Features

- 🔍 **Scan all configurations** - Recursively finds all `.claude.json` files
- 🌳 **Tree view** - Visual hierarchy of configurations and their scope
- ⚠️ **Conflict detection** - Identifies overlapping server definitions
- 📚 **Installation help** - Quick access to documentation and setup commands
- 🚀 **Zero install** - Run via NPX, no global installation needed

## Usage

```bash
# Show all MCP configurations in a tree view
npx mcp-mcp

# Show configuration conflicts
npx mcp-mcp conflicts

# Get installation help for a specific server
npx mcp-mcp help supabase
npx mcp-mcp help github

# Show available commands
npx mcp-mcp help
```

## Example Output

```
MCP Configuration Tree

├── /Users/username (user)
│   ├── github (stdio)
│   └── brave-search (stdio) [BRAVE_API_KEY]
│
└── /Users/username/project (workspace)
    ├── supabase (stdio) [SUPABASE_URL, SUPABASE_ANON_KEY]
    └── filesystem (stdio)
```

## Configuration Scopes

- **workspace** - Project-specific (`.claude.json` in project directory)
- **user** - User-wide (`~/.claude.json`)
- **system** - System-wide (requires admin privileges)

## Conflict Resolution

When the same MCP server is defined in multiple configurations, the one closest to your current directory takes precedence:

1. Workspace configuration (current project)
2. User configuration (home directory)
3. System configuration

## Supported MCP Servers

Built-in help for common servers:
- `supabase` - Database integration
- `github` - Repository access
- `filesystem` - Local file access
- `postgres` - PostgreSQL integration
- `brave-search` - Web search API

## Requirements

- Node.js 14.0.0 or higher
- No additional dependencies

## License

MIT