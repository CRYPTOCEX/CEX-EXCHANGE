"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ANY_UUID_VERSION = void 0;
exports.isAcceptableUuid = isAcceptableUuid;
const ALL_VERSIONS = "all";
exports.ANY_UUID_VERSION = ALL_VERSIONS;
function isAcceptableUuid(value) {
    if (typeof value !== "string" || !value)
        return false;
    return ANY_UUID_PATTERN.test(value);
}
const ANY_UUID_PATTERN = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i;
