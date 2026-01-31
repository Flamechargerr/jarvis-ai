<p align="center">
  <img src="https://img.shields.io/badge/J.A.R.V.I.S.-v2.0-00d4ff?style=for-the-badge&logo=robot&logoColor=white" alt="JARVIS v2.0"/>
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/Groq-API-orange?style=for-the-badge" alt="Groq"/>
  <img src="https://img.shields.io/badge/Electron-Desktop-47848F?style=for-the-badge&logo=electron&logoColor=white" alt="Electron"/>
</p>

<h1 align="center">🤖 J.A.R.V.I.S.</h1>
<h3 align="center">Just A Rather Very Intelligent System</h3>
<p align="center"><i>A real-life AI assistant inspired by Iron Man's JARVIS</i></p>

---

## 🎯 What Is This?

**JARVIS** is a fully functional AI assistant that can:
- 👁️ **See your screen** and understand what's on it
- 🖥️ **Control your Mac** - open apps, adjust volume, toggle dark mode
- 🌐 **Browse the web** autonomously and research topics
- 💻 **Execute code** in Python, JavaScript, or shell
- 📁 **Manage files** - create, move, copy, compress
- 🗣️ **Talk to you** with voice input and output

Built with **Groq** for lightning-fast AI responses (Llama 3.3 70B) and **Electron** for a beautiful holographic desktop interface.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- macOS (for full system control)
- [Groq API Key](https://console.groq.com) (free)

### Installation

```bash
# Clone the repository
git clone https://github.com/Flamechargerr/jarvis-ai.git
cd jarvis-ai

# Install dependencies
npm install

# Add your Groq API key
cp .env.example .env
# Edit .env and add your GROQ_API_KEY

# Launch JARVIS
npm run jarvis
```

This starts both the server and opens the holographic Electron UI.

---

## 🧠 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    J.A.R.V.I.S. v2.0                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │   Electron   │◄──►│    Server    │◄──►│  AI Gateway  │   │
│  │  (Holo UI)   │    │  (Socket.IO) │    │    (Groq)    │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│         │                   │                    │          │
│         ▼                   ▼                    ▼          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │    Voice     │    │   Plugins    │    │    Memory    │   │
│  │   Engine     │    │  (46 Tools)  │    │   (JSON DB)  │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│                             │                               │
│         ┌───────────────────┼───────────────────┐          │
│         ▼                   ▼                   ▼          │
│   ┌──────────┐       ┌──────────┐       ┌──────────┐       │
│   │  Vision  │       │  System  │       │   Web    │       │
│   │ (Screen) │       │(macOS)   │       │(Browser) │       │
│   └──────────┘       └──────────┘       └──────────┘       │
│         │                   │                   │          │
│         ▼                   ▼                   ▼          │
│   ┌──────────┐       ┌──────────┐                          │
│   │   Code   │       │  Files   │                          │
│   │(Execute) │       │ (Manage) │                          │
│   └──────────┘       └──────────┘                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ All 46 Tools

### 👁️ Vision Plugin
| Tool | Description |
|------|-------------|
| `take_screenshot` | Capture screen and analyze with AI |
| `read_screen_text` | OCR - extract all visible text |

### 🖥️ System Plugin (AppleScript)
| Tool | Description |
|------|-------------|
| `open_application` | Open any macOS application |
| `quit_application` | Close an application |
| `list_running_apps` | Get all running apps |
| `set_volume` | Set volume (0-100) |
| `mute_unmute` | Toggle mute |
| `set_brightness` | Adjust screen brightness |
| `toggle_dark_mode` | Switch dark/light mode |
| `lock_screen` | Lock the screen |
| `sleep_computer` | Put Mac to sleep |
| `show_notification` | Display macOS notification |
| `speak_text` | Text-to-speech |
| `open_url` | Open URL in browser |
| `get_browser_url` | Get current browser URL |
| `media_control` | Play/Pause/Next/Previous |
| `open_folder` | Open folder in Finder |
| `empty_trash` | Empty the Trash |
| `get_system_info` | Battery, disk, uptime |
| `get_wifi_network` | Current WiFi network |

### 🌐 Web Plugin (Puppeteer)
| Tool | Description |
|------|-------------|
| `web_search` | Search Google, return results |
| `browse_webpage` | Visit URL, extract content |
| `fill_form` | Fill web form fields |
| `click_element` | Click webpage elements |
| `screenshot_webpage` | Screenshot a website |
| `research_topic` | Deep multi-source research |

### 💻 Code Plugin
| Tool | Description |
|------|-------------|
| `run_python` | Execute Python code |
| `run_javascript` | Execute Node.js code |
| `run_shell` | Run shell commands |
| `install_package` | pip/npm install |
| `read_file` | Read file contents |
| `write_file` | Write/create files |
| `list_directory` | List folder contents |
| `search_files` | Find files by name/content |

### 📁 Files Plugin
| Tool | Description |
|------|-------------|
| `create_folder` | Create directories |
| `move_file` | Move files/folders |
| `copy_file` | Copy files |
| `delete_file` | Delete (with confirmation) |
| `get_file_info` | File metadata |
| `find_large_files` | Find biggest files |
| `compress_files` | Create zip archives |
| `extract_archive` | Extract zip/tar |

---

## 💬 Example Commands

```
"Take a screenshot and tell me what you see"
→ Captures screen, analyzes with Llama Vision

"Open Spotify and set volume to 50%"
→ Launches Spotify, adjusts system volume

"Search the web for latest AI breakthroughs"
→ Googles, extracts results, summarizes

"Research quantum computing deeply"
→ Visits 5+ sources, synthesizes information

"Run this Python: print(sum(range(1000)))"
→ Executes code, returns: 499500

"Find large files in my Downloads folder"
→ Lists biggest files with sizes

"Turn on dark mode and lock the screen"
→ Toggles appearance, locks Mac
```

---

## 📁 Project Structure

```
jarvis-ai/
├── core/
│   ├── Jarvis.js          # Main orchestrator
│   ├── AIGateway.js       # Groq API integration
│   ├── SemanticMemory.js  # Conversation storage
│   ├── PluginManager.js   # Tool loading & execution
│   └── TaskPlanner.js     # Agentic task execution
├── plugins/
│   ├── vision/            # Screen capture & analysis
│   ├── system/            # macOS AppleScript control
│   ├── web/               # Puppeteer web browsing
│   ├── code/              # Python/JS/shell execution
│   └── files/             # File management
├── server/
│   └── index.js           # Express + Socket.IO
├── voice/
│   └── VoiceEngine.js     # Whisper STT
├── ui/
│   ├── electron/          # Desktop app
│   │   ├── main.js        # Electron main process
│   │   └── preload.js     # Context bridge
│   └── renderer/          # Holographic UI
│       ├── index.html
│       ├── styles.css     # Glassmorphism CSS
│       └── app.js         # Socket.IO client
├── jarvis.config.js       # Configuration
├── .env                   # API keys (not committed)
└── package.json
```

---

## 🔧 How It Works

### 1. AI Gateway (Groq)
The system uses Groq's ultra-fast inference API with:
- **Llama 3.3 70B** - Main reasoning model
- **Llama 3.2 90B Vision** - Screen analysis
- **DeepSeek R1 Distill** - Complex reasoning
- **Whisper Large v3** - Speech-to-text

### 2. Agentic Task Planner
When you give JARVIS a complex task, it:
1. Analyzes your request
2. Breaks it into steps
3. Selects appropriate tools
4. Executes iteratively
5. Reports results in real-time

### 3. Plugin System
Each plugin exports tools with:
- `name` - Tool identifier
- `description` - What it does (for AI)
- `parameters` - JSON schema
- `execute` - Async function

### 4. Real-Time Streaming
Responses stream via Socket.IO for instant feedback. No waiting for full responses.

---

## 🎨 UI Features

- **Holographic Design** - Glassmorphism with cyan glow
- **Animated Orb** - Pulses when thinking
- **Dark Theme** - Easy on the eyes
- **Global Shortcut** - `Cmd+J` to toggle
- **Voice Input** - Click mic or speak
- **Streaming** - See responses as they generate

---

## ⚙️ Configuration

Edit `jarvis.config.js` to customize:

```javascript
export const config = {
  server: { port: 3141 },
  ai: {
    defaultModel: 'llama-3.3-70b-versatile',
    visionModel: 'llama-3.2-90b-vision-preview'
  },
  routing: {
    general: 'llama-3.3-70b-versatile',
    reasoning: 'deepseek-r1-distill-llama-70b',
    fast: 'llama-3.1-8b-instant'
  },
  ui: {
    theme: 'holographic',
    globalShortcut: 'CommandOrControl+J'
  }
};
```

---

## 🚧 Future Enhancements

- [ ] Calendar integration (Google Calendar, Apple Calendar)
- [ ] Email management (read, compose, send)
- [ ] Smart home control (HomeKit, Home Assistant)
- [ ] Image generation (Stable Diffusion)
- [ ] Proactive suggestions
- [ ] Learning from user patterns
- [ ] Multi-monitor support
- [ ] Custom wake words

---

## 🤝 Contributing

Contributions welcome! Areas of interest:
1. New plugins (home automation, productivity)
2. UI improvements
3. Performance optimizations
4. Cross-platform support (Windows, Linux)

---

## 📜 License

MIT License - Use freely, build something amazing.

---

## 🙏 Credits

- **Groq** - Lightning-fast LLM inference
- **Llama 3.3** - Meta's powerful open model
- **Electron** - Desktop app framework
- **Puppeteer** - Web automation
- **AppleScript** - macOS automation

---

<p align="center">
  <b>Built with ❤️ by <a href="https://github.com/Flamechargerr">@Flamechargerr</a></b>
</p>

<p align="center">
  <i>"Sometimes you gotta run before you can walk." - Tony Stark</i>
</p>
