import https from "https";
import AdmZip from "adm-zip";
import { promises as fs } from "fs";
import { createWriteStream } from "fs";
import {
  updateBlockchainQuery,
  updateExtensionQuery,
} from "../../../utils/system";
import { models } from "@b/db";
import path from "path";
import { getLicenseConfig } from "@b/config/license";

// Secure admin error utility
function adminError(
  message = "System configuration error. Please contact administrator.",
  details?: any
) {
  if (details) {
    // Only log server-side, never return to user
    console.error("[ADMIN SYSTEM ERROR]", message, details);
  } else {
    console.error("[ADMIN SYSTEM ERROR]", message);
  }
  return new Error(message);
}

let cachedIP: string | null = null;
let lastFetched: number | null = null;
let nextVerificationDate: Date | null = null;
const verificationPeriodDays = 3;
// Determine the correct root path based on environment
const rootPath = (() => {
  const cwd = process.cwd();
  
  // In development, if we're in the backend folder, go up one level
  if (cwd.endsWith('/backend') || cwd.endsWith('\\backend')) {
    return path.join(cwd, '..');
  }
  
  // In production or if already at root, use current directory
  return cwd;
})();
const licFolderPath = `${rootPath}/lic`;

interface ApiResponse<T = any> {
  status: boolean;
  message: string;
  lic_response?: string;
  data?: T;
  path?: string;
  products?: any[];
}

export async function getProduct(id?: string): Promise<any> {
  if (id) {
    const extension = await models.extension.findOne({
      where: { productId: id },
    });
    if (!extension) throw adminError();
    return extension;
  } else {
    try {
      // Try multiple possible locations for package.json
      const possiblePaths = [
        `${rootPath}/package.json`,
        `${path.join(rootPath, '..')}/package.json`,
        `${process.cwd()}/package.json`,
        `${path.join(process.cwd(), '..')}/package.json`,
      ];

             let content: any = null;
       let usedPath = '';

              for (const filePath of possiblePaths) {
         try {
           const fileContent = await fs.readFile(filePath, "utf8");
           content = JSON.parse(fileContent);
           
           // Check if this package.json has the expected fields
           if (content && (content.id || content.name)) {
             usedPath = filePath;
             break;
           }
         } catch (err: any) {
           continue;
         }
       }

       if (!content || !content.id) {
         throw adminError("Could not find valid package.json with required fields");
       }

             return {
         id: content.id || "7848B8AC", // Fallback to default product ID
         productId: content.id || "7848B8AC", // Map id to productId for compatibility
         name: content.name || "bicrypto",
         version: content.version || "5.0.0",
         description: content.description || "BiCrypto Trading Platform",
       };
    } catch (error) {
      throw adminError("Could not read product information.", error);
    }
  }
}

export async function getBlockchain(id: string): Promise<any> {
  const blockchain = await models.ecosystemBlockchain.findOne({
    where: { productId: id },
  });
  if (!blockchain) throw adminError();
  return blockchain;
}

export async function fetchPublicIp(): Promise<string | null> {
  try {
    const data = await new Promise<{ ip: string }>((resolve, reject) => {
      https.get("https://api.ipify.org?format=json", (resp) => {
        let data = "";

        resp.on("data", (chunk) => {
          data += chunk;
        });

        resp.on("end", () => {
          resolve(JSON.parse(data));
        });

        resp.on("error", (err) => {
          reject(err);
        });
      });
    });
    return data.ip;
  } catch (error) {
    console.error(
      `[ADMIN SYSTEM ERROR] Error fetching public IP: ${(error as Error).message}`
    );
    return null;
  }
}

export async function getPublicIp(): Promise<string | null> {
  const now = Date.now();

  if (cachedIP && lastFetched && now - lastFetched < 60000) {
    // 1 minute cache
    return cachedIP;
  }

  cachedIP = await fetchPublicIp();
  lastFetched = now;
  return cachedIP;
}

export async function callApi<T>(
  method: string,
  url: string,
  data: any = null,
  filename?: string
): Promise<ApiResponse<T>> {
  try {
    const licenseConfig = getLicenseConfig();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "LB-API-KEY": process.env.API_LICENSE_API_KEY || licenseConfig.apiKey,
      "LB-URL": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      "LB-IP": (await getPublicIp()) || "127.0.0.1",
      "LB-LANG": "en",
    };

    const requestData = data ? JSON.stringify(data) : null;

    const requestOptions = {
      method: method,
      headers: headers,
    };

    const response: ApiResponse<T> = await new Promise((resolve, reject) => {
      const req = https.request(url, requestOptions, (res) => {
        const data: Buffer[] = [];

        if (res.headers["content-type"] === "application/zip") {
          if (!filename) {
            reject(adminError("Filename required for zip download."));
            return;
          }

          const dirPath = `${rootPath}/updates`;
          const filePath = `${dirPath}/${filename}.zip`;

          // Ensure the directory exists
          fs.mkdir(dirPath, { recursive: true })
            .then(() => {
              const fileStream = createWriteStream(filePath);
              res.pipe(fileStream);

              fileStream.on("finish", () => {
                resolve({
                  status: true,
                  message: "Update file downloaded successfully",
                  path: filePath,
                });
              });

              fileStream.on("error", (err) => {
                reject(adminError("Download error.", err));
              });
            })
            .catch((err) => {
              reject(adminError("Directory error.", err));
            });
        } else {
          res.on("data", (chunk) => {
            data.push(chunk);
          });

          res.on("end", () => {
            let result;
            try {
              result = JSON.parse(Buffer.concat(data).toString());
            } catch (e) {
              reject(adminError("Invalid response from server.", e));
              return;
            }
            if (res.statusCode !== 200) {
              reject(adminError("Operation failed.", result));
            } else {
              resolve(result);
            }
          });
        }

        res.on("error", (err) => {
          reject(adminError("Response error.", err));
        });
      });

      req.on("error", (err) => {
        reject(adminError("Request error.", err));
      });

      if (requestData) {
        req.write(requestData);
      }

      req.end();
    });

    return response;
  } catch (error) {
    throw adminError("API call failed.", error);
  }
}

export async function verifyLicense(
  productId: string,
  license?: string | null,
  client?: string | null,
  timeBasedCheck?: boolean
): Promise<ApiResponse> {
  const licenseFilePath = `${licFolderPath}/${productId}.lic`;

  let data: any;

  try {
    // Check if a license file exists
    const licenseFileContent = await fs.readFile(licenseFilePath, "utf8");
    data = {
      product_id: productId,
      license_file: licenseFileContent,
      license_code: null,
      client_name: null,
    };
  } catch (err) {
    // File does not exist or other error occurred
    data = {
      product_id: productId,
      license_file: null,
      license_code: license,
      client_name: client,
    };
  }

  if (timeBasedCheck && verificationPeriodDays > 0) {
    const today = new Date();
    if (nextVerificationDate && today < nextVerificationDate) {
      return { status: true, message: "Verified from cache" };
    }
  }

  const licenseConfig = getLicenseConfig();
  const apiUrl = process.env.APP_LICENSE_API_URL || licenseConfig.apiUrl;
  const response = await callApi(
    "POST",
    `${apiUrl}/api/verify_license`,
    data
  );

  if (timeBasedCheck && verificationPeriodDays > 0 && response.status) {
    const today = new Date();
    nextVerificationDate = new Date();
    nextVerificationDate.setDate(today.getDate() + verificationPeriodDays);
  }

  if (!response.status) {
    throw adminError("License verification failed.");
  }
  return response;
}

export async function activateLicense(
  productId: string,
  license: string,
  client: string
): Promise<ApiResponse> {
  const data = {
    product_id: productId,
    license_code: license,
    client_name: client,
    verify_type: "envato",
  };

  const licenseConfig = getLicenseConfig();
  const apiUrl = process.env.APP_LICENSE_API_URL || licenseConfig.apiUrl;
  const response = await callApi(
    "POST",
    `${apiUrl}/api/activate_license`,
    data
  );

  if (!response.status) {
    throw adminError("License activation failed.");
  }

  // If activation is successful, save the license
  if (response.lic_response) {
    const licFileContent = response.lic_response;
    const licenseFilePath = `${licFolderPath}/${productId}.lic`;

    // Ensure the lic directory exists
    await fs.mkdir(licFolderPath, { recursive: true });
    // Save the license to a file in the lic directory
    await fs.writeFile(licenseFilePath, licFileContent);
  }

  return response;
}

export async function checkLatestVersion(productId: string) {
  const licenseConfig = getLicenseConfig();
  const apiUrl = process.env.APP_LICENSE_API_URL || licenseConfig.apiUrl;
  const payload = { product_id: productId };
  return await callApi(
    "POST",
    `${apiUrl}/api/latest_version`,
    payload
  );
}

export async function checkUpdate(productId: string, currentVersion: string) {
  const licenseConfig = getLicenseConfig();
  const apiUrl = process.env.APP_LICENSE_API_URL || licenseConfig.apiUrl;
  const payload = {
    product_id: productId,
    current_version: currentVersion,
  };
  return await callApi(
    "POST",
    `${apiUrl}/api/check_update`,
    payload
  );
}

export async function downloadUpdate(
  productId: string,
  updateId: string,
  version: string,
  product: string,
  type?: string
): Promise<ApiResponse> {
  if (!productId || !updateId || !version || !product) {
    throw adminError();
  }
  const licenseFilePath = `${licFolderPath}/${productId}.lic`;
  let licenseFile: string;
  try {
    licenseFile = await fs.readFile(licenseFilePath, "utf8");
  } catch (e) {
    throw adminError();
  }

  const data = {
    license_file: licenseFile,
    license_code: null,
    client_name: null,
  };

  // Call API to download update
  const licenseConfig = getLicenseConfig();
  const apiUrl = process.env.APP_LICENSE_API_URL || licenseConfig.apiUrl;
  const response = await callApi(
    "POST",
    `${apiUrl}/api/download_update/main/${updateId}`,
    data,
    `${product}-${version}`
  );

  if (!response.status || !response.path) {
    throw adminError("Update download failed.");
  }

  try {
    unzip(response.path, rootPath);

    if (type === "extension") {
      try {
        await updateExtensionQuery(productId, version);
      } catch (error) {
        throw adminError("Extension update failed.", error);
      }
    } else if (type === "blockchain") {
      try {
        await updateBlockchainQuery(productId, version);
      } catch (error) {
        throw adminError("Blockchain update failed.", error);
      }
    }

    // Remove the zip file after successful extraction
    await fs.unlink(response.path);
    return {
      message: "Update downloaded and extracted successfully",
      status: true,
    };
  } catch (error) {
    throw adminError("Update extraction failed.", error);
  }
}

export async function fetchAllProductsUpdates(): Promise<ApiResponse> {
  try {
    const licenseConfig = getLicenseConfig();
    const apiUrl = process.env.APP_LICENSE_API_URL || licenseConfig.apiUrl;
    const response = await callApi(
      "POST",
      `${apiUrl}/api/all_products_updates`,
      {}
    );
    return response;
  } catch (error) {
    console.error("Failed to fetch all products updates:", error);
    return { status: false, message: "Failed to fetch updates", products: [] };
  }
}

const unzip = (filePath: string, outPath: string) => {
  const zip = new AdmZip(filePath);
  zip.extractAllTo(outPath, true);
};
