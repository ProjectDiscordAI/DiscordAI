/*
DiscordAI v2
The best AI bot framework on Discord.

core/interactions/message.js

by JustApple
*/

// load config and client
import { config, client, userDB, getUser, user, daiv2Cacher, daiv2Tool, getMessage } from './../startup.js';
import * as ui from './../ui.js';
import { generate as gen } from './../ai.js';
import { request } from '@jnode/request';

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

// run functions
export async function run(d) {
    const author = d.user || d.member.user;

    // loading
    await client.request('POST', `/interactions/${d.id}/${d.token}/callback`, {
        type: 4, // channel message
        data: ui.regeneratingButton(d)
    });

    // generate response
    await gen(d.message, author);

    // delete loading and remove components
    await client.request('PATCH', `/channels/${d.message.channel_id}/messages/${d.message.id}`, {
        components: (d.message.components[0].components[0].style === 5) ? [
            {
                type: 1,
                components: [d.message.components[0].components[0]]
            }
        ] : []
    });
    await client.request('DELETE', `/webhooks/${user.id}/${d.token}/messages/@original`);
}

// ignore functions
export async function ignore(d) {
    const author = d.user || d.member.user;

    // remove components
    await client.request('POST', `/interactions/${d.id}/${d.token}/callback`, {
        type: 7, // update message
        data: {
            components: (d.message.components[0].components[0].style === 5) ? [
                {
                    type: 1,
                    components: [d.message.components[0].components[0]]
                }
            ] : []
        }
    });
}

// function info
export async function info(d, params) {
    const author = d.user || d.member.user;

    // get daiv2 and calls
    const msg = d.message.embeds?.[0]?.image?.url ? d.message : await getMessage(params.get('ch'), params.get('msg'));
    const url = new URL(msg.embeds[0].image.url);
    const data = await daiv2Cacher.get(`${msg.channel_id}/${msg.id}`, async () => {
        return daiv2Tool.decrypt(await (await request('GET', url)).buffer())?.data;
    });
    const calls = data.calls ?? [];

    const i = Number(params.get('i')) ?? 0;

    // response
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
                        content: `${config.ui.callInfoTitle} (${i + 1}/${calls.length})`
                    },
                    {
                        type: 10, // text
                        content: `**${calls[i].info}**`
                    },
                    {
                        type: 10, // text
                        content: `-# \`${calls[i].name}\``
                    },
                    {
                        type: 10, // text
                        content: calls[i].detail
                    },
                    ...(calls.length > 1 ? [
                        { type: 14 }, // divider
                        {
                            type: 1,
                            components: [
                                ...((i > 0) ? [{
                                    type: 2, style: 2, // secondary button
                                    emoji: { name: '◀️' },
                                    custom_id: `d2:info?i=${i - 1}&ch=${msg.channel_id}&msg=${msg.id}`
                                }] : []),
                                ...((i + 1 < calls.length) ? [{
                                    type: 2, style: 2, // secondary button
                                    emoji: { name: '▶️' },
                                    custom_id: `d2:info?i=${i + 1}&ch=${msg.channel_id}&msg=${msg.id}`
                                }] : [])
                            ]
                        }
                    ] : [])
                ]
            }]
        }
    });

}

export async function devGetUser(d, params) {
    const author = d.user ?? d.member.user;

    await client.request('POST', `/interactions/${d.id}/${d.token}/callback`, {
        type: 9, // modal
        data: {
            custom_id: 'd2:devGetUser',
            title: 'Get User (Dev)',
            components: [
                {
                    type: 18, // label
                    label: 'Select a user.',
                    description: 'Use this field or use "User ID".',
                    component: {
                        type: 5, //user select
                        custom_id: 'targetUser',
                        required: false
                    }
                },
                {
                    type: 18, // label
                    label: 'Select a user by ID.',
                    component: {
                        type: 4,
                        style: 1,
                        min_length: 1,
                        max_length: 20,
                        custom_id: 'targetUserId',
                        required: false
                    }
                }
            ]
        }
    });
}

export async function devSetCredit(d, params) {
    const author = d.user ?? d.member.user;
    if (!config.users.dev.has(author.id)) return;

    const user = await getUser(params.get('user'));

    await client.request('POST', `/interactions/${d.id}/${d.token}/callback`, {
        type: 9, // modal
        data: {
            custom_id: `d2:devSetCredit?user=${params.get('user')}`,
            title: 'Set credits (Dev)',
            components: [
                {
                    type: 10,
                    content: `> Updating <@${params.get('user')}> (\`${params.get('user')}\`)'s credits.`
                },
                {
                    type: 18, // label
                    label: 'Free credits',
                    description: 'Nano-credits. Leave this field empty to keep the original value.',
                    component: {
                        type: 4, // text input
                        style: 1,
                        custom_id: 'freeCredits',
                        min_length: 1,
                        max_length: 20,
                        required: false,
                        placeholder: user.free_credits.toString()
                    }
                },
                {
                    type: 18, // label
                    label: 'Paid credits',
                    description: 'Nano-credits. Leave this field empty to keep the original value.',
                    component: {
                        type: 4, // text input
                        style: 1,
                        custom_id: 'paidCredits',
                        min_length: 1,
                        max_length: 20,
                        required: false,
                        placeholder: user.paid_credits.toString()
                    }
                }
            ]
        }
    }).catch(async e => console.log(e));
}

export async function devBanUser(d, params) {
    const author = d.user ?? d.member.user;
    if (!config.users.dev.has(author.id)) return;

    const user = await getUser(params.get('user'));

    await client.request('POST', `/interactions/${d.id}/${d.token}/callback`, {
        type: 9, // modal
        data: {
            custom_id: `d2:devBanUser?user=${params.get('user')}`,
            title: 'Set credits (Dev)',
            components: [
                {
                    "type": 18,
                    "label": "Preset Duration",
                    "component": {
                        "type": 3,
                        "custom_id": "banPreset",
                        "placeholder": "Select a preset duration",
                        "required": false,
                        "options": [
                            { "label": "1 Minute", "value": "60000" },
                            { "label": "5 Minutes", "value": "300000" },
                            { "label": "10 Minutes", "value": "600000" },
                            { "label": "30 Minutes", "value": "1800000" },
                            { "label": "1 Hour", "value": "3600000" },
                            { "label": "3 Hours", "value": "10800000" },
                            { "label": "6 Hours", "value": "21600000" },
                            { "label": "12 Hours", "value": "43200000" },
                            { "label": "1 Day", "value": "86400000" },
                            { "label": "3 Days", "value": "259200000" },
                            { "label": "7 Days", "value": "604800000" },
                            { "label": "30 Days", "value": "2592000000" },
                            { "label": "1 Year", "value": "31536000000" },
                            { "label": "5 Years", "value": "157680000000" },
                            { "label": "10 Years", "value": "315360000000" },
                            { "label": "100 Years", "value": "3153600000000" }
                        ]
                    }
                },
                {
                    "type": 18,
                    "label": "Years",
                    "component": {
                        "type": 4,
                        "custom_id": "banYears",
                        "style": 1,
                        "placeholder": "0",
                        "required": false,
                        "max_length": 4000
                    }
                },
                {
                    "type": 18,
                    "label": "Days",
                    "component": {
                        "type": 4,
                        "custom_id": "banDays",
                        "style": 1,
                        "placeholder": "0",
                        "required": false,
                        "max_length": 4000
                    }
                },
                {
                    "type": 18,
                    "label": "Hours",
                    "component": {
                        "type": 4,
                        "custom_id": "banHours",
                        "style": 1,
                        "placeholder": "0",
                        "required": false,
                        "max_length": 4000
                    }
                },
                {
                    "type": 18,
                    "label": "Minutes",
                    "component": {
                        "type": 4,
                        "custom_id": "banMinutes",
                        "style": 1,
                        "placeholder": "0",
                        "required": false,
                        "max_length": 4000
                    }
                }
            ]
        }
    }).catch(async e => console.log(e));
}