/*
DiscordAI v2
The best AI bot framework on Discord.

core/interactions/message.js

by JustApple
*/

// load config and client
import { config, client, userDB, getUser, user } from './../startup.js';
import * as ui from './../ui.js';
import { generate as gen } from './../ai.js';

// accept tos and pp
export async function tosppAcpt(d) {
    const author = d.user || d.member.user;
    const user = await getUser(author.id); // make sure user exists
    await userDB.setLineByField('id', author.id, { policy_accept: Date.now() }); // update line
    console.log(`\x1b[90mPolicy / \x1b[34m${author.username}\x1b[90m (${author.id})\x1b[0m accepted ToS and PP.`);

    // response
    await client.request('POST', `/interactions/${d.id}/${d.token}/callback`, {
        type: 7, // channel message
        data: ui.policyAccepted(d)
    });

    // send setup / welcome message
    if (user.policy_accept === 0) {
        try {
            // get user dm channel
            const dm = await client.request('POST', '/users/@me/channels', {
                recipient_id: author.id
            });

            // send welcome message to dm
            await client.request('POST', `/channels/${dm.id}/messages`, ui.welcomeMessage);
        } catch (err) {
            console.warn(`\x1b[90mSetup /\x1b[0m Failed to let user \x1b[34m${author.username} \x1b[90m(${author.id})\x1b[0m setup: ${err.message}`);
        }
    }
}

// reject tos or pp
export async function tosppRjct(d) {
    // response
    await client.request('POST', `/interactions/${d.id}/${d.token}/callback`, {
        type: 7, // update message
        data: ui.policyRejected(d)
    });
}

// dev delete account
export async function devDelAcc(d) {
    const author = d.user || d.member.user;

    // delete account
    await userDB.deleteLineByField('id', author.id);

    // response
    await client.request('POST', `/interactions/${d.id}/${d.token}/callback`, {
        type: 4, // channel message
        data: {
            flags: 1 << 6,
            content: '```\nAction completed.\n```'
        }
    });
}

// regenerate
export async function regen(d) {
    const author = d.user || d.member.user;

    // loading
    await client.request('POST', `/interactions/${d.id}/${d.token}/callback`, {
        type: 4, // channel message
        data: ui.regeneratingButton(d)
    });

    // generate response
    await gen(d.message, author);

    // delete error and loading
    await client.request('DELETE', `/webhooks/${user.id}/${d.token}/messages/@original`);
    await client.request('DELETE', `/channels/${d.message.channel_id}/messages/${d.message.id}`);
}