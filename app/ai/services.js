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

export const openAI = new OAIChatService();
export const gemini = new GeminiService();
export const claude = new ClaudeService();
export const pollinations = new OAIChatService({ baseUrl: 'https://gen.pollinations.ai/v1' });
export const github = new OAIChatService({ baseUrl: 'https://models.github.ai/inference' });