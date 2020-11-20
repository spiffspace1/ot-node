const Ethereum = require('./Blockchain/Ethereum/index.js');
const uuidv4 = require('uuid/v4');
const Op = require('sequelize/lib/operators');

const Utilities = require('./Utilities');
const Models = require('../models');

class Blockchain {
    /**
     * Default constructor
     * @param ctx IoC context
     */
    constructor(ctx) {
        this.log = ctx.logger;
        this.emitter = ctx.emitter;
        this.config = ctx.config.blockchain;
        this.pluginService = ctx.blockchainPluginService;
        this.gasStationService = ctx.gasStationService;
        this.tracPriceService = ctx.tracPriceService;
        this.appState = ctx.appState;

        this.blockchain = [];

        for (let i = 0; i < ctx.config.blockchain.implementations.length; i += 1) {
            const implementation_configuration = ctx.config.blockchain.implementations[i];

            switch (implementation_configuration.blockchain_title) {
            case 'Ethereum':
                this.blockchain[i] = new Ethereum(ctx, implementation_configuration);
                break;
            default:
                this.log.error('Unsupported blockchain', this.config.blockchain_title);
            }
        }

        this.pluginService.bootstrap();
    }

    /**
     * Initialize Blockchain provider
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            const promises = [];

            for (let i = 0; i < this.blockchain.length; i += 1) {
                promises.push(this.blockchain[i].initialize());
            }

            await Promise.all(promises);
        } catch (e) {
            this.log.warn(`Failed to initialize all blockchain implementations. ${e}`);
            throw e;
        }

        if (!this.initalized) {
            this.initalized = true;
            this.subscribeToEventPermanentWithCallback([
                'ContractsChanged',
            ], async (eventData) => {
                this.log.notify('Contracts changed, refreshing information.');
                await this.initialize();
            });
        }
    }

    /**
     * Retrieves an implementation based on the given blockchain_id
     */
    _getImplementationFromId(blockchain_id) {
        if (!blockchain_id) {
            return this._getDefaultImplementation();
        }

        const implementation = this.blockchain.find(e => e.getBlockchainId() === blockchain_id);

        if (implementation && implementation.initialized) {
            return implementation;
        } else if (implementation) {
            throw new Error(`Cannot return implementation for blockchain_id ${blockchain_id}. Implementation is not initialized.`);
        } else {
            throw new Error(`Cannot return implementation for blockchain_id ${blockchain_id}. Implementation not found.`);
        }
    }

    _getDefaultImplementation() {
        for (const implementation of this.blockchain) {
            if (implementation.initialized) return implementation;
        }

        throw new Error('Cannot return implementation. No implementation is initialized.');
    }

    /**
     * Returns the blockchain id of the default blockchain implementation
     */
    getDefaultBlockchainId() {
        const implementation = this._getDefaultImplementation();
        return implementation.getBlockchainId();
    }

    /**
     * Executes specific plugin
     * @param name  - Plugin name
     * @param data  - Plugin data
     * @return {Promise<void>}
     */
    async executePlugin(name, data) {
        return this.pluginService.execute(name, data);
    }

    /**
     * Gets profile by wallet
     * @param identity
     * @param blockchain_id
     * @returns {Object} - An object containing the blockchain_id string and the response promise
     */
    getProfile(identity, blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.getProfile(identity),
        };
    }

    /**
     * Set node ID
     * @param identity
     * @param nodeId
     * @param blockchain_id
     * @returns {Object} - An object containing the blockchain_id string and the response promise
     */
    setNodeId(identity, nodeId, blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.setNodeId(identity, nodeId),
        };
    }

    /**
     * Creates node profile on the Bidding contract
     * @param managementWallet - Management wallet
     * @param profileNodeId - Network node ID
     * @param initialBalance - Initial profile balance
     * @param isSender725 - Is sender ERC 725?
     * @param blockchainIdentity - ERC 725 identity (empty if there is none)
     * @param blockchain_id - Blockchain implementation
     * @returns {Object} - An object containing the blockchain_id string and the response promise
     */
    createProfile(
        managementWallet,
        profileNodeId,
        initialBalance,
        isSender725,
        blockchainIdentity,
        blockchain_id,
    ) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.createProfile(
                managementWallet,
                profileNodeId, initialBalance, isSender725,
                blockchainIdentity,
            ),
        };
    }

    /**
     * Gets minimum stake for creating a profile
     * @returns {Object} - An object containing the blockchain_id string and the response promise
     */
    getProfileMinimumStake(blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.getProfileMinimumStake(),
        };
    }

    /**
     * Increase token approval for escrow contract
     * @param {number} tokenAmountIncrease
     * @param {string} blockchain_id - Blockchain implementation to use
     * @returns {Object} - An object containing the blockchain_id string and the response promise
     */
    increaseProfileApproval(tokenAmountIncrease, blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.increaseProfileApproval(tokenAmountIncrease),
        };
    }

    /**
     * Initiate litigation for the particular DH
     * @param offerId - Offer ID
     * @param holderIdentity - DH identity
     * @param litigatorIdentity - Litigator identity
     * @param requestedObjectIndex - Order number of the object from the OT-dataset
     * @param requestedBlockIndex - Order number of the block inside the sorted object
     * @param hashArray - Merkle proof
     * @param {string} blockchain_id - Blockchain implementation to use
     * @return {Promise<any>}
     */
    initiateLitigation(
        offerId, holderIdentity, litigatorIdentity,
        requestedObjectIndex, requestedBlockIndex, hashArray, blockchain_id,
    ) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.initiateLitigation(
                offerId, holderIdentity, litigatorIdentity,
                requestedObjectIndex, requestedBlockIndex, hashArray,
            ),
        };
    }

    /**
     * Completes litigation for the particular DH
     * @param offerId - Offer ID
     * @param holderIdentity - DH identity
     * @param challengerIdentity - DC identity
     * @param proofData - answer
     * @param leafIndex - the number of the block in the lowest level of the merkle tree
     * @param urgent - Whether max gas price should or not
     * @param {string} blockchain_id - Blockchain implementation to use
     * @returns {Object} - An object containing the blockchain_id string and the response promise
     */
    completeLitigation(
        offerId,
        holderIdentity,
        challengerIdentity,
        proofData,
        leafIndex,
        urgent,
        blockchain_id,
    ) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.completeLitigation(
                offerId, holderIdentity,
                challengerIdentity, proofData, leafIndex, urgent,
            ),
        };
    }

    /**
     * Answers litigation from DH side
     * @param offerId
     * @param holderIdentity
     * @param answer
     * @param urgent - Whether maximum gas price should be used
     * @param {string} blockchain_id - Blockchain implementation to use
     * @returns {Object} - An object containing the blockchain_id string and the response promise
     */
    answerLitigation(offerId, holderIdentity, answer, urgent, blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.answerLitigation(offerId, holderIdentity, answer, urgent),
        };
    }

    /**
     * Pay out tokens
     * @param blockchainIdentity
     * @param offerId
     * @param urgent
     * @param {string} blockchain_id - Blockchain implementation to use
     * @returns {Object} - An object containing the blockchain_id string and the response promise
     */
    payOut(blockchainIdentity, offerId, urgent, blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.payOut(blockchainIdentity, offerId, urgent),
        };
    }

    /**
     * PayOut for multiple offers.
     * @param {string} blockchainIdentity - Blockchain identity to use
     * @param {string} offerIds - Offers to payOut
     * @param {string} blockchain_id - Blockchain implementation to use
     * @returns {Object} - An object containing the blockchain_id string and the response promise
     */
    payOutMultiple(
        blockchainIdentity,
        offerIds,
        blockchain_id,
    ) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.payOutMultiple(blockchainIdentity, offerIds),
        };
    }

    /**
     * Creates offer for the data storing on the Ethereum blockchain.
     * @returns {Object} - An object containing the blockchain_id string and the response promise
     */
    createOffer(
        blockchainIdentity,
        dataSetId,
        dataRootHash,
        redLitigationHash,
        greenLitigationHash,
        blueLitigationHash,
        dcNodeId,
        holdingTimeInMinutes,
        tokenAmountPerHolder,
        dataSizeInBytes,
        litigationIntervalInMinutes,
        urgent,
        blockchain_id,
    ) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.createOffer(
                blockchainIdentity,
                dataSetId,
                dataRootHash,
                redLitigationHash,
                greenLitigationHash,
                blueLitigationHash,
                dcNodeId,
                holdingTimeInMinutes,
                tokenAmountPerHolder,
                dataSizeInBytes,
                litigationIntervalInMinutes,
                urgent,
            ),
        };
    }

    /**
     * Finalizes offer on Blockchain
     * @returns {Object} - An object containing the blockchain_id string and the response promise
     */
    finalizeOffer(
        blockchainIdentity,
        offerId,
        shift,
        confirmation1,
        confirmation2,
        confirmation3,
        encryptionType,
        holders,
        parentIdentity,
        urgent,
        blockchain_id,
    ) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.finalizeOffer(
                blockchainIdentity, offerId, shift, confirmation1,
                confirmation2, confirmation3, encryptionType, holders, parentIdentity, urgent,
            ),
        };
    }

    /**
     * Subscribe to a particular event
     * @param event
     * @param importId
     * @param endMs
     * @param endCallback
     * @param filterFn
     * @param {string} blockchain_id - Blockchain implementation to use
     */
    subscribeToEvent(event, importId, endMs = 5 * 60 * 1000, endCallback, filterFn, blockchain_id) {
        return new Promise((resolve, reject) => {
            let clearToken;
            const token = setInterval(() => {
                const where = {
                    event,
                    finished: 0,
                };
                if (importId) {
                    where.import_id = importId;
                }
                if (blockchain_id) {
                    where.blockchain_id = blockchain_id;
                }

                Models.events.findAll({
                    where,
                }).then((events) => {
                    for (const eventData of events) {
                        const parsedData = JSON.parse(eventData.dataValues.data);

                        let ok = true;
                        if (filterFn) {
                            ok = filterFn(parsedData);
                        }
                        if (!ok) {
                            // eslint-disable-next-line
                            continue;
                        }
                        eventData.finished = true;
                        // eslint-disable-next-line no-loop-func
                        eventData.save().then(() => {
                            clearTimeout(clearToken);
                            clearInterval(token);
                            resolve(parsedData);
                        }).catch((err) => {
                            this.logger.error(`Failed to update event ${event}. ${err}`);
                            reject(err);
                        });
                        break;
                    }
                });
            }, 2000);
            clearToken = setTimeout(() => {
                if (endCallback) {
                    endCallback();
                }
                clearInterval(token);
                resolve(null);
            }, endMs);
        });
    }

    /**
     * Subscribes to Blockchain event
     *
     * Calling this method will subscribe to Blockchain's event which will be
     * emitted globally using globalEmitter.
     * @param event Event to listen to
     * @param {string} blockchain_id - Blockchain implementation to listen to
     * @returns {number | Object} Event handle
     */
    async subscribeToEventPermanent(event, blockchain_id) {
        const blockStartConditions = [];

        if (blockchain_id) {
            const implementation = this._getImplementationFromId(blockchain_id);

            const startBlockNumber = await implementation.getCurrentBlock();
            blockStartConditions.push({
                blockchain_id,
                block: { [Op.gte]: startBlockNumber },
            });
        } else {
            const promises = [];

            for (let i = 0; i < this.blockchain.length; i += 1) {
                const implementation = this.blockchain[i];
                promises.push(implementation.getCurrentBlock());
            }
            const currentBlocks = await Promise.all(promises);

            for (let i = 0; i < currentBlocks.length; i += 1) {
                const implementation = this.blockchain[i];

                blockStartConditions.push({
                    blockchain_id: implementation.config.network_id,
                    block: { [Op.gte]: currentBlocks[i] },
                });
            }
        }

        const that = this;
        const handle = setInterval(async () => {
            if (!that.appState.started) {
                return;
            }

            const where = {
                event,
                finished: 0,
                [Op.or]: blockStartConditions,
            };

            const eventData = await Models.events.findAll({ where });
            if (eventData) {
                eventData.forEach(async (data) => {
                    const dataToSend = JSON.parse(data.dataValues.data);
                    dataToSend.blockchain_id = data.dataValues.blockchain_id;
                    this.emitter.emit(`eth-${data.event}`, dataToSend);
                    data.finished = true;
                    await data.save();
                });
            }
        }, 2000);

        return handle;
    }

    /**
     * Subscribes to Blockchain event with a callback specified
     *
     * Calling this method will subscribe to Blockchain's event which will be
     * emitted globally using globalEmitter.
     * Callback function will be executed when the event is emitted.
     * @param event - Name of event to listen to
     * @param callback - Function to be executed
     * @param {string} blockchain_id - Blockchain implementation to listen to
     * @returns {number | Object} Event handle
     */
    async subscribeToEventPermanentWithCallback(event, callback, blockchain_id) {
        const blockStartConditions = [];

        if (blockchain_id) {
            const implementation = this.blockchain.find(e => e.config.network_id === blockchain_id);

            const startBlockNumber = await implementation.getCurrentBlock();
            blockStartConditions.push({
                blockchain_id,
                block: { [Op.gte]: startBlockNumber },
            });
        } else {
            const promises = [];

            for (let i = 0; i < this.blockchain.length; i += 1) {
                const implementation = this.blockchain[i];
                promises.push(implementation.getCurrentBlock());
            }
            const currentBlocks = await Promise.all(promises);

            for (let i = 0; i < currentBlocks.length; i += 1) {
                const implementation = this.blockchain[i];

                blockStartConditions.push({
                    blockchain_id: implementation.config.network_id,
                    block: { [Op.gte]: currentBlocks[i] },
                });
            }
        }
        const handle = setInterval(async () => {
            const where = {
                event,
                finished: 0,
                [Op.or]: blockStartConditions,
            };

            const eventData = await Models.events.findAll({ where });
            if (eventData) {
                eventData.forEach(async (data) => {
                    try {
                        callback({
                            name: `eth-${data.event}`,
                            value: JSON.parse(data.dataValues.data),
                            blockchain_id: data.blockchain_id,
                        });
                        data.finished = true;
                        await data.save();
                    } catch (error) {
                        this.logger.error(error);
                    }
                });
            }
        }, 2000);

        return handle;
    }

    /**
     * Gets all past events for the contract
     * @param contractName
     */
    async getAllPastEvents(contractName) {
        const promises = [];

        for (let i = 0; i < this.blockchain.length; i += 1) {
            const implementation = this.blockchain[i];
            const blockchain_id = this.blockchain[i].config.network_id;

            promises.push(this
                .getEventsFromImplementation(implementation, blockchain_id, contractName)
                .then((result) => {
                    this.handleReceivedEvents(result, contractName, blockchain_id);
                }));
        }

        await Promise.all(promises);
    }

    async getEventsFromImplementation(implementation, blockchain_id, contractName) {
        let fromBlock = 0;

        // Find last queried block if any.
        const lastEvent = await Models.events.findOne({
            where: {
                contract: contractName,
                blockchain_id,
            },
            order: [
                ['block', 'DESC'],
            ],
        });

        if (lastEvent) {
            fromBlock = lastEvent.block + 1;
        } else {
            const currentBlock = await implementation.getCurrentBlock();

            fromBlock = Math.max(currentBlock - 100, 0);
        }

        return implementation.getAllPastEvents(contractName, fromBlock);
    }

    async handleReceivedEvents(events, contractName, blockchain_id) {
        for (let i = 0; events && i < events.length; i += 1) {
            const event = events[i];
            const timestamp = Date.now();
            if (event.returnValues.DH_wallet) {
                event.returnValues.DH_wallet = event.returnValues.DH_wallet.toLowerCase();
            }
            /* eslint-disable-next-line */
            await Models.events.create({
                id: uuidv4(),
                contract: contractName,
                event: event.event,
                data: JSON.stringify(event.returnValues),
                data_set_id: Utilities.normalizeHex(event.returnValues.dataSetId),
                block: event.blockNumber,
                blockchain_id,
                timestamp,
                finished: 0,
            });
        }


        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        // Delete old events
        await Models.events.destroy({
            where: {
                timestamp: {
                    [Op.lt]: twoWeeksAgo.getTime(),
                },
                finished: 1,
            },
        });
    }

    /**
     * Total amount of tokens paid out for node
     * @param {string} identity
     * @param {string} blockchain_id - Blockchain implementation to use
     * @returns {Object} - An object containing the blockchain_id string and the response promise
     */
    getTotalPayouts(identity, blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.getTotalPayouts(identity),
        };
    }

    /**
     * Gets token balance of a particular wallet
     * @param {string} wallet
     * @param {string} blockchain_id - Blockchain implementation to use
     * @returns {Object} - An object containing the blockchain_id string and the response promise
     */
    getWalletTokenBalance(wallet, blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.getWalletTokenBalance(wallet),
        };
    }

    /**
     * Gets base (eg ETH) balance of a particular wallet
     * @param {string} wallet
     * @param {string} blockchain_id - Blockchain implementation to use
     * @returns {Object} - An object containing the blockchain_id string and the response promise
     */
    getWalletBaseBalance(wallet, blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.getWalletBaseBalance(wallet),
        };
    }

    /**
     * Deposits tokens to the profile
     * @param blockchainIdentity
     * @param amount
     * @param {string} blockchain_id - Blockchain implementation to use
     * @returns {Object} - An object containing the blockchain_id string and the response promise
     */
    depositTokens(blockchainIdentity, amount, blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.depositTokens(blockchainIdentity, amount),
        };
    }

    /**
     * Gets the root hash (fingerprint) written in the blockchain for a given dataset
     * @param {string} dataSetId - Data set ID
     * @param {string} blockchain_id - Blockchain implementation to use
     * @returns {Object} - An object containing the blockchain_id string and the response promise
     */
    getRootHash(dataSetId, blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.getRootHash(dataSetId),
        };
    }

    /**
     * Gets purchase object from blockchain
     * @param {string} purchaseId
     * @param {string} blockchain_id - Blockchain implementation to use
     * @returns {Object} - An object containing the blockchain_id string and the response promise
     */
    getPurchase(purchaseId, blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.getPurchase(purchaseId),
        };
    }

    /**
     * Gets purchase status from blockchain
     * @param {string} purchaseId
     * @param {string} blockchain_id - Blockchain implementation to use
     * @returns {Object} - An object containing the blockchain_id string and the response promise
     */
    getPurchaseStatus(purchaseId, blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.getPurchaseStatus(purchaseId),
        };
    }

    /**
     * Gets the duration of a purchase stage from blockchain
     * @param {string} blockchain_id - Blockchain implementation to use
     * @returns {Object} - An object containing the blockchain_id string and the response promise
     */
    getPaymentStageInterval(blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.getPaymentStageInterval(),
        };
    }

    /**
     * Gets the duration of a purchase stage from blockchain
     * @param {string} sellerIdentity - Seller's blockchain identity
     * @param {string} buyerIdentity - Buyer's blockchain identity
     * @param {string} tokenAmount - The token amount for purchase
     * @param {string} originalDataRootHash - The root hash of the data in its original form
     * @param {string} encodedDataRootHash - The root hash of the data in its encoded form
     * @param {string} blockchain_id - Blockchain implementation to use
     * @returns {Object} - An object containing the blockchain_id string and the response promise
     */
    initiatePurchase(
        sellerIdentity, buyerIdentity,
        tokenAmount, originalDataRootHash, encodedDataRootHash, blockchain_id,
    ) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.initiatePurchase(
                sellerIdentity, buyerIdentity,
                tokenAmount, originalDataRootHash, encodedDataRootHash,
            ),
        };
    }

    /**
     * Decodes offer task event data from offer creation event
     * @param result Blockchain transaction receipt
     * @param {string} blockchain_id - Blockchain implementation to use
     * @returns {Promise<any>}
     */
    decodePurchaseInitiatedEventFromTransaction(result, blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.decodePurchaseInitiatedEventFromTransaction(result),
        };
    }


    depositKey(purchaseId, key, blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.depositKey(purchaseId, key),
        };
    }

    takePayment(purchaseId, blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.takePayment(purchaseId),
        };
    }

    complainAboutNode(
        purchaseId, outputIndex, inputIndexLeft, encodedOutput, encodedInputLeft,
        proofOfEncodedOutput, proofOfEncodedInputLeft, urgent, blockchain_id,
    ) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.complainAboutNode(
                purchaseId, outputIndex, inputIndexLeft, encodedOutput, encodedInputLeft,
                proofOfEncodedOutput, proofOfEncodedInputLeft, urgent,
            ),
        };
    }

    complainAboutRoot(
        purchaseId, encodedRootHash, proofOfEncodedRootHash, rootHashIndex,
        urgent, blockchain_id,
    ) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.complainAboutRoot(
                purchaseId, encodedRootHash, proofOfEncodedRootHash, rootHashIndex,
                urgent,
            ),
        };
    }

    /**
     * Start token withdrawal operation
     * @param blockchainIdentity
     * @param amount
     * @param {string} blockchain_id - Blockchain implementation to use
     * @return {Promise<any>}
     */
    startTokenWithdrawal(blockchainIdentity, amount, blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.startTokenWithdrawal(blockchainIdentity, amount),
        };
    }

    /**
     * Start token withdrawal operation
     * @param blockchainIdentity
     * @param {string} blockchain_id - Blockchain implementation to use
     * @return {Promise<any>}
     */
    withdrawTokens(blockchainIdentity, blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.withdrawTokens(blockchainIdentity),
        };
    }

    /**
     * Get difficulty for the particular offer
     * @param {string} offerId, Offer id to get difficulty for
     * @param {string} blockchain_id - Blockchain implementation to use
     */
    getOfferDifficulty(offerId, blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.getOfferDifficulty(offerId),
        };
    }

    /**
     * Token contract address getter
     * @param {string} blockchain_id - Blockchain implementation to use
     * @return {any|*}
     */
    getTokenContractAddress(blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.getTokenContractAddress(),
        };
    }

    /**
     * Returns purposes of the wallet for a given identity.
     * @param {String} erc725Identity - The identity contract to check
     * @param {String} wallet - The wallet whose purposes will be checked
     * @param {String} blockchain_id - Blockchain implementation to use
     * @returns {Object} - An object containing the blockchain_id string and the response promise
     *      which resolves to an array of numbers
     */
    getWalletPurposes(erc725Identity, wallet, blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.getWalletPurposes(erc725Identity, wallet),
        };
    }

    /**
     * Get offer by ID
     * @param {String} offerId - OfferId hex string
     * @param {String} blockchain_id - Blockchain implementation to use
     * @returns {Object} - An object containing the blockchain_id string and the response promise
     */
    getOffer(offerId, blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.getOffer(offerId),
        };
    }

    /**
     * Get holders for offer ID
     * @param {String} offerId - OfferId hex string
     * @param {String} holderIdentity - Holder's identity string
     * @param {String} blockchain_id - Blockchain implementation to use
     * @returns {Object} - An object containing the blockchain_id string and the response promise
     */
    getHolder(offerId, holderIdentity, blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.getHolder(offerId, holderIdentity),
        };
    }

    /**
     * Replaces holder
     * @param {String} offerId - OfferId hex string
     * @param {String} holderIdentity - The identity string of the holder to replace
     * @param {String} litigatorIdentity - The identity string of the litigator
     * @param {BN} shift - The shift of the task solution to use
     * @param {String} confirmation1 - Signed offer confirmation from the first new holder
     * @param {String} confirmation2 - Signed offer confirmation from the second new holder
     * @param {String} confirmation3 - Signed offer confirmation from the third new holder
     * @param {Array<String>} holders - The array containing the new holders' identity strings
     * @param {String} blockchain_id - Blockchain implementation to use
     * @returns {Object} - An object containing the blockchain_id string and the response promise
     */
    replaceHolder(
        offerId,
        holderIdentity,
        litigatorIdentity,
        shift,
        confirmation1,
        confirmation2,
        confirmation3,
        holders,
        blockchain_id,
    ) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.replaceHolder(
                offerId,
                holderIdentity,
                litigatorIdentity,
                shift,
                confirmation1,
                confirmation2,
                confirmation3,
                holders,
            ),
        };
    }

    /**
     * Gets litigation information for the holder
     * @param {String} offerId - OfferId hex string
     * @param {String} holderIdentity - Holder's identity string
     * @param {String} blockchain_id - Blockchain implementation to use
     * @returns {Object} - An object containing the blockchain_id string and the response promise
     */
    getLitigation(offerId, holderIdentity, blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.getLitigation(offerId, holderIdentity),
        };
    }

    /**
     * Gets litigation timestamp for the holder
     * @param {String} offerId - OfferId hex string
     * @param {String} holderIdentity - Holder's identity string
     * @param {String} blockchain_id - Blockchain implementation to use
     * @returns {Object} - An object containing the blockchain_id string and the response promise
     */
    getLitigationTimestamp(offerId, holderIdentity, blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.getLitigationTimestamp(offerId, holderIdentity),
        };
    }

    /**
     * Gets last litigation difficulty
     * @param {String} offerId - OfferId hex string
     * @param {String} holderIdentity - Holder's identity string
     * @param {String} blockchain_id - Blockchain implementation to use
     * @returns {Object} - An object containing the blockchain_id string and the response promise
     */
    getLitigationDifficulty(offerId, holderIdentity, blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.getLitigationDifficulty(offerId, holderIdentity),
        };
    }

    /**
     * Gets last litigation replacement task
     * @param {String} offerId - OfferId hex string
     * @param {String} holderIdentity - Holder's identity string
     * @param {String} blockchain_id - Blockchain implementation to use
     * @returns {Object} - An object containing the blockchain_id string and the response promise
     */
    getLitigationReplacementTask(offerId, holderIdentity, blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.getLitigationReplacementTask(offerId, holderIdentity),
        };
    }

    /**
     * Get staked amount for the holder
     * @param {String} offerId - OfferId hex string
     * @param {String} holderIdentity - Holder's identity string
     * @param {String} blockchain_id - Blockchain implementation to use
     * @returns {Object} - An object containing the blockchain_id string and the response promise
     */
    getHolderStakedAmount(offerId, holderIdentity, blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.getHolderStakedAmount(offerId, holderIdentity),
        };
    }

    /**
     * Get paid amount for the holder
     * @param {String} offerId - OfferId hex string
     * @param {String} holderIdentity - Holder's identity string
     * @param {String} blockchain_id - Blockchain implementation to use
     * @returns {Object} - An object containing the blockchain_id string and the response promise
     */
    getHolderPaidAmount(offerId, holderIdentity, blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.getHolderPaidAmount(offerId, holderIdentity),
        };
    }

    /**
     * Get litigation encryption type
     * @param {String} offerId - OfferId hex string
     * @param {String} holderIdentity - Holder's identity string
     * @param {String} blockchain_id - Blockchain implementation to use
     * @returns {Object} - An object containing the blockchain_id string and the response promise
     */
    getHolderLitigationEncryptionType(offerId, holderIdentity, blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.getHolderLitigationEncryptionType(offerId, holderIdentity),
        };
    }

    /**
     * Check that the identity key has a specific purpose
     * @param identity - identity address
     * @param key - identity key
     * @param purpose - purpose to verify
     * @param {String} blockchain_id - Blockchain implementation to use
     * @returns {Object} - An object containing the blockchain_id string and the response promise
     */
    keyHasPurpose(identity, key, purpose, blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.keyHasPurpose(identity, key, purpose),
        };
    }

    /**
     * Check how many events were emitted in a transaction from the transaction receipt
     * @param {Object} receipt - the json object returned as a result of the transaction
     * @param {String} blockchain_id - Blockchain implementation to use
     * @returns {Number | undefined} - Returns undefined if the receipt does not have a logs field
     */
    numberOfEventsEmitted(receipt, blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.numberOfEventsEmitted(receipt),
        };
    }

    /**
     * Returns created identities from blockchain implementations
     * @returns {Array<Object>} -
     *      An array of objects containing the blockchain_id string and the response string
     */
    getAllIdentities() {
        const identities = [];
        for (let i = 0; i < this.blockchain.length; i += 1) {
            const implementation = this.blockchain[i];
            if (implementation.initialized) {
                identities.push({
                    blockchain_id: implementation.getBlockchainId(),
                    response: implementation.getIdentity(),
                });
            }
        }

        return identities;
    }

    /**
     * Returns created identities from configuration
     * @param {String} blockchain_id - Blockchain implementation to use
     * @returns {Object} - An object containing the blockchain_id string and the response promise
     */
    getIdentity(blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.getIdentity(),
        };
    }

    /**
     * Saves identity into file and configuration
     * @param {String} identity - The identity to save
     * @param {String} blockchain_id - Blockchain implementation to use
     * @returns {Object} - An object containing the blockchain_id string and the response void
     */
    saveIdentity(identity, blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.saveIdentity(identity),
        };
    }

    /**
     * Returns the hub contract address for a particular (od default) blockchain implementation
     * @param {String} blockchain_id - Blockchain implementation to use
     * @returns {Object} - An object containing the blockchain_id string and the response string
     */
    getHubContractAddress(blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.getHubContractAddress(),
        };
    }

    /**
     * Returns wallet public and private key from configuration
     */
    getWallet(blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.getWallet(),
        };
    }

    /**
     * Returns blockchain title from configuration
     */
    getBlockchainTitle(blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.getBlockchainTitle(),
        };
    }

    /**
     * Returns gas price from configuration
     */
    getGasPrice(blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.calculateGasPrice(),
        };
    }

    /**
     * Returns trac price from configuration
     */
    getTracPrice(blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.getTracPrice(),
        };
    }

    /**
     * Returns price factors from configuration
     */
    getPriceFactors(blockchain_id) {
        const implementation = this._getImplementationFromId(blockchain_id);
        return {
            blockchain_id: implementation.getBlockchainId(),
            response: implementation.getPriceFactors(),
        };
    }

    static fromWei(blockchain_title, balance, unit) {
        switch (blockchain_title) {
        case 'Ethereum':
        default:
            return Ethereum.fromWei(balance, unit);
        }
    }
}

module.exports = Blockchain;
