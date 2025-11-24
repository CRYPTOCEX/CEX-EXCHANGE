import { models, sequelize } from '@b/db'
import { createError } from '@b/utils/error'
import { sendFiatTransactionEmail } from '@b/utils/emails'
import {
  validatePaystackConfig,
  makePaystackRequest,
  mapPaystackStatus,
  parsePaystackAmount,
  PaystackVerifyResponse,
  PaystackError
} from './utils'

export const metadata = {
  summary: 'Verifies a Paystack payment',
  description: 'Verifies payment status with Paystack and updates transaction records',
  operationId: 'verifyPaystackPayment',
  tags: ['Finance', 'Deposit', 'Paystack'],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            reference: {
              type: 'string',
              description: 'Payment reference from Paystack',
            },
            trxref: {
              type: 'string',
              description: 'Transaction reference (alternative parameter name)',
            },
          },
          anyOf: [
            { required: ['reference'] },
            { required: ['trxref'] }
          ],
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
                  transaction_id: { type: 'string' },
                  reference: { type: 'string' },
                  status: { type: 'string' },
                  amount: { type: 'number' },
                  currency: { type: 'string' },
                  gateway: { type: 'string' },
                  gateway_response: { type: 'string' },
                  paid_at: { type: 'string' },
                  channel: { type: 'string' },
                  fees: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    400: {
      description: 'Bad request - Invalid parameters',
    },
    401: {
      description: 'Unauthorized',
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
  const { user, body } = data
  const { reference, trxref } = body

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: 'User not authenticated',
    })
  }

  const paymentReference = reference || trxref
  if (!paymentReference) {
    throw createError({
      statusCode: 400,
      message: 'Payment reference is required',
    })
  }

  try {
    // Validate Paystack configuration
    validatePaystackConfig()

    // Find the transaction
    const transaction = await models.transaction.findOne({
      where: {
        id: paymentReference,
        userId: user.id,
      },
    })

    if (!transaction) {
      throw createError({
        statusCode: 404,
        message: 'Transaction not found',
      })
    }

    // Check if transaction is already completed
    if (transaction.status === 'COMPLETED') {
      return {
        success: true,
        data: {
          transaction_id: transaction.id,
          reference: paymentReference,
          status: 'COMPLETED',
          amount: transaction.amount,
          currency: transaction.currency,
          gateway: 'paystack',
          gateway_response: 'Already completed',
          paid_at: transaction.updatedAt,
          channel: 'unknown',
          fees: transaction.fee || 0,
        },
      }
    }

    // Verify payment with Paystack
    const verifyResponse = await makePaystackRequest<PaystackVerifyResponse>(
      `/transaction/verify/${paymentReference}`,
      {
        method: 'GET',
      }
    )

    if (!verifyResponse.status || !verifyResponse.data) {
      throw createError({
        statusCode: 400,
        message: verifyResponse.message || 'Failed to verify payment with Paystack',
      })
    }

    const paystackTransaction = verifyResponse.data
    const newStatus = mapPaystackStatus(paystackTransaction.status)
    const actualAmount = parsePaystackAmount(paystackTransaction.amount, paystackTransaction.currency)
    const gatewayFees = parsePaystackAmount(paystackTransaction.fees || 0, paystackTransaction.currency)

    // Validate transaction details
    if (Math.abs(actualAmount - transaction.amount) > 0.01) {
      throw createError({
        statusCode: 400,
        message: 'Transaction amount mismatch',
      })
    }

    if (paystackTransaction.currency !== transaction.currency) {
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
          referenceId: paystackTransaction.reference,
          fee: gatewayFees,
          metadata: JSON.stringify({
            ...JSON.parse(transaction.metadata || '{}'),
            paystack_transaction_id: paystackTransaction.id,
            paystack_status: paystackTransaction.status,
            gateway_response: paystackTransaction.gateway_response,
            paid_at: paystackTransaction.paid_at,
            channel: paystackTransaction.channel,
            authorization: paystackTransaction.authorization,
            customer: paystackTransaction.customer,
            fees_breakdown: paystackTransaction.fees_breakdown,
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
      }

      // Commit the database transaction
      await dbTransaction.commit()

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
        } catch (emailError) {
          console.error('Failed to send confirmation email:', emailError)
          // Don't fail the transaction if email fails
        }
      }

      return {
        success: true,
        data: {
          transaction_id: transaction.id,
          reference: paymentReference,
          status: newStatus,
          amount: actualAmount,
          currency: paystackTransaction.currency,
          gateway: 'paystack',
          gateway_response: paystackTransaction.gateway_response,
          paid_at: paystackTransaction.paid_at,
          channel: paystackTransaction.channel,
          fees: gatewayFees,
        },
      }

    } catch (dbError) {
      await dbTransaction.rollback()
      throw dbError
    }

  } catch (error) {
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
      message: 'Failed to verify Paystack payment',
    })
  }
} 