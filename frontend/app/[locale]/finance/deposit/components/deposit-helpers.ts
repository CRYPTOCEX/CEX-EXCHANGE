import {
  DollarSign,
  Coins,
  TrendingUp,
  Banknote,
  Wallet,
  Landmark,
  CreditCard,
} from "lucide-react";
import { getExplorerTxUrl } from "@/lib/blockchain-explorer";

export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.2 },
};

export const getWalletIcon = (walletType: string) => {
  switch (walletType) {
    case "FIAT": return DollarSign;
    case "SPOT": return Coins;
    case "ECO": return TrendingUp;
    case "FUTURES": return Banknote;
    default: return Wallet;
  }
};

export const getMethodIcon = (methodType: string) => {
  switch (methodType?.toLowerCase()) {
    case "bank": return Landmark;
    case "card": return CreditCard;
    case "crypto": return Coins;
    default: return Wallet;
  }
};

export const extractFeeValue = (feeData: any, currency: string): number => {
  if (!feeData && feeData !== 0) return 0;
  if (typeof feeData === 'object' && feeData !== null) {
    if (feeData[currency] !== undefined) {
      return parseFloat(String(feeData[currency])) || 0;
    }
    const values = Object.values(feeData);
    if (values.length > 0) {
      return parseFloat(String(values[0])) || 0;
    }
    return 0;
  }
  return parseFloat(String(feeData)) || 0;
};

export const extractAmountValue = (amountData: any, currency: string): number => {
  if (!amountData && amountData !== 0) return 0;
  if (typeof amountData === 'object' && amountData !== null) {
    if (amountData[currency] !== undefined) {
      return parseFloat(String(amountData[currency])) || 0;
    }
    const values = Object.values(amountData);
    if (values.length > 0) {
      return parseFloat(String(values[0])) || 0;
    }
    return 0;
  }
  return parseFloat(String(amountData)) || 0;
};

export const getRequiredConfirmations = (chain: string): number => {
  const confirmationMap: { [key: string]: number } = {
    'XMR': 6, 'BTC': 3, 'ETH': 12, 'BSC': 15, 'POLYGON': 30,
    'SOL': 31, 'TON': 1, 'TRON': 20, 'LTC': 6, 'DOGE': 6,
    'DASH': 6, 'ARBITRUM': 12, 'OPTIMISM': 12, 'AVALANCHE': 12, 'FANTOM': 12,
  };
  return confirmationMap[chain?.toUpperCase()] || 12;
};

/**
 * Deposit-side explorer link.
 *
 * The chain -> explorer table this used to inline now lives in
 * `@/lib/blockchain-explorer`, shared with the withdrawal surfaces, so a
 * deposit and a withdrawal on the same chain can no longer disagree about which
 * explorer is authoritative — and the chains this table was missing (BASE,
 * CELO, RSK, HECO, CRONOS, MO, every testnet, and Fantom, which was keyed
 * "FANTOM" while the platform's symbol for it is "FTM") now resolve here too.
 *
 * The blockchair search fallback is kept because this function returns a plain
 * string and both call sites render an unconditional anchor. A search page for
 * an unknown chain is a poor answer, but it is the answer this screen has
 * always given, and changing it is a deposit-UI decision rather than part of
 * consolidating the table. New call sites should use `getExplorerTxUrl`
 * directly and handle its `null`.
 */
export const getBlockchainExplorerUrl = (chain: string, txHash: string): string =>
  getExplorerTxUrl(chain, txHash) ??
  `https://blockchair.com/search?q=${encodeURIComponent(txHash ?? "")}`;

export const getEstimatedTime = (chain: string): string => {
  const timeMap: { [key: string]: string } = {
    'XMR': '20-30 minutes', 'BTC': '30-60 minutes', 'ETH': '2-5 minutes',
    'BSC': '1-3 minutes', 'POLYGON': '2-5 minutes', 'SOL': '1-2 minutes',
    'TON': '5-10 seconds', 'TRON': '1-3 minutes', 'LTC': '15-30 minutes',
    'DOGE': '15-30 minutes', 'DASH': '15-30 minutes', 'ARBITRUM': '2-5 minutes',
    'OPTIMISM': '2-5 minutes', 'AVALANCHE': '1-3 minutes', 'FANTOM': '1-3 minutes',
  };
  return timeMap[chain?.toUpperCase()] || '5-15 minutes';
};

export const getNetworkDisplayName = (chain: any): string => {
  try {
    if (chain.name && typeof chain.name === 'string' && chain.name !== chain.id) {
      return chain.name;
    }
    if (chain.id) {
      const id = String(chain.id);
      if (id.includes('_NATIVE')) return id.replace('_NATIVE', ' Native');
      if (id.includes('_')) {
        const parts = id.split('_');
        if (parts.length === 2 && parts[0] === parts[1]) return `${parts[0]} Network`;
        return `${parts[0]} (${parts[1]})`;
      }
      return id;
    }
    return typeof chain.chain === 'string' ? chain.chain : 'Unknown Network';
  } catch {
    return 'Unknown Network';
  }
};

export const getNetworkSubtitle = (chain: any, selectedCurrency: string): string => {
  try {
    if (chain.chain && typeof chain.chain === 'string' && chain.chain !== chain.id) {
      return chain.chain;
    }
    if (chain.contractType && typeof chain.contractType === 'string') {
      return chain.contractType;
    }
    return selectedCurrency || 'Unknown';
  } catch {
    return selectedCurrency || 'Unknown';
  }
};

export const copyToClipboard = (text: string, toast: any) => {
  navigator.clipboard.writeText(text);
  toast.success("Copied to clipboard!");
};

export const getPaymentGatewayIcon = (alias: string) => {
  const icons: { [key: string]: string } = {
    'stripe': '💳', 'paypal': '💛', 'payu': '🟢', 'paytm': '🔵',
    'authorizenet': '🔴', 'adyen': '💚', '2checkout': '💜', 'dlocal': '🟠',
    'eway': '🔵', 'ipay88': '🟣', 'payfast': '🟢', 'mollie': '🩷',
    'paysafe': '🔷', 'paystack': '🔵', 'klarna': '🩷'
  };
  return icons[alias] || '💳';
};
