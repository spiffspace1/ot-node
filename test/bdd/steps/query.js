const {
    And, But, Given, Then, When,
} = require('@cucumber/cucumber');
const { expect, assert} = require('chai');
const DkgClientHelper = require('../../utilities/dkg-client-helper');
const assertions = require('../../bdd/steps/api/datasets/assertions.json');
const utilities = require("../../utilities/utilities");
let queryResult;
When(/^I send query request on node (\d+) with ([^"]*) for the keyword:*$/, { timeout: 120000 }, async (node, assertionName, keyword) => {

    const queryRequest = {
        query: `PREFIX schema: <http://schema.org/>
            CONSTRUCT { ?s ?p ?o }
            WHERE {
                GRAPH ?g {
                ?s ?p ?o .
                ?s schema:hasKeywords ?'Claude Shànnon'
            }
        }`
    };
console.log(this.state.nodes);
    queryResult  = await this.state.nodes[node -1].client.query(queryRequest);
    console.log(JSON.stringify(queryResult));
    // const parsedKeywords = utilities.unpackRawTableToArray(keywords);
    // const assertion = JSON.stringify(assertions[assertionName]);
    // const result = await this.state.nodes[node - 1].client
    //     .lastResolveData(assertion, parsedKeywords).catch((error) => {
    //         assert.fail(`Error while trying to publish assertion. ${error}`);
    //     });
    // const handlerId = result.data.handler_id;
    // console.log(handlerId);
});

// Given('I wait for last query to be finalized', async () => {
//
//
// });
//
// When('last query returned valid result', async () => {
//
// });
//
// Then('the query result status is COMPLETED', async () => {
// expect(queryResult.status).to.be.eql('COMPLETED');
// });
// Then('the query result response data should contain triplets', async () => {
//
// })
// And('data integrity can be validated using triplet value', async () => {
//
// })
// And('root hash should match', async () => {
//
// })
