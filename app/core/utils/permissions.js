/*
DiscordAI v2
The best AI bot framework on Discord.

core/utils/perission.js

by JustApple
*/

// permission manager
export class PermissionManager {
    // binding: { PERMISSION: offset }
    constructor(bindings = {}, length = 8) {
        this.bindings = bindings;
        this.length = length;
    }

    // check if a buffer permission if it has permission 
    has(buf = Buffer.alloc(this.length), permission = '', offset = 0) {
        let index;
        if (typeof permission === 'number') index = permission;
        else index = this.bindings[permission];

        if (typeof index !== 'number') return false;

        const atByte = offset + Math.floor(index / 8);
        const atBit = index % 8;

        if (atByte >= buf.length) return false;

        return (buf[atByte] & (1 << atBit)) !== 0;
    }

    set(buf = Buffer.alloc(this.length), permission = '', offset = 0) {
        let index;
        if (typeof permission === 'number') index = permission;
        else index = this.bindings[permission];

        if (typeof index !== 'number') return buf;

        const atByte = offset + Math.floor(index / 8);
        const atBit = index % 8;

        if (atByte >= buf.length) return buf;

        buf[atByte] |= (1 << atBit);
        return buf;
    }

    remove(buf = Buffer.alloc(this.length), permission = '', offset = 0) {
        let index;
        if (typeof permission === 'number') index = permission;
        else index = this.bindings[permission];

        if (typeof index !== 'number') return buf;

        const atByte = offset + Math.floor(index / 8);
        const atBit = index % 8;

        if (atByte >= buf.length) return buf;

        buf[atByte] &= ~(1 << atBit);

        return buf;
    }

    toSet(buf = Buffer.alloc(this.length), offset = 0) {
        const set = new Set();
        for (let i in this.bindings) {
            if (this.has(buf, i, offset)) set.add(i);
        }
        return set;
    }

    fromSet(set = new Set(), buf = Buffer.alloc(this.length), offset = 0) {
        for (let i of set) {
            if (typeof this.bindings[i] === 'number') this.set(buf, i, offset);
        }
        return buf;
    }
}