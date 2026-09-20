/**
 * TRON: balances, transfers, broadcast.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * NO `tronweb`, AND THAT IS NOT AN OPTIMISATION.
 *
 * `new TronWeb({ privateKey })` constructs the library AROUND a private key and
 * every signing method hangs off that instance — which is why the backend's
 * custody guard forbids the symbol outright. Here in the browser holding a key
 * is the whole point, but the library is still the wrong shape: 400 kB to do
 * three HTTP calls and one secp256k1 signature, with the key living inside a
 * long-lived object rather than in a single call frame.
 *
 * So this talks to the node over plain HTTP and signs with `@noble/curves`. The
 * key exists for the duration of `signTronTransaction` and nowhere else.
 *
 * ── `visible=true` EVERYWHERE ───────────────────────────────────────────────
 * TRON's API speaks two address dialects: 41-prefixed hex, and base58check
 * ("T..."). `visible=true` selects base58 for both request and response, which
 * is the form the user sees, the form the vault stores and the form an explorer
 * shows. Mixing the two is the classic TRON integration bug — a hex address in
 * a base58 field is accepted and produces a transfer to nobody.
 *
 * ── THE FEE IS NOT A GAS PRICE ──────────────────────────────────────────────
 * TRON charges BANDWIDTH and ENERGY, which an account gets a free daily
 * allowance of and can also freeze TRX for. A plain TRX transfer is usually
 * free; a TRC-20 transfer usually is not, and costs burnt TRX when the account
 * has no energy. `feeLimit` is therefore a CEILING the user authorises, not a
 * price they pay, and the review sheet must not present it as a fee.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { secp256k1 } from "@noble/curves/secp256k1";

import { derivePrivateKey } from "../derive";
import { requireSeed } from "../session";
import { rpcUrlFor } from "../non-evm-chains";
import { RPC_ERROR, WalletRpcError } from "../approval";

/**
 * 100 TRX, in SUN.
 *
 * The ceiling a TRC-20 transfer may burn when the account has no energy. A
 * standard transfer costs well under 30 TRX; this leaves headroom for a token
 * with an expensive transfer hook without authorising an unbounded burn.
 */
export const DEFAULT_FEE_LIMIT = 100_000_000;

const TRON_BASE58 = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

export function isTronAddress(value: string): boolean {
  return TRON_BASE58.test(String(value ?? "").trim());
}

async function post<T>(chainId: number, path: string, body: unknown): Promise<T> {
  const response = await fetch(`${rpcUrlFor(chainId)}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new WalletRpcError(
      RPC_ERROR.INTERNAL,
      `The TRON node refused the request (${response.status}).`
    );
  }
  return (await response.json()) as T;
}

/* ── reads ────────────────────────────────────────────────────────────────── */

/** SUN (1e6). `null` on a failed read — never 0. */
export async function readTrxBalance(
  address: string,
  chainId: number
): Promise<bigint | null> {
  try {
    const account = await post<{ balance?: number }>(chainId, "/wallet/getaccount", {
      address,
      visible: true,
    });
    /*
      AN EMPTY OBJECT MEANS THE ACCOUNT DOES NOT EXIST YET, which on TRON is
      normal for an address that has never received anything — and its balance
      genuinely is zero. That is the one case where 0 rather than null is the
      honest answer.
    */
    return BigInt(Math.trunc(account?.balance ?? 0));
  } catch {
    return null;
  }
}

/** TRC-20 `balanceOf`, via a read-only contract call. */
export async function readTrc20Balance(
  address: string,
  contract: string,
  chainId: number
): Promise<bigint | null> {
  try {
    const res = await post<{ constant_result?: string[] }>(
      chainId,
      "/wallet/triggerconstantcontract",
      {
        owner_address: address,
        contract_address: contract,
        function_selector: "balanceOf(address)",
        parameter: encodeAddressParam(address),
        visible: true,
      }
    );
    const raw = res?.constant_result?.[0];
    if (!raw) return null;
    return BigInt(`0x${raw}`);
  } catch {
    return null;
  }
}

/* ── signing ──────────────────────────────────────────────────────────────── */

/**
 * Sign a built transaction's `txID`.
 *
 * THE SIGNATURE IS 65 BYTES: r ‖ s ‖ v, with v as a bare recovery id of 0 or 1
 * — NOT EIP-155's 27/28 offset. TRON nodes reject the offset form, and the
 * failure is a generic "signature validate error" that says nothing about why.
 */
export function signTronTransaction(txId: string, accountIndex = 0): string {
  const key = derivePrivateKey(requireSeed(), "TRON", accountIndex);
  const signature = secp256k1.sign(hexToBytes(txId), key);
  const compact = signature.toCompactRawBytes();

  const out = new Uint8Array(65);
  out.set(compact, 0);
  out[64] = signature.recovery ?? 0;
  return bytesToHex(out);
}

/* ── sending ──────────────────────────────────────────────────────────────── */

export interface TronSendInput {
  chainId: number;
  /** TRC-20 contract in base58, or null/undefined for native TRX. */
  contract?: string | null;
  to: string;
  /** Base units — SUN for TRX, the token's own units for TRC-20. */
  amount: bigint;
  accountIndex?: number;
  from: string;
  feeLimit?: number;
}

interface BuiltTransaction {
  txID?: string;
  raw_data?: unknown;
  raw_data_hex?: string;
  Error?: string;
  result?: { result?: boolean; message?: string };
  transaction?: BuiltTransaction;
}

/**
 * Build, sign and broadcast.
 *
 * @returns the transaction id.
 */
export async function sendTronAsset({
  chainId,
  contract,
  to,
  amount,
  from,
  accountIndex = 0,
  feeLimit = DEFAULT_FEE_LIMIT,
}: TronSendInput): Promise<string> {
  if (!isTronAddress(to)) {
    throw new WalletRpcError(
      RPC_ERROR.INVALID_PARAMS,
      "That is not a valid TRON address."
    );
  }

  const built = contract
    ? await post<BuiltTransaction>(chainId, "/wallet/triggersmartcontract", {
        owner_address: from,
        contract_address: contract,
        function_selector: "transfer(address,uint256)",
        parameter: encodeAddressParam(to) + encodeUint256Param(amount),
        fee_limit: feeLimit,
        call_value: 0,
        visible: true,
      })
    : await post<BuiltTransaction>(chainId, "/wallet/createtransaction", {
        owner_address: from,
        to_address: to,
        // `Number` is safe here and only here: TRX has 6 decimals, so the whole
        // supply fits in a double with room to spare. It would NOT be safe for
        // an 18-decimal token, which is why nothing else in this tree does it.
        amount: Number(amount),
        visible: true,
      });

  /*
    THE TWO ENDPOINTS RETURN DIFFERENT SHAPES. `createtransaction` returns the
    transaction at the top level; `triggersmartcontract` nests it under
    `transaction` and reports failure in a sibling `result`. Reading only the
    top level yields `txID: undefined` and a signature over "undefined".
  */
  const transaction = contract ? built.transaction : built;
  const failure =
    built.Error ?? (built.result?.result === false ? built.result?.message : null);
  if (failure || !transaction?.txID) {
    throw new WalletRpcError(
      RPC_ERROR.INTERNAL,
      decodeNodeError(failure) ?? "The TRON node could not build this transaction."
    );
  }

  const signed = {
    ...transaction,
    signature: [signTronTransaction(transaction.txID, accountIndex)],
  };

  const receipt = await post<{ result?: boolean; code?: string; message?: string }>(
    chainId,
    "/wallet/broadcasttransaction",
    { ...signed, visible: true }
  );

  if (receipt?.result !== true) {
    throw new WalletRpcError(
      RPC_ERROR.INTERNAL,
      decodeNodeError(receipt?.message) ??
        `The TRON network rejected this transaction${receipt?.code ? ` (${receipt.code})` : ""}.`
    );
  }

  return transaction.txID;
}

/* ── ABI parameter encoding ───────────────────────────────────────────────── */

/**
 * A base58 TRON address as a 32-byte ABI word.
 *
 * The last 20 bytes are the address WITHOUT its 0x41 prefix — TRON's ABI
 * encoding is Ethereum's, and the version byte is not part of the value.
 * Leaving it in shifts every byte and produces a transfer to a different,
 * usually non-existent, account.
 */
export function encodeAddressParam(base58: string): string {
  const decoded = base58CheckDecode(base58);
  if (!decoded || decoded.length !== 21) {
    throw new WalletRpcError(RPC_ERROR.INVALID_PARAMS, `Bad TRON address: ${base58}`);
  }
  return bytesToHex(decoded.slice(1)).padStart(64, "0");
}

export function encodeUint256Param(value: bigint): string {
  return value.toString(16).padStart(64, "0");
}

/* ── helpers ──────────────────────────────────────────────────────────────── */

const B58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** base58check decode. Returns the 21-byte payload, or null. */
function base58CheckDecode(value: string): Uint8Array | null {
  let num = BigInt(0);
  for (const char of value) {
    const digit = B58_ALPHABET.indexOf(char);
    if (digit < 0) return null;
    num = num * BigInt(58) + BigInt(digit);
  }

  const bytes: number[] = [];
  while (num > BigInt(0)) {
    bytes.unshift(Number(num & BigInt(0xff)));
    num >>= BigInt(8);
  }
  // Leading '1's are leading zero bytes, which the bigint above cannot carry.
  for (const char of value) {
    if (char === "1") bytes.unshift(0);
    else break;
  }

  // 21 payload + 4 checksum. The checksum itself is verified by the node.
  if (bytes.length !== 25) return null;
  return new Uint8Array(bytes.slice(0, 21));
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

/**
 * TRON reports several errors as HEX-ENCODED ASCII, so the raw value reads as
 * `434f4e54524143545f56414c4944415445...` where the user needs
 * "CONTRACT_VALIDATE_ERROR". Decoded when it decodes, passed through otherwise.
 */
function decodeNodeError(message: string | null | undefined): string | null {
  if (!message) return null;
  if (!/^[0-9a-fA-F]+$/.test(message) || message.length % 2 !== 0) return message;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(hexToBytes(message));
    return /^[\x20-\x7e\s]+$/.test(text) ? text : message;
  } catch {
    return message;
  }
}
