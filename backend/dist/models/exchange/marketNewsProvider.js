"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class marketNewsProvider extends sequelize_1.Model {
    static initModel(sequelize) {
        return marketNewsProvider.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            name: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "name: Name must not be empty" },
                },
                comment: "Adapter identifier (finnhub, cryptocompare, cryptopanic, rss) — the join key to the code, never renamed",
            },
            title: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "title: Title must not be empty" },
                },
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: "What the adapter can actually do — re-synced from the catalogue on every list call so an upgraded install never shows stale claims",
            },
            status: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: true,
                defaultValue: false,
                comment: "Enabled — any number of rows may hold this, unlike fx_provider",
            },
            apiKey: {
                type: sequelize_1.DataTypes.STRING(500),
                allowNull: true,
                comment: "Operator-supplied vendor credential. Takes precedence over the env var. NEVER returned by any endpoint - the admin console reports only whether one is stored.",
            },
            categories: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: "JSON array of what to ask this provider for; each adapter decides what a category means to its own vendor",
                set(value) {
                    this.setDataValue("categories", value === null || value === undefined || typeof value === "string"
                        ? value
                        : JSON.stringify(value));
                },
                get() {
                    const value = this.getDataValue("categories");
                    if (!value)
                        return null;
                    if (typeof value !== "string")
                        return value;
                    try {
                        const parsed = JSON.parse(value);
                        return Array.isArray(parsed) ? parsed : null;
                    }
                    catch (_a) {
                        return null;
                    }
                },
            },
            fetchLimit: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                defaultValue: 60,
                validate: {
                    min: { args: [1], msg: "fetchLimit: Must be at least 1" },
                    max: { args: [500], msg: "fetchLimit: Must be 500 or fewer" },
                },
                comment: "Stories pulled per category, per run",
            },
            retentionDays: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                defaultValue: 30,
                validate: {
                    min: { args: [1], msg: "retentionDays: Must be at least 1" },
                    max: { args: [3650], msg: "retentionDays: Must be 3650 or fewer" },
                },
                comment: "Age at which this provider's own rows are pruned; MANUAL rows are exempt and stay the operator's to remove",
            },
            config: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: "JSON object of adapter-specific settings (rss feed list, cryptopanic filter, ...)",
                set(value) {
                    this.setDataValue("config", value === null || value === undefined || typeof value === "string"
                        ? value
                        : JSON.stringify(value));
                },
                get() {
                    const value = this.getDataValue("config");
                    if (!value)
                        return null;
                    if (typeof value !== "string")
                        return value;
                    try {
                        const parsed = JSON.parse(value);
                        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
                            ? parsed
                            : null;
                    }
                    catch (_a) {
                        return null;
                    }
                },
            },
            lastSyncAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            lastSyncStatus: {
                type: sequelize_1.DataTypes.STRING(16),
                allowNull: true,
                validate: {
                    isIn: {
                        args: [["OK", "EMPTY", "ERROR", "SKIPPED"]],
                        msg: "lastSyncStatus: Must be OK, EMPTY, ERROR or SKIPPED",
                    },
                },
                comment: "Outcome of the last run. EMPTY is not ERROR — a vendor with no new stories is a normal Sunday",
            },
            lastSyncCount: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                defaultValue: 0,
                comment: "Rows INSERTED on the last run, not rows returned",
            },
            lastSyncMessage: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: "Operator-readable detail. Never holds a credential — the adapters redact before they report",
            },
        }, {
            sequelize,
            modelName: "marketNewsProvider",
            tableName: "market_news_provider",
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "marketNewsProviderNameKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "name" }],
                },
            ],
        });
    }
}
exports.default = marketNewsProvider;
