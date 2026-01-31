/**
 * Jarvis Configuration
 * Central configuration for all Jarvis components
 */

import 'dotenv/config';

export const config = {
  // Server
  server: {
    port: parseInt(process.env.PORT || '3141'),
    host: 'localhost'
  },

  // AI Provider - Groq
  ai: {
    groq: {
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1'
    },
    // Default models
    defaultModel: process.env.DEFAULT_MODEL || 'llama-3.3-70b-versatile',
    fastModel: 'llama-3.1-8b-instant',
    visionModel: 'llama-3.2-90b-vision-preview',
    // Whisper for speech-to-text
    whisperModel: 'whisper-large-v3-turbo'
  },

  // Model routing - which model to use for what
  routing: {
    general: 'llama-3.3-70b-versatile',
    reasoning: 'deepseek-r1-distill-llama-70b',
    coding: 'llama-3.3-70b-versatile',
    vision: 'llama-3.2-90b-vision-preview',
    fast: 'llama-3.1-8b-instant'
  },

  // Voice settings
  voice: {
    sttModel: 'whisper-large-v3-turbo',
    ttsEnabled: true  // Uses browser Web Speech API
  },

  // Wake word
  wakeWord: {
    enabled: !!process.env.PICOVOICE_ACCESS_KEY,
    accessKey: process.env.PICOVOICE_ACCESS_KEY,
    keywords: (process.env.WAKE_WORDS || 'jarvis').split(',').map(w => w.trim()),
    sensitivity: 0.5
  },

  // Memory / Database
  memory: {
    dbPath: './data/jarvis.db',
    maxContextMessages: 20,
    maxMemoryResults: 5
  },

  // Plugins
  plugins: {
    enabled: [
      'system',
      'web',
      'files',
      'vision',
      'code'
    ],
    pluginsDir: './plugins'
  },

  // UI
  ui: {
    theme: 'holographic',
    transparency: 0.9,
    alwaysOnTop: true,
    globalShortcut: 'CommandOrControl+J',
    startMinimized: false
  },

  // Security
  security: {
    allowCodeExecution: true,
    sandboxCode: true,
    allowFileSystem: true,
    allowNetwork: true,
    confirmDestructive: true
  },

  // Debug
  debug: process.env.DEBUG === 'true'
};

export default config;
