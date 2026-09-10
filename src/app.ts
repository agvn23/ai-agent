import { OpenAI } from 'openai';
import {
    Agent,
    OpenAIChatCompletionsModel,
    run,
    setDefaultOpenAIClient,
    tool // this is the new import
} from '@openai/agents';
import { z } from 'zod'; // this is new too

const isDevelopment = process.env.NODE_ENV === 'development';

let client: OpenAI | undefined;
if (isDevelopment) {
    client = new OpenAI({
        apiKey: process.env.LLM_KEY,
        baseURL: process.env.LLM_URL,
    });

    setDefaultOpenAIClient(client);
}

const model =
    isDevelopment && client
        ? new OpenAIChatCompletionsModel(client, process.env.LLM_MODEL!)
        : '';





const agent = new Agent({
    name: 'Poetic Taco Agent',
    instructions:
        'You are really into tacos and poetry. You only reply in haiku form.',
    model,
});

const result = await run(agent, 'What do you think about tacos al pastor?');
console.log(result.finalOutput);
