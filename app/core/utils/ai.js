/*
DiscordAI v2
The best AI bot framework on Discord.

core/utils/dai-model.js

by JustApple
*/

// dependencies
import jn_ai from '@jnode/ai';
const { AIRemoteFunction, AIFunction } = jn_ai;

// discord ai fallback model
export class DAIFallbackModel {
    constructor(models = [], options = {}) {
        this.models = models;
        this._info = options.info;
    }

    info() {
        return this._info ?? (this._info = {

        });
    }

    async interact(agent, conversation, context = {}, options = {}) {
        let e;
        for (let i of this.models) {
            try { return await i.interact(agent, conversation, context, options); }
            catch (err) { e = err; }
        }
        throw e;
    }

    async *streamInteract(agent, conversation, context = {}, options = {}) {
        let e;
        for (let i of this.models) {
            try {
                for await (let e of i.streamInteract(agent, conversation, context, options)) {
                    yield e;
                }
                return;
            } catch (err) {
                e = err;
            }
        }
        throw e;
    }
}

// discord ai proxy model
export class DAIProxyModel {
    constructor(model, options = {}) {
        this.model = model;
        this._info = options.info;
        this.basePrice = BigInt(options.basePrice ?? 0);
        this.inputPrice = BigInt(options.inputPrice ?? 60_000);
        this.outputPrice = BigInt(options.outputPrice ?? 360_000);
    }

    info() {
        return this._info ?? (this._info = {

        });
    }

    async interact(agent, conversation, context = {}, options = {}) {
        const res = await this.model.interact(agent, conversation, context._context, options);
        res.meta ??= {};
        res.meta.price = this.basePrice + BigInt(res.meta?.inputTotal ?? 0) * this.inputPrice + BigInt(res.meta?.outputTotal ?? 0) * this.outputPrice;
        return res;
    }

    async *streamInteract(agent, conversation, context = {}, options = {}) {
        const stream = this.model.streamInteract(agent, conversation, context._context, options);
        for await (let i of stream) {
            if (i.type === 'end') {
                i.conversation.meta ??= {};
                console.log(i.conversation.meta)
                i.conversation.meta.price = this.basePrice + BigInt(i.conversation.meta?.inputTotal ?? 0) * this.inputPrice + BigInt(i.conversation.meta?.outputTotal ?? 0) * this.outputPrice;
            }
            yield i;
        }
        return;
    }
}

// discord ai user custom model
export class DAIUserCustomModel {
    constructor(serviceRegistery = {}, options = {}) {
        this.serviceRegistery = serviceRegistery;
        this._info = options.info;
    }

    info() {
        return this._info ?? (this._info = {

        });
    }

    interact(agent, conversation, context = {}, options = {}) {
        if (!(context._service && context._model)) throw new Error('Not working.')
        return this.serviceRegistery[context._service].model(context._model, { auth: context._auth })
            .interact(agent, conversation, context._context, options);
    }

    streamInteract(agent, conversation, context = {}, options = {}) {
        return this.serviceRegistery[context._service].model(context._model, { auth: context._auth })
            .streamInteract(agent, conversation, context._context, options);
    }
}

// discord ai remote function
export class DAIRemoteFunction extends AIRemoteFunction {
    constructor(url, config, options = {}) {
        super(url, config, options);
    }

    call(args, ctx) {
        return super.call(args, ctx._remoteContext);
    }
}

// discord ai toolkit
export class DAIToolkit {
    constructor(name, description, tools = []) {
        this.name = name;
        this.description = description;
        this.kit = tools;
    }
}

export const unknownFunction = new AIFunction('UNKNOWN', 'UNKNOWN_FUNCTION', {}, (params, ctx) => {
    return { status: 'ERROR', code: 'UNKNOWN_FUNCTION', message: `Sorry, this function is not avaliable. Maybe this function is not in user <@${ctx.author.id}> **${ctx.author.username}**'s toolkits.` }
});