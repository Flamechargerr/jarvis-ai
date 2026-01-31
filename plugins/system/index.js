/**
 * System Plugin - Full macOS control via AppleScript
 * Control your entire system like Tony Stark
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Execute AppleScript
 */
async function runAppleScript(script) {
    try {
        const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`);
        return stdout.trim() || 'Done';
    } catch (error) {
        throw new Error(`AppleScript failed: ${error.message}`);
    }
}

const tools = [
    // ===== APPLICATION CONTROL =====
    {
        name: 'open_application',
        description: 'Open any application on macOS',
        parameters: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Application name (e.g., Safari, Notes, Terminal, Spotify)' }
            },
            required: ['name']
        },
        async execute({ name }) {
            return await runAppleScript(`tell application "${name}" to activate`);
        }
    },
    {
        name: 'quit_application',
        description: 'Quit/close an application',
        parameters: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Application name to quit' }
            },
            required: ['name']
        },
        async execute({ name }) {
            return await runAppleScript(`tell application "${name}" to quit`);
        }
    },
    {
        name: 'list_running_apps',
        description: 'Get a list of all currently running applications',
        parameters: { type: 'object', properties: {} },
        async execute() {
            const script = 'tell application "System Events" to get name of every process whose background only is false';
            return await runAppleScript(script);
        }
    },

    // ===== SYSTEM CONTROL =====
    {
        name: 'set_volume',
        description: 'Set the system volume (0-100)',
        parameters: {
            type: 'object',
            properties: {
                level: { type: 'number', description: 'Volume level from 0 to 100' }
            },
            required: ['level']
        },
        async execute({ level }) {
            const volume = Math.max(0, Math.min(100, level));
            return await runAppleScript(`set volume output volume ${volume}`);
        }
    },
    {
        name: 'mute_unmute',
        description: 'Mute or unmute system audio',
        parameters: {
            type: 'object',
            properties: {
                mute: { type: 'boolean', description: 'true to mute, false to unmute' }
            },
            required: ['mute']
        },
        async execute({ mute }) {
            return await runAppleScript(`set volume ${mute ? 'with' : 'without'} output muted`);
        }
    },
    {
        name: 'set_brightness',
        description: 'Set screen brightness (0-100)',
        parameters: {
            type: 'object',
            properties: {
                level: { type: 'number', description: 'Brightness level from 0 to 100' }
            },
            required: ['level']
        },
        async execute({ level }) {
            const brightness = Math.max(0, Math.min(100, level)) / 100;
            const { stdout } = await execAsync(`brightness ${brightness} 2>/dev/null || echo "Brightness utility not installed"`);
            return stdout || `Brightness set to ${level}%`;
        }
    },
    {
        name: 'toggle_dark_mode',
        description: 'Toggle macOS dark mode on or off',
        parameters: {
            type: 'object',
            properties: {
                dark: { type: 'boolean', description: 'true for dark mode, false for light mode' }
            },
            required: ['dark']
        },
        async execute({ dark }) {
            const script = `tell application "System Events" to tell appearance preferences to set dark mode to ${dark}`;
            return await runAppleScript(script);
        }
    },
    {
        name: 'lock_screen',
        description: 'Lock the screen immediately',
        parameters: { type: 'object', properties: {} },
        async execute() {
            await execAsync('pmset displaysleepnow');
            return 'Screen locked';
        }
    },
    {
        name: 'sleep_computer',
        description: 'Put the computer to sleep',
        parameters: { type: 'object', properties: {} },
        async execute() {
            await runAppleScript('tell application "System Events" to sleep');
            return 'Computer going to sleep';
        }
    },

    // ===== NOTIFICATIONS & DIALOGS =====
    {
        name: 'show_notification',
        description: 'Display a macOS notification',
        parameters: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'Notification title' },
                message: { type: 'string', description: 'Notification message' }
            },
            required: ['title', 'message']
        },
        async execute({ title, message }) {
            return await runAppleScript(
                `display notification "${message}" with title "${title}" sound name "Glass"`
            );
        }
    },
    {
        name: 'speak_text',
        description: 'Have the computer speak text aloud using system TTS',
        parameters: {
            type: 'object',
            properties: {
                text: { type: 'string', description: 'Text to speak' },
                voice: { type: 'string', description: 'Voice name (optional, e.g., "Samantha", "Daniel")' }
            },
            required: ['text']
        },
        async execute({ text, voice }) {
            const voiceArg = voice ? `using "${voice}"` : '';
            return await runAppleScript(`say "${text}" ${voiceArg}`);
        }
    },

    // ===== BROWSER CONTROL =====
    {
        name: 'open_url',
        description: 'Open a URL in the default browser',
        parameters: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'URL to open' }
            },
            required: ['url']
        },
        async execute({ url }) {
            await execAsync(`open "${url}"`);
            return `Opened ${url}`;
        }
    },
    {
        name: 'get_browser_url',
        description: 'Get the current URL from Safari or Chrome',
        parameters: {
            type: 'object',
            properties: {
                browser: { type: 'string', description: 'Browser to get URL from (Safari or Google Chrome)' }
            }
        },
        async execute({ browser = 'Safari' }) {
            const script = browser === 'Safari'
                ? 'tell application "Safari" to get URL of current tab of window 1'
                : 'tell application "Google Chrome" to get URL of active tab of window 1';
            return await runAppleScript(script);
        }
    },

    // ===== MEDIA CONTROL =====
    {
        name: 'media_control',
        description: 'Control media playback (play, pause, next, previous)',
        parameters: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    description: 'Action: play, pause, next, previous, volume_up, volume_down'
                }
            },
            required: ['action']
        },
        async execute({ action }) {
            const keyMap = {
                'play': 'space',
                'pause': 'space',
                'next': 'right arrow',
                'previous': 'left arrow'
            };

            if (action === 'volume_up' || action === 'volume_down') {
                const key = action === 'volume_up' ? 'volume up' : 'volume down';
                return await runAppleScript(`tell application "System Events" to key code ${action === 'volume_up' ? 72 : 73}`);
            }

            // Use system media keys
            await execAsync(`osascript -e 'tell application "System Events" to keystroke "${keyMap[action]}"' 2>/dev/null`);
            return `Media: ${action}`;
        }
    },

    // ===== FINDER & FILES =====
    {
        name: 'open_folder',
        description: 'Open a folder in Finder',
        parameters: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Path to folder (e.g., ~/Downloads, /Applications)' }
            },
            required: ['path']
        },
        async execute({ path }) {
            const expandedPath = path.replace('~', process.env.HOME);
            await execAsync(`open "${expandedPath}"`);
            return `Opened ${path}`;
        }
    },
    {
        name: 'empty_trash',
        description: 'Empty the Trash',
        parameters: { type: 'object', properties: {} },
        async execute() {
            return await runAppleScript('tell application "Finder" to empty the trash');
        }
    },

    // ===== SYSTEM INFO =====
    {
        name: 'get_system_info',
        description: 'Get current system status: battery, memory, disk space, uptime',
        parameters: { type: 'object', properties: {} },
        async execute() {
            const [battery, uptime, disk] = await Promise.all([
                execAsync('pmset -g batt 2>/dev/null || echo "N/A"').then(r => r.stdout.trim()),
                execAsync('uptime').then(r => r.stdout.trim()),
                execAsync('df -h / | tail -1').then(r => r.stdout.trim())
            ]);

            return `**Battery:** ${battery}\n**Uptime:** ${uptime}\n**Disk:** ${disk}`;
        }
    },
    {
        name: 'get_wifi_network',
        description: 'Get the name of the connected WiFi network',
        parameters: { type: 'object', properties: {} },
        async execute() {
            const { stdout } = await execAsync(
                '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I | grep " SSID" | cut -d: -f2'
            );
            return `Connected to: ${stdout.trim() || 'Not connected'}`;
        }
    }
];

export default { tools };
