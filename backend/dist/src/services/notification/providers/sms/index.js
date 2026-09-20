"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveSmsProviderFor = exports.resolveOtpProvider = exports.isSmsConfigured = exports.isOtpKind = exports.getSmsConfigError = exports.describeSmsConfiguration = exports.TwilioProvider = exports.Msg91Provider = exports.BaseSMSProvider = void 0;
exports.getSmsProviderFor = getSmsProviderFor;
exports.__resetSmsProviderCache = __resetSmsProviderCache;
const Msg91Provider_1 = require("./Msg91Provider");
const TwilioProvider_1 = require("./TwilioProvider");
const resolve_1 = require("./resolve");
const FACTORIES = {
    twilio: () => new TwilioProvider_1.TwilioProvider(),
    msg91: () => new Msg91Provider_1.Msg91Provider(),
};
let cached = null;
function getSmsProviderFor(kind) {
    return instantiate((0, resolve_1.resolveSmsProviderFor)(kind));
}
function instantiate(id) {
    if (cached && cached.id === id)
        return cached.provider;
    const provider = FACTORIES[id]();
    cached = { id, provider };
    return provider;
}
function __resetSmsProviderCache() {
    cached = null;
}
var BaseSMSProvider_1 = require("./BaseSMSProvider");
Object.defineProperty(exports, "BaseSMSProvider", { enumerable: true, get: function () { return BaseSMSProvider_1.BaseSMSProvider; } });
var Msg91Provider_2 = require("./Msg91Provider");
Object.defineProperty(exports, "Msg91Provider", { enumerable: true, get: function () { return Msg91Provider_2.Msg91Provider; } });
var TwilioProvider_2 = require("./TwilioProvider");
Object.defineProperty(exports, "TwilioProvider", { enumerable: true, get: function () { return TwilioProvider_2.TwilioProvider; } });
var resolve_2 = require("./resolve");
Object.defineProperty(exports, "describeSmsConfiguration", { enumerable: true, get: function () { return resolve_2.describeSmsConfiguration; } });
Object.defineProperty(exports, "getSmsConfigError", { enumerable: true, get: function () { return resolve_2.getSmsConfigError; } });
Object.defineProperty(exports, "isOtpKind", { enumerable: true, get: function () { return resolve_2.isOtpKind; } });
Object.defineProperty(exports, "isSmsConfigured", { enumerable: true, get: function () { return resolve_2.isSmsConfigured; } });
Object.defineProperty(exports, "resolveOtpProvider", { enumerable: true, get: function () { return resolve_2.resolveOtpProvider; } });
Object.defineProperty(exports, "resolveSmsProviderFor", { enumerable: true, get: function () { return resolve_2.resolveSmsProviderFor; } });
