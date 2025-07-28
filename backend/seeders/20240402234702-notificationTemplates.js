"use strict";

const notificationTemplates = [
  {
    id: 1,
    name: "EmailVerification",
    subject: "Please verify your email",
    emailBody: `<p>Dear %FIRSTNAME%,</p>
      <p>You recently created an account at %URL% on %CREATED_AT%. Please verify your email to continue with your account.</p>
      <p>Your verification code is: <strong>%TOKEN%</strong></p>
      <p>Alternatively, you can click the following link to verify your email:</p>
      <p><a href="%URL%/login?token=%TOKEN%" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Verify Email Address</a></p>
      <p>This verification link will expire in 5 minutes for security reasons.</p>
      <p>If you did not create an account, please disregard this email.</p>`,
    shortCodes: ["FIRSTNAME", "CREATED_AT", "TOKEN"],
    email: true,
  },
  {
    id: 2,
    name: "PasswordReset",
    subject: "Password Reset Request",
    emailBody:
      "<p>Dear %FIRSTNAME%,</p><p>You requested to reset your password. Please follow the link below. If you did not request to reset your password, disregard this email. Your last login time was: %LAST_LOGIN%.</p><p>This is a one-time password link that will reveal a temporary password.</p><p>Password reset link: %URL%/reset?token=%TOKEN%</p>",
    shortCodes: ["FIRSTNAME", "LAST_LOGIN", "TOKEN"],
    email: true,
  },
  {
    id: 3,
    name: "EmailTest",
    subject: "Email System Test",
    emailBody:
      "<p>Dear %FIRSTNAME%,</p><p>Your email system at %URL% is working as expected. This test email was sent on %TIME%.</p><p>If you did not expect this email, please contact support.</p>",
    shortCodes: ["FIRSTNAME", "TIME"],
    email: true,
  },
  {
    id: 4,
    name: "KycSubmission",
    subject: "KYC Submission Confirmation",
    emailBody:
      "<p>Dear %FIRSTNAME%,</p><p>Thank you for submitting your KYC application on %CREATED_AT%. Your application is now under review.</p><p>Level: %LEVEL%</p><p>Status: %STATUS%</p>",
    shortCodes: ["FIRSTNAME", "CREATED_AT", "LEVEL", "STATUS"],
    email: true,
  },
  {
    id: 5,
    name: "KycUpdate",
    subject: "KYC Update Confirmation",
    emailBody:
      "<p>Dear %FIRSTNAME%,</p><p>Your KYC application has been updated on %UPDATED_AT%. It is now under review again.</p><p>Updated Level: %LEVEL%</p><p>Status: %STATUS%</p>",
    shortCodes: ["FIRSTNAME", "UPDATED_AT", "LEVEL", "STATUS"],
    email: true,
  },
  {
    id: 6,
    name: "KycApproved",
    subject: "Your KYC Application has been Approved",
    emailBody:
      "<p>Dear %FIRSTNAME%,</p><p>Your KYC application submitted on %UPDATED_AT% has been approved.</p><p>Your current level is: %LEVEL%</p><p>Thank you for your cooperation.</p><p>Best regards,</p><p> YourSupport Team</p>",
    shortCodes: ["FIRSTNAME", "UPDATED_AT", "LEVEL"],
    email: true,
  },
  {
    id: 7,
    name: "KycRejected",
    subject: "Your KYC Application has been Rejected",
    emailBody:
      "<p>Dear %FIRSTNAME%,</p><p>Unfortunately, your KYC application submitted on %UPDATED_AT% has been rejected.</p><p>Reason: %MESSAGE%</p><p>Please contact our support team for more information.</p><p>Best regards,</p><p>Your Support Team</p>",
    shortCodes: ["FIRSTNAME", "UPDATED_AT", "MESSAGE", "LEVEL"],
    email: true,
  },
  {
    id: 8,
    name: "NewInvestmentCreated",
    subject: "New Investment Created",
    emailBody:
      "<p>Dear %FIRSTNAME%,</p><p>You have successfully created a new investment in the %PLAN_NAME% plan.</p><p>Amount Invested: %AMOUNT%</p><p>Duration: %DURATION% %TIMEFRAME%</p><p>Status: %STATUS%</p>",
    shortCodes: [
      "FIRSTNAME",
      "PLAN_NAME",
      "AMOUNT",
      "DURATION",
      "TIMEFRAME",
      "STATUS",
    ],
    email: true,
  },
  {
    id: 9,
    name: "InvestmentUpdated",
    subject: "Investment Updated",
    emailBody:
      "<p>Dear %FIRSTNAME%,</p><p>Your investment in the %PLAN_NAME% plan has been updated.</p><p>Amount: %AMOUNT% %CURRENCY%</p><p>Status: %STATUS%</p>",
    shortCodes: ["FIRSTNAME", "PLAN_NAME", "AMOUNT", "CURRENCY", "STATUS"],
    email: true,
  },
  {
    id: 10,
    name: "InvestmentCanceled",
    subject: "Investment Canceled",
    emailBody:
      "<p>Dear %FIRSTNAME%,</p><p>Your investment in the %PLAN_NAME% plan has been canceled.</p><p>Amount Returned: %AMOUNT% %CURRENCY%</p><p>Status: %STATUS%</p>",
    shortCodes: ["FIRSTNAME", "PLAN_NAME", "AMOUNT", "CURRENCY", "STATUS"],
    email: true,
  },
  {
    id: 11,
    name: "UserMessage",
    subject: "New Message From Support",
    emailBody:
      "<p>Dear %RECEIVER_NAME%,</p><p>You have a new message from our support team regarding ticket ID: %TICKET_ID%.</p><p>Message:</p><p>%MESSAGE%</p><p>Best regards,</p><p>Your Support Team</p>",
    shortCodes: ["RECEIVER_NAME", "TICKET_ID", "MESSAGE"],
    email: true,
  },
  {
    id: 12,
    name: "SupportMessage",
    subject: "New User Message",
    emailBody:
      "<p>Dear %RECEIVER_NAME%,</p><p>You have a new message from %SENDER_NAME% regarding ticket ID: %TICKET_ID%.</p><p>Message:</p><p>%MESSAGE%</p><p>Best regards,</p><p>Your Support Team</p>",
    shortCodes: ["RECEIVER_NAME", "SENDER_NAME", "TICKET_ID", "MESSAGE"],
    email: true,
  },
  {
    id: 13,
    name: "FiatWalletTransaction",
    subject: "Transaction Alert: %TRANSACTION_TYPE%",
    emailBody:
      "<p>Dear %FIRSTNAME%,</p><p>You have recently made a %TRANSACTION_TYPE% transaction.</p><p>Details:</p><ul><li>Transaction ID: %TRANSACTION_ID%</li><li>Amount: %AMOUNT% %CURRENCY%</li><li>Status: %TRANSACTION_STATUS%</li><li>Current Wallet Balance: %NEW_BALANCE% %CURRENCY%</li><li>Description: %DESCRIPTION%</li></ul><p>Best regards,</p><p>Your Support Team</p>",
    shortCodes: [
      "FIRSTNAME",
      "TRANSACTION_TYPE",
      "TRANSACTION_ID",
      "AMOUNT",
      "CURRENCY",
      "TRANSACTION_STATUS",
      "NEW_BALANCE",
      "DESCRIPTION",
    ],
    email: true,
  },
  {
    id: 14,
    name: "BinaryOrderResult",
    subject: "Binary Order Result: %RESULT%",
    emailBody:
      "<p>Dear %FIRSTNAME%,</p><p>Here is the outcome of your recent binary order (ID: %ORDER_ID%).</p><p><strong>Order Details:</strong></p><ul>  <li><strong>Market:</strong> %MARKET%</li>  <li><strong>Amount:</strong> %AMOUNT% %CURRENCY%</li>  <li><strong>Entry Price:</strong> %ENTRY_PRICE%</li>  <li><strong>Closed at Price:</strong> %CLOSE_PRICE%</li></ul><p><strong>Order Outcome:</strong></p><ul>  <li><strong>Result:</strong> %RESULT%</li>  <li><strong>Profit/Loss:</strong> %PROFIT% %CURRENCY%</li>  <li><strong>Side:</strong> %SIDE%</li></ul><p>Thank you for using our platform.</p><p>Best regards,</p><p>Your Support Team</p>",
    shortCodes: [
      "FIRSTNAME",
      "ORDER_ID",
      "RESULT",
      "MARKET",
      "AMOUNT",
      "PROFIT",
      "SIDE",
      "CURRENCY",
      "ENTRY_PRICE",
      "CLOSE_PRICE",
    ],
    email: true,
  },
  {
    id: 15,
    name: "WalletBalanceUpdate",
    subject: "Wallet Balance Update",
    emailBody:
      "<p>Hello %FIRSTNAME%,</p><p>Your wallet balance has been %ACTION% by an admin.</p><p>Details:</p><ul><li>Action: %ACTION%</li><li>Amount: %AMOUNT% %CURRENCY%</li><li>New Balance: %NEW_BALANCE% %CURRENCY%</li></ul><p>Best regards,</p><p>Your Support Team</p>",
    shortCodes: ["FIRSTNAME", "ACTION", "AMOUNT", "CURRENCY", "NEW_BALANCE"],
    email: true,
  },
  {
    id: 16,
    name: "TransactionStatusUpdate",
    subject: "Transaction Status Update: %TRANSACTION_TYPE%",
    emailBody:
      "<p>Hello %FIRSTNAME%,</p><p>Your transaction of type %TRANSACTION_TYPE% has been updated.</p><p>Details:</p><ul><li>Transaction ID: %TRANSACTION_ID%</li><li>Status: %TRANSACTION_STATUS%</li><li>Amount: %AMOUNT% %CURRENCY%</li><li>Updated Balance: %NEW_BALANCE% %CURRENCY%</li><li>Note: %NOTE%</li></ul><p>Best regards,</p><p>Your Support Team</p>",
    shortCodes: [
      "FIRSTNAME",
      "TRANSACTION_TYPE",
      "TRANSACTION_ID",
      "TRANSACTION_STATUS",
      "AMOUNT",
      "CURRENCY",
      "NEW_BALANCE",
      "NOTE",
    ],
    email: true,
  },
  {
    id: 17,
    name: "AuthorStatusUpdate",
    subject: "Author Application Status: %AUTHOR_STATUS%",
    emailBody:
      "<p>Hello %FIRSTNAME%,</p><p>Your application to join our Authorship Program has been %AUTHOR_STATUS%.</p><p>Details:</p><ul><li>Application ID: %APPLICATION_ID%</li><li>Status: %AUTHOR_STATUS%</li></ul><p>Best regards,</p><p>Your Support Team</p>",
    shortCodes: ["FIRSTNAME", "AUTHOR_STATUS", "APPLICATION_ID"],
    email: true,
  },
  {
    id: 18,
    name: "OutgoingWalletTransfer",
    subject: "Outgoing Wallet Transfer Confirmation",
    emailBody:
      "<p>Hello %FIRSTNAME%,</p><p>You have successfully transferred %AMOUNT% %CURRENCY% to %RECIPIENT_NAME%.</p><p>Your new balance: %NEW_BALANCE% %CURRENCY%</p><p>Transaction ID: %TRANSACTION_ID%</p>",
    shortCodes: [
      "FIRSTNAME",
      "AMOUNT",
      "CURRENCY",
      "NEW_BALANCE",
      "TRANSACTION_ID",
      "RECIPIENT_NAME",
    ],
    email: true,
  },
  {
    id: 19,
    name: "IncomingWalletTransfer",
    subject: "Incoming Wallet Transfer Confirmation",
    emailBody:
      "<p>Hello %FIRSTNAME%,</p><p>You have received %AMOUNT% %CURRENCY% from %SENDER_NAME%.</p><p>Your new balance: %NEW_BALANCE% %CURRENCY%</p><p>Transaction ID: %TRANSACTION_ID%</p>",
    shortCodes: [
      "FIRSTNAME",
      "AMOUNT",
      "CURRENCY",
      "NEW_BALANCE",
      "TRANSACTION_ID",
      "SENDER_NAME",
    ],
    email: true,
  },
  {
    id: 20,
    name: "SpotWalletWithdrawalConfirmation",
    subject: "Spot Wallet Withdrawal",
    emailBody:
      "<p>Dear %FIRSTNAME%,</p><p>You have successfully initiated a withdrawal from your Spot Wallet.</p><p>Details:</p><ul><li>Amount: %AMOUNT% %CURRENCY%</li><li>Address: %ADDRESS%</li><li>Transaction Fee: %FEE%</li><li>Network Chain: %CHAIN%</li><li>Memo: %MEMO%</li><li>Status: %STATUS%</li></ul><p>If you did not make this request, please contact our support immediately.</p><p>Best regards,</p><p>Your Support Team</p>",
    shortCodes: [
      "FIRSTNAME",
      "AMOUNT",
      "CURRENCY",
      "ADDRESS",
      "FEE",
      "CHAIN",
      "MEMO",
      "STATUS",
    ],
    email: true,
  },
  {
    id: 21,
    name: "SpotWalletDepositConfirmation",
    subject: "Spot Wallet Deposit",
    emailBody:
      "<p>Dear %FIRSTNAME%,</p><p>Your spot wallet deposit has been successfully processed.</p><p>Details:</p><ul><li>Transaction ID: %TRANSACTION_ID%</li><li>Amount: %AMOUNT% %CURRENCY%</li><li>Network Chain: %CHAIN%</li><li>Transaction Fee: %FEE%</li><li>Status: COMPLETED</li></ul><p>If you did not make this deposit, please contact our support immediately.</p><p>Best regards,</p><p>Your Support Team</p>",
    shortCodes: [
      "FIRSTNAME",
      "TRANSACTION_ID",
      "AMOUNT",
      "CURRENCY",
      "CHAIN",
      "FEE",
    ],
    email: true,
  },
  {
    id: 22,
    name: "NewAiInvestmentCreated",
    subject: "New AI Investment Initiated",
    emailBody:
      "<p>Dear %FIRSTNAME%,</p><p>You have successfully created a new AI investment in the %PLAN_NAME% plan.</p><p>Amount Invested: %AMOUNT% %CURRENCY%</p><p>Duration: %DURATION% %TIMEFRAME%</p><p>Status: %STATUS%</p>",
    shortCodes: [
      "FIRSTNAME",
      "PLAN_NAME",
      "AMOUNT",
      "CURRENCY",
      "DURATION",
      "TIMEFRAME",
      "STATUS",
    ],
    email: true,
  },
  {
    id: 23,
    name: "AiInvestmentCompleted",
    subject: "AI Investment Completed",
    emailBody:
      "<p>Dear %FIRSTNAME%,</p><p>Your AI investment in the %PLAN_NAME% plan has been completed.</p><p>Invested Amount: %AMOUNT% %CURRENCY%</p><p>Result: %PROFIT% %CURRENCY%</p><p>Status: %STATUS%</p>",
    shortCodes: [
      "FIRSTNAME",
      "PLAN_NAME",
      "AMOUNT",
      "PROFIT",
      "CURRENCY",
      "STATUS",
    ],
    email: true,
  },
  {
    id: 24,
    name: "AiInvestmentCanceled",
    subject: "AI Investment Canceled",
    emailBody:
      "<p>Dear %FIRSTNAME%,</p><p>Your AI investment in the %PLAN_NAME% plan has been canceled.</p><p>Amount Refunded: %AMOUNT% %CURRENCY%</p><p>Status: %STATUS%</p>",
    shortCodes: ["FIRSTNAME", "PLAN_NAME", "AMOUNT", "CURRENCY", "STATUS"],
    email: true,
  },
  {
    id: 25,
    name: "WithdrawalStatus",
    subject: "Withdrawal Status: %STATUS%",
    emailBody:
      "<p>Dear %FIRSTNAME%,</p><p>Your withdrawal request has been %STATUS%.</p><p>If the withdrawal is canceled, the reason is: %REASON%.</p><p>Transaction ID: %TRANSACTION_ID%</p><p>Amount: %AMOUNT% %CURRENCY%</p><p>Best regards,</p><p>Your Support Team</p>",
    shortCodes: [
      "FIRSTNAME",
      "STATUS",
      "REASON",
      "TRANSACTION_ID",
      "AMOUNT",
      "CURRENCY",
    ],
    email: true,
  },
  {
    id: 26,
    name: "DepositConfirmation",
    subject: "Deposit Confirmation",
    emailBody:
      "<p>Dear %FIRSTNAME%,</p><p>Your deposit has been successfully confirmed.</p><p>Transaction ID: %TRANSACTION_ID%</p><p>Amount: %AMOUNT% %CURRENCY%</p><p>Best regards,</p><p>Your Support Team</p>",
    shortCodes: ["FIRSTNAME", "TRANSACTION_ID", "AMOUNT", "CURRENCY"],
    email: true,
  },
  {
    id: 27,
    name: "TransferConfirmation",
    subject: "Transfer Confirmation",
    emailBody:
      "<p>Dear %FIRSTNAME%,</p><p>Your transfer has been successfully completed.</p><p>Transaction ID: %TRANSACTION_ID%</p><p>Amount: %AMOUNT% %CURRENCY%</p><p>To: %RECIPIENT_NAME%</p><p>Best regards,</p><p>Your Support Team</p>",
    shortCodes: [
      "FIRSTNAME",
      "TRANSACTION_ID",
      "AMOUNT",
      "CURRENCY",
      "RECIPIENT_NAME",
    ],
    email: true,
  },
  {
    id: 28,
    name: "NewForexInvestmentCreated",
    subject: "New Forex Investment Initiated",
    emailBody:
      "<p>Dear %FIRSTNAME%,</p><p>You have successfully created a new Forex investment in the %PLAN_NAME% plan.</p><p>Amount Invested: %AMOUNT%</p><p>Duration: %DURATION% %TIMEFRAME%</p><p>Status: %STATUS%</p>",
    shortCodes: [
      "FIRSTNAME",
      "PLAN_NAME",
      "AMOUNT",
      "DURATION",
      "TIMEFRAME",
      "STATUS",
    ],
    email: true,
  },
  {
    id: 29,
    name: "ForexInvestmentCompleted",
    subject: "Forex Investment Completed",
    emailBody:
      "<p>Dear %FIRSTNAME%,</p><p>Your Forex investment in the %PLAN_NAME% plan has been completed.</p><p>Invested Amount: %AMOUNT%</p><p>Result: %PROFIT%</p><p>Status: %STATUS%</p>",
    shortCodes: ["FIRSTNAME", "PLAN_NAME", "AMOUNT", "PROFIT", "STATUS"],
    email: true,
  },
  {
    id: 30,
    name: "ForexInvestmentCanceled",
    subject: "Forex Investment Canceled",
    emailBody:
      "<p>Dear %FIRSTNAME%,</p><p>Your Forex investment in the %PLAN_NAME% plan has been canceled.</p><p>Amount Refunded: %AMOUNT%</p><p>Status: %STATUS%</p>",
    shortCodes: ["FIRSTNAME", "PLAN_NAME", "AMOUNT", "STATUS"],
    email: true,
  },
  {
    id: 31,
    name: "ForexDepositConfirmation",
    subject: "Forex Deposit Confirmation",
    emailBody:
      "<p>Dear %FIRSTNAME%,</p><p>You have successfully deposited into your Forex account.</p><p>Account ID: %ACCOUNT_ID%</p><p>Transaction ID: %TRANSACTION_ID%</p><p>Amount: %AMOUNT% %CURRENCY%</p><p>Status: %STATUS%</p><p>Best regards,</p><p>Your Support Team</p>",
    shortCodes: [
      "FIRSTNAME",
      "ACCOUNT_ID",
      "TRANSACTION_ID",
      "AMOUNT",
      "CURRENCY",
      "STATUS",
    ],
    email: true,
  },
  {
    id: 32,
    name: "ForexWithdrawalConfirmation",
    subject: "Forex Withdrawal Confirmation",
    emailBody:
      "<p>Dear %FIRSTNAME%,</p><p>You have successfully withdrawn from your Forex account.</p><p>Account ID: %ACCOUNT_ID%</p><p>Transaction ID: %TRANSACTION_ID%</p><p>Amount: %AMOUNT% %CURRENCY%</p><p>Status: %STATUS%</p><p>Best regards,</p><p>Your Support Team</p>",
    shortCodes: [
      "FIRSTNAME",
      "ACCOUNT_ID",
      "TRANSACTION_ID",
      "AMOUNT",
      "CURRENCY",
      "STATUS",
    ],
    email: true,
  },
  {
    id: 33,
    name: "IcoNewContribution",
    subject: "Confirmation of Your ICO Contribution",
    emailBody: `
      <p>Dear %FIRSTNAME%,</p>
      <p>Thank you for your contribution to the %TOKEN_NAME% ICO.</p>
      <p>Details of your contribution:</p>
      <ul>
        <li>Token: %TOKEN_NAME%</li>
        <li>Phase: %PHASE_NAME%</li>
        <li>Amount: %AMOUNT% %CURRENCY%</li>
        <li>Contribution Status: %CONTRIBUTION_STATUS%</li>
        <li>Date: %DATE%</li>
      </ul>
      <p>If you have any questions, please feel free to reach out to us.</p>
      <p>Best regards,</p>
      <p>Your Support Team</p>
    `,
    shortCodes: [
      "FIRSTNAME",
      "TOKEN_NAME",
      "PHASE_NAME",
      "AMOUNT",
      "CURRENCY",
      "CONTRIBUTION_STATUS",
      "DATE",
    ],
    email: true,
  },
  {
    id: 35,
    name: "StakingInitiationConfirmation",
    subject: "Confirmation of Your Staking Initiation",
    emailBody: `
      <p>Dear %FIRSTNAME%,</p>
      <p>Your staking has been successfully initiated.</p>
      <p>Details of your stake:</p>
      <ul>
        <li>Token: %TOKEN_NAME%</li>
        <li>Amount: %STAKE_AMOUNT% %TOKEN_SYMBOL%</li>
        <li>Stake Date: %STAKE_DATE%</li>
        <li>Release Date: %RELEASE_DATE%</li>
        <li>Expected Reward: %EXPECTED_REWARD% %TOKEN_SYMBOL%</li>
      </ul>
      <p>Your funds are now earning rewards!</p>
      <p>If you have any questions, please feel free to reach out to us.</p>
      <p>Best regards,</p>
      <p>Your Support Team</p>
    `,
    shortCodes: [
      "FIRSTNAME",
      "TOKEN_NAME",
      "STAKE_AMOUNT",
      "TOKEN_SYMBOL",
      "STAKE_DATE",
      "RELEASE_DATE",
      "EXPECTED_REWARD",
    ],
    email: true,
  },
  {
    id: 36,
    name: "StakingRewardDistribution",
    subject: "Your Staking Rewards Have Been Distributed",
    emailBody: `
      <p>Dear %FIRSTNAME%,</p>
      <p>We are pleased to inform you that rewards for your staking have been distributed to your account.</p>
      <p>Details of the reward distribution:</p>
      <ul>
        <li>Token: %TOKEN_NAME%</li>
        <li>Reward Amount: %REWARD_AMOUNT% %TOKEN_SYMBOL%</li>
        <li>Distribution Date: %DISTRIBUTION_DATE%</li>
      </ul>
      <p>Thank you for staking with us, and enjoy your earnings!</p>
      <p>If you have any questions or concerns about your rewards, please contact support.</p>
      <p>Best regards,</p>
      <p>Your Support Team</p>
    `,
    shortCodes: [
      "FIRSTNAME",
      "TOKEN_NAME",
      "REWARD_AMOUNT",
      "TOKEN_SYMBOL",
      "DISTRIBUTION_DATE",
    ],
    email: true,
  },
  {
    id: 37,
    name: "OrderConfirmation",
    subject: "Thank You for Your Order!",
    emailBody: `
      <p>Dear %CUSTOMER_NAME%,</p>
      <p>Thank you for shopping with us. Your order has been successfully placed.</p>
      <p>Order Details:</p>
      <ul>
        <li>Order Number: %ORDER_NUMBER%</li>
        <li>Order Date: %ORDER_DATE%</li>
        <li>Total Amount: %ORDER_TOTAL%</li>
      </ul>
      <p>You can track your order status in your account.</p>
      <p>If you have any questions, please contact our customer service team.</p>
      <p>Best regards,</p>
      <p>Your Support Team</p>
    `,
    shortCodes: ["CUSTOMER_NAME", "ORDER_NUMBER", "ORDER_DATE", "ORDER_TOTAL"],
    email: true,
  },
  {
    id: 38,
    name: "OrderStatusUpdate",
    subject: "Update on Your Order - Action Required",
    emailBody: `
      <p>Dear %CUSTOMER_NAME%,</p>
      <p>Your recent order with us (Order No: %ORDER_NUMBER%) has been updated to %ORDER_STATUS%.</p>
      <p>Please find below the details of your purchase:</p>
      <ul>
        %PRODUCT_DETAILS%
      </ul>
      <p>If your order status is 'COMPLETED', your product keys (if applicable) are available and can be accessed through your account or the provided links.</p>
      <p>If you have any questions or require further assistance, please do not hesitate to contact our support team.</p>
      <p>Thank you for choosing our services!</p>
      <p>Best regards,</p>
      <p>Your Support Team</p>
    `,
    shortCodes: [
      "CUSTOMER_NAME",
      "ORDER_NUMBER",
      "ORDER_STATUS",
      "PRODUCT_DETAILS",
    ],
    email: true,
  },
  {
    id: 39,
    name: "P2PTradeSaleConfirmation",
    subject: "Confirmation of Your P2P Trade Sale",
    emailBody:
      "<p>Dear %SELLER_NAME%,</p><p>A trade has been initiated on your offer for %CURRENCY%.</p><p>Trade Details:</p><ul><li>Buyer: %BUYER_NAME%</li><li>Amount: %AMOUNT% %CURRENCY%</li><li>Price: %PRICE%</li><li>Trade ID: %TRADE_ID%</li></ul><p>Please respond to the buyer to proceed with the trade.</p><p>Best regards,</p><p>Your Support Team</p>",
    shortCodes: [
      "SELLER_NAME",
      "BUYER_NAME",
      "CURRENCY",
      "AMOUNT",
      "PRICE",
      "TRADE_ID",
    ],
    email: true,
  },
  {
    id: 40,
    name: "P2PTradeReply",
    subject: "New Message in Your P2P Trade",
    emailBody:
      "<p>Dear %RECEIVER_NAME%,</p><p>You have a new message in your P2P trade with %SENDER_NAME%.</p><p>Trade ID: %TRADE_ID%</p><p>Message:</p><p>%MESSAGE%</p><p>Best regards,</p><p>Your Support Team</p>",
    shortCodes: ["RECEIVER_NAME", "SENDER_NAME", "TRADE_ID", "MESSAGE"],
    email: true,
  },
  {
    id: 41,
    name: "P2PDisputeOpened",
    subject: "Dispute Opened for Your P2P Trade",
    emailBody:
      "<p>Dear %PARTICIPANT_NAME%,</p><p>A dispute has been opened for your trade with %OTHER_PARTY_NAME%.</p><p>Trade ID: %TRADE_ID%</p><p>Dispute Reason:</p><p>%DISPUTE_REASON%</p><p>Our support team will review the dispute and contact you shortly.</p><p>Best regards,</p><p>Your Support Team</p>",
    shortCodes: [
      "PARTICIPANT_NAME",
      "OTHER_PARTY_NAME",
      "TRADE_ID",
      "DISPUTE_REASON",
    ],
    email: true,
  },
  {
    id: 42,
    name: "P2PDisputeResolution",
    subject: "Dispute Resolution Update for Your P2P Trade",
    emailBody:
      "<p>Dear %PARTICIPANT_NAME%,</p><p>The dispute for your trade ID: %TRADE_ID% has a new resolution update.</p><p>Resolution Message:</p><p>%RESOLUTION_MESSAGE%</p><p>Please review the resolution and follow any necessary steps.</p><p>Best regards,</p><p>Your Support Team</p>",
    shortCodes: ["PARTICIPANT_NAME", "TRADE_ID", "RESOLUTION_MESSAGE"],
    email: true,
  },
  {
    id: 43,
    name: "P2PDisputeResolving",
    subject: "Your P2P Trade Dispute is Being Resolved",
    emailBody:
      "<p>Dear %PARTICIPANT_NAME%,</p><p>Your trade dispute for Trade ID: %TRADE_ID% is in the process of being resolved.</p><p>Our team is working diligently to resolve the issue. We appreciate your patience.</p><p>Best regards,</p><p>Your Support Team</p>",
    shortCodes: ["PARTICIPANT_NAME", "TRADE_ID"],
    email: true,
  },
  {
    id: 44,
    name: "P2PDisputeClosing",
    subject: "Closure of Your P2P Trade Dispute",
    emailBody:
      "<p>Dear %PARTICIPANT_NAME%,</p><p>The dispute for your trade ID: %TRADE_ID% has been closed.</p><p>We hope the resolution was satisfactory. If you have any further questions, please contact our support team.</p><p>Best regards,</p><p>Your Support Team</p>",
    shortCodes: ["PARTICIPANT_NAME", "TRADE_ID"],
    email: true,
  },
  {
    id: 45,
    name: "P2PTradeCompletion",
    subject: "Confirmation of Completed P2P Trade",
    emailBody:
      "<p>Dear %SELLER_NAME%,</p><p>Your trade with %BUYER_NAME% for %AMOUNT% %CURRENCY% has been completed successfully.</p><p>Trade ID: %TRADE_ID%</p><p>Thank you for using our P2P platform.</p><p>Best regards,</p><p>Your Support Team</p>",
    shortCodes: ["SELLER_NAME", "BUYER_NAME", "AMOUNT", "CURRENCY", "TRADE_ID"],
    email: true,
  },
  {
    id: 46,
    name: "P2PTradeCancellation",
    subject: "Cancellation of Your P2P Trade",
    emailBody:
      "<p>Dear %PARTICIPANT_NAME%,</p><p>Your trade ID: %TRADE_ID% has been cancelled.</p><p>If you have any questions or concerns, please contact our support team.</p><p>Best regards,</p><p>Your Support Team</p>",
    shortCodes: ["PARTICIPANT_NAME", "TRADE_ID"],
    email: true,
  },
  {
    id: 47,
    name: "P2PTradePaymentConfirmation",
    subject: "Payment Confirmation for Your P2P Trade",
    emailBody:
      "<p>Dear %SELLER_NAME%,</p><p>%BUYER_NAME% has marked the trade ID: %TRADE_ID% as paid.</p><p>Transaction ID: %TRANSACTION_ID%</p><p>Please confirm the payment on your end to complete the trade.</p><p>Best regards,</p><p>Your Support Team</p>",
    shortCodes: ["SELLER_NAME", "BUYER_NAME", "TRADE_ID", "TRANSACTION_ID"],
    email: true,
  },
  {
    id: 48,
    name: "P2PReviewNotification",
    subject: "New Review for Your P2P Offer",
    emailBody:
      "<p>Dear %SELLER_NAME%,</p><p>You have received a new review for your offer ID: %OFFER_ID%.</p><p>Reviewer: %REVIEWER_NAME%</p><p>Rating: %RATING%</p><p>Comment: %COMMENT%</p><p>Thank you for providing a quality service on our platform.</p><p>Best regards,</p><p>Your Support Team</p>",
    shortCodes: [
      "SELLER_NAME",
      "OFFER_ID",
      "REVIEWER_NAME",
      "RATING",
      "COMMENT",
    ],
    email: true,
  },
  {
    id: 49,
    name: "P2POfferAmountDepletion",
    subject: "Notification of Offer Amount Depletion",
    emailBody:
      "<p>Dear %SELLER_NAME%,</p><p>The available amount for your offer ID: %OFFER_ID% is running low.</p><p>Current Amount: %CURRENT_AMOUNT% %CURRENCY%</p><p>Consider updating your offer to continue trading.</p><p>Best regards,</p><p>Your Support Team</p>",
    shortCodes: ["SELLER_NAME", "OFFER_ID", "CURRENT_AMOUNT", "CURRENCY"],
    email: true,
  },
  {
    id: 50,
    name: "OTPTokenVerification",
    subject: "Your Two-Factor Authentication Code",
    emailBody: `<p>Dear %FIRSTNAME%,</p>
      <p>Your two-factor authentication code is:</p>
      <div style="text-align: center; margin: 20px 0;">
        <div style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 25px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 3px;">
          %TOKEN%
        </div>
      </div>
      <p>This code will expire in <strong>5 minutes</strong> for security reasons.</p>
      <p>If you did not request this code, please contact our support team immediately.</p>
      <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #0c4a6e; font-size: 14px;">
          <strong>Security Tip:</strong> Never share this code with anyone. Our team will never ask for your authentication codes.
        </p>
      </div>`,
    shortCodes: ["FIRSTNAME", "TOKEN"],
    email: true,
  },
  {
    id: 51,
    name: "LiquidationWarning",
    subject: "Warning: Position at Risk of Liquidation",
    emailBody: `<p>Dear %FIRSTNAME%,</p>
      <p>Your position in %SYMBOL% is at risk of liquidation.</p>
      <p>Current Margin: %MARGIN%</p>
      <p>Leverage: %LEVERAGE%</p>
      <p>Entry Price: %ENTRY_PRICE%</p>
      <p>Current Price: %CURRENT_PRICE%</p>
      <p>Please take action to manage your position.</p>
      <p>Best regards,</p>
      <p>Your Support Team</p>`,
    shortCodes: [
      "FIRSTNAME",
      "SYMBOL",
      "MARGIN",
      "LEVERAGE",
      "ENTRY_PRICE",
      "CURRENT_PRICE",
    ],
    email: true,
  },
  {
    id: 52,
    name: "LiquidationNotification",
    subject: "Notification: Position Liquidated",
    emailBody: `<p>Dear %FIRSTNAME%,</p>
      <p>Your position in %SYMBOL% has been liquidated.</p>
      <p>Leverage: %LEVERAGE%</p>
      <p>Entry Price: %ENTRY_PRICE%</p>
      <p>Current Price: %CURRENT_PRICE%</p>
      <p>We encourage you to review your trading strategy and consider adjustments to manage your risk.</p>
      <p>Best regards,</p>
      <p>Your Support Team</p>`,
    shortCodes: [
      "FIRSTNAME",
      "SYMBOL",
      "LEVERAGE",
      "ENTRY_PRICE",
      "CURRENT_PRICE",
    ],
    email: true,
  },
  {
    id: 53,
    name: "PartialLiquidationNotification",
    subject: "Notification: Partial Position Liquidation",
    emailBody: `<p>Dear %FIRSTNAME%,</p>
      <p>Your position in %SYMBOL% has been partially liquidated.</p>
      <p>Leverage: %LEVERAGE%</p>
      <p>Entry Price: %ENTRY_PRICE%</p>
      <p>Current Price: %CURRENT_PRICE%</p>
      <p>Please review your remaining position and take any necessary actions to manage your risk.</p>
      <p>Best regards,</p>
      <p>Your Support Team</p>`,
    shortCodes: [
      "FIRSTNAME",
      "SYMBOL",
      "LEVERAGE",
      "ENTRY_PRICE",
      "CURRENT_PRICE",
    ],
    email: true,
  },
  {
    id: 54,
    name: "AccountDeletionConfirmation",
    subject: "Confirm Account Deletion",
    emailBody: `<p>Dear %FIRSTNAME%,</p>
      <p>We have received a request to delete your account.</p>
      <p>If you did not make this request, please disregard this email.</p>
      <p>Otherwise, use the code below to confirm the deletion of your account:</p>
      <p><strong>%TOKEN%</strong></p>
      <p>Best regards,</p>
      <p>Your Support Team</p>`,
    shortCodes: ["FIRSTNAME", "TOKEN"],
    email: true,
  },
  {
    id: 55,
    name: "AccountDeletionConfirmed",
    subject: "Account Deleted Successfully",
    emailBody: `<p>Dear %FIRSTNAME%,</p>
      <p>Your account has been successfully deleted.</p>
      <p>We are sorry to see you go.</p>
      <p>If this was a mistake, please contact our support team.</p>
      <p>Best regards,</p>
      <p>Your Support Team</p>`,
    shortCodes: ["FIRSTNAME"],
    email: true,
  },
  {
    id: 56,
    name: "EcoWithdrawalConfirmation",
    subject: "Your Withdrawal is Successful",
    emailBody: `
      <p>Dear %FIRSTNAME%,</p>
      <p>Your withdrawal of %AMOUNT% %CURRENCY% to address %TO_ADDRESS% has been successfully processed.</p>
      <p>Transaction ID: %TRANSACTION_ID%</p>
      <p>Network Chain: %CHAIN%</p>
      <p>Thank you for using our services.</p>
      <p>Best regards,</p>
      <p>Your Support Team</p>
    `,
    shortCodes: [
      "FIRSTNAME",
      "AMOUNT",
      "CURRENCY",
      "TO_ADDRESS",
      "TRANSACTION_ID",
      "CHAIN",
    ],
    email: true,
  },
  {
    id: 57,
    name: "EcoWithdrawalFailed",
    subject: "Your Withdrawal Failed",
    emailBody: `
      <p>Dear %FIRSTNAME%,</p>
      <p>We regret to inform you that your withdrawal of %AMOUNT% %CURRENCY% to address %TO_ADDRESS% has failed.</p>
      <p>Reason: %REASON%</p>
      <p>The withdrawn amount has been returned to your account.</p>
      <p>If you have any questions, please contact our support team.</p>
      <p>Best regards,</p>
      <p>Your Support Team</p>
    `,
    shortCodes: ["FIRSTNAME", "AMOUNT", "CURRENCY", "TO_ADDRESS", "REASON"],
    email: true,
  },
  {
    id: 58,
    name: "IcoOfferingApproved",
    subject: "Your ICO Offering Has Been Approved",
    emailBody: `
      <p>Dear %PROJECT_OWNER_NAME%,</p>
      <p>Congratulations! Your ICO offering, <strong>%OFFERING_NAME%</strong>, has been approved by our admin team.</p>
      <p>Approval Date: %APPROVED_AT%</p>
      <p>Please log in to your dashboard for further details and next steps.</p>
      <p>Best regards,</p>
      <p>The ICO Team</p>
    `,
    shortCodes: ["PROJECT_OWNER_NAME", "OFFERING_NAME", "APPROVED_AT"],
    email: true,
  },
  {
    id: 59,
    name: "IcoOfferingRejected",
    subject: "Your ICO Offering Has Been Rejected",
    emailBody: `
      <p>Dear %PROJECT_OWNER_NAME%,</p>
      <p>We regret to inform you that your ICO offering, <strong>%OFFERING_NAME%</strong>, has been rejected.</p>
      <p>Rejection Reason: %REJECTION_REASON%</p>
      <p>Please review the feedback and contact our support team if you have any questions.</p>
      <p>Best regards,</p>
      <p>The ICO Team</p>
    `,
    shortCodes: ["PROJECT_OWNER_NAME", "OFFERING_NAME", "REJECTION_REASON"],
    email: true,
  },
  {
    id: 60,
    name: "IcoOfferingFlagged",
    subject: "Your ICO Offering Has Been Flagged for Review",
    emailBody: `
      <p>Dear %PROJECT_OWNER_NAME%,</p>
      <p>Your ICO offering, <strong>%OFFERING_NAME%</strong>, has been flagged for further review.</p>
      <p>Flag Reason: %FLAG_REASON%</p>
      <p>If you have any questions or need further clarification, please contact support immediately.</p>
      <p>Best regards,</p>
      <p>The ICO Team</p>
    `,
    shortCodes: ["PROJECT_OWNER_NAME", "OFFERING_NAME", "FLAG_REASON"],
    email: true,
  },
  {
    id: 61,
    name: "IcoInvestmentConfirmed",
    subject: "Investment Confirmation for %OFFERING_NAME%",
    emailBody: `
      <p>Dear %INVESTOR_NAME%,</p>
      <p>Thank you for investing in <strong>%OFFERING_NAME%</strong>.</p>
      <p>Investment Details:</p>
      <ul>
        <li>Amount Invested: $%AMOUNT_INVESTED%</li>
        <li>Tokens Received: %TOKEN_AMOUNT%</li>
        <li>Token Price at Purchase: $%TOKEN_PRICE%</li>
        <li>Transaction ID: %TRANSACTION_ID%</li>
      </ul>
      <p>Your investment is now confirmed. You can view your updated portfolio on your dashboard.</p>
      <p>Best regards,</p>
      <p>The ICO Team</p>
    `,
    shortCodes: [
      "INVESTOR_NAME",
      "OFFERING_NAME",
      "AMOUNT_INVESTED",
      "TOKEN_AMOUNT",
      "TOKEN_PRICE",
      "TRANSACTION_ID",
    ],
    email: true,
  },
  {
    id: 62,
    name: "IcoLaunchApplicationSubmitted",
    subject: "Your ICO Launch Application Has Been Received",
    emailBody: `
      <p>Dear %PROJECT_OWNER_NAME%,</p>
      <p>Your ICO launch application for <strong>%PROJECT_NAME%</strong> has been successfully submitted.</p>
      <p>We will review your application and get back to you within <strong>%ESTIMATED_REVIEW_TIME%</strong>.</p>
      <p>Thank you for choosing our platform for your token launch.</p>
      <p>Best regards,</p>
      <p>The ICO Team</p>
    `,
    shortCodes: ["PROJECT_OWNER_NAME", "PROJECT_NAME", "ESTIMATED_REVIEW_TIME"],
    email: true,
  },
  {
    id: 63,
    name: "IcoOfferingUnflagged",
    subject: "Your ICO Offering Has Been Unflagged",
    emailBody: `
      <p>Dear %PROJECT_OWNER_NAME%,</p>
      <p>Your ICO offering, <strong>%OFFERING_NAME%</strong>, has been unflagged by our admin team and is now back to its normal status.</p>
      <p>Please log in to your dashboard for further details.</p>
      <p>Best regards,</p>
      <p>The ICO Team</p>
    `,
    shortCodes: ["PROJECT_OWNER_NAME", "OFFERING_NAME"],
    email: true,
  },
  {
    id: 64,
    name: "IcoInvestmentOccurredBuyer",
    subject: "Your Investment in %OFFERING_NAME% is Confirmed",
    emailBody: `
      <p>Dear %INVESTOR_NAME%,</p>
      <p>Your investment of $%AMOUNT_INVESTED% in <strong>%OFFERING_NAME%</strong> has been successfully processed.</p>
      <p>Investment Details:</p>
      <ul>
        <li>Tokens Received: %TOKEN_AMOUNT%</li>
        <li>Token Price: $%TOKEN_PRICE%</li>
        <li>Transaction ID: %TRANSACTION_ID%</li>
      </ul>
      <p>Thank you for investing with us.</p>
      <p>Best regards,</p>
      <p>The ICO Team</p>
    `,
    shortCodes: [
      "INVESTOR_NAME",
      "OFFERING_NAME",
      "AMOUNT_INVESTED",
      "TOKEN_AMOUNT",
      "TOKEN_PRICE",
      "TRANSACTION_ID",
    ],
    email: true,
  },
  {
    id: 65,
    name: "IcoInvestmentOccurredSeller",
    subject: "New Investment in Your ICO Offering: %OFFERING_NAME%",
    emailBody: `
      <p>Dear %SELLER_NAME%,</p>
      <p>A new investment has been made in your ICO offering, <strong>%OFFERING_NAME%</strong>.</p>
      <p>Investment Details:</p>
      <ul>
        <li>Investor: %INVESTOR_NAME%</li>
        <li>Amount Invested: $%AMOUNT_INVESTED%</li>
        <li>Tokens Purchased: %TOKEN_AMOUNT%</li>
        <li>Transaction ID: %TRANSACTION_ID%</li>
      </ul>
      <p>Please log in to your dashboard for more details.</p>
      <p>Best regards,</p>
      <p>The ICO Team</p>
    `,
    shortCodes: [
      "SELLER_NAME",
      "OFFERING_NAME",
      "INVESTOR_NAME",
      "AMOUNT_INVESTED",
      "TOKEN_AMOUNT",
      "TRANSACTION_ID",
    ],
    email: true,
  },
  {
    id: 66,
    name: "TransactionVerifiedBuyer",
    subject: "Your Transaction for %OFFERING_NAME% Has Been Verified",
    emailBody: `
      <p>Dear %INVESTOR_NAME%,</p>
      <p>Your transaction for <strong>%OFFERING_NAME%</strong> has been successfully verified.</p>
      <p>Transaction Details:</p>
      <ul>
        <li>Transaction ID: %TRANSACTION_ID%</li>
        <li>Amount: $%AMOUNT%</li>
      </ul>
      %NOTE%
      <p>Please check your dashboard for further details.</p>
      <p>Best regards,</p>
      <p>The ICO Team</p>
    `,
    shortCodes: [
      "INVESTOR_NAME",
      "OFFERING_NAME",
      "TRANSACTION_ID",
      "AMOUNT",
      "NOTE",
    ],
    email: true,
  },
  {
    id: 67,
    name: "TransactionVerifiedSeller",
    subject: "Transaction for %OFFERING_NAME% Verified",
    emailBody: `
      <p>Dear %SELLER_NAME%,</p>
      <p>A transaction for your offering <strong>%OFFERING_NAME%</strong> has been verified and the funds released.</p>
      <p>Transaction Details:</p>
      <ul>
        <li>Transaction ID: %TRANSACTION_ID%</li>
        <li>Amount: $%AMOUNT%</li>
      </ul>
      %NOTE%
      <p>Please log in to your dashboard for more details.</p>
      <p>Best regards,</p>
      <p>The ICO Team</p>
    `,
    shortCodes: [
      "SELLER_NAME",
      "OFFERING_NAME",
      "TRANSACTION_ID",
      "AMOUNT",
      "NOTE",
    ],
    email: true,
  },
  {
    id: 68,
    name: "TransactionRejectedBuyer",
    subject: "Your Transaction for %OFFERING_NAME% Has Been Rejected",
    emailBody: `
      <p>Dear %INVESTOR_NAME%,</p>
      <p>We regret to inform you that your transaction for <strong>%OFFERING_NAME%</strong> has been rejected.</p>
      <p>Transaction Details:</p>
      <ul>
        <li>Transaction ID: %TRANSACTION_ID%</li>
        <li>Amount: $%AMOUNT%</li>
      </ul>
      <p>Reason: %NOTE%</p>
      <p>Please contact our support team if you have any questions.</p>
      <p>Best regards,</p>
      <p>The ICO Team</p>
    `,
    shortCodes: [
      "INVESTOR_NAME",
      "OFFERING_NAME",
      "TRANSACTION_ID",
      "AMOUNT",
      "NOTE",
    ],
    email: true,
  },
  {
    id: 69,
    name: "TransactionRejectedSeller",
    subject: "Transaction for %OFFERING_NAME% Rejected",
    emailBody: `
      <p>Dear %SELLER_NAME%,</p>
      <p>A transaction for your offering <strong>%OFFERING_NAME%</strong> has been rejected.</p>
      <p>Transaction Details:</p>
      <ul>
        <li>Transaction ID: %TRANSACTION_ID%</li>
        <li>Amount: $%AMOUNT%</li>
      </ul>
      <p>Note: %NOTE%</p>
      <p>Please review your offering details for more information.</p>
      <p>Best regards,</p>
      <p>The ICO Team</p>
    `,
    shortCodes: [
      "SELLER_NAME",
      "OFFERING_NAME",
      "TRANSACTION_ID",
      "AMOUNT",
      "NOTE",
    ],
    email: true,
  },
  {
    id: 70,
    name: "TransactionNoteAddedBuyer",
    subject: "Note Added to Your Transaction for %OFFERING_NAME%",
    emailBody:
      "\n  <p>Dear %INVESTOR_NAME%,</p>\n  <p>A note has been added to your transaction for the offering <strong>%OFFERING_NAME%</strong>.</p>\n  <p>Transaction ID: %TRANSACTION_ID%</p>\n  <p>Note: %NOTE%</p>\n  <p>Please review this note in your transaction details.</p>\n  <p>Best regards,</p>\n  <p>The ICO Team</p>\n",
    shortCodes: ["INVESTOR_NAME", "OFFERING_NAME", "TRANSACTION_ID", "NOTE"],
    email: true,
  },
  {
    id: 71,
    name: "TransactionNoteAddedSeller",
    subject: "Note Added to a Transaction for %OFFERING_NAME%",
    emailBody:
      "\n  <p>Dear %SELLER_NAME%,</p>\n  <p>A note has been added to a transaction for your offering <strong>%OFFERING_NAME%</strong>.</p>\n  <p>Transaction ID: %TRANSACTION_ID%</p>\n  <p>Note: %NOTE%</p>\n  <p>Please check your dashboard for more details.</p>\n  <p>Best regards,</p>\n  <p>The ICO Team</p>\n",
    shortCodes: ["SELLER_NAME", "OFFERING_NAME", "TRANSACTION_ID", "NOTE"],
    email: true,
  },
  {
    id: 72,
    name: "TransactionNoteRemovedBuyer",
    subject: "Note Removed from Your Transaction for %OFFERING_NAME%",
    emailBody:
      "\n  <p>Dear %INVESTOR_NAME%,</p>\n  <p>The note on your transaction for the offering <strong>%OFFERING_NAME%</strong> has been removed.</p>\n  <p>Transaction ID: %TRANSACTION_ID%</p>\n  <p>Please review your transaction details for updated information.</p>\n  <p>Best regards,</p>\n  <p>The ICO Team</p>\n",
    shortCodes: ["INVESTOR_NAME", "OFFERING_NAME", "TRANSACTION_ID"],
    email: true,
  },
  {
    id: 73,
    name: "TransactionNoteRemovedSeller",
    subject: "Note Removed from a Transaction for %OFFERING_NAME%",
    emailBody:
      "\n  <p>Dear %SELLER_NAME%,</p>\n  <p>The note on a transaction for your offering <strong>%OFFERING_NAME%</strong> has been removed.</p>\n  <p>Transaction ID: %TRANSACTION_ID%</p>\n  <p>Please log in to your dashboard for more details.</p>\n  <p>Best regards,</p>\n  <p>The ICO Team</p>\n",
    shortCodes: ["SELLER_NAME", "OFFERING_NAME", "TRANSACTION_ID"],
    email: true,
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      const existingTemplates = await queryInterface.sequelize.query(
        "SELECT name FROM notification_template",
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      const existingNames = existingTemplates.map((template) => template.name);

      // Adding timestamp fields assuming they are required by the schema
      const timestamp = new Date();
      const newTemplates = notificationTemplates
        .filter((template) => !existingNames.includes(template.name))
        .map((template) => ({
          ...template,
          shortCodes: JSON.stringify(template.shortCodes),
        }));

      if (newTemplates.length > 0) {
        await queryInterface.bulkInsert("notification_template", newTemplates);
      }
    } catch (error) {
      console.error("Error seeding notification template:", error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("notification_template", null, {});
  },
};
