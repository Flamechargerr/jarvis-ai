/**
 * Task Planner - Agentic task execution with tool calling
 */

class TaskPlanner {
    constructor(gateway, plugins) {
        this.gateway = gateway;
        this.plugins = plugins;
        this.maxIterations = 10; // Prevent infinite loops
    }

    /**
     * Execute a task with tool calling support
     * @param {object} context - Full context with messages and tools
     */
    async *execute(context) {
        let iterations = 0;
        let messages = [...context.messages];

        while (iterations < this.maxIterations) {
            iterations++;

            // Get AI response
            let responseText = '';
            let toolCalls = [];

            for await (const chunk of this.gateway.stream({
                messages,
                tools: context.tools,
                taskType: context.context?.taskType
            })) {
                if (chunk.type === 'content') {
                    responseText += chunk.content;
                    yield chunk;
                }

                if (chunk.type === 'tool_call') {
                    toolCalls.push(chunk);
                }
            }

            // If no tool calls, we're done
            if (toolCalls.length === 0) {
                yield { type: 'done' };
                return;
            }

            // Execute tool calls
            yield { type: 'status', content: '\n\n🔧 *Executing tools...*\n' };

            // Add assistant message with tool calls
            messages.push({
                role: 'assistant',
                content: responseText,
                tool_calls: toolCalls.map(tc => ({
                    id: tc.id,
                    type: 'function',
                    function: {
                        name: tc.tool,
                        arguments: JSON.stringify(tc.arguments)
                    }
                }))
            });

            // Execute each tool and collect results
            for (const tc of toolCalls) {
                try {
                    yield {
                        type: 'tool_start',
                        tool: tc.tool,
                        content: `\n> Running \`${tc.tool}\`...\n`
                    };

                    const result = await this.plugins.execute(tc.tool, tc.arguments);

                    yield {
                        type: 'tool_result',
                        tool: tc.tool,
                        content: `> Result: ${this.formatResult(result)}\n`
                    };

                    // Add tool result to messages
                    messages.push({
                        role: 'tool',
                        tool_call_id: tc.id,
                        content: typeof result === 'string' ? result : JSON.stringify(result)
                    });

                } catch (error) {
                    yield {
                        type: 'tool_error',
                        tool: tc.tool,
                        content: `> Error: ${error.message}\n`
                    };

                    messages.push({
                        role: 'tool',
                        tool_call_id: tc.id,
                        content: `Error: ${error.message}`
                    });
                }
            }

            yield { type: 'status', content: '\n' };
        }

        // Max iterations reached
        yield {
            type: 'warning',
            content: '\n⚠️ *Task reached maximum iterations. Please refine your request.*\n'
        };
    }

    /**
     * Format tool result for display
     */
    formatResult(result) {
        if (typeof result === 'string') {
            return result.length > 200 ? result.substring(0, 200) + '...' : result;
        }
        const str = JSON.stringify(result, null, 2);
        return str.length > 200 ? str.substring(0, 200) + '...' : str;
    }
}

export { TaskPlanner };
export default TaskPlanner;
