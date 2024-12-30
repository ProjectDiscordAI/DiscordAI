const gemini = require('@jnode/gemini');

const addMemory = new gemini.Function('add_memory', '(Memory/Silent Action) Add a new memory for the user.', {
	type: 'OBJECT',
	properties: {
		uid: { type: 'string', description: 'User ID.  Example: "1234567890"' },
		memory: { type: 'string', description: 'The memory content to be added. Example: "User is making a web game."' }
	},
	required: ['uid', 'memory']
}, async (d, e) => {
	if (e.message.uid !== d.uid || e.author.id !== d.uid) {
		return { status: 'FAILED', error: 'Unauthorized access' };
	}
	
	try {
		await e.addMemory(d.uid, d.memory);
		e.response.embeds.push({ description: 'Memory updated!' });
		return { status: 'SUCCEED' };
	} catch (error) {
		console.error(error);
		return { status: 'FAILED', error: error.message };
	}
});
addMemory.dai_hidden = true;

module.exports = addMemory;