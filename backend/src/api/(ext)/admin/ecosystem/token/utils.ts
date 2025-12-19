import { models } from "@b/db";
import { RedisSingleton } from "@b/utils/redis";
import {
  baseStringSchema,
  baseBooleanSchema,
  baseNumberSchema,
  baseEnumSchema,
} from "@b/utils/schema";

interface LogContext {
  step?: (message: string) => void;
  success?: (message: string) => void;
  fail?: (message: string) => void;
}

const redis = RedisSingleton.getInstance();

const CACHE_KEY_PREFIX = "ecosystem_token_icon:";
const CACHE_EXPIRY = 3600; // 1 hour in seconds

export async function updateIconInCache(
  currency: string,
  icon: string,
  ctx?: LogContext
): Promise<void> {
  try {
    ctx?.step?.(`Updating icon in cache for currency ${currency}`);
    const cacheKey = `${CACHE_KEY_PREFIX}${currency}`;
    await redis.set(cacheKey, icon, "EX", CACHE_EXPIRY);
    ctx?.success?.(`Icon cached for ${currency}`);
  } catch (error) {
    ctx?.fail?.(error.message);
    throw error;
  }
}

const id = baseStringSchema("ID of the ecosystem token");
const contract = baseStringSchema("Contract address of the token");
const name = baseStringSchema("Name of the token");
const currency = baseStringSchema("Currency of the token");
const chain = baseStringSchema("Blockchain chain associated with the token");
const network = baseStringSchema("Network where the token operates");
const type = baseStringSchema("Type of the token");
const decimals = baseNumberSchema("Number of decimals for the token");
const status = baseBooleanSchema("Operational status of the token");
const precision = baseNumberSchema("Precision level of the token");
const limits = {
  type: "object",
  nullable: true,
  properties: {
    deposit: {
      type: "object",
      properties: {
        min: baseNumberSchema("Minimum deposit amount"),
        max: baseNumberSchema("Maximum deposit amount"),
      },
    },
    withdraw: {
      type: "object",
      properties: {
        min: baseNumberSchema("Minimum withdrawal amount"),
        max: baseNumberSchema("Maximum withdrawal amount"),
      },
    },
  },
};
const fee = {
  type: "object",
  nullable: true,
  properties: {
    min: baseNumberSchema("Minimum fee amount"),
    percentage: baseNumberSchema("Percentage fee amount"),
  },
};

const icon = baseStringSchema("URL to the token icon", 1000, 0, true);
const contractType = baseEnumSchema(
  "Type of contract (PERMIT, NO_PERMIT, NATIVE)",
  ["PERMIT", "NO_PERMIT", "NATIVE"]
);

export const ecosystemTokenSchema = {
  id,
  contract,
  name,
  currency,
  chain,
  network,
  type,
  decimals,
  status,
  precision,
  limits,
  fee,
  icon,
  contractType,
};

export const baseEcosystemTokenSchema = {
  id,
  contract,
  name,
  currency,
  chain,
  network,
  type,
  decimals,
  status,
  precision,
  limits,
  fee,
  icon,
  contractType,
};

export const ecosystemTokenUpdateSchema = {
  type: "object",
  properties: {
    icon,
    fee,
    limits,
    status,
  },
  required: [],
};

export const ecosystemTokenDeploySchema = {
  type: "object",
  properties: {
    name,
    currency,
    chain,
    type,
    decimals,
    status,
    precision,
    limits,
    fee,
    icon,
    initialSupply: baseNumberSchema("Initial supply of the token"),
    initialHolder: baseStringSchema("Address of the initial token holder"),
    marketCap: baseNumberSchema("Maximum supply cap of the token"),
  },
  required: [
    "name",
    "currency",
    "chain",
    "decimals",
    "initialSupply",
    "initialHolder",
    "marketCap",
  ],
};

export const ecosystemTokenImportSchema = {
  type: "object",
  properties: {
    icon,
    name,
    currency,
    chain,
    network,
    contract,
    contractType,
    decimals,
    precision,
    type,
    fee,
    limits,
    status,
  },
  required: [
    "name",
    "currency",
    "chain",
    "network",
    "contract",
    "decimals",
    "type",
    "contractType",
  ],
};

export const ecosystemTokenStoreSchema = {
  description: `Ecosystem token created or updated successfully`,
  content: {
    "application/json": {
      schema: ecosystemTokenDeploySchema,
    },
  },
};

// Fetch all tokens without filtering
export async function getEcosystemTokensAll(
  ctx?: LogContext
): Promise<ecosystemTokenAttributes[]> {
  try {
    ctx?.step?.("Fetching all ecosystem tokens");
    const tokens = await models.ecosystemToken.findAll();
    ctx?.success?.(`Found ${tokens.length} ecosystem token(s)`);
    return tokens;
  } catch (error) {
    ctx?.fail?.(error.message);
    throw error;
  }
}

// Fetch a single token by chain and currency
export async function getEcosystemTokenByChainAndCurrency(
  chain: string,
  currency: string,
  ctx?: LogContext
): Promise<ecosystemTokenAttributes | null> {
  try {
    ctx?.step?.(`Fetching token for chain ${chain} and currency ${currency}`);
    const token = await models.ecosystemToken.findOne({
      where: {
        chain,
        currency,
      },
    });
    if (token) {
      ctx?.success?.(`Token found for ${chain}/${currency}`);
    } else {
      ctx?.step?.(`No token found for ${chain}/${currency}`);
    }
    return token;
  } catch (error) {
    ctx?.fail?.(error.message);
    throw error;
  }
}

// Fetch a single token by ID
export async function getEcosystemTokenById(
  id: string,
  ctx?: LogContext
): Promise<ecosystemTokenAttributes | null> {
  try {
    ctx?.step?.(`Fetching token with ID ${id}`);
    const token = await models.ecosystemToken.findByPk(id);
    if (token) {
      ctx?.success?.(`Token found with ID ${id}`);
    } else {
      ctx?.step?.(`No token found with ID ${id}`);
    }
    return token;
  } catch (error) {
    ctx?.fail?.(error.message);
    throw error;
  }
}

// Fetch tokens by chain
export async function getEcosystemTokensByChain(
  chain: string
): Promise<ecosystemTokenAttributes[]> {
  return models.ecosystemToken.findAll({
    where: {
      chain,
      network: process.env[`${chain}_NETWORK`],
    },
  });
}

// Create a new token
export async function createEcosystemToken(
  {
    chain,
    name,
    currency,
    contract,
    decimals,
    type,
    network,
  },
  ctx?: LogContext
): Promise<ecosystemTokenCreationAttributes> {
  try {
    ctx?.step?.(`Creating ecosystem token ${name} (${currency}) on ${chain}`);
    const token = await models.ecosystemToken.create({
      chain,
      name,
      currency,
      contract,
      decimals,
      type,
      network,
      status: true,
      contractType: "PERMIT",
    });
    ctx?.success?.(`Token ${name} created successfully`);
    return token;
  } catch (error) {
    ctx?.fail?.(error.message);
    throw error;
  }
}

// Import a new token
export async function importEcosystemToken(
  {
    name,
    currency,
    chain,
    network,
    type,
    contract,
    decimals,
    contractType,
  },
  ctx?: LogContext
): Promise<ecosystemTokenAttributes> {
  try {
    ctx?.step?.(`Importing token ${name} (${currency}) on ${chain}`);
    const token = await models.ecosystemToken.create({
      name,
      currency,
      chain,
      network,
      type,
      contract,
      decimals,
      status: true,
      contractType,
    });
    ctx?.success?.(`Token ${name} imported successfully`);
    return token;
  } catch (error) {
    ctx?.fail?.(error.message);
    throw error;
  }
}

// Update a token's icon
export async function updateAdminTokenIcon(
  id: number,
  icon: string,
  ctx?: LogContext
): Promise<void> {
  try {
    ctx?.step?.(`Updating icon for token ID ${id}`);
    await models.ecosystemToken.update(
      { icon },
      {
        where: { id },
      }
    );
    ctx?.success?.(`Token icon updated for ID ${id}`);
  } catch (error) {
    ctx?.fail?.(error.message);
    throw error;
  }
}

// Fetch tokens without permit
export async function getNoPermitTokens(
  chain: string,
  ctx?: LogContext
) {
  try {
    ctx?.step?.(`Fetching NO_PERMIT tokens for chain ${chain}`);
    const tokens = await models.ecosystemToken.findAll({
      where: {
        chain,
        contractType: "NO_PERMIT",
        network: process.env[`${chain}_NETWORK`],
        status: true,
      },
    });
    ctx?.success?.(`Found ${tokens.length} NO_PERMIT token(s) for ${chain}`);
    return tokens;
  } catch (error) {
    ctx?.fail?.(error.message);
    throw error;
  }
}

// Update multiple tokens' status in bulk
export async function updateStatusBulk(
  ids: number[],
  status: boolean,
  ctx?: LogContext
): Promise<void> {
  try {
    ctx?.step?.(`Updating status for ${ids.length} token(s)`);
    await models.ecosystemToken.update(
      { status },
      {
        where: { id: ids },
      }
    );
    ctx?.success?.(`Status updated for ${ids.length} token(s)`);
  } catch (error) {
    ctx?.fail?.(error.message);
    throw error;
  }
}

// Update a token with precision, limits, and fee
export async function updateAdminToken(
  id: number,
  precision: number,
  limits: any,
  fee: any,
  ctx?: LogContext
): Promise<void> {
  try {
    ctx?.step?.(`Updating token details for ID ${id}`);
    await models.ecosystemToken.update(
      {
        precision,
        limits,
        fee,
      },
      {
        where: { id },
      }
    );
    ctx?.success?.(`Token details updated for ID ${id}`);
  } catch (error) {
    ctx?.fail?.(error.message);
    throw error;
  }
}
