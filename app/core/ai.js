/*
DiscordAI v2
The best AI bot framework on Discord.

core/ai.js

by JustApple
*/

// dependencies
import ai from '@jnode/ai';
import { request } from '@jnode/request';
import { config, client, daiv2Tool, user, userDB, daiv2Cacher, instructions, getUser, tasks, getMessage } from './startup.js';
import { extname } from 'path';
import * as ui from './ui.js';

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

    // build conversation
    const conversation = await buildConversation(message);
}

// build conversation
export async function buildConversation(message) {
    let conversation = [];
    let ref = message;

    // loop for collecting messages
    let instruction = instructions.core + '\n\n';
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

                if (extname(url.pathname) === '.daiv2') {
                    const data = await daiv2Cacher.get(`${msg.channel_id}/${msg.id}`, async () => {
                        return daiv2Tool.decrypt(await (await request('GET', url)).body())?.data;
                    });

                    // the data exists
                    if (data) {
                        if (data.current) conversation.unshift(data.current); // current (commonly function call)
                        if (data.pervious) conversation.unshift(data.pervious); // pervious (commonly function response)
                        if (data.ref) ref = await getMessage(message.channel_id, data.ref); // reference

                        continue;
                    }
                }
            }
        } else { // user message
            if (msg.flags & (1 << 15)) continue; // cv2 message by bot, skip for now

            // system message
            let systemMessage = '';
            systemMessage += `>>> [${msg.author.id}] ${msg.author.global_name ?? msg.author.username}\n`
            systemMessage += `    (${msg.id}|${(new Date(msg.timestamp)).toLocaleString(config.core.lang, config.core.localeStringOptions)})\n`;

            // attachments
            for (let i of (msg.attachments ?? [])) {
                systemMessage += `    + [${i.filename}](${i.url})${i.width && i.height ? `: ${i.width}*${i.height}` : ''}\n`;
                if (i.content_type) {
                    aiMsg.components.push({
                        type: 'file',
                        mediaType: i.content_type,
                        uri: i.url
                    });
                }
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
        if (btnUrl?.searchParams.get('bef')) text += btnUrl.searchParams.get('bef');
        text += msg.content;
        if (btnUrl?.searchParams.get('aft')) text += btnUrl.searchParams.get('aft');
        aiMsg.components.push({
            type: 'text',
            content: text
        });

        // push to conversation
        conversation.push(aiMsg);
    }

    console.log(JSON.stringify(conversation, null, 3));

    // return
    return conversation;
}