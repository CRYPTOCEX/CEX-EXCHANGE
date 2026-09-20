"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const init_1 = require("../init");
const redis_1 = require("@b/utils/redis");
const model_validators_1 = require("@b/utils/model-validators");
const cacheHooks = (0, init_1.createUserCacheHooks)();
async function invalidateUserProfileCache(userId) {
    try {
        await redis_1.RedisSingleton.getInstance().del(`user:${userId}:profile`);
    }
    catch (_a) {
    }
}
class providerUser extends sequelize_1.Model {
    static initModel(sequelize) {
        return providerUser.init({
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
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "userId: User ID must be a valid UUID" },
                },
            },
            providerUserId: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                set(value) {
                    this.setDataValue("providerUserId", typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value)
                        ? value.toLowerCase()
                        : value);
                },
                validate: {
                    notNull: {
                        msg: "providerUserId: Provider user ID cannot be null",
                    },
                    len: {
                        args: [1, 255],
                        msg: "providerUserId: Provider user ID must be between 1 and 255 characters",
                    },
                },
            },
            provider: {
                type: sequelize_1.DataTypes.ENUM("GOOGLE", "WALLET"),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [["GOOGLE", "WALLET"]],
                        msg: "provider: Provider must be 'GOOGLE' or 'WALLET'",
                    },
                },
            },
            isPrimary: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: true,
                defaultValue: null,
                comment: "TRUE for the one link mirrored into user.walletAddress; NULL otherwise. Never FALSE.",
            },
            chainId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                comment: "EIP-155 chain id the SIWE signature was proven on",
            },
            verifiedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                comment: "When the SIWE signature for this link was verified",
            },
        }, {
            sequelize,
            modelName: "providerUser",
            tableName: "provider_user",
            timestamps: true,
            paranoid: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "providerUserId",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "providerUserId" }],
                },
                {
                    name: "ProviderUserUserIdFkey",
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
                {
                    name: "providerUserPrimaryPerProvider",
                    unique: true,
                    using: "BTREE",
                    fields: [
                        { name: "userId" },
                        { name: "provider" },
                        { name: "isPrimary" },
                    ],
                },
            ],
            hooks: {
                ...cacheHooks,
                afterSave: async (row, opts) => {
                    if (row.provider !== "WALLET" || row.isPrimary !== true)
                        return;
                    await sequelize.models.user.update({
                        walletAddress: row.providerUserId,
                        walletProvider: "WALLETCONNECT",
                    }, {
                        where: { id: row.userId },
                        transaction: opts === null || opts === void 0 ? void 0 : opts.transaction,
                        hooks: false,
                        context: { source: "providerUserMirror" },
                    });
                    await invalidateUserProfileCache(row.userId);
                },
                afterDestroy: async (row, opts) => {
                    await cacheHooks.afterDestroy(row);
                    if (row.provider !== "WALLET")
                        return;
                    const next = await sequelize.models.providerUser.findOne({
                        where: { userId: row.userId, provider: "WALLET" },
                        order: [["createdAt", "ASC"]],
                        transaction: opts === null || opts === void 0 ? void 0 : opts.transaction,
                    });
                    if (next) {
                        await next.update({ isPrimary: true }, { transaction: opts === null || opts === void 0 ? void 0 : opts.transaction });
                        return;
                    }
                    await sequelize.models.user.update({ walletAddress: null, walletProvider: null }, {
                        where: { id: row.userId },
                        transaction: opts === null || opts === void 0 ? void 0 : opts.transaction,
                        hooks: false,
                        context: { source: "providerUserMirror" },
                    });
                    await invalidateUserProfileCache(row.userId);
                },
            },
        });
    }
    static associate(models) {
        providerUser.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = providerUser;
