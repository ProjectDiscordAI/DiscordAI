const gemini = require('@jnode/gemini');

//delete memories
const deleteMemories = new gemini.Function('delete_memories', '(Memory/Silent Action) Delete memories about the user. Note that you should never run this twice a time or run this after add_memory.', {
	type: 'OBJECT',
	properties: {
		uid: { type: 'string', description: 'User ID. Example: "1234567890"' },
		indexes: {
			type: 'ARRAY',
			description: 'Memory indexes to delete.',
			items: {
				type: 'INTEGER',
				description: 'Memory index.'
			}
		}
	},
	required: ['uid', 'indexes']
}, async (d, e) => {
	if (e.message.uid !== d.uid || e.author.id !== d.uid) {
		return { status: 'FAILED', error: 'Unauthorized access' };
	}
	
	try {
		await e.deleteMemory(d.uid, d.indexes);
		e.response.embeds.push({ description: 'Memory updated!' });
		return { status: 'SUCCEED' };
	} catch (error) {
		console.error(error);
		return { status: 'FAILED', error: error.message };
	}
});
deleteMemories.dai_hidden = true;

module.exports = deleteMemories;