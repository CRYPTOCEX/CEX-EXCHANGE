"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class aiSupportAgent extends sequelize_1.Model {
    static initModel(sequelize) {
        return aiSupportAgent.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            name: {
                type: sequelize_1.DataTypes.STRING(96),
                allowNull: false,
                validate: { notEmpty: { msg: "name: Agent name must not be empty" } },
            },
            slug: {
                type: sequelize_1.DataTypes.STRING(96),
                allowNull: false,
                unique: true,
            },
            avatar: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
            },
            persona: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                defaultValue: "",
            },
            disclosureText: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            model: {
                type: sequelize_1.DataTypes.STRING(96),
                allowNull: true,
            },
            effort: {
                type: sequelize_1.DataTypes.ENUM("low", "medium", "high", "xhigh", "max"),
                allowNull: true,
            },
            maxTokens: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 4000,
                validate: { min: 1024, max: 64000 },
            },
            autonomy: {
                type: sequelize_1.DataTypes.ENUM("COPILOT", "AUTO_TICKET", "AUTO_ALL"),
                allowNull: false,
                defaultValue: "COPILOT",
            },
            toolsEnabled: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("toolsEnabled");
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
            channels: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("channels");
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
            languages: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("languages");
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
            workingHours: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("workingHours");
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
            timezone: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
                defaultValue: "UTC",
            },
            status: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
        }, {
            sequelize,
            modelName: "aiSupportAgent",
            tableName: "ai_support_agent",
            paranoid: true,
            timestamps: true,
            indexes: [
                { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
                {
                    name: "ai_support_agent_slug_uq",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "slug" }],
                },
                {
                    name: "ai_support_agent_status_idx",
                    using: "BTREE",
                    fields: [{ name: "status" }],
                },
            ],
        });
    }
    static associate(models) {
        aiSupportAgent.hasMany(models.aiSupportSession, {
            foreignKey: "agentId",
            as: "sessions",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = aiSupportAgent;
