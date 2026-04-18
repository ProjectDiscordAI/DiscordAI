/*
DiscordAI v2
The best AI bot framework on Discord.

core/interactions/command.js

by JustApple
*/

// load config and client
import { config, client, getUser, user, daiv2Cacher, daiv2Tool } from './../startup.js';
import * as ui from './../ui.js';
import { generate as gen } from './../ai.js';
import jn_dc from '@jnode/discord';
const { Attachment } = jn_dc;
import { request } from '@jnode/request';

// dashboard
export async function dashboard(d) {
    const author = d.user || d.member.user;

    // load user from database
    let user = await getUser(author.id);

    // check policy accept status
    if (user.policy_accept < config.policy.update) {
        await client.request('POST', `/interactions/${d.id}/${d.token}/callback`, {
            type: 4, // channel message
            data: ui.policyMessage(d.message, author)
        });
        return;
    }

    // response
    await client.request('POST', `/interactions/${d.id}/${d.token}/callback`, {
        type: 4, // channel message
        data: config.users.dev.has(author.id) ? ui.devDashboard(d, user) : ui.dashboard(d, user)
    });
}

// generate response
export async function generate(d) {
    const author = d.user || d.member.user;

    // loading
    await client.request('POST', `/interactions/${d.id}/${d.token}/callback`, {
        type: 4, // channel message
        data: ui.generatingCommand(d)
    });

    // generate response
    await gen(d.data.resolved.messages[d.data.target_id], author);

    // delete loading
    await client.request('DELETE', `/webhooks/${user.id}/${d.token}/messages/@original`);
}

// report command
export async function report(d) {
    const author = d.user || d.member.user;
    const msg = d.data.resolved.messages[d.data.target_id];

    if (config.users.dev.has(author.id)) {
        // check daiv2 file
        const attachments = [new Attachment('message.json', 'text/json', JSON.stringify(msg, null, 3))];
        if (msg.embeds?.[0]?.image?.url) {
            const url = new URL(msg.embeds[0].image.url);

            if (url.pathname.endsWith('.daiv2')) {
                const data = await daiv2Cacher.get(`${msg.channel_id}/${msg.id}`, async () => {
                    return daiv2Tool.decrypt(await (await request('GET', url)).buffer())?.data;
                });

                attachments.push(new Attachment('daiv2.json', 'text/json', JSON.stringify(data, null, 3)));
            }
        }

        await client.request('POST', `/interactions/${d.id}/${d.token}/callback`, {
            type: 4, // channel message
            data: {
                flags: 1 << 6
            }
        }, attachments);
    } else {

    }
}

export async function use(d) {
    await client.request('POST', `/interactions/${d.id}/${d.token}/callback`, {
        type: 4, // channel message
        data: ui.useModel(null, Number(d.data.options[0].value))
    });
}

export async function switcher(d) {
    await client.request('POST', `/interactions/${d.id}/${d.token}/callback`, {
        type: 9, // modal
        data: ui.switchModal(d)
    });

    // await client.request('POST', `/channels/${d.message.channel_id}/messages`, ui.useModel(d.message, Number(d.data.options[0].value)));
}