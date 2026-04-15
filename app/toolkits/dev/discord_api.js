/*
DiscordAI v2
The best AI bot framework on Discord.

toolkits/default/log.js

by JustApple
*/

// dependencies
import ai from '@jnode/ai';
import { config, client } from 'discordai/core';

const f = new ai.AIFunction('discord_api_request', '[DEV] Make a Discord API request, recommend to check Discord Dev Docs at `https://docs.discord.com/llms.txt` with `fetch` first.', {
    type: 'object',
    properties: {
        method: {
            type: 'string',
            description: 'The request HTTP method. E.G. "GET".'
        },
        path: {
            type: 'string',
            description: 'The request path. E.G. "/users/@me".'
        },
        body: {
            type: 'string',
            description: 'The request HTTP body in JSON. Optional.',
            nullable: true
        }
    }
}, async (args, ctx) => {
    if (!config.users.dev.has(ctx.author.id)) return { status: 'PERMISSION_DENIED' };
    try {
        return { status: 'COMPLETED', result: await client.request(args.method, args.path, args.body && JSON.parse(args.body)) };
    } catch (err) {
        return { status: 'ERROR', message: err.message };
    }
});

f.info = (args, ctx) => {
    return `make Discord API request`;
};

f.detail = (args, ctx) => {
    return '```\n' + args.method + ' ' + args.path + '\n```\n' +
        (args.body ? '```json\n' + args.body + '\n```' : '');
};

export default f;