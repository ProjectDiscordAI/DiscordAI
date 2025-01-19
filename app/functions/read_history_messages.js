const gemini = require('@jnode/gemini');

const readHistoryMessages = new gemini.Function(
	'read_history_messages',
	'(Standard Action) Read history messages in current channel.', {
		type: 'OBJECT',
		properties: {
			'limit': {
				type: 'NUMBER',
				description: 'Max number of messages to return (1-100). Leave null for default: 50. (e.g. `100`)',
				nullable: true
			},
			'before_message': {
				type: 'STRING',
				description: 'Get messages before this message ID. Leave null to read from the latest message of this channel (but recommend to set a message id). (e.g. `123456789`)',
				nullable: true
			}
		}
	}, async (d, e) => {
		try {
			//fetch from disocrd
			const messages = await e.bot.apiRequest('GET', `/channels/${e.message.channel_id}/messages?limit=` + (d.limit ?? '50') + (d.before_message ? `&before=${d.before_message}` : ''));
			let result = [];
			
			//turn to simple format
			for (let i of messages.json()) {
				result.push({
					id: i.id,
					author: {
						role: i.author.id === e.config.bot.id ? 'You' : (e.config.user.custom_role[i.author.id] ?? e.config.user.default_role ?? 'USER'),
						display_name: i.author.global_name,
						username: i.author.username,
						mention: `<@${i.author.id}>`
					},
					content: i.content,
					time: (new Date(i.timestamp)).toLocaleString(),
					attachments_count: i.attachments.length
				});
			}
			//console.log(result);
			return {
				status: 'SUCCEEDED',
				messages: result
			};
		} catch (err) {
			console.error(err);
			return {
				ststus: 'ERROR',
				error_message: err.message
			};
		}
	}
);
readHistoryMessages.dai_name = 'Read history messages';

module.exports = readHistoryMessages;