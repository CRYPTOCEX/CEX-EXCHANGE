import { models, sequelize } from '@b/db'
import { createError } from '@b/utils/error'
import { sendFiatTransactionEmail } from '@b/utils/emails'
import {
  validatePayUConfig,
  verifyPayUHash,
  makePayURequest,
  mapPayUStatus,
  parsePayUAmount,
  PayUVerifyResponse,
  PayUError,
  PAYU_CONFIG
} from './utils'

export const metadata = {
  summary: 'Verifies a PayU payment',
  description: 'Handles return URL verification after payment completion and updates transaction status',
  operationId: 'verifyPayUPayment',
  tags: ['Finance', 'Deposit', 'PayU'],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            txnid: {
              type: 'string',
              description: 'PayU transaction ID',
            },
            mihpayid: {
              type: 'string',
              description: 'PayU internal payment ID',
            },
            status: {
              type: 'string',
              description: 'Transaction status from PayU',
            },
            hash: {
              type: 'string',
              description: 'Hash for verification',
            },
            amount: {
              type: 'string',
              description: 'Transaction amount',
            },
            productinfo: {
              type: 'string',
              description: 'Product information',
            },
            firstname: {
              type: 'string',
              description: 'Customer first name',
            },
            email: {
              type: 'string',
              description: 'Customer email',
            },
            udf1: { type: 'string' },
            udf2: { type: 'string' },
            udf3: { type: 'string' },
            udf4: { type: 'string' },
            udf5: { type: 'string' },
            mode: {
              type: 'string',
              description: 'Payment mode used',
            },
            bankcode: {
              type: 'string',
              description: 'Bank code',
            },
            bank_ref_num: {
              type: 'string',
              description: 'Bank reference number',
            },
            error: {
              type: 'string',
              description: 'Error message if any',
            },
            error_Message: {
              type: 'string',
              description: 'Detailed error message',
            },
          },
          required: ['txnid'],
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Payment verified successfully',
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
                  mihpayid: { type: 'string' },
                  status: { type: 'string' },
                  amount: { type: 'number' },
                  currency: { type: 'string' },
                  gateway: { type: 'string' },
                  payment_mode: { type: 'string' },
                  bank_name: { type: 'string' },
                  bank_ref_num: { type: 'string' },
                  verified_at: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    400: {
      description: 'Bad request - Invalid verification data',
    },
    401: {
      description: 'Unauthorized - User not authenticated',
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
  const { txnid, mihpayid, status, hash, amount, productinfo, firstname, email, udf1, udf2, udf3, udf4, udf5, mode, bankcode, bank_ref_num, error, error_Message } = body

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: 'User not authenticated',
    })
  }

  if (!txnid) {
    throw createError({
      statusCode: 400,
      message: 'Transaction ID is required',
    })
  }

  try {
    // Validate PayU configuration
    validatePayUConfig()

    // Find the transaction
    const transaction = await models.transaction.findOne({
      where: {
        uuid: txnid,
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
    
    if (metadata.gateway !== 'payu') {
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
          mihpayid: mihpayid || metadata.mihpayid || '',
          status: 'COMPLETED',
          amount: transaction.amount,
          currency: metadata.currency || 'INR',
          gateway: 'payu',
          payment_mode: metadata.paymentMode || mode || '',
          bank_name: metadata.bankName || '',
          bank_ref_num: metadata.bankRefNum || bank_ref_num || '',
          verified_at: transaction.updatedAt,
        },
      }
    }

    // Verify hash if provided
    if (hash && status && amount && productinfo && firstname && email) {
      const verificationParams = {
        key: PAYU_CONFIG.MERCHANT_KEY,
        txnid: txnid,
        amount: amount,
        productinfo: productinfo,
        firstname: firstname,
        email: email,
        status: status,
        udf1: udf1 || '',
        udf2: udf2 || '',
        udf3: udf3 || '',
        udf4: udf4 || '',
        udf5: udf5 || '',
      }

      const isValidHash = verifyPayUHash(verificationParams, hash, PAYU_CONFIG.MERCHANT_SALT)
      
      if (!isValidHash) {
        throw createError({
          statusCode: 400,
          message: 'Invalid hash verification',
        })
      }
    }

    // Verify payment status with PayU API
    const verifyRequest = {
      key: PAYU_CONFIG.MERCHANT_KEY,
      command: 'verify_payment',
      var1: txnid,
      hash: '', // Will be generated
    }

    // Generate hash for verification request
    const verifyHashString = `${PAYU_CONFIG.MERCHANT_KEY}|verify_payment|${txnid}|${PAYU_CONFIG.MERCHANT_SALT}`
    verifyRequest.hash = require('crypto').createHash('sha512').update(verifyHashString).digest('hex')

    const verifyResponse = await makePayURequest<PayUVerifyResponse>(
      '/merchant/postservice.php?form=2',
      {
        method: 'POST',
        body: verifyRequest,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    if (verifyResponse.status !== 1) {
      throw createError({
        statusCode: 400,
        message: verifyResponse.message || 'Payment verification failed',
      })
    }

    // Get transaction details from response
    const transactionDetails = verifyResponse.transaction_details[txnid]
    if (!transactionDetails) {
      throw createError({
        statusCode: 404,
        message: 'Transaction details not found in PayU response',
      })
    }

    const payuStatus = transactionDetails.status
    const mappedStatus = mapPayUStatus(payuStatus)
    const txnAmount = parsePayUAmount(transactionDetails.amt || amount || '0', metadata.currency || 'INR')

    // Start database transaction for atomic updates
    const dbTransaction = await sequelize.transaction()

    try {
      // Update transaction status and metadata
      await transaction.update(
        {
          status: mappedStatus,
          referenceId: mihpayid || transactionDetails.mihpayid || transaction.referenceId,
          metadata: JSON.stringify({
            ...metadata,
            mihpayid: mihpayid || transactionDetails.mihpayid,
            bankRefNum: bank_ref_num || transactionDetails.bank_ref_num,
            paymentMode: mode || transactionDetails.mode,
            bankCode: bankcode || transactionDetails.bankcode,
            bankName: transactionDetails.bank_name,
            cardType: transactionDetails.card_type,
            nameOnCard: transactionDetails.name_on_card,
            cardNum: transactionDetails.cardnum,
            paymentSource: transactionDetails.payment_source,
            error: error || transactionDetails.error,
            errorMessage: error_Message || transactionDetails.error_Message,
            payuVerifyResponse: transactionDetails,
            verifiedAt: new Date().toISOString(),
          }),
        },
        { transaction: dbTransaction }
      )

      // Update wallet balance if payment is successful
      if (mappedStatus === 'COMPLETED') {
        const wallet = await models.wallet.findOne({
          where: {
            userId: user.id,
            currency: metadata.currency || 'USD',
          },
          transaction: dbTransaction,
        })

        if (wallet) {
          await wallet.update(
            {
              balance: parseFloat(wallet.balance) + txnAmount,
            },
            { transaction: dbTransaction }
          )
        } else {
          await models.wallet.create(
            {
              userId: user.id,
              type: 'FIAT',
              currency: metadata.currency || 'USD',
              balance: txnAmount,
            },
            { transaction: dbTransaction }
          )
        }

        // Send confirmation email
        const newBalance = wallet ? parseFloat(wallet.balance) + txnAmount : txnAmount
        await sendFiatTransactionEmail(user, transaction, metadata.currency || 'USD', newBalance)
      }

      await dbTransaction.commit()

      return {
        success: true,
        data: {
          transaction_id: transaction.uuid,
          mihpayid: mihpayid || transactionDetails.mihpayid || '',
          status: mappedStatus,
          amount: transaction.amount,
          currency: metadata.currency || 'INR',
          gateway: 'payu',
          payment_mode: mode || transactionDetails.mode || '',
          bank_name: transactionDetails.bank_name || '',
          bank_ref_num: bank_ref_num || transactionDetails.bank_ref_num || '',
          card_type: transactionDetails.card_type || '',
          name_on_card: transactionDetails.name_on_card || '',
          payment_source: transactionDetails.payment_source || '',
          error: error || transactionDetails.error || '',
          error_message: error_Message || transactionDetails.error_Message || '',
          verified_at: new Date().toISOString(),
        },
      }
    } catch (dbError) {
      await dbTransaction.rollback()
      throw dbError
    }
  } catch (error) {
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Payment verification failed',
    })
  }
} 