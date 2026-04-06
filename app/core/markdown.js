/*
DiscordAI v2
The best AI bot framework on Discord.

core/utils/markdown.js

by JustApple
*/

// dependencies
import jn_ai from '@jnode/ai';
import jn_dc from '@jnode/discord';
const { AIConversation } = jn_ai;
const { Attachment } = jn_dc;
import { client, messageCacher } from './startup.js';

// interact stream to line stream
async function* interactToLine(stream) {
    let buf = '';
    let last;
    for await (let i of stream) {
        if (i.type === 'component') {
            last = i.component;
            if (i.component.type === 'text') {
                buf += i.component.content ?? '';
                let line = buf.indexOf('\n');
                while (line >= 0) {
                    yield { type: 'line', line: buf.slice(0, line) };
                    buf = buf.slice(line + 1);
                    line = buf.indexOf('\n');
                }
            } else yield i;
        } else if (i.type === 'continue') {
            if (last.type === 'text') {
                buf += i.content ?? '';
                let line = buf.indexOf('\n');
                while (line >= 0) {
                    yield { type: 'line', line: buf.slice(0, line) };
                    buf = buf.slice(line + 1);
                    line = buf.indexOf('\n');
                }
            } else yield i;
        } else if (i.type === 'end') {
            yield { type: 'line', line: buf };
            yield i;
        } else yield i;
    }
}

async function sendMessage(channel, body, attachments) {
    const msg = await client.request('POST', `/channels/${channel}/messages`, body, attachments);
    messageCacher.set(`${msg.channel_id}/${msg.id}`, msg);
    return msg;
}

// stream interact in discord messages
export async function messageStreamInteract(interactStream, message, author, context) {
    const stream = interactToLine(interactStream);
    const text = '';
    const functions = [];

    let lastMsg = message;
    let codeblock;

    // split flags
    let h1 = { at: 0 };
    let h2 = { at: 0 };
    let h3 = { at: 0 };
    let h4 = { at: 0 };
    let h5 = { at: 0 };
    let h6 = { at: 0 };
    let nextline = { at: 0 };
    let emptyLine = { at: 0 };
    let codeBegin = { at: 0 };
    let codeEnd = { at: 0 };
    let refBegin = { at: 0 };
    let refEnd = { at: 0 };

    for await (let i of stream) {
        if (i.type === 'line') {
            // send functions first (not common, but possible)
            if (functions.length > 0) {

            }

            // append text
            text += i.line + '\n';

            // check if overflow
            if (text.length > 1900) {
                // cut!
                let cut = '';
                let bef = '';
                let aft = '';

                // cut by flag
                if (text.length - h1.at < 1900) {
                    cut = text.slice(0, h1.at);
                    text = text.slice(h1.at + 1);
                } else if (text.length - h2.at < 1900) {
                    cut = text.slice(0, h2.at);
                    text = text.slice(h2.at + 1);
                }

                const msg = await sendMessage(lastMsg.channel_id, {
                    message_reference: (lastMsg === message) ? { message_id: message.id } : undefined,
                    content: cut,
                    components: [{
                        type: 1, components: [{
                            type: 2, style: 5,
                            url: `https://discord.com/channels/${lastMsg.guild_id ?? '@me'}/${lastMsg.channel_id}/${lastMsg.id}?aft=${encodeURIComponent('\n')}`
                        }]
                    }]
                });
            }
        }
    }
}