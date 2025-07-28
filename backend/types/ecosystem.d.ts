// Ecosystem Market
interface EcosystemMarket {
  id: string;
  symbol: string;
  pair: string;
  isTrending?: boolean;
  isHot?: boolean;
  metadata?: EcosystemMarketMetaData;
  status: boolean;
}

type EcosystemMarketMetaData = {
  precision: EcosystemMarketPrecision;
  limits: EcosystemMarketLimits;
  taker: number;
  maker: number;
};

type EcosystemMarketLimits = {
  amount: {
    min: number;
    max: number;
  };
  price: {
    min: number;
    max: number;
  };
  cost: {
    min: number;
    max: number;
  };
};

type EcosystemMarketPrecision = {
  amount: number;
  price: number;
};

// Ecosystem Order
interface EcosystemOrder {
  id: string;
  referenceId?: string;
  userId: string;
  user: userAttributes;
  status: EcosystemOrderStatus;
  symbol: string;
  type: EcosystemOrderType;
  timeInForce: EcosystemTimeInForce;
  side: EcosystemOrderSide;
  price: bigint;
  average?: bigint;
  amount: bigint;
  filled: bigint;
  remaining: bigint;
  cost: bigint;
  trades?: TradeDetail[];
  fee: bigint;
  feeCurrency: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TradeDetail {
  id: string;
  amount: number;
  price: number;
  cost: number;
  side: "BUY" | "SELL";
  timestamp: number;
}

// Ecosystem Order Side
enum EcosystemOrderSide {
  BUY = "BUY",
  SELL = "SELL",
}

// Ecosystem Order Type
enum EcosystemOrderType {
  MARKET = "MARKET",
  LIMIT = "LIMIT",
}

// Ecosystem Order Status
enum EcosystemOrderStatus {
  OPEN = "OPEN",
  CLOSED = "CLOSED",
  CANCELED = "CANCELED",
  EXPIRED = "EXPIRED",
  REJECTED = "REJECTED",
}

// Ecosystem Time In Force
enum EcosystemTimeInForce {
  GTC = "GTC",
  IOC = "IOC",
  FOK = "FOK",
  PO = "PO",
}

// Ecosystem Private Ledger
interface EcosystemPrivateLedger {
  id: string;
  walletId: string;
  index: number;
  currency: string;
  chain: string;
  network: string;
  offchainDifference: number;
}

// Type for ecosystemCustodialWallet model
interface EcosystemCustodialWallet {
  id: string;
  masterWalletId: string;
  masterWallet: EcosystemMasterWallet;
  address: string;
  chain: string;
  status: CustodialWalletStatus;
  createdAt: Date;
}

// Enum for CustodialWalletStatus
enum CustodialWalletStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SUSPENDED = "SUSPENDED",
}

type ParsedTransaction = {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
};

// Types for WalletData model
interface WalletData {
  id: string;
  walletId?: number;
  currency: string;
  chain: string;
  data: any;
  index: number;
}

// Types for EcosystemMasterWallet model
type MasterWalletStatus = "ACTIVE" | "INACTIVE";

interface EcosystemMasterWallet {
  id: string;
  chain: string;
  currency: string;
  address: string;
  data: any;
  status: MasterWalletStatus;
  lastIndex?: number;
  balance?: number;
}

interface EcosystemToken {
  id: string;
  name: string;
  currency: string;
  chain: string;
  network?: string;
  type: string;
  contract: string;
  decimals: number;
  status?: boolean;
  precision?: EcosystemPrecision;
  limits?: EcosystemTokenLimits;
  fees?: any;
  contractType?: EcosystemTokenContractType;
  createdAt: Date;
}

enum EcosystemTokenContractType {
  PERMIT = "PERMIT",
  NO_PERMIT = "NO_PERMIT",
  NATIVE = "NATIVE",
}

type EcosystemPrecision = {
  amount: number;
  price: number;
};

type EcosystemTokenLimits = {
  deposit: {
    min: number;
    max: number;
  };
  withdraw: {
    min: number;
    max: number;
  };
};

enum ExchangeOrderSide {
  BUY = "BUY",
  SELL = "SELL",
}

enum ExchangeOrderType {
  MARKET = "MARKET",
  LIMIT = "LIMIT",
}

enum ExchangeOrderStatus {
  OPEN = "OPEN",
  CLOSED = "CLOSED",
  CANCELED = "CANCELED",
  EXPIRED = "EXPIRED",
  REJECTED = "REJECTED",
}

enum ExchangeTimeInForce {
  GTC = "GTC",
  IOC = "IOC",
  FOK = "FOK",
  PO = "PO",
}

interface ExchangeOrder {
  id: string;
  referenceId: string;
  userId: string;
  user: User;
  status: ExchangeOrderStatus;
  symbol: string;
  type: ExchangeOrderType;
  timeInForce: ExchangeTimeInForce;
  side: ExchangeOrderSide;
  price: number;
  average: number;
  amount: number;
  filled: number;
  remaining: number;
  cost: number;
  trades?: any;
  fee: any;
  feeCurrency?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Web3WalletData {
  address: string;
  chain: string;
  data: string;
}
