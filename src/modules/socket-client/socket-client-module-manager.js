const BaseModuleManager = require('../base-module-manager');

class SocketClientModuleManager extends BaseModuleManager {
    getName() {
        return 'socketClient';
    }

    sendMessage(message) {
        if (this.initialized) {
            return this.getImplementation('').module.sendMessage(message);
        }
    }
}

module.exports = SocketClientModuleManager;
