import { models } from '@b/db'
import { createError } from '@b/utils/error'
import { sendFiatTransactionEmail } from '@b/utils/emails'
import {
  validatePaytmConfig,
  verifyChecksumHash,
  makePaytmRequest,
  mapPaytmStatus,
  parsePaytmAmount,
  PaytmVerifyResponse,
  PaytmError,
  PAYTM_CONFIG
} from './utils'

export const metadata = {
  summary: 'Verifies a Paytm payment',
  description: 'Handles return URL verification after payment completion and updates transaction status',
  operationId: 'verifyPaytmPayment',
  tags: ['Finance', 'Deposit', 'Paytm'],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            orderId: {
              type: 'string',
              description: 'Paytm order ID',
            },
            txnId: {
              type: 'string',
              description: 'Paytm transaction ID',
            },
            checksumHash: {
              type: 'string',
              description: 'Checksum hash for verification',
            },
            status: {
              type: 'string',
              description: 'Transaction status from Paytm',
            },
          },
          required: ['orderId'],
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
                  order_id: { type: 'string' },
                  txn_id: { type: 'string' },
                  status: { type: 'string' },
                  amount: { type: 'number' },
                  currency: { type: 'string' },
                  gateway: { type: 'string' },
                  payment_mode: { type: 'string' },
                  bank_name: { type: 'string' },
                  verified_at: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    400: {
      description: 'Bad request - Invalid parameters or verification failed',
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
  const { orderId, txnId, checksumHash, status } = body

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: 'User not authenticated',
    })
  }

  if (!orderId) {
    throw createError({
      statusCode: 400,
      message: 'Order ID is required',
    })
  }

  try {
    // Validate Paytm configuration
    validatePaytmConfig()

    // Find the transaction
    const transaction = await models.transaction.findOne({
      where: {
        uuid: orderId,
        userId: user.id,
        type: 'DEPOSIT',
      },
    })

    if (!transaction) {
      throw createError({
        statusCode: 404,
        message: 'Transaction not found',
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

    // Skip verification if already completed
    if (transaction.status === 'COMPLETED') {
      return {
        success: true,
        data: {
          transaction_id: transaction.uuid,
          order_id: orderId,
          txn_id: metadata.txnId || '',
          status: 'COMPLETED',
          amount: transaction.amount,
          currency: metadata.currency || 'INR',
          gateway: 'paytm',
          payment_mode: metadata.paymentMode || '',
          bank_name: metadata.bankName || '',
          verified_at: transaction.updatedAt,
        },
      }
    }

    // Verify checksum if provided
    if (checksumHash) {
      const { checksumHash: hash, ...paramsWithoutChecksum } = body
      const isValidChecksum = verifyChecksumHash(paramsWithoutChecksum, checksumHash, PAYTM_CONFIG.MERCHANT_KEY)
      
      if (!isValidChecksum) {
        throw createError({
          statusCode: 400,
          message: 'Invalid checksum verification',
        })
      }
    }

    // Verify payment status with Paytm API
    const verifyRequest = {
      body: {
        mid: PAYTM_CONFIG.MID,
        orderId: orderId,
      }
    }

    // Generate checksum for verification request
    const verifyChecksum = verifyChecksumHash(verifyRequest.body, '', PAYTM_CONFIG.MERCHANT_KEY)
    verifyRequest.body['checksumHash'] = verifyChecksum

    const verifyResponse = await makePaytmRequest<PaytmVerifyResponse>(
      '/merchant-status/api/v1/getPaymentStatus',
      {
        method: 'POST',
        body: verifyRequest,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    const paytmStatus = verifyResponse.body.resultInfo.resultStatus
    const mappedStatus = mapPaytmStatus(paytmStatus)
    const txnAmount = parsePaytmAmount(verifyResponse.body.txnAmount || '0', metadata.currency || 'INR')

    // Update transaction status
    await transaction.update({
      status: mappedStatus,
      referenceId: verifyResponse.body.txnId || transaction.referenceId,
      metadata: JSON.stringify({
        ...metadata,
        txnId: verifyResponse.body.txnId,
        bankTxnId: verifyResponse.body.bankTxnId,
        paymentMode: verifyResponse.body.paymentMode,
        bankName: verifyResponse.body.bankName,
        gatewayName: verifyResponse.body.gatewayName,
        paytmVerifyResponse: verifyResponse.body,
        verifiedAt: new Date().toISOString(),
      }),
    })

    // If payment successful, update user wallet
    if (mappedStatus === 'COMPLETED') {
      const wallet = await models.wallet.findOne({
        where: {
          userId: user.id,
          currency: metadata.currency || 'INR',
          type: 'FIAT',
        },
      })

      if (wallet) {
        const newBalance = parseFloat(wallet.balance) + txnAmount
        await wallet.update({ balance: newBalance.toString() })

                 // Send confirmation email
         try {
           await sendFiatTransactionEmail(user, transaction, metadata.currency || 'INR', newBalance)
         } catch (emailError) {
           console.error('Failed to send confirmation email:', emailError)
         }
      }
    }

    return {
      success: true,
      data: {
        transaction_id: transaction.uuid,
        order_id: orderId,
        txn_id: verifyResponse.body.txnId || '',
        status: mappedStatus,
        amount: txnAmount,
        currency: metadata.currency || 'INR',
        gateway: 'paytm',
        payment_mode: verifyResponse.body.paymentMode || '',
        bank_name: verifyResponse.body.bankName || '',
        gateway_name: verifyResponse.body.gatewayName || '',
        bank_txn_id: verifyResponse.body.bankTxnId || '',
        verified_at: new Date().toISOString(),
      },
    }
  } catch (error) {
    if (error instanceof PaytmError) {
      throw createError({
        statusCode: error.status,
        message: error.message,
      })
    }

    throw createError({
      statusCode: 500,
      message: 'Failed to verify Paytm payment',
    })
  }
} 