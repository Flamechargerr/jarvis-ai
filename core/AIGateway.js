/**
 * AI Gateway - Groq-powered AI interface
 * Handles model selection, streaming, and tool calls
 */

import Groq from 'groq-sdk';
import config from '../jarvis.config.js';

class AIGateway {
    constructor() {
        this.client = null;
        this.initialized = false;
    }

    /**
     * Initialize the Groq client
     */
    async initialize() {
        if (!config.ai.groq.apiKey) {
            throw new Error('GROQ_API_KEY is required. Get one at https://console.groq.com');
        }

        this.client = new Groq({
            apiKey: config.ai.groq.apiKey
        });

        this.initialized = true;
        console.log('  AI Gateway initialized with Groq');
    }

    /**
     * Select the best model for a given task type
     */
    selectModel(taskType = 'general') {
        return config.routing[taskType] || config.ai.defaultModel;
    }

    /**
     * Stream a response from Groq
     * @param {object} request - Request with messages, tools, etc.
     * @param {string} modelName - Optional specific model to use
     */
    async *stream(request, modelName = null) {
        const model = modelName || this.selectModel(request.taskType);

        const messages = this.formatMessages(request.messages);

        const params = {
            model,
            messages,
            stream: true,
            max_tokens: 4096,
            temperature: 0.7
        };

        // Add tools if provided
        if (request.tools && request.tools.length > 0) {
            params.tools = request.tools.map(t => ({
                type: 'function',
                function: {
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters
                }
            }));
            params.tool_choice = 'auto';
        }

        try {
            const stream = await this.client.chat.completions.create(params);

            let toolCalls = [];

            for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta;

                if (delta?.content) {
                    yield { type: 'content', content: delta.content, model };
                }

                // Handle tool calls
                if (delta?.tool_calls) {
                    for (const tc of delta.tool_calls) {
                        if (tc.index !== undefined) {
                            if (!toolCalls[tc.index]) {
                                toolCalls[tc.index] = { id: tc.id, name: '', arguments: '' };
                            }
                            if (tc.function?.name) toolCalls[tc.index].name = tc.function.name;
                            if (tc.function?.arguments) toolCalls[tc.index].arguments += tc.function.arguments;
                        }
                    }
                }

                if (chunk.choices[0]?.finish_reason === 'tool_calls') {
                    for (const tc of toolCalls) {
                        if (tc.name) {
                            yield {
                                type: 'tool_call',
                                tool: tc.name,
                                arguments: JSON.parse(tc.arguments || '{}'),
                                id: tc.id,
                                model
                            };
                        }
                    }
                }
            }

            yield { type: 'done', model };

        } catch (error) {
            console.error(`Error with ${model}:`, error.message);

            // Try fallback to fast model
            if (model !== config.ai.fastModel) {
                console.log(`  Falling back to ${config.ai.fastModel}`);
                yield* this.stream(request, config.ai.fastModel);
            } else {
                throw error;
            }
        }
    }

    /**
     * Format messages for Groq (OpenAI-compatible format)
     */
    formatMessages(messages) {
        return messages.map(m => {
            const formatted = { role: m.role, content: m.content };

            // Handle vision - images as base64
            if (m.attachments?.length > 0) {
                formatted.content = [
                    { type: 'text', text: m.content },
                    ...m.attachments.map(a => ({
                        type: 'image_url',
                        image_url: {
                            url: a.url || `data:${a.type};base64,${a.data}`
                        }
                    }))
                ];
            }

            return formatted;
        });
    }

    /**
     * Non-streaming completion
     */
    async complete(request, modelName = null) {
        let result = '';
        const toolCalls = [];

        for await (const chunk of this.stream(request, modelName)) {
            if (chunk.type === 'content') {
                result += chunk.content;
            }
            if (chunk.type === 'tool_call') {
                toolCalls.push(chunk);
            }
        }

        return { content: result, toolCalls };
    }

    /**
     * Transcribe audio using Groq Whisper
     */
    async transcribe(audioBuffer, options = {}) {
        const transcription = await this.client.audio.transcriptions.create({
            file: audioBuffer,
            model: config.ai.whisperModel,
            language: options.language || 'en',
            response_format: 'text'
        });

        return transcription;
    }

    /**
     * Vision analysis using Llama Vision
     */
    async analyzeImage(imageBase64, prompt = 'Describe this image in detail.') {
        const response = await this.client.chat.completions.create({
            model: config.ai.visionModel,
            messages: [{
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    {
                        type: 'image_url',
                        image_url: {
                            url: `data:image/png;base64,${imageBase64}`
                        }
                    }
                ]
            }],
            max_tokens: 1024
        });

        return response.choices[0].message.content;
    }

    /**
     * Quick health check
     */
    async healthCheck() {
        try {
            await this.client.chat.completions.create({
                model: config.ai.fastModel,
                max_tokens: 10,
                messages: [{ role: 'user', content: 'hi' }]
            });
            return { status: 'ok', provider: 'groq' };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }
}

export { AIGateway };
export default AIGateway;
