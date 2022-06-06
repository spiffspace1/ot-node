import BaseModuleManager from "../base-module-manager.js";

class HttpClientModuleManager extends BaseModuleManager {
    getName() {
        return 'httpClient';
    }

    get(route, ...callback) {
        if (this.initialized) {
            return this.getImplementation().module.get(route, ...callback);
        }
    }

    post(route, ...callback) {
        if (this.initialized) {
            return this.getImplementation().module.post(route, ...callback);
        }
    }

    sendResponse(res, status, returnObject) {
        if (this.initialized) {
            return this.getImplementation().module.sendResponse(res, status, returnObject);
        }
    }
}

export default HttpClientModuleManager;
