/*
DiscordAI v2
The best AI bot framework on Discord.

by JustApple
*/

// dependencies
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import qs from 'querystring';

// change working directory to app
process.chdir(dirname(fileURLToPath(import.meta.url)));

// startup and load discord ai tools
import { config, client, gateway, user, userDB, encryptionKey, instructions, getUser } from './core/startup.js';
import { CacheManager } from './core/utils/cache.js';
import * as ui from './core/ui.js';
import * as interactions from './core/interactions/index.js';

// logger
await import('./core/logger.js');

// log start message
console.log(`Connected to Discord as \x1b[34m${user.username}#${user.discriminator}\x1b[90m (${user.id})\x1b[0m.`);

// create cache managers
const messageCacher = new CacheManager(null, config.cache.messageCacherOptions);
const daiv2Cacher = new CacheManager(null, config.cache.daiv2CacherOptions);
const memoryCacher = new CacheManager(null, config.cache.memoryCacherOptions);

// gateway logs
if (config.log.gatewayLog) {
    gateway.on('socketOpen', () => console.log(`\x1b[90mGateway / \x1b[0mSocket opened.`));
    gateway.on('socketClose', () => console.log(`\x1b[90mGateway / \x1b[0mSocket closed.`));
    gateway.on('timeout', () => console.error(`\x1b[90mGateway / \x1b[0mSocket timeout.`));
}

// set status
if (config.bot.status) gateway.on('READY', () => gateway.sendMessage(3, config.bot.status));

// edit message cache on update
gateway.on('MESSAGE_UPDATE', (d) => messageCacher.edit(`${d.channel_id}/${d.id}`, d));

// receive message
gateway.on('MESSAGE_CREATE', async (d) => {
    if (d.author.id === user.id) return; // ignore the bot's own messages
    if (d.author.bot && !config.users.allowedBots.has(d.author.id)) return; // ignore bot messages
    if (config.users.banned.has(d.author.id)) return; // hardcoded banned

    if (!d.mentions.find(u => (u.id === user.id))) return; // check mention

    console.log(`Received message from \x1b[34m${d.author.username} \x1b[90m(${d.author.id})\x1b[0m.`);
    await generate(d, d.author);
});

// receive interactions
gateway.on('INTERACTION_CREATE', async (d) => {
    const author = d.user || d.member.user;
    if (config.users.banned.has(author.id)) return; // hardcoded banned

    if (d.type === 2) { // application command
        let command = d.data.name;

        // bind command
        if (command === config.bot.commands.dashboard) command = 'dashboard';
        if (command === config.bot.commands.generate) command = 'generate';

        // check if command exists
        if (!interactions.command[command]) return;

        // run
        try { await interactions.command[d.data.name](d); }
        catch (err) { console.error(`\x1b[90mInteraction /\x1b[0m Error while handling interaction:`, err); }
    } else if (d.type === 3) { // message component
        if (!d.data.custom_id.startsWith('d2:')) return;

        // parse custom id
        let url;
        try { url = new URL(d.data.custom_id) } catch { return; } // ignore wrong format button id

        // check user
        if (author.id !== url.hash.slice(1)) {
            try {
                await client.request('POST', `/interactions/${d.id}/${d.token}/callback`, {
                    type: 4, data: ui.notYourInteraction(d)
                });
            } catch {
                console.warn(`\x1b[90mInteraction /\x1b[0m Failed to send "not your interaction" message of \x1b[34m${url.pathname}\x1b[0m.`);
            }
            return;
        }

        // check if interaction exists
        if (!interactions.message[url.pathname]) {
            console.warn(`\x1b[90mInteraction /\x1b[0m Unknown 'd2:' interaction: \x1b[34m${url.pathname}\x1b[0m.`);
            return;
        }

        // run
        try {
            await interactions.message[url.pathname](d, url.searchParams);
        } catch (err) {
            console.error(`\x1b[90mInteraction /\x1b[0m Error while handling interaction: \x1b[34m${url.pathname}\x1b[0m.\n`, err);
            try {
                await client.request('POST', `/interactions/${d.id}/${d.token}/callback`, {
                    type: 4, data: ui.interactionError(d, url, err)
                });
            } catch {
                console.warn(`\x1b[90mInteraction /\x1b[0m Failed to send "interaction error" message of \x1b[34m${url.pathname}\x1b[0m.`,);
            }
        }
    }
});

// generate response
async function generate(message, author = message.author) {
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
}

// build conversation
async function buildConversation(message) {

}

// error catcher
process.on('uncaughtException', (e) => {
    console.error(e);
});