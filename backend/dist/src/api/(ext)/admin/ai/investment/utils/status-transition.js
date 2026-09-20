"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminStatusTransitionRefusal = adminStatusTransitionRefusal;
function adminStatusTransitionRefusal(current, requested) {
    if (current === requested) {
        return { statusCode: 400, message: `Investment is already ${requested}` };
    }
    if (current !== "ACTIVE") {
        return {
            statusCode: 400,
            message: `Cannot change status of a ${String(current).toLowerCase()} investment`,
        };
    }
    return null;
}
