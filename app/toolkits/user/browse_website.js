/*
DiscordAI v2
The best AI bot framework on Discord.

toolkits/default/browse_website.js

by JustApple
*/

// dependencies
import ai from '@jnode/ai';
import { shotUrl } from './helper/webshot.js';

const f = new ai.AIFunction('browse_website', 'Browse the content of any web page in markdown.', {
    type: 'object',
    properties: {
        url: {
            type: 'string',
            description: 'Required. The url of web page. (e.g. "https://example.com") Note that spaces are not allowed, and URL MUST starts with `http://` or `https://`.'
        },
        delay: {
            type: 'integer',
            description: 'Optional. Delay time (in milliseconds) to wait for the webpage to load before capturing. Default is 1000 ms.',
        }
    }
}, async (params, ctx) => {
    try {
        return {
            status: 'SUCCEED',
            result: (await shotUrl(params.url, null, null, params.delay ?? 1000, 10000, 'md')).toString('utf8')
        };
    } catch (err) {
        // console.log(err)
        return {
            status: 'ERROR',
            result: err.message
        };
    }
});

f.info = (args, ctx) => {
    try {
        const url = new URL(args.url);
        return `瀏覽 [${url.host}](${args.url})`;
    } catch {
        return `瀏覽 [網頁](${args.url})`;
    }
};

f.detail = (args, ctx) => {
    return `**URL**｜ ${args.url}\n**截圖延遲**｜${args.delay ?? 1000}ms`
};

f.auto = true;

export default f;