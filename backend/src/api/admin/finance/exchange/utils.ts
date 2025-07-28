import { models, sequelize } from "@b/db";
import { Op } from "sequelize";

interface StandardizedNetworkData {
  network: string;
  withdrawStatus: boolean;
  depositStatus: boolean;
  minWithdraw: number;
  maxWithdraw: number | null;
  withdrawFee: number;
  withdrawMemo: boolean;
  chainId: string;
  precision: number;
}

// Function to standardize data from Binance
export const standardizeBinanceData = (data: any) => {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return Object.values(data).map((item: any) => {
      const info = item.info; // Extract the info object
      return {
        network: item.network,
        withdrawStatus: item.withdraw, // Use the correct property from the top level
        depositStatus: item.deposit, // Use the correct property from the top level
        minWithdraw: parseFloat(info.withdrawMin),
        maxWithdraw: parseFloat(info.withdrawMax),
        withdrawFee: parseFloat(info.withdrawFee),
        withdrawMemo:
          info.memoRegex && info.memoRegex.trim() !== "" ? true : false,
      };
    });
  }
  return []; // Return an empty array if data does not match expected structure
};

// Function to standardize data from Kucoin
export const standardizeKucoinData = (data: any) => {
  const standardizedData = Object.values(data.networks || []);
  return standardizedData.map((network: any) => ({
    network: network.name,
    withdrawStatus: network.withdraw,
    depositStatus: network.deposit,
    minWithdraw: parseFloat(network.limits?.withdrawal?.min ?? 0),
    maxWithdraw: null, // Not provided by KuCoin
    withdrawFee: parseFloat(network.fee ?? 0),
    withdrawMemo:
      network.contractAddress && network.contractAddress.trim() !== ""
        ? true
        : false,
    chainId: network.id ? network.id.toUpperCase() : null, // Ensure id exists before calling toUpperCase
    precision: countDecimals(network.precision ?? 0) || 8, // Ensure precision is defined
  }));
};

export const standardizeXtData = (data: any): StandardizedNetworkData[] => {
  const standardizedData: StandardizedNetworkData[] = [];

  if (data && typeof data === "object") {
    for (const networkKey in data.networks || {}) {
      const network = data.networks[networkKey];
      const fee = parseFloat(data.fee);

      // Set fee to null if it's invalid
      const validFee = !isNaN(fee) ? fee : null;

      standardizedData.push({
        network: networkKey,
        withdrawStatus: data.info.withdrawStatus === "1",
        depositStatus: data.info.depositStatus === "1",
        minWithdraw: parseFloat(network.limits?.withdraw?.min ?? "0"),
        maxWithdraw: network.limits?.withdraw?.max
          ? parseFloat(network.limits.withdraw.max)
          : null,
        withdrawFee: validFee ?? 0,
        withdrawMemo: false, // XT data doesn't have memo information, defaulting to false
        chainId: networkKey.toUpperCase(), // Using the network key as the chain ID
        precision: countDecimals(data.precision ?? 1e-8),
      });
    }
  }

  return standardizedData;
};

export function countDecimals(num: number): number {
  if (Math.floor(num) === num) return 0;
  const str = num.toString();
  const scientificNotationMatch = /^(\d+\.?\d*|\.\d+)e([\+\-]\d+)$/.exec(str);

  if (scientificNotationMatch) {
    const decimalStr = scientificNotationMatch[1].split(".")[1] || "";
    let decimalCount = decimalStr.length + parseInt(scientificNotationMatch[2]);
    decimalCount = Math.abs(decimalCount); // Take the absolute value
    return Math.min(decimalCount, 8);
  } else {
    const decimalStr = str.split(".")[1] || "";
    return Math.min(decimalStr.length, 8);
  }
}

// Function to standardize data from Okex
export const standardizeOkxData = (data: any) => {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return Object.values(data).map((item: any) => {
      return {
        network: item.network,
        withdrawStatus: item.withdraw,
        depositStatus: item.deposit,
        minWithdraw: parseFloat(item.minWithdrawal),
        maxWithdraw: parseFloat(item.maxWithdrawal),
        withdrawFee: parseFloat(item.withdrawalFee),
        withdrawMemo:
          item.memoRegex && item.memoRegex.trim() !== "" ? true : false,
      };
    });
  }
  return [];
};

export async function saveLicense(productId: string, username: string) {
  // Start a transaction
  await sequelize
    .transaction(async (transaction) => {
      // Update exchanges to set status false where productId is not the given productId
      await models.exchange.update(
        {
          status: false,
        },
        {
          where: {
            status: true,
            productId: { [Op.not]: productId },
          },
          transaction,
        }
      );

      // Update the specific exchange by productId to set the new license status and username
      await models.exchange.update(
        {
          licenseStatus: true,
          status: true,
          username: username,
        },
        {
          where: { productId: productId },
          transaction,
        }
      );
    })
    .catch((error) => {
      console.error("Error in saveLicense:", error);
      throw new Error(`Failed to save license: ${error.message}`);
    });
}
