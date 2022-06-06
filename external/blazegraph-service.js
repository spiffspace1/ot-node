import axios from 'axios';
import SparqlqueryService from './sparqlquery-service.js';

class BlazegraphService extends SparqlqueryService{
    constructor(config) {
        super({
            sparqlEndpoint: `${config.url}/sparql`,
            sparqlEndpointUpdate: `${config.url}/sparql`,
        })
        this.url = config.url
    }

    async healthCheck() {
        try {
            const response = await axios.get(`${this.url}/status`, {});
            if (response.data !== null) {
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    getName() {
        return 'Blazegraph';
    }
}

export default BlazegraphService;
