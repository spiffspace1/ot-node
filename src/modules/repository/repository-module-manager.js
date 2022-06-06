import BaseModuleManager from "../base-module-manager.js";

class RepositoryModuleManager extends BaseModuleManager {
    getName() {
        return 'repository';
    }

    async createHandlerIdRecord(handlerData) {
        if (this.initialized) {
            return this.getImplementation().module.createHandlerIdRecord(handlerData);
        }
    }
}

export default RepositoryModuleManager;
