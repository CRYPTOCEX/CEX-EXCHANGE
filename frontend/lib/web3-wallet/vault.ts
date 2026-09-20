/**
 * The encrypted keystore.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * THE ONE PROPERTY EVERYTHING ELSE RESTS ON: the server stores what this file
 * produces, and cannot open it. Not "is not allowed to" — cannot. The password
 * never reaches it, the derived key never leaves this module's call stack, and
 * a full database dump is a privacy incident rather than a loss of funds.
 *
 * That is why this is `crypto.subtle` and not a library. WebCrypto keys are
 * non-extractable by construction (`extractable: false` below), the primitives
 * are the platform's rather than a bundled reimplementation of them, and there
 * is no code path here that could accidentally serialise a key — because the
 * key object cannot be serialised at all.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import {
  WalletError,
  type DerivedAccount,
  type VaultSecret,
  type VaultV1,
} from "./types";

/**
 * OWASP's 2023 floor for PBKDF2-SHA512, and a number that is READ FROM THE
 * BLOB on the way back in (see `deriveKey`) rather than assumed.
 *
 * That asymmetry is the point: raising this constant makes new vaults stronger
 * and leaves every existing vault openable. A decrypt path that used the
 * constant instead of the stored value would turn the first raise into a mass
 * lockout, and the failure would look exactly like everyone forgetting their
 * password at once.
 */
export const PBKDF2_ITERATIONS = 600_000;

/**
 * Every byte array that reaches WebCrypto is spelled `Uint8Array<ArrayBuffer>`.
 *
 * The bare `Uint8Array` alias widened to `Uint8Array<ArrayBufferLike>` in
 * TypeScript 5.7, and `ArrayBufferLike` includes `SharedArrayBuffer` — which
 * WebCrypto refuses, because a key operation over memory another thread can
 * mutate mid-call is a real hazard rather than a typing technicality. So the
 * narrow form is the honest signature here, not a cast to silence the compiler.
 */
type CryptoBytes = Uint8Array<ArrayBuffer>;

const SALT_BYTES = 16;
const IV_BYTES = 12; // AES-GCM's standard nonce width. 16 is a subtly weaker choice.

/** Below this we refuse outright. See {@link assertPasswordAcceptable}. */
export const MIN_PASSWORD_LENGTH = 8;

/* ── create / unlock ──────────────────────────────────────────────────────── */

export interface CreateVaultInput {
  mnemonic: string;
  password: string;
  accounts: DerivedAccount[];
  accountCount?: number;
  passphrase?: string;
}

/** Encrypt a phrase into a fresh envelope. */
export async function createVault({
  mnemonic,
  password,
  accounts,
  accountCount = 1,
  passphrase,
}: CreateVaultInput): Promise<VaultV1> {
  assertPasswordAcceptable(password);

  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);

  const secret: VaultSecret = passphrase ? { mnemonic, passphrase } : { mnemonic };
  const plaintext = new TextEncoder().encode(JSON.stringify(secret));

  const ct = await subtle().encrypt({ name: "AES-GCM", iv }, key, plaintext);

  const now = new Date().toISOString();
  return {
    v: 1,
    kdf: { name: "PBKDF2-SHA512", iterations: PBKDF2_ITERATIONS, salt: toBase64(salt) },
    cipher: { name: "AES-GCM", iv: toBase64(iv) },
    ct: toBase64(new Uint8Array(ct)),
    accounts,
    accountCount,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Open an envelope.
 *
 * @throws {WalletError} `CORRUPT` when the envelope is not a well-formed v1,
 *         `BAD_PASSWORD` when the AES-GCM authentication tag does not verify.
 *
 * THOSE TWO ARE THE SAME EXCEPTION FROM WEBCRYPTO, and separating them is this
 * function's real job. `subtle.decrypt` throws an `OperationError` with no
 * detail for a wrong password, a truncated ciphertext and a flipped bit alike.
 * Validating the ENVELOPE first means everything that reaches the decrypt call
 * is structurally sound, so a failure there is overwhelmingly the password —
 * which is what the copy is allowed to say. Guessing the other way round
 * ("your vault is corrupt") to someone who simply mistyped is the worst
 * sentence this product could show.
 */
export async function unlockVault(
  vault: VaultV1,
  password: string
): Promise<VaultSecret> {
  assertVaultShape(vault);

  const salt = fromBase64(vault.kdf.salt);
  const iv = fromBase64(vault.cipher.iv);
  const ct = fromBase64(vault.ct);

  // The STORED iteration count, never the constant. See PBKDF2_ITERATIONS.
  const key = await deriveKey(password, salt, vault.kdf.iterations);

  let plaintext: ArrayBuffer;
  try {
    plaintext = await subtle().decrypt({ name: "AES-GCM", iv }, key, ct);
  } catch {
    throw new WalletError(
      "BAD_PASSWORD",
      "That password did not open this wallet."
    );
  }

  try {
    const parsed = JSON.parse(new TextDecoder().decode(plaintext)) as VaultSecret;
    if (!parsed || typeof parsed.mnemonic !== "string" || !parsed.mnemonic) {
      throw new Error("no mnemonic");
    }
    return parsed;
  } catch {
    /*
      Reached only when the tag VERIFIED and the contents are still not a
      secret — so the ciphertext is authentic and was written by something that
      did not write our format. A version we do not understand, essentially.
      It is not a password problem and must not be reported as one.
    */
    throw new WalletError(
      "CORRUPT",
      "This wallet backup was written in a format this version cannot read."
    );
  }
}

/**
 * Re-encrypt under a new password.
 *
 * A FRESH SALT AND IV, ALWAYS. Reusing either would leak that the plaintext is
 * unchanged, and reusing an IV under a different key is not catastrophic the way
 * same-key reuse is — but "not catastrophic" is not a reason to do it, and the
 * cost of new randomness is nil.
 */
export async function changeVaultPassword(
  vault: VaultV1,
  currentPassword: string,
  newPassword: string
): Promise<VaultV1> {
  const secret = await unlockVault(vault, currentPassword);
  assertPasswordAcceptable(newPassword);

  const next = await createVault({
    mnemonic: secret.mnemonic,
    passphrase: secret.passphrase,
    password: newPassword,
    accounts: vault.accounts,
    accountCount: vault.accountCount,
  });

  // The wallet is the same wallet; only its lock changed.
  return { ...next, createdAt: vault.createdAt };
}

/** Replace the public account list without touching the ciphertext. */
export function withAccounts(
  vault: VaultV1,
  accounts: DerivedAccount[],
  accountCount: number
): VaultV1 {
  return {
    ...vault,
    accounts,
    accountCount,
    updatedAt: new Date().toISOString(),
  };
}

/* ── validation ───────────────────────────────────────────────────────────── */

/**
 * Structural validation, used here before decrypting and on the server before
 * storing.
 *
 * IT DOES NOT LOOK AT `ct`, and that is deliberate on both sides. A check that
 * could tell a well-formed ciphertext from a malformed one is a check that
 * knows something about the plaintext — and on the server, where this same
 * predicate runs, that would be the beginning of a decryption capability. The
 * server's job is to store an opaque string of a sane length. So is this
 * function's.
 */
export function assertVaultShape(vault: unknown): asserts vault is VaultV1 {
  const v = vault as VaultV1 | null;
  const bad = (why: string) =>
    new WalletError("CORRUPT", `This wallet backup is not readable (${why}).`);

  if (!v || typeof v !== "object") throw bad("not an object");
  if (v.v !== 1) throw bad(`unknown version ${String(v.v)}`);
  if (v.kdf?.name !== "PBKDF2-SHA512") throw bad("unknown key derivation");
  if (!Number.isInteger(v.kdf.iterations) || v.kdf.iterations < 1) {
    throw bad("bad iteration count");
  }
  if (v.cipher?.name !== "AES-GCM") throw bad("unknown cipher");
  if (typeof v.kdf.salt !== "string" || !v.kdf.salt) throw bad("no salt");
  if (typeof v.cipher.iv !== "string" || !v.cipher.iv) throw bad("no iv");
  if (typeof v.ct !== "string" || !v.ct) throw bad("no ciphertext");
  if (!Array.isArray(v.accounts)) throw bad("no accounts");
}

/**
 * The password rules, and they are deliberately short.
 *
 * Eight characters, and no composition rules — no "must contain a symbol". The
 * evidence on those is that they produce `Password1!` and a sticky note, and
 * NIST dropped them for that reason. What actually protects this vault is
 * 600,000 rounds of PBKDF2 over a password an attacker must have the ciphertext
 * to attack at all, and the strength meter the UI shows, which nudges without
 * refusing.
 *
 * The one refusal beyond length is a handful of passwords so common that they
 * are the first thing any offline cracker tries.
 */
export function assertPasswordAcceptable(password: string): void {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    throw new WalletError(
      "WEAK_PASSWORD",
      `Use at least ${MIN_PASSWORD_LENGTH} characters.`
    );
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    throw new WalletError(
      "WEAK_PASSWORD",
      "That is one of the most common passwords in use. Choose another."
    );
  }
}

const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwertyui",
  "qwerty123",
  "iloveyou",
  "abc12345",
  "11111111",
  "letmein1",
  "trustno1",
  "sunshine",
  "princess",
  "football",
  "baseball",
  "welcome1",
  "admin123",
]);

/**
 * 0–4, for a meter. Advisory only — nothing refuses on this.
 *
 * Length dominates because length is what dominates: an extra character beats
 * an extra character class at every point on the curve.
 */
export function scorePassword(password: string): 0 | 1 | 2 | 3 | 4 {
  const p = String(password ?? "");
  if (p.length < MIN_PASSWORD_LENGTH) return 0;
  let score = 1;
  if (p.length >= 12) score++;
  if (p.length >= 16) score++;
  const classes =
    Number(/[a-z]/.test(p)) +
    Number(/[A-Z]/.test(p)) +
    Number(/\d/.test(p)) +
    Number(/[^A-Za-z0-9]/.test(p));
  if (classes >= 3) score++;
  if (COMMON_PASSWORDS.has(p.toLowerCase())) return 0;
  return Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
}

/* ── primitives ───────────────────────────────────────────────────────────── */

/**
 * `extractable: false` IS THE LOAD-BEARING ARGUMENT. It means the AES key
 * cannot be exported, cannot be read by anything in the page including this
 * module, and cannot end up in a log line, an error report or a React devtools
 * snapshot. The password is turned into a capability rather than into bytes.
 */
async function deriveKey(
  password: string,
  salt: CryptoBytes,
  iterations: number
): Promise<CryptoKey> {
  const material = await subtle().importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return subtle().deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-512" },
    material,
    { name: "AES-GCM", length: 256 },
    /* extractable */ false,
    ["encrypt", "decrypt"]
  );
}

/**
 * WebCrypto, or a refusal that names the actual cause.
 *
 * `crypto.subtle` is undefined on an INSECURE ORIGIN — plain http on anything
 * but localhost — and the resulting `Cannot read properties of undefined` at a
 * random call site is one of the least informative errors a user can be shown
 * for what is really a deployment problem. An operator running this over http
 * needs to be told that, in those words.
 */
function subtle(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c?.subtle) {
    throw new WalletError(
      "UNSUPPORTED",
      "Wallet encryption needs a secure context. Open this page over HTTPS."
    );
  }
  return c.subtle;
}

function randomBytes(length: number): CryptoBytes {
  const out = new Uint8Array(new ArrayBuffer(length));
  const c = globalThis.crypto;
  if (!c?.getRandomValues) {
    // No Math.random fallback, now or ever. A wallet whose salt is predictable
    // is a wallet with no salt, and failing loudly is the only safe outcome.
    throw new WalletError(
      "UNSUPPORTED",
      "This browser has no secure random number generator."
    );
  }
  c.getRandomValues(out);
  return out;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return typeof btoa === "function"
    ? btoa(binary)
    : Buffer.from(bytes).toString("base64");
}

function fromBase64(value: string): CryptoBytes {
  if (typeof atob === "function") {
    const binary = atob(value);
    const out = new Uint8Array(new ArrayBuffer(binary.length));
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }
  const decoded = Buffer.from(value, "base64");
  const out = new Uint8Array(new ArrayBuffer(decoded.length));
  out.set(decoded);
  return out;
}
