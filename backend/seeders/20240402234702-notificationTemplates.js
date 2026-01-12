"use strict";

const notificationTemplates = [
  {
    id: 1,
    name: "EmailVerification",
    subject: "Please verify your email",
    emailBody: `
<h1>Verify Your Email</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Welcome! You recently created an account on %CREATED_AT%. Please verify your email address to complete your registration and start your journey with us.</p>

<div class="highlight-box">
  <div class="highlight-label">Your Verification Code</div>
  <div class="highlight-value">%TOKEN%</div>
</div>

<p style="text-align: center;">
  <a href="%URL%/login?token=%TOKEN%" class="btn">Verify Email Address</a>
</p>

<div class="alert alert-warning">
  This verification link will expire in <strong>5 minutes</strong> for security reasons.
</div>

<p>If you did not create an account, please disregard this email.</p>`,
    smsBody: `Your verification code is %TOKEN%. Expires in 5 min. Do not share.`,
    pushBody: `Your verification code is %TOKEN%. This code expires in 5 minutes.`,
    shortCodes: ["FIRSTNAME", "CREATED_AT", "TOKEN", "URL"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 2,
    name: "PasswordReset",
    subject: "Password Reset Request",
    emailBody: `
<h1>Password Reset Request</h1>
<p>Dear %FIRSTNAME%,</p>
<p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>

<div class="info-card">
  <div class="info-card-title">Security Information</div>
  <div class="info-card-content">
    <p style="margin: 0;">Last login: <strong>%LAST_LOGIN%</strong></p>
  </div>
</div>

<p>Click the button below to reset your password. This link will reveal a temporary password.</p>

<p style="text-align: center;">
  <a href="%URL%/reset?token=%TOKEN%" class="btn">Reset Password</a>
</p>

<div class="alert alert-info">
  This is a one-time password reset link. For security, it will expire shortly.
</div>`,
    smsBody: `Password reset requested. If this wasn't you, secure your account immediately.`,
    pushBody: `A password reset was requested for your account. If this wasn't you, please secure your account.`,
    shortCodes: ["FIRSTNAME", "LAST_LOGIN", "TOKEN"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 3,
    name: "EmailTest",
    subject: "Email System Test",
    emailBody: `
<h1>Email System Test</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Great news! Your email system is working perfectly.</p>

<div class="alert alert-success">
  Email system test completed successfully on %TIME%
</div>

<div class="info-card">
  <div class="info-card-title">System Status</div>
  <div class="info-card-content">
    <p style="margin: 0;">All email services are operational. Your platform is ready to send notifications.</p>
  </div>
</div>

<p>If you did not initiate this test, please contact our support team.</p>`,
    smsBody: `Email test completed successfully at %TIME%. All systems operational.`,
    pushBody: `Email system test completed successfully at %TIME%. All notification services are operational.`,
    shortCodes: ["FIRSTNAME", "TIME"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 4,
    name: "KycSubmission",
    subject: "KYC Submission Confirmation",
    emailBody: `
<h1>KYC Application Received</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Thank you for submitting your KYC application. Our team is now reviewing your documents.</p>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Submitted On</span>
    <span class="transaction-value">%CREATED_AT%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Verification Level</span>
    <span class="transaction-value">%LEVEL%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Status</span>
    <span class="transaction-value">%STATUS%</span>
  </div>
</div>

<div class="alert alert-info">
  Verification typically takes 1-3 business days. We'll notify you once your application has been reviewed.
</div>`,
    smsBody: `KYC application received on %CREATED_AT%. Review takes 1-3 business days.`,
    pushBody: `Your KYC application has been received and is under review. We will notify you once the verification is complete.`,
    shortCodes: ["FIRSTNAME", "CREATED_AT", "LEVEL", "STATUS"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 5,
    name: "KycUpdate",
    subject: "KYC Update Confirmation",
    emailBody: `
<h1>KYC Application Updated</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your KYC application has been updated and is now under review again.</p>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Updated On</span>
    <span class="transaction-value">%UPDATED_AT%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Verification Level</span>
    <span class="transaction-value">%LEVEL%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Status</span>
    <span class="transaction-value">%STATUS%</span>
  </div>
</div>

<div class="alert alert-info">
  Our team will review your updated documents shortly.
</div>`,
    smsBody: `KYC application updated on %UPDATED_AT%. Our team will review shortly.`,
    pushBody: `Your KYC documents have been updated and are now under review. We will notify you of the result.`,
    shortCodes: ["FIRSTNAME", "UPDATED_AT", "LEVEL", "STATUS"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 6,
    name: "KycApproved",
    subject: "Your KYC Application has been Approved",
    emailBody: `
<h1>KYC Verification Approved!</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Congratulations! Your KYC application has been approved. You now have full access to all platform features.</p>

<div class="highlight-box">
  <div class="highlight-label">Verification Level</div>
  <div class="highlight-value">%LEVEL%</div>
</div>

<div class="alert alert-success">
  Your identity has been verified on %UPDATED_AT%
</div>

<div class="info-card">
  <div class="info-card-title">What's Next?</div>
  <div class="info-card-content">
    <p style="margin: 0;">You can now enjoy increased withdrawal limits and access to all trading features. Start exploring!</p>
  </div>
</div>

<p>Thank you for your cooperation.</p>`,
    smsBody: `Congratulations! Your KYC verification is approved. Full platform access unlocked.`,
    pushBody: `Your KYC verification has been approved. You now have full access to all platform features and increased limits.`,
    shortCodes: ["FIRSTNAME", "UPDATED_AT", "LEVEL"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 7,
    name: "KycRejected",
    subject: "Your KYC Application has been Rejected",
    emailBody: `
<h1>KYC Application Update</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Unfortunately, we were unable to verify your identity with the documents provided.</p>

<div class="alert alert-error">
  Application rejected on %UPDATED_AT%
</div>

<div class="info-card">
  <div class="info-card-title">Reason for Rejection</div>
  <div class="info-card-content">
    <p style="margin: 0;">%MESSAGE%</p>
  </div>
</div>

<div class="alert alert-info">
  You can resubmit your application with corrected documents. Please ensure all information is clear and matches your profile.
</div>

<p>If you have questions, please contact our support team for assistance.</p>`,
    smsBody: `KYC rejected: %MESSAGE%. Please resubmit with corrected documents.`,
    pushBody: `Your KYC application was not approved. Reason: %MESSAGE%. You can resubmit with corrected documents.`,
    shortCodes: ["FIRSTNAME", "UPDATED_AT", "MESSAGE", "LEVEL"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 8,
    name: "NewInvestmentCreated",
    subject: "New Investment Created",
    emailBody: `
<h1>Investment Confirmed!</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your investment has been successfully created. Here are the details:</p>

<div class="highlight-box">
  <div class="highlight-label">Investment Amount</div>
  <div class="highlight-value">%AMOUNT%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Plan</span>
    <span class="transaction-value">%PLAN_NAME%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Duration</span>
    <span class="transaction-value">%DURATION% %TIMEFRAME%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Status</span>
    <span class="transaction-value">%STATUS%</span>
  </div>
</div>

<div class="alert alert-success">
  Your investment is now active and earning returns!
</div>`,
    shortCodes: [
      "FIRSTNAME",
      "PLAN_NAME",
      "AMOUNT",
      "DURATION",
      "TIMEFRAME",
      "STATUS",
    ],
    smsBody: `Investment of %AMOUNT% in %PLAN_NAME% created. Duration: %DURATION% %TIMEFRAME%.`,
    pushBody: `Your investment of %AMOUNT% in %PLAN_NAME% is now active and earning returns. Duration: %DURATION% %TIMEFRAME%.`,
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 9,
    name: "InvestmentUpdated",
    subject: "Investment Updated",
    emailBody: `
<h1>Investment Updated</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your investment in the <strong>%PLAN_NAME%</strong> plan has been updated.</p>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Plan</span>
    <span class="transaction-value">%PLAN_NAME%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Amount</span>
    <span class="transaction-value">%AMOUNT% %CURRENCY%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Status</span>
    <span class="transaction-value">%STATUS%</span>
  </div>
</div>

<div class="alert alert-info">
  Your investment details have been updated. Check your dashboard for more information.
</div>`,
    smsBody: `Investment in %PLAN_NAME% updated. Amount: %AMOUNT% %CURRENCY%. Status: %STATUS%.`,
    pushBody: `Your %PLAN_NAME% investment has been updated. Amount: %AMOUNT% %CURRENCY%. Check your dashboard for details.`,
    shortCodes: ["FIRSTNAME", "PLAN_NAME", "AMOUNT", "CURRENCY", "STATUS"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 10,
    name: "InvestmentCanceled",
    subject: "Investment Canceled",
    emailBody: `
<h1>Investment Canceled</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your investment in the <strong>%PLAN_NAME%</strong> plan has been canceled.</p>

<div class="highlight-box">
  <div class="highlight-label">Amount Returned</div>
  <div class="highlight-value">%AMOUNT% %CURRENCY%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Plan</span>
    <span class="transaction-value">%PLAN_NAME%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Status</span>
    <span class="transaction-value">%STATUS%</span>
  </div>
</div>

<div class="alert alert-info">
  The funds have been returned to your wallet. You can create a new investment at any time.
</div>`,
    smsBody: `Investment in %PLAN_NAME% canceled. %AMOUNT% %CURRENCY% returned to wallet.`,
    pushBody: `Your investment in %PLAN_NAME% has been canceled. %AMOUNT% %CURRENCY% has been returned to your wallet.`,
    shortCodes: ["FIRSTNAME", "PLAN_NAME", "AMOUNT", "CURRENCY", "STATUS"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 11,
    name: "UserMessage",
    subject: "New Message From Support",
    emailBody: `
<h1>New Support Message</h1>
<p>Dear %RECEIVER_NAME%,</p>
<p>You have received a new message from our support team.</p>

<div class="transaction-card">
  <div class="transaction-row-last">
    <span class="transaction-label">Ticket ID</span>
    <span class="transaction-value">%TICKET_ID%</span>
  </div>
</div>

<div class="info-card">
  <div class="info-card-title">Message</div>
  <div class="info-card-content">
    <p style="margin: 0;">%MESSAGE%</p>
  </div>
</div>

<p style="text-align: center;">
  <a href="#" class="btn">View Ticket</a>
</p>`,
    smsBody: `New support message for ticket #%TICKET_ID%. Check your inbox.`,
    pushBody: `You have a new message from support regarding ticket #%TICKET_ID%. Tap to view the conversation.`,
    shortCodes: ["RECEIVER_NAME", "TICKET_ID", "MESSAGE"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 12,
    name: "SupportMessage",
    subject: "New User Message",
    emailBody: `
<h1>New Message Received</h1>
<p>Dear %RECEIVER_NAME%,</p>
<p>You have received a new message from <strong>%SENDER_NAME%</strong>.</p>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Ticket ID</span>
    <span class="transaction-value">%TICKET_ID%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">From</span>
    <span class="transaction-value">%SENDER_NAME%</span>
  </div>
</div>

<div class="info-card">
  <div class="info-card-title">Message</div>
  <div class="info-card-content">
    <p style="margin: 0;">%MESSAGE%</p>
  </div>
</div>

<p style="text-align: center;">
  <a href="#" class="btn">Reply to Message</a>
</p>`,
    smsBody: `New message from %SENDER_NAME% on ticket #%TICKET_ID%. Please respond.`,
    pushBody: `New message from %SENDER_NAME% regarding ticket #%TICKET_ID%. Tap to view and respond.`,
    shortCodes: ["RECEIVER_NAME", "SENDER_NAME", "TICKET_ID", "MESSAGE"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 13,
    name: "FiatWalletTransaction",
    subject: "Transaction Alert: %TRANSACTION_TYPE%",
    emailBody: `
<h1>Transaction Alert</h1>
<p>Dear %FIRSTNAME%,</p>
<p>A <strong>%TRANSACTION_TYPE%</strong> transaction has been processed on your account.</p>

<div class="highlight-box">
  <div class="highlight-label">Amount</div>
  <div class="highlight-value">%AMOUNT% %CURRENCY%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Transaction ID</span>
    <span class="transaction-value">%TRANSACTION_ID%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Type</span>
    <span class="transaction-value">%TRANSACTION_TYPE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Status</span>
    <span class="transaction-value">%TRANSACTION_STATUS%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">New Balance</span>
    <span class="transaction-value">%NEW_BALANCE% %CURRENCY%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Description</span>
    <span class="transaction-value">%DESCRIPTION%</span>
  </div>
</div>

<div class="alert alert-info">
  If you did not authorize this transaction, please contact support immediately.
</div>`,
    smsBody: `%TRANSACTION_TYPE%: %AMOUNT% %CURRENCY%. New balance: %NEW_BALANCE% %CURRENCY%.`,
    pushBody: `Transaction Alert: %TRANSACTION_TYPE% of %AMOUNT% %CURRENCY% processed. New balance: %NEW_BALANCE% %CURRENCY%.`,
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
    sms: true,
    push: true,
  },
  {
    id: 14,
    name: "BinaryOrderResult",
    subject: "Binary Order Result: %RESULT%",
    emailBody: `
<h1>Binary Order Result</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your binary order has been closed. Here are the details:</p>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Order ID</span>
    <span class="transaction-value">%ORDER_ID%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Market</span>
    <span class="transaction-value">%MARKET%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Side</span>
    <span class="transaction-value">%SIDE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Amount</span>
    <span class="transaction-value">%AMOUNT% %CURRENCY%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Entry Price</span>
    <span class="transaction-value">%ENTRY_PRICE%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Close Price</span>
    <span class="transaction-value">%CLOSE_PRICE%</span>
  </div>
</div>

<div class="highlight-box">
  <div class="highlight-label">Result: %RESULT%</div>
  <div class="highlight-value">%PROFIT% %CURRENCY%</div>
</div>

<p>Thank you for trading with us!</p>`,
    smsBody: `Binary %MARKET% %SIDE%: %RESULT%. P/L: %PROFIT% %CURRENCY%.`,
    pushBody: `Binary order on %MARKET% closed. Result: %RESULT%. Profit/Loss: %PROFIT% %CURRENCY%.`,
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
    sms: true,
    push: true,
  },
  // Binary Order Type-Specific Email Templates
  {
    id: 90,
    name: "BinaryRiseFallWin",
    subject: "Congratulations! Your Rise/Fall Trade Won!",
    emailBody: `
<h1>You Won!</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Great news! Your prediction was correct, and your Rise/Fall trade has closed with a profit!</p>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Order ID</span>
    <span class="transaction-value">%ORDER_ID%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Market</span>
    <span class="transaction-value">%MARKET%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Direction</span>
    <span class="transaction-value">%SIDE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Amount</span>
    <span class="transaction-value">%AMOUNT% %CURRENCY%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Entry Price</span>
    <span class="transaction-value">%ENTRY_PRICE%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Close Price</span>
    <span class="transaction-value">%CLOSE_PRICE%</span>
  </div>
</div>

<div class="highlight-box">
  <div class="highlight-label">Your Profit</div>
  <div class="highlight-value" style="color: #34d399;">+%PROFIT% %CURRENCY%</div>
</div>

<div class="alert alert-success">
  Your winnings have been credited to your account. Keep up the great trading!
</div>`,
    smsBody: `Rise/Fall WIN on %MARKET%! Profit: +%PROFIT% %CURRENCY%. Great trading!`,
    pushBody: `Congratulations! Your Rise/Fall trade on %MARKET% won! Profit: +%PROFIT% %CURRENCY% credited to your account.`,
    shortCodes: ["FIRSTNAME", "ORDER_ID", "MARKET", "SIDE", "AMOUNT", "CURRENCY", "ENTRY_PRICE", "CLOSE_PRICE", "PROFIT"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 91,
    name: "BinaryRiseFallLoss",
    subject: "Rise/Fall Trade Result - Better Luck Next Time",
    emailBody: `
<h1>Trade Closed</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your Rise/Fall trade has closed. Unfortunately, the market moved in the opposite direction of your prediction.</p>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Order ID</span>
    <span class="transaction-value">%ORDER_ID%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Market</span>
    <span class="transaction-value">%MARKET%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Your Prediction</span>
    <span class="transaction-value">%SIDE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Amount</span>
    <span class="transaction-value">%AMOUNT% %CURRENCY%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Entry Price</span>
    <span class="transaction-value">%ENTRY_PRICE%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Close Price</span>
    <span class="transaction-value">%CLOSE_PRICE%</span>
  </div>
</div>

<div class="highlight-box">
  <div class="highlight-label">Loss</div>
  <div class="highlight-value" style="color: #f87171;">%PROFIT% %CURRENCY%</div>
</div>

<div class="alert alert-info">
  <strong>Trading Tip:</strong> Losses are part of trading. Consider analyzing market trends and using demo mode to practice new strategies.
</div>`,
    shortCodes: ["FIRSTNAME", "ORDER_ID", "MARKET", "SIDE", "AMOUNT", "CURRENCY", "ENTRY_PRICE", "CLOSE_PRICE", "PROFIT"],
    email: true,
    sms: true,
    push: true,
    smsBody: `Rise/Fall trade on %MARKET% closed. Loss: %PROFIT% %CURRENCY%. Better luck next time.`,
    pushBody: `Your Rise/Fall trade on %MARKET% has closed with a loss of %PROFIT% %CURRENCY%. Keep analyzing market trends.`,
  },
  {
    id: 92,
    name: "BinaryRiseFallDraw",
    subject: "Rise/Fall Trade Result - Draw",
    emailBody: `
<h1>Trade Draw</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your Rise/Fall trade has closed as a draw. The closing price was exactly the same as the entry price!</p>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Order ID</span>
    <span class="transaction-value">%ORDER_ID%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Market</span>
    <span class="transaction-value">%MARKET%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Direction</span>
    <span class="transaction-value">%SIDE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Amount</span>
    <span class="transaction-value">%AMOUNT% %CURRENCY%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Entry Price</span>
    <span class="transaction-value">%ENTRY_PRICE%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Close Price</span>
    <span class="transaction-value">%CLOSE_PRICE%</span>
  </div>
</div>

<div class="highlight-box">
  <div class="highlight-label">Result</div>
  <div class="highlight-value">DRAW - Amount Refunded</div>
</div>

<div class="alert alert-warning">
  Your original investment of %AMOUNT% %CURRENCY% has been returned to your account. A draw is rare - try again with your next trade!
</div>`,
    smsBody: `Rise/Fall DRAW on %MARKET%. %AMOUNT% %CURRENCY% refunded to your account.`,
    pushBody: `Your Rise/Fall trade on %MARKET% ended in a draw. Your investment of %AMOUNT% %CURRENCY% has been refunded.`,
    shortCodes: ["FIRSTNAME", "ORDER_ID", "MARKET", "SIDE", "AMOUNT", "CURRENCY", "ENTRY_PRICE", "CLOSE_PRICE"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 93,
    name: "BinaryHigherLowerWin",
    subject: "Higher/Lower Trade Victory! Barrier Reached!",
    emailBody: `
<h1>Barrier Hit!</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Excellent prediction! The price reached your barrier level, and your Higher/Lower trade has closed with a profit!</p>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Order ID</span>
    <span class="transaction-value">%ORDER_ID%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Market</span>
    <span class="transaction-value">%MARKET%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Direction</span>
    <span class="transaction-value">%SIDE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Amount</span>
    <span class="transaction-value">%AMOUNT% %CURRENCY%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Entry Price</span>
    <span class="transaction-value">%ENTRY_PRICE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Barrier Level</span>
    <span class="transaction-value">%BARRIER%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Close Price</span>
    <span class="transaction-value">%CLOSE_PRICE%</span>
  </div>
</div>

<div class="highlight-box">
  <div class="highlight-label">Your Profit (Barrier: %BARRIER_LEVEL%)</div>
  <div class="highlight-value" style="color: #34d399;">+%PROFIT% %CURRENCY%</div>
</div>

<div class="alert alert-success">
  Your winnings have been credited to your account. Great barrier analysis!
</div>`,
    smsBody: `Higher/Lower WIN on %MARKET%! Barrier hit. Profit: +%PROFIT% %CURRENCY%.`,
    pushBody: `Congratulations! Your Higher/Lower trade on %MARKET% reached the barrier. Profit: +%PROFIT% %CURRENCY%.`,
    shortCodes: ["FIRSTNAME", "ORDER_ID", "MARKET", "SIDE", "AMOUNT", "CURRENCY", "ENTRY_PRICE", "CLOSE_PRICE", "PROFIT", "BARRIER", "BARRIER_LEVEL"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 94,
    name: "BinaryHigherLowerLoss",
    subject: "Higher/Lower Trade Result - Barrier Not Reached",
    emailBody: `
<h1>Barrier Missed</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your Higher/Lower trade has closed. The price did not reach your barrier level before expiry.</p>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Order ID</span>
    <span class="transaction-value">%ORDER_ID%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Market</span>
    <span class="transaction-value">%MARKET%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Direction</span>
    <span class="transaction-value">%SIDE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Amount</span>
    <span class="transaction-value">%AMOUNT% %CURRENCY%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Entry Price</span>
    <span class="transaction-value">%ENTRY_PRICE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Barrier Target</span>
    <span class="transaction-value">%BARRIER%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Close Price</span>
    <span class="transaction-value">%CLOSE_PRICE%</span>
  </div>
</div>

<div class="highlight-box">
  <div class="highlight-label">Loss</div>
  <div class="highlight-value" style="color: #f87171;">%PROFIT% %CURRENCY%</div>
</div>

<div class="alert alert-info">
  <strong>Tip:</strong> Consider using closer barrier levels for higher probability trades, or analyze market volatility before selecting distant barriers.
</div>`,
    smsBody: `Higher/Lower trade on %MARKET% closed. Barrier missed. Loss: %PROFIT% %CURRENCY%.`,
    pushBody: `Your Higher/Lower trade on %MARKET% did not reach the barrier. Loss: %PROFIT% %CURRENCY%.`,
    shortCodes: ["FIRSTNAME", "ORDER_ID", "MARKET", "SIDE", "AMOUNT", "CURRENCY", "ENTRY_PRICE", "CLOSE_PRICE", "PROFIT", "BARRIER", "BARRIER_LEVEL"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 95,
    name: "BinaryTouchNoTouchWin",
    subject: "Touch/No Touch Trade Won! Perfect Prediction!",
    emailBody: `
<h1>Perfect Call!</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Outstanding prediction! Your <strong>%SIDE%</strong> trade was successful. %TOUCH_RESULT%</p>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Order ID</span>
    <span class="transaction-value">%ORDER_ID%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Market</span>
    <span class="transaction-value">%MARKET%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Trade Type</span>
    <span class="transaction-value">%SIDE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Amount</span>
    <span class="transaction-value">%AMOUNT% %CURRENCY%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Entry Price</span>
    <span class="transaction-value">%ENTRY_PRICE%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Barrier Level</span>
    <span class="transaction-value">%BARRIER%</span>
  </div>
</div>

<div class="highlight-box">
  <div class="highlight-label">Your Profit</div>
  <div class="highlight-value" style="color: #34d399;">+%PROFIT% %CURRENCY%</div>
  <p style="margin: 8px 0 0 0; font-size: 14px;">%MULTIPLIER_INFO%</p>
</div>

<div class="alert alert-success">
  Touch/No Touch trades require precise market analysis - you nailed it!
</div>`,
    smsBody: `Touch/No Touch WIN on %MARKET%! Profit: +%PROFIT% %CURRENCY%. Perfect prediction!`,
    pushBody: `Congratulations! Your %SIDE% trade on %MARKET% won! Profit: +%PROFIT% %CURRENCY%.`,
    shortCodes: ["FIRSTNAME", "ORDER_ID", "MARKET", "SIDE", "AMOUNT", "CURRENCY", "ENTRY_PRICE", "PROFIT", "BARRIER", "TOUCH_RESULT", "MULTIPLIER_INFO"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 96,
    name: "BinaryTouchNoTouchLoss",
    subject: "Touch/No Touch Trade Result",
    emailBody: `
<h1>Trade Closed</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your Touch/No Touch trade has closed. %TOUCH_RESULT%</p>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Order ID</span>
    <span class="transaction-value">%ORDER_ID%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Market</span>
    <span class="transaction-value">%MARKET%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Trade Type</span>
    <span class="transaction-value">%SIDE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Amount</span>
    <span class="transaction-value">%AMOUNT% %CURRENCY%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Entry Price</span>
    <span class="transaction-value">%ENTRY_PRICE%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Barrier Level</span>
    <span class="transaction-value">%BARRIER%</span>
  </div>
</div>

<div class="highlight-box">
  <div class="highlight-label">Loss</div>
  <div class="highlight-value" style="color: #f87171;">%PROFIT% %CURRENCY%</div>
</div>

<div class="alert alert-info">
  <strong>Tip:</strong> Touch/No Touch trades are advanced strategies. Consider the market's volatility and typical price range when selecting barriers.
</div>`,
    shortCodes: ["FIRSTNAME", "ORDER_ID", "MARKET", "SIDE", "AMOUNT", "CURRENCY", "ENTRY_PRICE", "PROFIT", "BARRIER", "TOUCH_RESULT"],
    smsBody: `Touch/No Touch trade on %MARKET% closed. Loss: %PROFIT% %CURRENCY%.`,
    pushBody: `Your Touch/No Touch trade on %MARKET% has closed with a loss of %PROFIT% %CURRENCY%.`,
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 97,
    name: "BinaryCallPutWin",
    subject: "Call/Put Option Expired In The Money!",
    emailBody: `
<h1>In The Money!</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your <strong>%SIDE%</strong> option expired in the money! The closing price was on the right side of your strike price.</p>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Order ID</span>
    <span class="transaction-value">%ORDER_ID%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Market</span>
    <span class="transaction-value">%MARKET%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Option Type</span>
    <span class="transaction-value">%SIDE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Premium Paid</span>
    <span class="transaction-value">%AMOUNT% %CURRENCY%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Entry Price</span>
    <span class="transaction-value">%ENTRY_PRICE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Strike Price</span>
    <span class="transaction-value">%STRIKE%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Close Price</span>
    <span class="transaction-value positive">%CLOSE_PRICE%</span>
  </div>
</div>

<div class="highlight-box">
  <div class="highlight-label">Your Profit (Strike: %STRIKE_LEVEL%)</div>
  <div class="highlight-value" style="color: #34d399;">+%PROFIT% %CURRENCY%</div>
</div>

<div class="alert alert-success">
  Excellent options trading! Your profit has been credited to your account.
</div>`,
    shortCodes: ["FIRSTNAME", "ORDER_ID", "MARKET", "SIDE", "AMOUNT", "CURRENCY", "ENTRY_PRICE", "CLOSE_PRICE", "PROFIT", "STRIKE", "STRIKE_LEVEL"],
    smsBody: `%SIDE% option on %MARKET% expired ITM! Profit: +%PROFIT% %CURRENCY%.`,
    pushBody: `Your %SIDE% option on %MARKET% expired in the money! Profit: +%PROFIT% %CURRENCY% credited.`,
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 98,
    name: "BinaryCallPutLoss",
    subject: "Call/Put Option Expired Out of The Money",
    emailBody: `
<h1>Out of The Money</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your <strong>%SIDE%</strong> option expired out of the money. The closing price was on the wrong side of your strike price.</p>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Order ID</span>
    <span class="transaction-value">%ORDER_ID%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Market</span>
    <span class="transaction-value">%MARKET%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Option Type</span>
    <span class="transaction-value">%SIDE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Premium Paid</span>
    <span class="transaction-value">%AMOUNT% %CURRENCY%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Entry Price</span>
    <span class="transaction-value">%ENTRY_PRICE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Strike Price</span>
    <span class="transaction-value">%STRIKE%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Close Price</span>
    <span class="transaction-value">%CLOSE_PRICE%</span>
  </div>
</div>

<div class="highlight-box">
  <div class="highlight-label">Premium Lost</div>
  <div class="highlight-value" style="color: #f87171;">%PROFIT% %CURRENCY%</div>
</div>

<div class="alert alert-info">
  <strong>Options Insight:</strong> Consider "At The Money" strikes for higher probability trades, or "Out of The Money" strikes for higher potential returns with increased risk.
</div>`,
    smsBody: `%SIDE% option on %MARKET% expired OTM. Premium lost: %PROFIT% %CURRENCY%.`,
    pushBody: `Your %SIDE% option on %MARKET% expired out of the money. Premium lost: %PROFIT% %CURRENCY%.`,
    shortCodes: ["FIRSTNAME", "ORDER_ID", "MARKET", "SIDE", "AMOUNT", "CURRENCY", "ENTRY_PRICE", "CLOSE_PRICE", "PROFIT", "STRIKE", "STRIKE_LEVEL"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 99,
    name: "BinaryTurboWin",
    subject: "TURBO Trade Wins! Lightning Fast Profit!",
    emailBody: `
<h1>TURBO WIN!</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your Turbo trade hit the target! Fast trades, fast profits - that's the Turbo way!</p>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Order ID</span>
    <span class="transaction-value">%ORDER_ID%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Market</span>
    <span class="transaction-value">%MARKET%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Direction</span>
    <span class="transaction-value">%SIDE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Amount</span>
    <span class="transaction-value">%AMOUNT% %CURRENCY%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Entry Price</span>
    <span class="transaction-value">%ENTRY_PRICE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Barrier</span>
    <span class="transaction-value">%BARRIER%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Close Price</span>
    <span class="transaction-value positive">%CLOSE_PRICE%</span>
  </div>
</div>

<div class="highlight-box">
  <div class="highlight-label">Your Turbo Profit (Barrier: %BARRIER_LEVEL%)</div>
  <div class="highlight-value" style="color: #34d399;">+%PROFIT% %CURRENCY%</div>
</div>

<div class="alert alert-success">
  Turbo trading rewards quick thinking and fast reactions! Speed is your ally!
</div>`,
    shortCodes: ["FIRSTNAME", "ORDER_ID", "MARKET", "SIDE", "AMOUNT", "CURRENCY", "ENTRY_PRICE", "CLOSE_PRICE", "PROFIT", "BARRIER", "BARRIER_LEVEL"],
    smsBody: `TURBO WIN on %MARKET%! Profit: +%PROFIT% %CURRENCY%. Lightning fast!`,
    pushBody: `TURBO WIN! Your fast trade on %MARKET% hit the target. Profit: +%PROFIT% %CURRENCY%.`,
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 100,
    name: "BinaryTurboLoss",
    subject: "TURBO Trade Result - Barrier Knocked Out",
    emailBody: `
<h1>TURBO Closed</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your Turbo trade has closed. The market moved against your position and hit the knockout barrier.</p>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Order ID</span>
    <span class="transaction-value">%ORDER_ID%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Market</span>
    <span class="transaction-value">%MARKET%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Direction</span>
    <span class="transaction-value">%SIDE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Amount</span>
    <span class="transaction-value">%AMOUNT% %CURRENCY%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Entry Price</span>
    <span class="transaction-value">%ENTRY_PRICE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Knockout Barrier</span>
    <span class="transaction-value">%BARRIER%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Close Price</span>
    <span class="transaction-value">%CLOSE_PRICE%</span>
  </div>
</div>

<div class="highlight-box">
  <div class="highlight-label">Loss</div>
  <div class="highlight-value" style="color: #f87171;">%PROFIT% %CURRENCY%</div>
</div>

<div class="alert alert-warning">
  <strong>Turbo Tip:</strong> Turbo trades are high-risk, high-reward. Use wider barriers for more room or trade during lower volatility periods.
</div>`,
    shortCodes: ["FIRSTNAME", "ORDER_ID", "MARKET", "SIDE", "AMOUNT", "CURRENCY", "ENTRY_PRICE", "CLOSE_PRICE", "PROFIT", "BARRIER", "BARRIER_LEVEL"],
    email: true,
    sms: true,
    push: true,
    smsBody: `TURBO trade on %MARKET% knocked out. Loss: %PROFIT% %CURRENCY%.`,
    pushBody: `Your TURBO trade on %MARKET% hit the knockout barrier. Loss: %PROFIT% %CURRENCY%.`,
  },
  {
    id: 15,
    name: "WalletBalanceUpdate",
    subject: "Wallet Balance Update",
    emailBody: `
<h1>Wallet Balance Update</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your wallet balance has been <strong>%ACTION%</strong> by an administrator.</p>

<div class="highlight-box">
  <div class="highlight-label">Amount</div>
  <div class="highlight-value">%AMOUNT% %CURRENCY%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Action</span>
    <span class="transaction-value">%ACTION%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">New Balance</span>
    <span class="transaction-value">%NEW_BALANCE% %CURRENCY%</span>
  </div>
</div>

<div class="alert alert-info">
  If you have questions about this adjustment, please contact our support team.
</div>`,
    smsBody: `Wallet %ACTION%: %AMOUNT% %CURRENCY%. New balance: %NEW_BALANCE% %CURRENCY%.`,
    pushBody: `Your wallet balance has been %ACTION% by %AMOUNT% %CURRENCY%. New balance: %NEW_BALANCE% %CURRENCY%.`,
    shortCodes: ["FIRSTNAME", "ACTION", "AMOUNT", "CURRENCY", "NEW_BALANCE"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 16,
    name: "TransactionStatusUpdate",
    subject: "Transaction Status Update: %TRANSACTION_TYPE%",
    emailBody: `
<h1>Transaction Status Update</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your <strong>%TRANSACTION_TYPE%</strong> transaction has been updated.</p>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Transaction ID</span>
    <span class="transaction-value">%TRANSACTION_ID%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Type</span>
    <span class="transaction-value">%TRANSACTION_TYPE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Status</span>
    <span class="transaction-value">%TRANSACTION_STATUS%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Amount</span>
    <span class="transaction-value">%AMOUNT% %CURRENCY%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Updated Balance</span>
    <span class="transaction-value">%NEW_BALANCE% %CURRENCY%</span>
  </div>
</div>

<div class="info-card">
  <div class="info-card-title">Note</div>
  <div class="info-card-content">
    <p style="margin: 0;">%NOTE%</p>
  </div>
</div>`,
    smsBody: `%TRANSACTION_TYPE% status: %TRANSACTION_STATUS%. Amount: %AMOUNT% %CURRENCY%.`,
    pushBody: `Your %TRANSACTION_TYPE% transaction is now %TRANSACTION_STATUS%. Amount: %AMOUNT% %CURRENCY%.`,
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
    sms: true,
    push: true,
  },
  {
    id: 17,
    name: "AuthorStatusUpdate",
    subject: "Author Application Status: %AUTHOR_STATUS%",
    emailBody: `
<h1>Author Application Update</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your application to join our Authorship Program has been <strong>%AUTHOR_STATUS%</strong>.</p>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Application ID</span>
    <span class="transaction-value">%APPLICATION_ID%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Status</span>
    <span class="transaction-value">%AUTHOR_STATUS%</span>
  </div>
</div>

<div class="alert alert-info">
  Thank you for your interest in our Authorship Program!
</div>`,
    smsBody: `Author application status: %AUTHOR_STATUS%. Application ID: %APPLICATION_ID%.`,
    pushBody: `Your author application has been %AUTHOR_STATUS%. Thank you for your interest in our program.`,
    shortCodes: ["FIRSTNAME", "AUTHOR_STATUS", "APPLICATION_ID"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 18,
    name: "OutgoingWalletTransfer",
    subject: "Outgoing Wallet Transfer Confirmation",
    emailBody: `
<h1>Transfer Sent Successfully</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your transfer has been completed successfully.</p>

<div class="highlight-box">
  <div class="highlight-label">Amount Sent</div>
  <div class="highlight-value">%AMOUNT% %CURRENCY%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Recipient</span>
    <span class="transaction-value">%RECIPIENT_NAME%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Transaction ID</span>
    <span class="transaction-value">%TRANSACTION_ID%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">New Balance</span>
    <span class="transaction-value">%NEW_BALANCE% %CURRENCY%</span>
  </div>
</div>

<div class="alert alert-success">
  The funds have been transferred successfully to the recipient.
</div>`,
    shortCodes: [
      "FIRSTNAME",
      "AMOUNT",
      "CURRENCY",
      "NEW_BALANCE",
      "TRANSACTION_ID",
      "RECIPIENT_NAME",
    ],
    smsBody: `Sent %AMOUNT% %CURRENCY% to %RECIPIENT_NAME%. New balance: %NEW_BALANCE% %CURRENCY%.`,
    pushBody: `Transfer of %AMOUNT% %CURRENCY% sent to %RECIPIENT_NAME%. New balance: %NEW_BALANCE% %CURRENCY%.`,
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 19,
    name: "IncomingWalletTransfer",
    subject: "Incoming Wallet Transfer Confirmation",
    emailBody: `
<h1>Transfer Received!</h1>
<p>Dear %FIRSTNAME%,</p>
<p>You have received a transfer from <strong>%SENDER_NAME%</strong>.</p>

<div class="highlight-box">
  <div class="highlight-label">Amount Received</div>
  <div class="highlight-value" style="color: #34d399;">+%AMOUNT% %CURRENCY%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">From</span>
    <span class="transaction-value">%SENDER_NAME%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Transaction ID</span>
    <span class="transaction-value">%TRANSACTION_ID%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">New Balance</span>
    <span class="transaction-value">%NEW_BALANCE% %CURRENCY%</span>
  </div>
</div>

<div class="alert alert-success">
  The funds have been credited to your wallet.
</div>`,
    smsBody: `Received %AMOUNT% %CURRENCY% from %SENDER_NAME%. New balance: %NEW_BALANCE% %CURRENCY%.`,
    pushBody: `You received %AMOUNT% %CURRENCY% from %SENDER_NAME%. New balance: %NEW_BALANCE% %CURRENCY%.`,
    shortCodes: [
      "FIRSTNAME",
      "AMOUNT",
      "CURRENCY",
      "NEW_BALANCE",
      "TRANSACTION_ID",
      "SENDER_NAME",
    ],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 20,
    name: "SpotWalletWithdrawalConfirmation",
    subject: "Spot Wallet Withdrawal",
    emailBody: `
<h1>Withdrawal Initiated</h1>
<p>Dear %FIRSTNAME%,</p>
<p>You have successfully initiated a withdrawal from your Spot Wallet.</p>

<div class="highlight-box">
  <div class="highlight-label">Withdrawal Amount</div>
  <div class="highlight-value">%AMOUNT% %CURRENCY%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Address</span>
    <span class="transaction-value" style="font-size: 12px; word-break: break-all;">%ADDRESS%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Network</span>
    <span class="transaction-value">%CHAIN%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Fee</span>
    <span class="transaction-value">%FEE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Memo</span>
    <span class="transaction-value">%MEMO%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Status</span>
    <span class="transaction-value">%STATUS%</span>
  </div>
</div>

<div class="alert alert-warning">
  If you did not make this request, please contact our support team immediately.
</div>`,
    smsBody: `Withdrawal of %AMOUNT% %CURRENCY% initiated from Spot Wallet. Status: %STATUS%. Contact support if not you.`,
    pushBody: `Withdrawal of %AMOUNT% %CURRENCY% initiated from your Spot Wallet to %ADDRESS% on %CHAIN%. Status: %STATUS%. Contact support if unauthorized.`,
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
    sms: true,
    push: true,
  },
  {
    id: 21,
    name: "SpotWalletDepositConfirmation",
    subject: "Spot Wallet Deposit",
    emailBody: `
<h1>Deposit Confirmed!</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your spot wallet deposit has been successfully processed.</p>

<div class="highlight-box">
  <div class="highlight-label">Deposit Amount</div>
  <div class="highlight-value" style="color: #34d399;">+%AMOUNT% %CURRENCY%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Transaction ID</span>
    <span class="transaction-value">%TRANSACTION_ID%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Network</span>
    <span class="transaction-value">%CHAIN%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Fee</span>
    <span class="transaction-value">%FEE%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Status</span>
    <span class="transaction-value positive">COMPLETED</span>
  </div>
</div>

<div class="alert alert-success">
  Your funds are now available in your spot wallet!
</div>`,
    smsBody: `Deposit of %AMOUNT% %CURRENCY% confirmed in your Spot Wallet. TX: %TRANSACTION_ID%.`,
    pushBody: `Your deposit of %AMOUNT% %CURRENCY% has been confirmed and credited to your Spot Wallet. Transaction ID: %TRANSACTION_ID%.`,
    shortCodes: [
      "FIRSTNAME",
      "TRANSACTION_ID",
      "AMOUNT",
      "CURRENCY",
      "CHAIN",
      "FEE",
    ],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 22,
    name: "NewAiInvestmentCreated",
    subject: "New AI Investment Initiated",
    emailBody: `
<h1>AI Investment Created!</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your AI investment has been successfully initiated.</p>

<div class="highlight-box">
  <div class="highlight-label">Investment Amount</div>
  <div class="highlight-value">%AMOUNT% %CURRENCY%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Plan</span>
    <span class="transaction-value">%PLAN_NAME%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Duration</span>
    <span class="transaction-value">%DURATION% %TIMEFRAME%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Status</span>
    <span class="transaction-value">%STATUS%</span>
  </div>
</div>

<div class="alert alert-success">
  Your AI investment is now active. Our algorithms are working to maximize your returns!
</div>`,
    smsBody: `AI Investment of %AMOUNT% %CURRENCY% created in %PLAN_NAME% plan. Duration: %DURATION% %TIMEFRAME%.`,
    pushBody: `Your AI investment of %AMOUNT% %CURRENCY% in the %PLAN_NAME% plan has been created. Duration: %DURATION% %TIMEFRAME%. Status: %STATUS%.`,
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
    sms: true,
    push: true,
  },
  {
    id: 23,
    name: "AiInvestmentCompleted",
    subject: "AI Investment Completed",
    emailBody: `
<h1>AI Investment Completed!</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your AI investment in the <strong>%PLAN_NAME%</strong> plan has been completed.</p>

<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-value">%AMOUNT%</div>
    <div class="stat-label">Invested (%CURRENCY%)</div>
  </div>
  <div class="stat-card">
    <div class="stat-value">%PROFIT%</div>
    <div class="stat-label">Result (%CURRENCY%)</div>
  </div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Plan</span>
    <span class="transaction-value">%PLAN_NAME%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Status</span>
    <span class="transaction-value">%STATUS%</span>
  </div>
</div>

<div class="alert alert-success">
  Your funds and profits have been credited to your wallet.
</div>`,
    smsBody: `AI Investment in %PLAN_NAME% completed. Invested: %AMOUNT%, Result: %PROFIT% %CURRENCY%.`,
    pushBody: `Your AI investment in the %PLAN_NAME% plan has been completed. Invested: %AMOUNT% %CURRENCY%, Result: %PROFIT% %CURRENCY%. Status: %STATUS%.`,
    shortCodes: [
      "FIRSTNAME",
      "PLAN_NAME",
      "AMOUNT",
      "PROFIT",
      "CURRENCY",
      "STATUS",
    ],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 24,
    name: "AiInvestmentCanceled",
    subject: "AI Investment Canceled",
    emailBody: `
<h1>AI Investment Canceled</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your AI investment in the <strong>%PLAN_NAME%</strong> plan has been canceled.</p>

<div class="highlight-box">
  <div class="highlight-label">Amount Refunded</div>
  <div class="highlight-value">%AMOUNT% %CURRENCY%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Plan</span>
    <span class="transaction-value">%PLAN_NAME%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Status</span>
    <span class="transaction-value">%STATUS%</span>
  </div>
</div>

<div class="alert alert-info">
  Your funds have been returned to your wallet. You can create a new investment at any time.
</div>`,
    smsBody: `AI Investment in %PLAN_NAME% canceled. %AMOUNT% %CURRENCY% refunded to your wallet.`,
    pushBody: `Your AI investment in the %PLAN_NAME% plan has been canceled. Amount refunded: %AMOUNT% %CURRENCY%. Funds returned to your wallet.`,
    shortCodes: ["FIRSTNAME", "PLAN_NAME", "AMOUNT", "CURRENCY", "STATUS"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 25,
    name: "WithdrawalStatus",
    subject: "Withdrawal Status: %STATUS%",
    emailBody: `
<h1>Withdrawal Status Update</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your withdrawal request has been <strong>%STATUS%</strong>.</p>

<div class="highlight-box">
  <div class="highlight-label">Withdrawal Amount</div>
  <div class="highlight-value">%AMOUNT% %CURRENCY%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Transaction ID</span>
    <span class="transaction-value">%TRANSACTION_ID%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Status</span>
    <span class="transaction-value">%STATUS%</span>
  </div>
</div>

<div class="info-card">
  <div class="info-card-title">Reason (if applicable)</div>
  <div class="info-card-content">
    <p style="margin: 0;">%REASON%</p>
  </div>
</div>`,
    smsBody: `Withdrawal of %AMOUNT% %CURRENCY% is now %STATUS%. TX: %TRANSACTION_ID%.`,
    pushBody: `Your withdrawal of %AMOUNT% %CURRENCY% has been updated to %STATUS%. Transaction ID: %TRANSACTION_ID%. Reason: %REASON%.`,
    shortCodes: [
      "FIRSTNAME",
      "STATUS",
      "REASON",
      "TRANSACTION_ID",
      "AMOUNT",
      "CURRENCY",
    ],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 26,
    name: "DepositConfirmation",
    subject: "Deposit Confirmation",
    emailBody: `
<h1>Deposit Confirmed!</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your deposit has been successfully confirmed.</p>

<div class="highlight-box">
  <div class="highlight-label">Deposit Amount</div>
  <div class="highlight-value" style="color: #34d399;">+%AMOUNT% %CURRENCY%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row-last">
    <span class="transaction-label">Transaction ID</span>
    <span class="transaction-value">%TRANSACTION_ID%</span>
  </div>
</div>

<div class="alert alert-success">
  Your funds are now available in your account!
</div>`,
    smsBody: `Deposit of %AMOUNT% %CURRENCY% confirmed. TX: %TRANSACTION_ID%. Funds now available.`,
    pushBody: `Your deposit of %AMOUNT% %CURRENCY% has been confirmed. Transaction ID: %TRANSACTION_ID%. Funds are now available in your account.`,
    shortCodes: ["FIRSTNAME", "TRANSACTION_ID", "AMOUNT", "CURRENCY"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 27,
    name: "TransferConfirmation",
    subject: "Transfer Confirmation",
    emailBody: `
<h1>Transfer Completed</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your transfer has been successfully completed.</p>

<div class="highlight-box">
  <div class="highlight-label">Transfer Amount</div>
  <div class="highlight-value">%AMOUNT% %CURRENCY%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Transaction ID</span>
    <span class="transaction-value">%TRANSACTION_ID%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Recipient</span>
    <span class="transaction-value">%RECIPIENT_NAME%</span>
  </div>
</div>

<div class="alert alert-success">
  The funds have been transferred successfully.
</div>`,
    smsBody: `Transfer of %AMOUNT% %CURRENCY% to %RECIPIENT_NAME% completed. TX: %TRANSACTION_ID%.`,
    pushBody: `Your transfer of %AMOUNT% %CURRENCY% to %RECIPIENT_NAME% has been completed successfully. Transaction ID: %TRANSACTION_ID%.`,
    shortCodes: [
      "FIRSTNAME",
      "TRANSACTION_ID",
      "AMOUNT",
      "CURRENCY",
      "RECIPIENT_NAME",
    ],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 28,
    name: "NewForexInvestmentCreated",
    subject: "New Forex Investment Initiated",
    emailBody: `
<h1>Forex Investment Created!</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your Forex investment has been successfully initiated.</p>

<div class="highlight-box">
  <div class="highlight-label">Investment Amount</div>
  <div class="highlight-value">%AMOUNT%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Plan</span>
    <span class="transaction-value">%PLAN_NAME%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Duration</span>
    <span class="transaction-value">%DURATION% %TIMEFRAME%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Status</span>
    <span class="transaction-value">%STATUS%</span>
  </div>
</div>

<div class="alert alert-success">
  Your Forex investment is now active. Monitor your dashboard for updates!
</div>`,
    smsBody: `Forex Investment of %AMOUNT% created in %PLAN_NAME%. Duration: %DURATION% %TIMEFRAME%.`,
    pushBody: `Your Forex investment of %AMOUNT% in the %PLAN_NAME% plan has been created. Duration: %DURATION% %TIMEFRAME%. Status: %STATUS%.`,
    shortCodes: [
      "FIRSTNAME",
      "PLAN_NAME",
      "AMOUNT",
      "DURATION",
      "TIMEFRAME",
      "STATUS",
    ],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 29,
    name: "ForexInvestmentCompleted",
    subject: "Forex Investment Completed",
    emailBody: `
<h1>Forex Investment Completed!</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your Forex investment in the <strong>%PLAN_NAME%</strong> plan has been completed.</p>

<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-value">%AMOUNT%</div>
    <div class="stat-label">Invested</div>
  </div>
  <div class="stat-card">
    <div class="stat-value">%PROFIT%</div>
    <div class="stat-label">Result</div>
  </div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Plan</span>
    <span class="transaction-value">%PLAN_NAME%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Status</span>
    <span class="transaction-value">%STATUS%</span>
  </div>
</div>

<div class="alert alert-success">
  Your investment has matured. Funds have been credited to your account.
</div>`,
    smsBody: `Forex Investment in %PLAN_NAME% completed. Invested: %AMOUNT%, Result: %PROFIT%.`,
    pushBody: `Your Forex investment in the %PLAN_NAME% plan has been completed. Invested: %AMOUNT%, Result: %PROFIT%. Funds credited to your account.`,
    shortCodes: ["FIRSTNAME", "PLAN_NAME", "AMOUNT", "PROFIT", "STATUS"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 30,
    name: "ForexInvestmentCanceled",
    subject: "Forex Investment Canceled",
    emailBody: `
<h1>Forex Investment Canceled</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your Forex investment in the <strong>%PLAN_NAME%</strong> plan has been canceled.</p>

<div class="highlight-box">
  <div class="highlight-label">Amount Refunded</div>
  <div class="highlight-value">%AMOUNT%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Plan</span>
    <span class="transaction-value">%PLAN_NAME%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Status</span>
    <span class="transaction-value">%STATUS%</span>
  </div>
</div>

<div class="alert alert-info">
  Your funds have been returned. You can create a new investment at any time.
</div>`,
    smsBody: `Forex Investment in %PLAN_NAME% canceled. %AMOUNT% refunded to your wallet.`,
    pushBody: `Your Forex investment in the %PLAN_NAME% plan has been canceled. Amount refunded: %AMOUNT%. Funds returned to your wallet.`,
    shortCodes: ["FIRSTNAME", "PLAN_NAME", "AMOUNT", "STATUS"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 31,
    name: "ForexDepositConfirmation",
    subject: "Forex Deposit Confirmation",
    emailBody: `
<h1>Forex Deposit Confirmed!</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your deposit to your Forex account has been successfully processed.</p>

<div class="highlight-box">
  <div class="highlight-label">Deposit Amount</div>
  <div class="highlight-value" style="color: #34d399;">+%AMOUNT% %CURRENCY%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Account ID</span>
    <span class="transaction-value">%ACCOUNT_ID%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Transaction ID</span>
    <span class="transaction-value">%TRANSACTION_ID%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Status</span>
    <span class="transaction-value">%STATUS%</span>
  </div>
</div>

<div class="alert alert-success">
  Your funds are now available in your Forex account!
</div>`,
    smsBody: `Forex deposit of %AMOUNT% %CURRENCY% confirmed. Account: %ACCOUNT_ID%. Status: %STATUS%.`,
    pushBody: `Your Forex deposit of %AMOUNT% %CURRENCY% has been confirmed. Account ID: %ACCOUNT_ID%, Transaction: %TRANSACTION_ID%. Status: %STATUS%.`,
    shortCodes: [
      "FIRSTNAME",
      "ACCOUNT_ID",
      "TRANSACTION_ID",
      "AMOUNT",
      "CURRENCY",
      "STATUS",
    ],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 32,
    name: "ForexWithdrawalConfirmation",
    subject: "Forex Withdrawal Confirmation",
    emailBody: `
<h1>Forex Withdrawal Processed</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your withdrawal from your Forex account has been successfully processed.</p>

<div class="highlight-box">
  <div class="highlight-label">Withdrawal Amount</div>
  <div class="highlight-value">%AMOUNT% %CURRENCY%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Account ID</span>
    <span class="transaction-value">%ACCOUNT_ID%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Transaction ID</span>
    <span class="transaction-value">%TRANSACTION_ID%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Status</span>
    <span class="transaction-value">%STATUS%</span>
  </div>
</div>

<div class="alert alert-success">
  Your funds have been transferred to your wallet.
</div>`,
    smsBody: `Forex withdrawal of %AMOUNT% %CURRENCY% processed. Account: %ACCOUNT_ID%. Status: %STATUS%.`,
    pushBody: `Your Forex withdrawal of %AMOUNT% %CURRENCY% has been processed. Account ID: %ACCOUNT_ID%, Transaction: %TRANSACTION_ID%. Status: %STATUS%.`,
    shortCodes: [
      "FIRSTNAME",
      "ACCOUNT_ID",
      "TRANSACTION_ID",
      "AMOUNT",
      "CURRENCY",
      "STATUS",
    ],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 33,
    name: "IcoNewContribution",
    subject: "Confirmation of Your ICO Contribution",
    emailBody: `
<h1>ICO Contribution Confirmed!</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Thank you for your contribution to the <strong>%TOKEN_NAME%</strong> ICO.</p>

<div class="highlight-box">
  <div class="highlight-label">Contribution Amount</div>
  <div class="highlight-value">%AMOUNT% %CURRENCY%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Token</span>
    <span class="transaction-value">%TOKEN_NAME%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Phase</span>
    <span class="transaction-value">%PHASE_NAME%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Status</span>
    <span class="transaction-value">%CONTRIBUTION_STATUS%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Date</span>
    <span class="transaction-value">%DATE%</span>
  </div>
</div>

<div class="alert alert-success">
  Your contribution has been recorded. Thank you for participating in this ICO!
</div>`,
    smsBody: `ICO contribution of %AMOUNT% %CURRENCY% to %TOKEN_NAME% confirmed. Phase: %PHASE_NAME%.`,
    pushBody: `Your ICO contribution of %AMOUNT% %CURRENCY% to %TOKEN_NAME% has been confirmed. Phase: %PHASE_NAME%. Status: %CONTRIBUTION_STATUS%.`,
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
    sms: true,
    push: true,
  },
  {
    id: 35,
    name: "StakingInitiationConfirmation",
    subject: "Confirmation of Your Staking Initiation",
    emailBody: `
<h1>Staking Initiated!</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your staking has been successfully initiated. Your tokens are now earning rewards!</p>

<div class="highlight-box">
  <div class="highlight-label">Staked Amount</div>
  <div class="highlight-value">%STAKE_AMOUNT% %TOKEN_SYMBOL%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Token</span>
    <span class="transaction-value">%TOKEN_NAME%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Stake Date</span>
    <span class="transaction-value">%STAKE_DATE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Release Date</span>
    <span class="transaction-value">%RELEASE_DATE%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Expected Reward</span>
    <span class="transaction-value positive">%EXPECTED_REWARD% %TOKEN_SYMBOL%</span>
  </div>
</div>

<div class="alert alert-success">
  Your funds are now earning rewards. Sit back and watch your investment grow!
</div>`,
    smsBody: `Staking of %STAKE_AMOUNT% %TOKEN_SYMBOL% initiated. Release: %RELEASE_DATE%.`,
    pushBody: `Your staking of %STAKE_AMOUNT% %TOKEN_SYMBOL% (%TOKEN_NAME%) has been initiated. Expected reward: %EXPECTED_REWARD% %TOKEN_SYMBOL%. Release: %RELEASE_DATE%.`,
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
    sms: true,
    push: true,
  },
  {
    id: 36,
    name: "StakingRewardDistribution",
    subject: "Your Staking Rewards Have Been Distributed",
    emailBody: `
<h1>Staking Rewards Distributed!</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Great news! Your staking rewards have been distributed to your account.</p>

<div class="highlight-box">
  <div class="highlight-label">Reward Amount</div>
  <div class="highlight-value" style="color: #34d399;">+%REWARD_AMOUNT% %TOKEN_SYMBOL%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Token</span>
    <span class="transaction-value">%TOKEN_NAME%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Distribution Date</span>
    <span class="transaction-value">%DISTRIBUTION_DATE%</span>
  </div>
</div>

<div class="alert alert-success">
  Thank you for staking with us! Your rewards are now available in your wallet.
</div>`,
    smsBody: `Staking reward of %REWARD_AMOUNT% %TOKEN_SYMBOL% distributed to your wallet.`,
    pushBody: `Your staking reward of %REWARD_AMOUNT% %TOKEN_SYMBOL% (%TOKEN_NAME%) has been distributed. Date: %DISTRIBUTION_DATE%. Rewards now in your wallet.`,
    shortCodes: [
      "FIRSTNAME",
      "TOKEN_NAME",
      "REWARD_AMOUNT",
      "TOKEN_SYMBOL",
      "DISTRIBUTION_DATE",
    ],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 37,
    name: "OrderConfirmation",
    subject: "Thank You for Your Order!",
    emailBody: `
<h1>Order Confirmed!</h1>
<p>Dear %CUSTOMER_NAME%,</p>
<p>Thank you for your order. Your purchase has been successfully placed.</p>

<div class="highlight-box">
  <div class="highlight-label">Order Total</div>
  <div class="highlight-value">%ORDER_TOTAL%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Order Number</span>
    <span class="transaction-value">%ORDER_NUMBER%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Order Date</span>
    <span class="transaction-value">%ORDER_DATE%</span>
  </div>
</div>

<div class="alert alert-success">
  You can track your order status in your account dashboard.
</div>`,
    smsBody: `Order #%ORDER_NUMBER% confirmed. Total: %ORDER_TOTAL%. Date: %ORDER_DATE%.`,
    pushBody: `Your order #%ORDER_NUMBER% has been confirmed. Order total: %ORDER_TOTAL%. Order date: %ORDER_DATE%. Track status in your dashboard.`,
    shortCodes: ["CUSTOMER_NAME", "ORDER_NUMBER", "ORDER_DATE", "ORDER_TOTAL"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 38,
    name: "OrderStatusUpdate",
    subject: "Update on Your Order - Action Required",
    emailBody: `
<h1>Order Status Update</h1>
<p>Dear %CUSTOMER_NAME%,</p>
<p>Your order <strong>#%ORDER_NUMBER%</strong> has been updated to <strong>%ORDER_STATUS%</strong>.</p>

<div class="info-card">
  <div class="info-card-title">Product Details</div>
  <div class="info-card-content">
    %PRODUCT_DETAILS%
  </div>
</div>

<div class="alert alert-info">
  If your order status is 'COMPLETED', your product keys (if applicable) are available and can be accessed through your account.
</div>

<p>If you have any questions, please contact our support team.</p>`,
    smsBody: `Order #%ORDER_NUMBER% status: %ORDER_STATUS%. Check dashboard for details.`,
    pushBody: `Your order #%ORDER_NUMBER% has been updated to %ORDER_STATUS%. Check your account dashboard for product details and any available keys.`,
    shortCodes: [
      "CUSTOMER_NAME",
      "ORDER_NUMBER",
      "ORDER_STATUS",
      "PRODUCT_DETAILS",
    ],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 39,
    name: "P2PTradeSaleConfirmation",
    subject: "Confirmation of Your P2P Trade Sale",
    emailBody: `
<h1>New P2P Trade Initiated!</h1>
<p>Dear %SELLER_NAME%,</p>
<p>A buyer has initiated a trade on your offer for <strong>%CURRENCY%</strong>. Please respond promptly to complete the transaction.</p>

<div class="highlight-box">
  <div class="highlight-label">Trade Amount</div>
  <div class="highlight-value">%AMOUNT% %CURRENCY%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Trade ID</span>
    <span class="transaction-value">%TRADE_ID%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Buyer</span>
    <span class="transaction-value">%BUYER_NAME%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Price</span>
    <span class="transaction-value">%PRICE%</span>
  </div>
</div>

<div class="alert alert-info">
  Please respond to the buyer promptly to proceed with the trade. Check your dashboard for chat messages.
</div>`,
    smsBody: `P2P Trade: %BUYER_NAME% initiated trade for %AMOUNT% %CURRENCY%. ID: %TRADE_ID%.`,
    pushBody: `New P2P trade initiated by %BUYER_NAME% for %AMOUNT% %CURRENCY% at %PRICE%. Trade ID: %TRADE_ID%. Please respond promptly.`,
    shortCodes: [
      "SELLER_NAME",
      "BUYER_NAME",
      "CURRENCY",
      "AMOUNT",
      "PRICE",
      "TRADE_ID",
    ],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 40,
    name: "P2PTradeReply",
    subject: "New Message in Your P2P Trade",
    emailBody: `
<h1>New Trade Message</h1>
<p>Dear %RECEIVER_NAME%,</p>
<p>You have received a new message in your P2P trade with <strong>%SENDER_NAME%</strong>.</p>

<div class="transaction-card">
  <div class="transaction-row-last">
    <span class="transaction-label">Trade ID</span>
    <span class="transaction-value">%TRADE_ID%</span>
  </div>
</div>

<div class="info-card">
  <div class="info-card-title">Message</div>
  <div class="info-card-content">%MESSAGE%</div>
</div>

<div class="alert alert-info">
  Reply promptly to keep the trade moving forward.
</div>`,
    smsBody: `New message from %SENDER_NAME% in P2P trade %TRADE_ID%. Check your dashboard.`,
    pushBody: `You have a new message from %SENDER_NAME% in your P2P trade. Trade ID: %TRADE_ID%. Reply promptly to keep the trade moving.`,
    shortCodes: ["RECEIVER_NAME", "SENDER_NAME", "TRADE_ID", "MESSAGE"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 41,
    name: "P2PDisputeOpened",
    subject: "Dispute Opened for Your P2P Trade",
    emailBody: `
<h1>Trade Dispute Opened</h1>
<p>Dear %PARTICIPANT_NAME%,</p>
<p>A dispute has been opened for your trade with <strong>%OTHER_PARTY_NAME%</strong>.</p>

<div class="transaction-card">
  <div class="transaction-row-last">
    <span class="transaction-label">Trade ID</span>
    <span class="transaction-value">%TRADE_ID%</span>
  </div>
</div>

<div class="alert alert-warning">
  <strong>Dispute Reason:</strong><br>
  %DISPUTE_REASON%
</div>

<div class="info-card">
  <div class="info-card-title">What Happens Next?</div>
  <div class="info-card-content">Our support team will review the dispute and contact both parties. Please gather any relevant evidence such as payment screenshots or chat history.</div>
</div>`,
    smsBody: `Dispute opened for trade %TRADE_ID% with %OTHER_PARTY_NAME%. Support notified.`,
    pushBody: `A dispute has been opened for your P2P trade %TRADE_ID% with %OTHER_PARTY_NAME%. Reason: %DISPUTE_REASON%. Our team will review.`,
    shortCodes: [
      "PARTICIPANT_NAME",
      "OTHER_PARTY_NAME",
      "TRADE_ID",
      "DISPUTE_REASON",
    ],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 42,
    name: "P2PDisputeResolution",
    subject: "Dispute Resolution Update for Your P2P Trade",
    emailBody: `
<h1>Dispute Resolution Update</h1>
<p>Dear %PARTICIPANT_NAME%,</p>
<p>There is a new update regarding the dispute for your trade.</p>

<div class="transaction-card">
  <div class="transaction-row-last">
    <span class="transaction-label">Trade ID</span>
    <span class="transaction-value">%TRADE_ID%</span>
  </div>
</div>

<div class="info-card">
  <div class="info-card-title">Resolution Message</div>
  <div class="info-card-content">%RESOLUTION_MESSAGE%</div>
</div>

<div class="alert alert-info">
  Please review the resolution and follow any necessary steps. Contact support if you need further assistance.
</div>`,
    smsBody: `Update on dispute for trade %TRADE_ID%. Check dashboard for resolution details.`,
    pushBody: `There is an update on your P2P trade dispute. Trade ID: %TRADE_ID%. Resolution message available. Please review and follow any required steps.`,
    shortCodes: ["PARTICIPANT_NAME", "TRADE_ID", "RESOLUTION_MESSAGE"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 43,
    name: "P2PDisputeResolving",
    subject: "Your P2P Trade Dispute is Being Resolved",
    emailBody: `
<h1>Dispute Under Review</h1>
<p>Dear %PARTICIPANT_NAME%,</p>
<p>Your trade dispute is currently being reviewed by our team.</p>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Trade ID</span>
    <span class="transaction-value">%TRADE_ID%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Status</span>
    <span class="transaction-value">Under Review</span>
  </div>
</div>

<div class="alert alert-info">
  Our team is working diligently to resolve this issue. We appreciate your patience and will update you soon.
</div>`,
    smsBody: `Your dispute for trade %TRADE_ID% is under review. We will update you soon.`,
    pushBody: `Your P2P trade dispute for Trade ID: %TRADE_ID% is currently being reviewed by our team. We appreciate your patience and will update you soon.`,
    shortCodes: ["PARTICIPANT_NAME", "TRADE_ID"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 44,
    name: "P2PDisputeClosing",
    subject: "Closure of Your P2P Trade Dispute",
    emailBody: `
<h1>Dispute Closed</h1>
<p>Dear %PARTICIPANT_NAME%,</p>
<p>The dispute for your trade has been closed.</p>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Trade ID</span>
    <span class="transaction-value">%TRADE_ID%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Status</span>
    <span class="transaction-value">Closed</span>
  </div>
</div>

<div class="alert alert-success">
  We hope the resolution was satisfactory. If you have further questions, please contact our support team.
</div>`,
    smsBody: `Dispute for trade %TRADE_ID% has been closed. Check dashboard for details.`,
    pushBody: `The dispute for your P2P trade has been closed. Trade ID: %TRADE_ID%. We hope the resolution was satisfactory. Contact support for questions.`,
    shortCodes: ["PARTICIPANT_NAME", "TRADE_ID"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 45,
    name: "P2PTradeCompletion",
    subject: "Confirmation of Completed P2P Trade",
    emailBody: `
<h1>Trade Completed Successfully!</h1>
<p>Dear %SELLER_NAME%,</p>
<p>Your P2P trade has been completed successfully.</p>

<div class="highlight-box">
  <div class="highlight-label">Amount Traded</div>
  <div class="highlight-value" style="color: #34d399;">%AMOUNT% %CURRENCY%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Trade ID</span>
    <span class="transaction-value">%TRADE_ID%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Buyer</span>
    <span class="transaction-value">%BUYER_NAME%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Status</span>
    <span class="transaction-value">Completed</span>
  </div>
</div>

<div class="alert alert-success">
  Thank you for using our P2P platform. We look forward to serving you again!
</div>`,
    smsBody: `P2P trade %TRADE_ID% completed! %AMOUNT% %CURRENCY% traded with %BUYER_NAME%.`,
    pushBody: `Your P2P trade has been completed successfully. Trade ID: %TRADE_ID%. Amount: %AMOUNT% %CURRENCY%. Buyer: %BUYER_NAME%. Thank you for trading!`,
    shortCodes: ["SELLER_NAME", "BUYER_NAME", "AMOUNT", "CURRENCY", "TRADE_ID"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 46,
    name: "P2PTradeCancellation",
    subject: "Cancellation of Your P2P Trade",
    emailBody: `
<h1>Trade Cancelled</h1>
<p>Dear %PARTICIPANT_NAME%,</p>
<p>Your P2P trade has been cancelled.</p>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Trade ID</span>
    <span class="transaction-value">%TRADE_ID%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Status</span>
    <span class="transaction-value">Cancelled</span>
  </div>
</div>

<div class="alert alert-info">
  If you have any questions about this cancellation, please contact our support team.
</div>`,
    smsBody: `P2P trade %TRADE_ID% has been cancelled. Contact support if you have questions.`,
    pushBody: `Your P2P trade has been cancelled. Trade ID: %TRADE_ID%. If you have any questions about this cancellation, please contact our support team.`,
    shortCodes: ["PARTICIPANT_NAME", "TRADE_ID"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 47,
    name: "P2PTradePaymentConfirmation",
    subject: "Payment Confirmation for Your P2P Trade",
    emailBody: `
<h1>Payment Marked as Sent</h1>
<p>Dear %SELLER_NAME%,</p>
<p><strong>%BUYER_NAME%</strong> has marked the payment as sent for your trade.</p>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Trade ID</span>
    <span class="transaction-value">%TRADE_ID%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Transaction ID</span>
    <span class="transaction-value">%TRANSACTION_ID%</span>
  </div>
</div>

<div class="alert alert-warning">
  Please verify that you have received the payment before releasing the crypto. Only release funds after confirming the payment in your account.
</div>`,
    smsBody: `%BUYER_NAME% marked payment sent for trade %TRADE_ID%. Verify before releasing.`,
    pushBody: `%BUYER_NAME% has marked payment as sent for trade %TRADE_ID%. Transaction: %TRANSACTION_ID%. Verify payment receipt before releasing crypto.`,
    shortCodes: ["SELLER_NAME", "BUYER_NAME", "TRADE_ID", "TRANSACTION_ID"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 48,
    name: "P2PReviewNotification",
    subject: "New Review for Your P2P Offer",
    emailBody: `
<h1>New Review Received!</h1>
<p>Dear %SELLER_NAME%,</p>
<p>You have received a new review for your P2P offer.</p>

<div class="highlight-box">
  <div class="highlight-label">Rating</div>
  <div class="highlight-value">%RATING%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Offer ID</span>
    <span class="transaction-value">%OFFER_ID%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Reviewer</span>
    <span class="transaction-value">%REVIEWER_NAME%</span>
  </div>
</div>

<div class="info-card">
  <div class="info-card-title">Comment</div>
  <div class="info-card-content">%COMMENT%</div>
</div>

<div class="alert alert-success">
  Thank you for providing quality service on our platform!
</div>`,
    smsBody: `New %RATING% star review from %REVIEWER_NAME% on offer %OFFER_ID%.`,
    pushBody: `You received a new review on your P2P offer. Offer ID: %OFFER_ID%. Rating: %RATING%. Reviewer: %REVIEWER_NAME%. Thank you for quality service!`,
    shortCodes: [
      "SELLER_NAME",
      "OFFER_ID",
      "REVIEWER_NAME",
      "RATING",
      "COMMENT",
    ],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 49,
    name: "P2POfferAmountDepletion",
    subject: "Notification of Offer Amount Depletion",
    emailBody: `
<h1>Low Offer Balance Alert</h1>
<p>Dear %SELLER_NAME%,</p>
<p>The available amount for your P2P offer is running low.</p>

<div class="highlight-box">
  <div class="highlight-label">Remaining Amount</div>
  <div class="highlight-value" style="color: #fbbf24;">%CURRENT_AMOUNT% %CURRENCY%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row-last">
    <span class="transaction-label">Offer ID</span>
    <span class="transaction-value">%OFFER_ID%</span>
  </div>
</div>

<div class="alert alert-warning">
  Consider topping up your offer to continue trading without interruption.
</div>`,
    smsBody: `Low balance alert: Offer %OFFER_ID% has %CURRENT_AMOUNT% %CURRENCY% remaining.`,
    pushBody: `Your P2P offer balance is running low. Offer ID: %OFFER_ID%. Remaining: %CURRENT_AMOUNT% %CURRENCY%. Consider topping up to continue trading.`,
    shortCodes: ["SELLER_NAME", "OFFER_ID", "CURRENT_AMOUNT", "CURRENCY"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 50,
    name: "OTPTokenVerification",
    subject: "Your Two-Factor Authentication Code",
    emailBody: `
<h1>Two-Factor Authentication</h1>
<p>Dear %FIRSTNAME%,</p>
<p>You've requested a two-factor authentication code. Use the code below to complete your verification:</p>

<div class="highlight-box">
  <div class="highlight-label">Your Verification Code</div>
  <div class="highlight-value">%TOKEN%</div>
</div>

<div class="alert alert-warning">
  This code will expire in <strong>5 minutes</strong> for security reasons.
</div>

<div class="info-card">
  <div class="info-card-title">Security Tip</div>
  <div class="info-card-content">Never share this code with anyone. Our team will never ask for your authentication codes. If you did not request this code, please contact our support team immediately.</div>
</div>`,
    smsBody: `Your 2FA code is %TOKEN%. Expires in 5 minutes. Do not share this code.`,
    pushBody: `Your two-factor authentication code is %TOKEN%. This code expires in 5 minutes. Never share this code with anyone including support staff.`,
    shortCodes: ["FIRSTNAME", "TOKEN"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 51,
    name: "LiquidationWarning",
    subject: "Warning: Position at Risk of Liquidation",
    emailBody: `
<h1>Liquidation Warning</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your position in <strong>%SYMBOL%</strong> is at risk of liquidation. Immediate action is required.</p>

<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-value">%ENTRY_PRICE%</div>
    <div class="stat-label">Entry Price</div>
  </div>
  <div class="stat-card">
    <div class="stat-value" style="color: #f87171;">%CURRENT_PRICE%</div>
    <div class="stat-label">Current Price</div>
  </div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Symbol</span>
    <span class="transaction-value">%SYMBOL%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Leverage</span>
    <span class="transaction-value">%LEVERAGE%x</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Current Margin</span>
    <span class="transaction-value">%MARGIN%</span>
  </div>
</div>

<div class="alert alert-error">
  <strong>Action Required:</strong> Add margin or close your position to avoid liquidation.
</div>`,
    smsBody: `URGENT: %SYMBOL% at risk of liquidation. Current: %CURRENT_PRICE%. Add margin or close position now.`,
    pushBody: `Liquidation Warning: Your %SYMBOL% position is at risk. Current price: %CURRENT_PRICE%. Add margin or close your position to avoid liquidation.`,
    shortCodes: [
      "FIRSTNAME",
      "SYMBOL",
      "MARGIN",
      "LEVERAGE",
      "ENTRY_PRICE",
      "CURRENT_PRICE",
    ],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 52,
    name: "LiquidationNotification",
    subject: "Notification: Position Liquidated",
    emailBody: `
<h1>Position Liquidated</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your position in <strong>%SYMBOL%</strong> has been liquidated due to insufficient margin.</p>

<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-value">%ENTRY_PRICE%</div>
    <div class="stat-label">Entry Price</div>
  </div>
  <div class="stat-card">
    <div class="stat-value" style="color: #f87171;">%CURRENT_PRICE%</div>
    <div class="stat-label">Liquidation Price</div>
  </div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Symbol</span>
    <span class="transaction-value">%SYMBOL%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Leverage</span>
    <span class="transaction-value">%LEVERAGE%x</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Status</span>
    <span class="transaction-value" style="color: #f87171;">Liquidated</span>
  </div>
</div>

<div class="alert alert-info">
  We encourage you to review your trading strategy and consider adjustments to manage your risk in future trades.
</div>`,
    smsBody: `Your %SYMBOL% position has been liquidated. Entry: %ENTRY_PRICE%, Liquidation: %CURRENT_PRICE%.`,
    pushBody: `Position Liquidated: Your %SYMBOL% position has been liquidated due to insufficient margin. Review your trading strategy.`,
    shortCodes: [
      "FIRSTNAME",
      "SYMBOL",
      "LEVERAGE",
      "ENTRY_PRICE",
      "CURRENT_PRICE",
    ],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 53,
    name: "PartialLiquidationNotification",
    subject: "Notification: Partial Position Liquidation",
    emailBody: `
<h1>Partial Position Liquidated</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Part of your position in <strong>%SYMBOL%</strong> has been liquidated to protect your remaining margin.</p>

<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-value">%ENTRY_PRICE%</div>
    <div class="stat-label">Entry Price</div>
  </div>
  <div class="stat-card">
    <div class="stat-value" style="color: #fbbf24;">%CURRENT_PRICE%</div>
    <div class="stat-label">Current Price</div>
  </div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Symbol</span>
    <span class="transaction-value">%SYMBOL%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Leverage</span>
    <span class="transaction-value">%LEVERAGE%x</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Status</span>
    <span class="transaction-value" style="color: #fbbf24;">Partially Liquidated</span>
  </div>
</div>

<div class="alert alert-warning">
  Please review your remaining position and take any necessary actions to manage your risk.
</div>`,
    smsBody: `Part of your %SYMBOL% position was liquidated. Review remaining position and manage risk.`,
    pushBody: `Partial Liquidation: Part of your %SYMBOL% position has been liquidated to protect remaining margin. Please review your position.`,
    shortCodes: [
      "FIRSTNAME",
      "SYMBOL",
      "LEVERAGE",
      "ENTRY_PRICE",
      "CURRENT_PRICE",
    ],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 54,
    name: "AccountDeletionConfirmation",
    subject: "Confirm Account Deletion",
    emailBody: `
<h1>Account Deletion Request</h1>
<p>Dear %FIRSTNAME%,</p>
<p>We have received a request to permanently delete your account. This action cannot be undone.</p>

<div class="highlight-box">
  <div class="highlight-label">Confirmation Code</div>
  <div class="highlight-value">%TOKEN%</div>
</div>

<div class="alert alert-error">
  <strong>Warning:</strong> Once deleted, all your data including wallet balances, trading history, and account information will be permanently removed.
</div>

<div class="info-card">
  <div class="info-card-title">Not You?</div>
  <div class="info-card-content">If you did not make this request, please ignore this email and your account will remain active. Consider changing your password for security.</div>
</div>`,
    smsBody: `Account deletion requested. Code: %TOKEN%. Ignore if not you. Data will be permanently lost.`,
    pushBody: `Account deletion requested. Your confirmation code is %TOKEN%. If this wasn't you, please secure your account immediately.`,
    shortCodes: ["FIRSTNAME", "TOKEN"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 55,
    name: "AccountDeletionConfirmed",
    subject: "Account Deleted Successfully",
    emailBody: `
<h1>Account Deleted</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your account has been successfully deleted as requested.</p>

<div class="transaction-card">
  <div class="transaction-row-last">
    <span class="transaction-label">Status</span>
    <span class="transaction-value">Deleted</span>
  </div>
</div>

<div class="alert alert-info">
  We're sorry to see you go. If this was a mistake or you change your mind, please contact our support team within 30 days and we may be able to help restore your account.
</div>

<p>Thank you for being a part of our community. We hope to see you again in the future.</p>`,
    smsBody: `Your account has been deleted. Contact support within 30 days if this was a mistake.`,
    pushBody: `Your account has been successfully deleted. Contact support within 30 days if you wish to restore it.`,
    shortCodes: ["FIRSTNAME"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 56,
    name: "EcoWithdrawalConfirmation",
    subject: "Your Withdrawal is Successful",
    emailBody: `
<h1>Withdrawal Successful!</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your withdrawal has been successfully processed and sent to the blockchain.</p>

<div class="highlight-box">
  <div class="highlight-label">Amount Withdrawn</div>
  <div class="highlight-value">%AMOUNT% %CURRENCY%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Transaction ID</span>
    <span class="transaction-value">%TRANSACTION_ID%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Network</span>
    <span class="transaction-value">%CHAIN%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">To Address</span>
    <span class="transaction-value" style="font-size: 12px; word-break: break-all;">%TO_ADDRESS%</span>
  </div>
</div>

<div class="alert alert-success">
  Your funds are on the way! Please allow some time for network confirmations.
</div>`,
    smsBody: `Withdrawal of %AMOUNT% %CURRENCY% successful. TxID: %TRANSACTION_ID%. Funds on the way.`,
    pushBody: `Withdrawal successful: %AMOUNT% %CURRENCY% sent via %CHAIN%. Allow time for network confirmations.`,
    shortCodes: [
      "FIRSTNAME",
      "AMOUNT",
      "CURRENCY",
      "TO_ADDRESS",
      "TRANSACTION_ID",
      "CHAIN",
    ],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 57,
    name: "EcoWithdrawalFailed",
    subject: "Your Withdrawal Failed",
    emailBody: `
<h1>Withdrawal Failed</h1>
<p>Dear %FIRSTNAME%,</p>
<p>We regret to inform you that your withdrawal could not be processed.</p>

<div class="highlight-box">
  <div class="highlight-label">Attempted Amount</div>
  <div class="highlight-value" style="color: #f87171;">%AMOUNT% %CURRENCY%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">To Address</span>
    <span class="transaction-value" style="font-size: 12px; word-break: break-all;">%TO_ADDRESS%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Status</span>
    <span class="transaction-value" style="color: #f87171;">Failed</span>
  </div>
</div>

<div class="alert alert-error">
  <strong>Reason:</strong> %REASON%
</div>

<div class="info-card">
  <div class="info-card-title">What Now?</div>
  <div class="info-card-content">The withdrawn amount has been returned to your account. You can try again or contact our support team if the issue persists.</div>
</div>`,
    smsBody: `Withdrawal of %AMOUNT% %CURRENCY% failed. Reason: %REASON%. Funds returned to account.`,
    pushBody: `Withdrawal failed: %AMOUNT% %CURRENCY% could not be processed. Funds have been returned to your account.`,
    shortCodes: ["FIRSTNAME", "AMOUNT", "CURRENCY", "TO_ADDRESS", "REASON"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 58,
    name: "IcoOfferingApproved",
    subject: "Your ICO Offering Has Been Approved",
    emailBody: `
<h1>ICO Offering Approved!</h1>
<p>Dear %PROJECT_OWNER_NAME%,</p>
<p>Congratulations! Your ICO offering has been approved by our admin team.</p>

<div class="highlight-box">
  <div class="highlight-label">Offering</div>
  <div class="highlight-value" style="color: #34d399;">%OFFERING_NAME%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Status</span>
    <span class="transaction-value" style="color: #34d399;">Approved</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Approval Date</span>
    <span class="transaction-value">%APPROVED_AT%</span>
  </div>
</div>

<div class="alert alert-success">
  Your offering is now live! Log in to your dashboard to manage your ICO and track investments.
</div>`,
    smsBody: `Your ICO offering %OFFERING_NAME% has been approved! Your offering is now live.`,
    pushBody: `ICO Approved: Your offering %OFFERING_NAME% is now live. Log in to manage your ICO and track investments.`,
    shortCodes: ["PROJECT_OWNER_NAME", "OFFERING_NAME", "APPROVED_AT"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 59,
    name: "IcoOfferingRejected",
    subject: "Your ICO Offering Has Been Rejected",
    emailBody: `
<h1>ICO Offering Rejected</h1>
<p>Dear %PROJECT_OWNER_NAME%,</p>
<p>We regret to inform you that your ICO offering has been rejected.</p>

<div class="highlight-box">
  <div class="highlight-label">Offering</div>
  <div class="highlight-value">%OFFERING_NAME%</div>
</div>

<div class="alert alert-error">
  <strong>Rejection Reason:</strong><br>
  %REJECTION_REASON%
</div>

<div class="info-card">
  <div class="info-card-title">What's Next?</div>
  <div class="info-card-content">Please review the feedback above and make necessary adjustments. You may resubmit your offering after addressing the issues. Contact our support team if you have any questions.</div>
</div>`,
    smsBody: `Your ICO offering %OFFERING_NAME% was rejected. Review feedback and resubmit if needed.`,
    pushBody: `ICO Rejected: Your offering %OFFERING_NAME% has been rejected. Please review the feedback and make adjustments.`,
    shortCodes: ["PROJECT_OWNER_NAME", "OFFERING_NAME", "REJECTION_REASON"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 60,
    name: "IcoOfferingFlagged",
    subject: "Your ICO Offering Has Been Flagged for Review",
    emailBody: `
<h1>ICO Offering Flagged</h1>
<p>Dear %PROJECT_OWNER_NAME%,</p>
<p>Your ICO offering has been flagged for further review by our compliance team.</p>

<div class="highlight-box">
  <div class="highlight-label">Offering</div>
  <div class="highlight-value">%OFFERING_NAME%</div>
</div>

<div class="alert alert-warning">
  <strong>Flag Reason:</strong><br>
  %FLAG_REASON%
</div>

<div class="info-card">
  <div class="info-card-title">Important</div>
  <div class="info-card-content">Your offering is temporarily under review. Please contact support immediately if you need clarification or wish to provide additional documentation.</div>
</div>`,
    smsBody: `Your ICO offering %OFFERING_NAME% has been flagged for review. Contact support for info.`,
    pushBody: `ICO Flagged: Your offering %OFFERING_NAME% is under compliance review. Contact support for clarification.`,
    shortCodes: ["PROJECT_OWNER_NAME", "OFFERING_NAME", "FLAG_REASON"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 61,
    name: "IcoInvestmentConfirmed",
    subject: "Investment Confirmation for %OFFERING_NAME%",
    emailBody: `
<h1>Investment Confirmed!</h1>
<p>Dear %INVESTOR_NAME%,</p>
<p>Thank you for investing in <strong>%OFFERING_NAME%</strong>. Your investment has been confirmed.</p>

<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-value">$%AMOUNT_INVESTED%</div>
    <div class="stat-label">Amount Invested</div>
  </div>
  <div class="stat-card">
    <div class="stat-value" style="color: #34d399;">%TOKEN_AMOUNT%</div>
    <div class="stat-label">Tokens Received</div>
  </div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Offering</span>
    <span class="transaction-value">%OFFERING_NAME%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Token Price</span>
    <span class="transaction-value">$%TOKEN_PRICE%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Transaction ID</span>
    <span class="transaction-value">%TRANSACTION_ID%</span>
  </div>
</div>

<div class="alert alert-success">
  Your tokens have been added to your portfolio. View your updated holdings on your dashboard.
</div>`,
    smsBody: `Investment confirmed in %OFFERING_NAME%: $%AMOUNT_INVESTED% for %TOKEN_AMOUNT% tokens.`,
    pushBody: `Investment Confirmed: You invested $%AMOUNT_INVESTED% in %OFFERING_NAME% and received %TOKEN_AMOUNT% tokens.`,
    shortCodes: [
      "INVESTOR_NAME",
      "OFFERING_NAME",
      "AMOUNT_INVESTED",
      "TOKEN_AMOUNT",
      "TOKEN_PRICE",
      "TRANSACTION_ID",
    ],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 62,
    name: "IcoLaunchApplicationSubmitted",
    subject: "Your ICO Launch Application Has Been Received",
    emailBody: `
<h1>Application Received</h1>
<p>Dear %PROJECT_OWNER_NAME%,</p>
<p>Your ICO launch application has been successfully submitted.</p>

<div class="highlight-box">
  <div class="highlight-label">Project Name</div>
  <div class="highlight-value">%PROJECT_NAME%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Status</span>
    <span class="transaction-value">Under Review</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Estimated Review Time</span>
    <span class="transaction-value">%ESTIMATED_REVIEW_TIME%</span>
  </div>
</div>

<div class="alert alert-info">
  Our team will review your application and get back to you shortly. You'll receive an email once the review is complete.
</div>`,
    smsBody: `ICO application for %PROJECT_NAME% received. Under review. Estimated: %ESTIMATED_REVIEW_TIME%.`,
    pushBody: `ICO Application Received: Your project %PROJECT_NAME% is under review. You'll be notified once complete.`,
    shortCodes: ["PROJECT_OWNER_NAME", "PROJECT_NAME", "ESTIMATED_REVIEW_TIME"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 63,
    name: "IcoOfferingUnflagged",
    subject: "Your ICO Offering Has Been Unflagged",
    emailBody: `
<h1>Offering Status Restored</h1>
<p>Dear %PROJECT_OWNER_NAME%,</p>
<p>Good news! Your ICO offering has been unflagged and is now back to its normal status.</p>

<div class="highlight-box">
  <div class="highlight-label">Offering</div>
  <div class="highlight-value" style="color: #34d399;">%OFFERING_NAME%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Status</span>
    <span class="transaction-value" style="color: #34d399;">Active</span>
  </div>
</div>

<div class="alert alert-success">
  Your offering is now fully operational. Thank you for your cooperation during the review process.
</div>`,
    smsBody: `Your ICO offering %OFFERING_NAME% has been unflagged and is now active again.`,
    pushBody: `ICO Unflagged: Your offering %OFFERING_NAME% is now fully operational. Thank you for your cooperation.`,
    shortCodes: ["PROJECT_OWNER_NAME", "OFFERING_NAME"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 64,
    name: "IcoInvestmentOccurredBuyer",
    subject: "Your Investment in %OFFERING_NAME% is Confirmed",
    emailBody: `
<h1>Investment Processed!</h1>
<p>Dear %INVESTOR_NAME%,</p>
<p>Your investment in <strong>%OFFERING_NAME%</strong> has been successfully processed.</p>

<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-value">$%AMOUNT_INVESTED%</div>
    <div class="stat-label">Invested</div>
  </div>
  <div class="stat-card">
    <div class="stat-value" style="color: #34d399;">%TOKEN_AMOUNT%</div>
    <div class="stat-label">Tokens</div>
  </div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Token Price</span>
    <span class="transaction-value">$%TOKEN_PRICE%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Transaction ID</span>
    <span class="transaction-value">%TRANSACTION_ID%</span>
  </div>
</div>

<div class="alert alert-success">
  Thank you for investing with us! Your tokens are now in your portfolio.
</div>`,
    smsBody: `Investment processed: $%AMOUNT_INVESTED% in %OFFERING_NAME%. Tokens now in your portfolio.`,
    pushBody: `Investment Processed: You invested $%AMOUNT_INVESTED% in %OFFERING_NAME%. Your tokens are now in your portfolio.`,
    shortCodes: [
      "INVESTOR_NAME",
      "OFFERING_NAME",
      "AMOUNT_INVESTED",
      "TOKEN_AMOUNT",
      "TOKEN_PRICE",
      "TRANSACTION_ID",
    ],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 65,
    name: "IcoInvestmentOccurredSeller",
    subject: "New Investment in Your ICO Offering: %OFFERING_NAME%",
    emailBody: `
<h1>New Investment Received!</h1>
<p>Dear %SELLER_NAME%,</p>
<p>A new investment has been made in your ICO offering.</p>

<div class="highlight-box">
  <div class="highlight-label">Investment Amount</div>
  <div class="highlight-value" style="color: #34d399;">$%AMOUNT_INVESTED%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Offering</span>
    <span class="transaction-value">%OFFERING_NAME%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Investor</span>
    <span class="transaction-value">%INVESTOR_NAME%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Tokens Purchased</span>
    <span class="transaction-value">%TOKEN_AMOUNT%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Transaction ID</span>
    <span class="transaction-value">%TRANSACTION_ID%</span>
  </div>
</div>

<div class="alert alert-success">
  Congratulations on the new investment! Log in to your dashboard for more details.
</div>`,
    smsBody: `New investment in %OFFERING_NAME%: $%AMOUNT_INVESTED% from %INVESTOR_NAME%. Check dashboard.`,
    pushBody: `New Investment: %INVESTOR_NAME% invested $%AMOUNT_INVESTED% in %OFFERING_NAME%. Check your dashboard for details.`,
    shortCodes: [
      "SELLER_NAME",
      "OFFERING_NAME",
      "INVESTOR_NAME",
      "AMOUNT_INVESTED",
      "TOKEN_AMOUNT",
      "TRANSACTION_ID",
    ],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 66,
    name: "TransactionVerifiedBuyer",
    subject: "Your Transaction for %OFFERING_NAME% Has Been Verified",
    emailBody: `
<h1>Transaction Verified!</h1>
<p>Dear %INVESTOR_NAME%,</p>
<p>Your transaction for <strong>%OFFERING_NAME%</strong> has been successfully verified.</p>

<div class="highlight-box">
  <div class="highlight-label">Amount</div>
  <div class="highlight-value" style="color: #34d399;">$%AMOUNT%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Transaction ID</span>
    <span class="transaction-value">%TRANSACTION_ID%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Status</span>
    <span class="transaction-value" style="color: #34d399;">Verified</span>
  </div>
</div>

%NOTE%

<div class="alert alert-success">
  Your transaction has been processed. Check your dashboard for your updated portfolio.
</div>`,
    shortCodes: [
      "INVESTOR_NAME",
      "OFFERING_NAME",
      "TRANSACTION_ID",
      "AMOUNT",
      "NOTE",
    ],
    smsBody: `Transaction verified for %OFFERING_NAME%: $%AMOUNT%. Check your portfolio.`,
    pushBody: `Transaction Verified: Your $%AMOUNT% transaction for %OFFERING_NAME% has been verified. Check your dashboard.`,
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 67,
    name: "TransactionVerifiedSeller",
    subject: "Transaction for %OFFERING_NAME% Verified",
    emailBody: `
<h1>Transaction Verified!</h1>
<p>Dear %SELLER_NAME%,</p>
<p>A transaction for your offering <strong>%OFFERING_NAME%</strong> has been verified and funds have been released.</p>

<div class="highlight-box">
  <div class="highlight-label">Amount Released</div>
  <div class="highlight-value" style="color: #34d399;">$%AMOUNT%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Transaction ID</span>
    <span class="transaction-value">%TRANSACTION_ID%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Status</span>
    <span class="transaction-value" style="color: #34d399;">Verified</span>
  </div>
</div>

%NOTE%

<div class="alert alert-success">
  Funds have been added to your account. Log in to your dashboard for more details.
</div>`,
    shortCodes: [
      "SELLER_NAME",
      "OFFERING_NAME",
      "TRANSACTION_ID",
      "AMOUNT",
      "NOTE",
    ],
    smsBody: `Transaction for %OFFERING_NAME% verified. $%AMOUNT% released to your account.`,
    pushBody: `Transaction Verified: $%AMOUNT% released for %OFFERING_NAME%. Funds added to your account.`,
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 68,
    name: "TransactionRejectedBuyer",
    subject: "Your Transaction for %OFFERING_NAME% Has Been Rejected",
    emailBody: `
<h1>Transaction Rejected</h1>
<p>Dear %INVESTOR_NAME%,</p>
<p>We regret to inform you that your transaction for <strong>%OFFERING_NAME%</strong> has been rejected.</p>

<div class="highlight-box">
  <div class="highlight-label">Amount</div>
  <div class="highlight-value">$%AMOUNT%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Transaction ID</span>
    <span class="transaction-value">%TRANSACTION_ID%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Status</span>
    <span class="transaction-value" style="color: #f87171;">Rejected</span>
  </div>
</div>

<div class="alert alert-error">
  <strong>Reason:</strong> %NOTE%
</div>

<div class="info-card">
  <div class="info-card-title">Need Help?</div>
  <div class="info-card-content">Please contact our support team if you have any questions about this rejection.</div>
</div>`,
    shortCodes: [
      "INVESTOR_NAME",
      "OFFERING_NAME",
      "TRANSACTION_ID",
      "AMOUNT",
      "NOTE",
    ],
    smsBody: `Transaction rejected for %OFFERING_NAME%: $%AMOUNT%. Contact support for help.`,
    pushBody: `Transaction Rejected: Your $%AMOUNT% transaction for %OFFERING_NAME% was rejected. Contact support for details.`,
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 69,
    name: "TransactionRejectedSeller",
    subject: "Transaction for %OFFERING_NAME% Rejected",
    emailBody: `
<h1>Transaction Rejected</h1>
<p>Dear %SELLER_NAME%,</p>
<p>A transaction for your offering <strong>%OFFERING_NAME%</strong> has been rejected.</p>

<div class="highlight-box">
  <div class="highlight-label">Amount</div>
  <div class="highlight-value">$%AMOUNT%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Transaction ID</span>
    <span class="transaction-value">%TRANSACTION_ID%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Status</span>
    <span class="transaction-value" style="color: #f87171;">Rejected</span>
  </div>
</div>

<div class="alert alert-warning">
  <strong>Note:</strong> %NOTE%
</div>

<p>Please review your offering details on your dashboard for more information.</p>`,
    shortCodes: [
      "SELLER_NAME",
      "OFFERING_NAME",
      "TRANSACTION_ID",
      "AMOUNT",
      "NOTE",
    ],
    smsBody: `Transaction for %OFFERING_NAME% rejected: $%AMOUNT%. Review dashboard for details.`,
    pushBody: `Transaction Rejected: A $%AMOUNT% transaction for %OFFERING_NAME% was rejected. See dashboard for details.`,
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 70,
    name: "TransactionNoteAddedBuyer",
    subject: "Note Added to Your Transaction for %OFFERING_NAME%",
    emailBody: `
<h1>Transaction Note Added</h1>
<p>Dear %INVESTOR_NAME%,</p>
<p>A note has been added to your transaction for <strong>%OFFERING_NAME%</strong>.</p>

<div class="transaction-card">
  <div class="transaction-row-last">
    <span class="transaction-label">Transaction ID</span>
    <span class="transaction-value">%TRANSACTION_ID%</span>
  </div>
</div>

<div class="info-card">
  <div class="info-card-title">Note</div>
  <div class="info-card-content">%NOTE%</div>
</div>

<div class="alert alert-info">
  Please review this note in your transaction details on your dashboard.
</div>`,
    shortCodes: ["INVESTOR_NAME", "OFFERING_NAME", "TRANSACTION_ID", "NOTE"],
    smsBody: `Note added to your %OFFERING_NAME% transaction. Check dashboard for details.`,
    pushBody: `Transaction Note Added: A note has been added to your transaction for %OFFERING_NAME%. Check your dashboard.`,
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 71,
    name: "TransactionNoteAddedSeller",
    subject: "Note Added to a Transaction for %OFFERING_NAME%",
    emailBody: `
<h1>Transaction Note Added</h1>
<p>Dear %SELLER_NAME%,</p>
<p>A note has been added to a transaction for your offering <strong>%OFFERING_NAME%</strong>.</p>

<div class="transaction-card">
  <div class="transaction-row-last">
    <span class="transaction-label">Transaction ID</span>
    <span class="transaction-value">%TRANSACTION_ID%</span>
  </div>
</div>

<div class="info-card">
  <div class="info-card-title">Note</div>
  <div class="info-card-content">%NOTE%</div>
</div>

<div class="alert alert-info">
  Check your dashboard for more details about this transaction.
</div>`,
    shortCodes: ["SELLER_NAME", "OFFERING_NAME", "TRANSACTION_ID", "NOTE"],
    smsBody: `Note added to %OFFERING_NAME% transaction. Check dashboard for details.`,
    pushBody: `Transaction Note Added: A note was added to a transaction for %OFFERING_NAME%. Check your dashboard.`,
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 72,
    name: "TransactionNoteRemovedBuyer",
    subject: "Note Removed from Your Transaction for %OFFERING_NAME%",
    emailBody: `
<h1>Transaction Note Removed</h1>
<p>Dear %INVESTOR_NAME%,</p>
<p>The note on your transaction for <strong>%OFFERING_NAME%</strong> has been removed.</p>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Transaction ID</span>
    <span class="transaction-value">%TRANSACTION_ID%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Note Status</span>
    <span class="transaction-value">Removed</span>
  </div>
</div>

<div class="alert alert-info">
  Please review your transaction details for updated information.
</div>`,
    shortCodes: ["INVESTOR_NAME", "OFFERING_NAME", "TRANSACTION_ID"],
    smsBody: `Note removed from your %OFFERING_NAME% transaction. See updated details on dashboard.`,
    pushBody: `Transaction Note Removed: The note on your %OFFERING_NAME% transaction has been removed.`,
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 73,
    name: "TransactionNoteRemovedSeller",
    subject: "Note Removed from a Transaction for %OFFERING_NAME%",
    emailBody: `
<h1>Transaction Note Removed</h1>
<p>Dear %SELLER_NAME%,</p>
<p>The note on a transaction for your offering <strong>%OFFERING_NAME%</strong> has been removed.</p>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Transaction ID</span>
    <span class="transaction-value">%TRANSACTION_ID%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Note Status</span>
    <span class="transaction-value">Removed</span>
  </div>
</div>

<div class="alert alert-info">
  Log in to your dashboard for more details about this transaction.
</div>`,
    shortCodes: ["SELLER_NAME", "OFFERING_NAME", "TRANSACTION_ID"],
    smsBody: `Note removed from %OFFERING_NAME% transaction. See dashboard for details.`,
    pushBody: `Transaction Note Removed: Note was removed from a %OFFERING_NAME% transaction. Check your dashboard.`,
    email: true,
    sms: true,
    push: true,
  },
  // Copy Trading Email Templates
  {
    id: 74,
    name: "CopyTradingLeaderApplicationSubmitted",
    subject: "Copy Trading Leader Application Received",
    emailBody: `
<h1>Application Received</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Thank you for applying to become a Copy Trading Leader! Your application is now under review.</p>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Display Name</span>
    <span class="transaction-value">%DISPLAY_NAME%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Submitted</span>
    <span class="transaction-value">%CREATED_AT%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Status</span>
    <span class="transaction-value" style="color: #fbbf24;">Under Review</span>
  </div>
</div>

<div class="alert alert-info">
  We'll carefully evaluate your trading history and qualifications. You'll receive an email notification once reviewed. This typically takes 1-3 business days.
</div>`,
    shortCodes: ["FIRSTNAME", "DISPLAY_NAME", "CREATED_AT"],
    smsBody: `Copy Trading Leader application received. Under review (1-3 days). We'll notify you soon.`,
    pushBody: `Leader Application Received: Your Copy Trading Leader application is under review. You'll be notified once reviewed.`,
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 75,
    name: "CopyTradingLeaderApplicationApproved",
    subject: "Congratulations! Your Copy Trading Leader Application has been Approved",
    emailBody: `
<h1>Application Approved!</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Great news! Your application to become a Copy Trading Leader has been <strong>approved</strong>!</p>

<div class="highlight-box">
  <div class="highlight-label">Status</div>
  <div class="highlight-value" style="color: #34d399;">Approved</div>
</div>

<div class="info-card">
  <div class="info-card-title">Next Steps</div>
  <div class="info-card-content">
    1. Complete your leader profile with trading strategies and risk information<br>
    2. Set your profit share percentage<br>
    3. Start trading - your trades will be visible to potential followers
  </div>
</div>

<p style="text-align: center;">
  <a href="%URL%/copy-trading/leader/dashboard" class="btn">Go to Leader Dashboard</a>
</p>

<div class="alert alert-success">
  You can now start building your follower base and earning profit share from successful trades!
</div>`,
    shortCodes: ["FIRSTNAME", "URL"],
    smsBody: `Congratulations! Your Copy Trading Leader application is approved. Start building followers!`,
    pushBody: `Leader Approved: Your Copy Trading Leader application is approved! Complete your profile and start earning.`,
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 76,
    name: "CopyTradingLeaderApplicationRejected",
    subject: "Copy Trading Leader Application Update",
    emailBody: `
<h1>Application Not Approved</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Thank you for your interest in becoming a Copy Trading Leader. After careful review, we are unable to approve your application at this time.</p>

<div class="alert alert-error">
  <strong>Reason:</strong><br>
  %REJECTION_REASON%
</div>

<div class="info-card">
  <div class="info-card-title">Eligibility Requirements</div>
  <div class="info-card-content">
    You may reapply in the future once you meet these requirements:<br><br>
    - Sufficient trading history on the platform<br>
    - A verified account with completed KYC<br>
    - A positive trading track record
  </div>
</div>

<div class="alert alert-info">
  If you have questions, please contact our support team.
</div>`,
    shortCodes: ["FIRSTNAME", "REJECTION_REASON"],
    smsBody: `Your Copy Trading Leader application was not approved. You may reapply later.`,
    pushBody: `Leader Application Update: Your application was not approved. Review feedback and reapply when eligible.`,
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 77,
    name: "CopyTradingLeaderSuspended",
    subject: "Important: Your Copy Trading Leader Account has been Suspended",
    emailBody: `
<h1>Account Suspended</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your Copy Trading Leader account has been suspended.</p>

<div class="alert alert-error">
  <strong>Suspension Reason:</strong><br>
  %SUSPENSION_REASON%
</div>

<div class="info-card">
  <div class="info-card-title">Impact</div>
  <div class="info-card-content">
    - Your leader profile is no longer visible to followers<br>
    - All active follower subscriptions have been paused<br>
    - You cannot accept new followers during suspension
  </div>
</div>

<div class="alert alert-warning">
  If you believe this suspension was made in error, please contact our support team immediately.
</div>`,
    shortCodes: ["FIRSTNAME", "SUSPENSION_REASON"],
    smsBody: `ALERT: Your Copy Trading Leader account has been suspended. Contact support for details.`,
    pushBody: `Leader Account Suspended: Your Copy Trading Leader account has been suspended. Contact support if you believe this is an error.`,
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 78,
    name: "CopyTradingLeaderNewFollower",
    subject: "New Follower Started Copying Your Trades!",
    emailBody: `
<h1>New Follower!</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Congratulations! You have a new follower copying your trading strategy.</p>

<div class="highlight-box">
  <div class="highlight-label">New Follower</div>
  <div class="highlight-value" style="color: #34d399;">%FOLLOWER_NAME%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Copy Mode</span>
    <span class="transaction-value">%COPY_MODE%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Started</span>
    <span class="transaction-value">%STARTED_AT%</span>
  </div>
</div>

<p style="text-align: center;">
  <a href="%URL%/copy-trading/leader/followers" class="btn">View All Followers</a>
</p>

<div class="alert alert-success">
  Continue executing your winning strategy, and you'll earn profit share from this follower's successful trades!
</div>`,
    shortCodes: ["FIRSTNAME", "FOLLOWER_NAME", "COPY_MODE", "STARTED_AT", "URL"],
    smsBody: `New follower! %FOLLOWER_NAME% started copying your trades. Keep up the great work!`,
    pushBody: `New Follower: %FOLLOWER_NAME% started copying your trades. You'll earn profit share from their successful trades!`,
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 79,
    name: "CopyTradingLeaderFollowerStopped",
    subject: "A Follower has Stopped Copying Your Trades",
    emailBody: `
<h1>Follower Stopped</h1>
<p>Dear %FIRSTNAME%,</p>
<p>One of your followers has stopped copying your trading strategy.</p>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Follower</span>
    <span class="transaction-value">%FOLLOWER_NAME%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Stopped</span>
    <span class="transaction-value">%STOPPED_AT%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Total Days Following</span>
    <span class="transaction-value">%DAYS_FOLLOWED%</span>
  </div>
</div>

<p style="text-align: center;">
  <a href="%URL%/copy-trading/leader/dashboard" class="btn btn-secondary">View Dashboard</a>
</p>

<div class="alert alert-info">
  Keep improving your trading performance to attract and retain more followers!
</div>`,
    shortCodes: ["FIRSTNAME", "FOLLOWER_NAME", "STOPPED_AT", "DAYS_FOLLOWED", "URL"],
    smsBody: `%FOLLOWER_NAME% stopped copying your trades after %DAYS_FOLLOWED% days. Review your strategy.`,
    pushBody: `Follower Left: %FOLLOWER_NAME% stopped copying your trades. Keep improving to retain followers!`,
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 80,
    name: "CopyTradingFollowerSubscriptionStarted",
    subject: "You're Now Copying %LEADER_NAME%'s Trading Strategy!",
    emailBody: `
<h1>Subscription Activated!</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your copy trading subscription has been successfully activated!</p>

<div class="highlight-box">
  <div class="highlight-label">Following</div>
  <div class="highlight-value">%LEADER_NAME%</div>
</div>

<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-value">%RISK_LEVEL%</div>
    <div class="stat-label">Risk Level</div>
  </div>
  <div class="stat-card">
    <div class="stat-value" style="color: #34d399;">%WIN_RATE%%</div>
    <div class="stat-label">Win Rate</div>
  </div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Trading Style</span>
    <span class="transaction-value">%TRADING_STYLE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Copy Mode</span>
    <span class="transaction-value">%COPY_MODE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Max Daily Loss</span>
    <span class="transaction-value">%MAX_DAILY_LOSS% USDT</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Max Position Size</span>
    <span class="transaction-value">%MAX_POSITION_SIZE% USDT</span>
  </div>
</div>

<p style="text-align: center;">
  <a href="%URL%/copy-trading/follower/subscriptions" class="btn">View Your Subscriptions</a>
</p>

<div class="alert alert-success">
  All of %LEADER_NAME%'s trades will now be automatically copied to your account based on your settings.
</div>`,
    shortCodes: ["FIRSTNAME", "LEADER_NAME", "RISK_LEVEL", "TRADING_STYLE", "WIN_RATE", "COPY_MODE", "MAX_DAILY_LOSS", "MAX_POSITION_SIZE", "URL"],
    smsBody: `Now copying %LEADER_NAME%'s trades! %WIN_RATE%% win rate. Your trades will auto-copy.`,
    pushBody: `Copy Trading Started: You're now copying %LEADER_NAME%'s trades. Their trades will be copied automatically.`,
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 81,
    name: "CopyTradingFollowerSubscriptionPaused",
    subject: "Your Copy Trading Subscription has been Paused",
    emailBody: `
<h1>Subscription Paused</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your copy trading subscription for <strong>%LEADER_NAME%</strong> has been paused.</p>

<div class="alert alert-warning">
  <strong>Reason:</strong><br>
  %PAUSE_REASON%
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Leader</span>
    <span class="transaction-value">%LEADER_NAME%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Status</span>
    <span class="transaction-value" style="color: #fbbf24;">Paused</span>
  </div>
</div>

<p style="text-align: center;">
  <a href="%URL%/copy-trading/follower/subscriptions" class="btn">Manage Subscriptions</a>
</p>

<div class="alert alert-info">
  While paused, no new trades will be copied. Your existing positions remain open. You can resume your subscription at any time from your dashboard.
</div>`,
    shortCodes: ["FIRSTNAME", "LEADER_NAME", "PAUSE_REASON", "URL"],
    smsBody: `Copy trading for %LEADER_NAME% paused. No new trades will be copied. Resume anytime.`,
    pushBody: `Subscription Paused: Copy trading for %LEADER_NAME% is paused. Resume anytime from your dashboard.`,
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 82,
    name: "CopyTradingFollowerSubscriptionResumed",
    subject: "Your Copy Trading Subscription has been Resumed",
    emailBody: `
<h1>Subscription Resumed!</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your copy trading subscription for <strong>%LEADER_NAME%</strong> has been resumed successfully!</p>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Leader</span>
    <span class="transaction-value">%LEADER_NAME%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Copy Mode</span>
    <span class="transaction-value">%COPY_MODE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Status</span>
    <span class="transaction-value" style="color: #34d399;">Active</span>
  </div>
</div>

<p style="text-align: center;">
  <a href="%URL%/copy-trading/follower/subscriptions" class="btn">View Subscriptions</a>
</p>

<div class="alert alert-success">
  New trades from %LEADER_NAME% will now be automatically copied to your account again.
</div>`,
    shortCodes: ["FIRSTNAME", "LEADER_NAME", "COPY_MODE", "URL"],
    smsBody: `Copy trading for %LEADER_NAME% resumed! New trades will be auto-copied again.`,
    pushBody: `Subscription Resumed: Copy trading for %LEADER_NAME% is active again. New trades will be copied.`,
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 83,
    name: "CopyTradingFollowerSubscriptionStopped",
    subject: "Your Copy Trading Subscription has been Stopped",
    emailBody: `
<h1>Subscription Stopped</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your copy trading subscription for <strong>%LEADER_NAME%</strong> has been stopped.</p>

<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-value">%TOTAL_TRADES%</div>
    <div class="stat-label">Total Trades</div>
  </div>
  <div class="stat-card">
    <div class="stat-value">%WIN_RATE%%</div>
    <div class="stat-label">Win Rate</div>
  </div>
  <div class="stat-card">
    <div class="stat-value">%TOTAL_PROFIT% USDT</div>
    <div class="stat-label">Total P/L</div>
  </div>
  <div class="stat-card">
    <div class="stat-value">%ROI%%</div>
    <div class="stat-label">ROI</div>
  </div>
</div>

<p style="text-align: center;">
  <a href="%URL%/copy-trading/leaders" class="btn">Browse Other Leaders</a>
</p>

<div class="alert alert-info">
  No new trades will be copied. All existing positions will remain open until you manually close them. Thank you for using our copy trading service!
</div>`,
    shortCodes: ["FIRSTNAME", "LEADER_NAME", "TOTAL_TRADES", "WIN_RATE", "TOTAL_PROFIT", "ROI", "URL"],
    smsBody: `Copy trading for %LEADER_NAME% stopped. %TOTAL_TRADES% trades, %WIN_RATE%% win rate, %TOTAL_PROFIT% USDT P/L.`,
    pushBody: `Subscription Stopped: Copy trading for %LEADER_NAME% ended. Total P/L: %TOTAL_PROFIT% USDT. Browse other leaders.`,
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 84,
    name: "CopyTradingTradeProfit",
    subject: "Great News! Your Copy Trade Closed with Profit",
    emailBody: `
<h1>Trade Profit!</h1>
<p>Dear %FIRSTNAME%,</p>
<p>A copied trade from <strong>%LEADER_NAME%</strong> has closed with profit!</p>

<div class="highlight-box">
  <div class="highlight-label">Profit</div>
  <div class="highlight-value" style="color: #34d399;">+%PROFIT% USDT</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Symbol</span>
    <span class="transaction-value">%SYMBOL%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Side</span>
    <span class="transaction-value">%SIDE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Entry Price</span>
    <span class="transaction-value">%ENTRY_PRICE%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Exit Price</span>
    <span class="transaction-value">%EXIT_PRICE%</span>
  </div>
</div>

<div class="info-card">
  <div class="info-card-title">Profit Distribution</div>
  <div class="info-card-content">
    Your Profit: %YOUR_PROFIT% USDT<br>
    Leader Profit Share (%PROFIT_SHARE_PERCENT%%): %LEADER_PROFIT_SHARE% USDT
  </div>
</div>

<p style="text-align: center;">
  <a href="%URL%/copy-trading/follower/trades" class="btn btn-success">View All Trades</a>
</p>`,
    shortCodes: ["FIRSTNAME", "LEADER_NAME", "SYMBOL", "SIDE", "ENTRY_PRICE", "EXIT_PRICE", "PROFIT", "YOUR_PROFIT", "PROFIT_SHARE_PERCENT", "LEADER_PROFIT_SHARE", "URL"],
    smsBody: `Trade profit! %SYMBOL% +%PROFIT% USDT from %LEADER_NAME%. Your share: %YOUR_PROFIT% USDT.`,
    pushBody: `Trade Profit: %SYMBOL% closed with +%PROFIT% USDT profit. Your share: %YOUR_PROFIT% USDT.`,
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 85,
    name: "CopyTradingTradeLoss",
    subject: "Copy Trade Closed with Loss",
    emailBody: `
<h1>Trade Closed</h1>
<p>Dear %FIRSTNAME%,</p>
<p>A copied trade from <strong>%LEADER_NAME%</strong> has closed with a loss.</p>

<div class="highlight-box">
  <div class="highlight-label">Loss</div>
  <div class="highlight-value" style="color: #f87171;">-%LOSS% USDT</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Symbol</span>
    <span class="transaction-value">%SYMBOL%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Side</span>
    <span class="transaction-value">%SIDE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Entry Price</span>
    <span class="transaction-value">%ENTRY_PRICE%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Exit Price</span>
    <span class="transaction-value">%EXIT_PRICE%</span>
  </div>
</div>

<p style="text-align: center;">
  <a href="%URL%/copy-trading/follower/settings/%SUBSCRIPTION_ID%" class="btn btn-secondary">Adjust Risk Settings</a>
</p>

<div class="alert alert-info">
  Remember that trading involves risk, and losses are a normal part of trading. Review your risk management settings if needed.
</div>`,
    shortCodes: ["FIRSTNAME", "LEADER_NAME", "SYMBOL", "SIDE", "ENTRY_PRICE", "EXIT_PRICE", "LOSS", "SUBSCRIPTION_ID", "URL"],
    smsBody: `Trade loss: %SYMBOL% -%LOSS% USDT from %LEADER_NAME%. Review risk settings if needed.`,
    pushBody: `Trade Loss: %SYMBOL% closed with -%LOSS% USDT loss. Consider adjusting your risk settings.`,
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 86,
    name: "CopyTradingDailyLossLimitReached",
    subject: "ALERT: Daily Loss Limit Reached - Subscription Auto-Paused",
    emailBody: `
<h1>Risk Management Alert</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your copy trading subscription for <strong>%LEADER_NAME%</strong> has been automatically paused because your daily loss limit has been reached.</p>

<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-value">%DAILY_LOSS_LIMIT% USDT</div>
    <div class="stat-label">Daily Limit</div>
  </div>
  <div class="stat-card">
    <div class="stat-value" style="color: #f87171;">-%CURRENT_LOSS% USDT</div>
    <div class="stat-label">Today's Loss</div>
  </div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Leader</span>
    <span class="transaction-value">%LEADER_NAME%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Status</span>
    <span class="transaction-value" style="color: #fbbf24;">Paused</span>
  </div>
</div>

<p style="text-align: center;">
  <a href="%URL%/copy-trading/follower/subscriptions" class="btn">Manage Subscription</a>
</p>

<div class="alert alert-warning">
  This is a protective measure to prevent further losses. Your subscription will automatically resume tomorrow, or you can manually resume it after reviewing your strategy.
</div>`,
    shortCodes: ["FIRSTNAME", "LEADER_NAME", "DAILY_LOSS_LIMIT", "CURRENT_LOSS", "URL"],
    smsBody: `ALERT: Daily loss limit reached (-%CURRENT_LOSS% USDT). Copy trading for %LEADER_NAME% paused.`,
    pushBody: `Daily Loss Limit Reached: Subscription for %LEADER_NAME% auto-paused. Lost %CURRENT_LOSS% USDT today.`,
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 87,
    name: "CopyTradingInsufficientBalance",
    subject: "Insufficient Balance to Copy Trade",
    emailBody: `
<h1>Trade Not Copied</h1>
<p>Dear %FIRSTNAME%,</p>
<p>A trade from <strong>%LEADER_NAME%</strong> could not be copied due to insufficient balance in your allocation.</p>

<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-value">%REQUIRED_AMOUNT% USDT</div>
    <div class="stat-label">Required</div>
  </div>
  <div class="stat-card">
    <div class="stat-value" style="color: #f87171;">%AVAILABLE_BALANCE% USDT</div>
    <div class="stat-label">Available</div>
  </div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Symbol</span>
    <span class="transaction-value">%SYMBOL%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Status</span>
    <span class="transaction-value" style="color: #f87171;">Not Copied</span>
  </div>
</div>

<p style="text-align: center;">
  <a href="%URL%/copy-trading/follower/allocations/%SUBSCRIPTION_ID%" class="btn">Add Funds</a>
</p>

<div class="alert alert-warning">
  To continue copying trades, please add more funds to your allocation.
</div>`,
    shortCodes: ["FIRSTNAME", "LEADER_NAME", "SYMBOL", "REQUIRED_AMOUNT", "AVAILABLE_BALANCE", "SUBSCRIPTION_ID", "URL"],
    smsBody: `Trade not copied: Insufficient balance for %SYMBOL%. Need %REQUIRED_AMOUNT%, have %AVAILABLE_BALANCE% USDT.`,
    pushBody: `Insufficient Balance: %SYMBOL% trade not copied. Add funds to continue copying %LEADER_NAME%'s trades.`,
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 88,
    name: "CopyTradingProfitShareEarned",
    subject: "You Earned Profit Share: %PROFIT_SHARE_AMOUNT% USDT",
    emailBody: `
<h1>Profit Share Earned!</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Congratulations! You've earned profit share from one of your followers!</p>

<div class="highlight-box">
  <div class="highlight-label">Your Profit Share</div>
  <div class="highlight-value" style="color: #34d399;">+%PROFIT_SHARE_AMOUNT% USDT</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Follower</span>
    <span class="transaction-value">%FOLLOWER_NAME%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Symbol</span>
    <span class="transaction-value">%SYMBOL%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Follower's Profit</span>
    <span class="transaction-value">%FOLLOWER_PROFIT% USDT</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Your Share (%PROFIT_SHARE_PERCENT%%)</span>
    <span class="transaction-value" style="color: #34d399;">+%PROFIT_SHARE_AMOUNT% USDT</span>
  </div>
</div>

<p style="text-align: center;">
  <a href="%URL%/copy-trading/leader/earnings" class="btn btn-success">View Earnings</a>
</p>

<div class="alert alert-success">
  Keep trading successfully to earn more profit share from your followers!
</div>`,
    smsBody: `Profit share earned: +%PROFIT_SHARE_AMOUNT% USDT from %FOLLOWER_NAME%'s %SYMBOL% trade!`,
    pushBody: `Profit Share Earned: +%PROFIT_SHARE_AMOUNT% USDT from follower %FOLLOWER_NAME%. Keep up the great trading!`,
    shortCodes: ["FIRSTNAME", "FOLLOWER_NAME", "SYMBOL", "FOLLOWER_PROFIT", "PROFIT_SHARE_PERCENT", "PROFIT_SHARE_AMOUNT", "URL"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 89,
    name: "CopyTradingProfitSharePaid",
    subject: "Profit Share Paid to Leader: %PROFIT_SHARE_AMOUNT% USDT",
    emailBody: `
<h1>Profit Share Payment</h1>
<p>Dear %FIRSTNAME%,</p>
<p>A profit share payment has been deducted from your recent winning trade.</p>

<div class="highlight-box">
  <div class="highlight-label">Net Profit</div>
  <div class="highlight-value" style="color: #34d399;">+%NET_PROFIT% USDT</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Leader</span>
    <span class="transaction-value">%LEADER_NAME%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Symbol</span>
    <span class="transaction-value">%SYMBOL%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Your Profit</span>
    <span class="transaction-value">%YOUR_PROFIT% USDT</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Profit Share (%PROFIT_SHARE_PERCENT%%)</span>
    <span class="transaction-value">-%PROFIT_SHARE_AMOUNT% USDT</span>
  </div>
</div>

<p style="text-align: center;">
  <a href="%URL%/copy-trading/follower/trades" class="btn">View Trades</a>
</p>

<div class="alert alert-info">
  Profit share is paid only on winning trades as compensation for copying the leader's strategy.
</div>`,
    smsBody: `Profit share of %PROFIT_SHARE_AMOUNT% USDT paid to %LEADER_NAME%. Net profit: +%NET_PROFIT% USDT.`,
    pushBody: `Profit Share Paid: %PROFIT_SHARE_AMOUNT% USDT paid to leader %LEADER_NAME% for %SYMBOL% trade. Net: +%NET_PROFIT% USDT.`,
    shortCodes: ["FIRSTNAME", "LEADER_NAME", "SYMBOL", "YOUR_PROFIT", "PROFIT_SHARE_PERCENT", "PROFIT_SHARE_AMOUNT", "NET_PROFIT", "URL"],
    email: true,
    sms: true,
    push: true,
  },
  // Binary AI Engine Templates
  {
    id: 101,
    name: "BinaryAiPositionOpened",
    subject: "Binary Position Opened: %SYMBOL%",
    emailBody: `
<h1>Position Opened</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your binary options position has been successfully opened.</p>

<div class="highlight-box">
  <div class="highlight-label">Position Amount</div>
  <div class="highlight-value">%AMOUNT% %CURRENCY%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Symbol</span>
    <span class="transaction-value">%SYMBOL%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Direction</span>
    <span class="transaction-value">%DIRECTION%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Entry Price</span>
    <span class="transaction-value">%ENTRY_PRICE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Duration</span>
    <span class="transaction-value">%DURATION% seconds</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Potential Payout</span>
    <span class="transaction-value">%POTENTIAL_PAYOUT% %CURRENCY%</span>
  </div>
</div>

<div class="alert alert-info">
  Your position will automatically close after the duration expires. Good luck!
</div>`,
    smsBody: `Binary position opened: %SYMBOL% %DIRECTION% at %ENTRY_PRICE%. Amount: %AMOUNT% %CURRENCY%.`,
    pushBody: `Position opened: %SYMBOL% %DIRECTION% | Amount: %AMOUNT% %CURRENCY% | Duration: %DURATION%s`,
    shortCodes: ["FIRSTNAME", "SYMBOL", "DIRECTION", "AMOUNT", "CURRENCY", "ENTRY_PRICE", "DURATION", "POTENTIAL_PAYOUT"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 102,
    name: "BinaryAiPositionWon",
    subject: "Congratulations! You Won: %SYMBOL%",
    emailBody: `
<h1>Congratulations! You Won!</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your binary options position has closed with a <strong>WIN</strong>!</p>

<div class="highlight-box" style="background: linear-gradient(135deg, #22c55e, #16a34a);">
  <div class="highlight-label">Total Payout</div>
  <div class="highlight-value">%PAYOUT% %CURRENCY%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Symbol</span>
    <span class="transaction-value">%SYMBOL%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Direction</span>
    <span class="transaction-value">%DIRECTION%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Entry Price</span>
    <span class="transaction-value">%ENTRY_PRICE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Close Price</span>
    <span class="transaction-value">%CLOSE_PRICE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Amount</span>
    <span class="transaction-value">%AMOUNT% %CURRENCY%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Profit</span>
    <span class="transaction-value" style="color: #22c55e;">+%PROFIT% %CURRENCY%</span>
  </div>
</div>

<div class="alert alert-success">
  Your winnings have been credited to your wallet. Keep trading!
</div>`,
    smsBody: `You WON! %SYMBOL% %DIRECTION%. Profit: +%PROFIT% %CURRENCY%. Total payout: %PAYOUT% %CURRENCY%.`,
    pushBody: `WIN! %SYMBOL% %DIRECTION% | Profit: +%PROFIT% %CURRENCY% | Payout: %PAYOUT% %CURRENCY%`,
    shortCodes: ["FIRSTNAME", "SYMBOL", "DIRECTION", "AMOUNT", "CURRENCY", "ENTRY_PRICE", "CLOSE_PRICE", "PROFIT", "PAYOUT"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 103,
    name: "BinaryAiPositionLost",
    subject: "Position Result: %SYMBOL%",
    emailBody: `
<h1>Position Closed</h1>
<p>Dear %FIRSTNAME%,</p>
<p>Your binary options position has closed.</p>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Symbol</span>
    <span class="transaction-value">%SYMBOL%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Direction</span>
    <span class="transaction-value">%DIRECTION%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Entry Price</span>
    <span class="transaction-value">%ENTRY_PRICE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Close Price</span>
    <span class="transaction-value">%CLOSE_PRICE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Amount</span>
    <span class="transaction-value">%AMOUNT% %CURRENCY%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Result</span>
    <span class="transaction-value" style="color: #ef4444;">Loss</span>
  </div>
</div>

<div class="alert alert-info">
  Markets can be unpredictable. Consider reviewing your strategy and try again.
</div>`,
    smsBody: `Position closed: %SYMBOL% %DIRECTION%. Result: Loss. Amount: %AMOUNT% %CURRENCY%.`,
    pushBody: `Position closed: %SYMBOL% %DIRECTION% | Result: Loss | Amount: %AMOUNT% %CURRENCY%`,
    shortCodes: ["FIRSTNAME", "SYMBOL", "DIRECTION", "AMOUNT", "CURRENCY", "ENTRY_PRICE", "CLOSE_PRICE"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 104,
    name: "BinaryAiCorrelationAlert",
    subject: "Price Correlation Alert: %SYMBOL%",
    emailBody: `
<h1>Price Correlation Alert</h1>
<p>Dear Admin,</p>
<p>A significant price deviation has been detected for <strong>%SYMBOL%</strong>.</p>

<div class="highlight-box" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
  <div class="highlight-label">Deviation</div>
  <div class="highlight-value">%DEVIATION%%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Symbol</span>
    <span class="transaction-value">%SYMBOL%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Internal Price</span>
    <span class="transaction-value">%INTERNAL_PRICE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">External Price</span>
    <span class="transaction-value">%EXTERNAL_PRICE%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Severity</span>
    <span class="transaction-value">%SEVERITY%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Detected At</span>
    <span class="transaction-value">%DETECTED_AT%</span>
  </div>
</div>

<div class="alert alert-warning">
  Please review the price feeds and take appropriate action if necessary.
</div>`,
    smsBody: `ALERT: %SYMBOL% price deviation of %DEVIATION%%. Internal: %INTERNAL_PRICE%, External: %EXTERNAL_PRICE%.`,
    pushBody: `Price Alert: %SYMBOL% deviation %DEVIATION%% | Severity: %SEVERITY%`,
    shortCodes: ["SYMBOL", "DEVIATION", "INTERNAL_PRICE", "EXTERNAL_PRICE", "SEVERITY", "DETECTED_AT"],
    email: true,
    sms: true,
    push: true,
  },
  {
    id: 105,
    name: "BinaryAiABTestCompleted",
    subject: "A/B Test Completed: %TEST_NAME%",
    emailBody: `
<h1>A/B Test Completed</h1>
<p>Dear Admin,</p>
<p>The A/B test <strong>%TEST_NAME%</strong> has reached statistical significance.</p>

<div class="highlight-box">
  <div class="highlight-label">Winner</div>
  <div class="highlight-value">%WINNER%</div>
</div>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Test Name</span>
    <span class="transaction-value">%TEST_NAME%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Control Win Rate</span>
    <span class="transaction-value">%CONTROL_WIN_RATE%%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Variant Win Rate</span>
    <span class="transaction-value">%VARIANT_WIN_RATE%%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Improvement</span>
    <span class="transaction-value">%IMPROVEMENT%%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Confidence Level</span>
    <span class="transaction-value">%CONFIDENCE%%</span>
  </div>
</div>

<div class="alert alert-success">
  The test has reached statistical significance. You can now apply the winning variant.
</div>`,
    smsBody: `A/B Test %TEST_NAME% completed. Winner: %WINNER%. Improvement: %IMPROVEMENT%%.`,
    pushBody: `A/B Test Complete: %TEST_NAME% | Winner: %WINNER% | Improvement: %IMPROVEMENT%%`,
    shortCodes: ["TEST_NAME", "WINNER", "CONTROL_WIN_RATE", "VARIANT_WIN_RATE", "IMPROVEMENT", "CONFIDENCE"],
    email: true,
    sms: false,
    push: true,
  },
  {
    id: 106,
    name: "BinaryAiEngineStatusChange",
    subject: "Engine Status Changed: %ENGINE_NAME%",
    emailBody: `
<h1>Engine Status Update</h1>
<p>Dear Admin,</p>
<p>The Binary AI Engine <strong>%ENGINE_NAME%</strong> status has changed.</p>

<div class="transaction-card">
  <div class="transaction-row">
    <span class="transaction-label">Engine</span>
    <span class="transaction-value">%ENGINE_NAME%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Symbol</span>
    <span class="transaction-value">%SYMBOL%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">Previous Status</span>
    <span class="transaction-value">%PREVIOUS_STATUS%</span>
  </div>
  <div class="transaction-row">
    <span class="transaction-label">New Status</span>
    <span class="transaction-value">%NEW_STATUS%</span>
  </div>
  <div class="transaction-row-last">
    <span class="transaction-label">Changed At</span>
    <span class="transaction-value">%CHANGED_AT%</span>
  </div>
</div>

<div class="alert alert-info">
  Please verify the engine configuration if this change was unexpected.
</div>`,
    smsBody: `Engine %ENGINE_NAME% status changed: %PREVIOUS_STATUS% -> %NEW_STATUS%.`,
    pushBody: `Engine Update: %ENGINE_NAME% is now %NEW_STATUS%`,
    shortCodes: ["ENGINE_NAME", "SYMBOL", "PREVIOUS_STATUS", "NEW_STATUS", "CHANGED_AT"],
    email: true,
    sms: false,
    push: true,
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
