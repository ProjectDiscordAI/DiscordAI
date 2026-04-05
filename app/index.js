/*
DiscordAI v2
The best AI bot framework on Discord.

by JustApple
*/

// dependencies
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { CacheManager } from './core/utils';

// change working directory to app
process.chdir(dirname(fileURLToPath(import.meta.url)));

// startup
const { config, client, gateway, user, userDB, encryptionKey } = await import('./core/startup.js');

// logger
await import('./core/logger.js');

// log start message
console.log(`Connected to Discord as \x1b[34m${user.username}#${user.discriminator}\x1b[90m (${user.id})\x1b[0m.`);

// create cache managers
const messageCacher = new CacheManager(null, );
const daiv2Cacher = new CacheManager();
const memoryCacher = new CacheManager();

