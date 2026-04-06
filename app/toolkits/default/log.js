/*
DiscordAI v2
The best AI bot framework on Discord.

toolkits/default/log.js

by JustApple
*/

// dependencies
import ai from '@jnode/ai';

export default new ai.AIFunction('log', 'Log something to console.', {
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