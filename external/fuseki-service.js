import axios from 'axios';
import SparqlqueryService from './sparqlquery-service.js';

class FusekiService extends SparqlqueryService{
    constructor(config) {
        super({
            sparqlEndpoint: `${config.url}/${config.name}/sparql`,
            sparqlEndpointUpdate: `${config.url}/${config.name}/update`,
        })
        this.url = config.url
    }

    async healthCheck() {
        try {
            const response = await axios.get(`${this.url}/$/ping`, {});
            if (response.data !== null) {
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    getName() {
        return 'Fuseki';
    }
}

export default FusekiService;
