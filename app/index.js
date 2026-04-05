/*
DiscordAI v2
The best AI bot framework on Discord.

by JustApple
*/

// dependencies
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// change working directory to app
process.chdir(dirname(fileURLToPath(import.meta.url)));

// startup and load discord ai tools
import { config, client, gateway, user, userDB, encryptionKey, instructions } from './core/startup.js';
import { CacheManager } from './core/utils/cache.js';
import * as ui from './core/ui.js';

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

// get user data
async function getUser(id) {
    // load user from database
    let user = (await userDB.readLineByField('id', id))?.fields;

    // current time
    const now = Date.now();
    const nowHour = Math.floor(now / 3600000);

    // new user
    if (!user) {
        user = {
            id: id,
            free_credits: config.credit.daily,
            paid_credits: config.credit.regist_paid,
            free_update: nowHour,
            policy_accept: 0,
            banned_until: 0
        };

        await userDB.appendLine(user);
    }

    // update credits
    if (
        (user.banned_until < now) &&              // skip banned users
        (nowHour - user.free_update) &&           // check time
        (user.free_credits < config.credit.daily) // check if user's credit is full or not
    ) {
        // calculate free credits
        user.free_credits += BigInt(nowHour - user.free_update) * (config.credit.hourly);
        if (user.free_credits > config.credit.daily) user.free_credits = config.credit.daily;

        user.free_update = nowHour;
        await userDB.setLineByField('id', id, { free_credits: user.free_credits, free_update: user.free_update });
    }

    // return
    return user;
}

// generate response
async function generate(message, author = message.author) {
    // load user from database
    let user = await getUser(author.id);

    // check policy accept status
    if (user.policy_accept < config.policy.update) {
        client.request('POST', `/channels/${message.channel_id}/messages`, ui.policyMessage)
    }
}

// build conversation
async function buildConversation(message) {

}