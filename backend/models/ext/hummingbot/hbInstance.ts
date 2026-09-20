import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

// An operator-owned Hummingbot process that runs ON THIS BOX, supervised by the
// backend so the admin never needs a terminal.
//
// This is deliberately NOT a user-facing feature. Users continue to run
// Hummingbot on their own machines against their own API keys (see the /hb
// surface); one OS process per user would cost ~1GB of RAM each and would be
// co-tenant with MySQL/Scylla/Redis on this same host, where the OOM killer
// could take the exchange down instead of the bot. These rows describe the
// operator's own market-making bots only, of which there are a handful.
export type HbInstanceStatus =
  | "STOPPED"
  | "STARTING"
  | "RUNNING"
  | "STOPPING"
  | "CRASHED";

export interface hbInstanceAttributes {
  id: string;
  name: string;
  description?: string | null;

  // --- Where it lives on this box -----------------------------------------
  // Root of the Hummingbot checkout (the dir containing hummingbot/ and bin/).
  installPath: string;
  // Interpreter to launch with — usually the conda env's python. Kept explicit
  // rather than resolved from PATH: the backend's PATH is not the operator's
  // shell PATH, and "python" on a server is as likely to be 2.7 as the env.
  pythonPath: string;

  // --- What it runs --------------------------------------------------------
  // Preset the controller YAML is generated from. SET NULL on delete so
  // removing a preset never orphans a running bot's row.
  presetId?: string | null;
  // Which market this bot quotes, in Hummingbot form ("BTC-USDT"), OVERRIDING
  // the preset's own pair.
  //
  // A preset is a set of parameters — spreads, sizes, risk — and those are
  // reusable across markets; the market is a property of the deployment. Tying
  // them together meant one preset per pair, and meant a bot could be pointed
  // at a pair the exchange does not list: Hummingbot then starts cleanly and
  // waits forever for an order book that never arrives.
  //
  // Nullable so instances registered before this existed keep working — the
  // supervisor falls back to the preset's pair.
  tradingPair?: string | null;
  // Controller config path RELATIVE to installPath, e.g.
  // "conf/controllers/inst-<id>.yml". Written by the supervisor from the
  // preset at start time, so editing the preset and restarting is enough.
  controllerConfig: string;

  // --- How it authenticates back to us -------------------------------------
  // The Hummingbot API key this bot signs with. Minted through the normal
  // key flow so the existing audit trail, scopes, rate limits and kill switch
  // all apply to the operator's own bots exactly as they do to users'.
  apiKeyId?: string | null;
  // Base URL the connector dials. Normally this deployment's own public URL.
  baseUrl: string;
  // Hummingbot's config password, which decrypts conf/connectors/*.yml.
  // Encrypted at rest (see utils/instance/secretBox.ts) and handed to the
  // child through the environment, never through argv — argv is world-readable
  // in `ps` on most Linux hosts.
  configPassword?: string | null;

  // --- Paper trading -------------------------------------------------------
  // Run this bot against Hummingbot's OWN simulator instead of the live book.
  //
  // A DEPLOYMENT PROPERTY, NOT A PRESET ONE — the same reasoning that put
  // `tradingPair` here. A preset is a parameter set (spreads, sizes, risk) and
  // those are exactly what an operator wants to rehearse unchanged before
  // committing capital; whether a given deployment of it is a rehearsal is a
  // property of the deployment. It also keeps `strategyYaml`'s refusal of a
  // paper MAKER connector intact: a preset that names one is still a mistake
  // (nothing would trade here and the panel would not say so), while this flag
  // is a deliberate, labelled choice the panel reports on every surface.
  //
  // Hummingbot spells it as a connector suffix: `bicrypto` becomes
  // `bicrypto_paper_trade`, which `ConnectorManager.create_connector` resolves
  // to a `PaperTradeExchange` wrapping the REAL connector's order-book tracker.
  // So the book, the prices and the fills are this exchange's; only the money
  // is imaginary. No order ever reaches our matching engine.
  paperTrade: boolean;
  // Virtual starting balances for the simulator, as { ASSET: amount }.
  //
  // Hummingbot seeds a paper account from `paper_trade_account_balance` in
  // conf_client.yml, whose stock value lists BTC/ETH/USDT and a handful of
  // majors. An operator rehearsing on their own listed token therefore starts
  // with ZERO of the base asset, so the sell side never quotes and the run
  // looks like a broken strategy rather than an unfunded simulator.
  //
  // Null means "derive them from the market and the preset's notional" — see
  // `defaultPaperBalances`. An explicit map wins, so an operator can rehearse a
  // specific inventory (e.g. starting flat, or long the base).
  paperBalances?: Record<string, number> | null;

  // --- Runtime state -------------------------------------------------------
  // What the operator has asked for. Admin routes write ONLY this; a reconciler
  // loop on the owning thread converges `status` towards it.
  //
  // The indirection is not ceremony. The backend can be launched threaded
  // (thread.ts), where every HTTP route is served by a worker thread — so a
  // supervisor that spawned processes directly from the request handler would
  // start one bot PER THREAD against the same account. Desired-state also makes
  // start/stop idempotent and survives a backend restart mid-transition.
  desiredStatus: "RUNNING" | "STOPPED";
  // Set by the restart endpoint. A restart cannot be expressed by toggling
  // desiredStatus within one request — the loop would simply observe the final
  // value (RUNNING), see a live process, and do nothing. The supervisor
  // terminates a process whose start time predates this stamp, then converges
  // back to RUNNING normally.
  restartRequestedAt?: Date | null;
  status: HbInstanceStatus;
  // Last known OS pid. Persisted so a backend restart can re-attach to (or at
  // least report on) a bot that outlived it, instead of silently orphaning it.
  pid?: number | null;
  autoRestart: boolean;
  // Hard memory ceiling for the child. A runaway bot must die on its own
  // rather than let the kernel pick a victim — which on this host could just
  // as easily be MySQL or the backend itself.
  memoryLimitMb: number;
  restartCount: number;
  lastStartedAt?: Date | null;
  lastStoppedAt?: Date | null;
  lastExitCode?: number | null;
  lastError?: string | null;

  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface hbInstanceCreationAttributes
  extends Omit<
    hbInstanceAttributes,
    | "id"
    | "desiredStatus"
    | "restartRequestedAt"
    | "status"
    | "pid"
    | "restartCount"
    | "lastStartedAt"
    | "lastStoppedAt"
    | "lastExitCode"
    | "lastError"
    | "createdAt"
    | "updatedAt"
  > {}

export default class hbInstance
  extends Model<hbInstanceAttributes, hbInstanceCreationAttributes>
  implements hbInstanceAttributes
{
  id!: string;
  name!: string;
  description?: string | null;
  installPath!: string;
  pythonPath!: string;
  presetId?: string | null;
  tradingPair?: string | null;
  controllerConfig!: string;
  apiKeyId?: string | null;
  baseUrl!: string;
  configPassword?: string | null;
  paperTrade!: boolean;
  paperBalances?: Record<string, number> | null;
  desiredStatus!: "RUNNING" | "STOPPED";
  restartRequestedAt?: Date | null;
  status!: HbInstanceStatus;
  pid?: number | null;
  autoRestart!: boolean;
  memoryLimitMb!: number;
  restartCount!: number;
  lastStartedAt?: Date | null;
  lastStoppedAt?: Date | null;
  lastExitCode?: number | null;
  lastError?: string | null;
  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof hbInstance {
    return hbInstance.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(120),
          allowNull: false,
          validate: { notEmpty: { msg: "name: must not be empty" } },
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        installPath: {
          type: DataTypes.STRING(500),
          allowNull: false,
          validate: { notEmpty: { msg: "installPath: must not be empty" } },
        },
        pythonPath: {
          type: DataTypes.STRING(500),
          allowNull: false,
          validate: { notEmpty: { msg: "pythonPath: must not be empty" } },
        },
        presetId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        tradingPair: {
          type: DataTypes.STRING(40),
          allowNull: true,
        },
        controllerConfig: {
          type: DataTypes.STRING(300),
          allowNull: false,
          defaultValue: "",
        },
        apiKeyId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        baseUrl: {
          type: DataTypes.STRING(300),
          allowNull: false,
          defaultValue: "",
        },
        configPassword: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        paperTrade: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        paperBalances: {
          type: DataTypes.JSON,
          allowNull: true,
          /*
           * Guarded getter. Prod MySQL hands a DataTypes.JSON column back
           * ALREADY PARSED; local MariaDB stores it as LONGTEXT and returns the
           * raw STRING, and Sequelize does not reconcile the two — so without
           * this the same row is an object on one install and a JSON string on
           * the other, and `Object.entries("{...}")` yields character indices
           * rather than assets. That would seed a paper account with balances
           * named "0", "1", "2" and no explanation.
           */
          get(this: hbInstance) {
            const value = this.getDataValue("paperBalances") as unknown;
            if (value == null) return null;
            if (typeof value === "string") {
              try {
                const parsed = JSON.parse(value);
                return parsed && typeof parsed === "object" ? parsed : null;
              } catch {
                return null;
              }
            }
            return typeof value === "object" ? value : null;
          },
        },
        desiredStatus: {
          type: DataTypes.ENUM("RUNNING", "STOPPED"),
          allowNull: false,
          defaultValue: "STOPPED",
        },
        restartRequestedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM(
            "STOPPED",
            "STARTING",
            "RUNNING",
            "STOPPING",
            "CRASHED"
          ),
          allowNull: false,
          defaultValue: "STOPPED",
        },
        pid: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        autoRestart: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        memoryLimitMb: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1536,
        },
        restartCount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        lastStartedAt: { type: DataTypes.DATE, allowNull: true },
        lastStoppedAt: { type: DataTypes.DATE, allowNull: true },
        lastExitCode: { type: DataTypes.INTEGER, allowNull: true },
        lastError: { type: DataTypes.TEXT, allowNull: true },
        createdBy: {
          type: DataTypes.UUID,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "hbInstance",
        tableName: "hb_instance",
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "hbInstanceStatusIdx",
            using: "BTREE",
            fields: [{ name: "status" }],
          },
          {
            name: "hbInstancePresetIdx",
            using: "BTREE",
            fields: [{ name: "presetId" }],
          },
          {
            name: "hbInstanceApiKeyIdx",
            using: "BTREE",
            fields: [{ name: "apiKeyId" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    hbInstance.belongsTo(models.hbStrategyPreset, {
      as: "preset",
      foreignKey: "presetId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    hbInstance.belongsTo(models.apiKey, {
      as: "apiKey",
      foreignKey: "apiKeyId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    hbInstance.belongsTo(models.user, {
      as: "creator",
      foreignKey: "createdBy",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
