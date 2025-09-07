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
  summary: 'Verifies Mollie payment status',
  description: 'Handles return URL from Mollie and verifies payment completion',
  operationId: 'verifyMolliePayment',
  tags: ['Finance', 'Deposit', 'Mollie'],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            transaction: {
              type: 'string',
              description: 'Transaction UUID',
            },
            paymentId: {
              type: 'string',
              description: 'Mollie payment ID (optional)',
            },
          },
          required: ['transaction'],
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Payment verification completed',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  transactionId: { type: 'string' },
                  status: { type: 'string' },
                  amount: { type: 'number' },
                  currency: { type: 'string' },
                  paymentMethod: { type: 'string' },
                  paidAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    404: { description: 'Transaction not found' },
    500: { description: 'Internal server error' },
  },
}

interface RequestBody {
  transaction: string
  paymentId?: string
}

interface Handler {
  body: RequestBody
  user?: any
}

export default async (data: Handler) => {
  const { body, user } = data

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required',
    })
  }

  if (!body.transaction) {
    throw createError({
      statusCode: 400,
      message: 'Transaction ID is required',
    })
  }

  validateMollieConfig()

  try {
    // Find the transaction
    const transaction = await models.transaction.findOne({
      where: {
        uuid: body.transaction,
        userId: user.id,
      },
    })

    if (!transaction) {
      throw createError({
        statusCode: 404,
        message: 'Transaction not found',
      })
    }

    // Check if transaction is already processed
    if (transaction.status === 'COMPLETED') {
      return {
        success: true,
        data: {
          transactionId: transaction.uuid,
          status: 'COMPLETED',
          amount: transaction.amount,
          currency: transaction.metadata?.currency || 'EUR',
          paymentMethod: transaction.metadata?.method || 'unknown',
          paidAt: transaction.updatedAt,
        },
      }
    }

    // Get Mollie payment ID from transaction or request
    const molliePaymentId = body.paymentId || transaction.referenceId || transaction.metadata?.molliePaymentId

    if (!molliePaymentId) {
      throw createError({
        statusCode: 400,
        message: 'Mollie payment ID not found',
      })
    }

    // Fetch payment status from Mollie
    const molliePayment = await makeApiRequest<MolliePayment>(`/payments/${molliePaymentId}`)

    if (!molliePayment) {
      throw createError({
        statusCode: 404,
        message: 'Payment not found at Mollie',
      })
    }

    // Map Mollie status to our system status
    const newStatus = mapMollieStatus(molliePayment.status)
    let updatedTransaction = transaction

    // Process payment based on status
    if (molliePayment.status === 'paid' && transaction.status !== 'COMPLETED') {
      // Payment successful - update transaction and wallet
      await sequelize.transaction(async (dbTransaction) => {
        // Update transaction status
        await models.transaction.update(
          {
            status: 'COMPLETED',
            referenceId: molliePayment.id,
            metadata: {
              ...transaction.metadata,
              molliePaymentId: molliePayment.id,
              mollieStatus: molliePayment.status,
              paymentMethod: molliePayment.method || 'unknown',
              paidAt: molliePayment.createdAt,
              settlementAmount: molliePayment.settlementAmount,
            },
          },
          {
            where: { uuid: transaction.uuid },
            transaction: dbTransaction,
          }
        )

        // Find user's wallet for the currency
        const currency = transaction.metadata?.currency || 'EUR'
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
            balance: wallet.balance + transaction.amount,
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
            amount: transaction.amount,
            balance: wallet.balance + transaction.amount,
            description: `Mollie deposit - ${transaction.amount} ${currency}`,
            referenceId: transaction.uuid,
            metadata: {
              gateway: 'mollie',
              molliePaymentId: molliePayment.id,
              method: molliePayment.method,
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
                where: { uuid: transaction.uuid },
                transaction: dbTransaction,
              }
            )
          }
        }
      })

             // Send confirmation email
       try {
         const currency = transaction.metadata?.currency || 'EUR'
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
             id: transaction.uuid,
             type: 'DEPOSIT',
             amount: transaction.amount,
             status: 'COMPLETED',
             description: `Mollie deposit - ${transaction.amount} ${currency}`,
           },
           currency,
           updatedWallet?.balance || 0
         )
       } catch (emailError) {
         console.error('Failed to send confirmation email:', emailError)
         // Don't throw error for email failure
       }

      // Fetch updated transaction
      updatedTransaction = await models.transaction.findOne({
        where: { uuid: transaction.uuid },
      })
    } else if (['failed', 'canceled', 'expired'].includes(molliePayment.status)) {
      // Payment failed - update transaction status
      await models.transaction.update(
        {
          status: newStatus,
          metadata: {
            ...transaction.metadata,
            molliePaymentId: molliePayment.id,
            mollieStatus: molliePayment.status,
            failureReason: molliePayment.details?.failureReason || 'Payment failed',
          },
        },
        {
          where: { uuid: transaction.uuid },
        }
      )

      updatedTransaction = await models.transaction.findOne({
        where: { uuid: transaction.uuid },
      })
    } else {
      // Payment still pending - update metadata only
      await models.transaction.update(
        {
          metadata: {
            ...transaction.metadata,
            molliePaymentId: molliePayment.id,
            mollieStatus: molliePayment.status,
          },
        },
        {
          where: { uuid: transaction.uuid },
        }
      )

      updatedTransaction = await models.transaction.findOne({
        where: { uuid: transaction.uuid },
      })
    }

    return {
      success: true,
      data: {
        transactionId: updatedTransaction.uuid,
        status: updatedTransaction.status,
        amount: updatedTransaction.amount,
        currency: updatedTransaction.metadata?.currency || 'EUR',
        paymentMethod: molliePayment.method || 'unknown',
        paidAt: molliePayment.status === 'paid' ? molliePayment.createdAt : null,
      },
    }
  } catch (error) {
    console.error('Mollie payment verification error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to verify Mollie payment',
    })
  }
} 