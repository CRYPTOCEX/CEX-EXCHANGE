require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("hardhat-contract-sizer");
require("hardhat-gas-reporter");
require("dotenv").config();

// Ensure environment variables are set
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || "";
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || "";
const ARBISCAN_API_KEY = process.env.ARBISCAN_API_KEY || "";
const OPTIMISTIC_ETHERSCAN_API_KEY = process.env.OPTIMISTIC_ETHERSCAN_API_KEY || "";

// RPC URLs
const ETHEREUM_RPC = process.env.ETHEREUM_RPC || "https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY";
const GOERLI_RPC = process.env.GOERLI_RPC || "https://eth-goerli.g.alchemy.com/v2/YOUR-API-KEY";
const POLYGON_RPC = process.env.POLYGON_RPC || "https://polygon-mainnet.g.alchemy.com/v2/YOUR-API-KEY";
const MUMBAI_RPC = process.env.MUMBAI_RPC || "https://polygon-mumbai.g.alchemy.com/v2/YOUR-API-KEY";
const BSC_RPC = process.env.BSC_RPC || "https://bsc-dataseed.binance.org/";
const BSC_TESTNET_RPC = process.env.BSC_TESTNET_RPC || "https://data-seed-prebsc-1-s1.binance.org:8545/";
const ARBITRUM_RPC = process.env.ARBITRUM_RPC || "https://arb-mainnet.g.alchemy.com/v2/YOUR-API-KEY";
const OPTIMISM_RPC = process.env.OPTIMISM_RPC || "https://opt-mainnet.g.alchemy.com/v2/YOUR-API-KEY";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
        details: {
          yul: true,
          yulDetails: {
            stackAllocation: true,
            optimizerSteps: "dhfoDgvulfnTUtnIf"
          }
        }
      },
      viaIR: true,
      metadata: {
        bytecodeHash: "none"
      }
    }
  },
  
  networks: {
    hardhat: {
      chainId: 31337,
      allowUnlimitedContractSize: true,
      gas: "auto",
      gasPrice: "auto",
      blockGasLimit: 30000000
    },
    
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    },
    
    mainnet: {
      url: ETHEREUM_RPC,
      chainId: 1,
      accounts: [PRIVATE_KEY],
      gasPrice: "auto",
      gas: "auto"
    },
    
    goerli: {
      url: GOERLI_RPC,
      chainId: 5,
      accounts: [PRIVATE_KEY],
      gasPrice: "auto",
      gas: "auto"
    },
    
    polygon: {
      url: POLYGON_RPC,
      chainId: 137,
      accounts: [PRIVATE_KEY],
      gasPrice: "auto",
      gas: "auto"
    },
    
    mumbai: {
      url: MUMBAI_RPC,
      chainId: 80001,
      accounts: [PRIVATE_KEY],
      gasPrice: "auto",
      gas: "auto"
    },
    
    bsc: {
      url: BSC_RPC,
      chainId: 56,
      accounts: [PRIVATE_KEY],
      gasPrice: 5000000000, // 5 gwei
      gas: "auto"
    },
    
    bscTestnet: {
      url: BSC_TESTNET_RPC,
      chainId: 97,
      accounts: [PRIVATE_KEY],
      gasPrice: 10000000000, // 10 gwei
      gas: "auto"
    },
    
    arbitrum: {
      url: ARBITRUM_RPC,
      chainId: 42161,
      accounts: [PRIVATE_KEY],
      gasPrice: "auto",
      gas: "auto"
    },
    
    optimism: {
      url: OPTIMISM_RPC,
      chainId: 10,
      accounts: [PRIVATE_KEY],
      gasPrice: "auto",
      gas: "auto"
    }
  },
  
  etherscan: {
    apiKey: {
      mainnet: ETHERSCAN_API_KEY,
      goerli: ETHERSCAN_API_KEY,
      polygon: POLYGONSCAN_API_KEY,
      polygonMumbai: POLYGONSCAN_API_KEY,
      bsc: BSCSCAN_API_KEY,
      bscTestnet: BSCSCAN_API_KEY,
      arbitrumOne: ARBISCAN_API_KEY,
      optimisticEthereum: OPTIMISTIC_ETHERSCAN_API_KEY
    }
  },
  
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    outputFile: "gas-report.txt",
    noColors: true
  },
  
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
    only: ["NFTMarketplace", "ERC721", "ERC1155"]
  },
  
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  
  mocha: {
    timeout: 40000
  }
};