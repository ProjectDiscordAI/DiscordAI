// dependencies
import ai from '@jnode/ai';
import { shotUrl } from './helper/webshot.js';

const f = new ai.AIFunction('search', '(Auto Action) This action provides a better method than browse_website, you won\'t need to handle URI encode. Recommend to use it in first search, and after you know the encoded string and others, you can use browse_website for further action.', {
    type: 'object',
    properties: {
        query: {
            type: 'string',
            description: 'Required. The search query, you can use search options too. (e.g. "CSS Flex box site:https://developer.mozilla.org/en-US/")'
        }
    }
}, async (args, ctx) => {
    try {
        const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(args.query)}`;
        // const url = `https://www.google.com/search?q=${encodeURIComponent(args.query)}&client=safari&hs=ybgp&channel=mac_bm&oq=${encodeURIComponent(args.query)}`;

        return {
            status: 'SUCCEED',
            result: (await shotUrl(url, null, null, 1000, 5000, 'md')).toString('utf8')
        };
    } catch (err) {
        return {
            status: 'ERROR',
            result: err.message
        };
    }
});

f.info = (args, ctx) => {
    return `搜尋 \`${args.query}\``;
};

f.detail = (args, ctx) => {
    return '```\n' + args.query + '\n```';
};

f.auto = true;

export default f;