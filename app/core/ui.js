/*
DiscordAI v2
The best AI bot framework on Discord.

core/ui.js

by JustApple
*/

// load config and bot info
import { config, user, tasks, gateway } from './startup.js';

// discord ai v2 button custom id format
// 'd2:<name>?<key>=<value>&<key>=<value>...#<target_user>' (uri format)

// welcome ui
export const welcomeMessage = {
    flags: 1 << 15,
    components: [{
        type: 17,
        id: 1_001, // ids over 1000 is discordai's special message flag
        components: [
            {
                type: 12,
                items: [{ media: { url: 'https://raw.githubusercontent.com/ProjectDiscordAI/DiscordAI/refs/heads/v2/docs/banner.png' } }]
            },
            {
                type: 10,
                content: `
# Hello!
Welcome to DiscordAI, we'll help you setting up your personal experience!
`
            }
        ]
    }]
};

// policy accepting ui
export function policyMessage(message, author) {
    const msg = {
        allowed_mentions: { parse: [] },
        flags: 1 << 15 | 1 << 6,
        components: [{
            type: 17, // container
            id: 1_002, // ids over 1000 is discordai's special message flag
            components: [
                {
                    type: 12, // media gallery
                    items: [{ media: { url: 'https://raw.githubusercontent.com/ProjectDiscordAI/DiscordAI/refs/heads/v2/docs/banner.png' } }]
                },
                {
                    type: 10, // text
                    content: `
# Terms of Service and Privacy Policy Update
Hey, <@${author.id}>! We've updated our [Terms of Service (ToS)](${config.policy.tos}) and [Privacy Policy (PP)](${config.policy.pp}) in <t:${Math.round(config.policy.update / 1000)}:D>, to continue (or start) using our service, you'll need to read and accept them.
`
                },
                {
                    type: 1, // action row
                    components: [
                        { type: 2, style: 5, label: 'Terms of Service', url: config.policy.tos }, // link button
                        { type: 2, style: 5, label: 'Privacy Policy', url: config.policy.pp }     // link button
                    ]
                },
                { type: 14 }, // divider
                {
                    type: 1, // action row
                    components: [
                        {
                            type: 2, style: 3, // success button
                            label: 'I\'ve read and accepted ToS and PP.', custom_id: `d2:tosppAcpt#${author.id}`
                        },
                        {
                            type: 2, style: 4, // danger button
                            label: 'Reject ToS or PP.', custom_id: `d2:tosppRjct#${author.id}`
                        }
                    ]
                },
            ]
        }]
    };

    // add reply if same user
    if (message?.author?.id === author.id) msg.message_reference = { message_id: message?.id };

    // return
    return msg;
}


// banned ui
export function bannedMessage(message, author, user) {
    return {
        message_reference: (message?.author?.id === author.id) ? { message_id: message?.id } : undefined,
        flags: 1 << 15,
        components: [{
            type: 17,
            id: 1_003, // ids over 1000 is discordai's special message flag
            accent_color: 0xFF0000,
            components: [
                {
                    type: 10,
                    content: `<@${author.id}> Sorry, you are banned until <t:${Math.round(user.banned_until / 1000)}:S>.`
                }
            ]
        }]
    };
}

// not your interaction ui
export function notYourInteraction() {
    return {
        flags: 1 << 15 | 1 << 6,
        components: [{
            type: 17,
            id: 1_003, // ids over 1000 is discordai's special message flag
            accent_color: 0xFFFF00,
            components: [
                {
                    type: 10,
                    content: `Hey! This action is not for you!`
                }
            ]
        }]
    };
}

// interaction error
export function interactionError(d, url, err) {
    return {
        flags: 1 << 15 | 1 << 6,
        components: [{
            type: 17,
            id: 1_004, // ids over 1000 is discordai's special message flag
            accent_color: 0xFF0000,
            components: [
                {
                    type: 10, // text
                    content: `# Error\n> Failed to respond to your action, please try again later.`
                },
                { type: 14 }, // divider
                {
                    type: 10, // text
                    content: `\`\`\`\nDetail\n  Interaction: ${url.pathname}\n  Error: ${err.message}\n\`\`\`\n-# If the problem keeps happening, please contact the developer with the detail above.`
                },
            ]
        }]
    };
}

// interaction error
export function policyAccepted(d) {
    const author = d.user || d.member.user;
    return {
        allowed_mentions: { parse: [] },
        flags: 1 << 15 | 1 << 6,
        components: [{
            type: 17,
            id: 1_005, // ids over 1000 is discordai's special message flag
            accent_color: 0x00FF00,
            components: [{
                type: 10, // text
                content: `
<@${author.id}> You have accepted our latest [Terms of Service (ToS)](${config.policy.tos}) and [Privacy Policy (PP)](${config.policy.pp}), please continue enjoying our service!
`
            }]
        }]
    };
}

// interaction error
export function policyRejected(d) {
    const author = d.user || d.member.user;
    return {
        allowed_mentions: { parse: [] },
        flags: 1 << 15 | 1 << 6,
        components: [{
            type: 17,
            id: 1_005, // ids over 1000 is discordai's special message flag
            accent_color: 0xFF0000,
            components: [{
                type: 10, // text
                content: `
<@${author.id}> You rejected our [Terms of Service (ToS)](${config.policy.tos}) and [Privacy Policy (PP)](${config.policy.pp}), feel free to accept them again any time by mention me!
`
            }]
        }]
    };
}

// dashboard
export function dashboard(d, user) {

    return {
        flags: 1 << 15 | 1 << 6,
        components: [{
            type: 17,
            id: 1_006, // ids over 1000 is discordai's special message flag
            components: [
                {
                    type: 10, // text
                    content: `# Dashboard`
                },
                {
                    type: 10, // text
                    content: `**Free credits**: \`${Number(user.free_credits) / 1000000000}\` / \`${Number(config.credit.daily) / 1000000000}\`\n` +
                        `**Paid credits**: \`${Number(user.paid_credits) / 1000000000}\`\n` +
                        `**Next free credit refill**: <t:${Math.floor(Math.ceil(Date.now() / 3600000) * 3600)}:S> (\`${Number(config.credit.hourly) / 1000000000}\`/hr)`
                },
            ]
        }]
    };
}

// dev dashboard
export function devDashboard(d, user) {
    const author = d.user ?? d.member.user;
    return {
        flags: 1 << 15 | 1 << 6,
        components: [{
            type: 17,
            id: 1_006, // ids over 1000 is discordai's special message flag
            components: [
                {
                    type: 10, // text
                    content: `# Dashboard (Dev)`
                },
                {
                    type: 10, // text
                    content: '```\n' +
                        `Working tasks: ${tasks.size}\n` +
                        `Ping: ${gateway.ping}\n` +
                        `Free credits: ${Number(user.free_credits) / 1000000000}\n` +
                        `Paid credits: ${Number(user.paid_credits) / 1000000000}\n` +
                        '```'
                },
                { type: 14 }, // divider
                {
                    type: 1, // action row
                    components: [
                        {
                            type: 2, style: 2, // secondary button
                            label: 'Get user', custom_id: `d2:devGetUser#${author.id}`
                        }
                    ]
                },
            ]
        }]
    };
}

// generating content message
export function generatingCommand() {
    return {
        flags: 1 << 15 | 1 << 6,
        components: [{
            type: 17,
            id: 1_006, // ids over 1000 is discordai's special message flag
            components: [
                {
                    type: 10, // text
                    content: `Responding to the message...`
                }
            ]
        }]
    };
}

// generating content message
export function regeneratingButton() {
    return {
        flags: 1 << 15 | 1 << 6,
        embeds: [],
        components: [{
            type: 17,
            id: 1_006, // ids over 1000 is discordai's special message flag
            components: [
                {
                    type: 10, // text
                    content: `Responding to the message...`
                }
            ]
        }]
    };
}

export function functionInfo(calls, responses, autoRun) {
    return (calls.length > 0 || responses.length > 0) ?
        (responses.length > 0 ? `Completed \`${responses.length}\` call(s).\n` : '') +
        (calls.length > 0 ? `${autoRun ? 'Auto run' : 'Run'}: ${calls.map(c => c.info ?? 'UNKNOWN').join(', ')}.` : '') :
        'Respond completed.';
}

export function notEnoughCredits(message, author, user) {
    return {
        message_reference: (message?.author?.id === author.id) ? { message_id: message?.id } : undefined,
        flags: 1 << 15 | 1 << 6,
        components: [{
            type: 17,
            id: 1_008, // ids over 1000 is discordai's special message flag
            accent_color: 0xFFFF00,
            components: [
                {
                    type: 10,
                    content: `# Not Enough Credits\n\n` +
                        `<@${author.id}> You'll need at least \`${Number(config.credit.basic) / 1000000000}\` credits to generate a response. Check your credits with \`/${config.bot.commands.dashboard}\`.`
                }
            ]
        }]
    };
}