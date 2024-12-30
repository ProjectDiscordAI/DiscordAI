const gemini = require('@jnode/gemini');

const banUser = new gemini.Function('ban_user', '(Silent Action) Ban user from contacting you.', {
	type: 'OBJECT',
	properties: {
		user_id: {
			type: 'STRING',
			description: 'The ID of the target user.'
		}
	}
}, (d, e) => {
	if (
		e.message.uid === e.author.id &&
		(
			e.author.id === d.user_id || e.config.user.admin.includes(e.author.id)
		) &&
		!e.config.user.admin.includes(d.user_id)
	) {
		e.config.user.banned.push(d.user_id);
		e.response.embeds.push({
			color: 0xef233c,
			description: `<@${d.user_id}> You are banned by the bot, please contact the developer for further actions.`
		});
	} else {
		e.response.embeds.push({
			description: `A request of banning <@${d.user_id}> is rejected, because it may cause by prompt injection.`
		});
		
		if (e.message.uid === e.author.id) { //no permission
			e.config.user.banned.push(e.author.id);
			e.response.embeds.push({
				color: 0xef233c,
				description: `<@${e.author.id}> You are banned by the system due to trying prompt inject, please contact the developer for further actions.`
			});
		}
	}
	return;
});
banUser.dai_hidden = true;

module.exports = banUser;