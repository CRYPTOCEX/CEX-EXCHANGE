"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidDatabasePortError = exports.DEFAULT_MYSQL_PORT = void 0;
exports.resolveDatabasePort = resolveDatabasePort;
exports.DEFAULT_MYSQL_PORT = 3306;
class InvalidDatabasePortError extends Error {
    constructor(value) {
        super(`DB_PORT is set to "${value}", which is not a usable TCP port. ` +
            `Set it to a whole number between 1 and 65535, or leave it unset to use ${exports.DEFAULT_MYSQL_PORT}. ` +
            `Refusing to continue: this operation would otherwise act on whatever database is listening on ${exports.DEFAULT_MYSQL_PORT}.`);
        this.name = "InvalidDatabasePortError";
    }
}
exports.InvalidDatabasePortError = InvalidDatabasePortError;
function resolveDatabasePort(raw) {
    if (raw === undefined || raw === null || String(raw).trim() === "") {
        return exports.DEFAULT_MYSQL_PORT;
    }
    const text = String(raw).trim();
    if (!/^\d+$/.test(text))
        throw new InvalidDatabasePortError(text);
    const port = Number(text);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new InvalidDatabasePortError(text);
    }
    return port;
}
