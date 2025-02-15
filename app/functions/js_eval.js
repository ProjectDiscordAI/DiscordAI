const gemini = require('@jnode/gemini');

const jsEval = new gemini.Function('js_eval', '(Standard Action) Run JavaScript in `await eval(script)`.', {
	type: 'OBJECT',
	properties: {
		script: {
			type: 'STRING',
			description: 'Script for eval. Supports async.'
		}
	}
}, async (d, e) => {
	if (e.config.user.admin.includes(e.author.id)) {
		try {
			return {
				status: 'SUCCEED',
				response: await eval(d.script)
			};
		} catch (err) {
			return {
				status: 'ERROR',
				message: err.message
			};
		}
	} else {
		return {
			result: 'PERMISSION_REJECTED',
			system_message: 'You can only use this when an admin asked.',
		};
	}
});
jsEval.dai_name = 'Eval JavaScript (Node.js)';

module.exports = jsEval;