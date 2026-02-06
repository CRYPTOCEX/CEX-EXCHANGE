"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.scyllaFuturesKeyspace = exports.scyllaKeyspace = void 0;
exports.initialize = initialize;
const cassandra_driver_1 = require("cassandra-driver");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const loadBalancingPolicy = new cassandra_driver_1.policies.loadBalancing.TokenAwarePolicy(new cassandra_driver_1.policies.loadBalancing.RoundRobinPolicy());
const scyllaUsername = process.env.SCYLLA_USERNAME;
const scyllaPassword = process.env.SCYLLA_PASSWORD;
exports.scyllaKeyspace = process.env.SCYLLA_KEYSPACE || "trading";
exports.scyllaFuturesKeyspace = process.env.SCYLLA_FUTURES_KEYSPACE || "futures";
const scyllaConnectPoints = process.env.SCYLLA_CONNECT_POINTS
    ? process.env.SCYLLA_CONNECT_POINTS.split(",").map((point) => point.trim())
    : ["127.0.0.1:9042"];
const scyllaDatacenter = (_a = process.env.SCYLLA_DATACENTER) !== null && _a !== void 0 ? _a : "datacenter1";
const clientConfig = {
    contactPoints: scyllaConnectPoints,
    localDataCenter: scyllaDatacenter,
    policies: {
        loadBalancing: loadBalancingPolicy,
    },
    socketOptions: {
        connectTimeout: 2000,
    },
    pooling: {
        coreConnectionsPerHost: {
            [cassandra_driver_1.types.distance.local]: 2,
            [cassandra_driver_1.types.distance.remote]: 1,
        },
    },
    encoding: {
        useUndefinedAsUnset: true,
    },
};
if (scyllaUsername &&
    scyllaUsername !== "" &&
    scyllaPassword &&
    scyllaPassword !== "") {
    clientConfig.authProvider = new cassandra_driver_1.auth.PlainTextAuthProvider(scyllaUsername, scyllaPassword);
}
const client = new cassandra_driver_1.Client(clientConfig);
const MAX_RETRIES = 5;
const INITIAL_DELAY = 2000;
async function connectWithRetry(retries, delay) {
    if (retries === MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, INITIAL_DELAY));
    }
    try {
        await client.connect();
        return true;
    }
    catch (err) {
        console_1.logger.error("ECOSYSTEM", "Failed to connect to ScyllaDB", err);
        if (retries > 0) {
            console_1.logger.warn("SCYLLA", `Connection failed. Retrying in ${delay / 1000} seconds...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            return connectWithRetry(retries - 1, delay * 2);
        }
        else {
            console_1.logger.error("SCYLLA", "Max retries reached. Could not connect to ScyllaDB.");
            return false;
        }
    }
}
let initializationPromise = null;
function initialize() {
    if (initializationPromise) {
        return initializationPromise;
    }
    initializationPromise = (async () => {
        const connected = await connectWithRetry(MAX_RETRIES, INITIAL_DELAY);
        if (!connected) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Failed to connect to ScyllaDB" });
        }
        await initializeDatabase(exports.scyllaKeyspace, tradingTableQueries, tradingViewQueries);
        await initializeDatabase(exports.scyllaFuturesKeyspace, futuresTableQueries, futuresViewQueries);
        client.keyspace = exports.scyllaKeyspace;
    })();
    initializationPromise.catch((err) => {
        console_1.logger.error("ECOSYSTEM", "Failed to initialize ScyllaDB", err);
        initializationPromise = null;
    });
    return initializationPromise;
}
async function initializeDatabase(keyspace, tableQueries, materializedViewQueries) {
    try {
        const query = `SELECT keyspace_name FROM system_schema.keyspaces WHERE keyspace_name = '${keyspace}'`;
        const result = await client.execute(query);
        if (result && result.rows && result.rows.length === 0) {
            await client.execute(`CREATE KEYSPACE IF NOT EXISTS ${keyspace} WITH replication = {'class': 'SimpleStrategy', 'replication_factor': '1'}`);
        }
        await client.execute(`USE ${keyspace}`);
        try {
            await Promise.all(tableQueries.map((query) => client.execute(query)));
            await Promise.all(materializedViewQueries.map((query) => client.execute(query)));
            if (keyspace === exports.scyllaKeyspace) {
                await runMigrations(keyspace);
            }
        }
        catch (err) {
            console_1.logger.error("ECOSYSTEM", "Failed to create ScyllaDB tables", err);
        }
    }
    catch (error) {
        console_1.logger.error("ECOSYSTEM", "Failed to initialize ScyllaDB database", error);
    }
}
async function runMigrations(keyspace) {
    var _a, _b;
    const migrations = [
        `ALTER TABLE ${keyspace}.orders ADD "marketMakerId" UUID`,
        `ALTER TABLE ${keyspace}.orders ADD "botId" UUID`,
        `ALTER TABLE ${keyspace}.orders ADD "walletType" TEXT`,
    ];
    for (const migration of migrations) {
        try {
            await client.execute(migration);
        }
        catch (err) {
            if (!((_a = err.message) === null || _a === void 0 ? void 0 : _a.includes("already exists")) && !((_b = err.message) === null || _b === void 0 ? void 0 : _b.includes("Invalid column name"))) {
                console_1.logger.warn("SCYLLA", `Migration warning: ${err.message}`);
            }
        }
    }
}
const tradingTableQueries = [
    `CREATE TABLE IF NOT EXISTS ${exports.scyllaKeyspace}.orders (
    id UUID,
    "userId" UUID,
    symbol TEXT,
    type TEXT,
    "timeInForce" TEXT,
    side TEXT,
    price VARINT,
    average VARINT,
    amount VARINT,
    filled VARINT,
    remaining VARINT,
    cost VARINT,
    trades TEXT,
    fee VARINT,
    "feeCurrency" TEXT,
    status TEXT,
    "createdAt" TIMESTAMP,
    "updatedAt" TIMESTAMP,
    "marketMakerId" UUID,
    "botId" UUID,
    "walletType" TEXT,
    PRIMARY KEY (("userId"), "createdAt", id)
  ) WITH CLUSTERING ORDER BY ("createdAt" DESC, id ASC);`,
    `CREATE TABLE IF NOT EXISTS ${exports.scyllaKeyspace}.candles (
    symbol TEXT,
    interval TEXT,
    open DOUBLE,
    high DOUBLE,
    low DOUBLE,
    close DOUBLE,
    volume DOUBLE,
    "createdAt" TIMESTAMP,
    "updatedAt" TIMESTAMP,
    PRIMARY KEY (symbol, interval, "createdAt")
  ) WITH CLUSTERING ORDER BY (interval ASC, "createdAt" DESC);`,
    `CREATE TABLE IF NOT EXISTS ${exports.scyllaKeyspace}.orderbook (
    symbol TEXT,
    price DOUBLE,
    amount DOUBLE,
    side TEXT,
    PRIMARY KEY ((symbol, side), price)
  ) WITH CLUSTERING ORDER BY (price ASC);`,
    `CREATE TABLE IF NOT EXISTS ${exports.scyllaKeyspace}.trades (
    symbol TEXT,
    "createdAt" TIMESTAMP,
    id UUID,
    price DOUBLE,
    amount DOUBLE,
    side TEXT,
    "isAiTrade" BOOLEAN,
    PRIMARY KEY ((symbol), "createdAt", id)
  ) WITH CLUSTERING ORDER BY ("createdAt" DESC, id ASC);`,
];
const tradingViewQueries = [
    `CREATE MATERIALIZED VIEW IF NOT EXISTS ${exports.scyllaKeyspace}.open_orders AS
  SELECT * FROM ${exports.scyllaKeyspace}.orders
  WHERE status = 'OPEN' AND "userId" IS NOT NULL AND "createdAt" IS NOT NULL AND id IS NOT NULL
  PRIMARY KEY ((status, "userId"), "createdAt", id)
  WITH CLUSTERING ORDER BY ("createdAt" DESC, id ASC);`,
    `CREATE MATERIALIZED VIEW IF NOT EXISTS ${exports.scyllaKeyspace}.latest_candles AS
  SELECT * FROM ${exports.scyllaKeyspace}.candles
  WHERE symbol IS NOT NULL AND interval IS NOT NULL AND "createdAt" IS NOT NULL
  PRIMARY KEY ((symbol, interval), "createdAt")
  WITH CLUSTERING ORDER BY ("createdAt" DESC);`,
    `CREATE MATERIALIZED VIEW IF NOT EXISTS ${exports.scyllaKeyspace}.orders_by_symbol AS
  SELECT * FROM ${exports.scyllaKeyspace}.orders
  WHERE symbol IS NOT NULL AND "userId" IS NOT NULL AND "createdAt" IS NOT NULL AND id IS NOT NULL
  PRIMARY KEY ((symbol, "userId"), "createdAt", id)
  WITH CLUSTERING ORDER BY ("createdAt" DESC, id ASC);`,
    `CREATE MATERIALIZED VIEW IF NOT EXISTS ${exports.scyllaKeyspace}.orderbook_by_symbol AS
  SELECT price, side, amount FROM ${exports.scyllaKeyspace}.orderbook
  WHERE symbol IS NOT NULL AND price IS NOT NULL AND side IS NOT NULL
  PRIMARY KEY (symbol, price, side);`,
];
const futuresTableQueries = [
    `CREATE TABLE IF NOT EXISTS ${exports.scyllaFuturesKeyspace}.orders (
    id UUID,
    "userId" UUID,
    symbol TEXT,
    type TEXT,
    "timeInForce" TEXT,
    side TEXT,
    price VARINT,
    average VARINT,
    amount VARINT,
    filled VARINT,
    remaining VARINT,
    cost VARINT,
    leverage VARINT,
    fee VARINT,
    "feeCurrency" TEXT,
    status TEXT,
    "stopLossPrice" VARINT,
    "takeProfitPrice" VARINT,
    trades TEXT,
    "createdAt" TIMESTAMP,
    "updatedAt" TIMESTAMP,
    PRIMARY KEY (("userId"), "createdAt", id)
  ) WITH CLUSTERING ORDER BY ("createdAt" DESC, id ASC);`,
    `CREATE TABLE IF NOT EXISTS ${exports.scyllaFuturesKeyspace}.position (
    id UUID,
    "userId" UUID,
    symbol TEXT,
    side TEXT,
    "entryPrice" VARINT,
    amount VARINT,
    leverage VARINT,
    "unrealizedPnl" VARINT,
    "stopLossPrice" VARINT,
    "takeProfitPrice" VARINT,
    status TEXT,
    "createdAt" TIMESTAMP,
    "updatedAt" TIMESTAMP,
    PRIMARY KEY (("userId"), id)
  ) WITH CLUSTERING ORDER BY (id ASC);`,
    `CREATE TABLE IF NOT EXISTS ${exports.scyllaFuturesKeyspace}.orderbook (
    symbol TEXT,
    price DOUBLE,
    amount DOUBLE,
    side TEXT,
    PRIMARY KEY ((symbol, side), price)
  ) WITH CLUSTERING ORDER BY (price ASC);`,
    `CREATE TABLE IF NOT EXISTS ${exports.scyllaFuturesKeyspace}.candles (
    symbol TEXT,
    interval TEXT,
    open DOUBLE,
    high DOUBLE,
    low DOUBLE,
    close DOUBLE,
    volume DOUBLE,
    "createdAt" TIMESTAMP,
    "updatedAt" TIMESTAMP,
    PRIMARY KEY (symbol, interval, "createdAt")
  ) WITH CLUSTERING ORDER BY (interval ASC, "createdAt" DESC);`,
];
const futuresViewQueries = [
    `CREATE MATERIALIZED VIEW IF NOT EXISTS ${exports.scyllaFuturesKeyspace}.open_order AS
  SELECT * FROM ${exports.scyllaFuturesKeyspace}.orders
  WHERE status = 'OPEN' AND "userId" IS NOT NULL AND "createdAt" IS NOT NULL AND id IS NOT NULL
  PRIMARY KEY ((status, "userId"), "createdAt", id)
  WITH CLUSTERING ORDER BY ("createdAt" DESC, id ASC);`,
    `CREATE MATERIALIZED VIEW IF NOT EXISTS ${exports.scyllaFuturesKeyspace}.latest_candles AS
  SELECT * FROM ${exports.scyllaFuturesKeyspace}.candles
  WHERE symbol IS NOT NULL AND interval IS NOT NULL AND "createdAt" IS NOT NULL
  PRIMARY KEY ((symbol, interval), "createdAt")
  WITH CLUSTERING ORDER BY ("createdAt" DESC);`,
    `CREATE MATERIALIZED VIEW IF NOT EXISTS ${exports.scyllaFuturesKeyspace}.orders_by_symbol AS
  SELECT * FROM ${exports.scyllaFuturesKeyspace}.orders
  WHERE symbol IS NOT NULL AND "userId" IS NOT NULL AND "createdAt" IS NOT NULL AND id IS NOT NULL
  PRIMARY KEY ((symbol, "userId"), "createdAt", id)
  WITH CLUSTERING ORDER BY ("createdAt" DESC, id ASC);`,
    `CREATE MATERIALIZED VIEW IF NOT EXISTS ${exports.scyllaFuturesKeyspace}.orderbook_by_symbol AS
  SELECT price, side, amount FROM ${exports.scyllaFuturesKeyspace}.orderbook
  WHERE symbol IS NOT NULL AND price IS NOT NULL AND side IS NOT NULL
  PRIMARY KEY (symbol, price, side);`,
    `CREATE MATERIALIZED VIEW IF NOT EXISTS ${exports.scyllaFuturesKeyspace}.positions_by_symbol AS
  SELECT * FROM ${exports.scyllaFuturesKeyspace}.position
  WHERE symbol IS NOT NULL AND id IS NOT NULL AND "userId" IS NOT NULL
  PRIMARY KEY ((symbol), id, "userId")
  WITH CLUSTERING ORDER BY (id ASC);`,
];
const shutdown = async () => {
    await client.shutdown();
    console_1.logger.info("SCYLLA", "Client disconnected");
    process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
exports.default = client;
