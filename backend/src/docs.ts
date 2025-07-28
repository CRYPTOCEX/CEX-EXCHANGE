import { baseUrl } from "@b/utils/constants";
import fs from "fs";
import path from "path";
import { getMime } from "./utils/mime";
import { writeFile } from "fs/promises";

/**
 * Get the correct swagger.json output path with multiple fallbacks
 */
function getSwaggerDocPath(): string {
  // Determine path based on environment
  // Development: backend runs from /project/backend/, needs ".." to reach /project/frontend/
  // Production: backend runs from /public_html/, frontend is at /public_html/frontend/
  const isProduction = process.env.NODE_ENV === 'production';
  const swaggerPaths = [
    isProduction 
      ? path.resolve(process.cwd(), "frontend", "public", "swagger.json")
      : path.resolve(process.cwd(), "..", "frontend", "public", "swagger.json"),
  ];

  let swaggerPath: string | null = null;
  for (const tryPath of swaggerPaths) {
    if (fs.existsSync(tryPath)) {
      swaggerPath = tryPath;
      break;
    }
  }
  
  if (swaggerPath) {
    console.log(`Using swagger.json path: ${swaggerPath}`);
    return swaggerPath;
  } else {
    console.warn(`Warning: swagger.json output directory not found, using default: ${swaggerPaths[0]}`);
    return swaggerPaths[0];
  }
}

/**
 * Get the correct docs-ui folder path with multiple fallbacks
 */
function getDocsUIFolderPath(): string {
  const docsPaths = [
    path.resolve(process.cwd(), "backend", "packages", "docs-ui"),        // Standard path (PRIORITY)
    path.resolve(process.cwd(), "packages", "docs-ui"),                  // Alternative if running from root
  ];
  
  // Find the first path that exists
  for (const docsPath of docsPaths) {
    try {
      fs.accessSync(docsPath);
      console.log(`Using docs-ui path: ${docsPath}`);
      return docsPath;
    } catch (error) {
      // Path doesn't exist, try next one
    }
  }
  
  // If none exist, return the first path (will cause an error but with clear path info)
  console.warn(`Warning: docs-ui folder not found, using default: ${docsPaths[0]}`);
  return docsPaths[0];
}

/**
 * Get the correct API source directory path with multiple fallbacks for Swagger generation
 */
function getApiSourcePath(): string {
  const isProduction = process.env.NODE_ENV === "production";
  
  const apiPaths = [
    // In production, prioritize compiled JavaScript files
    ...(isProduction ? [
      path.resolve(process.cwd(), "backend", "dist", "src", "api"),       // Production compiled path (PRIORITY)
      path.resolve(process.cwd(), "dist", "src", "api"),                  // Alternative production compiled path
    ] : []),
    
    // Development paths - prioritize compiled files if available
    path.resolve(__dirname, "../api"),                                    // Development relative path (compiled)
    path.resolve(process.cwd(), "backend", "dist", "src", "api"),         // Development compiled path
    path.resolve(process.cwd(), "backend", "src", "api"),                 // Development source path
    path.resolve(process.cwd(), "src", "api"),                           // Another fallback
  ];
  
  // Find the first path that exists
  for (const apiPath of apiPaths) {
    try {
      fs.accessSync(apiPath);
      console.log(`Using API source path for Swagger: ${apiPath}`);
      return apiPath;
    } catch (error) {
      // Path doesn't exist, try next one
    }
  }
  
  // If none exist, return the first path (will cause an error but with clear path info)
  console.warn(`Warning: API source directory not found, using default: ${apiPaths[0]}`);
  return apiPaths[0];
}

const SWAGGER_DOC_PATH = getSwaggerDocPath();
const SWAGGER_UI_FOLDER = getDocsUIFolderPath();
const REGENERATION_INTERVAL = 300000; // 5 minutes in milliseconds

const swaggerDoc = {
  openapi: "3.0.0",
  info: {
    title: process.env.SITE_NAME || "API Documentation",
    version: "1.0.0",
    description:
      process.env.SITE_DESCRIPTION ||
      "This is the API documentation for the site, powered by Mash Server.",
  },
  paths: {},
  components: {
    schemas: {},
    responses: {},
    parameters: {},
    requestBodies: {},
    securitySchemes: {
      ApiKeyAuth: { type: "apiKey", in: "header", name: "X-API-KEY" },
    },
  },
  tags: [],
};

let lastSwaggerGenerationTime = 0;

async function fileExists(filePath) {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function generateSwaggerDocIfNeeded() {
  const needsRegeneration =
    !(await fileExists(SWAGGER_DOC_PATH)) ||
    Date.now() - lastSwaggerGenerationTime > REGENERATION_INTERVAL;

  if (needsRegeneration) {
    console.log("Swagger documentation needs regeneration.");
    const apiSourcePath = getApiSourcePath();
    await generateSwaggerDoc(apiSourcePath, "/api");
    lastSwaggerGenerationTime = Date.now();
    console.log("Swagger documentation regenerated.");
  } else {
    console.log("Using existing Swagger documentation.");
  }
}

async function generateSwaggerDoc(startPath, basePath = "/api") {
  const entries = await fs.promises.readdir(startPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(startPath, entry.name);

    // Skip certain directories and files
    if (entry.isDirectory() && ["cron", "admin", "util"].includes(entry.name)) {
      continue;
    }

    if (entry.name.startsWith("index.ws")) {
      continue;
    }

    if (entry.isDirectory()) {
      // Check if directory is a grouping folder (e.g. (folderName))
      let newBasePath = basePath;
      if (!/^\(.*\)$/.test(entry.name)) {
        // Replace [param] with :param for route definition (will be converted later to Swagger syntax)
        newBasePath = `${basePath}/${entry.name.replace(/\[(\w+)\]/, ":$1")}`;
      }
      await generateSwaggerDoc(entryPath, newBasePath);
    } else {
      // Handle file routes
      const [routeName, method] = entry.name.replace(/\.[jt]s$/, "").split(".");
      if (!method) continue;

      const metadata = await loadRouteMetadata(entryPath);
      let routePath = `${basePath}/${routeName}`.replace(/\/index$/, "");
      routePath = convertToSwaggerPath(routePath);

      if (!swaggerDoc.paths[routePath]) {
        swaggerDoc.paths[routePath] = {};
      }

      swaggerDoc.paths[routePath][method.toLowerCase()] = {
        ...metadata,
        responses: constructResponses(metadata.responses),
        security: metadata.requiresAuth ? [{ ApiKeyAuth: [] }] : [],
      };
    }
  }

  // Ensure the directory exists before writing
  const swaggerDir = path.dirname(SWAGGER_DOC_PATH);
  try {
    await fs.promises.mkdir(swaggerDir, { recursive: true });
  } catch (error) {
    // Directory might already exist, that's fine
  }
  
  await writeFile(
    SWAGGER_DOC_PATH,
    JSON.stringify(swaggerDoc, null, 2),
    "utf8"
  );
}

async function loadRouteMetadata(entryPath): Promise<any> {
  try {
    const importedModule = await import(entryPath);
    if (!importedModule.metadata || !importedModule.metadata.responses) {
      console.warn(`No proper 'metadata' exported from ${entryPath}`);
      return { responses: {} }; // Return a safe default to prevent errors
    }
    return importedModule.metadata;
  } catch (error) {
    // Check if it's an environment variable error
    if (error.message && error.message.includes('APP_VERIFY_TOKEN_SECRET')) {
      console.warn(`Skipping ${entryPath} - Missing environment variable: APP_VERIFY_TOKEN_SECRET`);
    } else {
      console.error(`Error loading route metadata from ${entryPath}:`, error.message);
    }
    return { responses: {} }; // Return a safe default to prevent errors
  }
}

function constructResponses(responses) {
  return Object.keys(responses).reduce((acc, statusCode) => {
    acc[statusCode] = {
      description: responses[statusCode].description,
      content: responses[statusCode].content,
    };
    return acc;
  }, {});
}

function convertToSwaggerPath(routePath) {
  // Convert :param to {param} for Swagger documentation
  routePath = routePath.replace(/:([a-zA-Z0-9_]+)/g, "{$1}");
  // Convert [param] to {param} for Swagger documentation
  routePath = routePath.replace(/\[(\w+)]/g, "{$1}");
  return routePath;
}

function setupSwaggerRoute(app) {
  console.log(`\x1b[36mSetting up Swagger routes:\x1b[0m`);
  console.log(`  - Swagger JSON Path: ${SWAGGER_DOC_PATH}`);
  console.log(`  - Swagger UI Folder: ${SWAGGER_UI_FOLDER}`);
  
  app.get("/api/docs/swagger.json", async (res) => {
    try {
      await generateSwaggerDocIfNeeded();
      const data = await fs.promises.readFile(SWAGGER_DOC_PATH, 'utf8');
      res.cork(() => {
        res.writeHeader("Content-Type", "application/json").end(data);
      });
    } catch (error) {
      console.error("Error generating or serving Swagger JSON:", error);
      console.error("Swagger doc path:", SWAGGER_DOC_PATH);
      res.cork(() => {
        res
          .writeStatus("500 Internal Server Error")
          .end("Internal Server Error");
      });
    }
  });

  app.get("/api/docs/*", async (res, req) => {
    const urlPath = req.getUrl();
    let filePath = urlPath.replace("/api/docs/", "");
    
    // Handle different URL patterns
    if (urlPath === "/api/docs/v1" || urlPath === "/api/docs/" || filePath === "") {
      filePath = "index.html";
    }
    
    const fullPath = path.join(SWAGGER_UI_FOLDER, filePath);
    
    try {
      console.log(`Serving docs file: ${urlPath} -> ${fullPath}`);
      
      const data = await fs.promises.readFile(fullPath);

      res.cork(() => {
        res.writeHeader("Content-Type", getMime(filePath)).end(data);
      });
    } catch (error) {
      console.error("Error serving Swagger UI:", error);
      console.error("URL Path:", urlPath);
      console.error("File Path:", filePath);
      console.error("Full Path:", fullPath);
      console.error("Swagger UI Folder:", SWAGGER_UI_FOLDER);
      res.cork(() => {
        res
          .writeStatus("500 Internal Server Error")
          .end("Internal Server Error");
      });
    }
  });
}

export { setupSwaggerRoute };
