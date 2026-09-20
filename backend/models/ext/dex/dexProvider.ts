import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * Operator config for the aggregator adapters.
 *
 * Named dexProvider rather than dexAggregator so the admin path is
 * /admin/dex/provider, which is what derives the `access.dex.provider`
 * permission family, and so it mirrors the fxProvider precedent the whole
 * setup-console design is copied from.
 *
 * NO CREDENTIAL EVER LIVES HERE. `apiKeyEnvVar` holds the env var NAME.
 * /api/settings is unauthenticated and SERVER_ONLY_SETTING_KEYS
 * (backend/src/api/settings/index.get.ts) redacts exactly one key, so a secret
 * in the settings table is a public secret; the same reasoning applies to any
 * column an admin list route would serialise.
 *
 * See dexChain.ts for the terse-validate and JSON-in-TEXT conventions.
 */
export default class dexProvider
  extends Model<dexProviderAttributes, dexProviderCreationAttributes>
  implements dexProviderAttributes
{
  id!: string;
  name!: string;
  title!: string;
  description?: string | null;
  status!: boolean;
  priority!: number;
  version?: string | null;
  supportedChainIds!: string;
  apiKeyEnvVar?: string | null;
  baseUrl?: string | null;
  feeMode?: string | null;
  lastVerifiedAt?: Date | null;
  lastError?: string | null;
  metadata?: string | null;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof dexProvider {
    return dexProvider.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(32),
          allowNull: false,
          // The VENDOR'S OWN SPELLING, which is also the adapter factory key,
          // the `dexChain.aggregatorSupport` key and `routers.ts`'s
          // `aggregator` field. This list read ["zerox", "oneinch", …] while
          // every one of those three read ["0x", "1inch", …], so a row created
          // through Sequelize could not name the only adapter in the build —
          // and an unrecognised name is skipped silently, which surfaced as
          // every quote failing with "no aggregator is enabled".
          // `jupiter` joined the list with the Solana venue. Adding an adapter
          // WITHOUT adding it here reproduces the failure above exactly:
          // `adapter-conformance.test.ts` is what caught it both times.
          /*
            "odos" STAYS IN THIS LIST THOUGH THE ADAPTER IS GONE.

            Odos shut down on 30 July 2026 and its adapter was removed, but this
            product ships to operators whose databases already hold an `odos`
            row. Sequelize runs `isIn` on UPDATE as well as INSERT, so dropping
            the value would make any `save()` on that row throw — including the
            admin provider status toggle, which is the one action an operator
            would take on a dead vendor.

            Removing the row is `retireDeadProviders()` in venues/manager.ts.
            Removing this string is safe only once no supported upgrade path can
            still carry the row, which is a later release's decision.
          */
          validate: {
            isIn: [["0x", "1inch", "kyberswap", "lifi", "odos", "jupiter", "sunswap", "stonfi", "mock"]],
          },
          comment: "Adapter registry key — the vendor's own spelling, e.g. 0x",
        },
        title: {
          type: DataTypes.STRING(64),
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: "Operator activation — an adapter that exists in code is still off until this is true",
        },
        priority: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 100,
          comment: "Lower wins when two providers return an equivalent route",
        },
        version: {
          type: DataTypes.STRING(32),
          allowNull: true,
        },
        supportedChainIds: {
          type: DataTypes.TEXT,
          allowNull: false,
          defaultValue: "[]",
          set(value: any) {
            this.setDataValue(
              "supportedChainIds",
              typeof value === "string" ? value : JSON.stringify(value)
            );
          },
          get() {
            const v = this.getDataValue("supportedChainIds");
            return typeof v === "string" ? JSON.parse(v) : (v ?? []);
          },
          comment: "JSON array of numeric EVM chain ids this adapter can quote",
        },
        apiKeyEnvVar: {
          type: DataTypes.STRING(64),
          allowNull: true,
          comment:
            "The env var NAME, never the key. The value is read from process.env at call time and never persisted or serialised",
        },
        baseUrl: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        feeMode: {
          type: DataTypes.STRING(16),
          allowNull: true,
          validate: { isIn: [["BUY", "SELL", "CONFIGURABLE", "ONCHAIN_REFERRAL"]] },
          comment:
            "Which side of the trade this router can take a fee on. ONCHAIN_REFERRAL means the fee is registered on chain, not passed per quote",
        },
        lastVerifiedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: "Last successful probe from the setup console",
        },
        lastError: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        metadata: {
          type: DataTypes.TEXT,
          allowNull: true,
          set(value: any) {
            this.setDataValue(
              "metadata",
              typeof value === "string" ? value : JSON.stringify(value)
            );
          },
          get() {
            const v = this.getDataValue("metadata");
            return typeof v === "string" ? JSON.parse(v) : (v ?? null);
          },
        },
      },
      {
        sequelize,
        modelName: "dexProvider",
        tableName: "dex_provider",
        timestamps: true,
        paranoid: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            // The adapter registry is keyed by name, so two rows would make
            // "is 0x enabled" answer differently depending on query order.
            name: "dexProviderNameKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "name" }],
          },
          {
            name: "dexProviderStatusPriorityIdx",
            using: "BTREE",
            fields: [{ name: "status" }, { name: "priority" }],
          },
        ],
      }
    );
  }

  public static associate(_models: any) {
    // Providers are referenced by name (dexQuote.aggregator, dexSwap.aggregator)
    // and not by id, so the row can be deleted without orphaning history.
  }
}
