import { describe, it, before } from 'mocha';
import { assert, expect, use} from 'chai';
import fs from 'fs';
import chaiAsPromised from 'chai-as-promised';
import Blazegraph from '../../external/blazegraph-service.js';
import GraphDB from '../../external/graphdb-service.js';
import Fuseki from '../../external/fuseki-service.js';
import Logger from '../../modules/logger/logger.js';

let sparqlService = null;
let logger = null;
use(chaiAsPromised);

this.makeId = function (length) {
    let result = '';
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i += 1) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
};

describe('Sparql module', () => {
    before('Initialize Logger', async () => {
        logger = new Logger('trace', false);
    });
    before('Init Sparql Module', async () => {
        const configFile = JSON.parse(fs.readFileSync('.origintrail_noderc.tests'));
        const config = configFile.graphDatabase;
        assert.isNotNull(config.url);
        assert.isNotEmpty(config.url);
        assert.isNotNull(config.name);
        assert.isNotEmpty(config.name);
        switch (config.implementation) {
            case 'Blazegraph':
                sparqlService = new Blazegraph(config);
                break;
            case 'GraphDB':
                sparqlService = new GraphDB(config);
                break;
            case 'Fuseki':
                sparqlService = new Fuseki(config);
                break;
            default:
                throw Error('Unknown graph database implementation');
        }
        await sparqlService.initialize(logger);
    });
    it('Check for cleanup', async () => {
        // Success
        expect(sparqlService.cleanEscapeCharacter('keywordabc')).to.equal('keywordabc');
        // Fail
        expect(sparqlService.cleanEscapeCharacter("keywordabc'")).to.equal("keywordabc\\'");
    });
    it('Check limit creation', async () => {
        // Success
        expect(() => sparqlService.createLimitQuery({ limit: 'abc' })).to.throw(Error);

        expect(() => sparqlService.createLimitQuery({ limit: Math.random() })).to.throw(Error);

        expect(sparqlService.createLimitQuery({})).to.equal('');
        // var randomnumber = Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
        // eslint-disable-next-line no-bitwise
        const random = (Math.random() * (99999999 - 1 + 1)) << 0;
        const negativeRandom = random * -1;

        expect(sparqlService.createLimitQuery({ limit: random })).to.equal(`LIMIT ${random}`);

        expect(() => sparqlService.createLimitQuery({ limit: negativeRandom })).to.throw(Error);
    });

    it('Check FindAssertionsByKeyword Errorhandling', async () => {
        await expect(
            sparqlService.findAssertionsByKeyword('abc', { limit: 'aaaa' }, false),
        ).to.be.rejectedWith(Error);

        await expect(
            sparqlService.findAssertionsByKeyword('abc', { limit: '90' }, 'test'),
        ).to.be.rejectedWith(Error);

        await expect(
            sparqlService.findAssertionsByKeyword('abc', {
                limit: '90',
                prefix: 'test',
            }),
        ).to.be.rejectedWith(Error);
    });

    it('Check FindAssertionsByKeyword functionality', async () => {
        const id = this.makeId(65);
        await sparqlService.insert(
            `<did:dkg:${id}> schema:hasKeywords "${id}" `,
            `did:dkg:${id}`,
        );
        // This can also be mocked if necessary
        const test = await sparqlService.findAssertionsByKeyword(
            id,
            {
                limit: 5,
                prefix: true,
            },
            true,
        );
        expect(test).to.be.not.empty;

        const testTwo = await sparqlService.findAssertionsByKeyword(
            id,
            {
                limit: 5,
                prefix: false,
            },
            true,
        );
        // eslint-disable-next-line no-unused-expressions
        expect(testTwo).to.be.not.empty;
    }).timeout(600000);

    it('Check createFilterParameter', async () => {
        expect(sparqlService.createFilterParameter('', '')).to.equal('');

        expect(sparqlService.createFilterParameter("'", '')).to.equal('');

        expect(sparqlService.createFilterParameter("'", sparqlService.filtertype.KEYWORD)).to.equal(
            "FILTER (lcase(?keyword) = '\\'')",
        );

        expect(
            sparqlService.createFilterParameter('abcd', sparqlService.filtertype.KEYWORD),
        ).to.equal("FILTER (lcase(?keyword) = 'abcd')");

        expect(
            sparqlService.createFilterParameter('abcd', sparqlService.filtertype.KEYWORDPREFIX),
        ).to.equal("FILTER contains(lcase(?keyword),'abcd')");

        expect(
            sparqlService.createFilterParameter('abcd', sparqlService.filtertype.TYPES),
        ).to.equal('FILTER (?type IN (abcd))');

        expect(
            sparqlService.createFilterParameter('abcd', sparqlService.filtertype.ISSUERS),
        ).to.equal('FILTER (?issuer IN (abcd))');
    });
    it('Check FindAssetsByKeyword functionality', async () => {
        //Add new entry, so we can check if we find it really

        const id = this.makeId(65);
        const triples = `
                                <did:dkg:${id}> schema:hasKeywords "${id}" . 
                                <did:dkg:${id}> schema:hasTimestamp "2022-04-18T06:48:05.123Z" .
                                <did:dkg:${id}> schema:hasUALs "${id}" .
                                <did:dkg:${id}> schema:hasIssuer "${id}" .
                                <did:dkg:${id}> schema:hasType "${id}" .
                             `;

        const addTriple = await sparqlService.insert(triples, `did:dkg:${id}`);
        expect(addTriple).to.be.true;

        const testContains = await sparqlService.findAssetsByKeyword(
            id.substring(1, 20),
            {
                limit: 5,
                prefix: true,
            },
            true,
        );
        // eslint-disable-next-line no-unused-expressions
        expect(testContains).to.be.not.empty;

        const testExact = await sparqlService.findAssetsByKeyword(
            id,
            {
                limit: 5,
                prefix: true,
            },
            true,
        );
        // eslint-disable-next-line no-unused-expressions
        expect(testExact).to.be.not.empty;
    }).timeout(600000);
    it('Check resolve functionality', async () => {
        // This can also be mocked if necessary
        const test = await sparqlService.resolve(
            '0e62550721611b96321c7459e7790498240431025e46fce9cd99f2ea9763ffb0',
        );
        // eslint-disable-next-line no-unused-expressions
        expect(test).to.be.not.null;
    }).timeout(600000);
    it('Check insert functionality', async () => {
        // This can also be mocked if necessary

        let id = this.makeId(65);
        const test = await sparqlService.insert(
            `<did:dkg:${id}> schema:hasKeywords "${id}" `,
            `did:dkg:${id}`,
        );

        // eslint-disable-next-line no-unused-expressions
        expect(test).to.be.true;
    }).timeout(600000);

    it('Check assertions By Asset functionality', async () => {
        // This can also be mocked if necessary

        const id = this.makeId(65);
        const triples = `
                                <did:dkg:${id}> schema:hasKeywords "${id}" . 
                                <did:dkg:${id}> schema:hasTimestamp "2022-04-18T06:48:05.123Z" .
                                <did:dkg:${id}> schema:hasUALs "${id}" .
                                <did:dkg:${id}> schema:hasIssuer "${id}" .
                                <did:dkg:${id}> schema:hasType "${id}" .
                             `;

        const addTriple = await sparqlService.insert(triples, `did:dkg:${id}`);
        expect(addTriple).to.be.true;

        const testExact = await sparqlService.assertionsByAsset(
            id,
            {
                limit: 5,
                prefix: true,
            },
            true,
        );
        // eslint-disable-next-line no-unused-expressions
        expect(testExact).to.be.not.empty;
    }).timeout(600000);

    it('Check find Assertions functionality', async () => {
        // This can also be mocked if necessary

        const id = this.makeId(65);
        const triples = `
                                <did:dkg:${id}> schema:hasKeywords "${id}" . 
                                <did:dkg:${id}> schema:hasTimestamp "2022-04-18T06:48:05.123Z" .
                                <did:dkg:${id}> schema:hasUALs "${id}" .
                                <did:dkg:${id}> schema:hasIssuer "${id}" .
                                <did:dkg:${id}> schema:hasType "${id}" .
                             `;

        const addTriple = await sparqlService.insert(triples, `did:dkg:${id}`);
        expect(addTriple).to.be.true;

        const testExact = await sparqlService.findAssertions(triples);
        // eslint-disable-next-line no-unused-expressions
        expect(testExact).to.be.not.empty;
    }).timeout(600000);
});
