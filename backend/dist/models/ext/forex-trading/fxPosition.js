"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const model_validators_1 = require("@b/utils/model-validators");
class fxPosition extends sequelize_1.Model {
    static initModel(sequelize) {
        return fxPosition.init({
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
            },
            amount: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                validate: {
                    isFloat: { msg: "amount: Must be a number" },
                    min: { args: [0], msg: "amount: Must be >= 0" },
                },
                comment: "REMAINING base units (UN-leveraged — the futures ext's leverage-multiplied storage over-credits and is NOT copied). Partial closes reduce this",
            },
            entryPrice: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                comment: "Executed entry price (ask for BUY, bid for SELL) — raw feed persisted on the OPEN deal",
            },
            slPrice: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
            },
            tpPrice: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
            },
            trailingDistance: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                comment: "Server-side trailing-stop distance in POINTS",
            },
            trailingHighWater: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                comment: "Best favorable executed price seen since trailing armed (ratchet)",
            },
            usedMargin: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                defaultValue: 0,
                comment: "Bookkeeping snapshot at open (account ccy) — ACCOUNT margin is computed per symbol with hedged netting, never Σ of these",
            },
            swapAccrued: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                defaultValue: 0,
                comment: "Display-only running swap total; swaps SETTLE TO BALANCE daily via SWAP deals (already in balance — never settled again at close)",
            },
            commissionPaid: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                defaultValue: 0,
                comment: "Commission charged at open (account ccy), booked as COMMISSION deal",
            },
            status: {
                type: sequelize_1.DataTypes.STRING(12),
                allowNull: false,
                defaultValue: "OPEN",
                validate: {
                    isIn: {
                        args: [["OPEN", "CLOSED", "LIQUIDATED"]],
                        msg: "status: Must be OPEN, CLOSED or LIQUIDATED",
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
                comment: "CLOSE-FOLLOWS-OPEN: stamped once inside the open booking tx, never updated — every close branches on THIS, never a rule or setting",
            },
            executionProviderId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "fxExecutionProvider hedging this position — NULL for INTERNAL",
            },
            externalPositionId: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
                comment: "OANDA tradeID / MT positionId",
            },
            externalEntryPrice: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: true,
                comment: "Broker entry fill (decimal STRING); entryPrice stays the client platform price",
            },
            externalClosePrice: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: true,
                comment: "Broker close fill (decimal STRING); closePrice stays the client platform price",
            },
            hedgePnl: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                comment: "Broker-realized hedge PnL (reporting only — never client money)",
            },
            pendingCloseAmount: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                comment: "In-flight external close marker — base units requested at the venue",
            },
            pendingCloseRef: {
                type: sequelize_1.DataTypes.STRING(48),
                allowNull: true,
                comment: "Per-request close ref (abk-c-<base36>-<seq>) — single-in-flight gate; NEVER cleared on timeout without affirmative venue proof",
            },
            pendingCloseReason: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: true,
                comment: "Close attribution captured at request time (MANUAL/SL/TP/…)",
            },
            closeRequestedAt: {
                type: sequelize_1.DataTypes.DATE(3),
                allowNull: true,
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
            openedAt: {
                type: sequelize_1.DataTypes.DATE(3),
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
            },
            closedAt: {
                type: sequelize_1.DataTypes.DATE(3),
                allowNull: true,
            },
            closePrice: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                comment: "Executed close price of the final close",
            },
            realizedPnl: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                comment: "Cumulative realized PnL in account ccy (sum of CLOSE/PARTIAL_CLOSE deal pnl)",
            },
            closeReason: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: true,
                validate: {
                    isIn: {
                        args: [[
                                "MANUAL", "SL", "TP", "TRAILING", "STOP_OUT", "GAP",
                                "ADMIN", "DELISTED", "CORPORATE_ACTION",
                            ]],
                        msg: "closeReason: Invalid close reason",
                    },
                },
            },
        }, {
            sequelize,
            modelName: "fxPosition",
            tableName: "fx_position",
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "fxPositionAccountIdStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "accountId" }, { name: "status" }],
                },
                {
                    name: "fxPositionInstrumentIdStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "instrumentId" }, { name: "status" }],
                },
                {
                    name: "fxPositionUserIdStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "userId" }, { name: "status" }],
                },
                {
                    name: "fxPositionProviderExternalPositionKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "executionProviderId" }, { name: "externalPositionId" }],
                },
                {
                    name: "fxPositionRoutingStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "routing" }, { name: "status" }],
                },
            ],
        });
    }
    static associate(models) {
        fxPosition.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        fxPosition.belongsTo(models.fxAccount, {
            as: "account",
            foreignKey: "accountId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        fxPosition.belongsTo(models.fxInstrument, {
            as: "instrument",
            foreignKey: "instrumentId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = fxPosition;
