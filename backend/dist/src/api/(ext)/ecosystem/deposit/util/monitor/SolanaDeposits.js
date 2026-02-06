"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolanaDeposits = void 0;
const safe_imports_1 = require("@b/utils/safe-imports");
const tokens_1 = require("@b/api/(ext)/ecosystem/utils/tokens");
const error_1 = require("@b/utils/error");
class SolanaDeposits {
    constructor(options) {
        this.active = true;
        this.wallet = options.wallet;
        this.chain = options.chain;
        this.currency = options.currency;
        this.address = options.address;
    }
    async watchDeposits() {
        const SolanaService = await (0, safe_imports_1.getSolanaService)();
        if (!SolanaService) {
            throw (0, error_1.createError)({ statusCode: 503, message: "Solana service not available" });
        }
        const solanaService = await SolanaService.getInstance();
        if (this.currency === "SOL") {
            await solanaService.monitorSolanaDeposits(this.wallet, this.address, () => this.stopPolling());
        }
        else {
            const token = await (0, tokens_1.getEcosystemToken)(this.chain, this.currency);
            if (!token || !token.contract) {
                console.error(`SPL Token ${this.currency} not found or invalid mint address`);
                return;
            }
            await solanaService.monitorSPLTokenDeposits(this.wallet, this.address, token.contract, () => this.stopPolling());
        }
    }
    stopPolling() {
        this.active = false;
        console.log(`Monitor for wallet ${this.wallet.id} has stopped polling.`);
    }
}
exports.SolanaDeposits = SolanaDeposits;
