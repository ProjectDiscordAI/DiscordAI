/*
DiscordAI v2
The best AI bot framework on Discord.

core/utils/cache.js

by JustApple
*/

// cache manager
export class CacheManager {
    constructor(data, options = {}) {
        this.map = new Map(data);
        this.lastGC = Date.now(); // last gc time
        this.forceGC = options.forceGC || 3600000; // force gc time
        this.max = options.max || 1000; // max map size
        this.gcPad = options.gcPad || Math.ceil(this.max * 0.3); // padding fields after gc
    }

    set(key, value) {
        this.map.set(key, value);
    }

    async get(key, loader = () => { }) {
        const value = this.map.get(key) ?? await loader();

        // refresh and return
        this.map.delete(key);
        this.map.set(key, value);

        if ((this.map.size > this.max) || ((Date.now() - this.lastGC) > this.forceGC)) this._gc();

        return value;
    }

    has(key) {
        return this.map.has(key);
    }

    _gc() {
        this.lastGC = Date.now();

        let i = 0;
        for (const key of this.map.keys()) {
            this.map.delete(key);
            if (i >= this.gcPad) break;
        }
    }
}