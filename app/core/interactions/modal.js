/*
DiscordAI v2
The best AI bot framework on Discord.

core/interactions/modal.js

by JustApple
*/

// dependencies
import { config, client, getUser, userDB } from './../startup.js';
import * as ui from './../ui.js';

export async function devGetUser(d, params) {
    const author = d.user ?? d.member.user;
    if (!config.users.dev.has(author.id)) return;

    const fields = {
        targetUser: d.data.components[0].component.values[0],
        targetUserId: d.data.components[1].component.value
    };

    const targetUser = fields.targetUserId || fields.targetUser;
    if (!targetUser) return await client.request('POST', `/interactions/${d.id}/${d.token}/callback`, {
        type: 4, // channel message
        data: {
            flags: 1 << 15 | 1 << 6,
            components: [{
                type: 17,
                accent_color: 0xFF0000,
                components: [
                    {
                        type: 10, // text
                        content: `# Error\n> Please select a user with user selector or input user ID.`
                    }
                ]
            }]
        }
    });

    const user = await getUser(targetUser);
    await client.request('POST', `/interactions/${d.id}/${d.token}/callback`, {
        type: 4, // channel message
        data: {
            allowed_mentions: { parse: [] },
            flags: 1 << 15 | 1 << 6,
            components: [{
                type: 17,
                components: [
                    {
                        type: 10, // text
                        content: '# User info\n\n' +
                            `**User**: <@${user.id}>\n` +
                            `**User ID**: \`${user.id}\`\n` +
                            `**Accepted policy at**: <t:${Math.floor(user.policy_accept / 1000)}:S>\n` +
                            `**Banned until**: <t:${Math.floor(user.banned_until / 1000)}:S>\n` +
                            `**Free credits**: \`${Number(user.free_credits) / 1000000000}\` (\`${user.free_credits}\` nano-credits)\n` +
                            `**Paid credits**: \`${Number(user.paid_credits) / 1000000000}\` (\`${user.paid_credits}\` nano-credits)\n` +
                            `**Last free credit refill**: <t:${Math.floor(user.free_update * 3600)}:S>`
                    },
                    { type: 14 },
                    {
                        type: 1,
                        components: [
                            {
                                type: 2, style: 1,
                                label: 'Set credit', custom_id: `d2:devSetCredit?user=${targetUser}#${author.id}`
                            }
                        ]
                    }
                ]
            }]
        }
    });
}

export async function devSetCredit(d, params) {
    const author = d.user ?? d.member.user;
    if (!config.users.dev.has(author.id)) return;

    const fields = {
        freeCredits: d.data.components[1].component.value,
        paidCredits: d.data.components[2].component.value
    };

    // get user
    const user = await getUser(params.get('user'));

    // new credits
    const newCredits = {
        free_credits: fields.freeCredits ? BigInt(fields.freeCredits) : undefined,
        paid_credits: fields.paidCredits ? BigInt(fields.paidCredits) : undefined
    };

    // update credit
    await userDB.setLineByField('id', params.get('user'), newCredits);

    // respond
    await client.request('POST', `/interactions/${d.id}/${d.token}/callback`, {
        type: 4, // channel message
        data: {
            allowed_mentions: { parse: [] },
            flags: 1 << 15 | 1 << 6,
            components: [{
                type: 17,
                accent_color: 0x00FF00,
                components: [
                    {
                        type: 10, // text
                        content: '# Updated user credits\n\n' +
                            `**User**: <@${user.id}>\n` +
                            `**User ID**: \`${user.id}\`\n` +
                            `**Free credits**: \`${Number(user.free_credits) / 1000000000}\` (\`${user.free_credits}\` nano-credits) => \`${Number(newCredits.free_credits ?? user.free_credits) / 1000000000}\` (\`${newCredits.free_credits ?? user.free_credits}\` nano-credits)\n` +
                            `**Paid credits**: \`${Number(user.paid_credits) / 1000000000}\` (\`${user.paid_credits}\` nano-credits) => \`${Number(newCredits.paid_credits ?? user.paid_credits) / 1000000000}\` (\`${newCredits.paid_credits ?? user.paid_credits}\` nano-credits)\n`
                    }
                ]
            }]
        }
    });
}

export async function switchModel(d, params) {
    await client.request('POST', `/interactions/${d.id}/${d.token}/callback`, {
        type: 6 // deferred update message
    });

    await client.request('POST', `/channels/${params.get('ch')}/messages`, ui.useModel({ channel_id: params.get('ch'), id: params.get('msg') }, Number(d.data.components[0].component.values[0])))
}