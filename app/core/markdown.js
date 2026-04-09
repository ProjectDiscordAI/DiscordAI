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
import { config, client, messageCacher, daiv2Tool } from './startup.js';
import * as ui from './ui.js';

// constants
const CODEBLOCK_REGEX = /(`{3,})(.*)/;

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
            } yield i;
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

// send message with cache
async function sendMessage(channel, body, attachments) {
    const msg = await client.request('POST', `/channels/${channel}/messages`, body, attachments);
    messageCacher.set(`${msg.channel_id}/${msg.id}`, msg);
    return msg;
}

// stream interact in discord messages
export async function messageStreamInteract(interactStream, ctx) {
    const stream = interactToLine(interactStream);
    let text = '';
    let code = '';

    let autoRun = true;
    const calls = [];
    const responses = [];

    const message = ctx.rootMessage;
    const author = ctx.author;
    const conversation = ctx.conversation;

    let lastMsg = message;

    let count = 1;

    let inCodeblock = false;
    let codeblockLang = '';

    let h1At = 0;
    let h2At = 0;
    let h3At = 0;
    let emptyLineAt = 0;
    let newLineAt = 0;

    // type
    function type() {
        return client.request('POST', `/channels/${message.channel_id}/typing`, {});
    }
    await type();

    try {
        for await (let i of stream) {
            if (i.type === 'line') {
                if (inCodeblock) {
                    if (i.line.startsWith('```')) {
                        if (code.length + 8 + codeblockLang.length > 2000) { // send as file
                            const langDot = codeblockLang.indexOf('.');
                            lastMsg = await sendMessage(lastMsg.channel_id, {
                                allowed_mentions: { parse: [], replied_user: message.author.id === author.id },
                                message_reference: (lastMsg === message) ? { message_id: message.id } : undefined,
                                content: text,
                                components: [{
                                    type: 1, components: [{
                                        type: 2, style: 5, label: `${count++} / ~`,
                                        url: `https://discord.com/channels/${lastMsg.guild_id ?? '@me'}/${lastMsg.channel_id}/${lastMsg.id}`
                                    }]
                                }],
                                attachments: [{
                                    id: 0,
                                    title: (langDot >= 0) ? codeblockLang.slice(0, langDot) : 'code'
                                }]
                            }, [new Attachment((langDot >= 0) ? 'code' + codeblockLang.slice(langDot) : codeblockLang ? `code.${codeblockLang}` : 'code.txt', 'text/plain', code)]);
                            await type();
                            code = '';
                            text = '';
                            codeblockLang = '';
                        } else if (code.length + 8 + codeblockLang.length + text.length > 2000) {
                            // send text part
                            lastMsg = await sendMessage(lastMsg.channel_id, {
                                allowed_mentions: { parse: [], replied_user: message.author.id === author.id },
                                message_reference: (lastMsg === message) ? { message_id: message.id } : undefined,
                                content: text,
                                components: [{
                                    type: 1, components: [{
                                        type: 2, style: 5, label: `${count++} / ~`,
                                        url: `https://discord.com/channels/${lastMsg.guild_id ?? '@me'}/${lastMsg.channel_id}/${lastMsg.id}`
                                    }]
                                }]
                            });
                            await type();
                            text = '```' + codeblockLang + '\n' + code + '```\n';
                            code = '';
                            codeblockLang = '';
                        } else {
                            // bring code to text
                            text += '```' + codeblockLang + '\n' + code + '```\n';
                            code = '';
                            codeblockLang = '';
                        }
                        inCodeblock = false;
                    } else {
                        code += i.line + '\n';
                    }
                } else {
                    if (i.line.startsWith('```')) {
                        codeblockLang = i.line.slice(3);
                        inCodeblock = true;
                    } else {
                        if (i.line === '') emptyLineAt = text.length;
                        newLineAt = text.length;
                        text += i.line + '\n';

                        if (text.length > 2000) {
                            if (text.length - h1At <= 2000) {
                                lastMsg = await sendMessage(lastMsg.channel_id, {
                                    allowed_mentions: { parse: [], replied_user: message.author.id === author.id },
                                    message_reference: (lastMsg === message) ? { message_id: message.id } : undefined,
                                    content: text.slice(0, h1At),
                                    components: [{
                                        type: 1, components: [{
                                            type: 2, style: 5, label: `${count++} / ~`,
                                            url: `https://discord.com/channels/${lastMsg.guild_id ?? '@me'}/${lastMsg.channel_id}/${lastMsg.id}`
                                        }]
                                    }]
                                });
                                await type();
                                text = text.slice(h1At);
                            } else if (text.length - h2At <= 2000) {
                                lastMsg = await sendMessage(lastMsg.channel_id, {
                                    allowed_mentions: { parse: [], replied_user: message.author.id === author.id },
                                    message_reference: (lastMsg === message) ? { message_id: message.id } : undefined,
                                    content: text.slice(0, h2At),
                                    components: [{
                                        type: 1, components: [{
                                            type: 2, style: 5, label: `${count++} / ~`,
                                            url: `https://discord.com/channels/${lastMsg.guild_id ?? '@me'}/${lastMsg.channel_id}/${lastMsg.id}`
                                        }]
                                    }]
                                });
                                await type();
                                text = text.slice(h2At);
                            } else if (text.length - h3At <= 2000) {
                                lastMsg = await sendMessage(lastMsg.channel_id, {
                                    allowed_mentions: { parse: [], replied_user: message.author.id === author.id },
                                    message_reference: (lastMsg === message) ? { message_id: message.id } : undefined,
                                    content: text.slice(0, h3At),
                                    components: [{
                                        type: 1, components: [{
                                            type: 2, style: 5, label: `${count++} / ~`,
                                            url: `https://discord.com/channels/${lastMsg.guild_id ?? '@me'}/${lastMsg.channel_id}/${lastMsg.id}`
                                        }]
                                    }]
                                });
                                await type();
                                text = text.slice(h3At);
                            } else if (text.length - emptyLineAt <= 2000) {
                                lastMsg = await sendMessage(lastMsg.channel_id, {
                                    allowed_mentions: { parse: [], replied_user: message.author.id === author.id },
                                    message_reference: (lastMsg === message) ? { message_id: message.id } : undefined,
                                    content: text.slice(0, emptyLineAt),
                                    components: [{
                                        type: 1, components: [{
                                            type: 2, style: 5, label: `${count++} / ~`,
                                            url: `https://discord.com/channels/${lastMsg.guild_id ?? '@me'}/${lastMsg.channel_id}/${lastMsg.id}`
                                        }]
                                    }]
                                });
                                await type();
                                text = text.slice(emptyLineAt);
                            } else if (text.length - newLineAt <= 2000) {
                                lastMsg = await sendMessage(lastMsg.channel_id, {
                                    allowed_mentions: { parse: [], replied_user: message.author.id === author.id },
                                    message_reference: (lastMsg === message) ? { message_id: message.id } : undefined,
                                    content: text.slice(0, newLineAt),
                                    components: [{
                                        type: 1, components: [{
                                            type: 2, style: 5, label: `${count++} / ~`,
                                            url: `https://discord.com/channels/${lastMsg.guild_id ?? '@me'}/${lastMsg.channel_id}/${lastMsg.id}`
                                        }]
                                    }]
                                });
                                await type();
                                text = text.slice(newLineAt);
                            } else {
                                while (text.length > 2000) {
                                    lastMsg = await sendMessage(lastMsg.channel_id, {
                                        allowed_mentions: { parse: [], replied_user: message.author.id === author.id },
                                        message_reference: (lastMsg === message) ? { message_id: message.id } : undefined,
                                        content: text.slice(0, 2000),
                                        components: [{
                                            type: 1, components: [{
                                                type: 2, style: 5, label: `${count++} / ~`,
                                                url: `https://discord.com/channels/${lastMsg.guild_id ?? '@me'}/${lastMsg.channel_id}/${lastMsg.id}`
                                            }]
                                        }]
                                    });
                                    text = text.slice(2000);
                                }
                                await type();
                            }
                        }
                    }
                }
            } else if (i.type === 'component') {
                if (i.component.type === 'function_call') {
                    const func = ctx.agent._functions[i.component.name];
                    calls.push({
                        name: i.component.name,
                        info: func?.info?.(i.component.arguments, ctx._context) ?? i.component.name,
                        detail: func?.detail?.(i.component.arguments, ctx._context) ?? i.component.name,
                    });
                    console.log(calls[calls.length - 1]);
                } else if (i.component.type === 'function_response') {
                    responses.push(i.component);
                    console.log(responses[responses.length - 1]);
                }
            } else if (i.type === 'end') {
                if (!text.trim() && (calls.length === 0) && (responses.length === 0)) return;

                lastMsg = await sendMessage(lastMsg.channel_id, {
                    allowed_mentions: { parse: [], replied_user: message.author.id === author.id },
                    message_reference: (lastMsg === message) ? { message_id: message.id } : undefined,
                    embeds: (calls.length > 0 || responses.length > 0 || count > 1) ? [{
                        color: 0x000000,
                        image: { url: 'attachment://msg.daiv2' },
                        description: ui.functionInfo(calls, responses)
                    }] : [],
                    content: text,
                    components: (count > 1) ? [{
                        type: 1, components: [
                            ...(count > 1 ? [{
                                type: 2, style: 5, label: `${count} / ${count}`,
                                url: `https://discord.com/channels/${lastMsg.guild_id ?? '@me'}/${lastMsg.channel_id}/${lastMsg.id}`
                            }] : [])
                        ]
                    }] : undefined
                }, (calls.length > 0 || responses.length > 0 || count > 1) ? [
                    new Attachment(
                        'msg.daiv2', 'application/x-daiv2',
                        daiv2Tool.encrypt({
                            current: i.conversation.last,
                            ref: message.id
                        })
                    )
                ] : undefined).catch(async e => console.error(await e.res.text()));
            }
        }
    } catch (err) {
        console.error(`\x1b[90mGenerate /\x1b[0m Error while generating response:`, err.message);
        lastMsg = await sendMessage(lastMsg.channel_id, {
            allowed_mentions: { parse: [], replied_user: message.author.id === author.id },
            message_reference: (lastMsg === message) ? { message_id: message.id } : undefined,
            embeds: [{
                color: 0xFF0000,
                image: { url: 'attachment://err.daiv2' },
                title: config.ui.generateErrorTitle,
                description: config.ui.generateErrorMessage
            }],
            components: [{
                type: 1, components: [
                    ...(count > 1 ? [{
                        type: 2, style: 5, label: `${count} / ${count}`, emoji: { name: '⚠️' },
                        url: `https://discord.com/channels/${lastMsg.guild_id ?? '@me'}/${lastMsg.channel_id}/${lastMsg.id}`
                    }] : []),
                    {
                        type: 2, style: 2, emoji: { name: '🔄' },
                        custom_id: `d2:regen?ch=${message.channel_id}&msg=${message.id}`
                    }
                ]
            }]
        }, [new Attachment('err.daiv2', 'application/x-daiv2', daiv2Tool.encrypt({ msg: err.message, code: err.code, cause: err.cause, stack: err.stack, conversation }))]);
    }
}