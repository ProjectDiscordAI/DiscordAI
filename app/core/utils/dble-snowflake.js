/*
DiscordAI v2
The best AI bot framework on Discord.

core/utils/dble-snowflake.js

by JustApple
*/

// dependencies
import jn_dble from '@jnode/db/dble';
const { DBLEField } = jn_dble;

// Discord ID (snowflake) field
export class DBLESnowflakeField extends DBLEField { // discord snowflake
    constructor(name, isKey = true) {
        super(8, 'Snowflake', name, isKey);
    }

    parse(buf, offset) {
        return String(buf.readBigUInt64LE(offset));
    }

    write(data, buf = Buffer.alloc(this.length), offset = 0) {
        buf.writeBigUInt64LE(BigInt(data), offset);
        return buf;
    }

    default(relative = '-1') {
        return String(Number(relative) + 1);
    }
}