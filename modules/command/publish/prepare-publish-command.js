const Command = require('../command');

class PreparePublishCommand extends Command {
    constructor(ctx) {
        super(ctx);
        this.logger = ctx.logger;
        this.publishService = ctx.publishService;
        this.fileService = ctx.fileService;
    }

    /**
     * Executes command and produces one or more events
     * @param command
     */
    async execute(command) {
        const {
            documentPath, assets, keywords, handlerId, visibility, fileExtension,
        } = command.data;
        let dataset;
        this.fileService.loadJsonFromFile(documentPath)
            .then((fileContent) => {
                dataset = fileContent;
            })
            .then(() => this.publishService.preparePublish(
                dataset,
                fileExtension,
                assets,
                keywords,
                handlerId,
                visibility,
            ))
            .then((result) => {
                const {
                    rdf, assertion, assets, keywords, handlerId,
                } = result;
                command.data = {
                    rdf, assertion, assets, keywords, handlerId,
                };
            })
            .then(() => this.continueSequence(command.data, command.sequence))
            .catch((error) => {
                console.log(error);
                this.logger.error({ msg: error.message });
            });

        return Command.empty();
    }

    /**
     * Builds default preparePublishCommand
     * @param map
     * @returns {{add, data: *, delay: *, deadline: *}}
     */
    default(map) {
        const command = {
            name: 'preparePublishCommand',
            delay: 0,
            transactional: false,
        };
        Object.assign(command, map);
        return command;
    }
}

module.exports = PreparePublishCommand;
