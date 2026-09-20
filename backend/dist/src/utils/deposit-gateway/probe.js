"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.probeGatewayCredentials = probeGatewayCredentials;
const registry_1 = require("./registry");
const TIMEOUT_MS = 12000;
function read(credentials, key) {
    var _a, _b;
    const candidate = (_a = credentials[key]) === null || _a === void 0 ? void 0 : _a.trim();
    if (candidate)
        return candidate;
    return ((_b = process.env[key]) === null || _b === void 0 ? void 0 : _b.trim()) || "";
}
async function request(url, init = {}) {
    try {
        const response = await fetch(url, {
            ...init,
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        return {
            ok: response.ok,
            status: response.status,
            body: (await response.text()).slice(0, 2000),
        };
    }
    catch (error) {
        if ((error === null || error === void 0 ? void 0 : error.name) === "TimeoutError" || (error === null || error === void 0 ? void 0 : error.name) === "AbortError") {
            return { networkError: `no response within ${TIMEOUT_MS / 1000}s` };
        }
        return { networkError: (error === null || error === void 0 ? void 0 : error.message) || String(error) };
    }
}
function isNetworkError(value) {
    return "networkError" in value;
}
function vendorMessage(body) {
    var _a, _b;
    try {
        const parsed = JSON.parse(stripBom(body));
        const candidate = ((_a = parsed === null || parsed === void 0 ? void 0 : parsed.error) === null || _a === void 0 ? void 0 : _a.message) ||
            (parsed === null || parsed === void 0 ? void 0 : parsed.message) ||
            (parsed === null || parsed === void 0 ? void 0 : parsed.detail) ||
            (parsed === null || parsed === void 0 ? void 0 : parsed.error_description) ||
            (parsed === null || parsed === void 0 ? void 0 : parsed.errorMessage) ||
            (parsed === null || parsed === void 0 ? void 0 : parsed.title);
        if (typeof candidate === "string" && candidate.trim()) {
            return candidate.trim();
        }
    }
    catch (_c) {
    }
    const firstLine = (_b = body.trim().split("\n")[0]) === null || _b === void 0 ? void 0 : _b.trim();
    return firstLine ? firstLine.slice(0, 200) : "";
}
function stripBom(value) {
    return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}
function rejected(status, body, label) {
    const detail = vendorMessage(body);
    return {
        status: "invalid",
        message: detail
            ? `${label} rejected the credentials: ${detail}`
            : `${label} rejected the credentials (HTTP ${status}).`,
    };
}
function inconclusive(label, status, body) {
    const detail = vendorMessage(body);
    return {
        status: "unknown",
        message: detail
            ? `${label} answered HTTP ${status}: ${detail}. The credentials were neither accepted nor rejected.`
            : `${label} answered HTTP ${status}, which is neither an acceptance nor a rejection.`,
    };
}
function unreachable(label, reason) {
    return {
        status: "unknown",
        message: `Could not reach ${label} — ${reason}. This says nothing about the credentials; check the server's outbound network access.`,
    };
}
function basic(user, password) {
    return `Basic ${Buffer.from(`${user}:${password}`, "utf8").toString("base64")}`;
}
function missing(keys) {
    return {
        status: "unknown",
        message: `Nothing to test — ${keys.join(" and ")} ${keys.length === 1 ? "is" : "are"} empty. Paste a value above, or set it in .env and restart.`,
    };
}
async function probeStripe(credentials) {
    const key = read(credentials, "APP_STRIPE_SECRET_KEY");
    if (!key)
        return missing(["APP_STRIPE_SECRET_KEY"]);
    const response = await request("https://api.stripe.com/v1/balance", {
        headers: { Authorization: `Bearer ${key}` },
    });
    if (isNetworkError(response))
        return unreachable("Stripe", response.networkError);
    if (response.ok) {
        return {
            status: "valid",
            message: "Stripe accepted the key and returned your account balance.",
            environment: key.startsWith("sk_live") ? "live" : "test",
        };
    }
    if (response.status === 401)
        return rejected(401, response.body, "Stripe");
    return inconclusive("Stripe", response.status, response.body);
}
async function probePaypal(credentials) {
    const clientId = read(credentials, "NEXT_PUBLIC_APP_PAYPAL_CLIENT_ID");
    const secret = read(credentials, "APP_PAYPAL_CLIENT_SECRET");
    const absent = [
        !clientId && "NEXT_PUBLIC_APP_PAYPAL_CLIENT_ID",
        !secret && "APP_PAYPAL_CLIENT_SECRET",
    ].filter(Boolean);
    if (absent.length)
        return missing(absent);
    const live = process.env.NODE_ENV === "production";
    const base = live
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com";
    const response = await request(`${base}/v1/oauth2/token`, {
        method: "POST",
        headers: {
            Authorization: basic(clientId, secret),
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
    });
    if (isNetworkError(response))
        return unreachable("PayPal", response.networkError);
    if (response.ok) {
        return {
            status: "valid",
            message: `PayPal issued an access token from its ${live ? "live" : "sandbox"} environment.`,
            environment: live ? "live" : "test",
        };
    }
    if (response.status === 401) {
        return {
            status: "invalid",
            message: `PayPal rejected this client id and secret against its ${live ? "live" : "sandbox"} environment. Credentials are issued separately per environment, and this server selects one from NODE_ENV.`,
        };
    }
    return inconclusive("PayPal", response.status, response.body);
}
async function probePaystack(credentials) {
    const key = read(credentials, "APP_PAYSTACK_SECRET_KEY");
    if (!key)
        return missing(["APP_PAYSTACK_SECRET_KEY"]);
    const response = await request("https://api.paystack.co/balance", {
        headers: { Authorization: `Bearer ${key}` },
    });
    if (isNetworkError(response))
        return unreachable("Paystack", response.networkError);
    if (response.ok) {
        return {
            status: "valid",
            message: "Paystack accepted the secret key and returned your balance.",
            environment: key.startsWith("sk_live") ? "live" : "test",
        };
    }
    if (response.status === 401)
        return rejected(401, response.body, "Paystack");
    return inconclusive("Paystack", response.status, response.body);
}
async function probeMollie(credentials) {
    var _a;
    var _b;
    const key = read(credentials, "APP_MOLLIE_API_KEY");
    if (!key)
        return missing(["APP_MOLLIE_API_KEY"]);
    const response = await request("https://api.mollie.com/v2/methods", {
        headers: { Authorization: `Bearer ${key}` },
    });
    if (isNetworkError(response))
        return unreachable("Mollie", response.networkError);
    if (response.ok) {
        let count = null;
        try {
            count = (_b = (_a = JSON.parse(response.body)) === null || _a === void 0 ? void 0 : _a.count) !== null && _b !== void 0 ? _b : null;
        }
        catch (_c) {
        }
        return {
            status: "valid",
            message: count === null
                ? "Mollie accepted the API key."
                : `Mollie accepted the API key. ${count} payment method${count === 1 ? " is" : "s are"} enabled on this account.`,
            environment: key.startsWith("live_") ? "live" : "test",
        };
    }
    if (response.status === 401)
        return rejected(401, response.body, "Mollie");
    return inconclusive("Mollie", response.status, response.body);
}
async function probeAdyen(credentials) {
    const apiKey = read(credentials, "APP_ADYEN_API_KEY");
    const merchantAccount = read(credentials, "APP_ADYEN_MERCHANT_ACCOUNT");
    const absent = [
        !apiKey && "APP_ADYEN_API_KEY",
        !merchantAccount && "APP_ADYEN_MERCHANT_ACCOUNT",
    ].filter(Boolean);
    if (absent.length)
        return missing(absent);
    const environment = (read(credentials, "APP_ADYEN_ENVIRONMENT") || "test").toLowerCase();
    if (environment === "live") {
        return {
            status: "unsupported",
            message: "Adyen's live endpoints live on a per-merchant hostname ({prefix}-checkout-live.adyenpayments.com) that cannot be derived from these variables, so a live key cannot be probed from here. Set APP_ADYEN_ENVIRONMENT=\"test\" and test with the test credential pair.",
        };
    }
    const response = await request("https://checkout-test.adyen.com/v71/paymentMethods", {
        method: "POST",
        headers: {
            "x-API-key": apiKey,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ merchantAccount }),
    });
    if (isNetworkError(response))
        return unreachable("Adyen", response.networkError);
    if (response.ok) {
        return {
            status: "valid",
            message: "Adyen accepted the API key and recognised the merchant account. Note that this only proves the server-side key — Drop-in also needs the client key's allowed-origins list to include this site.",
            environment: "test",
        };
    }
    if (response.status === 401 || response.status === 403) {
        return rejected(response.status, response.body, "Adyen");
    }
    if (response.status === 422) {
        return {
            status: "invalid",
            message: `Adyen accepted the API key but rejected the merchant account "${merchantAccount}". Use the ECOM merchant account name from the Customer Area, not the company account.`,
        };
    }
    return inconclusive("Adyen", response.status, response.body);
}
async function probeKlarna(credentials) {
    const username = read(credentials, "APP_KLARNA_USERNAME");
    const password = read(credentials, "APP_KLARNA_PASSWORD");
    const absent = [
        !username && "APP_KLARNA_USERNAME",
        !password && "APP_KLARNA_PASSWORD",
    ].filter(Boolean);
    if (absent.length)
        return missing(absent);
    const hosts = [
        { base: "https://api.playground.klarna.com", environment: "test" },
        { base: "https://api.klarna.com", environment: "live" },
    ];
    let lastInconclusive = null;
    for (const host of hosts) {
        const response = await request(`${host.base}/payments/v1/sessions/00000000-0000-0000-0000-000000000000`, { headers: { Authorization: basic(username, password) } });
        if (isNetworkError(response)) {
            lastInconclusive = unreachable("Klarna", response.networkError);
            continue;
        }
        if (response.status === 401 || response.status === 403)
            continue;
        if (response.status === 404 || response.ok) {
            return {
                status: "valid",
                message: `Klarna accepted the credentials on its ${host.environment === "test" ? "playground" : "production"} environment.`,
                environment: host.environment,
            };
        }
        lastInconclusive = inconclusive("Klarna", response.status, response.body);
    }
    if (lastInconclusive)
        return lastInconclusive;
    return {
        status: "invalid",
        message: "Klarna rejected these credentials on both the playground and production environments.",
    };
}
async function probeAuthorizeNet(credentials) {
    var _a, _b, _c, _d;
    const name = read(credentials, "APP_AUTHORIZENET_API_LOGIN_ID");
    const transactionKey = read(credentials, "APP_AUTHORIZENET_TRANSACTION_KEY");
    const absent = [
        !name && "APP_AUTHORIZENET_API_LOGIN_ID",
        !transactionKey && "APP_AUTHORIZENET_TRANSACTION_KEY",
    ].filter(Boolean);
    if (absent.length)
        return missing(absent);
    const hosts = [
        { url: "https://api.authorize.net/xml/v1/request.api", environment: "live" },
        {
            url: "https://apitest.authorize.net/xml/v1/request.api",
            environment: "test",
        },
    ];
    let lastInconclusive = null;
    for (const host of hosts) {
        const response = await request(host.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                authenticateTestRequest: {
                    merchantAuthentication: { name, transactionKey },
                },
            }),
        });
        if (isNetworkError(response)) {
            lastInconclusive = unreachable("Authorize.Net", response.networkError);
            continue;
        }
        let parsed = null;
        try {
            parsed = JSON.parse(stripBom(response.body));
        }
        catch (_e) {
            lastInconclusive = inconclusive("Authorize.Net", response.status, response.body);
            continue;
        }
        if (((_a = parsed === null || parsed === void 0 ? void 0 : parsed.messages) === null || _a === void 0 ? void 0 : _a.resultCode) === "Ok") {
            return {
                status: "valid",
                message: `Authorize.Net accepted the credentials on its ${host.environment} environment.`,
                environment: host.environment,
            };
        }
        const text = (_d = (_c = (_b = parsed === null || parsed === void 0 ? void 0 : parsed.messages) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.text;
        if (typeof text === "string" && /authentication/i.test(text))
            continue;
        lastInconclusive = {
            status: "unknown",
            message: text
                ? `Authorize.Net answered: ${text}`
                : "Authorize.Net returned a result this check does not recognise.",
        };
    }
    if (lastInconclusive)
        return lastInconclusive;
    return {
        status: "invalid",
        message: "Authorize.Net rejected this API Login ID and Transaction Key on both its production and sandbox environments.",
    };
}
async function probeDlocal(credentials) {
    const xLogin = read(credentials, "APP_DLOCAL_X_LOGIN");
    const xTransKey = read(credentials, "APP_DLOCAL_X_TRANS_KEY");
    const secretKey = read(credentials, "APP_DLOCAL_SECRET_KEY");
    const absent = [
        !xLogin && "APP_DLOCAL_X_LOGIN",
        !xTransKey && "APP_DLOCAL_X_TRANS_KEY",
        !secretKey && "APP_DLOCAL_SECRET_KEY",
    ].filter(Boolean);
    if (absent.length)
        return missing(absent);
    const crypto = await Promise.resolve().then(() => __importStar(require("crypto")));
    const xDate = new Date().toISOString();
    const signature = crypto
        .createHmac("sha256", secretKey)
        .update(`${xLogin}${xDate}`, "utf8")
        .digest("hex");
    const hosts = [
        { base: "https://api.dlocal.com", environment: "live" },
        { base: "https://sandbox.dlocal.com", environment: "test" },
    ];
    let lastInconclusive = null;
    for (const host of hosts) {
        const response = await request(`${host.base}/payments-methods?country=BR`, {
            headers: {
                "X-Date": xDate,
                "X-Login": xLogin,
                "X-Trans-Key": xTransKey,
                "X-Version": "2.1",
                "Content-Type": "application/json",
                Authorization: `V2-HMAC-SHA256, Signature: ${signature}`,
            },
        });
        if (isNetworkError(response)) {
            lastInconclusive = unreachable("dLocal", response.networkError);
            continue;
        }
        if (response.ok) {
            return {
                status: "valid",
                message: `dLocal accepted the signed request on its ${host.environment} environment.`,
                environment: host.environment,
            };
        }
        if (response.status === 401 || response.status === 403)
            continue;
        lastInconclusive = inconclusive("dLocal", response.status, response.body);
    }
    if (lastInconclusive)
        return lastInconclusive;
    return {
        status: "invalid",
        message: "dLocal rejected the signed request on both environments. Either a credential is wrong, or this server's outbound IP has not been allowlisted on your dLocal account — production enforces that and sandbox does not.",
    };
}
async function probeEway(credentials) {
    const apiKey = read(credentials, "APP_EWAY_API_KEY");
    const apiPassword = read(credentials, "APP_EWAY_API_PASSWORD");
    const absent = [
        !apiKey && "APP_EWAY_API_KEY",
        !apiPassword && "APP_EWAY_API_PASSWORD",
    ].filter(Boolean);
    if (absent.length)
        return missing(absent);
    const hosts = [
        { base: "https://api.ewaypayments.com", environment: "live" },
        { base: "https://api.sandbox.ewaypayments.com", environment: "test" },
    ];
    let lastInconclusive = null;
    for (const host of hosts) {
        const response = await request(`${host.base}/Transaction/0`, {
            headers: { Authorization: basic(apiKey, apiPassword) },
        });
        if (isNetworkError(response)) {
            lastInconclusive = unreachable("eWAY", response.networkError);
            continue;
        }
        if (response.status === 401 || response.status === 403)
            continue;
        if (response.status < 500) {
            return {
                status: "valid",
                message: `eWAY accepted the API key and password on its ${host.environment} environment.`,
                environment: host.environment,
            };
        }
        lastInconclusive = inconclusive("eWAY", response.status, response.body);
    }
    if (lastInconclusive)
        return lastInconclusive;
    return {
        status: "invalid",
        message: "eWAY rejected this API key and password on both its live and sandbox environments.",
    };
}
async function probeTransfi(credentials) {
    const username = read(credentials, "APP_TRANSFI_USERNAME");
    const password = read(credentials, "APP_TRANSFI_PASSWORD");
    const mid = read(credentials, "APP_TRANSFI_MID");
    const absent = [
        !username && "APP_TRANSFI_USERNAME",
        !password && "APP_TRANSFI_PASSWORD",
        !mid && "APP_TRANSFI_MID",
    ].filter(Boolean);
    if (absent.length)
        return missing(absent);
    const explicitBase = (process.env.APP_TRANSFI_BASE_URL || "")
        .trim()
        .replace(/\/+$/, "");
    const sandbox = /^(1|true|yes|on)$/i.test((read(credentials, "APP_TRANSFI_SANDBOX") || "").trim());
    const base = explicitBase ||
        (sandbox ? "https://sandbox-api.transfi.com" : "https://api.transfi.com");
    const response = await request(`${base}/v3/config/supported-currencies?direction=deposit`, {
        headers: {
            Authorization: basic(username, password),
            Accept: "application/json",
            MID: mid,
        },
    });
    if (isNetworkError(response))
        return unreachable("TransFi", response.networkError);
    if (response.ok) {
        return {
            status: "valid",
            message: `TransFi accepted the credentials and MID against ${base}.`,
            environment: base.includes("sandbox") ? "test" : "live",
        };
    }
    if (response.status === 401 || response.status === 403) {
        return rejected(response.status, response.body, "TransFi");
    }
    return inconclusive("TransFi", response.status, response.body);
}
const PROBES = {
    stripe: probeStripe,
    paypal: probePaypal,
    paystack: probePaystack,
    mollie: probeMollie,
    adyen: probeAdyen,
    klarna: probeKlarna,
    authorizenet: probeAuthorizeNet,
    dlocal: probeDlocal,
    eway: probeEway,
    transfi: probeTransfi,
};
function formatCheck(alias, credentials) {
    const profile = registry_1.GATEWAY_PROFILES[alias];
    const required = profile.credentials.filter((c) => c.required);
    const absent = required
        .filter((c) => !read(credentials, c.key))
        .map((c) => c.key);
    if (absent.length) {
        return {
            status: "invalid",
            message: `Not ready — ${absent.join(", ")} ${absent.length === 1 ? "is" : "are"} not set.`,
        };
    }
    const malformed = required
        .map((c) => ({ key: c.key, value: read(credentials, c.key) }))
        .filter(({ value }) => /^["']|["']$/.test(value) || /\s/.test(value))
        .map(({ key }) => key);
    if (malformed.length) {
        return {
            status: "invalid",
            message: `${malformed.join(", ")} contains quotes or whitespace. Paste the raw value — the quotes in .env are syntax, not part of the credential.`,
        };
    }
    return {
        status: "unsupported",
        message: `All required values are present and well formed. ${profile.test.note}`,
    };
}
async function probeGatewayCredentials(alias, credentials) {
    const profile = registry_1.GATEWAY_PROFILES[alias];
    if (!profile) {
        return {
            status: "unsupported",
            message: `No integration is bundled for "${alias}", so there is nothing to test.`,
        };
    }
    const probe = PROBES[alias];
    if (!probe)
        return formatCheck(alias, credentials);
    return probe(credentials);
}
