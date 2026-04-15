/*
DiscordAI v2
The best AI bot framework on Discord.

toolkits/default/log.js

by JustApple
*/

// dependencies
import ai from '@jnode/ai';
import { config } from 'discordai/core';

const f = new ai.AIFunction('js_eval', '[DEV,DANGEROUS] Eval JavaScipt in Node.js enviornment `await eval()`, and return the result value in JSON. Recommend to use async IIFE `(async () => { ... })()`.', {
    type: 'object',
    properties: {
        script: {
            type: 'string',
            description: 'The script to run.'
        }
    }
}, async (args, ctx) => {
    if (!config.users.dev.has(ctx.author.id)) return { status: 'PERMISSION_DENIED' };
    try {
        return { status: 'COMPLETED', result: await eval(args.script) };
    } catch (err) {
        return { status: 'ERROR', message: err.message };
    }
});

f.info = (args, ctx) => {
    return `eval JsvsScript (**DANGEROUS**)`;
};

f.detail = (args, ctx) => {
    return '```js\n' + args.script + '\n```';
};

export default f;