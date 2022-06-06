import { v4 as uuidv4 } from 'uuid';
import Models from '../../../models/index.js'
import { HANDLER_ID_STATUS } from '../../../modules/constants.js';

class BaseController {
    generateHandlerId() {
        return Models.handler_ids.create({
            status: HANDLER_ID_STATUS.PENDING,
        });
    }

    async updateFailedHandlerId(handlerId, error) {
        if (handlerId !== null) {
            await Models.handler_ids.update(
                {
                    status: HANDLER_ID_STATUS.FAILED,
                    data: JSON.stringify({ errorMessage: error.message }),
                },
                {
                    where: {
                        handler_id: handlerId,
                    },
                },
            );
        }
    }

    returnResponse(res, status, data) {
        res.status(status).send(data);
    }

    generateOperationId() {
        return uuidv4();
    }
}

export default BaseController;
