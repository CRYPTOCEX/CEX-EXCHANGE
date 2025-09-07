import { models, sequelize } from '@b/db'
import { createError } from '@b/utils/error'
import { sendFiatTransactionEmail } from '@b/utils/emails'
import {
  validatePaytmConfig,
  verifyChecksumHash,
  mapPaytmStatus,
  parsePaytmAmount,
  PaytmWebhookData,
  PaytmError,
  PAYTM_CONFIG
} from './utils'

export const metadata = {
  summary: 'Handles Paytm webhook notifications',
  description: 'Processes real-time payment notifications from Paytm with checksum verification and status updates',
  operationId: 'paytmWebhook',
  tags: ['Finance', 'Deposit', 'Paytm', 'Webhook'],
  requiresAuth: false,
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            orderId: { type: 'string' },
            mid: { type: 'string' },
            txnId: { type: 'string' },
            txnAmount: { type: 'string' },
            paymentMode: { type: 'string' },
            currency: { type: 'string' },
            txnDate: { type: 'string' },
            status: { type: 'string' },
            respCode: { type: 'string' },
            respMsg: { type: 'string' },
            gatewayName: { type: 'string' },
            bankTxnId: { type: 'string' },
            bankName: { type: 'string' },
            checksumhash: { type: 'string' },
          },
          required: ['orderId', 'mid', 'status', 'checksumhash'],
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Webhook processed successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    400: {
      description: 'Bad request - Invalid webhook data',
    },
    401: {
      description: 'Unauthorized - Invalid checksum',
    },
    404: {
      description: 'Transaction not found',
    },
    500: {
      description: 'Internal server error',
    },
  },
}

export default async (data: Handler) => {
  const { body, headers } = data
  const webhookData = body as PaytmWebhookData

  try {
    // Validate Paytm configuration
    validatePaytmConfig()

    // Verify required fields
    if (!webhookData.orderId || !webhookData.mid || !webhookData.status || !webhookData.checksumhash) {
      throw createError({
        statusCode: 400,
        message: 'Missing required webhook fields',
      })
    }

    // Verify MID matches configuration
    if (webhookData.mid !== PAYTM_CONFIG.MID) {
      throw createError({
        statusCode: 400,
        message: 'Invalid merchant ID',
      })
    }

    // Verify checksum
    const { checksumhash, ...paramsWithoutChecksum } = webhookData
    const isValidChecksum = verifyChecksumHash(paramsWithoutChecksum, checksumhash, PAYTM_CONFIG.MERCHANT_KEY)
    
    if (!isValidChecksum) {
      throw createError({
        statusCode: 401,
        message: 'Invalid webhook signature',
      })
    }

    // Find the transaction
    const transaction = await models.transaction.findOne({
      where: {
        uuid: webhookData.orderId,
        type: 'DEPOSIT',
      },
      include: [
        {
          model: models.user,
          as: 'user',
        },
      ],
    })

    if (!transaction) {
      throw createError({
        statusCode: 404,
        message: 'Transaction not found',
      })
    }

    const user = transaction.user
    if (!user) {
      throw createError({
        statusCode: 404,
        message: 'User not found for transaction',
      })
    }

    // Parse transaction metadata
    const metadata = JSON.parse(transaction.metadata || '{}')
    
    if (metadata.gateway !== 'paytm') {
      throw createError({
        statusCode: 400,
        message: 'Invalid gateway for this transaction',
      })
    }

    // Map Paytm status to internal status
    const newStatus = mapPaytmStatus(webhookData.status)
    const txnAmount = parsePaytmAmount(webhookData.txnAmount || '0', webhookData.currency || 'INR')

    // Check if status has actually changed to avoid duplicate processing
    if (transaction.status === newStatus) {
      return {
        success: true,
        message: 'Webhook processed - no status change',
      }
    }

    // Start database transaction for atomic updates
    const dbTransaction = await sequelize.transaction()

    try {
      // Update transaction status and metadata
      await transaction.update(
        {
          status: newStatus,
          referenceId: webhookData.txnId || transaction.referenceId,
          metadata: JSON.stringify({
            ...metadata,
            txnId: webhookData.txnId,
            bankTxnId: webhookData.bankTxnId,
            paymentMode: webhookData.paymentMode,
            bankName: webhookData.bankName,
            gatewayName: webhookData.gatewayName,
            respCode: webhookData.respCode,
            respMsg: webhookData.respMsg,
            txnDate: webhookData.txnDate,
            webhookProcessedAt: new Date().toISOString(),
            webhookData: webhookData,
          }),
        },
        { transaction: dbTransaction }
      )

      // If payment is successful, update user wallet
      if (newStatus === 'COMPLETED') {
        const wallet = await models.wallet.findOne({
          where: {
            userId: user.id,
            currency: webhookData.currency || 'INR',
            type: 'FIAT',
          },
          transaction: dbTransaction,
        })

        if (wallet) {
          const newBalance = parseFloat(wallet.balance) + txnAmount
          await wallet.update(
            { balance: newBalance.toString() },
            { transaction: dbTransaction }
          )

          // Commit the database transaction
          await dbTransaction.commit()

          // Send confirmation email
          try {
            await sendFiatTransactionEmail(user, transaction, webhookData.currency || 'INR', newBalance)
          } catch (emailError) {
            console.error('Failed to send confirmation email:', emailError)
            // Don't fail the webhook if email fails
          }
        } else {
          // Rollback if wallet not found
          await dbTransaction.rollback()
          throw createError({
            statusCode: 400,
            message: 'User wallet not found',
          })
        }
      } else {
        // Commit for non-successful status updates
        await dbTransaction.commit()
      }

      // Log webhook processing
      console.log(`Paytm webhook processed: Order ${webhookData.orderId}, Status: ${newStatus}, Amount: ${txnAmount}`)

      return {
        success: true,
        message: 'Webhook processed successfully',
      }

    } catch (dbError) {
      await dbTransaction.rollback()
      throw dbError
    }

  } catch (error) {
    if (error instanceof PaytmError) {
      throw createError({
        statusCode: error.status,
        message: error.message,
      })
    }

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: 'Failed to process Paytm webhook',
    })
  }
} 