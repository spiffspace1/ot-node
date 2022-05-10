const {expect} = require("chai");
const DkgClientHelper = require('./utilities/dkg-client-helper');

async function test () {
    const options = {
        query: `PREFIX schema: <http://schema.org/>
            CONSTRUCT { ?s ?p ?o }
            WHERE {
                GRAPH ?g {
                ?s ?p ?o .
                ?s schema:hasKeywords ?test
            }
        }`
    };

    const queryResult = new DkgClientHelper();
const test = await this.queryResult.query(options);
console.log(test);

    expect(queryResult.status).to.be.eql('COMPLETED');
    console.log(queryResult.data[0].subject);
}

test();
