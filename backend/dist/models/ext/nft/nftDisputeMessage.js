"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class nftDisputeMessage extends sequelize_1.Model {
    static initModel(sequelize) {
        return nftDisputeMessage.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            disputeId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "disputeId: Dispute ID is required" },
                    isUUID: { args: 4, msg: "disputeId: Must be a valid UUID" },
                },
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "userId: User ID is required" },
                    isUUID: { args: 4, msg: "userId: Must be a valid UUID" },
                },
            },
            message: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "message: Message cannot be empty" },
                    len: { args: [1, 10000], msg: "message: Message must be between 1 and 10000 characters" },
                },
            },
            attachments: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("attachments");
                    return value ? JSON.parse(value) : [];
                },
                set(value) {
                    this.setDataValue("attachments", value ? JSON.stringify(value) : null);
                },
            },
            isInternal: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            isSystemMessage: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        }, {
            sequelize,
            modelName: "nftDisputeMessage",
            tableName: "nft_dispute_message",
            timestamps: true,
            paranoid: false,
            indexes: [
                { name: "idx_dispute_message_dispute", fields: ["disputeId"] },
                { name: "idx_dispute_message_user", fields: ["userId"] },
                { name: "idx_dispute_message_created", fields: ["createdAt"] },
            ],
        });
    }
    static associate(models) {
        nftDisputeMessage.belongsTo(models.nftDispute, {
            as: "dispute",
            foreignKey: "disputeId",
        });
        nftDisputeMessage.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
        });
    }
}
exports.default = nftDisputeMessage;
