/*
DiscordAI v2
The best AI bot framework on Discord.

core/interactions/command.js

by JustApple
*/

// load config and client
import { config, client, getUser } from './../startup.js';
import * as ui from './../ui.js';

// dash board
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
        data: config.users.admin.has(author.id) ? ui.adminDashboard(d, user) : ui.dashboard(d, user)
    });
}