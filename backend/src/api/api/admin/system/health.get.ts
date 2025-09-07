import { emailQueue } from "@b/utils/emails";
import { Client } from "cassandra-driver";
import { formatDate } from "date-fns";
import { ethers } from "ethers";
import { capitalize } from "lodash";
import Stripe from "stripe";
import twilio from "twilio";
import { CacheManager } from "@b/utils/cache";

const cachedResults: { [key: string]: any } = {};

export const metadata: OperationObject = {
  summary: "Gets system details",
  operationId: "getSystemDetails",
  tags: ["Admin", "System"],
  responses: {
    200: {
      description: "System details fetched successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {},
          },
        },
      },
    },
    401: {
      description: "Unauthorized, admin permission required",
    },
    500: {
      description: "Internal system error",
    },
  },
  requiresAuth: true,
  parameters: [
    {
      in: "query",
      name: "service",
      schema: {
        type: "string",
      },
      description: "Service name to check",
      required: false,
    },
  ],
  permission: "access.admin",
};

const getOrCheckService = async (
  serviceName: string,
  checkFunction: NextFunction
) => {
  if (cachedResults[serviceName]) return cachedResults[serviceName];

  const serviceCheck = await checkFunction();
  cachedResults[serviceName] = serviceCheck;

  return serviceCheck;
};

// Create service map dynamically based on available extensions
async function getServiceMap() {
  const baseServices = {
    email: checkEmailService,
    stripe: checkStripeService,
    sms: checkSmsService,
    openexchangerates: checkOpenExchangeRatesService,
    googletranslate: checkGoogleTranslateService,
    ethereum: checkEthereumService,
    bsc: checkBscService,
    polygon: checkPolygonService,
    ftm: checkFtmService,
    optimism: checkOptimismService,
    arbitrum: checkArbitrumService,
    celo: checkCeloService,
  };

  // Only add ScyllaDB service if ecosystem extension is available
  const cacheManager = CacheManager.getInstance();
  const extensions = await cacheManager.getExtensions();
  
  if (extensions.has("ecosystem")) {
    (baseServices as any).scylla = checkScyllaService;
  }

  return baseServices;
}

export default async (data: Handler) => {
  const { service } = data.query;

  const serviceMap = await getServiceMap();
  const result = serviceMap[service]
    ? await getOrCheckService(service, serviceMap[service])
    : {};

  return {
    [service]: result,
  };
};

async function checkEmailService() {
  if (
    process.env.NEXT_PUBLIC_APP_EMAIL === undefined ||
    process.env.NEXT_PUBLIC_APP_EMAIL === ""
  )
    return {
      service: "Email",
      status: "Down",
      message: "App Email address not found",
      timestamp: formatDate(new Date(), "yyyy-MM-dd HH:mm:ss"),
    };

  try {
    const currentTime = formatDate(new Date(), "yyyy-MM-dd HH:mm:ss");
    await emailQueue.add({
      emailData: {
        TO: process.env.NEXT_PUBLIC_APP_EMAIL,
        FIRSTNAME: "test",
        TIME: currentTime,
      },
      emailType: "EmailTest",
    });

    const emailProvider = process.env.APP_EMAILER;
    return {
      service: "Email",
      status: "Up",
      message: `Email sent successfully using ${capitalize(emailProvider)}`,
      timestamp: currentTime,
    };
  } catch (error) {
    return {
      service: "Email",
      status: "Down",
      message: error,
      timestamp: formatDate(new Date(), "yyyy-MM-dd HH:mm:ss"),
    };
  }
}

async function checkStripeService() {
  const stripeSecretKey = process.env.APP_STRIPE_SECRET_KEY;

  if (!stripeSecretKey || stripeSecretKey === "") {
    return {
      service: "Stripe",
      status: "Down",
      message: "Stripe API key not found",
      timestamp: formatDate(new Date(), "yyyy-MM-dd HH:mm:ss"),
    };
  }

  try {
    const stripe = new Stripe(stripeSecretKey);

    await stripe.balance.retrieve();

    return {
      service: "Stripe",
      status: "Up",
      message: "Stripe API key valid",
      timestamp: formatDate(new Date(), "yyyy-MM-dd HH:mm:ss"),
    };
  } catch (error) {
    return {
      service: "Stripe",
      status: "Down",
      message: error.message,
      timestamp: formatDate(new Date(), "yyyy-MM-dd HH:mm:ss"),
    };
  }
}

async function checkSmsService() {
  const twilioAccountSid = process.env.APP_TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.APP_TWILIO_AUTH_TOKEN;
  const twilioPhoneNumber = process.env.APP_TWILIO_PHONE_NUMBER;
  const supportPhoneNumber =
    process.env.APP_SUPPORT_PHONE_NUMBER || "+441234567890";

  if (
    !twilioAccountSid ||
    !twilioAuthToken ||
    !twilioPhoneNumber ||
    twilioAccountSid === "" ||
    twilioAuthToken === "" ||
    twilioPhoneNumber === ""
  ) {
    return {
      service: "SMS",
      status: "Down",
      message: "Twilio credentials not found or incomplete",
      timestamp: formatDate(new Date(), "yyyy-MM-dd HH:mm:ss"),
    };
  }

  try {
    const client = twilio(twilioAccountSid, twilioAuthToken);

    const message = await client.messages.create({
      to: supportPhoneNumber,
      from: twilioPhoneNumber,
      body: "Test SMS from our service",
    });

    return {
      service: "SMS",
      status: "Up",
      message: `SMS sent successfully with Twilio, Message SID: ${message.sid}`,
      timestamp: formatDate(new Date(), "yyyy-MM-dd HH:mm:ss"),
    };
  } catch (error) {
    let parsedError;
    switch (error.code) {
      case 20003:
        parsedError = "Permission Denied, check Twilio credentials";
        break;
      case 21614:
        parsedError = "Message body is empty";
        break;
      default:
        parsedError = error.moreInfo;
        break;
    }
    return {
      service: "SMS",
      status: "Down",
      message: parsedError,
      timestamp: formatDate(new Date(), "yyyy-MM-dd HH:mm:ss"),
    };
  }
}

async function checkOpenExchangeRatesService() {
  const openExchangeRatesAppId = process.env.APP_OPENEXCHANGERATES_APP_ID;

  if (!openExchangeRatesAppId || openExchangeRatesAppId === "") {
    return {
      service: "OpenExchangeRates",
      status: "Down",
      message: "Open Exchange Rates App ID not found",
      timestamp: formatDate(new Date(), "yyyy-MM-dd HH:mm:ss"),
    };
  }

  try {
    // Make a test call to Open Exchange Rates API
    const response = await fetch(
      `https://openexchangerates.org/api/latest.json?app_id=${openExchangeRatesAppId}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      service: "OpenExchangeRates",
      status: "Up",
      message: "Open Exchange Rates API key valid",
      timestamp: formatDate(new Date(), "yyyy-MM-dd HH:mm:ss"),
    };
  } catch (error) {
    return {
      service: "OpenExchangeRates",
      status: "Down",
      message: error.message,
      timestamp: formatDate(new Date(), "yyyy-MM-dd HH:mm:ss"),
    };
  }
}

async function checkGoogleTranslateService() {
  const googleTranslateApiKey = process.env.GOOGLE_TRANSLATE_API_KEY;

  if (!googleTranslateApiKey || googleTranslateApiKey === "") {
    return {
      service: "GoogleTranslate",
      status: "Down",
      message: "Google Translate API key not found",
      timestamp: formatDate(new Date(), "yyyy-MM-dd HH:mm:ss"),
    };
  }

  try {
    // Make a test call to Google Translate API
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${googleTranslateApiKey}&q=Hello&target=es`
    );

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      service: "GoogleTranslate",
      status: "Up",
      message: `Translation successful: ${data.data.translations[0].translatedText}`,
      timestamp: formatDate(new Date(), "yyyy-MM-dd HH:mm:ss"),
    };
  } catch (error) {
    return {
      service: "GoogleTranslate",
      status: "Down",
      message: error.message,
      timestamp: formatDate(new Date(), "yyyy-MM-dd HH:mm:ss"),
    };
  }
}

async function checkScyllaService() {
  const scyllaUsername = process.env.SCYLLA_USERNAME;
  const scyllaPassword = process.env.SCYLLA_PASSWORD;

  if (
    !scyllaUsername ||
    !scyllaPassword ||
    scyllaUsername === "" ||
    scyllaPassword === ""
  ) {
    return {
      service: "Scylla",
      status: "Down",
      message: "Scylla credentials not found or incomplete",
      timestamp: formatDate(new Date(), "yyyy-MM-dd HH:mm:ss"),
    };
  }

  const client = new Client({
    contactPoints: ["localhost"], // Replace with your Scylla DB contact points
    localDataCenter: "datacenter1", // Replace with your data center name
    credentials: { username: scyllaUsername, password: scyllaPassword },
  });

  try {
    await client.connect();

    // Optionally, make a test query to verify the connection
    const result = await client.execute("SELECT now() FROM system.local");

    return {
      service: "Scylla",
      status: "Up",
      message: `Scylla connection successful.`,
      timestamp: formatDate(new Date(), "yyyy-MM-dd HH:mm:ss"),
    };
  } catch (error) {
    return {
      service: "Scylla",
      status: "Down",
      message: error.message,
      timestamp: formatDate(new Date(), "yyyy-MM-dd HH:mm:ss"),
    };
  } finally {
    await client.shutdown();
  }
}

async function checkEthereumService() {
  const ethExplorerApiKey = process.env.ETH_EXPLORER_API_KEY;
  const ethNetwork = process.env.ETH_NETWORK || "mainnet";

  const ethRpcMap = {
    mainnet: process.env.ETH_MAINNET_RPC,
    goerli: process.env.ETH_GOERLI_RPC,
    sepolia: process.env.ETH_SEPOLIA_RPC,
  };

  const ethWssMap = {
    mainnet: process.env.ETH_MAINNET_RPC_WSS,
    goerli: process.env.ETH_GOERLI_RPC_WSS,
    sepolia: process.env.ETH_SEPOLIA_RPC_WSS,
  };

  if (
    !ethExplorerApiKey ||
    !ethRpcMap[ethNetwork] ||
    ethExplorerApiKey === "" ||
    ethRpcMap[ethNetwork] === ""
  ) {
    return {
      service: "Ethereum",
      status: "Down",
      message: "Ethereum Explorer API key or RPC endpoint not found",
      timestamp: formatDate(new Date(), "yyyy-MM-dd HH:mm:ss"),
    };
  }

  return checkEvmNetwork(
    "Ethereum",
    ethRpcMap[ethNetwork],
    ethWssMap[ethNetwork],
    ethNetwork
  );
}

async function checkBscService() {
  const bscExplorerApiKey = process.env.BSC_EXPLORER_API_KEY;
  const bscNetwork = process.env.BSC_NETWORK || "mainnet";

  const bscRpcMap = {
    mainnet: process.env.BSC_MAINNET_RPC,
    testnet: process.env.BSC_TESTNET_RPC,
  };

  const bscWssMap = {
    mainnet: process.env.BSC_MAINNET_RPC_WSS,
    testnet: process.env.BSC_TESTNET_RPC_WSS,
  };

  if (
    !bscExplorerApiKey ||
    !bscRpcMap[bscNetwork] ||
    bscExplorerApiKey === "" ||
    bscRpcMap[bscNetwork] === ""
  ) {
    return {
      service: "BSC",
      status: "Down",
      message: "BSC Explorer API key or RPC endpoint not found",
      timestamp: formatDate(new Date(), "yyyy-MM-dd HH:mm:ss"),
    };
  }

  return checkEvmNetwork(
    "BSC",
    bscRpcMap[bscNetwork],
    bscWssMap[bscNetwork],
    bscNetwork
  );
}

async function checkPolygonService() {
  const polygonExplorerApiKey = process.env.POLYGON_EXPLORER_API_KEY;
  const polygonNetwork = process.env.POLYGON_NETWORK || "matic";

  const polygonRpcMap = {
    matic: process.env.POLYGON_MATIC_RPC,
    "matic-mumbai": process.env.POLYGON_MATIC_MUMBAI_RPC,
  };

  const polygonWssMap = {
    matic: process.env.POLYGON_MATIC_RPC_WSS,
    "matic-mumbai": process.env.POLYGON_MATIC_MUMBAI_RPC_WSS,
  };

  if (
    !polygonExplorerApiKey ||
    !polygonRpcMap[polygonNetwork] ||
    polygonExplorerApiKey === "" ||
    polygonRpcMap[polygonNetwork] === ""
  ) {
    return {
      service: "Polygon",
      status: "Down",
      message: "Polygon Explorer API key or RPC endpoint not found",
      timestamp: formatDate(new Date(), "yyyy-MM-dd HH:mm:ss"),
    };
  }

  return checkEvmNetwork(
    "Polygon",
    polygonRpcMap[polygonNetwork],
    polygonWssMap[polygonNetwork],
    polygonNetwork
  );
}

async function checkFtmService() {
  const ftmExplorerApiKey = process.env.FTM_EXPLORER_API_KEY;
  const ftmNetwork = process.env.FTM_NETWORK || "mainnet";

  const ftmRpcMap = {
    mainnet: process.env.FTM_MAINNET_RPC,
    testnet: process.env.FTM_TESTNET_RPC,
  };

  const ftmWssMap = {
    mainnet: process.env.FTM_MAINNET_RPC_WSS,
    testnet: process.env.FTM_TESTNET_RPC_WSS,
  };

  if (
    !ftmExplorerApiKey ||
    !ftmRpcMap[ftmNetwork] ||
    ftmExplorerApiKey === "" ||
    ftmRpcMap[ftmNetwork] === ""
  ) {
    return {
      service: "FTM",
      status: "Down",
      message: "FTM Explorer API key or RPC endpoint not found",
      timestamp: formatDate(new Date(), "yyyy-MM-dd HH:mm:ss"),
    };
  }

  return checkEvmNetwork(
    "FTM",
    ftmRpcMap[ftmNetwork],
    ftmWssMap[ftmNetwork],
    ftmNetwork
  );
}

async function checkOptimismService() {
  const optimismExplorerApiKey = process.env.OPTIMISM_EXPLORER_API_KEY;
  const optimismNetwork = process.env.OPTIMISM_NETWORK || "mainnet";

  const optimismRpcMap = {
    mainnet: process.env.OPTIMISM_MAINNET_RPC,
    goerli: process.env.OPTIMISM_GOERLI_RPC,
  };

  const optimismWssMap = {
    mainnet: process.env.OPTIMISM_MAINNET_RPC_WSS,
    goerli: process.env.OPTIMISM_GOERLI_RPC_WSS,
  };

  if (
    !optimismExplorerApiKey ||
    !optimismRpcMap[optimismNetwork] ||
    optimismExplorerApiKey === "" ||
    optimismRpcMap[optimismNetwork] === ""
  ) {
    return {
      service: "Optimism",
      status: "Down",
      message: "Optimism Explorer API key or RPC endpoint not found",
      timestamp: formatDate(new Date(), "yyyy-MM-dd HH:mm:ss"),
    };
  }

  return checkEvmNetwork(
    "Optimism",
    optimismRpcMap[optimismNetwork],
    optimismWssMap[optimismNetwork],
    optimismNetwork
  );
}

async function checkArbitrumService() {
  const arbitrumExplorerApiKey = process.env.ARBITRUM_EXPLORER_API_KEY;
  const arbitrumNetwork = process.env.ARBITRUM_NETWORK || "mainnet";

  const arbitrumRpcMap = {
    mainnet: process.env.ARBIRUM_MAINNET_RPC,
    goerli: process.env.ARBITRUM_GOERLI_RPC,
  };

  const arbitrumWssMap = {
    mainnet: process.env.ARBIRUM_MAINNET_RPC_WSS,
    goerli: process.env.ARBITRUM_GOERLI_RPC_WSS,
  };

  if (
    !arbitrumExplorerApiKey ||
    !arbitrumRpcMap[arbitrumNetwork] ||
    arbitrumExplorerApiKey === "" ||
    arbitrumRpcMap[arbitrumNetwork] === ""
  ) {
    return {
      service: "Arbitrum",
      status: "Down",
      message: "Arbitrum Explorer API key or RPC endpoint not found",
      timestamp: formatDate(new Date(), "yyyy-MM-dd HH:mm:ss"),
    };
  }

  return checkEvmNetwork(
    "Arbitrum",
    arbitrumRpcMap[arbitrumNetwork],
    arbitrumWssMap[arbitrumNetwork],
    arbitrumNetwork
  );
}

async function checkCeloService() {
  const celoExplorerApiKey = process.env.CELO_EXPLORER_API_KEY;
  const celoNetwork = process.env.CELO_NETWORK || "mainnet";

  const celoRpcMap = {
    mainnet: process.env.CELO_MAINNET_RPC,
    alfajores: process.env.CELO_ALFAJORES_RPC,
  };

  const celoWssMap = {
    mainnet: process.env.CELO_MAINNET_RPC_WSS,
    alfajores: process.env.CELO_ALFAJORES_RPC_WSS,
  };

  if (
    !celoExplorerApiKey ||
    !celoRpcMap[celoNetwork] ||
    celoExplorerApiKey === "" ||
    celoRpcMap[celoNetwork] === ""
  ) {
    return {
      service: "Celo",
      status: "Down",
      message: "Celo Explorer API key or RPC endpoint not found",
      timestamp: formatDate(new Date(), "yyyy-MM-dd HH:mm:ss"),
    };
  }

  return checkEvmNetwork(
    "Celo",
    celoRpcMap[celoNetwork],
    celoWssMap[celoNetwork],
    celoNetwork
  );
}

async function checkEvmNetwork(serviceName, rpc, wss, network) {
  if (!rpc || rpc === "") {
    return {
      service: serviceName,
      status: "Down",
      message: `${serviceName} HTTP RPC endpoint not found`,
      timestamp: formatDate(new Date(), "yyyy-MM-dd HH:mm:ss"),
    };
  }

  try {
    const providerOptions = { staticNetwork: true };
    const httpProvider = new ethers.JsonRpcProvider(
      rpc,
      network,
      providerOptions
    );

    const blockNumber = await httpProvider.getBlockNumber();
    let wssStatus = "";

    if (wss && wss !== "") {
      try {
        const wssProvider = new ethers.WebSocketProvider(
          wss,
          network,
          providerOptions
        );

        const wssBlockNumber = await wssProvider.getBlockNumber();
        wssStatus = ` and WebSocket (latest block: ${wssBlockNumber})`;
      } catch (error) {
        console.error(
          `WSS connection error for ${serviceName}: ${error.message}`
        );
        wssStatus = `, but WebSocket connection failed`;
      }
    }

    return {
      service: serviceName,
      status: "Up",
      message: `Connected to ${serviceName} (${network}) via HTTP (latest block: ${blockNumber})${wssStatus}`,
      timestamp: formatDate(new Date(), "yyyy-MM-dd HH:mm:ss"),
    };
  } catch (error) {
    let errorMsg;

    switch (error.code) {
      case "ENOTFOUND":
        errorMsg = `RPC endpoint for ${serviceName} (${network}) not found.`;
        break;
      case "NETWORK_ERROR":
        errorMsg = `Network error: Failed to connect to ${serviceName} (${network}).`;
        break;
      case "INVALID_ARGUMENT":
        errorMsg = `Problem with ${serviceName} (${network}) configuration.`;
        break;
      case "SERVER_ERROR":
        errorMsg = `Server error: ${error.message}. RPC endpoint may be down.`;
        break;
      default:
        errorMsg = error.message;
        break;
    }

    console.error(`Failed to connect to ${serviceName} RPC: ${error.message}`);
    return {
      service: serviceName,
      status: "Down",
      message: errorMsg,
      timestamp: formatDate(new Date(), "yyyy-MM-dd HH:mm:ss"),
    };
  }
}
