/*
DiscordAI v2
The best AI bot framework on Discord.

toolkits/default/log.js

by JustApple
*/

// dependencies
import ai from '@jnode/ai';

const f = new ai.AIFunction('log', '[DEV] Log something to console.', {
    type: 'object',
    properties: {
        text: {
            type: 'string',
            description: 'The text to log.'
        }
    }
}, (params, ctx) => {
    console.log(params.text);
    return {};
});

f.info = (args, ctx) => {
    return `log to console`;
};

f.detail = (args, ctx) => {
    return '```\n' + args.text + '\n```';
};

export default f;