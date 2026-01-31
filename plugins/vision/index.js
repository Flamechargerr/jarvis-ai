/**
 * Vision Plugin - Screen capture and AI analysis
 * See and understand anything on screen
 */

import screenshot from 'screenshot-desktop';
import sharp from 'sharp';
import { AIGateway } from '../../core/AIGateway.js';

const tools = [
    {
        name: 'take_screenshot',
        description: 'Capture a screenshot of the current screen and analyze what you see. Use this to understand what the user is looking at.',
        parameters: {
            type: 'object',
            properties: {
                analyze: {
                    type: 'boolean',
                    description: 'Whether to analyze the screenshot with AI vision (default: true)'
                },
                prompt: {
                    type: 'string',
                    description: 'Specific question about what you see (optional)'
                }
            }
        },
        async execute({ analyze = true, prompt }) {
            try {
                // Capture screenshot
                const imgBuffer = await screenshot({ format: 'png' });

                // Resize for faster processing
                const resized = await sharp(imgBuffer)
                    .resize(1280, 800, { fit: 'inside' })
                    .jpeg({ quality: 85 })
                    .toBuffer();

                const base64 = resized.toString('base64');

                if (!analyze) {
                    return 'Screenshot captured successfully.';
                }

                // Analyze with Groq Vision
                const gateway = new AIGateway();
                await gateway.initialize();

                const analysisPrompt = prompt ||
                    'Describe what you see on this screen in detail. Include any text, applications, windows, or important elements visible.';

                const analysis = await gateway.analyzeImage(base64, analysisPrompt);
                return analysis;

            } catch (error) {
                return `Screenshot failed: ${error.message}`;
            }
        }
    },
    {
        name: 'read_screen_text',
        description: 'Read and extract all visible text from the current screen using OCR.',
        parameters: {
            type: 'object',
            properties: {}
        },
        async execute() {
            try {
                const imgBuffer = await screenshot({ format: 'png' });
                const resized = await sharp(imgBuffer)
                    .resize(1920, 1200, { fit: 'inside' })
                    .jpeg({ quality: 90 })
                    .toBuffer();

                const base64 = resized.toString('base64');

                const gateway = new AIGateway();
                await gateway.initialize();

                const text = await gateway.analyzeImage(
                    base64,
                    'Extract and list ALL text visible on this screen. Be thorough and include every piece of text you can see, organized by location on screen.'
                );
                return text;

            } catch (error) {
                return `OCR failed: ${error.message}`;
            }
        }
    }
];

export default { tools };
