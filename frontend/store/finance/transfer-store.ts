import { create } from "zustand";
import { $fetch } from "@/lib/api";
import { useWalletStore } from "./wallet-store";
import { quoteTransferFee, roundToWalletPrecision } from "./transfer-precision";

interface WalletType {
  id: string;
  name: string;
}

interface Currency {
  value: string;
  label: string;
}

interface TransferState {
  // Transfer type selection
  transferType: "wallet" | "client" | null;
  setTransferType: (type: "wallet" | "client" | null) => Promise<void>;

  // From wallet selection
  availableWalletTypes: WalletType[];
  fromWalletType: string | null;
  setFromWalletType: (type: string | null) => void;

  // From currency selection
  fromCurrencies: Currency[];
  fromCurrency: string | null;
  setFromCurrency: (currency: string | null) => void;

  // To wallet selection (for wallet transfers)
  availableToWalletTypes: WalletType[];
  toWalletType: string | null;
  setToWalletType: (type: string | null) => void;

  // To currency selection
  toCurrencies: Currency[];
  toCurrency: string | null;
  setToCurrency: (currency: string | null) => void;

  // Client transfer fields
  recipientUuid: string;
  setRecipientUuid: (uuid: string) => void;
  recipientExists: boolean | null;
  recipientValidating: boolean;

  // Amount and balance
  amount: number;
  setAmount: (amount: number) => void;
  availableBalance: number;

  // Transfer details
  estimatedReceiveAmount: number;
  transferFee: number;
  /** Configured wallet transfer fee in percent, served by /transfer-options. */
  feePercentage: number;
  exchangeRate: number | null;
  exchangeRateLoading: boolean;
  fromPriceUSD: number | null;
  toPriceUSD: number | null;

  // ── Transfer verification (PIN / step-up 2FA)
  //
  // Mirrors the withdrawal store's step-up block. `submitTransfer` opens the
  // prompt instead of posting when the policy demands a credential, and resumes
  // itself with the single-use token once one is accepted. The token is never
  // stored: it authorises exactly one transfer and is burned server-side.
  verificationPolicy: TransferVerificationPolicy | null;
  verificationPolicyLoading: boolean;
  /** True while the prompt is open, awaiting a PIN or a code. */
  verificationPrompt: boolean;
  /** True once a code has actually been delivered (never for PIN or APP). */
  verificationCodeSent: boolean;
  verificationSending: boolean;
  verificationVerifying: boolean;
  verificationError: string | null;
  /** Which credential the prompt is currently collecting. */
  verificationMethod: "PIN" | "OTP";
  setVerificationMethod: (method: "PIN" | "OTP") => void;

  // UI state
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  transferSuccess: any | null;
  setTransferSuccess: (success: any | null) => void;

  // Actions
  fetchWalletTypes: () => Promise<void>;
  fetchFromCurrencies: (walletType: string) => Promise<void>;
  fetchToWalletTypes: (fromWalletType: string) => Promise<void>;
  fetchToCurrencies: (
    fromWalletType: string,
    toWalletType: string
  ) => Promise<void>;
  fetchBalance: (walletType: string, currency: string) => Promise<void>;
  checkRecipient: (uuid: string) => Promise<void>;
  fetchExchangeRateAndCalculate: () => Promise<void>;
  calculateTransferDetails: () => void;
  submitTransfer: (transferToken?: string) => Promise<void>;
  fetchVerificationPolicy: () => Promise<void>;
  /** Opens the prompt, delivering a code first when the method needs one. */
  requestVerification: () => Promise<void>;
  /** Checks the entered credential and, on success, resumes the transfer. */
  confirmVerification: (credential: string) => Promise<void>;
  cancelVerification: () => void;
  reset: () => void;
}

/** Server-resolved policy — see GET /api/finance/transfer/verification. */
export interface TransferVerificationPolicy {
  active: boolean;
  pinAccepted: boolean;
  twoFactorAccepted: boolean;
  scope: "client" | "all";
  acceptedTypes: string[];
  userType: string | null;
  hasPin: boolean;
  hasTwoFactor: boolean;
  pinLockedUntil: string | null;
  satisfied: boolean;
}

/**
 * Which credential to open the prompt on.
 *
 * "Whichever one can actually succeed", not "whichever one exists". A PIN the
 * server has locked is not a usable credential, and preselecting it opens the
 * dialog onto four boxes that are disabled by design — so a locked PIN falls
 * through to the code, exactly as a missing one does. When neither is usable
 * the value is irrelevant: `submitTransfer` will not open the prompt at all.
 */
function preferredMethod(
  policy: TransferVerificationPolicy
): "PIN" | "OTP" {
  const pinLocked =
    Boolean(policy.pinLockedUntil) &&
    new Date(policy.pinLockedUntil as string) > new Date();
  if (policy.pinAccepted && policy.hasPin && !pinLocked) return "PIN";
  if (policy.twoFactorAccepted && policy.hasTwoFactor) return "OTP";
  // Nothing usable — prefer whichever mechanism the platform accepts, so the
  // dialog at least describes the right thing if it is ever opened.
  return policy.pinAccepted ? "PIN" : "OTP";
}

/**
 * Does the policy cover the transfer the user is about to make?
 *
 * The scope check is duplicated from the server deliberately: it decides
 * whether to OPEN a prompt, not whether to allow the transfer. The server
 * enforces regardless, so the worst case of getting this wrong is a prompt the
 * user did not need, or a 403 they were not warned about — never a transfer
 * that skipped verification.
 */
export function verificationCoversTransfer(
  policy: TransferVerificationPolicy | null,
  transferType: "wallet" | "client" | null
): boolean {
  if (!policy?.active) return false;
  return policy.scope === "all" || transferType === "client";
}

export const useTransferStore = create<TransferState>((set, get) => ({
  // Initial state
  verificationPolicy: null,
  verificationPolicyLoading: false,
  verificationPrompt: false,
  verificationCodeSent: false,
  verificationSending: false,
  verificationVerifying: false,
  verificationError: null,
  verificationMethod: "PIN",
  setVerificationMethod: (method) =>
    set({ verificationMethod: method, verificationError: null }),

  transferType: null,
  availableWalletTypes: [],
  fromWalletType: null,
  fromCurrencies: [],
  fromCurrency: null,
  availableToWalletTypes: [],
  toWalletType: null,
  toCurrencies: [],
  toCurrency: null,
  recipientUuid: "",
  recipientExists: null,
  recipientValidating: false,
  amount: 0,
  availableBalance: 0,
  estimatedReceiveAmount: 0,
  transferFee: 0,
  feePercentage: 0,
  exchangeRate: null,
  exchangeRateLoading: false,
  fromPriceUSD: null,
  toPriceUSD: null,
  loading: false,
  error: null,
  transferSuccess: null,

  // Setters
  setTransferType: async (type) => {
    const currentState = get();
    // Reset form when changing transfer type (but not on initial load)
    if (
      currentState.transferType !== type &&
      currentState.transferType !== null
    ) {
      // Reset all form state except availableWalletTypes
      set({
        fromWalletType: null,
        fromCurrencies: [],
        fromCurrency: null,
        availableToWalletTypes: [],
        toWalletType: null,
        toCurrencies: [],
        toCurrency: null,
        recipientUuid: "",
        recipientExists: null,
        recipientValidating: false,
        amount: 0,
        availableBalance: 0,
        estimatedReceiveAmount: 0,
        transferFee: 0,
        exchangeRate: null,
        exchangeRateLoading: false,
        fromPriceUSD: null,
        toPriceUSD: null,
        error: null,
        transferSuccess: null,
      });
    }
    set({ transferType: type, transferSuccess: null });

    // Fetch wallet types if they're not available
    if (currentState.availableWalletTypes.length === 0) {
      await currentState.fetchWalletTypes();
    }
  },
  setFromWalletType: (type) =>
    set({ fromWalletType: type, fromCurrency: null, fromCurrencies: [] }),
  setFromCurrency: async (currency) => {
    set({ fromCurrency: currency, availableBalance: 0 });
    // Automatically fetch balance when currency is selected
    const { fromWalletType } = get();
    if (fromWalletType && currency) {
      const state = get();
      await state.fetchBalance(fromWalletType, currency);
    }
  },
  setToWalletType: (type) => {
    set({ toWalletType: type, toCurrency: null, toCurrencies: [] });
  },
  setToCurrency: (currency) => {
    set({ toCurrency: currency });
    // Recalculate transfer details when target currency changes
    get().calculateTransferDetails();
  },
  setRecipientUuid: (uuid) =>
    set({ recipientUuid: uuid, recipientExists: null }),
  setAmount: (amount) => {
    set({ amount });
    get().calculateTransferDetails();
  },
  setError: (error) => set({ error }),
  setTransferSuccess: (success) => set({ transferSuccess: success }),

  // Actions
  fetchWalletTypes: async () => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await $fetch({
        url: "/api/finance/wallet/transfer-options",
        silent: true,
      });

      if (error) {
        set({ error, loading: false });
        return;
      }

      // Fee comes from settings, not a hardcoded rate — the previous 0%/1%
      // assumption did not track walletTransferFee at all.
      const fee = Number(data?.feePercentage);
      set({
        availableWalletTypes: data?.types || [],
        feePercentage: Number.isFinite(fee) && fee > 0 ? fee : 0,
        loading: false,
      });
    } catch (err) {
      console.error("Error fetching wallet types:", err);
      set({ error: "Failed to fetch wallet types", loading: false });
    }
  },

  fetchFromCurrencies: async (walletType) => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await $fetch({
        url: `/api/finance/currency?action=transfer&walletType=${walletType}`,
        silent: true,
      });

      if (error) {
        set({ error, loading: false });
        return;
      }

      const currencies = data?.from || [];
      set({ fromCurrencies: currencies, loading: false });
    } catch (err) {
      console.error("Error fetching from currencies:", err);
      set({ error: "Failed to fetch currencies", loading: false });
    }
  },

  fetchToWalletTypes: async (fromWalletType) => {
    const { availableWalletTypes } = get();

    // Apply transfer rules
    let availableToTypes: WalletType[] = [];

    if (fromWalletType === "FUTURES") {
      // FUTURES can only transfer to ECO
      availableToTypes = availableWalletTypes.filter(
        (type) => type.id === "ECO"
      );
    } else if (fromWalletType === "ECO") {
      // ECO can transfer to any type except itself
      availableToTypes = availableWalletTypes.filter(
        (type) => type.id !== "ECO"
      );
    } else {
      // FIAT and SPOT can transfer to any type except themselves
      availableToTypes = availableWalletTypes.filter(
        (type) => type.id !== fromWalletType
      );
    }

    set({ availableToWalletTypes: availableToTypes });
  },

  fetchToCurrencies: async (fromWalletType, toWalletType) => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await $fetch({
        url: `/api/finance/currency?action=transfer&walletType=${fromWalletType}&targetWalletType=${toWalletType}`,
        silent: true,
      });

      if (error) {
        set({ error, loading: false });
        return;
      }

      const currencies = data?.to || [];
      set({ toCurrencies: currencies, loading: false });
    } catch (err) {
      console.error("Error fetching to currencies:", err);
      set({ error: "Failed to fetch target currencies", loading: false });
    }
  },

  fetchBalance: async (walletType, currency) => {
    set({ loading: true, error: null });

    // Ask for the ONE wallet, never the wallet list. The list route runs through
    // getFiltered, which applies an unconditional LIMIT defaulting to 10 with
    // sortField "currency" ASC, so scanning its `items` only ever saw the first
    // ten wallets of the type — and zero-balance wallets take slots too. The
    // currency picker is served by an unpaginated findAll, so a user could pick
    // a funded currency the lookup structurally could not see: balance read as
    // 0, and isFormValid()'s `amount <= availableBalance` disabled the Transfer
    // button forever, with the "Available" line hidden so nothing said why.
    // No try/catch: $fetch never throws, it returns errors in `error`.
    const { data, error } = await $fetch({
      url: `/api/finance/wallet/${walletType}/${encodeURIComponent(currency)}`,
      silent: true,
    });

    if (error) {
      // Surface it rather than falling back quietly to 0. The picker only offers
      // currencies with balance > 0, so a 404 here is a real anomaly, not the
      // ordinary "user has no such wallet yet" case.
      set({ availableBalance: 0, error, loading: false });
      return;
    }

    // Every Sequelize DECIMAL arrives as a STRING. `availableBalance` is typed
    // number but held e.g. "1250.00", which the MAX button pushed into `amount`
    // as a string.
    const balance = Number(data?.balance);

    set({
      availableBalance: Number.isFinite(balance) ? balance : 0,
      loading: false,
    });
  },

  checkRecipient: async (uuid) => {
    if (!uuid.trim()) {
      set({ recipientExists: null, recipientValidating: false });
      return;
    }

    set({ recipientValidating: true, error: null });

    try {
      const { data, error } = await $fetch({
        url: `/api/finance/transfer/validate?uuid=${uuid}`,
        silent: true,
      });

      set({
        recipientExists: !error && data?.exists,
        recipientValidating: false,
      });
    } catch (err) {
      console.error("Error checking recipient:", err);
      set({ recipientExists: false, recipientValidating: false });
    }
  },

  fetchExchangeRateAndCalculate: async () => {
    const {
      amount,
      transferType,
      fromCurrency,
      toCurrency,
      fromWalletType,
      toWalletType
    } = get();

    // Validate required fields
    if (!amount || amount <= 0 || !transferType || !fromCurrency || !toCurrency || !fromWalletType || !toWalletType) {
      return;
    }

    // Skip for same currency or client transfers (they use 1:1)
    if (fromCurrency === toCurrency || transferType === "client") {
      return;
    }

    // Show loading state while fetching exchange rate
    set({ exchangeRateLoading: true });

    try {
      const { data, error } = await $fetch({
        url: `/api/finance/exchange-rate?fromCurrency=${fromCurrency}&fromType=${fromWalletType}&toCurrency=${toCurrency}&toType=${toWalletType}`,
        silent: true,
      });

      if (error || !data?.rate) {
        console.error("Error fetching exchange rate:", error);
        // Do NOT fallback to 1:1 - show 0 so user knows rate is unavailable
        set({
          estimatedReceiveAmount: 0,
          transferFee: 0,
          exchangeRate: null,
          exchangeRateLoading: false,
          fromPriceUSD: null,
          toPriceUSD: null,
          error: `Unable to fetch exchange rate for ${fromCurrency} to ${toCurrency}. Please try again.`,
        });
        return;
      }

      // Same fee the backend deducts before converting — it applies to wallet
      // transfers too, so this cannot assume zero.
      const { feePercentage } = get();
      const fee = quoteTransferFee(amount, feePercentage, get().fromWalletType);
      const amountAfterFee = amount - fee;
      const exchangeRate = data.rate;

      // Calculate estimated receive amount using real exchange rate
      // Example: 20 LTC * (LTC_USD_price / ZAR_USD_price) = 20 * (95 / 0.055) = 20 * 1727.27 = 34545.45 ZAR
      const estimatedReceive = amountAfterFee * exchangeRate;

      // Use 2 decimal places for FIAT target, 8 for crypto
      const isFiatTarget = toWalletType === "FIAT";
      const precision = isFiatTarget ? 100 : 100000000;
      const roundedReceive = Math.round(estimatedReceive * precision) / precision;

      set({
        estimatedReceiveAmount: roundedReceive,
        transferFee: fee,
        exchangeRate: exchangeRate,
        exchangeRateLoading: false,
        fromPriceUSD: data.fromPriceUSD || null,
        toPriceUSD: data.toPriceUSD || null,
      });
    } catch (err) {
      console.error("Error fetching exchange rate:", err);
      // Do NOT fallback to 1:1 - show error
      set({
        estimatedReceiveAmount: 0,
        transferFee: 0,
        exchangeRate: null,
        exchangeRateLoading: false,
        fromPriceUSD: null,
        toPriceUSD: null,
        error: `Unable to fetch exchange rate for ${fromCurrency} to ${toCurrency}. Please try again.`,
      });
    }
  },

  calculateTransferDetails: () => {
    const { amount, transferType, fromCurrency, toCurrency, fromWalletType, toWalletType } = get();

    if (!amount || amount <= 0) {
      set({ estimatedReceiveAmount: 0, transferFee: 0, exchangeRate: null, exchangeRateLoading: false, fromPriceUSD: null, toPriceUSD: null });
      return;
    }

    // Validate required fields before calculation
    if (!transferType || !fromCurrency) {
      set({ estimatedReceiveAmount: 0, transferFee: 0, exchangeRate: null, exchangeRateLoading: false, fromPriceUSD: null, toPriceUSD: null });
      return;
    }

    // The backend charges walletTransferFee on every transfer, client or wallet
    // (see calculateTransferFee in the transfer handler), so quote the same fee
    // for both instead of assuming 1% / 0%.
    const { feePercentage } = get();
    const fee = quoteTransferFee(amount, feePercentage, get().fromWalletType);
    const amountAfterFee = amount - fee;

    // Validate fee calculation
    if (fee < 0 || amountAfterFee < 0) {
      set({ estimatedReceiveAmount: 0, transferFee: 0, exchangeRate: null, exchangeRateLoading: false, fromPriceUSD: null, toPriceUSD: null });
      return;
    }

    // For same currency transfers or client transfers (1:1 rate)
    if (fromCurrency === toCurrency || transferType === "client") {
      set({
        estimatedReceiveAmount: roundToWalletPrecision(amountAfterFee, get().toWalletType),
        transferFee: fee,
        exchangeRate: 1,
        exchangeRateLoading: false,
        fromPriceUSD: null,
        toPriceUSD: null,
      });
      return;
    }

    // For cross-currency transfers, fetch real exchange rates from backend
    if (fromWalletType && toWalletType) {
      // Set loading state and clear previous rate while fetching
      set({
        exchangeRateLoading: true,
        estimatedReceiveAmount: 0,
        transferFee: fee,
        exchangeRate: null,
        fromPriceUSD: null,
        toPriceUSD: null,
      });
      // Fetch exchange rate asynchronously - it will update state when done
      get().fetchExchangeRateAndCalculate();
    } else {
      // If wallet types not selected yet, show nothing
      set({
        estimatedReceiveAmount: 0,
        transferFee: fee,
        exchangeRate: null,
        exchangeRateLoading: false,
        fromPriceUSD: null,
        toPriceUSD: null,
      });
    }
  },

  fetchVerificationPolicy: async () => {
    set({ verificationPolicyLoading: true });
    const { data, error } = await $fetch({
      url: "/api/finance/transfer/verification",
      silent: true,
    });
    if (!error && data) {
      const policy = data as TransferVerificationPolicy;
      set({
        verificationPolicy: policy,
        verificationMethod: preferredMethod(policy),
      });
    }
    // A failed policy fetch must not block the form: the backend enforces the
    // policy regardless, so the worst case is the user learns about the
    // requirement from the submit response instead of up front.
    set({ verificationPolicyLoading: false });
  },

  requestVerification: async () => {
    const { verificationPolicy, verificationMethod } = get();

    // A PIN needs nothing delivered — the user already knows it. So does an
    // authenticator app, whose code is already on the device; calling the send
    // route for either would burn a slot in a rate limit sized for SMS cost.
    if (
      verificationMethod === "PIN" ||
      verificationPolicy?.userType === "APP"
    ) {
      set({
        verificationPrompt: true,
        verificationSending: false,
        verificationCodeSent: false,
        verificationError: null,
        error: null,
      });
      return;
    }

    set({
      verificationPrompt: true,
      verificationSending: true,
      verificationError: null,
      error: null,
    });

    const { data, error } = await $fetch({
      url: "/api/finance/transfer/verification",
      method: "POST",
      silent: true,
    });

    if (error) {
      set({ verificationSending: false, verificationError: error });
      return;
    }

    set({
      verificationSending: false,
      verificationCodeSent: Boolean(data?.delivered),
    });
  },

  confirmVerification: async (credential: string) => {
    const { verificationMethod, transferType, recipientUuid } = get();
    const value = credential.trim();

    if (verificationMethod === "PIN" && value.length !== 4) {
      set({ verificationError: "Enter your 4-digit Transfer PIN" });
      return;
    }
    if (verificationMethod === "OTP" && value.length < 6) {
      set({ verificationError: "Enter the complete 6-digit code" });
      return;
    }

    set({ verificationVerifying: true, verificationError: null });

    const { data, error } = await $fetch({
      url: "/api/finance/transfer/verification/verify",
      method: "POST",
      body: {
        ...(verificationMethod === "PIN" ? { pin: value } : { otp: value }),
        // Binds the token to THIS transfer's recipient. The server folds it
        // into the token's key, so a confirmation given here cannot authorise a
        // payment to anybody else — and must therefore match what
        // `submitTransfer` sends below.
        transferType: transferType === "client" ? "client" : "wallet",
        ...(transferType === "client" ? { clientId: recipientUuid } : {}),
      },
      silent: true,
    });

    if (error || !data?.transferToken) {
      set({
        verificationVerifying: false,
        verificationError: error || "Verification failed. Please try again.",
      });
      // A wrong PIN moves the lockout counter, so re-read the policy to pick up
      // `pinLockedUntil` rather than letting the user keep typing into a PIN
      // the server has already stopped checking.
      if (verificationMethod === "PIN") void get().fetchVerificationPolicy();
      return;
    }

    // Close the prompt and resume, threading the single-use token straight
    // through. It is never persisted: it authorises exactly one transfer.
    set({
      verificationVerifying: false,
      verificationPrompt: false,
      verificationCodeSent: false,
    });
    // `submitTransfer` rejects on failure and this resumed leg has no caller to
    // catch it — the original `handleSubmit` promise settled when the prompt
    // opened. Surface the error into store state, which the form already
    // renders, instead of raising an unhandled rejection.
    try {
      await get().submitTransfer(data.transferToken);
    } catch {
      /* already recorded in `error` by submitTransfer */
    }
  },

  cancelVerification: () => {
    set({
      verificationPrompt: false,
      verificationCodeSent: false,
      verificationSending: false,
      verificationVerifying: false,
      verificationError: null,
      loading: false,
    });
  },

  submitTransfer: async (transferToken?: string) => {
    const {
      transferType,
      fromWalletType,
      fromCurrency,
      toWalletType,
      toCurrency,
      amount,
      recipientUuid,
      verificationPolicy,
    } = get();

    // Divert to the prompt rather than posting a request the server is
    // guaranteed to refuse. On a policy the client could not read, this is
    // simply skipped and the 403 surfaces as the error — the server is the
    // enforcer either way.
    if (
      !transferToken &&
      verificationCoversTransfer(verificationPolicy, transferType)
    ) {
      /*
        Only divert when the user can actually satisfy the policy.

        A user with no Transfer PIN on a PIN-only install has nothing to type,
        and opening the prompt would strand them in a dialog whose only exit is
        Cancel — no switch button, because there is no second mechanism to
        switch to, and no setup link. Posting instead gets them the server's
        403, which names exactly which credential to go and set up. The server
        is the enforcer either way, so nothing is skipped: this chooses between
        two refusals, and picks the one that says what to do.
      */
      if (verificationPolicy?.satisfied) {
        await get().requestVerification();
        return;
      }
    }

    set({ loading: true, error: null });

    // Mint a single per-submission nonce and thread it through the request so
    // a network-layer retry of the same button press collapses server-side
    // (409, same idempotency key) instead of moving the funds twice. A later
    // re-click is a separate intent and correctly gets a new nonce. Minted
    // AFTER the verification divert above, so the resumed post — the one that
    // actually carries the token — is the one that owns it.
    const transferNonce =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      const body: any = {
        fromType: fromWalletType,
        fromCurrency,
        amount,
        nonce: transferNonce,
      };

      if (transferType === "wallet") {
        body.toType = toWalletType;
        body.toCurrency = toCurrency;
        body.transferType = "wallet";
      } else {
        body.toType = fromWalletType; // Same wallet type for client transfers
        body.toCurrency = fromCurrency; // Same currency for client transfers
        body.transferType = "client";
        body.clientId = recipientUuid;
      }

      if (transferToken) body.transferToken = transferToken;

      const { data, error } = await $fetch({
        url: "/api/finance/transfer",
        method: "POST",
        body,
        successMessage: "Transfer completed successfully",
      });

      if (error) {
        set({ error, loading: false });
        return Promise.reject(error);
      }

      set({ loading: false, transferSuccess: data });
      // A transfer settles immediately, so the wallet totals are stale the
      // moment this resolves. `fetchStats` is latched after its first success
      // and would otherwise serve the pre-transfer figures for the rest of the
      // session — see refreshBalances in the wallet store.
      void useWalletStore.getState().refreshBalances();
      return Promise.resolve(data);
    } catch (err) {
      console.error("Error submitting transfer:", err);
      const errorMessage = "Failed to process transfer";
      set({ error: errorMessage, loading: false });
      return Promise.reject(errorMessage);
    }
  },

  reset: () => {
    const currentState = get();
    set({
      transferType: null,
      // Keep availableWalletTypes and feePercentage — both are server config, not
      // per-transfer state, and refetching them on every reset is pointless.
      availableWalletTypes: currentState.availableWalletTypes,
      feePercentage: currentState.feePercentage,
      fromWalletType: null,
      fromCurrencies: [],
      fromCurrency: null,
      availableToWalletTypes: [],
      toWalletType: null,
      toCurrencies: [],
      toCurrency: null,
      recipientUuid: "",
      recipientExists: null,
      recipientValidating: false,
      amount: 0,
      availableBalance: 0,
      estimatedReceiveAmount: 0,
      transferFee: 0,
      exchangeRate: null,
      exchangeRateLoading: false,
      fromPriceUSD: null,
      toPriceUSD: null,
      loading: false,
      error: null,
      transferSuccess: null,
    });
  },
}));
