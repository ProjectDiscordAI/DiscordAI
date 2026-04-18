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
import { config, client, messageCacher, daiv2Tool, daiv2Cacher } from './startup.js';
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

function getCodeblockLen(str) {
    let i;
    for (i = 0; i < str.length; i++) if (str[i] !== '`') break;
    return i;
}

// stream interact in discord messages
export async function messageStreamInteract(interactStream, ctx) {
    const stream = interactToLine(interactStream);
    ctx.text = ctx.text ?? '';
    ctx.code = ctx.code ?? '';
    ctx.executed = ctx.executed ?? false;
    ctx.autoRan = ctx.autoRan ?? 0;

    let autoRun = true;
    ctx.calls = ctx.calls ?? [];
    const calls = ctx.calls;
    ctx.responses = ctx.responses ?? [];
    const responses = ctx.responses;

    const message = ctx.rootMessage;
    const author = ctx.author;
    const conversation = ctx.conversation.conversation;

    ctx.lastMsg = ctx.lastMsg ?? message;

    ctx.count = ctx.count ?? 1;

    ctx.inCodeblock = ctx.inCodeblock ?? false;
    ctx.codeblockLang = ctx.codeblockLang ?? '';
    ctx.codeblockLen = ctx.codeblockLen ?? 3;

    ctx.h1At = ctx.h1At ?? 0;
    ctx.h2At = ctx.h2At ?? 0;
    ctx.h3At = ctx.h3At ?? 0;
    ctx.emptyLineAt = ctx.emptyLineAt ?? 0;
    ctx.newLineAt = ctx.newLineAt ?? 0;

    // type
    function type() {
        return client.request('POST', `/channels/${message.channel_id}/typing`, {});
    }
    await type();

    try {
        for await (let i of stream) {
            if (i.type === 'line') {
                if (ctx.inCodeblock) {
                    const codeBlockLen = getCodeblockLen(i.line);
                    if (codeBlockLen >= ctx.codeblockLen) {
                        const langDot = ctx.codeblockLang.indexOf('.');
                        if ((ctx.code.length + 8 + ctx.codeblockLang.length > 2000) || (langDot >= 0)) { // send as file
                            ctx.lastMsg = await sendMessage(ctx.lastMsg.channel_id, {
                                allowed_mentions: { parse: [], replied_user: message.author.id === author.id },
                                message_reference: (ctx.lastMsg === message) ? { message_id: message.id } : undefined,
                                content: ctx.text,
                                components: [{
                                    type: 1, components: [{
                                        type: 2, style: 5, label: `${ctx.count++} / ~`,
                                        url: `https://discord.com/channels/${ctx.lastMsg.guild_id ?? '@me'}/${ctx.lastMsg.channel_id}/${ctx.lastMsg.id}`
                                    }]
                                }],
                                attachments: [{
                                    id: 0,
                                    title: (langDot >= 0) ? ctx.codeblockLang.slice(0, langDot) : 'code'
                                }]
                            }, [new Attachment((langDot >= 0) ? 'code' + ctx.codeblockLang.slice(langDot) : ctx.codeblockLang ? `code.${ctx.codeblockLang}` : 'code.txt', 'text/plain', ctx.code)]);
                            await type();
                            if (langDot >= 0) ctx._context.files[ctx.codeblockLang] = ctx.code;
                            ctx.code = '';
                            ctx.text = '';
                            ctx.codeblockLang = '';
                        } else if (ctx.code.length + 8 + ctx.codeblockLang.length + ctx.text.length > 2000) {
                            // send text part
                            ctx.lastMsg = await sendMessage(ctx.lastMsg.channel_id, {
                                allowed_mentions: { parse: [], replied_user: message.author.id === author.id },
                                message_reference: (ctx.lastMsg === message) ? { message_id: message.id } : undefined,
                                content: ctx.text,
                                components: [{
                                    type: 1, components: [{
                                        type: 2, style: 5, label: `${ctx.count++} / ~`,
                                        url: `https://discord.com/channels/${ctx.lastMsg.guild_id ?? '@me'}/${ctx.lastMsg.channel_id}/${ctx.lastMsg.id}`
                                    }]
                                }]
                            });
                            await type();
                            ctx.text = '```' + ctx.codeblockLang + '\n' + ctx.code + '```\n';
                            ctx.code = '';
                            ctx.codeblockLang = '';
                        } else {
                            // bring code to text
                            ctx.text += '```' + ctx.codeblockLang + '\n' + ctx.code + '```\n';
                            ctx.code = '';
                            ctx.codeblockLang = '';
                        }
                        ctx.inCodeblock = false;
                    } else {
                        ctx.code += i.line + '\n';
                    }
                } else {
                    const codeBlockLen = getCodeblockLen(i.line);
                    if (codeBlockLen >= 3) {
                        ctx.codeblockLang = i.line.slice(codeBlockLen);
                        ctx.inCodeblock = true;
                        ctx.codeBlockLen = codeBlockLen;
                    } else {
                        if (i.line === '') ctx.emptyLineAt = ctx.text.length;
                        ctx.newLineAt = ctx.text.length;
                        ctx.text += i.line + '\n';

                        if (ctx.text.length > 2000) {
                            if (ctx.text.length - ctx.h1At <= 2000) {
                                ctx.lastMsg = await sendMessage(ctx.lastMsg.channel_id, {
                                    allowed_mentions: { parse: [], replied_user: message.author.id === author.id },
                                    message_reference: (ctx.lastMsg === message) ? { message_id: message.id } : undefined,
                                    content: ctx.text.slice(0, ctx.h1At),
                                    components: [{
                                        type: 1, components: [{
                                            type: 2, style: 5, label: `${ctx.count++} / ~`,
                                            url: `https://discord.com/channels/${ctx.lastMsg.guild_id ?? '@me'}/${ctx.lastMsg.channel_id}/${ctx.lastMsg.id}`
                                        }]
                                    }]
                                });
                                await type();
                                ctx.text = ctx.text.slice(ctx.h1At);
                            } else if (ctx.text.length - ctx.h2At <= 2000) {
                                ctx.lastMsg = await sendMessage(ctx.lastMsg.channel_id, {
                                    allowed_mentions: { parse: [], replied_user: message.author.id === author.id },
                                    message_reference: (ctx.lastMsg === message) ? { message_id: message.id } : undefined,
                                    content: ctx.text.slice(0, ctx.h2At),
                                    components: [{
                                        type: 1, components: [{
                                            type: 2, style: 5, label: `${ctx.count++} / ~`,
                                            url: `https://discord.com/channels/${ctx.lastMsg.guild_id ?? '@me'}/${ctx.lastMsg.channel_id}/${ctx.lastMsg.id}`
                                        }]
                                    }]
                                });
                                await type();
                                ctx.text = ctx.text.slice(ctx.h2At);
                            } else if (ctx.text.length - ctx.h3At <= 2000) {
                                ctx.lastMsg = await sendMessage(ctx.lastMsg.channel_id, {
                                    allowed_mentions: { parse: [], replied_user: message.author.id === author.id },
                                    message_reference: (ctx.lastMsg === message) ? { message_id: message.id } : undefined,
                                    content: ctx.text.slice(0, ctx.h3At),
                                    components: [{
                                        type: 1, components: [{
                                            type: 2, style: 5, label: `${ctx.count++} / ~`,
                                            url: `https://discord.com/channels/${ctx.lastMsg.guild_id ?? '@me'}/${ctx.lastMsg.channel_id}/${ctx.lastMsg.id}`
                                        }]
                                    }]
                                });
                                await type();
                                ctx.text = ctx.text.slice(ctx.h3At);
                            } else if (ctx.text.length - ctx.emptyLineAt <= 2000) {
                                ctx.lastMsg = await sendMessage(ctx.lastMsg.channel_id, {
                                    allowed_mentions: { parse: [], replied_user: message.author.id === author.id },
                                    message_reference: (ctx.lastMsg === message) ? { message_id: message.id } : undefined,
                                    content: ctx.text.slice(0, ctx.emptyLineAt),
                                    components: [{
                                        type: 1, components: [{
                                            type: 2, style: 5, label: `${ctx.count++} / ~`,
                                            url: `https://discord.com/channels/${ctx.lastMsg.guild_id ?? '@me'}/${ctx.lastMsg.channel_id}/${ctx.lastMsg.id}`
                                        }]
                                    }]
                                });
                                await type();
                                ctx.text = ctx.text.slice(ctx.emptyLineAt);
                            } else if (ctx.text.length - ctx.newLineAt <= 2000) {
                                ctx.lastMsg = await sendMessage(ctx.lastMsg.channel_id, {
                                    allowed_mentions: { parse: [], replied_user: message.author.id === author.id },
                                    message_reference: (ctx.lastMsg === message) ? { message_id: message.id } : undefined,
                                    content: ctx.text.slice(0, ctx.newLineAt),
                                    components: [{
                                        type: 1, components: [{
                                            type: 2, style: 5, label: `${ctx.count++} / ~`,
                                            url: `https://discord.com/channels/${ctx.lastMsg.guild_id ?? '@me'}/${ctx.lastMsg.channel_id}/${ctx.lastMsg.id}`
                                        }]
                                    }]
                                });
                                await type();
                                ctx.text = ctx.text.slice(ctx.newLineAt);
                            } else {
                                while (ctx.text.length > 2000) {
                                    ctx.lastMsg = await sendMessage(ctx.lastMsg.channel_id, {
                                        allowed_mentions: { parse: [], replied_user: message.author.id === author.id },
                                        message_reference: (ctx.lastMsg === message) ? { message_id: message.id } : undefined,
                                        content: ctx.text.slice(0, 2000),
                                        components: [{
                                            type: 1, components: [{
                                                type: 2, style: 5, label: `${ctx.count++} / ~`,
                                                url: `https://discord.com/channels/${ctx.lastMsg.guild_id ?? '@me'}/${ctx.lastMsg.channel_id}/${ctx.lastMsg.id}`
                                            }]
                                        }]
                                    });
                                    ctx.text = ctx.text.slice(2000);
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
                        detail: func?.detail?.(i.component.arguments, ctx._context) ?? '```json\n' + JSON.stringify(i.component.arguments, null, 2) + '\n```',
                    });
                    autoRun = autoRun && func?.auto;
                } else if (i.component.type === 'function_response') {
                    responses.push(i.component);
                }
            } else if (i.type === 'end') {
                // calculate price
                ctx.price += i.conversation?.meta?.price || 0n;

                // send overflowed messages
                if (ctx.inCodeblock) {
                    const langDot = ctx.codeblockLang.indexOf('.');
                    if ((ctx.code.length + 8 + ctx.codeblockLang.length > 2000) || langDot >= 0) { // send as file
                        ctx.lastMsg = await sendMessage(ctx.lastMsg.channel_id, {
                            allowed_mentions: { parse: [], replied_user: message.author.id === author.id },
                            message_reference: (ctx.lastMsg === message) ? { message_id: message.id } : undefined,
                            content: ctx.text,
                            components: [{
                                type: 1, components: [{
                                    type: 2, style: 5, label: `${ctx.count++} / ~`,
                                    url: `https://discord.com/channels/${ctx.lastMsg.guild_id ?? '@me'}/${ctx.lastMsg.channel_id}/${ctx.lastMsg.id}`
                                }]
                            }],
                            attachments: [{
                                id: 0,
                                title: (langDot >= 0) ? ctx.codeblockLang.slice(0, langDot) : 'code'
                            }]
                        }, [new Attachment((langDot >= 0) ? 'code' + ctx.codeblockLang.slice(langDot) : ctx.codeblockLang ? `code.${ctx.codeblockLang}` : 'code.txt', 'text/plain', ctx.code)]);
                        await type();
                        if (langDot >= 0) ctx._context.files[ctx.codeblockLang] = ctx.code;
                        ctx.code = '';
                        ctx.text = '';
                        ctx.codeblockLang = '';
                    } else if (ctx.code.length + 8 + ctx.codeblockLang.length + ctx.text.length > 2000) {
                        // send text part
                        ctx.lastMsg = await sendMessage(ctx.lastMsg.channel_id, {
                            allowed_mentions: { parse: [], replied_user: message.author.id === author.id },
                            message_reference: (ctx.lastMsg === message) ? { message_id: message.id } : undefined,
                            content: ctx.text,
                            components: [{
                                type: 1, components: [{
                                    type: 2, style: 5, label: `${ctx.count++} / ~`,
                                    url: `https://discord.com/channels/${ctx.lastMsg.guild_id ?? '@me'}/${ctx.lastMsg.channel_id}/${ctx.lastMsg.id}`
                                }]
                            }]
                        });
                        await type();
                        ctx.text = '```' + ctx.codeblockLang + '\n' + ctx.code + '```\n';
                        ctx.code = '';
                        ctx.codeblockLang = '';
                    } else {
                        // bring code to text
                        ctx.text += '```' + ctx.codeblockLang + '\n' + ctx.code + '```\n';
                        ctx.code = '';
                        ctx.codeblockLang = '';
                    }
                    ctx.inCodeblock = false;
                }

                if (!ctx.text.trim() && (calls.length === 0) && (responses.length === 0) && (ctx.count === 1)) return;

                if ((responses.length > 0) && !ctx.executed) { // again
                    ctx.executed = true;
                    return messageStreamInteract(await i.conversation.streamInteract([], ctx), ctx);
                }

                const daiv2 = {
                    previous: (responses.length > 0) ? i.conversation.conversation[i.conversation.conversation.length - 2] : undefined,
                    current: i.conversation.last,
                    ref: message.id,
                    calls: calls
                };

                ctx.lastMsg = await sendMessage(ctx.lastMsg.channel_id, {
                    allowed_mentions: { parse: [], replied_user: message.author.id === author.id },
                    message_reference: (ctx.lastMsg === message) ? { message_id: message.id } : undefined,
                    embeds: (calls.length > 0 || responses.length > 0 || ctx.count > 1) ? [{
                        color: 0x000000,
                        image: { url: 'attachment://msg.daiv2' },
                        description: ui.functionInfo(calls, responses, autoRun && ctx.autoRan < config.core.maxAutoRun)
                    }] : [],
                    content: ctx.text,
                    components: (ctx.count > 1 || (calls.length > 0 && (!autoRun || ctx.autoRan >= config.core.maxAutoRun))) ? [{
                        type: 1, components: [
                            ...(ctx.count > 1 ? [{
                                type: 2, style: 5, label: `${ctx.count} / ${ctx.count}`,
                                url: `https://discord.com/channels/${ctx.lastMsg.guild_id ?? '@me'}/${ctx.lastMsg.channel_id}/${ctx.lastMsg.id}`
                            }] : []),
                            ...((calls.length > 0 && (!autoRun || ctx.autoRan >= config.core.maxAutoRun)) ? [
                                {
                                    type: 2, style: 1, emoji: config.ui.infoEmoji, label: config.ui.infoLabel,
                                    custom_id: `d2:info`
                                },
                                {
                                    type: 2, style: 3, emoji: config.ui.runEmoji, label: config.ui.runLabel,
                                    custom_id: `d2:run`
                                },
                                {
                                    type: 2, style: 2, emoji: config.ui.ignoreEmoji, label: config.ui.ignoreLabel,
                                    custom_id: `d2:ignore`
                                },
                            ] : []),
                        ]
                    }] : undefined
                }, (calls.length > 0 || responses.length > 0 || ctx.count > 1) ? [
                    new Attachment(
                        'msg.daiv2', 'application/x-daiv2',
                        daiv2Tool.encrypt(daiv2)
                    )
                ] : undefined);

                // save daiv2 to cache
                daiv2Cacher.set(`${ctx.lastMsg.channel_id}/${ctx.lastMsg.id}`, daiv2);

                // auto run
                if (calls.length > 0 && autoRun && ctx.autoRan < config.core.maxAutoRun) {
                    ctx.autoRan++;

                    // reset ctx
                    ctx.text = '';
                    ctx.code = '';
                    ctx.executed = false;

                    ctx.calls = [];
                    ctx.responses = [];

                    ctx.count = 1;
                    ctx.rootMessage = ctx.lastMsg;

                    ctx.inCodeblock = false;
                    ctx.codeblockLang = '';

                    ctx.h1At = 0;
                    ctx.h2At = 0;
                    ctx.h3At = 0;
                    ctx.emptyLineAt = 0;
                    ctx.newLineAt = 0;

                    // run
                    return messageStreamInteract(await i.conversation.streamInteract([], ctx), ctx);
                }
            }
        }
    } catch (err) {
        console.error(`\x1b[90mGenerate /\x1b[0m Error while generating response:`, err.message);
        ctx.lastMsg = await sendMessage(ctx.lastMsg.channel_id, {
            allowed_mentions: { parse: [], replied_user: message.author.id === author.id },
            message_reference: (ctx.lastMsg === message) ? { message_id: message.id } : undefined,
            embeds: [{
                color: 0xFF0000,
                image: { url: 'attachment://err.daiv2' },
                title: config.ui.generateErrorTitle,
                description: config.ui.generateErrorMessage
            }],
            components: [{
                type: 1, components: [
                    ...(ctx.count > 1 ? [{
                        type: 2, style: 5, label: `${ctx.count} / ${ctx.count}`, emoji: { name: '⚠️' },
                        url: `https://discord.com/channels/${ctx.lastMsg.guild_id ?? '@me'}/${ctx.lastMsg.channel_id}/${ctx.lastMsg.id}`
                    }] : []),
                    {
                        type: 2, style: 2, emoji: { name: '🔄' },
                        custom_id: `d2:regen?ch=${message.channel_id}`
                    }
                ]
            }]
        }, [new Attachment('err.daiv2', 'application/x-daiv2', daiv2Tool.encrypt({ msg: err.message, code: err.code, cause: err.cause, stack: err.stack, conversation }))]);
    } finally {

    }
}
