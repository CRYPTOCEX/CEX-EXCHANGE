"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class poolBackingReconciliation extends sequelize_1.Model {
    static initModel(sequelize) {
        return poolBackingReconciliation.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            runId: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
                comment: "Groups every currency's row of one run",
            },
            currency: { type: sequelize_1.DataTypes.STRING(191), allowNull: false },
            at: { type: sequelize_1.DataTypes.DATE, allowNull: false },
            status: {
                type: sequelize_1.DataTypes.ENUM("ok", "h_unknown"),
                allowNull: false,
                defaultValue: "ok",
            },
            liabilities: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                comment: "L: what the pooled exchange account must be able to pay",
            },
            liabilitiesSplit: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                comment: "customers, superAdmin, pendingWithdrawals",
                get() {
                    return parseJsonColumn(this.getDataValue("liabilitiesSplit"));
                },
            },
            holdings: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                comment: "H: the exchange account total over every account type; null when unreadable",
            },
            holdingsSplit: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                comment: "per account type: total, fetchedAt, error",
                get() {
                    return parseJsonColumn(this.getDataValue("holdingsSplit"));
                },
            },
            ecosystemSplit: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                comment: "Phase 3, per chain: le, leTreasury, leUnattributed, he (null unless every address has a figure), heByKind, read coverage and ages, status ok|partial|unknown, gapE, open ecosystem rows, mirror. NULL when the currency has no ECO wallets, or when the ecosystem side could not be read (then ecosystemError says why)",
                get() {
                    return parseJsonColumn(this.getDataValue("ecosystemSplit"));
                },
            },
            ecosystemError: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: "Why the ecosystem side was NOT read this run (the custody walk threw, the ECO currency list could not be read). NULL when it was read, or when the currency has no ecosystem side at all — the two cases a bare NULL ecosystemSplit could not tell apart",
            },
            inFlight: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                defaultValue: 0,
                comment: "A: settlements under way, subtracted from the gap",
            },
            gap: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                comment: "G = L - H - A; null when H is unknown",
            },
            openObligations: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                defaultValue: 0,
                comment: "Signed sum of OPEN and CLAIMED obligations on the exchange side",
            },
            residual: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                comment: "G minus open obligations — the part no row explains, this run",
            },
            drift: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                comment: "The residual once it has survived the streak; null until then",
            },
            driftRunStreak: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            holdingsStale: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        }, {
            sequelize,
            modelName: "poolBackingReconciliation",
            tableName: "pool_backing_reconciliation",
            timestamps: true,
            updatedAt: false,
            paranoid: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "idx_pool_backing_reconciliation_currency_at",
                    using: "BTREE",
                    fields: [{ name: "currency" }, { name: "at" }],
                },
                {
                    name: "idx_pool_backing_reconciliation_runId",
                    using: "BTREE",
                    fields: [{ name: "runId" }],
                },
                {
                    name: "idx_pool_backing_reconciliation_at",
                    using: "BTREE",
                    fields: [{ name: "at" }],
                },
            ],
        });
    }
    static associate(_models) {
    }
}
exports.default = poolBackingReconciliation;
function parseJsonColumn(value) {
    if (value == null)
        return null;
    if (typeof value === "string") {
        try {
            return JSON.parse(value);
        }
        catch (_a) {
            return null;
        }
    }
    return value;
}
