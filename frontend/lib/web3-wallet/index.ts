/**
 * The in-house Web3 wallet core.
 *
 * Framework-free, network-free, storage-free. Everything here is a pure
 * function of its arguments except `session.ts`, which owns the one piece of
 * mutable state the wallet has — whether it is unlocked — and holds it in a
 * closure rather than anywhere it could be serialised.
 *
 * See `plans/WEB3-WALLET-SYSTEM.md` for what this is part of, and `derive.ts`
 * for the paragraph to read before changing a constant.
 */

export * from "./types";

export {
  ENGLISH_WORDLIST,
  generateMnemonic,
  mnemonicStrength,
  mnemonicToSeed,
  normaliseMnemonic,
  unknownWords,
  validateMnemonic,
} from "./mnemonic";

export {
  DERIVATION_PATHS,
  derivePrivateKey,
  derivePublicKeyHex,
  deriveWallet,
  deriveWallets,
} from "./derive";

export { tonV4R2Address, TON_DEFAULT_WALLET_ID } from "./ton-address";

export {
  isNativeAsset,
  NATIVE_SENTINEL,
  parseAmount,
  readEvmBalances,
  readTokenMetadata,
  type AssetBalance,
  type TokenRef,
} from "./balances";

export { maxNativeSendable, sendEvmAsset, sendNonEvmAsset } from "./send";
export {
  guessVm,
  isValidAddressForVm,
} from "./address-format";
export {
  NON_EVM_CHAINS,
  NON_EVM_CHAIN_LIST,
  chainIdForVm,
  nonEvmChain,
  primeNonEvmRpc,
  rpcUrlFor,
} from "./non-evm-chains";
export { askToSign, ensureUnlocked } from "./gate";
export {
  RPC_ERROR,
  WalletRpcError,
  type EvmTransactionRequest,
} from "./approval";

export {
  assertPasswordAcceptable,
  assertVaultShape,
  changeVaultPassword,
  createVault,
  MIN_PASSWORD_LENGTH,
  PBKDF2_ITERATIONS,
  scorePassword,
  unlockVault,
  withAccounts,
} from "./vault";

export {
  addressFor,
  adoptUnlocked,
  DEFAULT_AUTO_LOCK_MS,
  getServerSnapshot,
  getSnapshot,
  isUnlocked,
  lock,
  requireMnemonic,
  requireSeed,
  reset,
  setAutoLockMs,
  setVault,
  subscribe,
  touch,
  unlock,
  type WalletSnapshot,
} from "./session";
