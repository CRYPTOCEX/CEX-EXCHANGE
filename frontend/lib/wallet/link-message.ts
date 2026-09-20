/**
 * The client's half of the non-EVM wallet-link statement.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * THIS IS A SECOND COPY OF A GRAMMAR, AND THAT IS ONLY SAFE BECAUSE A TEST SAYS
 * SO.
 *
 * The authority is `backend/src/utils/wallet-link/message.ts`, which PARSES this
 * text line by line and rejects anything that does not match exactly — the same
 * strictness `siwe.ts` applies to EIP-4361, and for the same reason: a parser
 * that matches its fields anywhere in the text never really reads the domain,
 * which is precisely what lets a phishing page harvest a signature and relay it.
 *
 * The two copies exist because the frontend cannot import from `backend/src`
 * and the backend cannot import from `frontend/lib` — separate tsconfigs,
 * separate builds. `e2e/unit/frontend/lib/wallet/link-message.test.ts` drives
 * BOTH and asserts the backend parses what this produces, so a change to one
 * that is not made to the other fails a test rather than shipping a signature
 * the server answers 400 to with nothing the user can act on.
 *
 * IF YOU EDIT ONE LINE HERE, EDIT ITS TWIN THERE, IN THE SAME COMMIT.
 * ═════════════════════════════════════════════════════════════════════════════
 */

/** The chains that use this statement. TON is absent — it has `ton_proof`. */
export type PlaintextLinkVm = "SVM" | "TVM";

const VM_LABEL: Record<PlaintextLinkVm, string> = {
  SVM: "Solana",
  TVM: "TRON",
};

/** How long a signature stays valid. Matched by the backend's own ceiling. */
export const LINK_STATEMENT_TTL_MS = 5 * 60_000;

/**
 * Build the exact text the wallet is asked to sign.
 *
 * WHAT THE USER READS MATTERS AS MUCH AS WHAT THE SERVER PARSES. This is
 * rendered inside the wallet's own trusted UI, by software we do not control,
 * to somebody deciding whether to approve it. So the first line says what is
 * being asked and by whom, and the last says what it does NOT do — because
 * "sign this" with no explanation is indistinguishable from a drainer, and a
 * user who has learned to approve those is worse off than one who refuses ours.
 */
export function buildLinkStatement(
  vm: PlaintextLinkVm,
  fields: { domain: string; address: string; nonce: string }
): string {
  const now = Date.now();
  return [
    `${fields.domain} wants you to link this wallet to your account.`,
    "",
    `Address: ${fields.address}`,
    `Network: ${VM_LABEL[vm]}`,
    `Nonce: ${fields.nonce}`,
    `Issued At: ${new Date(now).toISOString()}`,
    `Expiration Time: ${new Date(now + LINK_STATEMENT_TTL_MS).toISOString()}`,
    "",
    "Signing is free, moves no funds and grants no permissions.",
  ].join("\n");
}
