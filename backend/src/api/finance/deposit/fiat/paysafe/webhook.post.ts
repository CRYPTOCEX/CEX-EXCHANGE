import { models, sequelize } from '@b/db'
import { createError } from '@b/utils/error'
import { sendFiatTransactionEmail } from '@b/utils/emails'
import { logger } from '@b/utils/console'
import {
  validatePaysafeConfig,
  validateWebhookSignature,
  mapPaysafeStatus,
  parsePaysafeAmount,
  PaysafeWebhookData,
  PaysafePayment,
  PaysafePaymentHandle,
  PaysafeError
} from './utils'

export const metadata = {
  summary: 'Handles Paysafe webhook notifications',
  description: 'Processes real-time payment status updates from Paysafe via webhooks',
  operationId: 'handlePaysafeWebhook',
  tags: ['Finance', 'Deposit', 'Paysafe', 'Webhook'],
  logModule: "WEBHOOK",
  logTitle: "Paysafe webhook",
  requiresAuth: false, // Webhooks don't use user authentication
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            eventType: {
              type: 'string',
              description: 'Type of webhook event',
              example: 'payment.completed',
            },
            eventId: {
              type: 'string',
              description: 'Unique event identifier',
            },
            eventTime: {
              type: 'string',
              description: 'Event timestamp',
              format: 'date-time',
            },
            object: {
              type: 'object',
              description: 'Payment or PaymentHandle object',
            },
          },
          required: ['eventType', 'eventId', 'eventTime', 'object'],
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
              processed: { type: 'boolean' },
            },
          },
        },
      },
    },
    400: {
      description: 'Bad request - Invalid webhook data',
    },
    401: {
      description: 'Unauthorized - Invalid signature',
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

  try {
    // Validate Paysafe configuration
    validatePaysafeConfig()

    // Validate webhook signature if provided
    const signature = headers['x-paysafe-signature'] || headers['paysafe-signature']
    if (signature) {
      const rawBody = JSON.stringify(body)
      if (!validateWebhookSignature(rawBody, signature)) {
        logger.error("PAYSAFE", "Invalid webhook signature")
        throw createError({
          statusCode: 401,
          message: 'Invalid webhook signature',
        })
      }
    }

    const webhookData: PaysafeWebhookData = body

    if (!webhookData.eventType || !webhookData.object) {
      throw createError({
        statusCode: 400,
        message: 'Invalid webhook data: missing eventType or object',
      })
    }

    logger.info("PAYSAFE", `Processing webhook: ${webhookData.eventType} - eventId: ${webhookData.eventId}`)

    // Extract payment details from webhook object
    const paymentObject = webhookData.object as PaysafePayment | PaysafePaymentHandle
    
    if (!paymentObject.merchantRefNum) {
      logger.debug("PAYSAFE", "Webhook object missing merchantRefNum, skipping")
      return {
        success: true,
        message: 'Webhook processed (no merchantRefNum)',
        processed: false,
      }
    }

    // Find the transaction by reference
    const transaction = await models.transaction.findOne({
      where: {
        uuid: paymentObject.merchantRefNum,
      },
      include: [
        {
          model: models.user,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName'],
        },
      ],
    })

    if (!transaction) {
      logger.warn("PAYSAFE", `Transaction not found for reference: ${paymentObject.merchantRefNum}`)
      return {
        success: true,
        message: 'Transaction not found',
        processed: false,
      }
    }

    // Check if this is a duplicate event by comparing status
    const currentStatus = mapPaysafeStatus(paymentObject.status)
    if (transaction.status === currentStatus) {
      logger.debug("PAYSAFE", `Status unchanged for transaction ${transaction.uuid}: ${currentStatus}`)
      return {
        success: true,
        message: 'Status unchanged',
        processed: false,
      }
    }

    // Process different event types
    let shouldUpdateWallet = false
    let paymentAmount = 0

    if ('amount' in paymentObject && 'currencyCode' in paymentObject) {
      paymentAmount = parsePaysafeAmount(paymentObject.amount, paymentObject.currencyCode)
    }

    switch (webhookData.eventType.toLowerCase()) {
      case 'payment.completed':
      case 'payment.settled':
      case 'paymenthandle.completed':
        shouldUpdateWallet = currentStatus === 'COMPLETED'
        break
      
      case 'payment.failed':
      case 'payment.declined':
      case 'payment.cancelled':
      case 'paymenthandle.failed':
      case 'paymenthandle.cancelled':
        shouldUpdateWallet = false
        break
      
      case 'payment.pending':
      case 'payment.processing':
      case 'paymenthandle.pending':
      case 'paymenthandle.processing':
        shouldUpdateWallet = false
        break
      
      default:
        logger.debug("PAYSAFE", `Unhandled event type: ${webhookData.eventType}`)
        shouldUpdateWallet = false
    }

    // Start database transaction for atomic updates
    await sequelize.transaction(async (dbTransaction) => {
      // Update transaction status and metadata
      await transaction.update(
        {
          status: currentStatus,
          metadata: {
            ...transaction.metadata,
            webhookEventId: webhookData.eventId,
            webhookEventType: webhookData.eventType,
            webhookEventTime: webhookData.eventTime,
            gatewayStatus: paymentObject.status,
            lastWebhookUpdate: new Date().toISOString(),
            gatewayResponse: 'gatewayResponse' in paymentObject ? paymentObject.gatewayResponse : undefined,
            paymentId: 'id' in paymentObject ? paymentObject.id : undefined,
          },
        },
        { transaction: dbTransaction }
      )

      // Update user wallet if payment is successful
      if (shouldUpdateWallet && paymentAmount > 0 && 'currencyCode' in paymentObject) {
        const wallet = await models.wallet.findOne({
          where: {
            userId: transaction.userId,
            currency: paymentObject.currencyCode,
          },
          transaction: dbTransaction,
        })

        if (wallet) {
          await wallet.update(
            {
              balance: wallet.balance + paymentAmount,
            },
            { transaction: dbTransaction }
          )
        } else {
          // Create new wallet if it doesn't exist
          await models.wallet.create(
            {
              userId: transaction.userId,
              currency: paymentObject.currencyCode,
              balance: paymentAmount,
              type: 'FIAT',
            },
            { transaction: dbTransaction }
          )
        }

        logger.success("PAYSAFE", `Wallet updated: +${paymentAmount} ${paymentObject.currencyCode} for user ${transaction.userId}`)
      }
    })

    // Send confirmation email for completed payments
    if (shouldUpdateWallet && transaction.user && 'currencyCode' in paymentObject) {
      try {
        const updatedWallet = await models.wallet.findOne({
          where: {
            userId: transaction.userId,
            currency: paymentObject.currencyCode,
          },
        })
        
        await sendFiatTransactionEmail(
          transaction.user,
          transaction,
          paymentObject.currencyCode,
          updatedWallet?.balance || paymentAmount
        )
        logger.success("PAYSAFE", `Confirmation email sent for transaction ${transaction.uuid}`)
      } catch (emailError) {
        logger.error("PAYSAFE", "Failed to send confirmation email", emailError)
        // Don't fail the webhook if email fails
      }
    }

    logger.success("PAYSAFE", `Webhook processed: ${webhookData.eventType} for ${transaction.uuid}`)

    return {
      success: true,
      message: 'Webhook processed successfully',
      processed: true,
      transaction_id: transaction.id,
      status: currentStatus,
      event_type: webhookData.eventType,
    }

  } catch (error) {
    logger.error("PAYSAFE", "Webhook processing error", error)

    if (error instanceof PaysafeError) {
      throw createError({
        statusCode: error.status,
        message: `Paysafe Webhook Error: ${error.message}`,
      })
    }
    
    // For webhook errors, we should return 200 to prevent retries for invalid data
    // but log the error for investigation
    if (error.statusCode === 400 || error.statusCode === 404) {
      return {
        success: false,
        message: error.message,
        processed: false,
      }
    }
    
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to process Paysafe webhook',
    })
  }
} 