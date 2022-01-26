const { v1: uuidv1 } = require('uuid');
const Models = require('../../models/index');

class BaseController {
    constructor(ctx) {
        this.logger = ctx.logger;
        this.fileService = ctx.fileService;
        this.commandExecutor = ctx.commandExecutor;
    }

    createHandlerId(status = 'PENDING') {
        return new Promise((resolve, reject) => {
            Models.handler_ids.create({ status }).then((result) => {
                resolve(result);
            }).catch((error) => reject(error));
        });
    }

    sendResponse(response, status, data) {
        response.status(status).send(data);
    }

    createOperationId() {
        return uuidv1();
    }
}

module.exports = BaseController;
