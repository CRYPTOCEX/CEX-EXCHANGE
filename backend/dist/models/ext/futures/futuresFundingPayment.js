"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const model_validators_1 = require("@b/utils/model-validators");
class futuresFundingPayment extends sequelize_1.Model {
    static initModel(sequelize) {
        return futuresFundingPayment.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "userId: User ID cannot be null" },
                    isUUID: {
                        args: model_validators_1.ANY_UUID_VERSION,
                        msg: "userId: User ID must be a valid UUID",
                    },
                },
                comment: "Holder of the position that was funded",
            },
            symbol: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                comment: "Perpetual market, e.g. BTC/USDT",
            },
            positionId: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                comment: "Scylla position id — not a foreign key; positions are not in MySQL",
            },
            side: {
                type: sequelize_1.DataTypes.ENUM("BUY", "SELL"),
                allowNull: false,
                comment: "Position side at settlement",
            },
            fundingTime: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                comment: "The window boundary this settlement belongs to",
            },
            rate: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                comment: "Fraction per interval; positive means longs paid shorts",
            },
            markPrice: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                comment: "Mark price the notional was measured at",
            },
            notional: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                comment: "markPrice x position size, in the quote currency",
            },
            amount: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                comment: "Signed quote amount: negative was paid, positive was received",
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                comment: "Quote currency the payment moved in",
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("SETTLED", "UNPAID", "SKIPPED"),
                allowNull: false,
                defaultValue: "SETTLED",
                comment: "UNPAID: the wallet could not cover it. SKIPPED: below the currency's smallest unit",
            },
            note: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
                comment: "Why a settlement was not SETTLED",
            },
        }, {
            sequelize,
            modelName: "futuresFundingPayment",
            tableName: "futures_funding_payment",
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "futuresFundingPositionWindowKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "positionId" }, { name: "fundingTime" }],
                },
                {
                    name: "futuresFundingSymbolWindowIdx",
                    using: "BTREE",
                    fields: [{ name: "symbol" }, { name: "fundingTime" }],
                },
                {
                    name: "futuresFundingUserIdIdx",
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
            ],
        });
    }
    static associate(models) {
        futuresFundingPayment.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = futuresFundingPayment;
