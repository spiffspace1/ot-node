import { assert } from 'chai';
import { describe, it } from 'mocha';
import CalculateHash from '../../modules/CalculateHash.js';

describe('Calculating data hash', () => {
    it('Calculating data hash of dataset using sha3-256', async () => {
        const value = 'v6-ot-node-test';
        const hashedValue = CalculateHash.calculateDataHash(value);

        assert.isString(hashedValue);
        assert.equal(hashedValue, '0x07e18a8d5069a82de35ecad01b65a19ae18d1910beca6fdc5ff3dc4ef349606f');
    });
});
