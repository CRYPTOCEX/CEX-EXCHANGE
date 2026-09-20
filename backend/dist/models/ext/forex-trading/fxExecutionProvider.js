"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class fxExecutionProvider extends sequelize_1.Model {
    static initModel(sequelize) {
        return fxExecutionProvider.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            name: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "name: Name must not be empty" },
                },
                comment: "Internal adapter identifier (oanda, metaapi)",
            },
            title: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "title: Title must not be empty" },
                },
                comment: "Display title of the execution venue",
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: "Description of the execution venue",
            },
            environment: {
                type: sequelize_1.DataTypes.STRING(12),
                allowNull: false,
                defaultValue: "DEMO",
                validate: {
                    isIn: {
                        args: [["DEMO", "LIVE"]],
                        msg: "environment: Must be DEMO or LIVE",
                    },
                },
                comment: "Host pair selector (practice vs live). Two-sided guard: DEMO client accounts route only to DEMO providers, LIVE only to LIVE",
            },
            status: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: true,
                defaultValue: false,
                validate: {
                    isBoolean: { msg: "status: Status must be a boolean value" },
                },
                comment: "Enabled flag — MULTIPLE rows may be true (unlike fx_provider)",
            },
            accountRef: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                comment: "OANDA accountID / MetaApi account UUID",
            },
            proxyUrl: {
                type: sequelize_1.DataTypes.STRING(500),
                allowNull: true,
                comment: "Proxy URL for venue API requests",
            },
            symbolMap: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                set(value) {
                    this.setDataValue("symbolMap", value === null || value === undefined || typeof value === "string"
                        ? value
                        : JSON.stringify(value));
                },
                get() {
                    const value = this.getDataValue("symbolMap");
                    if (!value)
                        return null;
                    try {
                        return JSON.parse(value);
                    }
                    catch (_a) {
                        return value;
                    }
                },
                comment: "Admin symbol-mapping overrides (guarded TEXT-JSON)",
            },
            maxSlippagePoints: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                comment: "Hedge-leg price tolerance → venue priceBound (points)",
            },
            orderTimeoutMs: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                defaultValue: 15000,
                comment: "Watchdog: reconcile-by-ref starts after this silence",
            },
            hardTimeoutMs: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                defaultValue: 120000,
                comment: "Watchdog hard cap: ROUTING → REJECTED ('Broker timeout') after this",
            },
            marginBufferRatio: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                defaultValue: 0.2,
                comment: "Pre-trade check: hedge marginAvailable − estimate must exceed NAV × this",
            },
            marginAlertRatio: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                defaultValue: 0.5,
                comment: "Alert when hedge marginUsed/NAV exceeds this (venue closeout at 1.0)",
            },
            staleSyncAlertSec: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                defaultValue: 300,
                comment: "Alert + routing auto-suspend when hedge sync is older than this",
            },
            financingAlertDailyDelta: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                comment: "Daily financing-basis alert threshold (NULL = off)",
            },
            disasterStopDistancePoints: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                comment: "Optional wide broker-side stop attached to hedge opens (NULL = off)",
            },
            allowedAssetClasses: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                comment: "Comma-separated asset-class allowlist for this venue (NULL = all)",
            },
            hedgeBalance: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                comment: "Hedge account balance (broker ccy) — last sync snapshot",
            },
            hedgeEquity: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                comment: "Hedge account NAV — last sync snapshot",
            },
            hedgeMarginUsed: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
            },
            hedgeMarginAvailable: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
            },
            hedgeCloseoutPercent: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                comment: "Venue margin-closeout percent (force-close at >= 1.0)",
            },
            hedgeSyncedAt: {
                type: sequelize_1.DataTypes.DATE(3),
                allowNull: true,
            },
            syncCursor: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                set(value) {
                    this.setDataValue("syncCursor", value === null || value === undefined || typeof value === "string"
                        ? value
                        : JSON.stringify(value));
                },
                get() {
                    const value = this.getDataValue("syncCursor");
                    if (!value)
                        return null;
                    try {
                        return JSON.parse(value);
                    }
                    catch (_a) {
                        return value;
                    }
                },
                comment: "Reconciler ledger-replay cursor (guarded TEXT-JSON)",
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
                comment: "Provider-level rollups/audit payload (guarded TEXT-JSON)",
            },
        }, {
            sequelize,
            modelName: "fxExecutionProvider",
            tableName: "fx_execution_provider",
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "fxExecutionProviderNameKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "name" }],
                },
            ],
        });
    }
    static associate(models) { }
}
exports.default = fxExecutionProvider;
