import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import sharp from "sharp";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

// Determine the correct path based on environment
// Development: backend runs from /project/backend/, needs ".." to reach /project/frontend/
// Production: backend runs from /public_html/, frontend is at /public_html/frontend/
const isProduction = process.env.NODE_ENV === 'production';

// Enhanced path resolution with multiple fallbacks
let BASE_UPLOAD_DIR: string;

if (isProduction) {
  // In production, try multiple possible paths
  const possiblePaths = [
    path.join(process.cwd(), "frontend", "public", "img", "logo"),
    path.join(process.cwd(), "public", "img", "logo"),
    path.join(process.cwd(), "..", "frontend", "public", "img", "logo"),
    path.join(process.cwd(), "..", "public", "img", "logo"),
  ];
  
  // Find the first path that exists or can be created
  BASE_UPLOAD_DIR = possiblePaths[0]; // Default to first path
  
  for (const testPath of possiblePaths) {
    const parentDir = path.dirname(testPath);
    if (fsSync.existsSync(parentDir)) {
      BASE_UPLOAD_DIR = testPath;
      break;
    }
  }
  
  // Debug logging for production troubleshooting
  console.log(`[LOGO-DEBUG] Production mode detected`);
  console.log(`[LOGO-DEBUG] Current working directory: ${process.cwd()}`);
  console.log(`[LOGO-DEBUG] Selected logo directory: ${BASE_UPLOAD_DIR}`);
  console.log(`[LOGO-DEBUG] Logo directory exists: ${fsSync.existsSync(BASE_UPLOAD_DIR)}`);
  console.log(`[LOGO-DEBUG] Parent directory exists: ${fsSync.existsSync(path.dirname(BASE_UPLOAD_DIR))}`);
} else {
  // Development path
  BASE_UPLOAD_DIR = path.join(process.cwd(), "..", "frontend", "public", "img", "logo");
}

// Define the logo configurations with their exact filenames and dimensions
const LOGO_CONFIGS = {
  // Main logos
  "logo": { width: 512, height: 512, formats: ["png", "webp"] },
  "logo-text": { width: 300, height: 100, formats: ["png", "webp"] },
  
  // Favicons
  "favicon-16x16": { width: 16, height: 16, formats: ["png", "webp"] },
  "favicon-32x32": { width: 32, height: 32, formats: ["png", "webp"] },
  "favicon-96x96": { width: 96, height: 96, formats: ["png", "webp"] },
  
  // Apple icons
  "apple-icon-57x57": { width: 57, height: 57, formats: ["png", "webp"] },
  "apple-icon-60x60": { width: 60, height: 60, formats: ["png", "webp"] },
  "apple-icon-72x72": { width: 72, height: 72, formats: ["png", "webp"] },
  "apple-icon-76x76": { width: 76, height: 76, formats: ["png", "webp"] },
  "apple-icon-114x114": { width: 114, height: 114, formats: ["png", "webp"] },
  "apple-icon-120x120": { width: 120, height: 120, formats: ["png", "webp"] },
  "apple-icon-144x144": { width: 144, height: 144, formats: ["png", "webp"] },
  "apple-icon-152x152": { width: 152, height: 152, formats: ["png", "webp"] },
  "apple-icon-180x180": { width: 180, height: 180, formats: ["png", "webp"] },
  "apple-icon-precomposed": { width: 192, height: 192, formats: ["png", "webp"] },
  "apple-icon": { width: 192, height: 192, formats: ["png", "webp"] },
  "apple-touch-icon": { width: 180, height: 180, formats: ["png", "webp"] },
  
  // Android icons
  "android-icon-36x36": { width: 36, height: 36, formats: ["png", "webp"] },
  "android-icon-48x48": { width: 48, height: 48, formats: ["png", "webp"] },
  "android-icon-72x72": { width: 72, height: 72, formats: ["png", "webp"] },
  "android-icon-96x96": { width: 96, height: 96, formats: ["png", "webp"] },
  "android-icon-144x144": { width: 144, height: 144, formats: ["png", "webp"] },
  "android-icon-192x192": { width: 192, height: 192, formats: ["png", "webp"] },
  "android-icon-256x256": { width: 256, height: 256, formats: ["png", "webp"] },
  "android-icon-384x384": { width: 384, height: 384, formats: ["png", "webp"] },
  "android-icon-512x512": { width: 512, height: 512, formats: ["png", "webp"] },
  
  // Android Chrome icons
  "android-chrome-192x192": { width: 192, height: 192, formats: ["png", "webp"] },
  "android-chrome-256x256": { width: 256, height: 256, formats: ["png", "webp"] },
  "android-chrome-384x384": { width: 384, height: 384, formats: ["png", "webp"] },
  "android-chrome-512x512": { width: 512, height: 512, formats: ["png", "webp"] },
  
  // Microsoft icons
  "ms-icon-70x70": { width: 70, height: 70, formats: ["png", "webp"] },
  "ms-icon-144x144": { width: 144, height: 144, formats: ["png", "webp"] },
  "ms-icon-150x150": { width: 150, height: 150, formats: ["png", "webp"] },
  "ms-icon-310x310": { width: 310, height: 310, formats: ["png", "webp"] },
  
  // MS Tiles
  "mstile-70x70": { width: 70, height: 70, formats: ["png", "webp"] },
  "mstile-144x144": { width: 144, height: 144, formats: ["png", "webp"] },
  "mstile-150x150": { width: 150, height: 150, formats: ["png", "webp"] },
  "mstile-310x150": { width: 310, height: 150, formats: ["webp"] },
  "mstile-310x310": { width: 310, height: 310, formats: ["png", "webp"] },
};

export const metadata: OperationObject = {
  summary: "Upload and update logo files",
  description: "Uploads a new logo and updates all logo variants in the /img/logo directory with the same filenames",
  operationId: "uploadLogo",
  tags: ["Admin", "Logo"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            file: {
              type: "string",
              description: "Base64 encoded logo file data",
            },
            logoType: {
              type: "string",
              enum: ["logo", "logo-text"],
              description: "Type of logo to update (main logo or logo with text)",
              default: "logo"
            },
          },
          required: ["file"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Logo uploaded and updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Success message",
              },
              updatedFiles: {
                type: "array",
                items: { type: "string" },
                description: "List of updated logo files",
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Logo"),
    500: serverErrorResponse,
  },
  permission: "access.system",
};

export default async (data) => {
  const { body, user } = data;
  if (!user) throw new Error("User not found");

  const { file: base64File, logoType = "logo" } = body;

  if (!base64File) {
    throw new Error("No file provided");
  }

  // Validate base64 file format
  if (typeof base64File !== 'string' || !base64File.startsWith('data:image/')) {
    throw new Error("Invalid image file format");
  }

  // File size limit (5MB for logos)
  const base64Data = base64File.split(",")[1];
  if (!base64Data) {
    throw new Error("Invalid file data");
  }
  
  const fileSizeBytes = (base64Data.length * 3) / 4;
  const maxSizeBytes = 5 * 1024 * 1024; // 5MB
  
  if (fileSizeBytes > maxSizeBytes) {
    throw new Error("File size exceeds maximum limit of 5MB");
  }

  const mimeType = base64File.match(/^data:(.*);base64,/)?.[1] || "";
  
  // Only allow image types for logos
  const allowedMimeTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'
  ];
  
  if (!allowedMimeTypes.includes(mimeType)) {
    throw new Error("Only image files are allowed for logos");
  }
  
  const buffer = Buffer.from(base64Data, "base64");
  const updatedFiles: string[] = [];

  try {
    // Ensure logo directory exists
    await ensureDirExists(BASE_UPLOAD_DIR);

    // If updating logo-text, only update logo-text files
    if (logoType === "logo-text") {
      const config = LOGO_CONFIGS["logo-text"];
      for (const format of config.formats) {
        const filename = `logo-text.${format}`;
        const filePath = path.join(BASE_UPLOAD_DIR, filename);
        
        let processedImage: Buffer;
        if (format === "webp") {
          processedImage = await sharp(buffer)
            .resize(config.width, config.height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .webp({ quality: 90 })
            .toBuffer();
        } else {
          processedImage = await sharp(buffer)
            .resize(config.width, config.height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png({ quality: 90 })
            .toBuffer();
        }
        
        await fs.writeFile(filePath, processedImage);
        updatedFiles.push(filename);
      }
    } else {
      // Update all logo variants (excluding logo-text)
      for (const [logoName, config] of Object.entries(LOGO_CONFIGS)) {
        if (logoName === "logo-text") continue; // Skip logo-text when updating main logo
        
        for (const format of config.formats) {
          const filename = `${logoName}.${format}`;
          const filePath = path.join(BASE_UPLOAD_DIR, filename);
          
          let processedImage: Buffer;
          if (format === "webp") {
            processedImage = await sharp(buffer)
              .resize(config.width, config.height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
              .webp({ quality: 90 })
              .toBuffer();
          } else {
            processedImage = await sharp(buffer)
              .resize(config.width, config.height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
              .png({ quality: 90 })
              .toBuffer();
          }
          
          await fs.writeFile(filePath, processedImage);
          updatedFiles.push(filename);
        }
      }
    }

    return {
      message: `Logo updated successfully. ${updatedFiles.length} files updated.`,
      updatedFiles,
    };
  } catch (error) {
    console.error("Error updating logo files:", error);
    throw new Error("Failed to update logo files");
  }
};

async function ensureDirExists(dir: string) {
  try {
    await fs.access(dir);
    console.log(`[LOGO-DEBUG] Directory exists: ${dir}`);
  } catch (error) {
    if (error.code === "ENOENT") {
      try {
        console.log(`[LOGO-DEBUG] Creating directory: ${dir}`);
        await fs.mkdir(dir, { recursive: true });
        console.log(`[LOGO-DEBUG] Directory created successfully: ${dir}`);
      } catch (mkdirError) {
        console.error(`[LOGO-DEBUG] Failed to create directory: ${dir}`, mkdirError);
        throw new Error(`Failed to create logo directory: ${mkdirError.message}`);
      }
    } else {
      console.error(`[LOGO-DEBUG] Directory access error: ${dir}`, error);
      throw error;
    }
  }
} 