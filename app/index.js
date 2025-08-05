/*
DiscordAI

Simple Discord AI bot using Gemini API.
Must install @jnode/cahce @jnode/requests @jnode/gemini @jnode/discord.
Must use Node.js v22.4.0 or later for WebSocket (Discord gateway).

by JustApple
*/

//load node packages
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

//load JustNode packages
const request = require('@jnode/request')
const discord = require('@jnode/discord');
const gemini = require('@jnode/gemini');
const Cacher = require('@jnode/cache');

//set file path
process.chdir(path.dirname(path.resolve(__filename)));

//load and format config
const config = require('./config.json') ?? {};
if (!config.bot) config.bot = {};
if (!config.ai) config.ai = {};
if (!config.user) config.user = {};
if (!config.user.custom_role) config.user.custom_role = {};
if (!config.user.banned) config.user.banned = [];
if (!config.user.admin) config.user.admin = [];
if (!config.user.allowed_bot) config.user.allowed_bot = [];
if (!config.user.allowed_mentions) config.user.allowed_mentions = [];
if (!config.core) config.core = {};
if (!config.encryption) config.encryption = {};
if (!config.custom) config.custom = {};

//start message
console.log(`\x1b[36m
=====================================================================================\x1b[38;2;88;101;242m
░███████   ░██                                                 ░██    ░███    ░██████
░██   ░██                                                      ░██   ░██░██     ░██  
░██    ░██ ░██ ░███████   ░███████   ░███████  ░██░████  ░████████  ░██  ░██    ░██  
░██    ░██ ░██░██        ░██    ░██ ░██    ░██ ░███     ░██    ░██ ░█████████   ░██  
░██    ░██ ░██ ░███████  ░██        ░██    ░██ ░██      ░██    ░██ ░██    ░██   ░██  
░██   ░██  ░██       ░██ ░██    ░██ ░██    ░██ ░██      ░██   ░███ ░██    ░██   ░██  
░███████   ░██ ░███████   ░███████   ░███████  ░██       ░█████░██ ░██    ░██ ░██████\x1b[36m
=====================================================================================\x1b[0m`);
console.log('\nWelcome to DiscordAI v1.0\n');

//load encryption key
let key;
try {
	key = fs.readFileSync(config.encryption.key_file ?? './encryption.key');
} catch (err) {
	console.log('Generating new encryption key for you...');
	key = crypto.randomBytes(32); //generate a key
	fs.writeFileSync(config.encryption.key_file ?? './encryption.key', key);
}

//create discord and gemini client
const bot = new discord.Client(config.bot.token, { gatewayIntents: 0b1001001000010000, ...(config.bot.client_options) });
const ai = new gemini.Client(config.ai.key, { fileUnsupportError: false, ...config.ai.client_options });

//load instruction and functions
const instruction = fs.readFileSync(config.ai.instruction_file ?? './system.md').toString('utf8');
const functions = require(config.ai.functions_file ?? './functions.js');

//create model
const model = ai.model(config.ai.model, {
	systemInstruction: instruction,
	functions: Array.isArray(functions) ? functions : null,
	...(config.ai.model_options)
});

//gemini supported mime types
const supportedMime = Object.keys(gemini.supportMimeTypes);

//cache messages to reduce api requests
const messageCacher = new Cacher(undefined, config.core.message_cache_timeout ?? 900000);
const fileCacher = new Cacher(undefined, config.core.file_cache_timeout ?? 900000);
const memoryCacher = new Cacher(undefined, config.core.memory_cache_timeout ?? 3600000);

//connect to discord
bot.connectGateway().then((gateway) => {
	//socket event log
	gateway.on('socketOpened', () => { logWithTime('Connected to Discord.'); });
	gateway.on('socketClosed', () => { logWithTime('Disconnect to Discord.'); });
	gateway.on('timeout', () => { logWithTime('Timeouted while connect to discord.'); });
	gateway.on('READY', (d) => {
		logWithTime(`DiscordAI launched as ${d.user.username} (${d.user.id}).`);

		//set bot id automatically
		if (!config.bot.id) config.bot.id = d.user.id;

		//bot status
		if (config.bot.status) gateway.sendMessage(3, config.bot.status);
	});

	//edit message cache
	gateway.on('MESSAGE_UPDATE', (d) => {
		messageCacher.edit(`${d.channel_id}-${d.id}`, d);
	});

	//receive messages
	gateway.on('MESSAGE_CREATE', (d) => {
		//ignore bots, self and banned users
		if (
			(d.author.bot && (!(config.user.allowed_bot ?? []).includes(d.author.id))) ||
			(d.author.id === config.bot.id) ||
			((config.user.banned ?? []).includes(d.author.id))
		) return;

		//check if mentioned
		if (d.mentions.find(e => e.id === config.bot.id)) {
			messageCacher.set(`${d.channel_id}-${d.id}`, d); //push cache
			generate(d, d.author); //generate response
		}
		return;
	});

	//interaction
	gateway.on('INTERACTION_CREATE', async (d) => {
		const user = (d.user ?? d.member.user); //get user object

		//ignore bots and banned users
		if (
			(user.bot && (!(config.user.allowed_bot ?? []).includes(user.id))) ||
			((config.user.banned ?? []).includes(user.id))
		) return;

		//handle interactions
		if (d.type === 2) { //application commands
			if (d.data.type === 3) { //message commands
				//generate command
				if (d.data.name === (config.core.generate_command ?? 'Generate')) {
					//start loading in secret
					bot.apiRequest('POST', `/interactions/${d.id}/${d.token}/callback`, {
						type: 5, data: { flags: 1 << 6 }
					});

					//get target message
					const message = await getMessage(d.channel_id, d.data.target_id);

					//generate response
					await generate(message, user);

					//delete loading
					bot.apiRequest(
						'DELETE', `/webhooks/${config.bot.id}/${d.token}/messages/@original`
					);

					return;
				} else if (d.data.name === (config.core.message_debug_command ?? 'Debug')) { //message debugger
					//check permission
					if (config.user.admin && config.user.admin.includes(user.id)) {
						//start loading in secret
						bot.apiRequest('POST', `/interactions/${d.id}/${d.token}/callback`, {
							type: 5, data: { flags: 1 << 6 }
						});

						//get target message
						const message = await getMessage(d.channel_id, d.data.target_id);

						//attachments for result
						let attachments = [];

						//message json object
						attachments.push({
							name: 'message.json',
							type: 'application/json',
							data: Buffer.from(JSON.stringify(message, null, 2), 'utf8')
						});

						//decrypted daied
						for (let i of message.attachments) {
							if (i.filename.endsWith('.daied')) { //system file, DiscordAIEncryptedData
								if (i.filename.endsWith('f.daied')) { //function call
									//load file data
									let f = await getFile(i.url, `${message.channel_id}-${message.id}-f.daied`);
									attachments.push({
										name: `${i.filename}.json`,
										type: 'application/json',
										data: Buffer.from(JSON.stringify(f, null, 2), 'utf8')
									});
								} else if (i.filename.endsWith('e.daied')) { //error
									//load file data
									let f = await getFile(i.url, `${message.channel_id}-${message.id}-e.daied`);
									attachments.push({
										name: `${i.filename}.json`,
										type: 'application/json',
										data: Buffer.from(JSON.stringify(f, null, 2), 'utf8')
									});
								} else { //any
									//load file data
									let f = await getFile(i.url, `${message.channel_id}-${message.id}-${i.filename}`);
									attachments.push({
										name: `${i.filename}.json`,
										type: 'application/json',
										data: Buffer.from(JSON.stringify(f, null, 2), 'utf8')
									});
								}
							}
						}

						//hidden file in embed
						if (message.embeds) {
							for (let i of message.embeds) {
								if (i.image && i.image.url) {
									const { pathname } = new URL(i.image.url);
									if (pathname.endsWith('f.daied')) {
										let f = await getFile(i.image.url, `${message.channel_id}-${message.id}-f.daied`);
										attachments.push({
											name: `f.json`,
											type: 'application/json',
											data: Buffer.from(JSON.stringify(f, null, 2), 'utf8')
										});
									}
								}
							}
						}

						//response
						let response = {
							content: '```\nMESSAGE DEBUGGER\n```'
						};

						//set attachments to response
						response.attachments = [];
						for (let i = 0; i < attachments.length; i++) {
							response.attachments.push({
								id: i,
								filename: attachments[i].name,
								contet_type: attachments[i].type
							});
						}

						//send multi part request
						res = await bot.apiRequestMultipart('PATCH', `/webhooks/${config.bot.id}/${d.token}/messages/@original`, response, attachments);

						return;
					} else {
						//reject
						bot.apiRequest('POST', `/interactions/${d.id}/${d.token}/callback`, {
							type: 4,
							data: {
								content: config.debugNoPermission ?? '```\nThis command is not for you.\n```',
								flags: 1 << 6
							}
						});
					}

					return;
				}
			}
		} else if (d.type === 3) { //buttons
			if (d.data.custom_id === 'Generate') { //Generate button
				//start loading in secret
				bot.apiRequest('POST', `/interactions/${d.id}/${d.token}/callback`, {
					type: 5, data: { flags: 1 << 6 }
				});

				//generate response
				await generate(d.message, user);

				//delete loading
				bot.apiRequest(
					'DELETE', `/webhooks/${config.bot.id}/${d.token}/messages/@original`
				);

				return;
			} else if (d.data.custom_id === 'Ignore') { //Ignore button
				//start loading in secret
				bot.apiRequest('POST', `/interactions/${d.id}/${d.token}/callback`, {
					type: 6, data: { flags: 1 << 6 }
				});

				//clear button
				if (d.message.author.id === config.bot.id) {
					bot.apiRequest('PATCH', `/channels/${d.message.channel_id}/messages/${d.message.id}`, { components: [] });
				}

				return;
			} else if (d.data.custom_id === 'GetFCInfo') { //get function call info
				//start loading
				bot.apiRequest('POST', `/interactions/${d.id}/${d.token}/callback`, {
					type: 5, data: { flags: 1 << 6 }
				});

				//get target message
				const message = await getMessage(d.message.channel_id, d.message.id);

				//decrypted daied
				let f = {};
				for (let i of message.attachments) {
					if (i.filename.endsWith('f.daied') && message.author.id === config.botId) { //function call
						//load file data
						f = await getFile(i.url, `${message.channel_id}-${message.id}-f.daied`);
					}
				}

				//hidden file in embed
				if (message.embeds) {
					for (let i of message.embeds) {
						if (i.image && i.image.url) {
							const { pathname } = new URL(i.image.url);
							if (pathname.endsWith('f.daied')) {
								f = await getFile(i.image.url, `${message.channel_id}-${message.id}-f.daied`);
							}
						}
					}
				}

				//push to embed fields
				let fields = [];
				if (f.c) {
					for (let i of f.c.parts) {
						if (i.functionCall) { //is function call
							const f = model.options.functions.find(e => e.name === i.functionCall.name);
							fields.push({
								inline: true,
								name: f.dai_name ?? i.functionCall.name,
								value: f.dai_fcInfo ? f.dai_fcInfo(i.functionCall.args) : ('```json\n' + JSON.stringify(i.functionCall.args, null, 2) + '\n```')
							});
						}
					}
				}

				//send embed
				res = await bot.apiRequest(
					'PATCH', `/webhooks/${config.bot.id}/${d.token}/messages/@original`, {
					embeds: [{
						title: config.custom.info_embed_title ?? 'Called Actions Info',
						fields: fields,
						...(config.custom.info_embed ?? {})
					}]
				}
				);

				return;
			}
		}
		return;
	});
});

//log with human readable time
function logWithTime(...inputs) {
	const time = (new Date()).toLocaleString();
	return console.log(`\x1b[90m[${time}]\x1b[0m`, ...inputs);
}

//generate response
async function generate(message, author) {
	author = author ?? message.author;

	//response message object
	let response = {
		allowed_mentions: {
			parse: ['users'],
			users: new Set([...(config.user.allowed_bot), ...(config.user.allowed_mentions)]),
			replied_user: !message.author.bot && (author.id === message.author.id)
		},
		message_reference: { message_id: message.id },
		embeds: []
	};

	//define datas
	let collected, contents, cf;
	let attachments = [];
	let functionCalls = [];
	let functionResponseParts = [];
	let f = {};
	let embedsOriginDescription = '';
	let autoRun = true;
	let actionDescription;
	let log = '';

	//catch errors
	try {
		//collect contents
		collected = await collectContents(message);
		contents = collected.contents;
		cf = collected.f ?? {};
		message.uid = collected.uid ?? message.author.id;

		//add log
		log += `\x1b[1m${author.username}\x1b[0m (\x1b[1m${author.id}\x1b[0m) trigger a response with \x1b[1m${contents.length}\x1b[0m messages.\n`;

		//time
		if (!config.core.no_system_message) contents.unshift([true, `---- SYSTEM_MESSAGE ENVIORMENT_INFO CURRENT_TIME:"${(new Date()).toLocaleString(config.core.time_language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: "numeric", second: 'numeric' })}" ----`]);

		//run function calls
		if (cf.c) {
			//get function calls
			for (let i of cf.c.parts) {
				if (i.functionCall) { //push function call
					functionCalls.push({
						name: i.functionCall.name,
						args: i.functionCall.args,
						function: model.options.functions.find(e => e.name === i.functionCall.name)
					});
				}
			}

			//run and push content
			const extraData = { contents, response, attachments, bot, message, author, config, daiedToJson, jsonToDaied, getMessage, getFile, deleteMemory, addMemory, getMemory, extendContent: [true] }; //extra data
			for (let i of functionCalls) { //run every function with await
				functionResponseParts.push({ //push parts
					functionResponse: {
						name: i.name,
						response: await i.function.func(i.args, extraData) //run target function
					}
				});
				log += `\t\x1b[1m${i.name}\x1b[0m has been executed.\n`;
			}
			f.r = { role: 'function', parts: functionResponseParts };
			contents.push(f.r); //push to contents
			if (extraData.extendContent.length > 1) { //extend contents
				f.re = extraData.extendContent;
				contents.push(extraData.extendContent);
			}

			actionDescription = extraData.actionDescription; //set action description

			//clear button
			if (message.author.id === config.bot.id) {
				bot.apiRequest('PATCH', `/channels/${message.channel_id}/messages/${message.id}`, { components: [] });
			}
		}

		//start typing
		bot.apiRequest('POST', `/channels/${message.channel_id}/typing`, {});

		//generate with memory
		if (!config.core.no_memory_system && (author.id === message.uid)) {
			const memory = memoryToReadable(author.id, await getMemory(author.id));
			const urole = config.user.custom_role[author.id] ?? config.user.default_role ?? 'USER';
			result = await model.generate(contents, {
				systemInstruction:
					`${instruction}\n\n---- MEMORIES ` +
					`USER_ROLE:"${urole}" ` +
					`USER_ID:"${author.id}" ` +
					`USER_ACCOUNT_NAME:"${author.username}" ` +
					`USER_DISPLAY_NAME:"${author.global_name}" ----\n` +
					memory
			});
		} else {
			result = await model.generate(contents);
		}

		//check long text
		if (result.text.length >= 2000) {
			//push to attachments
			attachments.push({
				name: 'message.md',
				type: 'text/markdown',
				data: Buffer.from(result.text, 'utf8')
			});
		} else if (result.text) {
			//send as normal message
			response.content = result.text;
		}

		//check function calls
		if (result.functionCalls.length > 0) {
			const extraData = { contents, response, attachments, bot, message, author, config, daiedToJson, jsonToDaied, getMessage, getFile, deleteMemory, addMemory, getMemory, extendContent: [] }; //extra data
			let partRemoves = [];
			let callRemoves = [];
			for (let i in result.functionCalls) {
				if (result.functionCalls[i].function.dai_hidden) { //hidden actions
					await result.functionCalls[i].function.func(result.functionCalls[i].args, extraData); //run target function
					partRemoves.unshift(result.functionCalls[i].partIndex);
					callRemoves.unshift(i);
					log += `\t\x1b[1m${i.name}\x1b[0m has been executed silently.\n`;
				} else {
					f.c = result.content;
				}
				autoRun = autoRun && result.functionCalls[i].function.dai_auto; //auto run
			}
			partRemoves.map((e) => { result.content.parts.splice(e, 1); }); //delete the parts
			callRemoves.map((e) => { result.functionCalls.splice(e, 1); }); //delete the parts

			actionDescription = extraData.actionDescription; //set action description
		}

		//anti infinite function call
		if (f.r && f.c) autoRun = false;

		//push fr fc to attachments
		if (f.r || f.c) {
			attachments.unshift({
				name: 'f.daied',
				type: 'binary/octed-stream',
				data: jsonToDaied(f)
			});

			//function call embed
			response.embeds.push({
				description: (actionDescription) ?? (
					(f.r ? (
						(config.custom.finish_before ?? 'Receive `') +
						functionResponseParts.length +
						(config.custom.finish_after ?? '` action response(s).\n')
					) : '') +
					(f.c ? (
						(config.custom.request_before ?? 'Run: ') +
						result.functionCalls.map(i => (i.function.dai_fcInfoShort ? i.function.dai_fcInfoShort(i.args) : i.function.dai_name) ?? i.function.name).join(config.custom.request_split ?? ', ') +
						(config.custom.request_after ?? '.')
					) : '')
				),
				image: { url: 'attachment://f.daied' },
				...config.custom.f_embed
			});
		}

		//function call buttons
		if (f.c && !autoRun) {
			response.components = [{
				type: 1,
				components: [
					{
						type: 2,
						style: 1,
						label: config.custom.info_button ?? 'Info',
						custom_id: 'GetFCInfo'
					},
					{
						type: 2,
						style: 3,
						label: config.custom.accept_button ?? 'Accept',
						custom_id: 'Generate'
					},
					{
						type: 2,
						style: 4,
						label: config.custom.ignore_button ?? 'Ignore',
						custom_id: 'Ignore'
					}
				]
			}];
		}
	} catch (err) {
		//log error
		console.error(err);

		//too many request error
		if (err.code === 429 || err.code === 503) {
			response.embeds.push({
				title: 'Too many requests!',
				description: `Please wait for a while.`,
				color: 0xffc300,
				author: {
					name: `${author.username} @${author.id}`,
					icon_url: `https://cdn.discordapp.com/avatars/${author.id}/${author.avatar}.webp`
				},
				...(config.custom.timeout_embed)
			});
		} else {
			response.embeds.push({
				title: 'Oh no, it\'s something wrong!',
				description: 'The `e.daied` file is the error log. \nIf you keep receiving this message, please contact the developer.',
				color: 0xef233c,
				author: {
					name: `${author.username} @${author.id}`,
					icon_url: `https://cdn.discordapp.com/avatars/${author.id}/${author.avatar}.webp`
				},
				...(config.custom.error_embed)
			});

			let e = {
				name: err.name,
				message: err.message,
				stack: err.stack,
				time: (new Date()).toLocaleString(),
				contents: contents
			};
			for (let i in err) e[i] = err[i];

			attachments.push({ //push error log to attachments
				name: 'e.daied',
				type: 'binary/octed-stream',
				data: jsonToDaied(e)
			});
		}
	} finally {
		//attachments
		let res;
		if (attachments.length > 0) {
			//set attachments to response
			response.attachments = [];
			for (let i = ((f.r || f.c) ? 1 : 0); i < attachments.length; i++) {
				response.attachments.push({
					id: i,
					filename: attachments[i].name,
					contet_type: attachments[i].type
				});
			}

			//send multi part request
			res = await bot.apiRequestMultipart('POST', `/channels/${message.channel_id}/messages`, response, attachments);
		} else {
			//send message
			res = await bot.apiRequest('POST', `/channels/${message.channel_id}/messages`, response);
		}

		//log
		console.log(log);

		//get json response
		res = res.json();

		//write cache
		messageCacher.set(`${res.channel_id}-${res.id}`, res);
		if (f) fileCacher.set(`${res.channel_id}-${res.id}-f.daied`, f);

		//auto run
		if (f.c && autoRun) {
			generate(res, author);
		}
	}
	return;
}

async function collectContents(message, contents = [], uid) {
	let parts = [];
	let modelFileParts = [true]; //a user turn
	let text = message.content ?? '';

	//check forward message or normal message
	if (message.isForwarding) {
		parts.push(true); //forward message is always user trun for gemini api
		if (!config.noSystemMsg) parts.push('---- SYSTEM_MESSAGE FORWARDED_MESSAGE ----');
	}

	//check message author
	const isUser = message.isForwarding ? true : (message.author.id !== config.bot.id);
	if (isUser && !uid && !message.isForwarding) uid = message.author.id;
	parts.push(isUser); //set content role

	//add system message
	if (!config.core.no_system_message && isUser && !message.isForwarding) {
		//author info
		const uid = message.author.id;
		const urole = config.user.custom_role[uid] ?? config.user.default_role ?? 'USER';
		parts.push(
			'---- SYSTEM_MESSAGE MESSAGE_INFO ' +
			`MESSAGE_ID:"${message.id} ` +
			`MESSAGE_TIME:"${(new Date()).toLocaleString(config.core.time_language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: "numeric", second: 'numeric' })}" ` +
			`AUTHOR_ROLE:"${urole} ` +
			`AUTHOR_DISPLAY_NAME:"${message.author.global_name}" ` +
			`AUTHOR_ACCOUNT_NAME:"${message.author.username}" ` +
			`AUTHOR_ID:"${uid}" ` +
			'----\n'
		);
	}

	//scan attachments
	let f = {};
	if (message.attachments) {
		for (let i of message.attachments) {
			if (i.filename === 'message.txt' || i.filename === 'message.md') { //long messages
				parts.push(await getFile(i.url));
			} else if (i.filename.endsWith('.daied') && !isUser) { //system file, DiscordAIEncryptedData
				if (i.filename.endsWith('f.daied')) { //function call
					//load file data
					f = await getFile(i.url, `${message.channel_id}-${message.id}-f.daied`);
				}
			} else { //any file
				if (isUser) { //insert to user turn
					if (!config.core.no_system_message) parts.push(
						'---- SYSTEM_MESSAGE ATTACHMENT_INFO ' +
						`ATTACHMENT_NAME:"${i.filename}" ` +
						`ATTACHMENT_URL:"${i.url}" ` +
						'----\n'
					);
					if (supportedMime.includes(path.extname(i.filename))) parts.push({ fileUrl: i.url });
				} else { //files in model turn will be insert to previous user turn
					if (!config.core.no_system_message) modelFileParts.push(
						'---- SYSTEM_MESSAGE FUNCTION_RESPONSE_ATTACHMENT_INFO ' +
						`ATTACHMENT_NAME:"${i.filename}" ` +
						`ATTACHMENT_URL:"${i.url}" ` +
						'----\n'
					);
					if (supportedMime.includes(path.extname(i.filename))) modelFileParts.push({ fileUrl: i.url });
				}
			}
		}
	}

	//push text content
	if (text) parts.push(text);

	//hidden file in embed
	if (message.embeds && !isUser) {
		for (let i of message.embeds) {
			if (i.image && i.image.url) {
				const { pathname } = new URL(i.image.url);
				if (pathname.endsWith('f.daied')) {
					f = await getFile(i.image.url, `${message.channel_id}-${message.id}-f.daied`);
				}
			}
		}
	}

	//push content
	contents.unshift(f.c ?? parts); //push function call
	if (modelFileParts.length > 1) contents.unshift(modelFileParts); //push files in model turn
	if (f.re) contents.unshift(f.re); //push function response extend content
	if (f.r) contents.unshift(f.r); //push function response

	//load reference
	let reference;
	if (message.message_reference) {
		if (message.referenced_message) { //get reference message faster
			reference = message.referenced_message;
		} else if (message.message_snapshots) { //message forwarding
			reference = message.message_snapshots[0].message;
			reference.isForwarding = true;
		} else {
			try {
				reference = await getMessage(message.message_reference.channel_id, message.message_reference.message_id);
			} catch (err) {
				//return
				return { contents, f, uid };
			}
		}
		uid = (await collectContents(reference, contents, uid)).uid; //collect reference
	}

	//return
	return { contents, f, uid };
}

//get messages simply
function getMessage(channelId, messageId) {
	return messageCacher.get(`${channelId}-${messageId}`, async () => { //get from cache
		//no that cache, make an api request to get it
		return (await bot.apiRequest(
			'GET', `/channels/${channelId}/messages/${messageId}`
		)).json();
	});
}

//get files simply
function getFile(fileUrl, daied) {
	return fileCacher.get(daied ?? fileUrl, async () => { //get from cache
		//no that cache, make an api request to get it
		const res = await request.request('GET', fileUrl);
		if (daied) {
			return daiedToJson(res.body); //json data
		} else {
			return res.text(); //text data
		}
	});
}

//encrypt json data to .daied
function jsonToDaied(jsonData) {
	const iv = crypto.randomBytes(16);
	const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
	return Buffer.concat([iv, cipher.update(JSON.stringify(jsonData), 'utf8'), cipher.final()]);
}

//decrypt .daied to json
function daiedToJson(data) {
	const iv = data.subarray(0, 16);
	const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
	return JSON.parse(Buffer.concat([decipher.update(data.subarray(16)), decipher.final()]));
}

//get memory
async function getMemory(uid) {
	return memoryCacher.get(uid, async () => {
		try {
			const memoryData = await fs.promises.readFile(
				path.resolve((config.core.memory_folder ?? './memory/'), `${uid}.json`), 'utf-8'
			);
			return JSON.parse(memoryData);
		} catch (err) {
			await fs.promises.writeFile(
				path.resolve((config.core.memory_folder ?? './memory/'), `${uid}.json`), '[]'
			);
			return [];
		}
	});
}

//add memory
async function addMemory(uid, memory) {
	const memories = await getMemory(uid);
	memories.push({
		time: (new Date()).toLocaleString(config.core.time_language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: "numeric", second: 'numeric' }),
		content: memory
	});
	await saveMemory(uid);
	return;
}

//delete memory
async function deleteMemory(uid, indexes) {
	const memories = await getMemory(uid);
	indexes.sort((x, y) => y - x).forEach(e => memories.splice(e, 1));
	await saveMemory(uid);
}

//save to file
async function saveMemory(uid) {
	await fs.promises.writeFile(
		path.resolve((config.core.memory_folder ?? './memory/'), `${uid}.json`),
		JSON.stringify(await getMemory(uid), null, 2)
	);
}

//to readable format
function memoryToReadable(uid, memories) {
	if (!memories || memories.length === 0) {
		return "No memory.";
	}

	let readableMemories = memories.map((memory, index) => {
		const time = memory.time;
		const content = memory.content;
		return `${index}. [${time}] ${content}`;
	}).join('\n\n');

	return readableMemories;
}

//error catcher
process.on('uncaughtException', (e) => {
	console.error(e, JSON.stringify(e.body, null, 2));
});