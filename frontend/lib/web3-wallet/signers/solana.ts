/**
 * Solana: balances, transfers, broadcast.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * `@solana/web3.js` IS DYNAMICALLY IMPORTED, EVERY TIME.
 *
 * It is ~200 kB and pulls a websocket client. A static import here would put it
 * in the bundle of every page that can open a wallet — which, since the wallet
 * host is mounted in `context/wallet.tsx`, is every page that can talk to a
 * wallet at all. The swap terminal already takes this exact approach in
 * `use-solana-wallet.ts` and says so.
 *
 * ── SPL TRANSFERS ARE HAND-ENCODED, AND THAT IS DELIBERATE ──────────────────
 * `@solana/spl-token` is not a frontend dependency and is not worth adding for
 * two instructions. Both are short, fully specified, and pinned by tests:
 *
 *   Token program `transfer`  — instruction 3, then a little-endian u64.
 *   Associated token account  — a PDA of [owner, TOKEN_PROGRAM, mint].
 *
 * The risk of hand-encoding is getting an account order wrong, so
 * `solana-encoding.test.ts` asserts the instruction bytes and the derived ATA
 * against known-good vectors rather than against this file's own output.
 *
 * ── THE RECIPIENT'S TOKEN ACCOUNT MAY NOT EXIST ─────────────────────────────
 * An SPL token lives in a token account owned by the recipient, ONE PER MINT,
 * and sending to an address whose account does not exist fails. So the transfer
 * creates it first when needed — which costs rent, PAID BY THE SENDER, and the
 * review sheet has to say so. That asymmetry with EVM is the single most
 * surprising thing about sending tokens on Solana.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { derivePrivateKey } from "../derive";
import { requireSeed } from "../session";
import { rpcUrlFor } from "../non-evm-chains";
import { RPC_ERROR, WalletRpcError } from "../approval";

/** Token program, associated-token program, and the rent sysvar. */
export const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const ASSOCIATED_TOKEN_PROGRAM_ID =
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
export const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";

async function web3() {
  return import("@solana/web3.js");
}

function connection(chainId: number) {
  return web3().then(
    ({ Connection }) => new Connection(rpcUrlFor(chainId), "confirmed")
  );
}

/* ── reads ────────────────────────────────────────────────────────────────── */

/** Lamports. `null` on a failed read — never 0, which is a claim about money. */
export async function readSolBalance(
  address: string,
  chainId: number
): Promise<bigint | null> {
  try {
    const { PublicKey } = await web3();
    const conn = await connection(chainId);
    return BigInt(await conn.getBalance(new PublicKey(address)));
  } catch {
    return null;
  }
}

export interface SplBalance {
  mint: string;
  amount: bigint;
  decimals: number;
}

/**
 * Every SPL token the address holds, in ONE call.
 *
 * Solana is the one VM here that CAN answer "what do I own?" —
 * `getParsedTokenAccountsByOwner` enumerates the owner's token accounts
 * directly. So unlike EVM (see `balances.ts`), there is no curated list to
 * probe and nothing is invisible.
 *
 * ── `null` MEANS "COULD NOT READ", AND `[]` MEANS "HOLDS NOTHING" ───────────
 * The distinction is not pedantry, and it is not hypothetical: the free
 * endpoints that serve `getBalance` perfectly well BLOCK this method —
 * `publicnode` answers `403 Request blocked`, measured from a real page. If
 * that collapsed to an empty array, a user holding USDC would open their wallet
 * and see nothing, and the only reasonable conclusion available to them is that
 * their money is gone.
 *
 * Same rule the platform already applies to its OHLCV cache: a reader that
 * cannot read must never answer "empty".
 */
export async function readSplBalances(
  address: string,
  chainId: number
): Promise<SplBalance[] | null> {
  try {
    const { PublicKey } = await web3();
    const conn = await connection(chainId);
    const res = await conn.getParsedTokenAccountsByOwner(new PublicKey(address), {
      programId: new PublicKey(TOKEN_PROGRAM_ID),
    });

    return res.value
      .map((entry) => {
        /* The parsed SPL token account, as the RPC returns it. */
        const info = (
          entry.account.data as {
            parsed?: {
              info?: {
                mint?: string;
                tokenAmount?: { amount?: string; decimals?: number };
              };
            };
          } | null
        )?.parsed?.info;
        const amount = info?.tokenAmount;
        if (!info?.mint || !amount) return null;
        return {
          mint: String(info.mint),
          amount: BigInt(amount.amount ?? "0"),
          decimals: Number(amount.decimals ?? 0),
        };
      })
      .filter((row): row is SplBalance => row !== null && row.amount > BigInt(0));
  } catch {
    // See the header: this is "unknown", not "none".
    return null;
  }
}

/* ── the keypair ──────────────────────────────────────────────────────────── */

/**
 * The signer, built from the SLIP-0010 seed.
 *
 * `Keypair.fromSeed` TAKES THE 32-BYTE SEED, not a 64-byte secret key. Solana
 * tooling calls `seed || publicKey` the "secret key", and feeding those 64 bytes
 * to a function that wants 32 either throws or signs with the wrong half.
 * `derivePrivateKey` returns the seed, which is what belongs here.
 */
async function keypairFor(index: number) {
  const { Keypair } = await web3();
  return Keypair.fromSeed(derivePrivateKey(requireSeed(), "SOLANA", index));
}

/* ── ATA derivation ───────────────────────────────────────────────────────── */

/** The associated token account for `owner` and `mint`. */
export async function associatedTokenAddress(
  owner: string,
  mint: string
): Promise<string> {
  const { PublicKey } = await web3();
  const [address] = PublicKey.findProgramAddressSync(
    [
      new PublicKey(owner).toBuffer(),
      new PublicKey(TOKEN_PROGRAM_ID).toBuffer(),
      new PublicKey(mint).toBuffer(),
    ],
    new PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID)
  );
  return address.toBase58();
}

/** Token-program `transfer`: opcode 3 followed by a little-endian u64. */
export function encodeSplTransfer(amount: bigint): Uint8Array {
  const data = new Uint8Array(9);
  data[0] = 3;
  let remaining = amount;
  for (let i = 0; i < 8; i++) {
    data[1 + i] = Number(remaining & BigInt(0xff));
    remaining >>= BigInt(8);
  }
  return data;
}

/* ── sending ──────────────────────────────────────────────────────────────── */

export interface SolanaSendInput {
  chainId: number;
  /** Base-58 mint, or null/undefined for native SOL. */
  mint?: string | null;
  to: string;
  /** Base units — lamports for SOL, the mint's own units for SPL. */
  amount: bigint;
  accountIndex?: number;
}

/**
 * Build, sign and broadcast.
 *
 * @returns the transaction signature.
 */
export async function sendSolanaAsset({
  chainId,
  mint,
  to,
  amount,
  accountIndex = 0,
}: SolanaSendInput): Promise<string> {
  const {
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction,
  } = await web3();

  const conn = await connection(chainId);
  const payer = await keypairFor(accountIndex);

  let recipient: InstanceType<typeof PublicKey>;
  try {
    recipient = new PublicKey(to);
  } catch {
    throw new WalletRpcError(
      RPC_ERROR.INVALID_PARAMS,
      "That is not a valid Solana address."
    );
  }

  const transaction = new Transaction();

  if (!mint) {
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: recipient,
        lamports: amount,
      })
    );
  } else {
    const mintKey = new PublicKey(mint);
    const source = new PublicKey(
      await associatedTokenAddress(payer.publicKey.toBase58(), mint)
    );
    const destination = new PublicKey(
      await associatedTokenAddress(recipient.toBase58(), mint)
    );

    /*
      CREATE THE RECIPIENT'S TOKEN ACCOUNT IF IT IS NOT THERE. Sending to an
      address with no account for this mint simply fails, and the failure
      message names a program the user has never heard of. The instruction has
      NO data — the associated-token program infers everything from the account
      list, and the order below is part of its interface.
    */
    const destinationInfo = await conn.getAccountInfo(destination);
    if (!destinationInfo) {
      transaction.add(
        new TransactionInstruction({
          programId: new PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID),
          keys: [
            { pubkey: payer.publicKey, isSigner: true, isWritable: true },
            { pubkey: destination, isSigner: false, isWritable: true },
            { pubkey: recipient, isSigner: false, isWritable: false },
            { pubkey: mintKey, isSigner: false, isWritable: false },
            { pubkey: new PublicKey(SYSTEM_PROGRAM_ID), isSigner: false, isWritable: false },
            { pubkey: new PublicKey(TOKEN_PROGRAM_ID), isSigner: false, isWritable: false },
          ],
          data: Buffer.alloc(0),
        })
      );
    }

    transaction.add(
      new TransactionInstruction({
        programId: new PublicKey(TOKEN_PROGRAM_ID),
        keys: [
          { pubkey: source, isSigner: false, isWritable: true },
          { pubkey: destination, isSigner: false, isWritable: true },
          { pubkey: payer.publicKey, isSigner: true, isWritable: false },
        ],
        data: Buffer.from(encodeSplTransfer(amount)),
      })
    );
  }

  /*
    A BLOCKHASH IS A DEADLINE, NOT AN ID. It expires in about ninety seconds, so
    it is fetched HERE — after the user has approved and immediately before
    signing — rather than while the review sheet was being read. Fetching it
    earlier is how a confirmed transaction fails with "blockhash not found".
  */
  const { blockhash } = await conn.getLatestBlockhash("confirmed");
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payer.publicKey;
  transaction.sign(payer);

  return conn.sendRawTransaction(transaction.serialize(), {
    // The transaction was just built against the current head; a preflight
    // simulation is a second round trip that answers the same question.
    skipPreflight: false,
    maxRetries: 3,
  });
}

/**
 * What a transfer will cost, in lamports.
 *
 * Two components, and the second is the surprising one: the base fee (5000
 * lamports a signature) plus, for a token transfer to a fresh recipient, the
 * RENT for their new token account — about 0.002 SOL, paid by the SENDER.
 */
export async function estimateSolanaFee(
  chainId: number,
  createsTokenAccount: boolean
): Promise<bigint> {
  const BASE_FEE = BigInt(5000);
  if (!createsTokenAccount) return BASE_FEE;
  try {
    const conn = await connection(chainId);
    // 165 bytes is the fixed size of an SPL token account.
    const rent = await conn.getMinimumBalanceForRentExemption(165);
    return BASE_FEE + BigInt(rent);
  } catch {
    // A measured constant beats refusing to show a fee. ~0.00204 SOL.
    return BASE_FEE + BigInt(2_039_280);
  }
}
