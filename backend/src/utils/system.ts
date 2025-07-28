import { models } from "@b/db";

export async function updateExtensionQuery(id: string, version: string) {
  return await models.extension.update(
    {
      version: version,
    },
    {
      where: {
        productId: id,
      },
    }
  );
}

export async function updateBlockchainQuery(id: string, version: string) {
  return await models.ecosystemBlockchain.update(
    {
      version: version,
    },
    {
      where: {
        productId: id,
      },
    }
  );
}

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
