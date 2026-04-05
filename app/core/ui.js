/*
DiscordAI v2
The best AI bot framework on Discord.

core/ui.js

by JustApple
*/

// load config and bot info
import { config, user } from './core/startup.js';

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
This is the first time you're here, 
`
            }
        ]
    }]
};

// policy accepting ui
export const policyMessage = {
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
# Terms of Service and Privacy Policy Update
We've updated our [Terms of Service]()
`
            }
        ]
    }]
}