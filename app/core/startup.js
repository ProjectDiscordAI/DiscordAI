/*
DiscordAI v2
The best AI bot framework on Discord.

core/startup-logger.js

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
const { DBLEFile, DBLEField, DBLEBigInt64Field, DBLEDateField, DBLEAnyField } = jn_dble;

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
    config.credit.daily = config.credit.daily ?? 100_000000000n;
    console.log(`\x1b[90m  - \x1b[0mCredit config loaded.\x1b[0m`);

    // policy config
    loadingConfig = 'policy config';
    config.policy = config.policy ?? {};
    config.policy.update = config.policy.update ?? 10;
    console.log(`\x1b[90m  - \x1b[0mPolicy config loaded.\x1b[0m`);

    // discord bot configs
    loadingConfig = 'bot config';
    config.bot = config.bot ?? {};
    if (!config.bot.token) throw new Error('Bot token (.bot.token) is required.');
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
                    new DBLESnowflakeField('id', true),
                    new DBLEBigInt64Field('free_credits'),
                    new DBLEBigInt64Field('paid_credits'),
                    new DBLEDateField('free_update'),
                    new DBLEDateField('policy_accept'),
                    new DBLEDateField('banned_until'),
                    new DBLEAnyField(8, 'flags')
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

// connect to discord
console.log(`\x1b[90m> \x1b[0mConnecting to Discord...`);
export const client = new Client(config.bot.token.startsWith('env:') ? config.env[config.bot.token.slice(4)] : config.bot.token);
export let gateway;
export let user;
try {
    gateway = client.gateway({ intents: 0b1001001000010000, ...config.bot.gatewayOptions });

    user = (await new Promise((resolve, reject) => {
        gateway.on('READY', resolve);
        gateway.on('error', reject);
    })).user;
} catch (err) {
    console.error(`\x1b[90m  - \x1b[31mFailed to connect to Discord: ${err.message}\x1b[0m`);
    process.exit(1);
}
console.log(`\x1b[90m  - \x1b[0mConnected user: \x1b[34m${user.username}#${user.discriminator}\x1b[90m (${user.id})\x1b[0m`);
console.log(`\x1b[90m  - \x1b[32mConnected to Discord.\x1b[0m`);

// launched
console.log(`\x1b[90m> \x1b[0mDiscordAI is now launched!\x1b[0m\n`);