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
    let nextline = { at: 0 };
    let emptyLine = { at: 0 };
    let codeBegin = { at: 0 };
    let codeEnd = { at: 0 };
    let quoBegin = { at: 0 };
    let quoEnd = { at: 0 };

    for await (let i of stream) {
        if (i.type === 'line') {
            // append text
            text += i.line + '\n';

            // check if overflow
            if (text.length > 1900) {
                // cut!
                let cut = '';
                let bef = '';
                let aft = '\n';
                let delb = '';
                let dele = '';

                // cut by flag
                if (text.length - h1.at < 1900) {
                    cut = text.slice(0, h1.at);
                    text = text.slice(h1.at + 1);
                } else if (text.length - h2.at < 1900) {
                    cut = text.slice(0, h2.at);
                    text = text.slice(h2.at + 1);
                } else if (text.length - h3.at < 1900) {
                    cut = text.slice(0, h3.at);
                    text = text.slice(h3.at + 1);
                } else if (text.length - codeBegin.at < 1900) {
                    cut = text.slice(0, codeBegin.at);
                    text = text.slice(codeBegin);
                } else if (text.length - quoBegin.at < 1900) {
                    cut = text.slice(0, quoBegin.at);
                    text = text.slice(quoBegin);
                } else if (text.length - codeEnd.at < 1900) {
                    cut = text.slice(0, codeEnd.at);
                    text = text.slice(codeEnd);
                } else if (text.length - quoEnd.at < 1900) {
                    cut = text.slice(0, quoEnd.at);
                    text = text.slice(quoEnd);
                } else if (text.length - emptyLine.at < 1900) {
                    cut = text.slice(0, emptyLine.at);
                    text = text.slice(emptyLine);
                    if (emptyLine.code) dele = '```';
                } else if (text.length - nextline.at < 1900) {
                    cut = text.slice(0, nextline.at);
                    text = text.slice(nextline);
                    if (nextline.code) dele = '```';
                } else {
                    cut = text.slice(0, 1900);
                    text = text.slice(1900);
                    if (codeblock) dele = '```';
                }

                // trim
                const trimStart = cut.trimStart();
                bef = cut.slice(0, cut.length - trimStart.length);
                const trimEnd = trimStart.trimEnd();
                aft = trimStart.slice(trimEnd.length);

                const msg = await sendMessage(lastMsg.channel_id, {
                    message_reference: (lastMsg === message) ? { message_id: message.id } : undefined,
                    content: delb + trimEnd + dele,
                    components: [{
                        type: 1, components: [{
                            type: 2, style: 5,
                            url: `https://discord.com/channels/${lastMsg.guild_id ?? '@me'}/${lastMsg.channel_id}/${lastMsg.id}?bef=${encodeURIComponent(bef)}&aft=${encodeURIComponent(aft)}&delb=${delb.length}&dele=${dele.length}`
                        }]
                    }]
                });
            }
        }
    }
}