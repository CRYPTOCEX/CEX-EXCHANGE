"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const model_validators_1 = require("@b/utils/model-validators");
class exchangePriceAlert extends sequelize_1.Model {
    static initModel(sequelize) {
        return exchangePriceAlert.init({
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
                comment: "ID of the user who armed this alert",
            },
            symbol: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "symbol: Symbol must not be empty" },
                },
                comment: "Trading symbol being watched, e.g. BTC/USDT",
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("SPOT", "ECO", "FUTURES"),
                allowNull: false,
                defaultValue: "SPOT",
                comment: "Which market family the symbol belongs to",
            },
            condition: {
                type: sequelize_1.DataTypes.ENUM("CROSSES_ABOVE", "CROSSES_BELOW", "CROSSES"),
                allowNull: false,
                defaultValue: "CROSSES_ABOVE",
                comment: "Direction of crossing that fires the alert",
            },
            targetPrice: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                validate: {
                    isNumeric: { msg: "targetPrice: Must be a numeric value" },
                    min: { args: [0], msg: "targetPrice: Must be greater than zero" },
                },
                comment: "The price level being watched",
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("ACTIVE", "TRIGGERED", "EXPIRED", "DISABLED"),
                allowNull: false,
                defaultValue: "ACTIVE",
                comment: "Only ACTIVE alerts are evaluated",
            },
            isRepeating: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: "Re-arms after firing instead of retiring",
            },
            note: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
                comment: "Optional user note shown with the notification",
            },
            armedPrice: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                comment: "Market price at the moment the alert was created",
            },
            lastPrice: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                comment: "Previous observed price; the baseline a crossing is measured from",
            },
            triggeredPrice: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                comment: "Price that fired the alert",
            },
            triggeredAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                comment: "When the alert last fired; also gates the re-arm cooldown",
            },
            expiresAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                comment: "Optional moment after which the alert stops watching",
            },
        }, {
            sequelize,
            modelName: "exchangePriceAlert",
            tableName: "exchange_price_alert",
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "exchangePriceAlertUserIdForeign",
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
                {
                    name: "exchangePriceAlertStatusTypeIdx",
                    using: "BTREE",
                    fields: [{ name: "status" }, { name: "type" }],
                },
            ],
        });
    }
    static associate(models) {
        exchangePriceAlert.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = exchangePriceAlert;
