/*
DiscordAI v2
The best AI bot framework on Discord.

core/ai.js

by JustApple
*/

// dependencies
import ai from '@jnode/ai';
import { request } from '@jnode/request';
import { config, client, daiv2Tool, user, userDB, fileCacher, daiv2Cacher, instructions, getUser, tasks, getMessage, models, getUserMemory, getTime, getUserConfig } from './startup.js';
import live from './../ai/live.js';
import path from 'path';
import fs from 'fs/promises';
import * as ui from './ui.js';
import { messageStreamInteract } from './markdown.js';

// constants
const MODEL_BINDING = {
    1100: 'default',
    1101: 'fast',
    1102: 'pro'
};

// load toolkits
const toolkits = {};
const dir = await fs.readdir('./toolkits/', { withFileTypes: true });
for (let i of dir) {
    if (!i.isFile()) continue;
    if (i.name.startsWith('.')) continue;

    const ext = path.extname(i.name);
    if (!(ext === '.js' || ext === '.mjs' || ext === '.cjs')) continue;

    toolkits[path.basename(i.name, ext)] = (await import(path.resolve(i.parentPath, i.name))).default;
}

// generate response
export async function generate(message, author = message.author) {
    // load user from database
    let user = await getUser(author.id);

    // time and check banned
    const now = Date.now();
    if (user.banned_until > now) {
        client.request('POST', `/channels/${message.channel_id}/messages`, ui.bannedMessage(message, author, user));
        return;
    }

    // check policy accept status
    if (user.policy_accept < config.policy.update) {
        client.request('POST', `/channels/${message.channel_id}/messages`, ui.policyMessage(message, author));
        return;
    }

    // check user credits
    if (user.free_credits + user.paid_credits < config.credit.basic) {
        client.request('POST', `/channels/${message.channel_id}/messages`, ui.notEnoughCredits(message, author, user));
        return;
    }

    // pre-auth
    const freeCreditsTaken = (user.free_credits >= config.credit.basic) ? config.credit.basic : user.free_credits;
    const paidCreditsTaken = (user.free_credits >= config.credit.basic) ? 0n : config.credit.basic - user.free_credits;
    await userDB.setLineByField('id', user.id, { free_credits: user.free_credits - freeCreditsTaken, paid_credits: user.paid_credits - paidCreditsTaken });

    let ctx = {};

    const task = Symbol('generateResponseTask');
    try {
        // task monitor
        tasks.add(task);

        // build conversation
        const { conversation: conv, instruction, rootMessage, model, files } = await buildConversation(message, author);

        // load user config
        const userConfig = await getUserConfig(author.id);

        // build functions
        const functions = [toolkits.default];
        if (config.users.dev.has(author.id)) functions.push(toolkits.dev);
        if (userConfig?.toolkit) { // user remote toolkit

        }
        config.ai.userToolkits.map(kit => functions.push(toolkits[kit]));

        // build agent
        const agent = new ai.AIAgent(models[model], {
            instructions: instruction,
            functions: functions
        });

        // build conversation
        const conversation = new ai.AIConversation(agent, conv);

        // build context
        ctx = {
            rootMessage: rootMessage,
            conversation: conversation,
            author: author,
            agent: agent,
            price: 0n,
            _context: {
                rootMessage: rootMessage,
                conversation: conversation,
                author: author,
                agent: agent,
                files: files
            },
            _service: userConfig?.service,
            _model: userConfig?.model,
            _auth: userConfig?.auth
        };

        // start typing
        client.request('POST', `/channels/${message.channel_id}/typing`, {});

        // log
        console.log(`\x1b[90mGenerate / \x1b[34m${author.username}\x1b[90m (${author.id})\x1b[0m activates an response with ${conv.length} messages.`);

        // generate
        await messageStreamInteract(await conversation.streamInteract([], ctx, {}), ctx);

        // show price
        if (config.users.dev.has(author.id)) client.request('POST', `/channels/${message.channel_id}/messages`, {
            content: `-# \`${conversation.meta.model}\` 💸 \`${Number(ctx.price) / 1000000000}\` 📄 \`${Object.keys(ctx._context.files).join('`, `') || '-'}\``
        });
    } catch (err) {
        console.error(err)
        console.error(await err.res.json())
    } finally {
        // task finished
        tasks.delete(task);

        // capture
        userDB._doTask(async () => {
            const { fields } = await userDB.readLineByField('id', user.id, true);
            const additionalFee = ctx.price - config.credit.basic;
            if (additionalFee === 0n) return;
            else if (additionalFee > 0n) {
                let additionalFreeTaken = (fields.free_credits >= additionalFee) ? additionalFee : fields.free_credits;
                let additionalPaidTaken = (fields.free_credits >= additionalFee) ? 0n : additionalFee - fields.free_credits;
                if (additionalPaidTaken > fields.paid_credits) {
                    additionalFreeTaken += additionalPaidTaken - fields.paid_credits;
                    additionalPaidTaken = fields.paid_credits;
                }
                await userDB.setLineByField('id', user.id, { free_credits: fields.free_credits - additionalFreeTaken, paid_credits: fields.paid_credits - additionalPaidTaken }, true);
                return;
            } else if (additionalFee < 0n) {
                const additionalPaidReturn = (-additionalFee >= paidCreditsTaken) ? paidCreditsTaken : -additionalFee;
                const additionalFreeReturn = (-additionalFee >= paidCreditsTaken) ? -additionalFee - paidCreditsTaken : 0n;
                await userDB.setLineByField('id', user.id, { free_credits: fields.free_credits + additionalFreeReturn, paid_credits: fields.paid_credits + additionalPaidReturn }, true);
                return;
            }
        });
    }
}

// build conversation
export async function buildConversation(message, author) {
    let conversation = [];
    let ref = message;
    let rootMessage = message;
    let files = {};

    // loop for collecting messages
    let instruction = '';
    let model;
    while (ref) {
        let msg = ref;
        ref = null;
        if (!msg) break;

        let isModel = msg.author.id === user.id;
        let aiMsg = { role: isModel ? 'model' : 'user', components: [] };
        let btnUrl;

        // check reply
        if (msg.referenced_message) {
            ref = msg.referenced_message;
        } else if (msg.message_snapshots) {
            ref = msg.message_snapshots[0].message;
        } else if (msg.message_reference) {
            ref = await getMessage(msg.message_reference.channel_id, msg.message_reference.message_id);
        }

        if (isModel) { // model message
            // dai special message flag
            if (msg.flags & (1 << 15)) {
                if (msg.components?.[0]?.id === 1001) { // setup message
                    instruction = instructions.setup;
                } else if (msg.components?.[0]?.id >= 1100 && msg.components?.[0]?.id < 1200) { // model config
                    model ??= MODEL_BINDING[msg.components?.[0]?.id];
                    continue;
                }
                break;
            }

            // check ref
            if (
                msg.components?.[0]?.type === 1 && // action row
                msg.components[0].components?.[0]?.type === 2 && // button
                msg.components[0].components[0].style === 5 && // link button
                msg.components[0].components[0].url.startsWith('https://discord.com/channels/') // discord url
            ) {
                btnUrl = new URL(msg.components[0].components[0].url);
                ref = await getMessage(message.channel_id, btnUrl.pathname.split('/')[4]);
            }

            // hidden daiv2 file
            if (msg.embeds?.[0]?.image?.url) {
                const url = new URL(msg.embeds[0].image.url);

                if (url.pathname.endsWith('/msg.daiv2')) {
                    const data = await daiv2Cacher.get(`${msg.channel_id}/${msg.id}`, async () => {
                        return daiv2Tool.decrypt(await (await request('GET', url)).buffer())?.data;
                    });

                    // the data exists
                    if (data) {
                        if (data.current) conversation.unshift(data.current); // current (commonly function call)
                        if (data.previous) conversation.unshift(data.previous); // previous (commonly function response)
                        if (data.ref) ref = await getMessage(message.channel_id, data.ref); // reference
                        if (data.files && Object.keys(data.files).length > 0) files = Object.assign(data.files, files);

                        continue;
                    }
                } else if (url.pathname.endsWith('/err.daiv2')) {
                    rootMessage = ref;
                    continue;
                }
            }
        } else { // user message
            if (msg.flags & (1 << 15)) continue; // cv2 message by bot, skip for now

            // system message
            let systemMessage = '';
            systemMessage += `>>> [${msg.author.id}] ${msg.author.global_name ?? msg.author.username}\n`
            systemMessage += `    (${msg.id}|${getTime(msg.timestamp)})\n`;

            // attachments
            for (let i of (msg.attachments ?? [])) {
                if (i.content_type) {
                    if (i.filename === 'message.txt' || i.filename === 'message.md') {
                        const data = await fileCacher.get(`${msg.channel_id}/${msg.id}/${i.filename}`, async () => {
                            return (await request('GET', i.url)).text();
                        });

                        aiMsg.components.push({
                            type: 'text',
                            content: data
                        });
                        continue;
                    } else {
                        aiMsg.components.push({
                            type: 'file',
                            mediaType: i.content_type,
                            uri: i.url
                        });
                    }
                }
                systemMessage += `    + [${i.filename}](${i.url})${i.width && i.height ? `: ${i.width}*${i.height}` : ''}\n`;
            }

            // unshift system message
            systemMessage += '\n';
            aiMsg.components.unshift({
                type: 'text',
                content: systemMessage
            });
        }

        // parse as normal message
        let text = '';
        if (btnUrl?.searchParams.get('bef')) text += btnUrl.searchParams.get('bef') ?? '';
        text += (msg.content ?? '').slice(Number(btnUrl?.searchParams.get('delb') ?? 0), (msg.content ?? '').length - Number(btnUrl?.searchParams.get('dele') ?? 0));
        if (btnUrl?.searchParams.get('aft')) text += btnUrl.searchParams.get('aft') ?? '';
        aiMsg.components.push({
            type: 'text',
            content: text
        });

        // push to conversation
        conversation.unshift(aiMsg);
    }

    // build instruction
    instruction = instructions.core + (instruction ? '\n\n' + instruction : '');

    // get live infomation
    const liveInfo = await live(message, author);
    instruction += '\n\n' + liveInfo;

    // get user memory
    const memories = (await getUserMemory(author.id)).lines;
    const categories = {};
    for (let i = 0; i < memories.length; i++) {
        const memory = memories[i];
        const category = memory.category ?? 'Main*';
        categories[category] = categories[category] ?? {};

        // addition to
        if (categories[category][memory.addition_to]) {
            categories[category][memory.addition_to].additions = categories[category][memory.addition_to].additions ?? {};
            categories[category][memory.addition_to].additions[i] = memory;
        } else {
            categories[category][i] = memory;
        }
    }
    instruction += '\n\n' + config.ai.memoryTitle + '\n';
    for (let i in categories) {
        instruction += `\n## ${i} (${Object.keys(categories[i]).length})`;

        if (i.endsWith('*')) { // expand
            for (let j in categories[i]) {
                const m = categories[i][j];
                instruction += `\n${j}. ${m.description} [${m.note ? config.ai.hasNote : ''}${m.conversation ? config.ai.hasConversation : ''}${getTime(m.time)}]`;
                if (m.additions) {
                    for (let k in m.additions) {
                        const am = m.additions[k];
                        instruction += `\n  ${k}. ${am.description} [${am.note ? config.ai.hasNote : ''}${am.conversation ? config.ai.hasConversation : ''}${getTime(am.time)}]`;
                    }
                }
            }
        }
    }

    model ??= 'default';

    // return
    return { conversation, instruction, rootMessage, model, files };
}