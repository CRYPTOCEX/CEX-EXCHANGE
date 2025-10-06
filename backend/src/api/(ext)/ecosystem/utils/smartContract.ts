import fs from "fs";
import path from "path";
import { chainConfigs } from "./chains";
import { logError } from "@b/utils/logger";

export async function getSmartContract(contractPath: string, name: string) {
  const filePath = path.resolve(
    process.cwd(),
    `backend/ecosystem/smart-contracts/${contractPath}/${name}.json`
  );
  
  try {
    const fileContent = fs.readFileSync(filePath, "utf8");
    const contractJson = JSON.parse(fileContent);
    const { abi, bytecode } = contractJson;
    if (!bytecode || !abi)
      throw new Error(`Failed to extract bytecode or ABI for ${name}`);
    return { abi, bytecode };
  } catch (error) {
    logError("get_smart_contract", error, __filename);
    console.error(`Failed to read contract JSON for ${name}: ${error.message}`);
    throw error;
  }
}

export const getContractAbi = async (
  chain: string,
  network: string,
  contractAddress: string
) => {
  const chainConfig = chainConfigs[chain];
  if (!chainConfig) {
    throw new Error(`Unsupported chain: ${chain}`);
  }

  const apiKey = process.env[`${chain}_EXPLORER_API_KEY`];
  if (!apiKey) {
    throw new Error(`API Key for ${chain} is not set`);
  }

  const networkConfig = chainConfig.networks[network];
  if (!networkConfig || !networkConfig.explorer) {
    throw new Error(`Unsupported network: ${network} for chain: ${chain}`);
  }

  const chainIdParam = networkConfig.chainId ? `&chainid=${networkConfig.chainId}` : "";
  const apiUrl = `https://${networkConfig.explorer}/v2/api?module=contract&action=getabi&address=${contractAddress}${chainIdParam}&apikey=${apiKey}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    // Handle API errors gracefully
    if (data.status === "0" && data.message === "NOTOK") {
      console.error(`[ETHERSCAN_API_ERROR] Contract ABI for ${contractAddress}: ${data.result}`);
      throw new Error(`Contract ABI not available: ${data.result}`);
    }

    if (data.status !== "1") {
      throw new Error(`API Error: ${data.message}`);
    }

    return data.result;
  } catch (error) {
    logError("get_contract_abi", error, __filename);
    throw new Error(`Failed to fetch contract ABI: ${error.message}`);
  }
};
