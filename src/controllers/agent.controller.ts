import Anthropic from '@anthropic-ai/sdk';
import type { RequestHandler } from 'express';

// Initialise the Anthropic client
// It automatically reads ANTHROPIC_API_KEY from your environment
const client = new Anthropic();

// This is our fake tool that simulates fetching weather data
// In a real app this would call a weather API
const getWeather = (location: string) => {
    return {
        location,
        temperature: 18,
        condition: 'cloudy',
        humidity: 72
    };
};

// This is the tool definition we send to Claude
// It tells Claude what tools are available and what arguments they need
const tools: Anthropic.Tool[] = [
    {
        name: 'get_weather',
        description: 'Get the current weather for a given location',
        input_schema: {
            type: 'object' as const,
            properties: {
                location: {
                    type: 'string',
                    description: 'The city to get weather for e.g. Paris'
                }
            },
            required: ['location']
        }
    }
];

export const agentController: RequestHandler = async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            res.status(400).json({ error: 'Prompt is required' });
            return;
        }

        console.log('🤖 First model call - sending prompt and tools...');

        // FIRST MODEL CALL
        // We send the user's prompt along with the available tools
        // Claude will decide if it needs to call a tool
        const firstResponse = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1024,
            tools,
            messages: [
                { role: 'user', content: prompt }
            ]
        });

        console.log('First response stop reason:', firstResponse.stop_reason);

        // Check if Claude wants to call a tool
        if (firstResponse.stop_reason === 'tool_use') {
            // Find the tool use block in the response
            const toolUseBlock = firstResponse.content.find(
                block => block.type === 'tool_use'
            ) as Anthropic.ToolUseBlock;

            console.log(`🔧 Claude wants to call tool: ${toolUseBlock.name}`);
            console.log('With input:', toolUseBlock.input);

            // Run our fake tool with the arguments Claude provided
            const toolResult = getWeather((toolUseBlock.input as { location: string }).location);

            console.log('Tool result:', toolResult);
            console.log('🤖 Second model call - sending tool result back to Claude...');

            // SECOND MODEL CALL
            // We send the tool result back to Claude so it can form a final answer
            const secondResponse = await client.messages.create({
                model: 'claude-sonnet-4-6',
                max_tokens: 1024,
                tools,
                messages: [
                    // The original user message
                    { role: 'user', content: prompt },
                    // Claude's first response (including the tool call)
                    { role: 'assistant', content: firstResponse.content },
                    // The tool result
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'tool_result',
                                tool_use_id: toolUseBlock.id,
                                content: JSON.stringify(toolResult)
                            }
                        ]
                    }
                ]
            });

            // Extract the final text response
            const finalAnswer = secondResponse.content.find(
                block => block.type === 'text'
            ) as Anthropic.TextBlock;

            res.json({
                answer: finalAnswer.text,
                toolCalled: toolUseBlock.name,
                toolInput: toolUseBlock.input,
                toolResult
            });

        } else {
            // Claude answered directly without needing a tool
            const textBlock = firstResponse.content.find(
                block => block.type === 'text'
            ) as Anthropic.TextBlock;

            res.json({
                answer: textBlock.text,
                toolCalled: null
            });
        }

    } catch (error) {
        console.error('Agent error:', error);
        res.status(500).json({ error: 'Agent failed' });
    }
};