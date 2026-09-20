const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Deploy Upgradeable NFT Marketplace Contracts
 * Uses OpenZeppelin Upgrades Plugin for proxy pattern
 */

// Deployment configuration
const DEPLOYMENT_CONFIG = {
  marketplace: {
    feePercentage: 250, // 2.5%
    minListingPrice: ethers.parseEther("0.0001"),
    maxListingPrice: ethers.parseEther("1000000")
  },
  nft: {
    maxSupply: 10000,
    royaltyPercentage: 500, // 5%
    mintPrice: ethers.parseEther("0.01")
  }
};

// Deployment file for tracking
const DEPLOYMENT_FILE = path.join(__dirname, "../deployments.json");

/**
 * Load existing deployments
 */
function loadDeployments() {
  if (!fs.existsSync(DEPLOYMENT_FILE)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(DEPLOYMENT_FILE, "utf8"));
}

/**
 * Save deployment data
 */
function saveDeployments(deployments) {
  fs.writeFileSync(DEPLOYMENT_FILE, JSON.stringify(deployments, null, 2));
  console.log(`✅ Deployment data saved to ${DEPLOYMENT_FILE}`);
}

/**
 * Deploy NFT Marketplace V2 (Upgradeable)
 */
async function deployMarketplaceV2(feeRecipient, emergencyWithdrawAddress) {
  console.log("\n🚀 Deploying NFT Marketplace V2 (Upgradeable)...");

  const NFTMarketplaceV2 = await ethers.getContractFactory("NFTMarketplaceV2");
  
  // Deploy proxy using OpenZeppelin Upgrades
  const marketplace = await upgrades.deployProxy(
    NFTMarketplaceV2,
    [
      feeRecipient,
      DEPLOYMENT_CONFIG.marketplace.feePercentage,
      emergencyWithdrawAddress
    ],
    {
      initializer: "initialize",
      kind: "uups" // Use UUPS proxy pattern
    }
  );

  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();

  console.log(`✅ NFT Marketplace V2 deployed to: ${marketplaceAddress}`);

  // Get implementation address
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(marketplaceAddress);
  console.log(`   Implementation: ${implementationAddress}`);

  // Get admin address (ProxyAdmin)
  const adminAddress = await upgrades.erc1967.getAdminAddress(marketplaceAddress);
  console.log(`   ProxyAdmin: ${adminAddress}`);

  return {
    proxy: marketplaceAddress,
    implementation: implementationAddress,
    admin: adminAddress,
    contract: marketplace
  };
}

/**
 * Deploy Upgradeable ERC721 NFT Contract
 */
async function deployERC721Upgradeable(name, symbol, baseURI, owner) {
  console.log(`\n🚀 Deploying ${name} (ERC721 Upgradeable)...`);

  const ERC721NFTUpgradeable = await ethers.getContractFactory("ERC721NFTUpgradeable");
  
  const nft = await upgrades.deployProxy(
    ERC721NFTUpgradeable,
    [
      name,
      symbol,
      baseURI,
      DEPLOYMENT_CONFIG.nft.maxSupply,
      DEPLOYMENT_CONFIG.nft.royaltyPercentage,
      owner
    ],
    {
      initializer: "initialize",
      kind: "uups"
    }
  );

  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();

  console.log(`✅ ${name} deployed to: ${nftAddress}`);

  const implementationAddress = await upgrades.erc1967.getImplementationAddress(nftAddress);
  console.log(`   Implementation: ${implementationAddress}`);

  return {
    proxy: nftAddress,
    implementation: implementationAddress,
    contract: nft
  };
}

/**
 * Deploy Upgradeable ERC1155 NFT Contract
 */
async function deployERC1155Upgradeable(name, uri, owner) {
  console.log(`\n🚀 Deploying ${name} (ERC1155 Upgradeable)...`);

  const ERC1155NFTUpgradeable = await ethers.getContractFactory("ERC1155NFTUpgradeable");
  
  const nft = await upgrades.deployProxy(
    ERC1155NFTUpgradeable,
    [
      name,
      uri,
      DEPLOYMENT_CONFIG.nft.royaltyPercentage,
      owner
    ],
    {
      initializer: "initialize",
      kind: "uups"
    }
  );

  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();

  console.log(`✅ ${name} deployed to: ${nftAddress}`);

  const implementationAddress = await upgrades.erc1967.getImplementationAddress(nftAddress);
  console.log(`   Implementation: ${implementationAddress}`);

  return {
    proxy: nftAddress,
    implementation: implementationAddress,
    contract: nft
  };
}

/**
 * Setup roles and permissions
 */
async function setupRolesAndPermissions(marketplace, admins, operators) {
  console.log("\n🔐 Setting up roles and permissions...");

  const ADMIN_ROLE = await marketplace.ADMIN_ROLE();
  const OPERATOR_ROLE = await marketplace.OPERATOR_ROLE();
  const UPGRADER_ROLE = await marketplace.UPGRADER_ROLE();

  // Grant admin roles
  for (const admin of admins) {
    await marketplace.grantRole(ADMIN_ROLE, admin);
    console.log(`   ✅ Granted ADMIN_ROLE to ${admin}`);
  }

  // Grant operator roles
  for (const operator of operators) {
    await marketplace.grantRole(OPERATOR_ROLE, operator);
    console.log(`   ✅ Granted OPERATOR_ROLE to ${operator}`);
  }

  // Note: UPGRADER_ROLE should be granted very carefully
  console.log(`   ⚠️  UPGRADER_ROLE retained by deployer. Transfer carefully!`);
}

/**
 * Configure marketplace settings
 */
async function configureMarketplace(marketplace) {
  console.log("\n⚙️  Configuring marketplace settings...");

  // Set price bounds
  await marketplace.updatePriceBounds(
    DEPLOYMENT_CONFIG.marketplace.minListingPrice,
    DEPLOYMENT_CONFIG.marketplace.maxListingPrice
  );
  console.log(`   ✅ Price bounds set: ${ethers.formatEther(DEPLOYMENT_CONFIG.marketplace.minListingPrice)} - ${ethers.formatEther(DEPLOYMENT_CONFIG.marketplace.maxListingPrice)} ETH`);

  // Configure gas optimization
  await marketplace.updateGasSettings(200000, 10000); // 200k base, 100% multiplier
  console.log(`   ✅ Gas optimization configured`);

  // Approve payment tokens (ETH is already approved by default)
  // Add USDC, USDT, DAI etc. based on network
  const paymentTokens = getPaymentTokensForNetwork();
  for (const token of paymentTokens) {
    await marketplace.updatePaymentToken(token.address, true);
    console.log(`   ✅ Approved payment token: ${token.name}`);
  }
}

/**
 * Get payment tokens based on network
 */
function getPaymentTokensForNetwork() {
  const network = process.env.HARDHAT_NETWORK || "hardhat";
  
  const tokens = {
    mainnet: [
      { name: "USDC", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
      { name: "USDT", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7" },
      { name: "DAI", address: "0x6B175474E89094C44Da98b954EedeAC495271d0F" }
    ],
    polygon: [
      { name: "USDC", address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" },
      { name: "USDT", address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F" },
      { name: "DAI", address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063" }
    ],
    bsc: [
      { name: "USDC", address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d" },
      { name: "USDT", address: "0x55d398326f99059fF775485246999027B3197955" },
      { name: "BUSD", address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56" }
    ]
  };

  return tokens[network] || [];
}

/**
 * Upgrade existing contract
 */
async function upgradeContract(proxyAddress, newContractName) {
  console.log(`\n🔄 Upgrading contract at ${proxyAddress} to ${newContractName}...`);

  const NewContract = await ethers.getContractFactory(newContractName);
  const upgraded = await upgrades.upgradeProxy(proxyAddress, NewContract);
  
  await upgraded.waitForDeployment();
  
  const newImplementation = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log(`✅ Contract upgraded. New implementation: ${newImplementation}`);

  return upgraded;
}

/**
 * Main deployment function
 */
async function main() {
  console.log("====================================");
  console.log("NFT Marketplace Upgradeable Deployment");
  console.log("====================================");

  // Get signers
  const [deployer, admin1, admin2, operator1] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("\n📊 Deployment Information:");
  console.log(`   Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);

  // Load existing deployments
  const deployments = loadDeployments();
  const networkName = network.name || `chain-${network.chainId}`;
  
  if (!deployments[networkName]) {
    deployments[networkName] = {};
  }

  try {
    // Deploy Marketplace
    const marketplaceDeployment = await deployMarketplaceV2(
      deployer.address, // fee recipient
      deployer.address  // emergency withdraw address
    );

    deployments[networkName].NFTMarketplaceV2 = {
      proxy: marketplaceDeployment.proxy,
      implementation: marketplaceDeployment.implementation,
      admin: marketplaceDeployment.admin,
      contractPath: "contracts/NFTMarketplaceV2.sol:NFTMarketplaceV2",
      constructorArgs: [
        deployer.address,
        DEPLOYMENT_CONFIG.marketplace.feePercentage,
        deployer.address
      ],
      deployedAt: new Date().toISOString(),
      version: "2.0.0"
    };

    // Setup roles
    await setupRolesAndPermissions(
      marketplaceDeployment.contract,
      [admin1?.address].filter(Boolean),
      [operator1?.address].filter(Boolean)
    );

    // Configure marketplace
    await configureMarketplace(marketplaceDeployment.contract);

    // Deploy sample NFT contracts (optional)
    if (process.env.DEPLOY_SAMPLE_NFTS === "true") {
      // Deploy ERC721
      const erc721Deployment = await deployERC721Upgradeable(
        "Sample NFT Collection",
        "SNFT",
        "https://api.example.com/nft/",
        deployer.address
      );

      deployments[networkName].SampleERC721 = {
        proxy: erc721Deployment.proxy,
        implementation: erc721Deployment.implementation,
        deployedAt: new Date().toISOString()
      };

      // Deploy ERC1155
      const erc1155Deployment = await deployERC1155Upgradeable(
        "Sample Multi-Token",
        "https://api.example.com/token/{id}.json",
        deployer.address
      );

      deployments[networkName].SampleERC1155 = {
        proxy: erc1155Deployment.proxy,
        implementation: erc1155Deployment.implementation,
        deployedAt: new Date().toISOString()
      };
    }

    // Save deployments
    saveDeployments(deployments);

    console.log("\n====================================");
    console.log("✅ Deployment Complete!");
    console.log("====================================");
    console.log("\n📝 Next Steps:");
    console.log("1. Run verification: npm run verify:all");
    console.log("2. Transfer ownership if needed");
    console.log("3. Configure additional settings via admin panel");
    console.log("4. Test all functionality on testnet first");

    // Generate deployment report
    generateDeploymentReport(deployments[networkName], networkName);

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  }
}

/**
 * Generate deployment report
 */
function generateDeploymentReport(contracts, network) {
  const reportPath = path.join(__dirname, `../deployment-report-${network}-${Date.now()}.md`);
  
  let report = `# NFT Marketplace Deployment Report\n\n`;
  report += `**Network:** ${network}\n`;
  report += `**Date:** ${new Date().toISOString()}\n\n`;
  report += `## Deployed Contracts\n\n`;

  for (const [name, details] of Object.entries(contracts)) {
    report += `### ${name}\n`;
    report += `- **Proxy Address:** ${details.proxy}\n`;
    report += `- **Implementation:** ${details.implementation}\n`;
    if (details.admin) {
      report += `- **ProxyAdmin:** ${details.admin}\n`;
    }
    if (details.version) {
      report += `- **Version:** ${details.version}\n`;
    }
    report += `- **Deployed At:** ${details.deployedAt}\n\n`;
  }

  report += `## Configuration\n\n`;
  report += `- **Marketplace Fee:** ${DEPLOYMENT_CONFIG.marketplace.feePercentage / 100}%\n`;
  report += `- **Min Listing Price:** ${ethers.formatEther(DEPLOYMENT_CONFIG.marketplace.minListingPrice)} ETH\n`;
  report += `- **Max Listing Price:** ${ethers.formatEther(DEPLOYMENT_CONFIG.marketplace.maxListingPrice)} ETH\n`;

  fs.writeFileSync(reportPath, report);
  console.log(`\n📄 Deployment report saved to: ${reportPath}`);
}

// Execute deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  deployMarketplaceV2,
  deployERC721Upgradeable,
  deployERC1155Upgradeable,
  upgradeContract,
  setupRolesAndPermissions,
  configureMarketplace
};