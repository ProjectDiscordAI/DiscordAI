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

// overwrite console.log and console.error to log into files
let lastDate = '';
global.console._log = console.log;
global.console._error = console.error;
global.console.log = (...args) => {
    const timestamp = (new Date()).toISOString();
    const date = timestamp.slice(0, 10);
    const time = timestamp.slice(11, 19);
    const message = args.map(arg => (typeof arg === 'string') ? arg : util.inspect(arg, config.log.inspectOptions)).join(' ').split('\n').join('\n           ');

    fs.appendFile(path.join(config.log.folder, `${date}.log`), `${time} | ${message}\n`);
    if (date !== lastDate) {
        lastDate = date;
        global.console._log(`\x1b[90m${date}\x1b[0m`);
    }
    global.console._log(`\x1b[90m${time} |\x1b[0m ${message}`);
}
global.console.error = (...args) => {
    const timestamp = (new Date()).toISOString();
    const date = timestamp.slice(0, 10);
    const time = timestamp.slice(11, 19);
    const message = args.map(arg => (typeof arg === 'string') ? arg : util.inspect(arg, config.log.inspectOptions)).join(' ').split('\n').join('\n           ');

    fs.appendFile(path.join(config.log.folder, `${date}.log`), `${time} | ${message}\n`);
    if (date !== lastDate) {
        lastDate = date;
        global.console._log(`\x1b[90m${date}\x1b[0m`);
    }
    global.console._log(`\x1b[91m${time} |\x1b[0m ${message}`);
}