import { models, sequelize } from '@b/db'
import { createError } from '@b/utils/error'
import { sendFiatTransactionEmail } from '@b/utils/emails'
import {
  validatePaysafeConfig,
  makeApiRequest,
  mapPaysafeStatus,
  parsePaysafeAmount,
  PaysafePayment,
  PaysafeError
} from './utils'

export const metadata = {
  summary: 'Verifies a Paysafe payment',
  description: 'Handles return URL verification after payment completion and updates transaction status',
  operationId: 'verifyPaysafePayment',
  tags: ['Finance', 'Deposit', 'Paysafe'],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            payment_handle_token: {
              type: 'string',
              description: 'Payment handle token from Paysafe',
            },
            payment_id: {
              type: 'string',
              description: 'Payment ID from Paysafe (optional)',
            },
            reference: {
              type: 'string',
              description: 'Transaction reference',
            },
            status: {
              type: 'string',
              description: 'Payment status from return URL',
            },
          },
          required: ['payment_handle_token', 'reference'],
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
                  status: { type: 'string' },
                  amount: { type: 'number' },
                  currency: { type: 'string' },
                  gateway_transaction_id: { type: 'string' },
                  message: { type: 'string' },
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
  const { payment_handle_token, payment_id, reference, status } = body

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: 'User not authenticated',
    })
  }

  if (!payment_handle_token || !reference) {
    throw createError({
      statusCode: 400,
      message: 'Payment handle token and reference are required',
    })
  }

  try {
    // Validate Paysafe configuration
    validatePaysafeConfig()

    // Find the transaction
    const transaction = await models.transaction.findOne({
      where: {
        uuid: reference,
        userId: user.id,
        status: 'PENDING',
      },
    })

    if (!transaction) {
      throw createError({
        statusCode: 404,
        message: 'Transaction not found or already processed',
      })
    }

    // Get payment details from Paysafe API
    let paymentDetails: PaysafePayment

    if (payment_id) {
      // If we have a payment ID, get payment directly
      paymentDetails = await makeApiRequest<PaysafePayment>(
        `payments/${payment_id}`,
        { method: 'GET' }
      )
    } else {
      // Get payment using payment handle token
      try {
        paymentDetails = await makeApiRequest<PaysafePayment>(
          `payments?merchantRefNum=${reference}`,
          { method: 'GET' }
        )
        
        // If the response is an array, get the first payment
        if (Array.isArray(paymentDetails)) {
          paymentDetails = paymentDetails[0]
        }
      } catch (error) {
        // If no payment found, the payment might still be in handle state
        console.log('Payment not found, might still be processing:', error.message)
        
        return {
          success: true,
          data: {
            transaction_id: transaction.id,
            status: 'PENDING',
            amount: transaction.amount,
            currency: transaction.metadata?.currency || 'USD',
            message: 'Payment is still being processed',
          },
        }
      }
    }

    if (!paymentDetails) {
      throw createError({
        statusCode: 404,
        message: 'Payment details not found in Paysafe',
      })
    }

    // Verify payment belongs to this transaction
    if (paymentDetails.merchantRefNum !== reference) {
      throw createError({
        statusCode: 400,
        message: 'Payment reference mismatch',
      })
    }

    // Map Paysafe status to our internal status
    const mappedStatus = mapPaysafeStatus(paymentDetails.status)
    const paymentAmount = parsePaysafeAmount(paymentDetails.amount, paymentDetails.currencyCode)

    // Start database transaction for atomic updates
    const result = await sequelize.transaction(async (dbTransaction) => {
      // Update transaction status
      await transaction.update(
        {
          status: mappedStatus,
          metadata: {
            ...transaction.metadata,
            paymentId: paymentDetails.id,
            gatewayTransactionId: paymentDetails.gatewayReconciliationId,
            gatewayStatus: paymentDetails.status,
            processedAt: new Date().toISOString(),
            gatewayResponse: paymentDetails.gatewayResponse,
            settlements: paymentDetails.settlements,
          },
        },
        { transaction: dbTransaction }
      )

      // If payment is successful, update user wallet
      if (mappedStatus === 'COMPLETED') {
        const wallet = await models.wallet.findOne({
          where: {
            userId: user.id,
            currency: paymentDetails.currencyCode,
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
              userId: user.id,
              currency: paymentDetails.currencyCode,
              balance: paymentAmount,
              type: 'FIAT',
            },
            { transaction: dbTransaction }
          )
        }

                // Record admin profit from processing fees (if any)
        const gateway = await models.depositGateway.findOne({
          where: { id: 'paysafe' },
        })

        if (gateway) {
              const percentageFee = gateway.getPercentageFee(transaction.currency)
    const fixedFee = gateway.getFixedFee(transaction.currency)
          const totalFee = (paymentAmount * percentageFee / 100) + fixedFee

          if (totalFee > 0) {
            // TODO: Record admin profit - temporarily disabled due to type mismatch
            console.log(`Admin profit would be recorded: ${totalFee} ${paymentDetails.currencyCode}`)
          }
        }

        // Send confirmation email
        try {
          const updatedWallet = await models.wallet.findOne({
            where: {
              userId: user.id,
              currency: paymentDetails.currencyCode,
            },
          })
          
          await sendFiatTransactionEmail(
            user,
            transaction,
            paymentDetails.currencyCode,
            updatedWallet?.balance || paymentAmount
          )
        } catch (emailError) {
          console.error('Failed to send confirmation email:', emailError)
          // Don't fail the transaction if email fails
        }
      }

      return {
        transaction_id: transaction.id,
        status: mappedStatus,
        amount: paymentAmount,
        currency: paymentDetails.currencyCode,
        gateway_transaction_id: paymentDetails.id,
        gateway_reconciliation_id: paymentDetails.gatewayReconciliationId,
        processor: paymentDetails.gatewayResponse?.processor,
        message: getStatusMessage(mappedStatus),
      }
    })

    return {
      success: true,
      data: result,
    }

  } catch (error) {
    console.error('Paysafe payment verification error:', error)
    
    if (error instanceof PaysafeError) {
      throw createError({
        statusCode: error.status,
        message: `Paysafe Error: ${error.message}`,
      })
    }
    
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to verify Paysafe payment',
    })
  }
}

function getStatusMessage(status: string): string {
  switch (status) {
    case 'COMPLETED':
      return 'Payment completed successfully'
    case 'PENDING':
      return 'Payment is being processed'
    case 'FAILED':
      return 'Payment failed'
    case 'CANCELLED':
      return 'Payment was cancelled'
    case 'EXPIRED':
      return 'Payment session expired'
    case 'REFUNDED':
      return 'Payment has been refunded'
    case 'CHARGEBACK':
      return 'Payment has been charged back'
    default:
      return 'Payment status unknown'
  }
} 