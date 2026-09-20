"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.willHardDelete = exports.isForce = void 0;
exports.assertNoDependentRows = assertNoDependentRows;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const referential_guard_rules_1 = require("@b/utils/referential-guard-rules");
Object.defineProperty(exports, "isForce", { enumerable: true, get: function () { return referential_guard_rules_1.isForce; } });
Object.defineProperty(exports, "willHardDelete", { enumerable: true, get: function () { return referential_guard_rules_1.willHardDelete; } });
async function assertNoDependentRows(input) {
    const ids = (input.parentIds || []).filter(Boolean);
    if (!ids.length)
        return;
    const hard = (0, referential_guard_rules_1.willHardDelete)({
        force: !!input.force,
        parentIsParanoid: !!input.parentIsParanoid,
    });
    const active = input.activeStatuses || ["ACTIVE"];
    const blocking = [];
    for (const dep of input.dependents) {
        const model = db_1.models[dep.model];
        if (!model) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: `Cannot verify dependants before deletion: unknown model "${dep.model}".`,
            });
        }
        const where = { [dep.foreignKey]: { [sequelize_1.Op.in]: ids } };
        if (!hard)
            where.status = { [sequelize_1.Op.in]: active };
        const count = await model.count({ where, paranoid: false });
        if (count > 0) {
            blocking.push(`${count} ${dep.label}${count === 1 ? "" : "s"}`);
        }
    }
    if (!blocking.length)
        return;
    throw (0, error_1.createError)({
        statusCode: 400,
        message: hard
            ? `This ${input.parentLabel} is referenced by ${blocking.join(" and ")}. Deleting it ` +
                `permanently would cascade those rows out of the database along with the record of ` +
                `the money they moved. Settle or cancel them first — cancelling returns each user's ` +
                `principal.`
            : `This ${input.parentLabel} is in use by ${blocking.join(" and ")} that ${blocking.length === 1 && blocking[0].startsWith("1 ") ? "is" : "are"} still active. Removing it would take them out of the settlement cron's reach and ` +
                `the money would never come back. Settle or cancel them first — cancelling returns ` +
                `each user's principal.`,
    });
}
