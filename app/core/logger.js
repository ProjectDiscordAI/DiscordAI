/*
DiscordAI v2
The best AI bot framework on Discord.

core/logger.js

by JustApple
*/

// dependencies
import fs from 'fs/promises';
import path from 'path';
import { config } from './startup.js';
import util from 'util';

// ensure log folder exists
await fs.mkdir(config.log.folder, { recursive: true });

// regex
const ANSI_REGEX = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

// overwrite console.log and console.error to log into files
let lastLocalDate = '';
global.console._log = console.log;
global.console._error = console.error;
global.console.log = (...args) => {
    const date = new Date();

    const iso = date.toISOString();
    const isoDate = iso.slice(0, 10);
    const isoTime = iso.slice(11, 19);

    const local = (new Date(date.getTime() - (date.getTimezoneOffset() * 60000))).toISOString();
    const localDate = local.slice(0, 10);
    const localTime = local.slice(11, 19);

    const message = args.map(arg => (typeof arg === 'string') ? arg : util.inspect(arg, config.log.inspectOptions)).join(' ').split('\n').join('\n           ');

    fs.appendFile(path.join(config.log.folder, `${isoDate}.log`), `${isoTime} | ${message.replace(ANSI_REGEX, '')}\n`)
        .catch(e => global.console._error(`\x1b[91m${localTime} | \x1b[1mFailed to write log: ${e.message}`));
    if (localDate !== lastLocalDate) {
        lastLocalDate = localDate;
        global.console._log(`\x1b[90m${localDate}\x1b[0m`);
    }
    global.console._log(`\x1b[90m${localTime} |\x1b[0m ${message}`);
}
global.console.error = (...args) => {
    const date = new Date();

    const iso = date.toISOString();
    const isoDate = iso.slice(0, 10);
    const isoTime = iso.slice(11, 19);

    const local = (new Date(date.getTime() - (date.getTimezoneOffset() * 60000))).toISOString();
    const localDate = local.slice(0, 10);
    const localTime = local.slice(11, 19);

    const message = args.map(arg => (typeof arg === 'string') ? arg : util.inspect(arg, config.log.inspectOptions)).join(' ').split('\n').join('\n           ');

    fs.appendFile(path.join(config.log.folder, `${isoDate}.log`), `${isoTime} ! ${message.replace(ANSI_REGEX, '')}\n`)
        .catch(e => global.console._error(`\x1b[91m${localTime} | \x1b[1mFailed to write log: ${e.message}`));
    if (localDate !== lastLocalDate) {
        lastLocalDate = localDate;
        global.console._log(`\x1b[90m${localDate}\x1b[0m`);
    }
    global.console._log(`\x1b[91m${localTime} |\x1b[0m ${message}`);
}