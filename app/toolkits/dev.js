/*
DiscordAI v2
The best AI bot framework on Discord.

toolkits/default.js

by JustApple
*/

// dependencies
import { DAIToolkit } from 'discordai/utils';
import fs from 'fs/promises';
import path from 'path';

// load tools
const tools = [];
const dir = await fs.readdir('./toolkits/dev', { withFileTypes: true });
for (let i of dir) {
    if (!i.isFile()) continue;
    if (i.name.startsWith('.')) continue;

    const ext = path.extname(i.name);
    if (!(ext === '.js' || ext === '.mjs' || ext === '.cjs')) continue;

    tools.push((await import(path.resolve(i.parentPath, i.name))).default);
}

export default new DAIToolkit('dev', 'Developer toolkit.', tools);