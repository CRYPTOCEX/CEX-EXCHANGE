"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const model_validators_1 = require("@b/utils/model-validators");
class fxOrder extends sequelize_1.Model {
    static initModel(sequelize) {
        return fxOrder.init({
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
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "userId: Must be a valid UUID" },
                },
            },
            accountId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "accountId: Must be a valid UUID" },
                },
            },
            instrumentId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "instrumentId: Must be a valid UUID" },
                },
            },
            side: {
                type: sequelize_1.DataTypes.STRING(4),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [["BUY", "SELL"]],
                        msg: "side: Must be BUY or SELL (UPPERCASE)",
                    },
                },
                comment: "Canonicalized UPPERCASE at the endpoint — engine compares strictly",
            },
            type: {
                type: sequelize_1.DataTypes.STRING(12),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [["MARKET", "LIMIT", "STOP", "STOP_LIMIT"]],
                        msg: "type: Must be MARKET, LIMIT, STOP or STOP_LIMIT",
                    },
                },
            },
            amount: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                validate: {
                    isFloat: { msg: "amount: Must be a number" },
                    min: { args: [0.000001], msg: "amount: Must be positive" },
                },
                comment: "Base units (lots × contractSize)",
            },
            price: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                comment: "Limit price (LIMIT / STOP_LIMIT)",
            },
            stopPrice: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                comment: "Trigger price (STOP / STOP_LIMIT)",
            },
            slPrice: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                comment: "Attached stop-loss applied to the resulting position",
            },
            tpPrice: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                comment: "Attached take-profit applied to the resulting position",
            },
            trailingDistance: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                comment: "Attached trailing-stop distance in POINTS (server-side trailing)",
            },
            timeInForce: {
                type: sequelize_1.DataTypes.STRING(4),
                allowNull: false,
                defaultValue: "GTC",
                validate: {
                    isIn: {
                        args: [["GTC", "GTD", "DAY"]],
                        msg: "timeInForce: Must be GTC, GTD or DAY",
                    },
                },
                comment: "DAY = expires at the instrument's session close",
            },
            expiresAt: {
                type: sequelize_1.DataTypes.DATE(3),
                allowNull: true,
                comment: "GTD expiry, or the computed session close for DAY",
            },
            status: {
                type: sequelize_1.DataTypes.STRING(12),
                allowNull: false,
                defaultValue: "OPEN",
                validate: {
                    isIn: {
                        args: [["OPEN", "TRIGGERED", "ROUTING", "FILLED", "CANCELLED", "REJECTED", "EXPIRED"]],
                        msg: "status: Invalid order status",
                    },
                },
            },
            routing: {
                type: sequelize_1.DataTypes.STRING(12),
                allowNull: false,
                defaultValue: "INTERNAL",
                validate: {
                    isIn: {
                        args: [["INTERNAL", "EXTERNAL"]],
                        msg: "routing: Must be INTERNAL or EXTERNAL",
                    },
                },
                comment: "Execution routing decided at placement — INTERNAL (B-book desk) or EXTERNAL (A-book hedge at a broker)",
            },
            executionProviderId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "fxExecutionProvider the order routed to — NULL for INTERNAL",
            },
            routingRuleId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "Audit: fxRoutingRule that matched at placement (NULL = global default)",
            },
            reservedMargin: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                comment: "Margin + commission held while status=ROUTING — counted into every outbound-money gate; released on terminal status",
            },
            externalRef: {
                type: sequelize_1.DataTypes.STRING(48),
                allowNull: true,
                comment: "Our idempotent client reference at the venue (abk-o-<base36>)",
            },
            externalOrderId: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
                comment: "Venue order id",
            },
            externalFillPrice: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: true,
                comment: "Broker fill price as a DECIMAL STRING (never float-round-tripped)",
            },
            externalFilledAt: {
                type: sequelize_1.DataTypes.DATE(3),
                allowNull: true,
            },
            externalError: {
                type: sequelize_1.DataTypes.STRING(500),
                allowNull: true,
                comment: "Raw venue reject/error reason (rejectReason stays client-facing)",
            },
            externalMeta: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                set(value) {
                    this.setDataValue("externalMeta", value === null || value === undefined || typeof value === "string"
                        ? value
                        : JSON.stringify(value));
                },
                get() {
                    const value = this.getDataValue("externalMeta");
                    if (!value)
                        return null;
                    try {
                        return JSON.parse(value);
                    }
                    catch (_a) {
                        return value;
                    }
                },
                comment: "External execution audit payload (guarded TEXT-JSON, house pattern)",
            },
            filledPositionId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "Position created/affected by the fill",
            },
            requestNonce: {
                type: sequelize_1.DataTypes.STRING(128),
                allowNull: true,
                comment: "Client idempotency nonce — duplicate submissions return the original order",
            },
            rejectReason: {
                type: sequelize_1.DataTypes.STRING(500),
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "fxOrder",
            tableName: "fx_order",
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "fxOrderAccountIdStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "accountId" }, { name: "status" }],
                },
                {
                    name: "fxOrderInstrumentIdStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "instrumentId" }, { name: "status" }],
                },
                {
                    name: "fxOrderUserIdIdx",
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
                {
                    name: "fxOrderRequestNonceKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "requestNonce" }],
                },
                {
                    name: "fxOrderExternalRefKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "externalRef" }],
                },
                {
                    name: "fxOrderProviderExternalOrderKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "executionProviderId" }, { name: "externalOrderId" }],
                },
                {
                    name: "fxOrderRoutingStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "routing" }, { name: "status" }],
                },
            ],
        });
    }
    static associate(models) {
        fxOrder.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        fxOrder.belongsTo(models.fxAccount, {
            as: "account",
            foreignKey: "accountId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        fxOrder.belongsTo(models.fxInstrument, {
            as: "instrument",
            foreignKey: "instrumentId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = fxOrder;
