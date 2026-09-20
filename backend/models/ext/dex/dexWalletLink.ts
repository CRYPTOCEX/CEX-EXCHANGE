import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import {
  CHAIN_ADDRESS_COLUMN_WIDTH,
  DEX_VM_VALUES,
  isAddressValidForVm,
  normalizeChainAddressValue,
} from "@b/utils/dex/units";

/**
 * Proof that a user controls a self-custody address.
 *
 * THIS MODEL DOES NOT WRITE user.walletAddress. That column is read by the NFT
 * flows and the profile dashboard tab and is written by no user-facing route;
 * writing it from here would change NFT behaviour as a side effect of a swap.
 *
 * paranoid: true — unlink is a soft destroy(), so the verification history
 * survives and a re-link is a restore() rather than a second row that would
 * collide with the unique index below.
 *
 * See dexChain.ts for the terse-validate convention.
 */
export default class dexWalletLink
  extends Model<dexWalletLinkAttributes, dexWalletLinkCreationAttributes>
  implements dexWalletLinkAttributes
{
  id!: string;
  userId!: string;
  vm!: string;
  address!: string;
  label?: string | null;
  verifiedAt?: Date | null;
  verificationMethod?: string | null;
  chainId?: number | null;
  lastUsedAt?: Date | null;
  nonce?: string | null;
  nonceExpiresAt?: Date | null;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof dexWalletLink {
    return dexWalletLink.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        /**
         * Which virtual machine this address belongs to.
         *
         * NOT DERIVABLE FROM `chainId`, WHICH IS NULLABLE HERE. A link is to an
         * ADDRESS, and the same EVM address is the same account on every EVM
         * chain — so `chainId` records where it was verified, not where it is
         * valid, and it is frequently null. The VM is the axis that actually
         * decides what the address IS, so it is its own column.
         */
        vm: {
          type: DataTypes.STRING(8),
          allowNull: false,
          defaultValue: "EVM",
          validate: { isIn: [[...DEX_VM_VALUES]] },
        },
        address: {
          type: DataTypes.STRING(CHAIN_ADDRESS_COLUMN_WIDTH),
          allowNull: false,
          validate: {
            addressMatchesVm(value: any) {
              if (!isAddressValidForVm((this as any).vm, String(value ?? ""))) {
                throw new Error(
                  `dexWalletLink.address is not a valid ${(this as any).vm ?? "EVM"} address`
                );
              }
            },
          },
          set(value: any) {
            this.setDataValue("address", normalizeChainAddressValue(value));
          },
          comment:
            "The self-custody address the user proved control of. EVM: lowercase. SVM/TVM/TON: verbatim — folding base58 or base64 names a different account, and this column is compared against a signer read from the chain",
        },
        label: {
          type: DataTypes.STRING(64),
          allowNull: true,
          comment: "Operator- or user-supplied name, display only",
        },
        verifiedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: "NULL means the address was seen but never proven — treat it as unverified",
        },
        verificationMethod: {
          type: DataTypes.STRING(16),
          allowNull: true,
          validate: { isIn: [["SIWE", "APPKIT"]] },
        },
        chainId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: "The chain the SIWE message named — part of what was signed, so it is recorded as signed",
        },
        lastUsedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        nonce: {
          type: DataTypes.STRING(64),
          allowNull: true,
          comment: "In-flight SIWE challenge, cleared on verification",
        },
        nonceExpiresAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "dexWalletLink",
        tableName: "dex_wallet_link",
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
            // SINGLE-COLUMN on purpose, deliberately matching
            // providerUser.providerUserId's single-column unique index so the
            // two can never disagree about who owns an address. It also means
            // the pre-flight findOne({ where: { address } }) queries exactly
            // the column the constraint enforces — the profile wallet route's
            // bug is a two-column findOrCreate against a one-column index,
            // which surfaces to the user as a 500 instead of a 409.
            name: "dexWalletLinkAddressKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "address" }],
          },
          {
            name: "dexWalletLinkUserIdx",
            using: "BTREE",
            fields: [{ name: "userId" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    dexWalletLink.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
