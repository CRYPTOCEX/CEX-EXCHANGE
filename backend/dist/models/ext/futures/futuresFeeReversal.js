"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class futuresFeeReversal extends sequelize_1.Model {
    static initModel(sequelize) {
        return futuresFeeReversal.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            referenceId: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                unique: true,
                comment: "Cancelled order id — the same reference withholdFeeShare used at placement",
            },
            symbol: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                comment: "Market the cancelled order belonged to",
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                comment: "Quote currency the fee was taken in",
            },
            refundedFee: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                comment: "Fee actually handed back — the unfilled share of the original",
            },
            originalFee: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                comment: "The order's whole fee. releaseFeeShare re-derives the withheld slice from this, so passing the refunded amount would release a slice of a slice",
            },
            creditKey: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                comment: "Wallet idempotency key of the refund this reverses; the sweep verifies it landed before touching the treasury",
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "COMPLETED", "ABANDONED"),
                allowNull: false,
                defaultValue: "PENDING",
                comment: "ABANDONED: the refund never reached a wallet, so nothing is owed. Kept rather than deleted — it is the record of a cancel that half-happened",
            },
            attempts: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: "Sweep attempts, so a permanently failing row can be found",
            },
            note: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
                comment: "Why a row was abandoned, or the last failure",
            },
        }, {
            sequelize,
            modelName: "futuresFeeReversal",
            tableName: "futures_fee_reversal",
            timestamps: true,
            indexes: [
                {
                    name: "futures_fee_reversal_reference_unique",
                    unique: true,
                    fields: [{ name: "referenceId" }],
                },
                {
                    name: "futures_fee_reversal_status_created",
                    fields: [{ name: "status" }, { name: "createdAt" }],
                },
            ],
        });
    }
}
exports.default = futuresFeeReversal;
