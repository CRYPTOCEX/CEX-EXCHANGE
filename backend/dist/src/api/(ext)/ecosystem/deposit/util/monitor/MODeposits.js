"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODeposits = void 0;
const ethers_1 = require("ethers");
const ProviderManager_1 = require("../ProviderManager");
const tokens_1 = require("@b/api/(ext)/ecosystem/utils/tokens");
const chains_1 = require("@b/api/(ext)/ecosystem/utils/chains");
const DepositUtils_1 = require("../DepositUtils");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
class MODeposits {
    constructor(options) {
        this.intervalId = null;
        this.stopOnFirstDeposit = true;
        this.pollingIntervalMs = 10000;
        this.maxBlocksPerPoll = 5000;
        this.backoffAttempts = 0;
        this.maxBackoffAttempts = 5;
        this.wallet = options.wallet;
        this.chain = options.chain;
        this.currency = options.currency;
        this.address = options.address;
        this.contractType = options.contractType;
    }
    async watchDeposits() {
        let provider = ProviderManager_1.chainProviders.get(this.chain);
        if (!provider) {
            provider = await (0, ProviderManager_1.initializeHttpProvider)(this.chain);
            if (!provider) {
                throw (0, error_1.createError)({
                    statusCode: 503,
                    message: `Failed to initialize HTTP provider for chain ${this.chain}`
                });
            }
        }
        console_1.logger.info("MO_DEPOSIT", `Using polling for ${this.chain} ERC-20 deposits on address ${this.address}`);
        const token = await (0, tokens_1.getEcosystemToken)(this.chain, this.currency);
        if (!token)
            throw (0, error_1.createError)({
                statusCode: 404,
                message: `Token ${this.currency} not found for chain ${this.chain}`
            });
        const decimals = token.decimals;
        const filter = {
            address: token.contract,
            topics: [
                ethers_1.ethers.id("Transfer(address,address,uint256)"),
                null,
                ethers_1.ethers.zeroPadValue(this.address, 32),
            ],
        };
        await this.pollForEvents(provider, filter, decimals);
    }
    async pollForEvents(provider, filter, decimals) {
        const pollingKey = `${this.chain}:${this.address}`;
        let lastBlock;
        try {
            lastBlock = await provider.getBlockNumber();
        }
        catch (err) {
            console_1.logger.error("MO_DEPOSIT", `Failed to get initial block number for ${pollingKey}`, err);
            throw err;
        }
        this.intervalId = setInterval(async () => {
            try {
                const currentBlock = await provider.getBlockNumber();
                if (currentBlock > lastBlock) {
                    const fromBlock = lastBlock + 1;
                    const toBlock = Math.min(currentBlock, fromBlock + this.maxBlocksPerPoll - 1);
                    console_1.logger.debug("MO_DEPOSIT", `Polling ${pollingKey} from block ${fromBlock} to ${toBlock}`);
                    const logs = await provider.getLogs({
                        ...filter,
                        fromBlock,
                        toBlock,
                    });
                    this.backoffAttempts = 0;
                    for (const log of logs) {
                        console_1.logger.info("MO_DEPOSIT", `New event detected on ${pollingKey}: TxHash=${log.transactionHash}`);
                        const success = await (0, DepositUtils_1.processTransaction)(this.contractType, log.transactionHash, provider, this.address, this.chain, decimals, chains_1.chainConfigs[this.chain].decimals, this.wallet.id);
                        if (success) {
                            console_1.logger.success("MO_DEPOSIT", `Deposit recorded for ${pollingKey}.`);
                            if (this.stopOnFirstDeposit) {
                                console_1.logger.info("MO_DEPOSIT", `Stop on first deposit enabled. Stopping polling for ${pollingKey}`);
                                this.stopPolling();
                                return;
                            }
                        }
                    }
                    lastBlock = toBlock;
                }
            }
            catch (error) {
                console_1.logger.error("MO_DEPOSIT", `Error during event polling for ${pollingKey}`, error);
                this.backoffAttempts++;
                if (this.backoffAttempts > this.maxBackoffAttempts) {
                    console_1.logger.error("MO_DEPOSIT", `Max backoff attempts reached for ${pollingKey}. Stopping polling.`);
                    this.stopPolling();
                    return;
                }
                const backoffTime = this.pollingIntervalMs * Math.pow(2, this.backoffAttempts);
                console_1.logger.warn("MO_DEPOSIT", `Backing off polling for ${pollingKey}. Next poll in ${backoffTime}ms`);
                if (this.intervalId) {
                    clearInterval(this.intervalId);
                    this.intervalId = null;
                }
                setTimeout(() => {
                    this.intervalId = setInterval(() => this.pollForEvents(provider, filter, decimals), this.pollingIntervalMs);
                }, backoffTime);
            }
        }, this.pollingIntervalMs);
    }
    stopPolling() {
        if (this.intervalId) {
            console_1.logger.info("MO_DEPOSIT", `Stopping polling for ${this.chain}:${this.address}`);
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}
exports.MODeposits = MODeposits;
