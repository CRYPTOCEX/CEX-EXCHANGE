/**
 * "Ask the user, then let the signer run."
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ONE COPY OF THE SEQUENCE, USED BY BOTH CALLERS.
 *
 * Two things sign with this wallet: the EIP-1193 provider (when a dapp asks)
 * and the wallet's own send form (when the user asks). Both must do exactly the
 * same three steps in exactly the same order — unlock if locked, get consent,
 * only then reach a key — and two implementations of that is two places for the
 * order to drift. A send form that signed before asking would be a bug nobody
 * would notice until it mattered.
 *
 * It lives in its own module rather than in `session.ts` because it is the one
 * place that needs BOTH the session and the approval queue, and neither of those
 * should have to know about the other.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import {
  RPC_ERROR,
  WalletRpcError,
  requestApproval,
  type WalletRequest,
} from "./approval";
import { getSnapshot, isUnlocked } from "./session";

/**
 * Make sure a key is reachable, prompting if it is not.
 *
 * @throws {WalletRpcError} 4100 if the user dismisses the prompt, or if the
 *         wallet is somehow still locked afterwards.
 */
export async function ensureUnlocked(
  reason: "sign" | "connect" = "sign"
): Promise<void> {
  if (isUnlocked()) return;

  if (getSnapshot().state === "absent") {
    // A different failure with different copy: there is nothing to unlock.
    throw new WalletRpcError(
      RPC_ERROR.UNAUTHORIZED,
      "You have not created a wallet on this account yet."
    );
  }

  await requestApproval({ kind: "unlock", reason });

  /*
    RE-CHECKED RATHER THAN ASSUMED. The unlock dialog resolves its queue entry
    on success, but the session is the authority — and between the two there is
    an auto-lock timer that does not care what a dialog just did.
  */
  if (!isUnlocked()) {
    throw new WalletRpcError(RPC_ERROR.UNAUTHORIZED, "The wallet is locked.");
  }
}

/**
 * Unlock, then get consent for `request`.
 *
 * THE ORDER IS LOAD-BEARING AND IS THIS WAY ROUND ON PURPOSE. Unlocking first
 * means the review sheet can show things that need the chain — a fee estimate,
 * a decoded amount — without a second interruption in the middle of reading it.
 * Consent is still the last thing before the key is touched, which is the
 * property that matters.
 */
export async function askToSign(request: WalletRequest): Promise<void> {
  await ensureUnlocked("sign");
  await requestApproval(request);
}
