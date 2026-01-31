/**
 * J.A.R.V.I.S. UI Application
 */

class JarvisUI {
    constructor() {
        this.socket = null;
        this.serverUrl = 'http://localhost:3141';
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.currentMessage = null;

        this.init();
    }

    async init() {
        // Get config from Electron
        if (window.jarvisAPI) {
            const config = await window.jarvisAPI.getConfig();
            this.serverUrl = config.serverUrl;
        }

        // DOM elements
        this.orb = document.getElementById('orb');
        this.statusText = document.getElementById('status-text');
        this.messages = document.getElementById('messages');
        this.input = document.getElementById('message-input');
        this.sendBtn = document.getElementById('send-btn');
        this.micBtn = document.getElementById('mic-btn');

        // Connect to server
        this.connect();

        // Event listeners
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.micBtn.addEventListener('click', () => this.toggleRecording());

        // Focus input
        this.input.focus();
    }

    connect() {
        this.setStatus('Connecting...');

        this.socket = io(this.serverUrl, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000
        });

        this.socket.on('connect', () => {
            console.log('Connected to Jarvis server');
            this.setStatus('Ready');
        });

        this.socket.on('disconnect', () => {
            this.setStatus('Disconnected');
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.setStatus('Connection failed');
        });

        this.socket.on('status', (data) => {
            this.updateStatus(data.status);
        });

        this.socket.on('chunk', (chunk) => {
            this.handleChunk(chunk);
        });

        this.socket.on('error', (error) => {
            console.error('Server error:', error);
            this.addMessage('Error: ' + error.message, 'assistant');
            this.setStatus('Error');
        });

        this.socket.on('transcript', (text) => {
            this.addMessage(text, 'user');
        });
    }

    setStatus(status) {
        this.statusText.textContent = status;
    }

    updateStatus(status) {
        const statusMap = {
            'ready': 'Ready',
            'thinking': 'Thinking...',
            'executing': 'Executing...',
            'speaking': 'Speaking...',
            'error': 'Error'
        };

        this.setStatus(statusMap[status] || status);

        // Update orb state
        this.orb.classList.remove('thinking', 'listening');
        if (status === 'thinking' || status === 'executing') {
            this.orb.classList.add('thinking');
        }
    }

    sendMessage() {
        const text = this.input.value.trim();
        if (!text) return;

        // Add user message to chat
        this.addMessage(text, 'user');

        // Clear input
        this.input.value = '';

        // Send to server
        this.socket.emit('message', { text });

        // Prepare for response
        this.currentMessage = null;
        this.setStatus('Thinking...');
        this.orb.classList.add('thinking');
    }

    handleChunk(chunk) {
        if (chunk.type === 'content') {
            if (!this.currentMessage) {
                this.currentMessage = this.addMessage('', 'assistant');
            }
            this.currentMessage.textContent += chunk.content;
            this.scrollToBottom();
        }

        if (chunk.type === 'tool_start' || chunk.type === 'tool_result') {
            this.addMessage(chunk.content, 'tool');
        }

        if (chunk.type === 'done') {
            this.currentMessage = null;
            this.setStatus('Ready');
            this.orb.classList.remove('thinking');

            // Speak response if TTS enabled
            if (this.currentMessage) {
                this.speak(this.currentMessage.textContent);
            }
        }
    }

    addMessage(text, type) {
        const msg = document.createElement('div');
        msg.className = `message ${type}`;
        msg.textContent = text;
        this.messages.appendChild(msg);
        this.scrollToBottom();
        return msg;
    }

    scrollToBottom() {
        this.messages.scrollTop = this.messages.scrollHeight;
    }

    async toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (e) => {
                this.audioChunks.push(e.data);
            };

            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                const arrayBuffer = await audioBlob.arrayBuffer();

                // Send to server for transcription
                this.socket.emit('audio', arrayBuffer);
                this.setStatus('Transcribing...');
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            this.micBtn.classList.add('recording');
            this.orb.classList.add('listening');
            this.setStatus('Listening...');

        } catch (error) {
            console.error('Failed to start recording:', error);
            this.setStatus('Microphone error');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            this.isRecording = false;
            this.micBtn.classList.remove('recording');
            this.orb.classList.remove('listening');
        }
    }

    speak(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;

            // Find a good voice
            const voices = speechSynthesis.getVoices();
            const preferredVoice = voices.find(v =>
                v.name.includes('Samantha') ||
                v.name.includes('Daniel') ||
                v.name.includes('Google UK')
            );
            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }

            speechSynthesis.speak(utterance);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.jarvis = new JarvisUI();
});
