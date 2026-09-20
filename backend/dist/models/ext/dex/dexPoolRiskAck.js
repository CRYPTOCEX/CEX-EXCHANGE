"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const units_1 = require("@b/utils/dex/units");
class dexPoolRiskAck extends sequelize_1.Model {
    static initModel(sequelize) {
        return dexPoolRiskAck.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            poolId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
            },
            chainId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                comment: "Denormalised — the evidence must outlive the pool row",
            },
            poolAddress: {
                type: sequelize_1.DataTypes.STRING(42),
                allowNull: false,
                validate: { is: units_1.EVM_ADDRESS_RE },
                set(value) {
                    this.setDataValue("poolAddress", typeof value === "string" ? value.toLowerCase() : value);
                },
                comment: "Denormalised — the evidence must outlive the pool row",
            },
            adminUserId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "NO FOREIGN KEY, deliberately. Same reasoning adminAuditLog gives: an FK would let deleting an admin cascade away the evidence, and would make this INSERT take a shared lock on a `user` row the in-flight request may already hold",
            },
            adminEmail: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                comment: "Denormalised at sign time — must remain readable after the account is gone",
            },
            adminName: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                comment: "Denormalised at sign time",
            },
            clauseVersion: {
                type: sequelize_1.DataTypes.STRING(16),
                allowNull: false,
                comment: '"1.0", or "waived" on an attributed Super-Admin waiver row',
            },
            clauseHash: {
                type: sequelize_1.DataTypes.STRING(66),
                allowNull: false,
                comment: "sha256 of the exact rendered prose. Change one character of the copy and every prior acknowledgement is stale and seeding re-blocks — which is the point, not a bug",
            },
            clausesAccepted: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                get() {
                    const raw = this.getDataValue("clausesAccepted");
                    if (raw === null || raw === undefined)
                        return [];
                    if (Array.isArray(raw))
                        return raw;
                    try {
                        return JSON.parse(raw);
                    }
                    catch (_a) {
                        return [];
                    }
                },
                set(value) {
                    this.setDataValue("clausesAccepted", typeof value === "string" ? value : JSON.stringify(value !== null && value !== void 0 ? value : []));
                },
                comment: "JSON-in-TEXT array of the individually-ticked clause ids. Empty on a waiver row, which is itself the record",
            },
            typedConfirmation: {
                type: sequelize_1.DataTypes.STRING(128),
                allowNull: false,
                comment: "EXACTLY what they typed. Stored so a dispute is answerable from the row rather than reconstructed",
            },
            feeTierBps: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                comment: "One of the two numbers the typed string encodes. Stored separately so the confirmation can be re-derived and checked",
            },
            initialPriceQuotePerBase: {
                type: sequelize_1.DataTypes.STRING(78),
                allowNull: false,
                validate: { is: units_1.RAW_AMOUNT_RE },
                comment: "The other. On an empty pair the first addLiquidity SETS the price — there is no market to correct a mistyped ratio, and the first arbitrageur takes the difference in the first block",
            },
            ipAddress: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
            },
            userAgent: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
            },
            acknowledgedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
            },
            waivedByUserId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: 'Non-null only on a clauseVersion "waived" row. Turning dexPoolRiskAckRequired off removes the DIALOG, never the RECORD — riskAckId is NOT NULL at the database, so an attributed waiver row is strictly more forensically useful than a gap, and "who allowed this" stays answerable from the position itself',
            },
            revokedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                comment: "A full withdrawal revokes the acknowledgement",
            },
            revokedReason: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "dexPoolRiskAck",
            tableName: "dex_pool_risk_ack",
            timestamps: true,
            paranoid: false,
            indexes: [
                { name: "PRIMARY", unique: true, using: "BTREE", fields: [{ name: "id" }] },
                {
                    name: "dexPoolRiskAckPoolClauseKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "poolId" }, { name: "clauseHash" }],
                },
                {
                    name: "dexPoolRiskAckAdminIdx",
                    using: "BTREE",
                    fields: [{ name: "adminUserId" }],
                },
            ],
        });
    }
    static associate(models) {
        dexPoolRiskAck.belongsTo(models.dexPool, {
            as: "pool",
            foreignKey: "poolId",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = dexPoolRiskAck;
