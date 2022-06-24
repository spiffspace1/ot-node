const BaseController = require('./base-controller');

class InfoController extends BaseController {
    async handleHttpApiInfoRequest(req, res) {
        const handlerId = await this.handlerIdService.generateHandlerId();

        this.returnResponse(res, 202, {
            handlerId,
        });

    }
}

module.exports = InfoController;
