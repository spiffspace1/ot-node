const path = require('path');
const BaseController = require('./base-controller');
const Models = require('../../models/index');
const constants = require('../constants');

class PublishController extends BaseController {
    publish(request, response, next) {
        if (!this.validatePublishRequestObject(request)) {
            return next({ code: 400, message: 'File, assets, visibility are required fields.' });
        }
        const operationId = this.createOperationId();
        try {
            this.logger.emit({
                msg: 'Started measuring execution of publish command',
                Event_name: 'publish_start',
                Operation_name: 'publish',
                Id_operation: operationId,
            });
            this.createHandlerId().then((handler) => {
                this.sendResponse(response, 200, { handler_id: handler.handler_id });

                const fileContent = request.files.file.data;
                const fileExtension = this.fileService.getFileExtension(request.files.file.name);
                const assets = [...new Set(JSON.parse(request.body.assets.toLowerCase()))];
                const visibility = JSON.parse(!!request.body.visibility);
                const keywords = request.body.keywords ? JSON.parse(request.body.keywords.toLowerCase()) : [];

                this.fileService.writeContentsToFile('handler_id', handler.handler_id, fileContent).then((documentPath) => {
                    const commandSequence = [
                        'preparePublishCommand',
                        'submitProofsCommand',
                        'sendAssertionCommand',
                        'insertAssertionCommand',
                    ];
                    this.commandExecutor.add({
                        name: commandSequence[0],
                        sequence: commandSequence.slice(1),
                        delay: 0,
                        data: {
                            documentPath, assets, keywords, handlerId: handler.handler_id, visibility, fileExtension,
                        },
                        transactional: false,
                    });
                }).catch((error) => {
                    this.logger.error({ msg: error.message });
                });
            }).catch((error) => {
                this.logger.error({ msg: error.message });
            });
        } catch (e) {
            this.logger.error({
                msg: `Unexpected error at publish route: ${e.message}. ${e.stack}`,
                Event_name: constants.ERROR_TYPE.PUBLISH_ROUTE_ERROR,
                Event_value1: e.message,
                Id_operation: operationId,
            });
        } finally {
            this.logger.emit({
                msg: 'Finished measuring execution of publish command',
                Event_name: 'publish_end',
                Operation_name: 'publish',
                Id_operation: operationId,
            });
        }
    }

    validatePublishRequestObject(request) {
        return request.files
            && request.files.file
            && request.body.assets
            && request.body.visibility;
    }
}

module.exports = PublishController;
