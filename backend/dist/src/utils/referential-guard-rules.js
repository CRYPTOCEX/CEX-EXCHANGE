"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isForce = isForce;
exports.willHardDelete = willHardDelete;
function isForce(query) {
    return (query === null || query === void 0 ? void 0 : query.force) === true || (query === null || query === void 0 ? void 0 : query.force) === "true";
}
function willHardDelete(input) {
    return input.force || !input.parentIsParanoid;
}
