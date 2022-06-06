import { v4 as uuidv4 } from 'uuid';
import { setTimeout } from 'timers/promises';
import Command from '../../command.js';
import {
    ERROR_TYPE,
    NETWORK_MESSAGE_TYPES,
    REMOVE_SESSION_COMMAND_DELAY,
    NETWORK_PROTOCOLS,
    STORE_BUSY_REPEAT_INTERVAL_IN_MILLS,
    STORE_MIN_SUCCESS_RATE,
    STORE_MAX_TRIES,
} from '../../../constants/constants.js';
import Models from '../../../../models/index.js';

class StoreInitCommand extends Command {
    constructor(ctx) {
        super(ctx);
        this.logger = ctx.logger;
        this.config = ctx.config;
        this.networkModuleManager = ctx.networkModuleManager;
        this.fileService = ctx.fileService;
        this.commandExecutor = ctx.commandExecutor;
    }

    /**
     * Executes command and produces one or more events
     * @param command
     */
    async execute(command) {
        const { nodes, handlerId, documentPath } = command.data;

        const { assertion } = await this.fileService.loadJsonFromFile(documentPath);

        const messages = nodes.map(() => ({
            header: {
                sessionId: uuidv4(),
                messageType: NETWORK_MESSAGE_TYPES.REQUESTS.PROTOCOL_INIT,
            },
            data: {
                assertionId: assertion.id,
            },
        }));

        const removeSessionPromises = messages.map((message) =>
            this.commandExecutor.add(
                {
                    name: 'removeSessionCommand',
                    sequence: [],
                    data: { sessionId: message.header.sessionId },
                    transactional: false,
                },
                REMOVE_SESSION_COMMAND_DELAY,
            ),
        );

        await Promise.all(removeSessionPromises);

        let failedResponses = 0;
        let busyResponses = 0;
        const availableNodes = [];
        const sessionIds = [];
        const sendMessagePromises = nodes.map(async (node, index) => {
            try {
                let tries = 0;
                let response;
                do {
                    if (tries !== 0) await setTimeout(STORE_BUSY_REPEAT_INTERVAL_IN_MILLS);

                    response = await this.networkModuleManager.sendMessage(
                        NETWORK_PROTOCOLS.STORE,
                        node,
                        messages[index],
                    );
                    tries += 1;
                } while (
                    response &&
                    response.header.messageType === NETWORK_MESSAGE_TYPES.RESPONSES.BUSY &&
                    tries < STORE_MAX_TRIES
                );
                if (
                    !response ||
                    response.header.messageType === NETWORK_MESSAGE_TYPES.RESPONSES.NACK
                )
                    failedResponses += 1;
                else if (response.header.messageType === NETWORK_MESSAGE_TYPES.RESPONSES.BUSY)
                    busyResponses += 1;
                else {
                    availableNodes.push(node);
                    sessionIds.push(response.header.sessionId);
                }
            } catch (e) {
                failedResponses += 1;
                this.handleError(
                    handlerId,
                    e,
                    `Error while sending store init message to node ${node._idB58String}. Error message: ${e.message}. ${e.stack}`,
                );
            }
        });

        await Promise.allSettled(sendMessagePromises);

        const maxFailedResponses = Math.round((1 - STORE_MIN_SUCCESS_RATE) * nodes.length);
        const status =
            failedResponses + busyResponses <= maxFailedResponses ? 'COMPLETED' : 'FAILED';

        if (status === 'FAILED') {
            await Models.handler_ids.update(
                {
                    status,
                },
                {
                    where: {
                        handler_id: handlerId,
                    },
                },
            );

            if (command.data.isTelemetry) {
                await Models.assertions.create({
                    hash: assertion.id,
                    topics: JSON.stringify(assertion.metadata.keywords[0]),
                    created_at: assertion.metadata.timestamp,
                    triple_store: this.config.graphDatabase.implementation,
                    status,
                });
            }

            return Command.empty();
        }

        const commandData = command.data;
        commandData.nodes = availableNodes;
        commandData.sessionIds = sessionIds;

        return this.continueSequence(commandData, command.sequence);
    }

    /**
     * Recover system from failure
     * @param command
     * @param err
     */
    async recover(command, err) {
        return Command.empty();
    }

    handleError(handlerId, error, msg) {
        this.logger.error({
            msg,
            Operation_name: 'Error',
            Event_name: ERROR_TYPE.STORE_INIT_ERROR,
            Event_value1: error.message,
            Id_operation: handlerId,
        });
    }

    /**
     * Builds default storeInitCommand
     * @param map
     * @returns {{add, data: *, delay: *, deadline: *}}
     */
    default(map) {
        const command = {
            name: 'storeInitCommand',
            delay: 0,
            transactional: false,
        };
        Object.assign(command, map);
        return command;
    }
}

export default StoreInitCommand;
