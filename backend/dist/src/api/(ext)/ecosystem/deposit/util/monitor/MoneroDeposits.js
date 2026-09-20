"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoneroDeposits = void 0;
const safe_imports_1 = require("@b/utils/safe-imports");
const error_1 = require("@b/utils/error");
class MoneroDeposits {
    constructor(options) {
        this.wallet = options.wallet;
    }
    async watchDeposits() {
        const MoneroService = await (0, safe_imports_1.getMoneroService)();
        if (!MoneroService) {
            throw (0, error_1.createError)({ statusCode: 503, message: "Monero service not available" });
        }
        const moneroService = await MoneroService.getInstance();
        await moneroService.monitorMoneroDeposits(this.wallet);
    }
}
exports.MoneroDeposits = MoneroDeposits;
