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
    let text = '';
    const functions = [];

    let lastMsg = message;
    let codeblock = false;
    let inQuote = false;

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

    // clear flags after a message is sent
    const resetFlags = () => {
        h1.at = h2.at = h3.at = 0;
        nextline.at = emptyLine.at = 0;
        codeBegin.at = codeEnd.at = 0;
        quoBegin.at = quoEnd.at = 0;
    };

    for await (let i of stream) {
        if (i.type === 'line') {
            // where a split would occur before adding the line
            const splitBefore = text.length;

            // append text
            text += i.line + '\n';

            // where a split would occur after adding the line
            const splitAfter = text.length - 1;

            const isQuoteLine = i.line.startsWith('> ');

            // check codeblock
            if (i.line.startsWith('```')) {
                if (codeblock) {
                    codeblock = false;
                    codeEnd.at = splitAfter;
                } else {
                    codeBegin.at = splitBefore;
                    codeblock = true;
                }
            } else if (!codeblock) {
                if (i.line.startsWith('# ')) {
                    h1.at = splitBefore;
                } else if (i.line.startsWith('## ')) {
                    h2.at = splitBefore;
                } else if (i.line.startsWith('### ')) {
                    h3.at = splitBefore;
                } else if (i.line.trim() === '') {
                    emptyLine.at = splitAfter;
                    emptyLine.code = codeblock;
                }

                if (isQuoteLine && !inQuote) {
                    quoBegin.at = splitBefore;
                    inQuote = true;
                } else if (!isQuoteLine && inQuote) {
                    quoEnd.at = splitBefore;
                    inQuote = false;
                }
            }

            nextline.at = splitAfter;
            nextline.code = codeblock;

            // check if overflow
            while (text.length > 1900) {
                // cut!
                let cut = '';
                let bef = '';
                let aft = '\n';
                let delb = '';
                let dele = '';

                // cut by flag 
                if (h1.at > 0 && text.length - h1.at < 1900) {
                    cut = text.slice(0, h1.at);
                    text = text.slice(h1.at + 1);
                } else if (h2.at > 0 && text.length - h2.at < 1900) {
                    cut = text.slice(0, h2.at);
                    text = text.slice(h2.at + 1);
                } else if (h3.at > 0 && text.length - h3.at < 1900) {
                    cut = text.slice(0, h3.at);
                    text = text.slice(h3.at + 1);
                } else if (codeBegin.at > 0 && text.length - codeBegin.at < 1900) {
                    cut = text.slice(0, codeBegin.at);
                    text = text.slice(codeBegin.at + 1);
                } else if (quoBegin.at > 0 && text.length - quoBegin.at < 1900) {
                    cut = text.slice(0, quoBegin.at);
                    text = text.slice(quoBegin.at + 1);
                } else if (codeEnd.at > 0 && text.length - codeEnd.at < 1900) {
                    cut = text.slice(0, codeEnd.at);
                    text = text.slice(codeEnd.at + 1);
                } else if (quoEnd.at > 0 && text.length - quoEnd.at < 1900) {
                    cut = text.slice(0, quoEnd.at);
                    text = text.slice(quoEnd.at + 1);
                } else if (emptyLine.at > 0 && text.length - emptyLine.at < 1900) {
                    cut = text.slice(0, emptyLine.at);
                    text = text.slice(emptyLine.at + 1);
                    if (emptyLine.code) dele = '```';
                } else if (nextline.at > 0 && text.length - nextline.at < 1900) {
                    cut = text.slice(0, nextline.at);
                    text = text.slice(nextline.at + 1);
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

                // FIX: If we cut inside a codeblock, ensure the next message correctly starts the markdown block again.
                if (dele === '```') {
                    text = '```\n' + text;
                }

                lastMsg = await sendMessage(lastMsg.channel_id, {
                    message_reference: (lastMsg === message) ? { message_id: message.id } : undefined,
                    content: delb + trimEnd + dele,
                    components: [{
                        type: 1, components: [{
                            type: 2, style: 5,
                            url: `https://discord.com/channels/${lastMsg.guild_id ?? '@me'}/${lastMsg.channel_id}/${lastMsg.id}?bef=${encodeURIComponent(bef)}&aft=${encodeURIComponent(aft)}&delb=${delb.length}&dele=${dele.length}`
                        }]
                    }]
                });

                resetFlags();
            }
        }
    }
    
    // flush for the remaining text under 1900 chars
    if (text.trim().length > 0) {
        await sendMessage(lastMsg.channel_id, {
            message_reference: (lastMsg === message) ? { message_id: message.id } : undefined,
            content: text.trimEnd() + (codeblock ? '\n```' : '')
        });
    }
}