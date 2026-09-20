"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class walletAuditLogArchive extends sequelize_1.Model {
    static initModel(sequelize) {
        return walletAuditLogArchive.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                comment: "User ID performing the operation",
            },
            walletId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                comment: "Wallet ID affected by the operation",
            },
            operation: {
                type: sequelize_1.DataTypes.ENUM("WALLET_CREATED", "CREDIT", "DEBIT", "HOLD", "RELEASE", "TRANSFER_OUT", "TRANSFER_IN", "EXECUTE_FROM_HOLD"),
                allowNull: false,
                comment: "Type of wallet operation",
            },
            amount: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                comment: "Amount involved in the operation",
            },
            previousBalance: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                comment: "Balance before the operation",
            },
            newBalance: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                comment: "Balance after the operation",
            },
            previousInOrder: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                comment: "In-order amount before the operation (for HOLD/RELEASE)",
            },
            newInOrder: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                comment: "In-order amount after the operation (for HOLD/RELEASE)",
            },
            transactionId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "Optional reference to a transaction record. Intentionally NOT a foreign key: this is an immutable, append-only audit log that must accept events with no transaction yet (e.g. WALLET_CREATED) and must never fail or cascade on a missing/deleted transaction.",
            },
            idempotencyKey: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                comment: "Idempotency key for deduplication",
            },
            metadata: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                comment: "Additional operation metadata (operationType, fee, referenceId, etc.)",
                get() {
                    const value = this.getDataValue("metadata");
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
                },
            },
            createdAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
                comment: "Timestamp of the audit entry",
            },
        }, {
            sequelize,
            modelName: "walletAuditLogArchive",
            tableName: "wallet_audit_log_archive",
            timestamps: false,
            paranoid: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "idx_wallet_audit_log_archive_createdAt",
                    using: "BTREE",
                    fields: [{ name: "createdAt" }],
                },
            ],
        });
    }
    static associate(_models) {
    }
}
exports.default = walletAuditLogArchive;
