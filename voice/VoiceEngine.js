/**
 * Voice Engine - Speech-to-Text using Groq Whisper
 * TTS handled by browser's Web Speech API in the Electron renderer
 */

import { EventEmitter } from 'events';
import { createReadStream, existsSync } from 'fs';
import config from '../jarvis.config.js';

class VoiceEngine extends EventEmitter {
    constructor() {
        super();
        this.isListening = false;
        this.groqClient = null;
    }

    /**
     * Initialize voice engine
     */
    async initialize() {
        // We'll use the AI Gateway's Groq client for Whisper
        // Wake word detection is optional (requires Picovoice)
        console.log('  Voice Engine ready (Whisper STT, Web Speech TTS)');
    }

    /**
     * Set the Groq client for STT
     */
    setGroqClient(client) {
        this.groqClient = client;
    }

    /**
     * Transcribe audio file to text using Groq Whisper
     */
    async transcribe(audioPath) {
        if (!this.groqClient) {
            throw new Error('Groq client not initialized');
        }

        if (!existsSync(audioPath)) {
            throw new Error(`Audio file not found: ${audioPath}`);
        }

        const transcription = await this.groqClient.audio.transcriptions.create({
            file: createReadStream(audioPath),
            model: config.voice.sttModel,
            response_format: 'text'
        });

        return transcription;
    }

    /**
     * Transcribe audio buffer to text
     */
    async transcribeBuffer(audioBuffer, filename = 'audio.wav') {
        if (!this.groqClient) {
            throw new Error('Groq client not initialized');
        }

        // Create a File-like object for Groq
        const file = new File([audioBuffer], filename, { type: 'audio/wav' });

        const transcription = await this.groqClient.audio.transcriptions.create({
            file,
            model: config.voice.sttModel,
            response_format: 'text'
        });

        return transcription;
    }

    /**
     * Start listening (called from Electron renderer via IPC)
     */
    startListening() {
        this.isListening = true;
        this.emit('listening');
    }

    /**
     * Stop listening
     */
    stopListening() {
        this.isListening = false;
        this.emit('stopped');
    }

    /**
     * TTS is handled client-side with Web Speech API
     * This method is a no-op on the server
     */
    async speak(text) {
        // Emit event for UI to handle TTS
        this.emit('speak', text);
    }

    /**
     * Shutdown
     */
    async shutdown() {
        this.isListening = false;
    }
}

export { VoiceEngine };
export default VoiceEngine;
