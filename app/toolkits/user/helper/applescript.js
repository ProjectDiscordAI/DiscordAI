const { spawn } = require('child_process');

/**
* 執行帶有輸入的 AppleScript，使用 stdin 傳送程式碼以提高安全性。
*
* @param {string} script AppleScript 程式碼。
* @param {...string} inputs 傳遞給 AppleScript 的輸入參數。
* @returns {Promise<string>} 一個 Promise，resolve 的值為 AppleScript 的標準輸出，reject 的值為錯誤。
*/
async function executeAppleScript(script) {
	return new Promise((resolve, reject) => {
		const process = spawn('osascript', ['-s', 's', '-'], {}); // 使用 '-' 告知 osascript 從 stdin 讀取
		
		let output = [];
		let errorOutput = [];
		
		process.stdout.on('data', (data) => {
			output.push(data);
		});
		
		process.stderr.on('data', (data) => {
			errorOutput.push(data);
		});
		
		process.on('close', (code) => {
			if (code === 0) {
				const result = Buffer.concat(output).toString().trim();
				try {
					resolve(JSON.parse(result.substring(1, result.length - 1).replace(/\r/g, '\\r').replace(/\n/g, '\\n')));
				} catch (err) {
					resolve(result);
				}
			} else {
				reject(new Error(`AppleScript execution failed with code ${code}: ${Buffer.concat(errorOutput).toString().trim()}`));
			}
		});
		
		process.on('error', (err) => {
			reject(new Error(`Failed to spawn osascript: ${err.message}`));
		});
		;
		
		// 將 AppleScript 程式碼寫入 stdin
		process.stdin.write(script);
		process.stdin.end();
	});
}

// 範例用法:
//async function example() {
//	const script = `
//tell application "Shortcuts Events"//	set shortcutResult to run shortcut "WebReader" with input "Your Input"//end tell
//	`;
//	
//	try {
//		const result = await executeAppleScript(script, "Hello", "World");
//		console.log(result);
//	} catch (error) {
//		console.error("Error:", error.message);
//	}
//}

//example();

module.exports = executeAppleScript;