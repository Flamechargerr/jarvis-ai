/**
 * Files Plugin - Advanced file management
 */

import { readFile, writeFile, unlink, rename, copyFile, mkdir, stat, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const tools = [
    {
        name: 'create_folder',
        description: 'Create a new folder/directory',
        parameters: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Path for new folder' }
            },
            required: ['path']
        },
        async execute({ path }) {
            const expandedPath = path.replace('~', process.env.HOME);
            await mkdir(expandedPath, { recursive: true });
            return `Created folder: ${path}`;
        }
    },
    {
        name: 'move_file',
        description: 'Move a file or folder to a new location',
        parameters: {
            type: 'object',
            properties: {
                source: { type: 'string', description: 'Source path' },
                destination: { type: 'string', description: 'Destination path' }
            },
            required: ['source', 'destination']
        },
        async execute({ source, destination }) {
            const src = source.replace('~', process.env.HOME);
            const dst = destination.replace('~', process.env.HOME);
            await rename(src, dst);
            return `Moved ${source} to ${destination}`;
        }
    },
    {
        name: 'copy_file',
        description: 'Copy a file to a new location',
        parameters: {
            type: 'object',
            properties: {
                source: { type: 'string', description: 'Source file path' },
                destination: { type: 'string', description: 'Destination path' }
            },
            required: ['source', 'destination']
        },
        async execute({ source, destination }) {
            const src = source.replace('~', process.env.HOME);
            const dst = destination.replace('~', process.env.HOME);
            await copyFile(src, dst);
            return `Copied ${source} to ${destination}`;
        }
    },
    {
        name: 'delete_file',
        description: 'Delete a file (DANGEROUS - use with caution)',
        parameters: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Path to file to delete' },
                confirm: { type: 'boolean', description: 'Must be true to confirm deletion' }
            },
            required: ['path', 'confirm']
        },
        async execute({ path, confirm }) {
            if (!confirm) {
                return 'Deletion cancelled - confirm must be true';
            }
            const expandedPath = path.replace('~', process.env.HOME);
            await unlink(expandedPath);
            return `Deleted: ${path}`;
        }
    },
    {
        name: 'get_file_info',
        description: 'Get detailed information about a file',
        parameters: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Path to file' }
            },
            required: ['path']
        },
        async execute({ path }) {
            const expandedPath = path.replace('~', process.env.HOME);
            const s = await stat(expandedPath);

            return `**File:** ${basename(path)}
**Type:** ${s.isDirectory() ? 'Directory' : 'File'}
**Size:** ${(s.size / 1024).toFixed(2)} KB
**Created:** ${s.birthtime.toLocaleString()}
**Modified:** ${s.mtime.toLocaleString()}
**Extension:** ${extname(path) || 'None'}`;
        }
    },
    {
        name: 'find_large_files',
        description: 'Find the largest files in a directory',
        parameters: {
            type: 'object',
            properties: {
                directory: { type: 'string', description: 'Directory to search' },
                limit: { type: 'number', description: 'Number of files to return (default: 10)' }
            },
            required: ['directory']
        },
        async execute({ directory, limit = 10 }) {
            const expandedPath = directory.replace('~', process.env.HOME);
            const { stdout } = await execAsync(
                `find "${expandedPath}" -type f -exec du -h {} + 2>/dev/null | sort -rh | head -${limit}`
            );
            return stdout || 'No files found';
        }
    },
    {
        name: 'compress_files',
        description: 'Create a zip archive of files or folders',
        parameters: {
            type: 'object',
            properties: {
                source: { type: 'string', description: 'File or folder to compress' },
                output: { type: 'string', description: 'Output zip file path' }
            },
            required: ['source', 'output']
        },
        async execute({ source, output }) {
            const src = source.replace('~', process.env.HOME);
            const out = output.replace('~', process.env.HOME);
            const { stdout } = await execAsync(`zip -r "${out}" "${src}"`);
            return `Created archive: ${output}`;
        }
    },
    {
        name: 'extract_archive',
        description: 'Extract a zip or tar archive',
        parameters: {
            type: 'object',
            properties: {
                archive: { type: 'string', description: 'Archive file path' },
                destination: { type: 'string', description: 'Destination folder' }
            },
            required: ['archive', 'destination']
        },
        async execute({ archive, destination }) {
            const src = archive.replace('~', process.env.HOME);
            const dst = destination.replace('~', process.env.HOME);

            const ext = extname(src).toLowerCase();
            let cmd;

            if (ext === '.zip') {
                cmd = `unzip "${src}" -d "${dst}"`;
            } else if (ext === '.tar' || src.endsWith('.tar.gz') || src.endsWith('.tgz')) {
                cmd = `tar -xf "${src}" -C "${dst}"`;
            } else {
                return 'Unsupported archive format';
            }

            await mkdir(dst, { recursive: true });
            await execAsync(cmd);
            return `Extracted to: ${destination}`;
        }
    }
];

export default { tools };
