const { When, Then, Given } = require('@cucumber/cucumber');
const { expect, assert } = require('chai');
const utilities = require('../../../utilities/utilities');

When(/^I call search request on node (\d+) with result type ([^"]*) for the keywords:*$/, { timeout: 120000 }, async function (node, resultType, keywords) {
    const parsedKeywords = utilities.unpackRawTableToArray(keywords);
    const result = await this.state.nodes[node - 1].client
        .search(resultType, parsedKeywords[0]).catch((error) => {
            assert.fail(`Error while trying to search assertion. ${error}`);
        });
    expect(result.status).to.be.eql(202, 'Expected search assertion result status is 202');
    expect(result.statusText).to.be.eql('Accepted', 'Expected status text of search assertion result is to be ACCEPTED');
    expect(result.data.handler_id).to.be.a('string', 'Expected handler_id from search result is to be a STRING');

    this.state.lastSearchData = {
        nodeId: node - 1,
        handlerId: result.data.handler_id,
        keywords: parsedKeywords,
        assertion: '',
    };
});
When('Last search returned valid result', { timeout: 120000 }, async function () {
    //TODO I need to include those checks
    // And I wait for last search request to finalize
    // And Last search finished with status: COMPLETED
    // And Last search returned valid result
    this.logger.log('I wait searching request to be finalized');
    const lastSearchData = this.state.lastSearchData;

        this.logger.log(`Getting search result for handler id: ${lastSearchData.handlerId} on node: ${lastSearchData.nodeId}`);
        // eslint-disable-next-line no-await-in-loop
        this.state.lastSearchData.result = await this.state.nodes[lastSearchData.nodeId].client.getResult(lastSearchData.handlerId, 'assertions:search').catch((error) => {
          assert.fail(`Error while trying to get assertion search result. ${error}`);
      });
});
Then('The result of assertion search cannot be 0', { timeout: 120000 }, async function (){
        expect(this.state.lastSearchData.result.itemListElement.length).to.not.eql(0, 'Expected number of searched items cannot be 0');
        expect(this.state.lastSearchData.result.itemCount).to.not.eql(0, '');
        expect(this.state.lastSearchData.result.itemCount).to.be.a('number', '');
        console.log(this.state.lastSearchData.result.itemCount);
        expect(this.state.lastSearchData.result.itemListElement).to.be.a('array', 'Expected searched assertions result list should be an ARRAY');
})
Then('The search result should contain all valid data', { timeout: 120000 }, async function (){
    const searchData = this.state.lastSearchData.result.itemListElement[0];

    expect(searchData).haveOwnProperty('result');
    expect(searchData).haveOwnProperty('nodes');
    expect(searchData).haveOwnProperty('resultScore');
    expect(searchData.result.metadata.hasOwnProperty('keywords'));
    expect(searchData.result.metadata.hasOwnProperty('dataHash'));
    expect(searchData.result.metadata.hasOwnProperty('issuer'));
    expect(searchData.result.metadata.hasOwnProperty('timestamp'));
    expect(searchData.result.metadata.hasOwnProperty('type'));
    expect(searchData.result.metadata.hasOwnProperty('visibility'));
    expect(searchData.result.metadata.keywords).to.be.a('Array', 'Expected to be an ARRAY as a result for keywords');
})
Then(/^Metadata from last search request contains the keywords: *$/, { timeout: 120000 }, async function(keywords){
    keywords = this.state.lastSearchData.keywords;
    expect(this.state.lastSearchData.result.itemListElement[0].result.metadata.keywords).to.be.eql(keywords, 'Last search result keywords matched with published keywords');
})
Then('The number of nodes that responded cannot be 0', { timeout: 120000 }, async function(){
    const nodesNumber = await this.state.lastSearchData.result.itemListElement[0].nodes;

    if (nodesNumber.length !== 0) {
        expect(nodesNumber[0]).to.have.length(46, 'Number of nodes that respond is more then 0');
    } else {
        assert.fail('The number of nodes that responded is 0')
    }
})

