"use client";

import { AdminAuditPanel } from "./admin-audit-panel";
import { WalletLedgerPanel } from "./wallet-ledger-panel";

/**
 * The Audit tab, composed once and mounted on every Record page.
 *
 * The three transaction detail clients (withdraw / deposit / transfer) are
 * near-identical copies of each other, and the user record is a fourth surface
 * with the same need. One component so the four cannot drift — which is the
 * failure mode the rest of that code already demonstrates.
 *
 * `targetId` is the record acted upon (the audit table's own semantics — see
 * `admin-audit-panel.tsx`); `walletId` / `userId` scope the balance ledger, and
 * it is simply omitted where no wallet is involved.
 */
export function RecordAuditTab({
  targetId,
  walletId,
  userId,
  auditTitle,
  auditDescription,
  showLedger = true,
}: {
  targetId?: string;
  walletId?: string;
  userId?: string;
  auditTitle?: string;
  auditDescription?: string;
  showLedger?: boolean;
}) {
  return (
    <div className="space-y-6">
      <AdminAuditPanel
        targetId={targetId}
        title={auditTitle}
        description={auditDescription}
      />
      {showLedger && (walletId || userId) && (
        <WalletLedgerPanel walletId={walletId} userId={userId} />
      )}
    </div>
  );
}

export default RecordAuditTab;
