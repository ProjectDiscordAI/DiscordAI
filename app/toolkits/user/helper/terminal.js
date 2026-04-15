const { spawn } = require('child_process');

function executeTerminalWithBuffer(name, args = [], input) {
	return new Promise((resolve, reject) => {
		const shortcut = spawn(name, args, { stdio: ['pipe', 'pipe', 'inherit'] });
		const outputChunks = [];
		
		// Write input text to stdin
		shortcut.stdin.end(input);
		
		// Capture stdout as Buffer
		shortcut.stdout.on('data', (chunk) => outputChunks.push(chunk));
		shortcut.stdout.on('end', () => {
			const outputBuffer = Buffer.concat(outputChunks);
			resolve(outputBuffer);
		});
		
		shortcut.on('error', reject);
	});
}

module.exports = executeTerminalWithBuffer;