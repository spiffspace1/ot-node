import KadIdentityRanking from '../../external/kad-identity-ranking-service.js';

class RankingService {
    constructor(ctx) {
        this.logger = ctx.logger;
    }

    initialize() {
        // TODO: Initialize array of ranking implementations
        this.implementation = new KadIdentityRanking();
        this.implementation.initialize(this.logger);
    }

    async rank(nodes, topic, replicationFactor, rankingTypes) {
        let rankedNodes = [];
        // TODO: Iterate and execute all ranking implementations provided in rankingTypes
        rankedNodes = await this.implementation.execute(nodes, topic, replicationFactor);
        return rankedNodes;
    }
}

export default RankingService;
