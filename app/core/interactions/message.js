/*
DiscordAI v2
The best AI bot framework on Discord.

core/interactions/message.js

by JustApple
*/

// load config and client
import { config, client, userDB, getUser } from './../startup.js';
import * as ui from './../ui.js';

// accept tos and pp
export async function tosppAcpt(d) {
    const author = d.user || d.member.user;
    const user = await getUser(author.id); // make sure user exists
    await userDB.setLineByField('id', author.id, { policy_accept: Date.now() }); // update line

    // response
    await client.request('POST', `/interactions/${d.id}/${d.token}/callback`, {
        type: 4, // channel message
        data: ui.policyAccepted(d)
    });

    // delete original message
    await client.request('DELETE', `/channels/${d.message.channel_id}/messages/${d.message.id}`);
}

// reject tos or pp
export async function tosppRjct(d) {
    // response
    await client.request('POST', `/interactions/${d.id}/${d.token}/callback`, {
        type: 4, // channel message
        data: ui.policyRejected(d)
    });

    // delete original message
    await client.request('DELETE', `/channels/${d.message.channel_id}/messages/${d.message.id}`);
}