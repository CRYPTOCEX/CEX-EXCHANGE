"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TonDeposits = void 0;
const safe_imports_1 = require("@b/utils/safe-imports");
const error_1 = require("@b/utils/error");
class TonDeposits {
    constructor(options) {
        this.wallet = options.wallet;
        this.chain = options.chain;
        this.address = options.address;
    }
    async watchDeposits() {
        const TonService = await (0, safe_imports_1.getTonService)();
        if (!TonService) {
            throw (0, error_1.createError)({ statusCode: 503, message: "TON service not available" });
        }
        const tonService = await TonService.getInstance();
        await tonService.monitorTonDeposits(this.wallet, this.address);
    }
}
exports.TonDeposits = TonDeposits;
