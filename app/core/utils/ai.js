/*
DiscordAI v2
The best AI bot framework on Discord.

core/utils/dai-model.js

by JustApple
*/

// dependencies
import jn_ai from '@jnode/ai';
const { AIRemoteFunction } = jn_ai;

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

    async interact(agent, conversation, context, options = {}) {
        let e;
        for (let i of this.models) {
            try { return await i.interact(agent, conversation, context, options); }
            catch (err) { e = err; }
        }
        throw e;
    }

    async streamInteract(agent, conversation, context, options = {}) {
        let e;
        for (let i of this.models) {
            try { return await i.streamInteract(agent, conversation, context, options); }
            catch (err) { e = err; }
        }
        throw e;
    }
}

// discord ai proxy model
export class DAIProxyModel {
    constructor(model, options = {}) {
        this.model = model;
        this._info = options.info;
    }

    info() {
        return this._info ?? (this._info = {

        });
    }

    interact(agent, conversation, context = {}, options = {}) {
        return this.model.interact(agent, conversation, context._context, options);
    }

    streamInteract(agent, conversation, context, options = {}) {
        return this.model.streamInteract(agent, conversation, context._context, options);
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

    streamInteract(agent, conversation, context, options = {}) {
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