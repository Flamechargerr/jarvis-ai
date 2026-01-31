/**
 * J.A.R.V.I.S. Server
 * Express + Socket.IO for real-time streaming
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import cors from 'cors';
import { getJarvis } from '../core/Jarvis.js';
import config from '../jarvis.config.js';

const app = express();
const server = createServer(app);
const io = new SocketIO(server, {
    cors: { origin: '*' }
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', async (req, res) => {
    const jarvis = getJarvis();
    res.json({
        status: jarvis.status,
        version: jarvis.version,
        uptime: process.uptime()
    });
});

// Status endpoint
app.get('/status', async (req, res) => {
    const jarvis = getJarvis();
    res.json(jarvis.getStatus());
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);
    const jarvis = getJarvis();

    // Send current status
    socket.emit('status', jarvis.getStatus());

    // Handle incoming messages
    socket.on('message', async (data) => {
        const { text, context = {} } = data;

        if (!text) {
            socket.emit('error', { message: 'No message provided' });
            return;
        }

        console.log(`📨 Message from ${socket.id}: "${text}"`);

        try {
            // Stream the response
            for await (const chunk of jarvis.process(text, context)) {
                socket.emit('chunk', chunk);
            }
        } catch (error) {
            console.error('Processing error:', error);
            socket.emit('error', { message: error.message });
        }
    });

    // Handle voice audio
    socket.on('audio', async (audioData) => {
        try {
            // Transcribe using Groq Whisper
            const text = await jarvis.gateway.transcribe(audioData);
            socket.emit('transcript', text);

            // Process the transcribed text
            for await (const chunk of jarvis.process(text, { source: 'voice' })) {
                socket.emit('chunk', chunk);
            }
        } catch (error) {
            console.error('Voice processing error:', error);
            socket.emit('error', { message: error.message });
        }
    });

    // Handle context reset
    socket.on('reset', () => {
        jarvis.resetContext();
        socket.emit('status', jarvis.getStatus());
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
    });
});

// Forward Jarvis events to all clients
const jarvis = getJarvis();

jarvis.on('ready', () => io.emit('status', jarvis.getStatus()));
jarvis.on('thinking', () => io.emit('status', { ...jarvis.getStatus(), status: 'thinking' }));
jarvis.on('executing', () => io.emit('status', { ...jarvis.getStatus(), status: 'executing' }));
jarvis.on('speaking', () => io.emit('status', { ...jarvis.getStatus(), status: 'speaking' }));
jarvis.on('complete', () => io.emit('status', jarvis.getStatus()));
jarvis.on('error', (err) => io.emit('error', err));

// Start server
async function start() {
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('    J.A.R.V.I.S. - Advanced AI Assistant   ');
    console.log('═══════════════════════════════════════════');
    console.log('');

    try {
        await jarvis.initialize();

        server.listen(config.server.port, config.server.host, () => {
            console.log(`\n🌐 Server running at http://${config.server.host}:${config.server.port}`);
            console.log('   Press Ctrl+C to shutdown\n');
        });
    } catch (error) {
        console.error('Failed to start Jarvis:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n⏹️  Shutting down...');
    await jarvis.shutdown();
    server.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await jarvis.shutdown();
    server.close();
    process.exit(0);
});

start();
