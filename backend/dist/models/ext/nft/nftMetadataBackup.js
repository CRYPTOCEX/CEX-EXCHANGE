"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class nftMetadataBackup extends sequelize_1.Model {
    static initModel(sequelize) {
        return nftMetadataBackup.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            backupId: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
            },
            type: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
            },
            size: {
                type: sequelize_1.DataTypes.BIGINT,
                allowNull: false,
                defaultValue: 0,
            },
            checksum: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
            },
            locations: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: false,
                defaultValue: {},
            },
            encrypted: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            compressed: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        }, {
            sequelize,
            modelName: "nftMetadataBackup",
            tableName: "nft_metadata_backup",
            timestamps: true,
            indexes: [
                { fields: ["backupId"], unique: true },
                { fields: ["type"] },
                { fields: ["createdAt"] },
            ],
        });
    }
    static associate(_models) {
    }
}
exports.default = nftMetadataBackup;
