/**
 * Code Plugin - Execute code on the fly
 * Run Python, JavaScript, shell commands with full output
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

const tools = [
    {
        name: 'run_python',
        description: 'Execute Python code and return the output. Use for calculations, data processing, or any Python task.',
        parameters: {
            type: 'object',
            properties: {
                code: { type: 'string', description: 'Python code to execute' },
                timeout: { type: 'number', description: 'Timeout in seconds (default: 30)' }
            },
            required: ['code']
        },
        async execute({ code, timeout = 30 }) {
            const tmpFile = join(tmpdir(), `jarvis_${Date.now()}.py`);

            try {
                await writeFile(tmpFile, code);
                const { stdout, stderr } = await execAsync(`python3 "${tmpFile}"`, {
                    timeout: timeout * 1000,
                    maxBuffer: 10 * 1024 * 1024 // 10MB
                });

                return stdout || stderr || 'Code executed successfully (no output)';
            } catch (error) {
                return `Python Error: ${error.message}\n${error.stderr || ''}`;
            } finally {
                await unlink(tmpFile).catch(() => { });
            }
        }
    },
    {
        name: 'run_javascript',
        description: 'Execute JavaScript/Node.js code and return the output.',
        parameters: {
            type: 'object',
            properties: {
                code: { type: 'string', description: 'JavaScript code to execute' },
                timeout: { type: 'number', description: 'Timeout in seconds (default: 30)' }
            },
            required: ['code']
        },
        async execute({ code, timeout = 30 }) {
            const tmpFile = join(tmpdir(), `jarvis_${Date.now()}.js`);

            try {
                // Wrap code to capture console.log output
                const wrappedCode = `
                    const __logs = [];
                    const originalLog = console.log;
                    console.log = (...args) => __logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '));
                    
                    (async () => {
                        ${code}
                    })().then(() => {
                        if (__logs.length) console.log = originalLog, console.log(__logs.join('\\n'));
                    }).catch(e => console.error(e.message));
                `;

                await writeFile(tmpFile, wrappedCode);
                const { stdout, stderr } = await execAsync(`node "${tmpFile}"`, {
                    timeout: timeout * 1000
                });

                return stdout || stderr || 'Code executed successfully (no output)';
            } catch (error) {
                return `JavaScript Error: ${error.message}`;
            } finally {
                await unlink(tmpFile).catch(() => { });
            }
        }
    },
    {
        name: 'run_shell',
        description: 'Execute a shell command and return the output. Use for system tasks, file operations, etc.',
        parameters: {
            type: 'object',
            properties: {
                command: { type: 'string', description: 'Shell command to execute' },
                cwd: { type: 'string', description: 'Working directory (optional)' },
                timeout: { type: 'number', description: 'Timeout in seconds (default: 60)' }
            },
            required: ['command']
        },
        async execute({ command, cwd, timeout = 60 }) {
            try {
                const options = {
                    timeout: timeout * 1000,
                    maxBuffer: 10 * 1024 * 1024,
                    shell: '/bin/zsh'
                };
                if (cwd) options.cwd = cwd;

                const { stdout, stderr } = await execAsync(command, options);
                return stdout || stderr || 'Command completed (no output)';
            } catch (error) {
                return `Shell Error: ${error.message}\n${error.stderr || ''}`;
            }
        }
    },
    {
        name: 'install_package',
        description: 'Install a Python or npm package',
        parameters: {
            type: 'object',
            properties: {
                package_name: { type: 'string', description: 'Package name to install' },
                type: { type: 'string', description: 'Package type: "python" or "npm"' }
            },
            required: ['package_name', 'type']
        },
        async execute({ package_name, type }) {
            try {
                const cmd = type === 'python'
                    ? `pip3 install ${package_name}`
                    : `npm install ${package_name}`;

                const { stdout, stderr } = await execAsync(cmd, { timeout: 120000 });
                return `Installed ${package_name}\n${stdout || stderr}`;
            } catch (error) {
                return `Install failed: ${error.message}`;
            }
        }
    },

    // ===== FILE OPERATIONS =====
    {
        name: 'read_file',
        description: 'Read the contents of a file',
        parameters: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Path to file' }
            },
            required: ['path']
        },
        async execute({ path }) {
            try {
                const expandedPath = path.replace('~', process.env.HOME);
                const content = await readFile(expandedPath, 'utf-8');
                if (content.length > 10000) {
                    return content.slice(0, 10000) + '\n\n[File truncated...]';
                }
                return content;
            } catch (error) {
                return `Failed to read file: ${error.message}`;
            }
        }
    },
    {
        name: 'write_file',
        description: 'Write content to a file (creates or overwrites)',
        parameters: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Path to file' },
                content: { type: 'string', description: 'Content to write' }
            },
            required: ['path', 'content']
        },
        async execute({ path, content }) {
            try {
                const expandedPath = path.replace('~', process.env.HOME);
                await writeFile(expandedPath, content);
                return `File written: ${path}`;
            } catch (error) {
                return `Failed to write file: ${error.message}`;
            }
        }
    },
    {
        name: 'list_directory',
        description: 'List contents of a directory',
        parameters: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Directory path' },
                detailed: { type: 'boolean', description: 'Show detailed info (size, date)' }
            },
            required: ['path']
        },
        async execute({ path, detailed = false }) {
            try {
                const expandedPath = path.replace('~', process.env.HOME);
                const items = await readdir(expandedPath);

                if (!detailed) {
                    return items.join('\n');
                }

                const details = await Promise.all(items.map(async (item) => {
                    try {
                        const s = await stat(join(expandedPath, item));
                        const type = s.isDirectory() ? '📁' : '📄';
                        const size = s.isDirectory() ? '' : ` (${(s.size / 1024).toFixed(1)}KB)`;
                        return `${type} ${item}${size}`;
                    } catch {
                        return `❓ ${item}`;
                    }
                }));

                return details.join('\n');
            } catch (error) {
                return `Failed to list directory: ${error.message}`;
            }
        }
    },
    {
        name: 'search_files',
        description: 'Search for files by name or content',
        parameters: {
            type: 'object',
            properties: {
                directory: { type: 'string', description: 'Directory to search in' },
                pattern: { type: 'string', description: 'Search pattern (filename or content)' },
                type: { type: 'string', description: '"name" to search filenames, "content" to search inside files' }
            },
            required: ['directory', 'pattern']
        },
        async execute({ directory, pattern, type = 'name' }) {
            try {
                const expandedPath = directory.replace('~', process.env.HOME);

                if (type === 'content') {
                    const { stdout } = await execAsync(
                        `grep -r -l "${pattern}" "${expandedPath}" 2>/dev/null | head -20`,
                        { timeout: 30000 }
                    );
                    return stdout || 'No matches found';
                } else {
                    const { stdout } = await execAsync(
                        `find "${expandedPath}" -name "*${pattern}*" -type f 2>/dev/null | head -20`,
                        { timeout: 30000 }
                    );
                    return stdout || 'No matches found';
                }
            } catch (error) {
                return `Search failed: ${error.message}`;
            }
        }
    }
];

export default { tools };
