const gemini = require('@jnode/gemini');

const setActionDescription = new gemini.Function(
	'set_action_description',
	'(Hidden Action) Set a simple and short description of what function response you received and what are you going to call.\nYou can call this function with other function calls or right after received a function response.\nYou could just bot call this and system will show "Received `x` response(s).\\\nRun `x` action(s)." to user as default.\nAlso note that you should better provide both response info and call info if have.',
	{
		type: 'OBJECT',
		properties: {
			action_description: {
				type: 'STRING',
				description: 'Required. Simple and short description of what function response you received and what are you going to call. Please write in user\'s language (zh-TW).'
			}
		}
	}, (d, e) => {
		e.actionDescription = d.action_description;
		return;
	}
);
setActionDescription.dai_hidden = true;

module.exports = setActionDescription;