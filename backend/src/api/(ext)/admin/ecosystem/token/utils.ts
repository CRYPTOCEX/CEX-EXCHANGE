import { models } from "@b/db";
import { RedisSingleton } from "@b/utils/redis";
import {
  baseStringSchema,
  baseBooleanSchema,
  baseNumberSchema,
  baseEnumSchema,
} from "@b/utils/schema";

const redis = RedisSingleton.getInstance();

const CACHE_KEY_PREFIX = "ecosystem_token_icon:";
const CACHE_EXPIRY = 3600; // 1 hour in seconds

export async function updateIconInCache(
  currency: string,
  icon: string
): Promise<void> {
  const cacheKey = `${CACHE_KEY_PREFIX}${currency}`;
  await redis.set(cacheKey, icon, "EX", CACHE_EXPIRY);
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
export async function getEcosystemTokensAll(): Promise<
  ecosystemTokenAttributes[]
> {
  return models.ecosystemToken.findAll();
}

// Fetch a single token by chain and currency
export async function getEcosystemTokenByChainAndCurrency(
  chain: string,
  currency: string
): Promise<ecosystemTokenAttributes | null> {
  return models.ecosystemToken.findOne({
    where: {
      chain,
      currency,
    },
  });
}

// Fetch a single token by ID
export async function getEcosystemTokenById(
  id: string
): Promise<ecosystemTokenAttributes | null> {
  return models.ecosystemToken.findByPk(id);
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
export async function createEcosystemToken({
  chain,
  name,
  currency,
  contract,
  decimals,
  type,
  network,
}): Promise<ecosystemTokenCreationAttributes> {
  return models.ecosystemToken.create({
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
}

// Import a new token
export async function importEcosystemToken({
  name,
  currency,
  chain,
  network,
  type,
  contract,
  decimals,
  contractType,
}): Promise<ecosystemTokenAttributes> {
  return models.ecosystemToken.create({
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
}

// Update a token's icon
export async function updateAdminTokenIcon(
  id: number,
  icon: string
): Promise<void> {
  await models.ecosystemToken.update(
    { icon },
    {
      where: { id },
    }
  );
}

// Fetch tokens without permit
export async function getNoPermitTokens(chain: string) {
  return models.ecosystemToken.findAll({
    where: {
      chain,
      contractType: "NO_PERMIT",
      network: process.env[`${chain}_NETWORK`],
      status: true,
    },
  });
}

// Update multiple tokens' status in bulk
export async function updateStatusBulk(
  ids: number[],
  status: boolean
): Promise<void> {
  await models.ecosystemToken.update(
    { status },
    {
      where: { id: ids },
    }
  );
}

// Update a token with precision, limits, and fee
export async function updateAdminToken(
  id: number,
  precision: number,
  limits: any,
  fee: any
): Promise<void> {
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
}
