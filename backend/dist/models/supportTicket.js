"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
class supportTicket extends sequelize_1.Model {
    static initModel(sequelize) {
        return supportTicket.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                comment: "ID of the user who created this support ticket",
            },
            agentId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "ID of the support agent assigned to this ticket",
            },
            agentName: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                comment: "Agent display name for faster lookup",
            },
            subject: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                comment: "Subject/title of the support ticket",
            },
            importance: {
                type: sequelize_1.DataTypes.ENUM("LOW", "MEDIUM", "HIGH"),
                allowNull: false,
                defaultValue: "LOW",
                comment: "Priority level of the support ticket",
            },
            messages: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("messages");
                    if (!value)
                        return [];
                    if (Array.isArray(value))
                        return value;
                    if (typeof value === 'string') {
                        try {
                            const parsed = JSON.parse(value);
                            return Array.isArray(parsed) ? parsed : [];
                        }
                        catch (e) {
                            console_1.logger.error("TICKET", `Failed to parse messages JSON for ticket ${this.id}`, e);
                            return [];
                        }
                    }
                    return [];
                },
                set(val) {
                    try {
                        if (Array.isArray(val) &&
                            val.every((item) => typeof item === "object" &&
                                typeof item.type === "string" &&
                                typeof item.text === "string" &&
                                item.time)) {
                            this.setDataValue("messages", val);
                        }
                        else if (val === null || val === undefined) {
                            this.setDataValue("messages", val);
                        }
                        else {
                            console_1.logger.error("TICKET", `Invalid messages format for ticket ${this.id}`);
                            throw new Error("messages must be an array of message objects or null/undefined");
                        }
                    }
                    catch (error) {
                        console_1.logger.error("TICKET", `Error setting messages for ticket ${this.id}`, error);
                        throw error;
                    }
                },
                comment: "Array of chat messages between user and support agent",
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "OPEN", "REPLIED", "CLOSED"),
                allowNull: false,
                defaultValue: "PENDING",
                comment: "Current status of the support ticket",
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("LIVE", "TICKET"),
                allowNull: false,
                defaultValue: "TICKET",
                comment: "Type of support - live chat or ticket system",
            },
            tags: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                comment: "Tags for search/filter (string array)",
                get() {
                    const value = this.getDataValue("tags");
                    if (!value)
                        return [];
                    if (Array.isArray(value))
                        return value;
                    if (typeof value === 'string') {
                        try {
                            const parsed = JSON.parse(value);
                            return Array.isArray(parsed) ? parsed : [];
                        }
                        catch (e) {
                            console_1.logger.error("TICKET", `Failed to parse tags JSON for ticket ${this.id}`, e);
                            return [];
                        }
                    }
                    return [];
                },
                set(val) {
                    try {
                        if (Array.isArray(val) &&
                            val.every((item) => typeof item === "string")) {
                            this.setDataValue("tags", val);
                        }
                        else if (val === null || val === undefined) {
                            this.setDataValue("tags", val);
                        }
                        else {
                            console_1.logger.error("TICKET", `Invalid tags format for ticket ${this.id}`);
                            throw new Error("tags must be an array of strings or null/undefined");
                        }
                    }
                    catch (error) {
                        console_1.logger.error("TICKET", `Error setting tags for ticket ${this.id}`, error);
                        throw error;
                    }
                },
            },
            responseTime: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                comment: "Minutes from creation to first agent reply",
            },
            satisfaction: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: true,
                comment: "Rating 1-5 from user",
            },
            createdAt: sequelize_1.DataTypes.DATE,
            updatedAt: sequelize_1.DataTypes.DATE,
            deletedAt: sequelize_1.DataTypes.DATE,
        }, {
            sequelize,
            modelName: "supportTicket",
            tableName: "support_ticket",
            timestamps: true,
            paranoid: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                { name: "agentId", using: "BTREE", fields: [{ name: "agentId" }] },
                {
                    name: "supportTicketUserIdForeign",
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
                { name: "tags_idx", using: "BTREE", fields: [{ name: "tags", length: 255 }] },
            ],
        });
    }
    static associate(models) {
        supportTicket.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        supportTicket.belongsTo(models.user, {
            as: "agent",
            foreignKey: "agentId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = supportTicket;
