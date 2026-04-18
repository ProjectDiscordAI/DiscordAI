/*
DiscordAI v2
The best AI bot framework on Discord.

ai/services.js

by JustApple
*/

// dependencies
import ai from '@jnode/ai';
import ai_oai from '@jnode/ai/openai-chat';
import ai_gemini from '@jnode/ai/gemini';
import ai_claude from '@jnode/ai/claude';
const { OAIChatService } = ai_oai;
const { GeminiService } = ai_gemini;
const { ClaudeService } = ai_claude;
import { unknownFunction } from './../core/utils/ai.js';

export const openAI = new OAIChatService({ unknownFunction: unknownFunction });
export const gemini = new GeminiService({ unknownFunction: unknownFunction });
export const claude = new ClaudeService({ unknownFunction: unknownFunction });
export const pollinations = new OAIChatService({ baseUrl: 'https://gen.pollinations.ai/v1', unknownFunction: unknownFunction });
export const github = new OAIChatService({ baseUrl: 'https://models.github.ai/inference', unknownFunction: unknownFunction });
export const groq = new OAIChatService({ baseUrl: 'https://api.groq.com/openai/v1', unknownFunction: unknownFunction });
export const openRouter = new OAIChatService({ baseUrl: 'https://openrouter.ai/api/v1', unknownFunction: unknownFunction });
export const nvidia = new OAIChatService({ baseUrl: 'https://integrate.api.nvidia.com/v1', unknownFunction: unknownFunction });
