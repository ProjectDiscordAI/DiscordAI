const gemini = require('@jnode/gemini');

const reactEmoji = new gemini.Function(
	'react_emoji',
	"(Silent Action) React an emoji to the last message you received.",
	{
		type: 'OBJECT',
		properties: {
			'emoji': {
				type: 'STRING',
				description: "Emoji to react, for custom emojis on Discord, you can use the following format: `name:id` (Users will use them as `<:name:id>` or `<a:name:id>` in message, but you should only use `name:id` for reacting it.). (e.g. `❤️`, `✨`, `cat:123456`, `dog:12345678`)"
			}
		}
	},
	async (d, e) => {
		try {
			await e.bot.apiRequest(
				'PUT',
				`/channels/${e.message.channel_id}/messages/${e.message.id}/reactions/${encodeURI(d.emoji)}/@me`
			);
			return { status: 'SUCCEEDED' };
		} catch (err) {
			console.error(d, err);
			return { status: 'ERROR', system_message: 'Ignore this if it\'s not requested by user.' };
		}
	}
);
reactEmoji.dai_hidden = true; //hidden action

module.exports = reactEmoji;