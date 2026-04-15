const { spawn } = require('child_process');
//const executeAppleScript = require('./applescript.js');

function executeShortcutWithBuffer(name, input) {
	return new Promise((resolve, reject) => {
		const shortcut = spawn('shortcuts', ['run', name]);
		const outputChunks = [];
		const errorChunks = [];
		
		// Write input text to stdin
		shortcut.stdin.write(input);
		shortcut.stdin.end();
		
		// Capture stdout as Buffer
		shortcut.stdout.on('data', (chunk) => outputChunks.push(chunk));
		shortcut.stderr.on('data', (chunk) => errorChunks.push(chunk))
		shortcut.on('close', (code) => {
			if (code === 0) {
				const outputBuffer = Buffer.concat(outputChunks);
				resolve(outputBuffer);
			} else {
				reject(new Error(Buffer.concat(errorChunks).toString()));
			}
		});
		
		shortcut.on('error', reject);
	});
}

//async function example(name, input) {
//	const script = `
//tell application "Shortcuts Events"//	set shortcutResult to run shortcut ${JSON.stringify(name)} with input ${JSON.stringify(input)}//end tell////tell application "JSON Helper"//	make JSON from shortcutResult without pretty printing//end tell
//	`;
//	
//	return JSON.parse(await executeAppleScript(script));
//}

module.exports = executeShortcutWithBuffer;