// Usage: webshot <url>|--html <file>|--html - [options]
//
//     Options:
//       --html <file|->       Use HTML file or stdin instead of URL
//       --width=<px>          Set viewport width (default 800)
//       --height=<px>         Set viewport height (default 600)
//       --output=<file|->     Output file (or '-' for stdout)
//       --format=<png|jpg|txt|text|html>
//                             Output format (default png)
//       --delay=<ms>          Delay before capture (default 0)
//       --max-render=<ms>     Max wait time before force capture (default 10000)
//
//     In-page JS:
//       webShotAPI.pause()    Pause automatic capture
//       webShotAPI.shot()     Trigger capture manually
//
//     Examples:
//       webshot https://example.com --output=site.png
//       webshot --html=index.html --output=site.png
//       cat index.html | webshot --html - --output=site.png
//       webshot https://example.com --format=text --output=-
//       webshot https://example.com --format=html --output=site.html


import { spawn } from 'child_process';

export function shotUrl(url, width = 1280, height = 720, delay = 0, maxRender = 5000, format = 'png', env = {}, inject = '') {
    return new Promise((resolve, reject) => {
        // run command `webshot <url> --width=<width> --height=<height> --format=<format> --delay=<delay> --output=-`
        const webshot = spawn('webshot', [url,
            `--width=${width}`,
            `--height=${height}`,
            `--format=${format}`,
            `--delay=${delay}`,
            `--max-render=${maxRender}`,
            `--output=-`,
            `--env=${JSON.stringify(JSON.stringify(env))}`,
            `--inject=${JSON.stringify(inject)}`
        ]);
        const outputChunks = [];
        const errorChunks = [];

        // Capture stdout as Buffer
        webshot.stdout.on('data', (chunk) => outputChunks.push(chunk));
        webshot.stderr.on('data', (chunk) => errorChunks.push(chunk));
        webshot.on('close', (code) => {
            if (code === 0) {
                const outputBuffer = Buffer.concat(outputChunks);
                resolve(outputBuffer);
            } else {
                reject(new Error(Buffer.concat(outputChunks).toString()));
            }
        });

        webshot.on('error', reject);
    });
}

export function shotHtml(html, width = 1280, height = 720, delay = 0, maxRender = 5000, format = 'png', env = {}, inject = '') {
    return new Promise((resolve, reject) => {
        // run command `webshot --html=- --width=<width> --height=<height> --format=png --delay=<delay> --output=-`
        const webshot = spawn('webshot', [
            `--html=-`,
            `--width=${width}`,
            `--height=${height}`,
            `--format=${format}`,
            `--delay=${delay}`,
            `--max-render=${maxRender}`,
            `--output=-`,
            `--env=${JSON.stringify(JSON.stringify(env))}`,
            `--inject=${JSON.stringify(inject)}`
        ]);
        const outputChunks = [];
        const errorChunks = [];
        // Write HTML to stdin
        webshot.stdin.write(html);
        webshot.stdin.end();

        // Capture stdout as Buffer
        webshot.stdout.on('data', (chunk) => outputChunks.push(chunk));
        webshot.stderr.on('data', (chunk) => errorChunks.push(chunk));
        webshot.on('close', (code) => {
            if (code === 0) {
                const outputBuffer = Buffer.concat(outputChunks);
                resolve(outputBuffer);
            } else {
                reject(new Error(Buffer.concat(errorChunks).toString()));
            }
        });

        webshot.on('error', reject);
    });
}