import { sha3_256 } from 'js-sha3'

/**
 * Calculating data hash of dataset using sha3-256.
 * Returns data hash value
 @param dataset for which is calculated data hash
 */
function calculateDataHash(dataset) {
    return `0x${sha3_256(dataset, null, 0)}`;
}

export default {
    calculateDataHash,
};
