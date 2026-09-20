-- ============================================================================
-- FIND DEPOSITS THAT CLAIM A PAYMENT GATEWAY BUT WENT THROUGH THE MANUAL DOOR
-- ============================================================================
--
-- READ-ONLY. Nothing here writes. The remediation statements at the bottom are
-- commented out on purpose — read the rows first, decide, then run them by hand.
--
-- WHAT IT LOOKS FOR
-- -----------------
-- `POST /api/finance/deposit/fiat` is the MANUAL deposit door: a customer saying
-- "I have sent you a bank transfer", which an operator then believes or does not.
-- It used to resolve `methodId` against `deposit_gateway` FIRST, with no status
-- check, and on a hit wrote a PENDING transaction stamped with the gateway's
-- title:
--
--     Deposit 100 USD by Paystack
--
-- with no payment of any kind having been made. A gateway deposit has no
-- manual-approval leg — the provider's own verify/webhook route credits the
-- wallet against a payment the provider confirms — so any transaction whose
-- description names a GATEWAY and whose status is PENDING came through the
-- manual door and has no payment behind it.
--
-- The route now refuses gateway ids outright. This finds what got through first.
--
-- MATCHED ON `description`, NOT `metadata`, ON PURPOSE. The description column is
-- plain text and its format is fixed by the route:
-- `Deposit {amount} {currency} by {title}`. `metadata` is a JSON column, which
-- MySQL returns parsed and MariaDB returns as a raw string, so a JSON_EXTRACT
-- here would answer differently on the two engines.
--
-- ONE FALSE POSITIVE TO EXPECT: a MANUAL deposit method you created and titled
-- the same as a bundled gateway (a "PayPal" deposit_method, say). Query 2 tells
-- you whether any such method exists. Check its output before acting on anything.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. The rows. Every status, so an already-APPROVED one is not missed — that is
--    the case where money was actually minted and a wallet needs correcting.
-- ----------------------------------------------------------------------------
SELECT
  t.id,
  t.userId,
  u.email,
  t.status,
  t.amount,
  t.fee,
  w.currency        AS currency,
  g.title           AS claimedGateway,
  g.status          AS gatewayWasEnabled,
  t.referenceId,
  t.createdAt,
  t.description,
  t.metadata
FROM `transaction` t
JOIN `deposit_gateway` g
  ON t.description LIKE CONCAT('Deposit % by ', g.title)
LEFT JOIN `user`   u ON u.id = t.userId
LEFT JOIN `wallet` w ON w.id = t.walletId
WHERE t.type = 'DEPOSIT'
  AND t.deletedAt IS NULL
ORDER BY t.createdAt DESC;


-- ----------------------------------------------------------------------------
-- 2. The false-positive check: do you have a MANUAL method whose title collides
--    with a gateway's? Any row here means query 1 may include legitimate manual
--    deposits, and you must separate them by hand before acting.
-- ----------------------------------------------------------------------------
SELECT m.id, m.title, m.status
FROM `deposit_method` m
JOIN `deposit_gateway` g ON g.title = m.title
WHERE m.deletedAt IS NULL;


-- ----------------------------------------------------------------------------
-- 3. The damage figure: how much was actually credited by approving one of
--    these. A non-empty result means real balances need correcting, not just a
--    queue tidy-up.
-- ----------------------------------------------------------------------------
SELECT
  g.title           AS claimedGateway,
  COUNT(*)          AS approvedCount,
  SUM(t.amount)     AS grossCredited,
  SUM(t.fee)        AS feesBooked
FROM `transaction` t
JOIN `deposit_gateway` g
  ON t.description LIKE CONCAT('Deposit % by ', g.title)
WHERE t.type = 'DEPOSIT'
  AND t.status = 'COMPLETED'
  AND t.deletedAt IS NULL
GROUP BY g.title;


-- ============================================================================
-- REMEDIATION — read the three results above first, then uncomment ONE.
-- ============================================================================
--
-- For rows still PENDING nothing has moved: no balance changed and no
-- `adminProfit` row was written, so rejecting them is a clean close. Prefer
-- rejecting through Admin -> Finance -> Deposit Records so the customer is
-- emailed and the audit trail records who decided it. Reject in the UI, not here,
-- unless the volume makes that impractical.
--
-- If you must do it in SQL, this is the equivalent — it changes STATUS ONLY,
-- which is exactly what the admin reject path does for a PENDING deposit:
--
--   UPDATE `transaction` t
--   JOIN `deposit_gateway` g
--     ON t.description LIKE CONCAT('Deposit % by ', g.title)
--   SET t.status = 'REJECTED',
--       t.updatedAt = UTC_TIMESTAMP()
--   WHERE t.type = 'DEPOSIT'
--     AND t.status = 'PENDING'
--     AND t.deletedAt IS NULL;
--
-- DO NOT write a bulk statement for rows already COMPLETED. Those credited a
-- wallet, and reversing one means debiting a balance that may since have been
-- traded or withdrawn. Handle each by hand, through the wallet service, so the
-- ledger and the audit trail stay consistent.
-- ============================================================================
