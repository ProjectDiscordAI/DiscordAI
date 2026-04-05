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

// get date and time
function getDateAndTime() {
    const result = {};

    result.date = new Date();

    result.iso = result.date.toISOString();
    result.isoDate = result.iso.slice(0, 10);
    result.isoTime = result.iso.slice(11, 19);

    result.local = (new Date(result.date.getTime() - (result.date.getTimezoneOffset() * 60000))).toISOString();
    result.localDate = result.local.slice(0, 10);
    result.localTime = result.local.slice(11, 19);

    return result;
}

// message to string
function messageToString(...args) {
    return args.map(arg => (typeof arg === 'string') ? arg : util.inspect(arg, config.log.inspectOptions)).join(' ').split('\n').join('\n           ');
}

// overwrite console.log and console.error to log into files
let lastLocalDate = '';
global.console._log = console.log;
global.console._warn = console.warn;
global.console._error = console.error;

global.console.log = (...args) => {
    const d = getDateAndTime();
    const message = messageToString(...args);

    fs.appendFile(path.join(config.log.folder, `${d.isoDate}.log`), `${d.isoTime} | ${message.replace(ANSI_REGEX, '')}\n`)
        .catch(e => global.console._error(`\x1b[91m${d.localTime} | \x1b[1mFailed to write log: ${e.message}`));
    if (d.localDate !== lastLocalDate) {
        lastLocalDate = d.localDate;
        global.console._log(`\x1b[90m${d.localDate}\x1b[0m`);
    }
    global.console._log(`\x1b[90m${d.localTime} |\x1b[0m ${message}`);
}

global.console.warn = (...args) => {
    const d = getDateAndTime();
    const message = messageToString(...args);

    fs.appendFile(path.join(config.log.folder, `${d.isoDate}.log`), `${d.isoTime} W ${message.replace(ANSI_REGEX, '')}\n`)
        .catch(e => global.console._error(`\x1b[91m${d.localTime} | \x1b[1mFailed to write log: ${e.message}`));
    if (d.localDate !== lastLocalDate) {
        lastLocalDate = d.localDate;
        global.console._log(`\x1b[90m${d.localDate}\x1b[0m`);
    }
    global.console._log(`\x1b[93m${d.localTime} |\x1b[0m ${message}`);
}

global.console.error = (...args) => {
    const d = getDateAndTime();
    const message = messageToString(...args);

    fs.appendFile(path.join(config.log.folder, `${d.isoDate}.log`), `${d.isoTime} E ${message.replace(ANSI_REGEX, '')}\n`)
        .catch(e => global.console._error(`\x1b[91m${d.localTime} | \x1b[1mFailed to write log: ${e.message}`));
    if (d.localDate !== lastLocalDate) {
        lastLocalDate = d.localDate;
        global.console._log(`\x1b[90m${d.localDate}\x1b[0m`);
    }
    global.console._log(`\x1b[91m${d.localTime} |\x1b[0m ${message}`);
}