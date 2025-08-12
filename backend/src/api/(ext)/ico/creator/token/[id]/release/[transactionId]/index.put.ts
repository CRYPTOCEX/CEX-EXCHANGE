import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { createNotification } from "@b/utils/notifications";
import { rateLimiters } from "@b/handler/Middleware";
import crypto from "crypto";

// Validate transaction hash format based on blockchain
function validateTransactionHash(hash: string, blockchain: string): boolean {
  const validators: Record<string, RegExp> = {
    ethereum: /^0x[a-fA-F0-9]{64}$/,
    bsc: /^0x[a-fA-F0-9]{64}$/,
    polygon: /^0x[a-fA-F0-9]{64}$/,
    bitcoin: /^[a-fA-F0-9]{64}$/,
    solana: /^[1-9A-HJ-NP-Za-km-z]{87,88}$/,
  };
  
  const validator = validators[blockchain.toLowerCase()];
  return validator ? validator.test(hash) : true;
}

export const metadata = {
  summary: "Submit Token Release Transaction Hash",
  description:
    "Submits the transaction hash after sending tokens to the investor and updates the token release status to VERIFICATION.",
  operationId: "submitTokenReleaseHash",
  tags: ["ICO", "Token", "Release"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "ID of the token offering",
    },
    {
      index: 1,
      name: "transactionId",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "ID of the ICO transaction",
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            releaseUrl: { 
              type: "string",
              description: "Transaction hash or explorer URL"
            },
            gasUsed: {
              type: "number",
              description: "Gas used for the transaction (optional)"
            },
            blockNumber: {
              type: "number", 
              description: "Block number of the transaction (optional)"
            },
          },
          required: ["releaseUrl"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Token release transaction hash submitted successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              verificationId: { type: "string" },
            },
          },
        },
      },
    },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden - Not the offering owner" },
    404: { description: "Transaction not found" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  // Apply rate limiting
  await rateLimiters.general(data);
  
  const { user, params, body } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  
  const { id: offeringId, transactionId } = params;
  const { releaseUrl, gasUsed, blockNumber } = body;

  if (!offeringId || !transactionId || !releaseUrl) {
    throw createError({ statusCode: 400, message: "Missing required fields" });
  }

  const dbTransaction = await sequelize.transaction();
  
  try {
    // Find the offering and verify ownership
    const offering = await models.icoTokenOffering.findByPk(offeringId, {
      include: [{
        model: models.icoTokenDetail,
        as: "tokenDetail",
        required: true,
      }],
      transaction: dbTransaction,
    });
    
    if (!offering) {
      throw createError({ statusCode: 404, message: "Offering not found" });
    }
    
    if (offering.userId !== user.id) {
      throw createError({ statusCode: 403, message: "You are not the owner of this offering" });
    }

    // Find the transaction
    const icoTransaction = await models.icoTransaction.findOne({
      where: { 
        id: transactionId, 
        offeringId: offeringId 
      },
      include: [{
        model: models.user,
        as: "user",
        attributes: ["id", "email", "firstName", "lastName"],
      }],
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });
    
    if (!icoTransaction) {
      throw createError({ statusCode: 404, message: "Transaction not found" });
    }

    // Validate transaction status
    if (icoTransaction.status !== 'PENDING') {
      throw createError({ 
        statusCode: 400, 
        message: `Cannot release tokens for transaction with status: ${icoTransaction.status}` 
      });
    }

    // Extract transaction hash from URL if it's an explorer URL
    let transactionHash = releaseUrl;
    if (releaseUrl.includes('etherscan.io') || releaseUrl.includes('bscscan.com') || releaseUrl.includes('polygonscan.com')) {
      const match = releaseUrl.match(/tx\/(0x[a-fA-F0-9]{64})/);
      if (match) {
        transactionHash = match[1];
      }
    }

    // Validate transaction hash format
    const blockchain = offering.tokenDetail.blockchain;
    if (!validateTransactionHash(transactionHash, blockchain)) {
      throw createError({ 
        statusCode: 400, 
        message: `Invalid ${blockchain} transaction hash format` 
      });
    }

    // Update the transaction
    await icoTransaction.update({
      releaseUrl: releaseUrl,
      status: "VERIFICATION",
      notes: JSON.stringify({
        ...JSON.parse(icoTransaction.notes || '{}'),
        releaseData: {
          transactionHash,
          gasUsed,
          blockNumber,
          releasedAt: new Date().toISOString(),
          releasedBy: user.id,
        }
      }),
    }, { transaction: dbTransaction });

    // Create verification record
    const verificationId = crypto.randomBytes(16).toString("hex");
    
    // Create audit log
    await models.icoAdminActivity.create({
      type: "TOKEN_RELEASE_SUBMITTED",
      offeringId: offering.id,
      offeringName: offering.name,
      adminId: user.id,
      details: JSON.stringify({
        transactionId: icoTransaction.id,
        investor: icoTransaction.user.email,
        tokenAmount: icoTransaction.amount,
        walletAddress: icoTransaction.walletAddress,
        releaseUrl,
        transactionHash,
        verificationId,
      }),
    }, { transaction: dbTransaction });

    await dbTransaction.commit();

    // Send notifications
    try {
      // Notify the investor
      await createNotification({
        userId: icoTransaction.userId,
        relatedId: offeringId,
        type: "investment",
        title: "Token Release In Progress",
        message: "Your tokens are being released to your wallet.",
        details: `Transaction hash: ${transactionHash}\n` +
                `Tokens: ${icoTransaction.amount} ${offering.symbol}\n` +
                `Wallet: ${icoTransaction.walletAddress}\n` +
                `Status: Awaiting blockchain confirmation`,
        link: `/ico/dashboard?tab=transactions`,
        actions: [
          {
            label: "View Transaction",
            link: releaseUrl,
            primary: true,
          },
          {
            label: "View in Dashboard",
            link: `/ico/dashboard?tab=transactions`,
          },
        ],
      });

      // Notify the creator
      await createNotification({
        userId: user.id,
        relatedId: offeringId,
        type: "system",
        title: "Token Release Submitted",
        message: "Token release transaction submitted successfully.",
        details: `Investor: ${icoTransaction.user.firstName} ${icoTransaction.user.lastName}\n` +
                `Tokens: ${icoTransaction.amount} ${offering.symbol}\n` +
                `Transaction: ${transactionHash}`,
        link: `/ico/creator/token/${offeringId}/release`,
        actions: [
          {
            label: "View Release Dashboard",
            link: `/ico/creator/token/${offeringId}/release`,
            primary: true,
          },
        ],
      });
    } catch (notifErr) {
      console.error("Failed to send notifications:", notifErr);
    }

    return { 
      message: "Token release transaction submitted successfully.",
      verificationId,
    };
  } catch (err: any) {
    await dbTransaction.rollback();
    throw err;
  }
};