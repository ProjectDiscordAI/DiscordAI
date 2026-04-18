/*
DiscordAI v2
The best AI bot framework on Discord.

toolkits/default/log.js

by JustApple
*/

// dependencies
import ai from '@jnode/ai';
import { config, client } from 'discordai/core';
import { request } from '@jnode/request';

const f = new ai.AIFunction('fetch', '[DEV] Make a HTTP request directly and return text body.', {
    type: 'object',
    properties: {
        method: {
            type: 'string',
            description: 'The request HTTP method. E.G. "GET".'
        },
        url: {
            type: 'string',
            description: 'The request url. E.G. "https://example.com".'
        },
        body: {
            type: 'string',
            description: 'The request HTTP body. Optional.',
            nullable: true
        },
        headers: {
            type: 'object',
            description: 'The additional request HTTP headers in `{key: vlaue}`. Optional.',
            nullable: true
        }
    }
}, async (args, ctx) => {
    if (!config.users.dev.has(ctx.author.id)) return { status: 'PERMISSION_DENIED' };
    try {
        return { status: 'COMPLETED', result: await (await request(args.method, args.url, args.body, args.headers)).text() };
    } catch (err) {
        return { status: 'ERROR', message: err.message };
    }
});

f.info = (args, ctx) => {
    return `make HTTP request`;
};

f.detail = (args, ctx) => {
    let headers = '';
    if (args.headers) {
        for (let i in args.headers) {
            headers += `${i}: ${args.headers[i]}\n`;
        }
    }
    console.log(args)
    return '```\n' + (args.method ?? 'GET') + ' ' + args.url + '\n```\n' +
        (headers ? '```\n' + headers + '\n```\n' : '') +
        (args.body ? '```\n' + args.body + '\n```\n' : '');
};

export default f;