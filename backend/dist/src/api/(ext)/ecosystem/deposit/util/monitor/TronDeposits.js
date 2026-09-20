"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TronDeposits = void 0;
const safe_imports_1 = require("@b/utils/safe-imports");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
class TronDeposits {
    constructor(options) {
        this.active = true;
        this.wallet = options.wallet;
        this.chain = options.chain;
        this.address = options.address;
    }
    async watchDeposits() {
        if (!this.active) {
            console_1.logger.debug("TRON_DEPOSIT", `Monitor for ${this.chain} is not active, skipping watchDeposits`);
            return;
        }
        const TronService = await (0, safe_imports_1.getTronService)();
        if (!TronService) {
            throw (0, error_1.createError)({ statusCode: 503, message: "Tron service not available" });
        }
        const tronService = await TronService.getInstance();
        await tronService.monitorTronDeposits(this.wallet, this.address);
    }
    stopPolling() {
        console_1.logger.info("TRON_DEPOSIT", `Stopping TRON deposit monitoring for ${this.chain}`);
        this.active = false;
        console_1.logger.success("TRON_DEPOSIT", `TRON deposit monitoring stopped for ${this.chain}`);
    }
}
exports.TronDeposits = TronDeposits;
