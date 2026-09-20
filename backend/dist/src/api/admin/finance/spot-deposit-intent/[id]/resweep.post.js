"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.loadSpotCustody = loadSpotCustody;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const query_1 = require("@b/utils/query");
const intents_1 = require("@b/utils/spot-deposit/intents");
exports.metadata = {
    summary: "Resweeps a failed ecosystem-custody spot deposit intent",
    description: "Runs the ecosystem sweep again for a FAILED mode C intent whose coins are back in the customer's Funding wallet. Requires the Ecosystem addon; reports the intent's real status afterwards.",
    operationId: "resweepSpotDepositIntent",
    tags: ["Admin", "Finance", "Spot Deposit Intents"],
    requiresAuth: true,
    permission: "edit.spot.deposit.intent",
    logModule: "ADMIN_FIN",
    logTitle: "Resweep spot deposit intent",
    parameters: [
        { index: 0, name: "id", in: "path", required: true, schema: { type: "string" }, description: "Intent id" },
    ],
    requestBody: {
        required: false,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        note: { type: "string", description: "Optional note recorded on the intent (why the sweep is being retried)" },
                    },
                },
            },
        },
    },
    responses: {
        200: { description: "Resweep attempted; the intent's resulting status is in the response" },
        400: { description: "Not a resweepable intent" },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Spot deposit intent"),
        501: { description: "The installed ecosystem addon exports no resweep entry point" },
        503: { description: "The Ecosystem addon is not installed on this build" },
        500: query_1.serverErrorResponse,
    },
};
const SPOT_CUSTODY_MODULE = "@b/api/(ext)/ecosystem/utils/spot-custody";
const PER_INTENT_ENTRY_POINTS = ["resweepIntent", "resweep"];
const DUE_ENTRY_POINT = "resweepDue";
function loadSpotCustody() {
    try {
        return require(SPOT_CUSTODY_MODULE);
    }
    catch (error) {
        console_1.logger.debug("SPOT_DEPOSIT", `Ecosystem spot custody not loadable: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return null;
    }
}
exports.default = async (data) => {
    const { user, params, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const id = String((params === null || params === void 0 ? void 0 : params.id) || "");
    const note = typeof (body === null || body === void 0 ? void 0 : body.note) === "string" ? body.note.trim() : "";
    const intent = await db_1.models.spotDepositIntent.findOne({ where: { id } });
    if (!intent)
        throw (0, error_1.createError)({ statusCode: 404, message: "Spot deposit intent not found" });
    if (String(intent.mode) !== "ecosystem_custody") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Only an ecosystem-custody intent has a sweep to re-run; this one is in ${intent.mode} mode.`,
        });
    }
    if (String(intent.status) !== "FAILED") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Only a FAILED intent can be reswept; this one is ${intent.status}. ` +
                "A sweep that is still in flight finishes, or fails, on its own.",
        });
    }
    const custody = loadSpotCustody();
    if (!custody) {
        throw (0, error_1.createError)({
            statusCode: 503,
            message: "Ecosystem custody is not available on this build: the sweep lives in the Ecosystem addon. Install or enable it, then retry.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Resweeping intent ${id}`);
    await db_1.models.spotDepositIntent.update({
        metadata: {
            ...((0, intents_1.parseIntentMetadata)(intent.metadata)),
            resweepRequestedBy: String(user.id),
            resweepRequestedAt: new Date().toISOString(),
            ...(note ? { resweepNote: note } : {}),
        },
    }, { where: { id } });
    const entryPoint = PER_INTENT_ENTRY_POINTS.find((name) => typeof custody[name] === "function");
    let calledAs = "";
    try {
        if (entryPoint) {
            calledAs = entryPoint;
            await custody[entryPoint](id, { requestedBy: String(user.id), note: note || null });
        }
        else if (typeof custody[DUE_ENTRY_POINT] === "function") {
            calledAs = DUE_ENTRY_POINT;
            const fresh = await db_1.models.spotDepositIntent.findOne({ where: { id } });
            await db_1.models.spotDepositIntent.update({ metadata: { ...((0, intents_1.parseIntentMetadata)(fresh === null || fresh === void 0 ? void 0 : fresh.metadata)), resweepAt: new Date().toISOString() } }, { where: { id } });
            await custody[DUE_ENTRY_POINT]();
        }
        else {
            throw (0, error_1.createError)({
                statusCode: 501,
                message: `The installed ecosystem addon exports no resweep entry point (looked for ${[...PER_INTENT_ENTRY_POINTS, DUE_ENTRY_POINT].join(", ")}).`,
            });
        }
    }
    catch (error) {
        if (error === null || error === void 0 ? void 0 : error.statusCode)
            throw error;
        console_1.logger.error("SPOT_DEPOSIT", `Resweep of intent ${id} failed: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `The resweep could not be started: ${String((error === null || error === void 0 ? void 0 : error.message) || error)}`,
        });
    }
    const after = await db_1.models.spotDepositIntent.findOne({ where: { id } });
    const status = after ? String(after.status) : "FAILED";
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Resweep requested; intent is ${status}`);
    return {
        message: status === "FAILED"
            ? "The resweep did not start: the intent is still FAILED. " +
                (calledAs === DUE_ENTRY_POINT
                    ? `The ecosystem addon exposes only its cron form (${DUE_ENTRY_POINT}), which retries intents that are ` +
                        "still SWEEPING; a FAILED intent needs a per-intent entry point. "
                    : "") +
                "The customer's coins are still in their Funding wallet; check the ecosystem logs."
            : `Resweep started; the intent is now ${status}.`,
        started: status !== "FAILED",
        calledAs,
        intent: after ? (0, intents_1.serialiseIntent)(after) : null,
    };
};
