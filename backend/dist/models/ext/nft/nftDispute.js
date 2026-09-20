"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const model_validators_1 = require("@b/utils/model-validators");
class nftDispute extends sequelize_1.Model {
    static initModel(sequelize) {
        return nftDispute.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            listingId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "listingId: Must be a valid UUID" },
                },
            },
            tokenId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "tokenId: Must be a valid UUID" },
                },
            },
            transactionHash: {
                type: sequelize_1.DataTypes.STRING(66),
                allowNull: true,
                validate: {
                    is: {
                        args: /^0x[a-fA-F0-9]{64}$/,
                        msg: "transactionHash: Must be a valid transaction hash",
                    },
                },
            },
            disputeType: {
                type: sequelize_1.DataTypes.ENUM("FAKE_NFT", "COPYRIGHT_INFRINGEMENT", "SCAM", "NOT_RECEIVED", "WRONG_ITEM", "UNAUTHORIZED_SALE", "OTHER"),
                allowNull: false,
                validate: {
                    notNull: { msg: "disputeType: Dispute type is required" },
                    isIn: {
                        args: [["FAKE_NFT", "COPYRIGHT_INFRINGEMENT", "SCAM", "NOT_RECEIVED", "WRONG_ITEM", "UNAUTHORIZED_SALE", "OTHER"]],
                        msg: "disputeType: Invalid dispute type",
                    },
                },
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "INVESTIGATING", "AWAITING_RESPONSE", "RESOLVED", "REJECTED", "ESCALATED"),
                allowNull: false,
                defaultValue: "PENDING",
                validate: {
                    isIn: {
                        args: [["PENDING", "INVESTIGATING", "AWAITING_RESPONSE", "RESOLVED", "REJECTED", "ESCALATED"]],
                        msg: "status: Invalid status",
                    },
                },
            },
            priority: {
                type: sequelize_1.DataTypes.ENUM("LOW", "MEDIUM", "HIGH", "CRITICAL"),
                allowNull: false,
                defaultValue: "MEDIUM",
                validate: {
                    isIn: {
                        args: [["LOW", "MEDIUM", "HIGH", "CRITICAL"]],
                        msg: "priority: Invalid priority level",
                    },
                },
            },
            reporterId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "reporterId: Reporter ID is required" },
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "reporterId: Must be a valid UUID" },
                },
            },
            respondentId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "respondentId: Must be a valid UUID" },
                },
            },
            assignedToId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "assignedToId: Must be a valid UUID" },
                },
            },
            title: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "title: Title cannot be empty" },
                    len: { args: [1, 255], msg: "title: Title must be between 1 and 255 characters" },
                },
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "description: Description cannot be empty" },
                    len: { args: [10, 5000], msg: "description: Description must be between 10 and 5000 characters" },
                },
            },
            evidence: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("evidence");
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
                set(value) {
                    if (typeof value === "string") {
                        try {
                            this.setDataValue("evidence", JSON.parse(value));
                        }
                        catch (_a) {
                            this.setDataValue("evidence", null);
                        }
                        return;
                    }
                    this.setDataValue("evidence", value !== null && value !== void 0 ? value : null);
                },
            },
            resolution: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            resolutionType: {
                type: sequelize_1.DataTypes.ENUM("REFUND", "CANCEL_SALE", "REMOVE_LISTING", "BAN_USER", "WARNING", "NO_ACTION"),
                allowNull: true,
                validate: {
                    isIn: {
                        args: [["REFUND", "CANCEL_SALE", "REMOVE_LISTING", "BAN_USER", "WARNING", "NO_ACTION"]],
                        msg: "resolutionType: Invalid resolution type",
                    },
                },
            },
            refundAmount: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                get() {
                    const value = this.getDataValue("refundAmount");
                    return value === null || value === undefined ? value : Number(value);
                },
                allowNull: true,
                validate: {
                    isDecimal: { msg: "refundAmount: Must be a valid decimal number" },
                    min: { args: [0], msg: "refundAmount: Cannot be negative" },
                },
            },
            escalatedAt: {
                type: sequelize_1.DataTypes.DATE(3),
                allowNull: true,
            },
            investigatedAt: {
                type: sequelize_1.DataTypes.DATE(3),
                allowNull: true,
            },
            resolvedAt: {
                type: sequelize_1.DataTypes.DATE(3),
                allowNull: true,
            },
            resolvedById: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "resolvedById: Must be a valid UUID" },
                },
            },
            metadata: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
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
                set(value) {
                    if (typeof value === "string") {
                        try {
                            this.setDataValue("metadata", JSON.parse(value));
                        }
                        catch (_a) {
                            this.setDataValue("metadata", null);
                        }
                        return;
                    }
                    this.setDataValue("metadata", value !== null && value !== void 0 ? value : null);
                },
            },
        }, {
            sequelize,
            modelName: "nftDispute",
            tableName: "nft_dispute",
            timestamps: true,
            paranoid: false,
            indexes: [
                { name: "idx_nft_dispute_status", fields: ["status"] },
                { name: "idx_nft_dispute_priority", fields: ["priority"] },
                { name: "idx_nft_dispute_reporter", fields: ["reporterId"] },
                { name: "idx_nft_dispute_respondent", fields: ["respondentId"] },
                { name: "idx_nft_dispute_assigned", fields: ["assignedToId"] },
                { name: "idx_nft_dispute_listing", fields: ["listingId"] },
                { name: "idx_nft_dispute_token", fields: ["tokenId"] },
                { name: "idx_nft_dispute_created", fields: ["createdAt"] },
            ],
        });
    }
    static associate(models) {
        nftDispute.belongsTo(models.user, {
            as: "reporter",
            foreignKey: "reporterId",
        });
        nftDispute.belongsTo(models.user, {
            as: "respondent",
            foreignKey: "respondentId",
        });
        nftDispute.belongsTo(models.user, {
            as: "assignedTo",
            foreignKey: "assignedToId",
        });
        nftDispute.belongsTo(models.user, {
            as: "resolvedBy",
            foreignKey: "resolvedById",
        });
        nftDispute.belongsTo(models.nftListing, {
            as: "listing",
            foreignKey: "listingId",
        });
        nftDispute.belongsTo(models.nftToken, {
            as: "token",
            foreignKey: "tokenId",
        });
        nftDispute.hasMany(models.nftDisputeMessage, {
            as: "messages",
            foreignKey: "disputeId",
        });
    }
}
exports.default = nftDispute;
