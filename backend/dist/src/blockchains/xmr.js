"use strict";
/**
 * Monero ecosystem addon — same surface as SOL/TRON/TON services.
 *
 * Callers (do not rename these methods):
 *   createWallet(wallet.id | "master_wallet") → { address, data }
 *   getBalance("master_wallet")
 *   fetchTransactions("master_wallet")
 *   monitorMoneroDeposits(wallet)
 *   handleMoneroWithdrawal(txId, walletId, amount, toAddress)
 *   estimateMoneroFee()
 *
 * Spend/scan cannot be done in pure JS (RingCT). This talks to monero-wallet-rpc:
 *   MONERO_WALLET_RPC_URL   default http://127.0.0.1:18082/json_rpc
 *   MONERO_WALLET_RPC_USER / MONERO_WALLET_RPC_PASSWORD  (digest or basic)
 *   MONERO_WALLET_PASSWORD  wallet file password
 *   MONERO_WALLET_FILENAME  default master_wallet
 *   MONERO_NETWORK / XMR_NETWORK  mainnet|stagenet|testnet
 *   MONERO_CONFIRMATIONS    default 10
 *
 * One hot wallet file; each user wallet is a labeled subaddress on account 0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const http = require("http");
const https = require("https");
const crypto = require("crypto");
const { URL } = require("url");
const encrypt_1 = require("@b/utils/encrypt");
const console_1 = require("@b/utils/console");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const security_1 = require("@b/utils/security");

let storeAndBroadcastTransaction;
try {
    const depositModule = require("@b/api/(ext)/ecosystem/utils/redis/deposit");
    storeAndBroadcastTransaction = depositModule.storeAndBroadcastTransaction;
}
catch (e) { }

const ATOMIC = 1000000000000n;
const DEFAULT_FEE_XMR = 0.0001;

function toAtomic(amount) {
    const s = String(amount == null ? "0" : amount).trim();
    if (!s || s === "NaN") {
        return 0n;
    }
    const neg = s.startsWith("-");
    const raw = neg ? s.slice(1) : s;
    const [w, f = ""] = raw.split(".");
    const whole = BigInt(w || "0");
    const frac = BigInt((f + "000000000000").slice(0, 12));
    const n = whole * ATOMIC + frac;
    return neg ? -n : n;
}

function fromAtomic(atomic) {
    const n = BigInt(atomic || 0);
    const sign = n < 0n ? "-" : "";
    const abs = n < 0n ? -n : n;
    const whole = abs / ATOMIC;
    let frac = (abs % ATOMIC).toString().padStart(12, "0").replace(/0+$/, "");
    if (!frac) {
        return sign + whole.toString();
    }
    return sign + whole.toString() + "." + frac;
}

function parseDigestChallenge(header) {
    const out = {};
    if (!header) {
        return out;
    }
    const s = String(header).replace(/^Digest\s+/i, "");
    const re = /(\w+)=(?:"([^"]+)"|([^\s,]+))/g;
    let m;
    while ((m = re.exec(s))) {
        out[m[1]] = m[2] || m[3];
    }
    return out;
}

function buildDigestHeader(method, uri, challenge, user, pass, nc) {
    const ha1 = crypto
        .createHash("md5")
        .update(`${user}:${challenge.realm || ""}:${pass}`)
        .digest("hex");
    const ha2 = crypto.createHash("md5").update(`${method}:${uri}`).digest("hex");
    const cnonce = crypto.randomBytes(8).toString("hex");
    const ncStr = Number(nc || 1).toString(16).padStart(8, "0");
    const qop = challenge.qop
        ? String(challenge.qop).split(",")[0].trim()
        : "";
    let response;
    if (qop) {
        response = crypto
            .createHash("md5")
            .update(`${ha1}:${challenge.nonce}:${ncStr}:${cnonce}:${qop}:${ha2}`)
            .digest("hex");
    }
    else {
        response = crypto
            .createHash("md5")
            .update(`${ha1}:${challenge.nonce}:${ha2}`)
            .digest("hex");
    }
    const parts = [
        `username="${user}"`,
        `realm="${challenge.realm || ""}"`,
        `nonce="${challenge.nonce || ""}"`,
        `uri="${uri}"`,
        `response="${response}"`,
    ];
    if (challenge.opaque) {
        parts.push(`opaque="${challenge.opaque}"`);
    }
    if (qop) {
        parts.push(`qop=${qop}`, `nc=${ncStr}`, `cnonce="${cnonce}"`);
    }
    if (challenge.algorithm) {
        parts.push(`algorithm=${challenge.algorithm}`);
    }
    return `Digest ${parts.join(", ")}`;
}

function httpJson(urlStr, body, extraHeaders) {
    return new Promise((resolve, reject) => {
        const u = new URL(urlStr);
        const lib = u.protocol === "https:" ? https : http;
        const data = Buffer.from(JSON.stringify(body));
        const path = (u.pathname || "/") + (u.search || "");
        const opts = {
            hostname: u.hostname,
            port: u.port || (u.protocol === "https:" ? 443 : 80),
            path,
            method: "POST",
            headers: Object.assign({
                "Content-Type": "application/json",
                "Content-Length": data.length,
                Accept: "application/json",
            }, extraHeaders || {}),
            timeout: 30000,
        };
        const req = lib.request(opts, (res) => {
            const chunks = [];
            res.on("data", (c) => chunks.push(c));
            res.on("end", () => {
                resolve({
                    status: res.statusCode || 0,
                    headers: res.headers || {},
                    text: Buffer.concat(chunks).toString("utf8"),
                    uri: path,
                });
            });
        });
        req.on("error", reject);
        req.on("timeout", () => {
            req.destroy();
            reject(new Error("Monero wallet RPC timeout"));
        });
        req.write(data);
        req.end();
    });
}

class MoneroService {
    constructor() {
        this.chainActive = false;
        this.rpcReady = false;
        this.openedWallet = null;
        this.rpcLock = Promise.resolve();
        this.digestNc = 1;
        this.rpcUrl = MoneroService.getRpcUrl();
        this.rpcUser = process.env.MONERO_WALLET_RPC_USER || "";
        this.rpcPassword = process.env.MONERO_WALLET_RPC_PASSWORD || "";
        this.walletPassword = process.env.MONERO_WALLET_PASSWORD || "";
        this.masterFilename =
            process.env.MONERO_WALLET_FILENAME || "master_wallet";
        this.confirmations = Math.max(1, parseInt(process.env.MONERO_CONFIRMATIONS || "10", 10) || 10);
    }
    static getRpcUrl() {
        const raw = (process.env.MONERO_WALLET_RPC_URL ||
            "http://127.0.0.1:18082/json_rpc").trim();
        if (raw.endsWith("/json_rpc")) {
            return raw;
        }
        return raw.replace(/\/+$/, "") + "/json_rpc";
    }
    static getNetwork() {
        return (process.env.MONERO_NETWORK ||
            process.env.XMR_NETWORK ||
            "mainnet").toLowerCase();
    }
    static async getInstance() {
        if (!MoneroService.instance) {
            MoneroService.instance = new MoneroService();
            await MoneroService.instance.checkChainStatus();
            setInterval(() => MoneroService.cleanupProcessedTransactions(), 60 * 1000);
        }
        else if (!MoneroService.instance.chainActive) {
            await MoneroService.instance.checkChainStatus();
        }
        return MoneroService.instance;
    }
    static cleanupProcessedTransactions() {
        const now = Date.now();
        for (const [hash, ts] of MoneroService.processedTransactions.entries()) {
            if (now - ts > MoneroService.PROCESSING_EXPIRY_MS) {
                MoneroService.processedTransactions.delete(hash);
            }
        }
    }
    async checkChainStatus() {
        const result = await (0, security_1.isBlockchainActive)("XMR");
        if (!(result && result.active)) {
            console_1.logger.warn("XMR", (result && result.reason) || "Blockchain not active");
            this.chainActive = false;
            return;
        }
        this.chainActive = true;
        const ping = await this.pingRpc();
        this.rpcReady = ping.ok;
        if (!ping.ok) {
            console_1.logger.warn("XMR", `Monero wallet RPC not reachable at ${this.rpcUrl} (${ping.error}). Deposits, balances, and withdrawals stay limited until monero-wallet-rpc is running.`);
        }
        else {
            console_1.logger.info("XMR", "Monero service initialized successfully");
        }
    }
    ensureChainActive() {
        if (!this.chainActive) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Monero service not available. Please ensure your license is activated and the blockchain is enabled.",
            });
        }
    }
    ensureRpc() {
        if (!this.rpcReady) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: `Monero wallet RPC is not reachable at ${this.rpcUrl}. Start monero-wallet-rpc and set MONERO_WALLET_RPC_URL.`,
            });
        }
    }
    async pingRpc() {
        try {
            await this.rpc("get_version", {}, { skipOpen: true, allowFail: false });
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message || String(error) };
        }
    }
    withLock(fn) {
        const run = this.rpcLock.then(fn, fn);
        this.rpcLock = run.then(() => undefined, () => undefined);
        return run;
    }
    async rpc(method, params, opts) {
        const body = {
            jsonrpc: "2.0",
            id: "0",
            method,
            params: params || {},
        };
        const user = this.rpcUser;
        const pass = this.rpcPassword;
        let headers = {};
        if (user && pass) {
            headers.Authorization =
                "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
        }
        let res = await httpJson(this.rpcUrl, body, headers);
        if (res.status === 401 && user && pass) {
            const auth = res.headers["www-authenticate"] || "";
            if (String(auth).toLowerCase().startsWith("digest")) {
                this.digestNc += 1;
                const challenge = parseDigestChallenge(Array.isArray(auth) ? auth[0] : auth);
                headers = {
                    Authorization: buildDigestHeader("POST", res.uri, challenge, user, pass, this.digestNc),
                };
                res = await httpJson(this.rpcUrl, body, headers);
            }
        }
        if (res.status < 200 || res.status >= 300) {
            throw new Error(`wallet-rpc HTTP ${res.status}: ${(res.text || "").slice(0, 240)}`);
        }
        let json;
        try {
            json = JSON.parse(res.text || "{}");
        }
        catch (e) {
            throw new Error(`wallet-rpc returned non-JSON: ${(res.text || "").slice(0, 240)}`);
        }
        if (json.error) {
            const msg = (json.error.message || JSON.stringify(json.error));
            if (!(opts && opts.allowFail)) {
                throw new Error(msg);
            }
            const err = new Error(msg);
            err.rpcCode = json.error.code;
            throw err;
        }
        return json.result;
    }
    async ensureMasterOpen() {
        if (this.openedWallet === this.masterFilename) {
            return;
        }
        const filename = this.masterFilename;
        const password = this.walletPassword;
        try {
            await this.rpc("open_wallet", { filename, password }, { allowFail: true });
            this.openedWallet = filename;
            return;
        }
        catch (openErr) {
            const msg = String(openErr.message || "");
            if (/already (open|opened)/i.test(msg)) {
                this.openedWallet = filename;
                return;
            }
        }
        try {
            await this.rpc("create_wallet", {
                filename,
                password,
                language: "English",
            });
            this.openedWallet = filename;
            await this.rpc("store", {});
            console_1.logger.info("XMR", `Created Monero wallet file ${filename}`);
        }
        catch (createErr) {
            const msg = String(createErr.message || "");
            if (/already exists|already opened/i.test(msg)) {
                await this.rpc("open_wallet", { filename, password });
                this.openedWallet = filename;
                return;
            }
            throw createErr;
        }
    }
    parseWalletXmrAddress(wallet) {
        const addresses = typeof wallet.address === "string"
            ? JSON.parse(wallet.address)
            : wallet.address;
        if (!(addresses && addresses.XMR && addresses.XMR.address)) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Monero address not found on wallet",
            });
        }
        return addresses.XMR.address;
    }
    validateAddress(address) {
        const a = String(address || "").trim();
        return a.startsWith("4") || a.startsWith("8");
    }
    async createWallet(walletName) {
        this.ensureChainActive();
        this.ensureRpc();
        const name = String(walletName || this.masterFilename);
        return this.withLock(async () => {
            await this.ensureMasterOpen();
            if (name === "master_wallet" || name === this.masterFilename) {
                const info = await this.rpc("get_address", { account_index: 0 });
                const address = info.address;
                return {
                    address,
                    data: {
                        walletName: this.masterFilename,
                        accountIndex: 0,
                        addressIndex: 0,
                        address,
                        type: "primary",
                        network: MoneroService.getNetwork(),
                    },
                };
            }
            const created = await this.rpc("create_address", {
                account_index: 0,
                label: name,
            });
            await this.rpc("store", {});
            const address = created.address;
            return {
                address,
                data: {
                    walletName: this.masterFilename,
                    accountIndex: 0,
                    addressIndex: created.address_index,
                    address,
                    label: name,
                    type: "subaddress",
                    network: MoneroService.getNetwork(),
                },
            };
        });
    }
    async getBalance(walletName) {
        this.ensureChainActive();
        this.ensureRpc();
        return this.withLock(async () => {
            await this.ensureMasterOpen();
            const bal = await this.rpc("get_balance", { account_index: 0 });
            const unlocked = bal.unlocked_balance != null
                ? bal.unlocked_balance
                : bal.balance;
            return fromAtomic(unlocked);
        });
    }
    mapTransfer(tx, direction) {
        const amount = fromAtomic(tx.amount || 0);
        const confirmations = tx.confirmations != null ? String(tx.confirmations) : "0";
        const unlocked = tx.confirmations == null ||
            Number(tx.confirmations) >= this.confirmations;
        return {
            timestamp: tx.timestamp
                ? new Date(tx.timestamp * 1000).toISOString()
                : new Date().toISOString(),
            hash: tx.txid || tx.tx_hash || "Unknown",
            from: tx.address && direction === "out" ? tx.address : "Unknown",
            to: tx.address || "Unknown",
            amount,
            confirmations,
            status: unlocked ? "Success" : "Pending",
            isError: "0",
            fee: tx.fee != null ? fromAtomic(tx.fee) : "N/A",
            method: direction === "in" ? "Deposit" : "Withdrawal",
            methodId: "",
            contract: "",
            gas: "N/A",
            gasPrice: "N/A",
            gasUsed: "N/A",
        };
    }
    async fetchTransactions(walletName) {
        this.ensureChainActive();
        this.ensureRpc();
        return this.withLock(async () => {
            await this.ensureMasterOpen();
            const transfers = await this.rpc("get_transfers", {
                in: true,
                out: true,
                pending: true,
                pool: true,
                account_index: 0,
            });
            const rows = [];
            for (const tx of transfers.in || []) {
                rows.push(this.mapTransfer(tx, "in"));
            }
            for (const tx of transfers.pool || []) {
                rows.push(this.mapTransfer(tx, "in"));
            }
            for (const tx of transfers.out || []) {
                rows.push(this.mapTransfer(tx, "out"));
            }
            for (const tx of transfers.pending || []) {
                rows.push(this.mapTransfer(tx, "out"));
            }
            rows.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
            return rows;
        });
    }
    async monitorMoneroDeposits(wallet) {
        this.ensureChainActive();
        const address = this.parseWalletXmrAddress(wallet);
        const monitoringKey = `${wallet.id}_${address}`;
        if (MoneroService.monitoringAddresses.has(monitoringKey)) {
            console_1.logger.debug("XMR", `Monitoring already in progress for wallet ${wallet.id}`);
            return;
        }
        MoneroService.monitoringAddresses.set(monitoringKey, true);
        console_1.logger.info("XMR", `Starting deposit monitoring for wallet ${wallet.id} on ${address}`);
        const checkDeposits = async () => {
            try {
                this.ensureRpc();
                const raw = await this.fetchTransactions("master_wallet");
                for (const tx of raw) {
                    if (tx.method !== "Deposit") {
                        continue;
                    }
                    if (tx.to && tx.to !== address) {
                        continue;
                    }
                    if (tx.status !== "Success") {
                        continue;
                    }
                    const existing = await db_1.models.transaction.findOne({
                        where: { trxId: tx.hash },
                    });
                    const recent = MoneroService.processedTransactions.has(tx.hash) &&
                        Date.now() - MoneroService.processedTransactions.get(tx.hash) <
                            MoneroService.PROCESSING_EXPIRY_MS;
                    if (existing || recent) {
                        continue;
                    }
                    await this.processMoneroTransaction(tx.hash, wallet, address, tx);
                    MoneroService.processedTransactions.set(tx.hash, Date.now());
                }
            }
            catch (error) {
                console_1.logger.error("XMR", `Error checking deposits for ${address}: ${error.message}`);
            }
            setTimeout(checkDeposits, 60 * 1000);
        };
        checkDeposits();
    }
    async processMoneroTransaction(transactionHash, wallet, address, tx) {
        try {
            const amount = tx && tx.amount ? tx.amount : "0";
            if (!amount || amount === "0") {
                console_1.logger.warn("XMR", `No XMR received in ${transactionHash}`);
                return;
            }
            const txData = {
                contractType: "NATIVE",
                id: wallet.id,
                chain: "XMR",
                hash: transactionHash,
                type: "DEPOSIT",
                from: (tx && tx.from) || "Unknown",
                address,
                amount,
                status: "COMPLETED",
            };
            if (typeof storeAndBroadcastTransaction === "function") {
                await storeAndBroadcastTransaction(txData, transactionHash);
            }
            console_1.logger.success("XMR", `Processed transaction ${transactionHash}`);
        }
        catch (error) {
            console_1.logger.error("XMR", `Error processing transaction ${transactionHash}: ${error.message}`);
        }
    }
    async handleMoneroWithdrawal(transactionId, walletId, amount, toAddress, ctx) {
        var _a, _b, _c, _d;
        try {
            this.ensureChainActive();
            this.ensureRpc();
            (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || ctx === void 0 ? void 0 : _a.call(ctx, `Processing Monero withdrawal for transaction ${transactionId}`);
            if (!this.validateAddress(toAddress)) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Invalid Monero address: ${toAddress}`,
                });
            }
            const walletDb = await db_1.models.wallet.findOne({ where: { id: walletId } });
            if (!walletDb) {
                throw (0, error_1.createError)({
                    statusCode: 500,
                    message: "Wallet not found",
                });
            }
            const walletData = await db_1.models.walletData.findOne({
                where: { walletId, currency: "XMR", chain: "XMR" },
            });
            if (walletData && walletData.data) {
                try {
                    JSON.parse((0, encrypt_1.decrypt)(walletData.data));
                }
                catch (e) {
                    console_1.logger.warn("XMR", "Could not decrypt walletData; sending from master wallet");
                }
            }
            const atomic = toAtomic(amount);
            if (atomic <= 0n) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Invalid withdrawal amount",
                });
            }
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || ctx === void 0 ? void 0 : _b.call(ctx, `Transferring ${amount} XMR to ${toAddress}`);
            const result = await this.withLock(async () => {
                await this.ensureMasterOpen();
                const bal = await this.rpc("get_balance", { account_index: 0 });
                const unlocked = BigInt(bal.unlocked_balance != null
                    ? bal.unlocked_balance
                    : bal.balance || 0);
                if (atomic >= unlocked) {
                    throw (0, error_1.createError)({
                        statusCode: 400,
                        message: "Not enough unlocked Monero balance for withdrawal",
                    });
                }
                return this.rpc("transfer", {
                    destinations: [
                        {
                            amount: Number(atomic),
                            address: toAddress,
                        },
                    ],
                    account_index: 0,
                    get_tx_hash: true,
                    get_tx_key: true,
                    priority: 1,
                });
            });
            const txHash = result.tx_hash || (result.tx_hash_list && result.tx_hash_list[0]);
            if (!txHash) {
                throw (0, error_1.createError)({
                    statusCode: 500,
                    message: "Monero transfer did not return a transaction hash",
                });
            }
            await db_1.models.transaction.update({
                status: "COMPLETED",
                trxId: txHash,
            }, { where: { id: transactionId } });
            (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || ctx === void 0 ? void 0 : _c.call(ctx, `Monero withdrawal completed: ${txHash}`);
            return txHash;
        }
        catch (error) {
            console_1.logger.error("XMR", "Failed to execute withdrawal", error);
            (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || ctx === void 0 ? void 0 : _d.call(ctx, error.message || "Failed to execute withdrawal");
            await db_1.models.transaction.update({
                status: "FAILED",
                description: error.message || "Failed to execute withdrawal",
            }, { where: { id: transactionId } });
            throw error;
        }
    }
    async estimateMoneroFee() {
        this.ensureChainActive();
        if (!this.rpcReady) {
            return DEFAULT_FEE_XMR;
        }
        try {
            const est = await this.withLock(async () => {
                await this.ensureMasterOpen();
                return this.rpc("get_fee_estimate", { grace_blocks: 1 });
            });
            const perUnit = Number(est.fee || 0);
            // Rough standard tx ~2 kB. fee is atomic units per kB/byte depending on daemon.
            const guessed = perUnit > 0 ? (perUnit * 2) / 1e12 : DEFAULT_FEE_XMR;
            if (!Number.isFinite(guessed) || guessed <= 0) {
                return DEFAULT_FEE_XMR;
            }
            if (guessed > 0.05) {
                return DEFAULT_FEE_XMR;
            }
            return guessed;
        }
        catch (error) {
            console_1.logger.warn("XMR", `Fee estimate failed (${error.message}); using default ${DEFAULT_FEE_XMR}`);
            return DEFAULT_FEE_XMR;
        }
    }
}

MoneroService.instance = null;
MoneroService.monitoringAddresses = new Map();
MoneroService.processedTransactions = new Map();
MoneroService.PROCESSING_EXPIRY_MS = 10 * 60 * 1000;

exports.default = MoneroService;
