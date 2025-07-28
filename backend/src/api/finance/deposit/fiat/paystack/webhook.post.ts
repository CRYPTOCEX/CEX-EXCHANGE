import { models, sequelize } from '@b/db'
import { createError } from '@b/utils/error'
import { sendFiatTransactionEmail } from '@b/utils/emails'
import {
  validateWebhookSignature,
  mapPaystackStatus,
  parsePaystackAmount,
  PAYSTACK_WEBHOOK_EVENTS,
  PaystackWebhookData,
  PaystackError
} from './utils'

export const metadata = {
  summary: 'Handles Paystack webhook notifications',
  description: 'Processes real-time payment status updates from Paystack webhooks',
  operationId: 'handlePaystackWebhook',
  tags: ['Finance', 'Deposit', 'Paystack', 'Webhook'],
  requiresAuth: false,
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            event: {
              type: 'string',
              description: 'Webhook event type',
              example: 'charge.success',
            },
            data: {
              type: 'object',
              description: 'Transaction data from Paystack',
            },
          },
          required: ['event', 'data'],
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
  const signature = headers['x-paystack-signature'] as string

  try {
    // Validate webhook signature
    const rawBody = JSON.stringify(body)
    if (!signature || !validateWebhookSignature(rawBody, signature)) {
      throw createError({
        statusCode: 401,
        message: 'Invalid webhook signature',
      })
    }

    const webhookData = body as PaystackWebhookData
    const { event, data: transactionData } = webhookData

    // Log webhook event for debugging
    console.log(`Received Paystack webhook: ${event}`, {
      reference: transactionData.reference,
      status: transactionData.status,
      amount: transactionData.amount,
      currency: transactionData.currency,
    })

    // Only process charge success events for now
    if (event !== PAYSTACK_WEBHOOK_EVENTS.CHARGE_SUCCESS) {
      console.log(`Ignoring webhook event: ${event}`)
      return {
        success: true,
        message: `Event ${event} acknowledged but not processed`,
      }
    }

    // Find the transaction by reference
    const transaction = await models.transaction.findOne({
      where: {
        id: transactionData.reference,
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
      console.warn(`Transaction not found for reference: ${transactionData.reference}`)
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

    // Check if transaction is already in final state
    if (['COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED'].includes(transaction.status)) {
      console.log(`Transaction ${transaction.id} already in final state: ${transaction.status}`)
      return {
        success: true,
        message: 'Transaction already processed',
      }
    }

    const newStatus = mapPaystackStatus(transactionData.status)
    const actualAmount = parsePaystackAmount(transactionData.amount, transactionData.currency)
    const gatewayFees = parsePaystackAmount(transactionData.fees || 0, transactionData.currency)

    // Validate transaction details
    if (Math.abs(actualAmount - transaction.amount) > 0.01) {
      console.error(`Amount mismatch for transaction ${transaction.id}: expected ${transaction.amount}, got ${actualAmount}`)
      throw createError({
        statusCode: 400,
        message: 'Transaction amount mismatch',
      })
    }

    if (transactionData.currency !== transaction.currency) {
      console.error(`Currency mismatch for transaction ${transaction.id}: expected ${transaction.currency}, got ${transactionData.currency}`)
      throw createError({
        statusCode: 400,
        message: 'Transaction currency mismatch',
      })
    }

    // Start database transaction for atomic updates
    const dbTransaction = await sequelize.transaction()

    try {
      // Update transaction status and metadata
      await transaction.update(
        {
          status: newStatus,
          referenceId: transactionData.reference,
          fee: gatewayFees,
          metadata: JSON.stringify({
            ...JSON.parse(transaction.metadata || '{}'),
            paystack_transaction_id: transactionData.id,
            paystack_status: transactionData.status,
            gateway_response: transactionData.gateway_response,
            paid_at: transactionData.paid_at,
            channel: transactionData.channel,
            authorization: transactionData.authorization,
            customer: transactionData.customer,
            fees_breakdown: transactionData.fees_breakdown,
            webhook_processed_at: new Date().toISOString(),
          }),
        },
        { transaction: dbTransaction }
      )

      // If payment is successful, update user wallet
      if (newStatus === 'COMPLETED') {
        const wallet = await models.wallet.findOne({
          where: {
            userId: user.id,
            currency: transaction.currency,
          },
          transaction: dbTransaction,
        })

        if (wallet) {
          await wallet.update(
            {
              balance: wallet.balance + transaction.amount,
            },
            { transaction: dbTransaction }
          )
        } else {
          await models.wallet.create(
            {
              userId: user.id,
              currency: transaction.currency,
              type: 'FIAT',
              balance: transaction.amount,
            },
            { transaction: dbTransaction }
          )
        }

        console.log(`Wallet updated for user ${user.id}: +${transaction.amount} ${transaction.currency}`)
      }

      // Commit the database transaction
      await dbTransaction.commit()

      console.log(`Transaction ${transaction.id} updated to status: ${newStatus}`)

      // Send confirmation email for successful payments
      if (newStatus === 'COMPLETED') {
        try {
          // Get the updated wallet balance for the email
          const updatedWallet = await models.wallet.findOne({
            where: {
              userId: user.id,
              currency: transaction.currency,
            },
          })
          const newBalance = updatedWallet?.balance || transaction.amount

          await sendFiatTransactionEmail(user, transaction, transaction.currency, newBalance)
          console.log(`Confirmation email sent for transaction ${transaction.id}`)
        } catch (emailError) {
          console.error('Failed to send confirmation email:', emailError)
          // Don't fail the webhook processing if email fails
        }
      }

      return {
        success: true,
        message: 'Webhook processed successfully',
      }

    } catch (dbError) {
      await dbTransaction.rollback()
      console.error('Database error processing webhook:', dbError)
      throw dbError
    }

  } catch (error) {
    console.error('Error processing Paystack webhook:', error)

    if (error instanceof PaystackError) {
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
      message: 'Failed to process webhook',
    })
  }
} 