const gemini = require('@jnode/gemini');

const discordAPIRequest = new gemini.Function(
	'discord_api_request',
	'(Starndard Action) Make a request to Discord API when asked.', {
		type: 'OBJECT',
		properties: {
			method: {
				type: 'STRING',
				description: 'HTTP method. (e.g. GET, POST)'
			},
			path: {
				type: 'STRING',
				description: 'API path. (e.g. `/users/@me`)'
			},
			body: {
				type: 'STRING',
				description: 'Optional. Request body in JSON format.',
				nullable: true
			}
		}
	}, async (d, e) => {
		if (e.config.user.admin.includes(e.author.id)) {
			try {
				return {
					status: 'SUCCEED',
					response: (await e.bot.apiRequest(d.method, d.path, d.body ? JSON.parse(d.body) : undefined)).json()
				};
			} catch (err) {
				return {
					status: 'ERROR',
					error_message: err.message,
					error_body: err.body
				};
			}
		}
		return {
			result: 'PERMISSION_REJECTED',
			system_message: 'You can only use this when an admin asked.',
		};
	}
);

module.exports = discordAPIRequest;