/**
 * Semantic Memory - Conversation history with keyword-based search
 * Uses JSON file storage (no native dependencies)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import config from '../jarvis.config.js';

class SemanticMemory {
    constructor() {
        this.memories = [];
        this.summaries = new Map();
        this.size = 0;
        this.dbPath = config.memory.dbPath.replace('.db', '.json');
    }

    /**
     * Initialize the memory store
     */
    async initialize() {
        const dir = dirname(this.dbPath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }

        // Load existing memories
        if (existsSync(this.dbPath)) {
            try {
                const data = JSON.parse(readFileSync(this.dbPath, 'utf-8'));
                this.memories = data.memories || [];
                this.summaries = new Map(data.summaries || []);
                this.size = this.memories.length;
            } catch (error) {
                console.log('  Starting with fresh memory');
            }
        }

        console.log(`  Memory initialized with ${this.size} entries`);
    }

    /**
     * Save memories to disk
     */
    save() {
        const data = {
            memories: this.memories,
            summaries: Array.from(this.summaries.entries())
        };
        writeFileSync(this.dbPath, JSON.stringify(data, null, 2));
    }

    /**
     * Store a conversation exchange
     */
    async store({ input, response, context, sessionId }) {
        const keywords = this.extractKeywords(input + ' ' + response);

        this.memories.push({
            sessionId,
            input,
            response,
            context,
            keywords,
            createdAt: new Date().toISOString()
        });

        this.size++;

        // Keep only last 1000 memories in file
        if (this.memories.length > 1000) {
            this.memories = this.memories.slice(-1000);
        }

        this.save();
    }

    /**
     * Recall relevant memories based on query
     */
    async recall(query, limit = 5) {
        const queryKeywords = this.extractKeywords(query);

        if (queryKeywords.length === 0) {
            // Return recent memories
            return this.memories
                .slice(-limit)
                .reverse()
                .map(m => ({
                    content: `Q: ${m.input}\nA: ${m.response}`,
                    timestamp: m.createdAt
                }));
        }

        // Score by keyword overlap
        const scored = this.memories.map(m => {
            const overlap = queryKeywords.filter(k => m.keywords.includes(k)).length;
            return { memory: m, score: overlap };
        });

        // Sort by score and recency
        scored.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return new Date(b.memory.createdAt) - new Date(a.memory.createdAt);
        });

        return scored
            .slice(0, limit)
            .filter(s => s.score > 0)
            .map(s => ({
                content: `Q: ${s.memory.input}\nA: ${s.memory.response}`,
                timestamp: s.memory.createdAt
            }));
    }

    /**
     * Extract keywords from text
     */
    extractKeywords(text) {
        const stopWords = new Set([
            'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
            'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
            'would', 'could', 'should', 'may', 'might', 'can', 'must',
            'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
            'as', 'into', 'through', 'during', 'before', 'after',
            'here', 'there', 'when', 'where', 'why', 'how', 'all',
            'and', 'but', 'if', 'or', 'because', 'about', 'not',
            'this', 'that', 'what', 'which', 'who', 'i', 'me', 'my',
            'you', 'your', 'he', 'she', 'it', 'we', 'they', 'them'
        ]);

        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word))
            .slice(0, 20);
    }

    /**
     * Get session summary
     */
    async getSessionSummary(sessionId) {
        return this.summaries.get(sessionId);
    }

    /**
     * Update session summary
     */
    async updateSessionSummary(sessionId, summary, messageCount) {
        this.summaries.set(sessionId, { summary, messageCount, updatedAt: new Date().toISOString() });
        this.save();
    }

    /**
     * Close the memory store
     */
    async close() {
        this.save();
    }
}

export { SemanticMemory };
export default SemanticMemory;
