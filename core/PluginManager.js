/**
 * Plugin Manager - Dynamic plugin loading and tool registration
 */

import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import config from '../jarvis.config.js';

class PluginManager {
    constructor() {
        this.plugins = new Map();
        this.tools = new Map();
        this.count = 0;
    }

    /**
     * Initialize and load all enabled plugins
     */
    async initialize() {
        const pluginsDir = config.plugins.pluginsDir;

        // Ensure plugins directory exists
        if (!existsSync(pluginsDir)) {
            console.log('  No plugins directory found, using built-in tools only');
            this.registerBuiltInTools();
            return;
        }

        // Load enabled plugins
        for (const pluginName of config.plugins.enabled) {
            const pluginPath = join(process.cwd(), pluginsDir, pluginName, 'index.js');

            if (existsSync(pluginPath)) {
                try {
                    const plugin = await import(pluginPath);
                    await this.register(pluginName, plugin.default || plugin);
                } catch (error) {
                    console.error(`  Failed to load plugin ${pluginName}:`, error.message);
                }
            }
        }

        // Always register built-in tools
        this.registerBuiltInTools();
    }

    /**
     * Register a plugin
     */
    async register(name, plugin) {
        this.plugins.set(name, plugin);

        // Register plugin's tools
        if (plugin.tools) {
            for (const tool of plugin.tools) {
                this.tools.set(tool.name, {
                    definition: tool,
                    execute: tool.execute,
                    plugin: name
                });
            }
        }

        this.count++;
        console.log(`  Loaded plugin: ${name}`);
    }

    /**
     * Register built-in tools that don't require external plugins
     */
    registerBuiltInTools() {
        // Current time
        this.tools.set('get_current_time', {
            definition: {
                name: 'get_current_time',
                description: 'Get the current date and time',
                parameters: { type: 'object', properties: {} }
            },
            execute: async () => {
                return new Date().toLocaleString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZoneName: 'short'
                });
            }
        });

        // Calculator
        this.tools.set('calculate', {
            definition: {
                name: 'calculate',
                description: 'Perform a mathematical calculation',
                parameters: {
                    type: 'object',
                    properties: {
                        expression: {
                            type: 'string',
                            description: 'The math expression to evaluate (e.g., "2 + 2 * 3")'
                        }
                    },
                    required: ['expression']
                }
            },
            execute: async ({ expression }) => {
                try {
                    // Safe eval for math only
                    const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, '');
                    const result = Function(`"use strict"; return (${sanitized})`)();
                    return `${expression} = ${result}`;
                } catch (error) {
                    return `Error: Could not evaluate "${expression}"`;
                }
            }
        });

        // Open app (macOS)
        this.tools.set('open_app', {
            definition: {
                name: 'open_app',
                description: 'Open an application on the user\'s Mac',
                parameters: {
                    type: 'object',
                    properties: {
                        app_name: {
                            type: 'string',
                            description: 'Name of the app to open (e.g., "Safari", "Notes", "Calendar")'
                        }
                    },
                    required: ['app_name']
                }
            },
            execute: async ({ app_name }) => {
                const { exec } = await import('child_process');
                return new Promise((resolve) => {
                    exec(`open -a "${app_name}"`, (error) => {
                        if (error) {
                            resolve(`Could not open ${app_name}: ${error.message}`);
                        } else {
                            resolve(`Opened ${app_name}`);
                        }
                    });
                });
            }
        });

        // Run shell command
        this.tools.set('run_command', {
            definition: {
                name: 'run_command',
                description: 'Run a shell command and return the output. Use for system tasks.',
                parameters: {
                    type: 'object',
                    properties: {
                        command: {
                            type: 'string',
                            description: 'The shell command to run'
                        }
                    },
                    required: ['command']
                }
            },
            execute: async ({ command }) => {
                const { exec } = await import('child_process');
                return new Promise((resolve) => {
                    exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
                        if (error) {
                            resolve(`Error: ${error.message}`);
                        } else {
                            resolve(stdout || stderr || 'Command completed');
                        }
                    });
                });
            }
        });

        // Web search
        this.tools.set('web_search', {
            definition: {
                name: 'web_search',
                description: 'Search the web for information',
                parameters: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Search query'
                        }
                    },
                    required: ['query']
                }
            },
            execute: async ({ query }) => {
                const { exec } = await import('child_process');
                const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
                return new Promise((resolve) => {
                    exec(`open "${url}"`, (error) => {
                        resolve(error ? `Search failed: ${error.message}` : `Searching for: ${query}`);
                    });
                });
            }
        });

        console.log(`  Registered ${this.tools.size} built-in tools`);
    }

    /**
     * Get tool definitions for AI
     */
    getToolDefinitions() {
        return Array.from(this.tools.values()).map(t => t.definition);
    }

    /**
     * Execute a tool by name
     */
    async execute(toolName, args) {
        const tool = this.tools.get(toolName);

        if (!tool) {
            throw new Error(`Unknown tool: ${toolName}`);
        }

        console.log(`  🔧 Executing tool: ${toolName}`);

        try {
            const result = await tool.execute(args);
            return result;
        } catch (error) {
            console.error(`  Tool ${toolName} failed:`, error);
            throw error;
        }
    }

    /**
     * Get capability summary for system prompt
     */
    getCapabilitySummary() {
        const capabilities = [];

        for (const [name, tool] of this.tools) {
            capabilities.push(`- ${name}: ${tool.definition.description}`);
        }

        return capabilities.join('\n');
    }

    /**
     * Unload all plugins
     */
    async unloadAll() {
        this.plugins.clear();
        this.tools.clear();
        this.count = 0;
    }
}

export { PluginManager };
export default PluginManager;
