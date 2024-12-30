const fs = require('fs');
const path = require('path');

function requireAllJS(folder) {
	const files = fs.readdirSync(folder);
	const jsFiles = files.filter(file => path.extname(file) === '.js');
	return jsFiles.map(file => require(path.resolve(folder, file)));
}

module.exports = requireAllJS('./functions/');