const HandleStoreCommand = require('./handle-store-command');
const { NETWORK_MESSAGE_TYPES, ERROR_TYPE } = require('../../../constants/constants');

class HandleStoreRequestCommand extends HandleStoreCommand {
    constructor(ctx) {
        super(ctx);
        this.errorType = ERROR_TYPE.PUBLISH.PUBLISH_REMOTE_ERROR;
    }

    async prepareMessage() {
        return { messageType: NETWORK_MESSAGE_TYPES.RESPONSES.ACK, messageData: {} };
    }

    /**
     * Builds default handleStoreRequestCommand
     * @param map
     * @returns {{add, data: *, delay: *, deadline: *}}
     */
    default(map) {
        const command = {
            name: 'handleStoreRequestCommand',
            delay: 0,
            transactional: false,
        };
        Object.assign(command, map);
        return command;
    }
}

module.exports = HandleStoreRequestCommand;
