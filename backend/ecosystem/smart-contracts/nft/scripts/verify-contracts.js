const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Contract Verification Script for Multiple Block Explorers
 * Supports: Etherscan, BscScan, PolygonScan, Arbiscan, Optimistic Etherscan
 */

// Configuration for different networks
const NETWORK_CONFIG = {
  mainnet: {
    name: "Ethereum Mainnet",
    explorer: "https://api.etherscan.io/api",
    apiKeyEnv: "ETHERSCAN_API_KEY",
    chainId: 1
  },
  goerli: {
    name: "Goerli Testnet",
    explorer: "https://api-goerli.etherscan.io/api",
    apiKeyEnv: "ETHERSCAN_API_KEY",
    chainId: 5
  },
  bsc: {
    name: "BSC Mainnet",
    explorer: "https://api.bscscan.com/api",
    apiKeyEnv: "BSCSCAN_API_KEY",
    chainId: 56
  },
  bscTestnet: {
    name: "BSC Testnet",
    explorer: "https://api-testnet.bscscan.com/api",
    apiKeyEnv: "BSCSCAN_API_KEY",
    chainId: 97
  },
  polygon: {
    name: "Polygon Mainnet",
    explorer: "https://api.polygonscan.com/api",
    apiKeyEnv: "POLYGONSCAN_API_KEY",
    chainId: 137
  },
  mumbai: {
    name: "Mumbai Testnet",
    explorer: "https://api-testnet.polygonscan.com/api",
    apiKeyEnv: "POLYGONSCAN_API_KEY",
    chainId: 80001
  },
  arbitrum: {
    name: "Arbitrum One",
    explorer: "https://api.arbiscan.io/api",
    apiKeyEnv: "ARBISCAN_API_KEY",
    chainId: 42161
  },
  optimism: {
    name: "Optimism",
    explorer: "https://api-optimistic.etherscan.io/api",
    apiKeyEnv: "OPTIMISTIC_ETHERSCAN_API_KEY",
    chainId: 10
  }
};

// Contract deployment records
const DEPLOYMENT_FILE = path.join(__dirname, "../deployments.json");

/**
 * Load deployment data
 */
function loadDeployments() {
  if (!fs.existsSync(DEPLOYMENT_FILE)) {
    console.log("No deployment file found. Creating new one...");
    return {};
  }
  return JSON.parse(fs.readFileSync(DEPLOYMENT_FILE, "utf8"));
}

/**
 * Save deployment data
 */
function saveDeployments(deployments) {
  fs.writeFileSync(DEPLOYMENT_FILE, JSON.stringify(deployments, null, 2));
}

/**
 * Get network configuration
 */
async function getNetworkConfig() {
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  const config = Object.values(NETWORK_CONFIG).find(c => c.chainId === chainId);
  if (!config) {
    throw new Error(`Unsupported network with chainId: ${chainId}`);
  }
  
  return config;
}

/**
 * Verify a single contract
 */
async function verifyContract(contractAddress, contractName, constructorArgs = [], libraries = {}) {
  try {
    const config = await getNetworkConfig();
    const apiKey = process.env[config.apiKeyEnv];
    
    if (!apiKey) {
      console.error(`❌ API key not found. Please set ${config.apiKeyEnv} environment variable`);
      return false;
    }

    console.log(`\n📝 Verifying ${contractName} on ${config.name}...`);
    console.log(`   Contract: ${contractAddress}`);

    // Prepare verification command
    const verifyArgs = [
      "verify:verify",
      "--network", process.env.HARDHAT_NETWORK || "hardhat",
      "--contract", contractName,
      "--address", contractAddress
    ];

    // Add constructor arguments if any
    if (constructorArgs.length > 0) {
      const argsFile = path.join(__dirname, `verify-args-${Date.now()}.js`);
      fs.writeFileSync(argsFile, `module.exports = ${JSON.stringify(constructorArgs, null, 2)};`);
      verifyArgs.push("--constructor-args", argsFile);
    }

    // Add libraries if any
    if (Object.keys(libraries).length > 0) {
      const libString = Object.entries(libraries)
        .map(([name, address]) => `${name}:${address}`)
        .join(",");
      verifyArgs.push("--libraries", libString);
    }

    // Execute verification
    const { exec } = require("child_process");
    const util = require("util");
    const execPromise = util.promisify(exec);

    try {
      const { stdout, stderr } = await execPromise(`npx hardhat ${verifyArgs.join(" ")}`);
      
      if (stdout.includes("Successfully verified") || stdout.includes("Already Verified")) {
        console.log(`✅ ${contractName} verified successfully!`);
        console.log(`   View on explorer: ${getExplorerUrl(config, contractAddress)}`);
        return true;
      } else {
        console.error(`❌ Verification failed for ${contractName}`);
        console.error(stderr || stdout);
        return false;
      }
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log(`✅ ${contractName} already verified`);
        return true;
      }
      console.error(`❌ Error verifying ${contractName}:`, error.message);
      return false;
    }

  } catch (error) {
    console.error(`❌ Verification error:`, error);
    return false;
  }
}

/**
 * Get explorer URL for contract
 */
function getExplorerUrl(config, contractAddress) {
  const baseUrl = config.explorer.replace("/api", "");
  return `${baseUrl}/address/${contractAddress}#code`;
}

/**
 * Verify all deployed contracts
 */
async function verifyAllContracts() {
  console.log("🚀 Starting contract verification process...\n");

  const deployments = loadDeployments();
  const config = await getNetworkConfig();
  
  if (!deployments[config.name]) {
    console.log(`❌ No deployments found for ${config.name}`);
    return;
  }

  const contracts = deployments[config.name];
  const results = [];

  // Verify each contract
  for (const [contractName, contractData] of Object.entries(contracts)) {
    const result = await verifyContract(
      contractData.address,
      contractData.contractPath || contractName,
      contractData.constructorArgs || [],
      contractData.libraries || {}
    );
    
    results.push({ name: contractName, verified: result });
    
    // Update deployment record
    contracts[contractName].verified = result;
    contracts[contractName].verifiedAt = result ? new Date().toISOString() : null;
    
    // Wait between verifications to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // Save updated deployments
  saveDeployments(deployments);

  // Print summary
  console.log("\n📊 Verification Summary:");
  console.log("========================");
  results.forEach(({ name, verified }) => {
    console.log(`${verified ? "✅" : "❌"} ${name}`);
  });

  const successCount = results.filter(r => r.verified).length;
  console.log(`\n✨ Verified ${successCount}/${results.length} contracts`);
}

/**
 * Verify specific contract by name
 */
async function verifySpecificContract(contractName) {
  const deployments = loadDeployments();
  const config = await getNetworkConfig();
  
  if (!deployments[config.name] || !deployments[config.name][contractName]) {
    console.log(`❌ Contract ${contractName} not found in deployments for ${config.name}`);
    return;
  }

  const contractData = deployments[config.name][contractName];
  const result = await verifyContract(
    contractData.address,
    contractData.contractPath || contractName,
    contractData.constructorArgs || [],
    contractData.libraries || {}
  );

  if (result) {
    contractData.verified = true;
    contractData.verifiedAt = new Date().toISOString();
    saveDeployments(deployments);
  }
}

/**
 * Generate verification report
 */
async function generateVerificationReport() {
  const deployments = loadDeployments();
  const config = await getNetworkConfig();
  
  console.log("\n📄 Verification Report");
  console.log("======================");
  console.log(`Network: ${config.name}`);
  console.log(`Date: ${new Date().toLocaleString()}\n`);

  if (!deployments[config.name]) {
    console.log("No contracts deployed on this network");
    return;
  }

  const contracts = deployments[config.name];
  let verified = 0;
  let unverified = 0;

  Object.entries(contracts).forEach(([name, data]) => {
    const status = data.verified ? "✅ Verified" : "❌ Not Verified";
    const explorerUrl = data.verified ? getExplorerUrl(config, data.address) : "";
    
    console.log(`${name}:`);
    console.log(`  Status: ${status}`);
    console.log(`  Address: ${data.address}`);
    if (data.verified) {
      console.log(`  Explorer: ${explorerUrl}`);
      console.log(`  Verified At: ${data.verifiedAt}`);
      verified++;
    } else {
      unverified++;
    }
    console.log("");
  });

  console.log("Summary:");
  console.log(`  Total Contracts: ${verified + unverified}`);
  console.log(`  Verified: ${verified}`);
  console.log(`  Unverified: ${unverified}`);
  console.log(`  Verification Rate: ${((verified / (verified + unverified)) * 100).toFixed(1)}%`);
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case "all":
        await verifyAllContracts();
        break;
      case "contract":
        if (!args[1]) {
          console.error("Please specify contract name");
          process.exit(1);
        }
        await verifySpecificContract(args[1]);
        break;
      case "report":
        await generateVerificationReport();
        break;
      default:
        console.log("Usage:");
        console.log("  npm run verify:all     - Verify all deployed contracts");
        console.log("  npm run verify:contract <name> - Verify specific contract");
        console.log("  npm run verify:report  - Generate verification report");
        break;
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  verifyContract,
  verifyAllContracts,
  verifySpecificContract,
  generateVerificationReport
};