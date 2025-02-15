const gemini = require('@jnode/gemini');

const randomNumber = new gemini.Function(
	'random_number', '(Auto Action) Roll a random integer between two values (inclusive). You should wait until you receive a response.', {
		type: 'OBJECT',
		properties: {
			number_start: {
				type: 'INTEGER',
				description: 'The start value (inclusive). (e.g. 1)'
			},
			number_end: {
				type: 'INTEGER',
				description: 'The end value (inclusive). (e.g. 10)'
			}
		},
		required: ['number_start', 'number_end']
	}, (d, e) => {
		const result = Math.floor(Math.random() * (d.number_end - d.number_start + 1)) + d.number_start;
		return {
			result: result
		};
	}
);
randomNumber.dai_auto = true;
randomNumber.dai_name = 'Roll a random number';

module.exports = randomNumber;