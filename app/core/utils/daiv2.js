/*
DiscordAI v2
The best AI bot framework on Discord.

core/utils/daiv2.js

by JustApple
*/

// dependencies
import crypto from 'crypto';

// magic string
const DAIV2_MAGIC = Buffer.from('DAI2', 'ascii');

// daiv2 tool
export class Daiv2Tool {
    constructor(key) {
        this.key = key ?? crypto.randomBytes(16);
    }

    encrypt(data = {}) {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-128-gcm', this.key, iv);

        const body = Buffer.from(JSON.stringify(data));
        const len = Buffer.alloc(4);
        len.writeUInt32BE(body.length);

        const encrypted = Buffer.concat([cipher.update(len), cipher.update(body), cipher.final()]);
        const tag = cipher.getAuthTag();

        return Buffer.concat([
            DAIV2_MAGIC,
            iv,
            tag,
            encrypted
        ]);
    }

    decrypt(buf = Buffer.alloc(0)) {
        const magic = buf.subarray(0, 4);
        if (!magic.equals(DAIV2_MAGIC)) return null;

        try {
            const iv = buf.subarray(4, 16);
            const tag = buf.subarray(16, 32);
            const ciphertext = buf.subarray(32);

            const decipher = crypto.createDecipheriv('aes-128-gcm', this.key, iv);
            decipher.setAuthTag(tag);

            const decrypted = Buffer.concat([
                decipher.update(ciphertext),
                decipher.final()
            ]);

            const len = decrypted.readUInt32BE();
            const data = decrypted.subarray(4, 4 + len).toString('utf8');

            return {
                data: JSON.parse(data)
            };
        } catch {
            return null;
        }
    }
}