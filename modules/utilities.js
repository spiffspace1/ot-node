import { Record } from 'libp2p-record';
import { sha256 } from 'multiformats/hashes/sha2';

/**
 * Creates a DHT ID by hashing a given Uint8Array.
 *
 * @param {Uint8Array} buf
 * @returns {Promise<Uint8Array>}
 */
export const convertBuffer = async (buf) => (await sha256.digest(buf)).digest;

/**
 * Create a new put record, encodes and signs it if enabled.
 *
 * @param {Uint8Array} key
 * @param {Uint8Array} value
 * @returns {Uint8Array}
 */
export const createPutRecord = (key, value) => {
    const timeReceived = new Date();
    const rec = new Record(key, value, timeReceived);

    return rec.serialize();
};

export const isArrayOfStrings = (arr) => {
    try {
        const bodyAssets = JSON.parse(arr.toLowerCase());
        if (!(Array.isArray(bodyAssets)) | !(bodyAssets.length > 0) | !bodyAssets.every((i) => (typeof i === 'string')) | bodyAssets[0] === '') {
            return false;
        }
    } catch (e) {
        return false;
    }
    return true;
};

class Utilities {

}
