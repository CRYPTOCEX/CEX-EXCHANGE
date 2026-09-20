"use strict";
const { randomUUID, createHash } = require("crypto");
const { models, sequelize } = require("@b/db");
const { walletService } = require("@b/services/wallet");
const { createError } = require("@b/utils/error");
const { settleSpotOrder } = require("./processPendingSpotOrders");
const { metadataObject } = require("../utils");
exports.placeReservedSpotOrder = async function (args) {
    const { exchange, provider, userId, symbol, side, type, amount, price, cost, feeRate, timeInForce, params, inputWalletId, clientKey } = args;
    const marketBuy = type === "market" && side === "BUY";
    if (marketBuy && !exchange.has?.createMarketBuyOrderWithCost)
        throw createError(422, "This exchange does not support a market buy with a fixed spending limit; use a limit order.");
    if (clientKey != null && (typeof clientKey !== "string" || !/^[A-Za-z0-9_-]{8,100}$/.test(clientKey)))
        throw createError(400, "Invalid idempotency-key header");
    const fingerprint = createHash("sha256").update(JSON.stringify([symbol,side,type,args.requestedAmount ?? amount,type === "limit" ? price : null,timeInForce,provider])).digest("hex");
    const hex = clientKey ? createHash("sha256").update(`spot:${userId}:${clientKey}`).digest("hex").slice(0,32) : randomUUID().replace(/-/g, "");
    const id = `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
    const clientOrderId = id.replace(/-/g, "");
    const [base,quote] = symbol.split("/");
    const reserved = side === "BUY" ? cost : amount;
    const previous = await models.exchangeOrder.findOne({where:{id,userId},raw:true});
    if (previous) {
        if (metadataObject(previous.metadata).requestFingerprint !== fingerprint) throw createError(409, "Idempotency key was already used for a different order");
        if (!previous.referenceId) throw createError(503, `Order ${id} is still pending reconciliation; no replacement was submitted`);
        return previous;
    }
    // Commit both reservation and durable intent BEFORE contacting the venue.
    // A process crash/timeout after dispatch must never undo the reservation.
    const intent = { id, userId, referenceId:null, symbol, side, type:type.toUpperCase(), timeInForce:timeInForce || "GTC", status:"OPEN", amount, price, filled:0, remaining:amount, cost:0, fee:0, feeCurrency:side === "BUY" ? base : quote,
        metadata:{holdMode:true,venue:provider,feeRateAtCreate:feeRate,reservedInputAtCreate:reserved,costAtCreate:0,feeAtCreate:0,clientOrderId,requestFingerprint:fingerprint,placementState:"DISPATCH_PENDING",quoteBudget:marketBuy ? cost : undefined} };
    try {
        await sequelize.transaction(async transaction => {
            await models.exchangeOrder.create(intent,{transaction});
            await walletService.hold({idempotencyKey:`exchange_order_${id}_hold`,userId,walletId:inputWalletId,walletType:"SPOT",currency:side === "BUY" ? quote : base,amount:reserved,reason:"Reserve funds before spot exchange submission",metadata:{orderId:id,provider,clientOrderId},transaction});
        });
    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            const concurrent = await models.exchangeOrder.findOne({where:{id,userId},raw:true});
            if (concurrent && metadataObject(concurrent.metadata).requestFingerprint === fingerprint) {
                if (!concurrent.referenceId) throw createError(503, `Order ${id} is still pending reconciliation; no replacement was submitted`);
                return concurrent;
            }
            if (concurrent) throw createError(409,"Idempotency key was already used for a different order");
        }
        throw error;
    }
    let remote;
    try {
        const venueParams={...params,clientOrderId};
        remote = marketBuy
            ? await exchange.createMarketBuyOrderWithCost(symbol,cost,venueParams)
            : await exchange.createOrder(symbol,type,side.toLowerCase(),amount,type === "limit" ? price : undefined,venueParams);
    } catch (error) {
        // Do not blindly refund or resend. Even an error can follow acceptance.
        await models.exchangeOrder.update({metadata:{...intent.metadata,placementState:"RECONCILIATION_REQUIRED"}},{where:{id,userId}});
        throw createError(503,`Exchange submission requires reconciliation. Reserved funds are retained. Order: ${id}`);
    }
    if (!remote?.id) throw createError(503,`Exchange response omitted its order ID; reservation retained. Order: ${id}`);
    // Persist the remote ID before any follow-up request can fail.
    const meta={...intent.metadata,placementState:"ACKNOWLEDGED"};
    const patch={referenceId:String(remote.id),metadata:meta};
    // Cost-limited market buys may receive more base units than the initial estimate.
    if (marketBuy && Number.isFinite(Number(remote.amount)) && Number(remote.amount)>0) patch.amount=Number(remote.amount);
    await models.exchangeOrder.update(patch,{where:{id,userId}});
    let latest=remote;
    try {
        if (exchange.has?.fetchOrder) latest=await exchange.fetchOrder(String(remote.id),symbol);
        else if (exchange.has?.fetchOrders) latest=(await exchange.fetchOrders(symbol)).find(o=>String(o.id)===String(remote.id)) || remote;
        if (marketBuy && Number(latest?.filled)>0 && ["closed","filled"].includes(String(latest.status).toLowerCase())) {
            await models.exchangeOrder.update({amount:Number(latest.filled)},{where:{id,userId,status:"OPEN"}});
        }
        if (latest && latest.filled != null) await settleSpotOrder(intent,latest,provider);
    } catch (error) {
        // The durable OPEN row with a reference remains available to cron.
        return {...intent,...patch,reconciliationPending:true};
    }
    return await models.exchangeOrder.findOne({where:{id,userId},raw:true});
};
