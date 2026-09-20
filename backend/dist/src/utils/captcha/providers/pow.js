"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.powProvider = void 0;
const pow_captcha_1 = require("@b/utils/pow-captcha");
exports.powProvider = {
    id: "pow",
    label: "Proof of Work (built-in)",
    requiresSiteKey: false,
    requiresSecret: false,
    async verify(submission, ctx) {
        const solution = submission === null || submission === void 0 ? void 0 : submission.solution;
        if (!solution ||
            !solution.challenge ||
            solution.nonce === undefined ||
            !solution.hash) {
            return { ok: false, reason: "missing-solution" };
        }
        const result = await (0, pow_captcha_1.verifyPowSolution)(solution, ctx.action);
        return result.valid
            ? { ok: true }
            : { ok: false, reason: result.error || "invalid-solution" };
    },
};
