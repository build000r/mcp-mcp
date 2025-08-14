#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

class MCPManager {
  constructor() {
    this.configs = new Map();
    this.serverDatabase = {
      'supabase': {
        docs: 'https://docs.anthropic.com/en/docs/claude-code/mcp',
        github: 'https://github.com/supabase/mcp-server',
        description: 'Supabase database integration',
        scope: 'workspace (recommended for project-specific DB)'
      },
      'github': {
        docs: 'https://docs.anthropic.com/en/docs/claude-code/mcp',
        github: 'https://github.com/modelcontextprotocol/servers',
        description: 'GitHub repository access',
        scope: 'user (recommended for personal repos)'
      },
      'filesystem': {
        docs: 'https://docs.anthropic.com/en/docs/claude-code/mcp',
        github: 'https://github.com/modelcontextprotocol/servers',
        description: 'Local filesystem access',
        scope: 'workspace (recommended for project files)'
      },
      'postgres': {
        docs: 'https://docs.anthropic.com/en/docs/claude-code/mcp',
        github: 'https://github.com/modelcontextprotocol/servers',
        description: 'PostgreSQL database integration',
        scope: 'workspace (recommended for project-specific DB)'
      },
      'brave-search': {
        docs: 'https://docs.anthropic.com/en/docs/claude-code/mcp',
        github: 'https://github.com/modelcontextprotocol/servers',
        description: 'Brave Search API integration',
        scope: 'user (recommended for personal search)'
      }
    };
  }

  findClaudeConfigs(startDir = process.cwd()) {
    const configs = [];
    
    // Always check home directory first for the main Claude config
    const homeConfigPath = path.join(os.homedir(), '.claude.json');
    if (fs.existsSync(homeConfigPath)) {
      try {
        const content = fs.readFileSync(homeConfigPath, 'utf8');
        const config = JSON.parse(content);
        
        // Add global MCP servers
        if (config.mcpServers && Object.keys(config.mcpServers).length > 0) {
          configs.push({
            path: os.homedir(),
            configPath: homeConfigPath,
            config: { mcpServers: config.mcpServers },
            scope: 'user'
          });
        }
        
        // Add all project-specific configs
        if (config.projects) {
          Object.keys(config.projects).forEach(projectPath => {
            const projectConfig = config.projects[projectPath];
            if (projectConfig.mcpServers && Object.keys(projectConfig.mcpServers).length > 0) {
              // Check if path exists or if it's a reasonable project path
              if (fs.existsSync(projectPath) || projectPath.includes('/')) {
                configs.push({
                  path: projectPath,
                  configPath: homeConfigPath,
                  config: { mcpServers: projectConfig.mcpServers },
                  scope: 'workspace'
                });
              }
            }
          });
        }
        
      } catch (error) {
        console.error(`Error reading user config: ${error.message}`);
      }
    }

    // Also check for standalone .claude.json files in current directory and up
    let currentDir = startDir;
    while (currentDir !== path.dirname(currentDir) && currentDir !== os.homedir()) {
      const configPath = path.join(currentDir, '.claude.json');
      
      if (fs.existsSync(configPath)) {
        try {
          const content = fs.readFileSync(configPath, 'utf8');
          const config = JSON.parse(content);
          
          // Check for direct MCP servers in standalone config
          if (config.mcpServers && Object.keys(config.mcpServers).length > 0) {
            configs.push({
              path: currentDir,
              configPath,
              config: { mcpServers: config.mcpServers },
              scope: 'workspace'
            });
          }
          
        } catch (error) {
          console.error(`Error reading config at ${configPath}: ${error.message}`);
        }
      }

      currentDir = path.dirname(currentDir);
    }

    // Remove duplicates and sort by path length (shortest first = highest in hierarchy)
    const uniqueConfigs = configs.filter((config, index, self) => 
      index === self.findIndex(c => c.path === config.path)
    );
    
    return uniqueConfigs.sort((a, b) => a.path.length - b.path.length);
  }

  determineScope(configPath) {
    const home = os.homedir();
    
    if (configPath === home) return 'user';
    if (configPath.startsWith(home)) return 'workspace';
    return 'system';
  }

  getServersFromConfig(config) {
    if (!config.mcpServers) return [];
    
    return Object.keys(config.mcpServers).map(serverName => ({
      name: serverName,
      type: config.mcpServers[serverName].type || 'unknown',
      command: config.mcpServers[serverName].command,
      env: config.mcpServers[serverName].env || {}
    }));
  }

  colorText(text, color) {
    const colors = {
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m',
      white: '\x1b[37m',
      reset: '\x1b[0m',
      bold: '\x1b[1m'
    };
    
    return `${colors[color] || ''}${text}${colors.reset}`;
  }

  getScopeColor(scope) {
    switch (scope) {
      case 'system': return 'blue';
      case 'user': return 'green';
      case 'workspace': return 'yellow';
      default: return 'white';
    }
  }

  displayConfigs() {
    const configs = this.findClaudeConfigs();
    
    if (configs.length === 0) {
      console.log(this.colorText('No .claude.json configurations found', 'yellow'));
      console.log('\nTo create a configuration, run: claude mcp add <server-name>');
      return;
    }

    console.log(this.colorText('MCP Configuration Tree\n', 'bold'));

    configs.forEach((configData, index) => {
      const { path: configPath, config, scope } = configData;
      const servers = this.getServersFromConfig(config);
      const scopeColor = this.getScopeColor(scope);
      
      const prefix = index === configs.length - 1 ? '└── ' : '├── ';
      console.log(`${prefix}${this.colorText(configPath, scopeColor)} ${this.colorText(`(${scope})`, 'cyan')}`);
      
      if (servers.length > 0) {
        servers.forEach((server, serverIndex) => {
          const serverPrefix = index === configs.length - 1 ? '    ' : '│   ';
          const serverBranch = serverIndex === servers.length - 1 ? '└── ' : '├── ';
          
          const envKeys = Object.keys(server.env).length > 0 ? 
            ` [${Object.keys(server.env).join(', ')}]` : '';
          
          console.log(`${serverPrefix}${serverBranch}${this.colorText(server.name, 'white')} ${this.colorText(`(${server.type})`, 'cyan')}${envKeys}`);
        });
      } else {
        const emptyPrefix = index === configs.length - 1 ? '    ' : '│   ';
        console.log(`${emptyPrefix}${this.colorText('(no MCP servers)', 'yellow')}`);
      }
      
      if (index < configs.length - 1) console.log('│');
    });
  }

  findConflicts() {
    const configs = this.findClaudeConfigs();
    const serversByName = new Map();
    const conflicts = [];

    configs.forEach(configData => {
      const servers = this.getServersFromConfig(configData.config);
      
      servers.forEach(server => {
        if (!serversByName.has(server.name)) {
          serversByName.set(server.name, []);
        }
        serversByName.get(server.name).push({
          ...server,
          configPath: configData.path,
          scope: configData.scope
        });
      });
    });

    serversByName.forEach((instances, serverName) => {
      if (instances.length > 1) {
        conflicts.push({
          serverName,
          instances
        });
      }
    });

    return conflicts;
  }

  displayConflicts() {
    const conflicts = this.findConflicts();
    
    if (conflicts.length === 0) {
      console.log(this.colorText('No conflicts detected ✓', 'green'));
      return;
    }

    console.log(this.colorText('Configuration Conflicts Detected\n', 'bold'));

    conflicts.forEach(conflict => {
      console.log(this.colorText(`⚠️  Server "${conflict.serverName}" defined in multiple locations:`, 'red'));
      
      conflict.instances.forEach((instance, index) => {
        const isWinner = index === conflict.instances.length - 1; // Closest to current dir wins
        const status = isWinner ? this.colorText(' (ACTIVE)', 'green') : this.colorText(' (overridden)', 'red');
        const scopeColor = this.getScopeColor(instance.scope);
        
        console.log(`  ${index + 1}. ${this.colorText(instance.configPath, scopeColor)} ${this.colorText(`(${instance.scope})`, 'cyan')}${status}`);
      });
      
      console.log('');
    });

    console.log(this.colorText('Note: Configuration closest to current directory takes precedence', 'yellow'));
  }

  showHelp(serverName) {
    if (!serverName) {
      console.log(this.colorText('MCP-MCP - MCP Configuration Manager\n', 'bold'));
      console.log('Usage:');
      console.log('  npx mcp-mcp              Show all MCP configurations');
      console.log('  npx mcp-mcp scan         Same as default');
      console.log('  npx mcp-mcp conflicts    Show configuration conflicts');
      console.log('  npx mcp-mcp help <server>  Show installation help for server');
      console.log('');
      console.log('Examples:');
      console.log('  npx mcp-mcp help supabase');
      console.log('  npx mcp-mcp help github');
      return;
    }

    const server = this.serverDatabase[serverName.toLowerCase()];
    if (!server) {
      console.log(this.colorText(`Unknown server: ${serverName}`, 'red'));
      console.log('\nAvailable servers:');
      Object.keys(this.serverDatabase).forEach(name => {
        console.log(`  - ${name}`);
      });
      return;
    }

    console.log(this.colorText(`${serverName.charAt(0).toUpperCase() + serverName.slice(1)} MCP Server\n`, 'bold'));
    console.log(`Description: ${server.description}`);
    console.log(`Documentation: ${this.colorText(server.docs, 'cyan')}`);
    console.log(`GitHub: ${this.colorText(server.github, 'cyan')}`);
    console.log('');
    console.log(this.colorText('Installation:', 'bold'));
    console.log(`  ${this.colorText(`claude mcp add ${serverName}`, 'green')}`);
    console.log(`  Recommended scope: ${server.scope}`);
    console.log('');
    console.log(this.colorText('Scope Options:', 'bold'));
    console.log('  workspace - Project-specific (stored in .claude.json in project root)');
    console.log('  user      - User-wide (stored in ~/.claude.json)');
    console.log('  system    - System-wide (requires admin privileges)');
  }

  run() {
    const args = process.argv.slice(2);
    const command = args[0] || 'scan';

    switch (command) {
      case 'scan':
      case 'list':
      default:
        this.displayConfigs();
        break;
        
      case 'conflicts':
        this.displayConflicts();
        break;
        
      case 'help':
        this.showHelp(args[1]);
        break;
        
      case '--version':
      case '-v':
        const packageJson = require('./package.json');
        console.log(packageJson.version);
        break;
    }
  }
}

if (require.main === module) {
  const manager = new MCPManager();
  manager.run();
}

module.exports = MCPManager;