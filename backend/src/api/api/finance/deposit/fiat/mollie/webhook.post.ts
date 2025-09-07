import { createError } from '@b/utils/error'
import { models, sequelize } from '@b/db'
import { sendFiatTransactionEmail } from '@b/utils/emails'
import {
  makeApiRequest,
  validateMollieConfig,
  mapMollieStatus,
  parseMollieAmount,
  MolliePayment,
} from './utils'

export const metadata = {
  summary: 'Handles Mollie webhook notifications',
  description: 'Processes payment status updates from Mollie backend notifications',
  operationId: 'mollieWebhook',
  tags: ['Finance', 'Deposit', 'Mollie', 'Webhook'],
  requiresAuth: false, // Webhooks don't use user authentication
  requestBody: {
    required: true,
    content: {
      'application/x-www-form-urlencoded': {
        schema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Mollie payment ID',
            },
          },
          required: ['id'],
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Webhook processed successfully',
      content: {
        'text/plain': {
          schema: {
            type: 'string',
            example: 'OK',
          },
        },
      },
    },
    400: { description: 'Bad request' },
    404: { description: 'Payment not found' },
    500: { description: 'Internal server error' },
  },
}

interface RequestBody {
  id: string
}

interface Handler {
  body: RequestBody
}

export default async (data: Handler) => {
  const { body } = data

  if (!body.id) {
    throw createError({
      statusCode: 400,
      message: 'Payment ID is required',
    })
  }

  validateMollieConfig()

  try {
    const molliePaymentId = body.id

    // Fetch payment details from Mollie
    const molliePayment = await makeApiRequest<MolliePayment>(`/payments/${molliePaymentId}`)

    if (!molliePayment) {
      throw createError({
        statusCode: 404,
        message: 'Payment not found at Mollie',
      })
    }

    // Find transaction by Mollie payment ID
    const transaction = await models.transaction.findOne({
      where: {
        referenceId: molliePaymentId,
      },
    })

    if (!transaction) {
      // Try to find by metadata
      const transactionByMetadata = await models.transaction.findOne({
        where: {
          metadata: {
            molliePaymentId: molliePaymentId,
          },
        },
      })

      if (!transactionByMetadata) {
        console.warn(`No transaction found for Mollie payment ID: ${molliePaymentId}`)
        return 'OK' // Return OK to prevent Mollie from retrying
      }
    }

    const targetTransaction = transaction || await models.transaction.findOne({
      where: {
        metadata: {
          molliePaymentId: molliePaymentId,
        },
      },
    })

    // Check if transaction status has changed
    const currentMollieStatus = targetTransaction.metadata?.mollieStatus
    if (currentMollieStatus === molliePayment.status) {
      // No status change, return OK
      return 'OK'
    }

    // Map Mollie status to our system status
    const newStatus = mapMollieStatus(molliePayment.status)

    // Get user information
    const user = await models.user.findByPk(targetTransaction.userId)
    if (!user) {
      console.error(`User not found for transaction: ${targetTransaction.uuid}`)
      return 'OK'
    }

    // Process payment based on status
    if (molliePayment.status === 'paid' && targetTransaction.status !== 'COMPLETED') {
      // Payment successful - update transaction and wallet
      await sequelize.transaction(async (dbTransaction) => {
        // Update transaction status
        await models.transaction.update(
          {
            status: 'COMPLETED',
            referenceId: molliePayment.id,
            metadata: {
              ...targetTransaction.metadata,
              molliePaymentId: molliePayment.id,
              mollieStatus: molliePayment.status,
              paymentMethod: molliePayment.method || 'unknown',
              paidAt: molliePayment.createdAt,
              settlementAmount: molliePayment.settlementAmount,
              webhookProcessedAt: new Date().toISOString(),
            },
          },
          {
            where: { uuid: targetTransaction.uuid },
            transaction: dbTransaction,
          }
        )

        // Find user's wallet for the currency
        const currency = targetTransaction.metadata?.currency || 'EUR'
        let wallet = await models.wallet.findOne({
          where: {
            userId: user.id,
            currency: currency,
            type: 'FIAT',
          },
          transaction: dbTransaction,
        })

        // Create wallet if it doesn't exist
        if (!wallet) {
          wallet = await models.wallet.create(
            {
              userId: user.id,
              currency: currency,
              type: 'FIAT',
              balance: 0,
              inOrder: 0,
            },
            { transaction: dbTransaction }
          )
        }

        // Update wallet balance
        await models.wallet.update(
          {
            balance: wallet.balance + targetTransaction.amount,
          },
          {
            where: { id: wallet.id },
            transaction: dbTransaction,
          }
        )

        // Create wallet transaction record
        await models.walletTransaction.create(
          {
            walletId: wallet.id,
            type: 'DEPOSIT',
            amount: targetTransaction.amount,
            balance: wallet.balance + targetTransaction.amount,
            description: `Mollie deposit - ${targetTransaction.amount} ${currency}`,
            referenceId: targetTransaction.uuid,
            metadata: {
              gateway: 'mollie',
              molliePaymentId: molliePayment.id,
              method: molliePayment.method,
              processedVia: 'webhook',
            },
          },
          { transaction: dbTransaction }
        )

        // Record admin profit if there are fees
        if (molliePayment.settlementAmount && molliePayment.amount) {
          const originalAmount = parseMollieAmount(molliePayment.amount.value, molliePayment.amount.currency)
          const settlementAmount = parseMollieAmount(molliePayment.settlementAmount.value, molliePayment.settlementAmount.currency)
          const fee = originalAmount - settlementAmount

          if (fee > 0) {
            await models.transaction.update(
              { fee: fee / 100 }, // Convert from minor units
              {
                where: { uuid: targetTransaction.uuid },
                transaction: dbTransaction,
              }
            )
          }
        }
      })

      // Send confirmation email
      try {
        const currency = targetTransaction.metadata?.currency || 'EUR'
        const updatedWallet = await models.wallet.findOne({
          where: {
            userId: user.id,
            currency: currency,
            type: 'FIAT',
          },
        })
        
        await sendFiatTransactionEmail(
          user,
          {
            id: targetTransaction.uuid,
            type: 'DEPOSIT',
            amount: targetTransaction.amount,
            status: 'COMPLETED',
            description: `Mollie deposit - ${targetTransaction.amount} ${currency}`,
          },
          currency,
          updatedWallet?.balance || 0
        )
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError)
        // Don't throw error for email failure
      }
    } else if (['failed', 'canceled', 'expired'].includes(molliePayment.status)) {
      // Payment failed - update transaction status
      await models.transaction.update(
        {
          status: newStatus,
          metadata: {
            ...targetTransaction.metadata,
            molliePaymentId: molliePayment.id,
            mollieStatus: molliePayment.status,
            failureReason: molliePayment.details?.failureReason || 'Payment failed',
            webhookProcessedAt: new Date().toISOString(),
          },
        },
        {
          where: { uuid: targetTransaction.uuid },
        }
      )

      // Send failure notification email
      try {
        const currency = targetTransaction.metadata?.currency || 'EUR'
        await sendFiatTransactionEmail(
          user,
          {
            id: targetTransaction.uuid,
            type: 'DEPOSIT',
            amount: targetTransaction.amount,
            status: newStatus,
            description: `Mollie deposit failed - ${targetTransaction.amount} ${currency}`,
          },
          currency,
          0 // No balance change for failed transactions
        )
      } catch (emailError) {
        console.error('Failed to send failure notification email:', emailError)
      }
    } else {
      // Payment still pending or other status - update metadata only
      await models.transaction.update(
        {
          metadata: {
            ...targetTransaction.metadata,
            molliePaymentId: molliePayment.id,
            mollieStatus: molliePayment.status,
            webhookProcessedAt: new Date().toISOString(),
          },
        },
        {
          where: { uuid: targetTransaction.uuid },
        }
      )
    }

    // Log webhook processing
    console.log(`Mollie webhook processed: Payment ${molliePaymentId} status ${molliePayment.status}`)

    return 'OK'
  } catch (error) {
    console.error('Mollie webhook processing error:', error)

    // For webhook errors, we should still return OK to prevent Mollie from retrying
    // unless it's a configuration error
    if (error.message?.includes('API key')) {
      throw createError({
        statusCode: 500,
        message: 'Configuration error',
      })
    }

    return 'OK'
  }
} 