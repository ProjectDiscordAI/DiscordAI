/*
DiscordAI v2
The best AI bot framework on Discord.

core/interactions/command.js

by JustApple
*/

// load config and client
import { config, client, getUser, user } from './../startup.js';
import * as ui from './../ui.js';
import { generate as gen } from './../ai.js';

// dashboard
export async function dashboard(d) {
    const author = d.user || d.member.user;

    // load user from database
    let user = await getUser(author.id);

    // time and check banned
    const now = Date.now();
    if (user.banned_until > now) {
        await client.request('POST', `/interactions/${d.id}/${d.token}/callback`, {
            type: 4, // channel message
            data: ui.bannedMessage(null, author, user)
        });
        return;
    }

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

    //delete loading
    await client.request('DELETE', `/webhooks/${user.id}/${d.token}/messages/@original`);
}