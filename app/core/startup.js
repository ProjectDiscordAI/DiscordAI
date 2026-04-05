/*
DiscordAI v2
The best AI bot framework on Discord.

core/startup.js

by JustApple
*/

// require
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// dependencies
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { DBLESnowflakeField } from './utils/dble-snowflake.js';
import jn_request from '@jnode/request';
import jn_discord from '@jnode/discord';
import jn_dble from '@jnode/db/dble';
const { request } = jn_request;
const { Client } = jn_discord;
const { DBLEFile, DBLEDoubleField, DBLEBigInt64Field, DBLEAnyField, DBLEUInt32Field } = jn_dble;

// constants
let { version } = require('./../../package.json');

// welcome logo, nothing special, but don't you think it's cool? :D
console.log(`
\x1b[0m===============================================================================

\x1b[38;2;88;101;242m  ██████╗ ██╗███████╗ ██████╗ ██████╗ ██████╗ ██████╗ \x1b[38;2;71;150;227m █████╗ ██╗    \x1b[38;2;255;67;123m██████╗ 
\x1b[38;2;88;101;242m  ██╔══██╗██║██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔══██╗\x1b[38;2;71;150;227m██╔══██╗██║    \x1b[38;2;255;67;123m╚════██╗
\x1b[38;2;88;101;242m  ██║  ██║██║███████╗██║     ██║   ██║██████╔╝██║  ██║\x1b[38;2;71;150;227m███████║██║    \x1b[38;2;255;67;123m █████╔╝
\x1b[38;2;88;101;242m  ██║  ██║██║╚════██║██║     ██║   ██║██╔══██╗██║  ██║\x1b[38;2;71;150;227m██╔══██║██║    \x1b[38;2;255;67;123m██╔═══╝ 
\x1b[38;2;88;101;242m  ██████╔╝██║███████║╚██████╗╚██████╔╝██║  ██║██████╔╝\x1b[38;2;71;150;227m██║  ██║██║    \x1b[38;2;255;67;123m███████╗
\x1b[38;2;88;101;242m  ╚═════╝ ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝ \x1b[38;2;71;150;227m╚═╝  ╚═╝╚═╝    \x1b[38;2;255;67;123m╚══════╝

\x1b[0m===============================================================================
`);

// version
console.log(`\x1b[90m> \x1b[1m\x1b[38;2;88;101;242mDiscord\x1b[38;2;71;150;227mAI\x1b[0m \x1b[38;2;255;67;123mv${version}\x1b[0m is launching...`);

// load configs
console.log(`\x1b[90m> \x1b[0mLoading config...`);
export let config = {};
let loadingConfig = 'config';
try {
    config = require('./../config') ?? {};

    // root configs
    loadingConfig = 'root config';
    config.skipUpdateCheck = config.skipUpdateCheck ?? false;
    console.log(`\x1b[90m  - \x1b[0mRoot config loaded.\x1b[0m`);

    // environment variables
    loadingConfig = 'environment variables';
    config.env = (typeof config.env === 'object') ? config.env : require((typeof config.env === 'string') ? config.env : './../.env');
    console.log(`\x1b[90m  - \x1b[0mEnvironment variables loaded.\x1b[0m`);

    // log configs
    loadingConfig = 'log config';
    config.log = config.log ?? {};
    config.log.folder = config.log.folder ?? './log';
    config.log.gatewayLog = config.log.gatewayLog ?? true;
    console.log(`\x1b[90m  - \x1b[0mLog config loaded.\x1b[0m`);

    // instruction configs
    loadingConfig = 'instructions config';
    config.instructions = config.instructions ?? {};
    config.instructions.core = config.instructions.core ?? './instructions/core.md';
    console.log(`\x1b[90m  - \x1b[0mLog config loaded.\x1b[0m`);

    // encryption configs
    loadingConfig = 'encryption config';
    config.encrypt = config.encrypt ?? {};
    config.encrypt.key = path.resolve(config.encrypt.key ?? './encryption.key');
    console.log(`\x1b[90m  - \x1b[0mEncryption config loaded.\x1b[0m`);

    // database configs
    loadingConfig = 'database config';
    config.db = config.db ?? {};
    config.db.folder = config.db.folder ?? './db/';
    console.log(`\x1b[90m  - \x1b[0mDatabase config loaded.\x1b[0m`);

    // credit configs
    loadingConfig = 'credit config';
    config.credit = config.credit ?? {};
    config.credit.daily = config.credit.daily ?? 120_000000000n;
    config.credit.hourly = config.credit.daily / 24n;
    config.credit.regist_paid = config.credit.regist_paid ?? 0n;
    console.log(`\x1b[90m  - \x1b[0mCredit config loaded.\x1b[0m`);

    // policy config
    loadingConfig = 'policy config';
    config.policy = config.policy ?? {};
    config.policy.tos = config.policy.tos ?? 'https://github.com/ProjectDiscordAI/DiscordAI/tree/v2/tos.md';
    config.policy.pp = config.policy.pp ?? 'https://github.com/ProjectDiscordAI/DiscordAI/tree/v2/pp.md';
    config.policy.update = config.policy.update ?? 10;
    console.log(`\x1b[90m  - \x1b[0mPolicy config loaded.\x1b[0m`);

    // cache config
    loadingConfig = 'cache config';
    config.cache = config.cache ?? {};
    config.cache.messageCacherOptions = config.cache.messageCacherOptions;
    config.cache.daiv2CacherOptions = config.cache.daiv2CacherOptions;
    config.cache.memoryCacherOptions = config.cache.memoryCacherOptions;
    console.log(`\x1b[90m  - \x1b[0mPolicy config loaded.\x1b[0m`);

    // users config
    loadingConfig = 'users config';
    config.users = config.users ?? {};
    config.users.allowedBots = new Set(config.users.allowedBots);
    config.users.banned = new Set(config.users.banned);
    console.log(`\x1b[90m  - \x1b[0mUsers config loaded.\x1b[0m`);

    // ui config
    loadingConfig = 'UI config';
    config.ui = config.ui ?? {};
    console.log(`\x1b[90m  - \x1b[0mUI config loaded.\x1b[0m`);

    // discord bot configs
    loadingConfig = 'bot config';
    config.bot = config.bot ?? {};
    if (!config.bot.token) throw new Error('Bot token (.bot.token) is required.');
    config.bot.clientOptions = config.bot.clientOptions ?? {};
    config.bot.gatewayOptions = config.bot.gatewayOptions ?? {};
    console.log(`\x1b[90m  - \x1b[0mBot config loaded.\x1b[0m`);
} catch (err) {
    console.error(`\x1b[90m  - \x1b[31mError while loading ${loadingConfig}: ${err.message}\x1b[0m`);
    process.exit(1);
}
console.log(`\x1b[90m  - \x1b[32mComplete.\x1b[0m`);

// check for updates
if (config.skipUpdateCheck) {
    console.log(`\x1b[90m> \x1b[0mSkipped update check.`);
} else {
    console.log(`\x1b[90m> \x1b[0mChecking for updates from GitHub...`);
    try {
        const res = await request('GET', 'https://raw.githubusercontent.com/ProjectDiscordAI/DiscordAI/refs/heads/v2/package.json');
        if (res.statusCode !== 200) throw new Error('Failed to fetch version info from GitHub.');
        const data = await res.json();
        console.log(`\x1b[90m  - \x1b[0mLatest version: \x1b[34m${data.version}\x1b[0m.`);

        if (data.version !== version) {
            console.log(`\x1b[90m  - \x1b[33mVersion ${data.version} is available!\x1b[0m`);
            console.log(`\x1b[90m    \x1b[0mUpdate via \x1b[34mnpm run update\x1b[0m.\x1b[0m`);
        } else {
            console.log(`\x1b[90m  - \x1b[32mYou are using the latest version of DiscordAI!\x1b[0m`);
        }
    } catch (err) {
        console.log(`\x1b[90m  - \x1b[31mFailed to check update: ${err.message}\x1b[0m`);
    }
}

// initialize encryption key
console.log(`\x1b[90m> \x1b[0mInitializing encryption key...`);
export let encryptionKey;
try {
    encryptionKey = await fs.readFile(config.encrypt.key);
    console.log(`\x1b[90m  - \x1b[0mLoaded encryption key from \x1b[34m${config.encrypt.key}\x1b[0m.`);
} catch (err) {
    if (err.code === 'ENOENT') {
        try {
            encryptionKey = crypto.randomBytes(16);
            await fs.writeFile(config.encrypt.key, encryptionKey);
            console.log(`\x1b[90m  - \x1b[0mGenerated encryption key to \x1b[34m${config.encrypt.key}\x1b[0m.`);
        } catch (err) {
            console.error(`\x1b[90m  - \x1b[31mError while generating encryption key: ${err.message}\x1b[0m`);
            process.exit(1);
        }
    } else {
        console.error(`\x1b[90m  - \x1b[31mError while loading encryption key: ${err.message}\x1b[0m`);
        process.exit(1);
    }
}
console.log(`\x1b[90m  - \x1b[32mComplete.\x1b[0m`);

// initialize database
console.log(`\x1b[90m> \x1b[0mInitializing database...`);
await fs.mkdir(path.join(config.db.folder, 'users'), { recursive: true }); // create users folder
const userDBPath = path.join(config.db.folder, 'users.dble');
export let userDB;
try {
    userDB = await DBLEFile.load(userDBPath, {
        types: { 'Snowflake': DBLESnowflakeField }
    });
    console.log(`\x1b[90m  - \x1b[0mUser database loaded.\x1b[0m`);
    const { size } = await userDB.jdb.handle.stat();
    console.log(`\x1b[90m  - \x1b[0mLoaded users: \x1b[34m${(size - userDB.bodyOffset) / userDB.lineLength}\x1b[0m.`);
} catch (err) {
    if (err.code === 'ENOENT') {
        try {
            userDB = await DBLEFile.create(userDBPath, {
                fields: [
                    new DBLESnowflakeField('id', true),    // discord user id
                    new DBLEBigInt64Field('free_credits'), // free daily credits
                    new DBLEBigInt64Field('paid_credits'), // paid credits
                    new DBLEUInt32Field('free_update'),    // last free credit update time in hour (unix epoch)
                    new DBLEDoubleField('policy_accept'),  // last policy accept time in ms (unix epoch)
                    new DBLEDoubleField('banned_until'),   // banned time in ms (unix epoch)
                    new DBLEAnyField(8, 'flags'),          // account flags
                    new DBLEUInt32Field('RSV')             // reserved
                ]
            });
            console.log(`\x1b[90m  - \x1b[0mUser database created.\x1b[0m`);
        } catch (err) {
            console.error(`\x1b[90m  - \x1b[31mError while creating user database: ${err.message}\x1b[0m`);
            process.exit(1);
        }
    } else {
        console.error(`\x1b[90m  - \x1b[31mError while loading user database: ${err.message}\x1b[0m`);
        process.exit(1);
    }
}
console.log(`\x1b[90m  - \x1b[32mComplete.\x1b[0m`);

// get user data
export async function getUser(id) {
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

// read or create file
async function readOrCreateFile(path, create = '') {
    try {
        return await fs.readFile(path);
    } catch (err) {
        if (err.code === 'ENOENT') {
            create = Buffer.isBuffer(create) ? create : Buffer.from(create);
            await fs.writeFile(path, create);
            return create;
        }
        throw err;
    }
};

// load instructions
console.log(`\x1b[90m> \x1b[0mLoading instructions...`);
export const instructions = {};
let loadingInstruction = 'instruction';
try {
    loadingInstruction = 'core instruction (instructions/core.md)';
    instructions.core = await readOrCreateFile(config.instructions.core, 'You are a helpful assistant.');
    console.log(`\x1b[90m  - \x1b[0mCore instruction loaded.\x1b[0m`);
} catch (err) {
    console.error(`\x1b[90m  - \x1b[31mError while loading ${loadingInstruction}: ${err.message}\x1b[0m`);
    process.exit(1);
}
console.log(`\x1b[90m  - \x1b[32mComplete.\x1b[0m`);

// connect to discord
console.log(`\x1b[90m> \x1b[0mConnecting to Discord...`);
export const client = new Client(
    config.bot.token.startsWith('env:') ? config.env[config.bot.token.slice(4)] : config.bot.token,
    config.bot.clientOptions
);
export let gateway;
export let user;
try {
    gateway = client.gateway({ intents: 0b1001001000010000, ...config.bot.gatewayOptions });

    user = (await new Promise((resolve, reject) => {
        gateway.once('READY', resolve);
        gateway.once('error', reject);
    })).user;

    // set status
    if (config.bot.status) gateway.sendMessage(3, config.bot.status);
} catch (err) {
    console.error(`\x1b[90m  - \x1b[31mFailed to connect to Discord: ${err.message}\x1b[0m`);
    process.exit(1);
}
console.log(`\x1b[90m  - \x1b[0mConnected user: \x1b[34m${user.username}#${user.discriminator}\x1b[90m (${user.id})\x1b[0m`);
console.log(`\x1b[90m  - \x1b[32mConnected to Discord.\x1b[0m`);

// launched
console.log(`\x1b[90m> \x1b[0mDiscordAI is now launched!\x1b[0m\n`);