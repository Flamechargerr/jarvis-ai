/**
 * J.A.R.V.I.S. - Just A Rather Very Intelligent System
 * Main Jarvis Class - The heart of the system
 */

import { EventEmitter } from 'events';
import { AIGateway } from './AIGateway.js';
import { PluginManager } from './PluginManager.js';
import { SemanticMemory } from './SemanticMemory.js';
import { TaskPlanner } from './TaskPlanner.js';
import { VoiceEngine } from '../voice/VoiceEngine.js';
import config from '../jarvis.config.js';

class Jarvis extends EventEmitter {
    constructor() {
        super();
        this.name = 'JARVIS';
        this.version = '1.0.0';
        this.status = 'initializing';
        this.currentContext = [];

        // Core components
        this.gateway = null;
        this.plugins = null;
        this.memory = null;
        this.planner = null;
        this.voice = null;

        // Session tracking
        this.sessionId = this.generateSessionId();
        this.messageCount = 0;
    }

    /**
     * Initialize all Jarvis components
     */
    async initialize() {
        console.log('🤖 Initializing J.A.R.V.I.S...');

        try {
            // Initialize AI Gateway (Groq)
            this.gateway = new AIGateway();
            await this.gateway.initialize();
            console.log('  ✓ AI Gateway ready (Groq)');

            // Initialize Memory
            this.memory = new SemanticMemory();
            await this.memory.initialize();
            console.log('  ✓ Semantic Memory ready');

            // Initialize Plugin Manager
            this.plugins = new PluginManager();
            await this.plugins.initialize();
            console.log(`  ✓ Plugins loaded (${this.plugins.tools.size} tools)`);

            // Initialize Task Planner
            this.planner = new TaskPlanner(this.gateway, this.plugins);
            console.log('  ✓ Task Planner ready');

            // Initialize Voice Engine
            this.voice = new VoiceEngine();
            await this.voice.initialize();
            this.voice.setGroqClient(this.gateway.client);
            console.log('  ✓ Voice Engine ready');

            this.status = 'ready';
            console.log('\n🎯 J.A.R.V.I.S. is online and ready to assist.\n');

            this.emit('ready');
            return true;
        } catch (error) {
            this.status = 'error';
            console.error('Failed to initialize Jarvis:', error);
            throw error;
        }
    }

    /**
     * Main processing pipeline
     * @param {string} input - User input text
     * @param {object} context - Additional context (source, attachments, etc.)
     * @returns {AsyncGenerator} Streaming response
     */
    async *process(input, context = {}) {
        this.messageCount++;
        const startTime = Date.now();

        this.status = 'thinking';
        this.emit('thinking', { input });

        try {
            // 1. Add to context
            this.currentContext.push({
                role: 'user',
                content: input,
                timestamp: new Date().toISOString()
            });

            // 2. Retrieve relevant memories
            const memories = await this.memory.recall(input);

            // 3. Build the full context for AI
            const fullContext = this.buildContext(input, memories, context);

            // 4. Determine if this needs tools/plugins
            const needsTools = this.shouldUseTools(input);

            // 5. Process based on complexity
            let response = '';

            if (needsTools) {
                // Use task planner for complex requests
                this.status = 'executing';
                this.emit('executing');

                for await (const chunk of this.planner.execute(fullContext)) {
                    response += chunk.content || '';
                    yield chunk;
                }
            } else {
                // Direct AI response for simple queries
                for await (const chunk of this.gateway.stream(fullContext)) {
                    response += chunk.content || '';
                    yield chunk;
                }
            }

            // 6. Update context with response
            this.currentContext.push({
                role: 'assistant',
                content: response,
                timestamp: new Date().toISOString()
            });

            // 7. Store in memory
            await this.memory.store({
                input,
                response,
                context: context,
                sessionId: this.sessionId
            });

            // 8. Emit speak event for TTS
            if (context.source === 'voice' && this.voice) {
                this.status = 'speaking';
                this.emit('speaking', { text: response });
            }

            const duration = Date.now() - startTime;
            console.log(`⚡ Response completed in ${duration}ms`);

            this.status = 'ready';
            this.emit('complete', { duration, response });

        } catch (error) {
            console.error('Processing error:', error);
            this.status = 'error';
            this.emit('error', { type: 'processing', error });
            yield { type: 'error', content: `I encountered an error: ${error.message}` };
        }
    }

    /**
     * Non-streaming process for simple responses
     */
    async processSync(input, context = {}) {
        let fullResponse = '';
        for await (const chunk of this.process(input, context)) {
            if (chunk.content) {
                fullResponse += chunk.content;
            }
        }
        return fullResponse;
    }

    /**
     * Build context for AI with system prompt, memories, and history
     */
    buildContext(input, memories, context) {
        const systemPrompt = this.getSystemPrompt();

        const messages = [
            { role: 'system', content: systemPrompt }
        ];

        // Add relevant memories
        if (memories.length > 0) {
            const memoryContext = memories
                .map(m => `[Memory] ${m.content}`)
                .join('\n');
            messages.push({
                role: 'system',
                content: `Relevant context from previous interactions:\n${memoryContext}`
            });
        }

        // Add recent conversation history
        const recentHistory = this.currentContext.slice(-config.memory.maxContextMessages);
        messages.push(...recentHistory);

        // Add current input if not already in history
        if (messages[messages.length - 1]?.content !== input) {
            messages.push({ role: 'user', content: input });
        }

        // Add any attachments (images, files)
        if (context.attachments) {
            messages[messages.length - 1].attachments = context.attachments;
        }

        return {
            messages,
            tools: this.plugins.getToolDefinitions(),
            context
        };
    }

    /**
     * System prompt defining Jarvis personality and capabilities
     */
    getSystemPrompt() {
        const capabilities = this.plugins.getCapabilitySummary();

        return `You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), an advanced AI assistant.

PERSONALITY:
- Professional yet personable, with subtle wit
- Proactive - anticipate needs and offer solutions
- Precise and efficient in responses
- Loyal and focused on the user's best interests
- Speak naturally, not robotically

CAPABILITIES:
${capabilities}

GUIDELINES:
1. For simple questions, respond directly and concisely
2. For tasks requiring action, use the available tools
3. Always explain what you're doing when executing tasks
4. If unsure, ask for clarification
5. Prioritize user safety and data security
6. When multiple steps are needed, execute them in sequence
7. Report results clearly and summarize actions taken

RESPONSE STYLE:
- Use natural conversational language
- Be concise but complete
- Format code with proper syntax highlighting
- Use bullet points for lists
- Acknowledge the user's intent before acting

Current date and time: ${new Date().toLocaleString()}
User's system: macOS`;
    }

    /**
     * Determine if input requires tool usage
     */
    shouldUseTools(input) {
        const toolTriggers = [
            /open|launch|start|run|execute/i,
            /search|find|look up|google/i,
            /read|write|create|delete|move|copy/i,
            /turn on|turn off|set|adjust|control/i,
            /play|pause|stop|next|previous/i,
            /send|email|message|call/i,
            /schedule|remind|calendar|event/i,
            /screenshot|capture|screen/i,
            /generate|create image|draw/i,
            /what's on my screen|what do you see/i,
            /install|download|update/i,
            /calculate|math|compute/i,
            /what time|current time|date today/i
        ];

        return toolTriggers.some(pattern => pattern.test(input));
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            name: this.name,
            version: this.version,
            status: this.status,
            sessionId: this.sessionId,
            messageCount: this.messageCount,
            tools: this.plugins?.tools.size || 0,
            memorySize: this.memory?.size || 0
        };
    }

    /**
     * Reset conversation context
     */
    resetContext() {
        this.currentContext = [];
        this.sessionId = this.generateSessionId();
        console.log('🔄 Context reset');
        this.emit('contextReset');
    }

    /**
     * Shutdown Jarvis
     */
    async shutdown() {
        console.log('👋 Shutting down J.A.R.V.I.S...');
        this.status = 'shutting_down';

        if (this.voice) await this.voice.shutdown();
        if (this.memory) await this.memory.close();
        if (this.plugins) await this.plugins.unloadAll();

        this.status = 'offline';
        this.emit('shutdown');
        console.log('Goodbye.');
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Singleton instance
let jarvisInstance = null;

export function getJarvis() {
    if (!jarvisInstance) {
        jarvisInstance = new Jarvis();
    }
    return jarvisInstance;
}

export { Jarvis };
export default Jarvis;
