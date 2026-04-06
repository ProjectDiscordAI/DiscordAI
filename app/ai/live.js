/*
DiscordAI v2
The best AI bot framework on Discord.

ai/live.js

by JustApple
*/

// dependencies
import { config, getTime } from './../core/startup.js';

// live info
export default function live(message, author) {
    let info = `# Live infomation\n\n`;
    info += `- Current time: ${getTime(Date.now())}\n`;
    info += `\n----`;
}