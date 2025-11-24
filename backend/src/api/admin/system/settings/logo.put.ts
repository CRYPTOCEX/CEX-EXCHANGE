import { models } from "@b/db";
import { CacheManager } from "@b/utils/cache";
import { createError } from "@b/utils/error";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import sharp from "sharp";

export const metadata = {
  summary: "Updates logo files in /public/img/logo/ directory",
  operationId: "updateLogoFiles",
  tags: ["Admin", "Settings", "Logo"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            logoType: {
              type: "string",
              description: "Type of logo (logo, darkLogo, fullLogo, etc.)",
            },
            file: {
              type: "string",
              description: "Base64 encoded file data",
            },
          },
          required: ["logoType", "file"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Logo updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              logoUrl: { type: "string" },
            },
          },
        },
      },
    },
    400: { description: "Invalid logo type or file" },
    401: { description: "Unauthorized" },
    500: { description: "Internal server error" },
  },
  permission: "edit.settings",
  requiresAuth: true,
};

// STRICT mapping - each logo type only updates its own specific files
const STRICT_LOGO_MAPPING: Record<string, { 
  primaryFiles: string[], 
  additionalFiles: string[], 
  size: { width: number; height: number } 
}> = {
  logo: {
    primaryFiles: ["logo.png", "logo.webp"], // Light theme uses main logo files
    additionalFiles: [
      // Additional legacy files for light theme
      "apple-icon-precomposed.png",
      "apple-icon-precomposed.webp",
      "apple-icon.png",
      "apple-icon.webp",
      "apple-touch-icon.png",
      "apple-touch-icon.webp",
    ],
    size: { width: 96, height: 96 }
  },
  darkLogo: {
    primaryFiles: ["logo-dark.png", "logo-dark.webp"], // Dark theme uses separate files
    additionalFiles: [], // ABSOLUTELY NO additional files for dark logo
    size: { width: 96, height: 96 }
  },
  fullLogo: {
    primaryFiles: ["logo-text.png", "logo-text.webp"], // Light theme uses main text logo files
    additionalFiles: [],
    size: { width: 350, height: 75 }
  },
  darkFullLogo: {
    primaryFiles: ["logo-text-dark.png", "logo-text-dark.webp"], // Dark theme uses separate files
    additionalFiles: [], // ABSOLUTELY NO additional files for dark full logo
    size: { width: 350, height: 75 }
  },
  cardLogo: {
    primaryFiles: ["android-chrome-256x256.png", "android-chrome-256x256.webp"],
    additionalFiles: [],
    size: { width: 256, height: 256 }
  },
  favicon16: {
    primaryFiles: ["favicon-16x16.png", "favicon-16x16.webp"],
    additionalFiles: [],
    size: { width: 16, height: 16 }
  },
  favicon32: {
    primaryFiles: ["favicon-32x32.png", "favicon-32x32.webp"],
    additionalFiles: [],
    size: { width: 32, height: 32 }
  },
  favicon96: {
    primaryFiles: ["favicon-96x96.png", "favicon-96x96.webp"],
    additionalFiles: [],
    size: { width: 96, height: 96 }
  },
  appleIcon57: {
    primaryFiles: ["apple-icon-57x57.png", "apple-icon-57x57.webp"],
    additionalFiles: [],
    size: { width: 57, height: 57 }
  },
  appleIcon60: {
    primaryFiles: ["apple-icon-60x60.png", "apple-icon-60x60.webp"],
    additionalFiles: [],
    size: { width: 60, height: 60 }
  },
  appleIcon72: {
    primaryFiles: ["apple-icon-72x72.png", "apple-icon-72x72.webp"],
    additionalFiles: [],
    size: { width: 72, height: 72 }
  },
  appleIcon76: {
    primaryFiles: ["apple-icon-76x76.png", "apple-icon-76x76.webp"],
    additionalFiles: [],
    size: { width: 76, height: 76 }
  },
  appleIcon114: {
    primaryFiles: ["apple-icon-114x114.png", "apple-icon-114x114.webp"],
    additionalFiles: [],
    size: { width: 114, height: 114 }
  },
  appleIcon120: {
    primaryFiles: ["apple-icon-120x120.png", "apple-icon-120x120.webp"],
    additionalFiles: [],
    size: { width: 120, height: 120 }
  },
  appleIcon144: {
    primaryFiles: ["apple-icon-144x144.png", "apple-icon-144x144.webp"],
    additionalFiles: [
      "android-icon-144x144.png",
      "android-icon-144x144.webp",
      "mstile-144x144.png",
      "mstile-144x144.webp",
    ],
    size: { width: 144, height: 144 }
  },
  appleIcon152: {
    primaryFiles: ["apple-icon-152x152.png", "apple-icon-152x152.webp"],
    additionalFiles: [],
    size: { width: 152, height: 152 }
  },
  appleIcon180: {
    primaryFiles: ["apple-icon-180x180.png", "apple-icon-180x180.webp"],
    additionalFiles: [],
    size: { width: 180, height: 180 }
  },
  androidIcon192: {
    primaryFiles: ["android-chrome-192x192.png", "android-chrome-192x192.webp"],
    additionalFiles: [
      "android-icon-192x192.png",
      "android-icon-192x192.webp",
    ],
    size: { width: 192, height: 192 }
  },
  androidIcon256: {
    primaryFiles: ["android-chrome-256x256.png", "android-chrome-256x256.webp"],
    additionalFiles: [
      "android-icon-256x256.png",
      "android-icon-256x256.webp",
    ],
    size: { width: 256, height: 256 }
  },
  androidIcon384: {
    primaryFiles: ["android-chrome-384x384.png", "android-chrome-384x384.webp"],
    additionalFiles: [
      "android-icon-384x384.png",
      "android-icon-384x384.webp",
    ],
    size: { width: 384, height: 384 }
  },
  androidIcon512: {
    primaryFiles: ["android-chrome-512x512.png", "android-chrome-512x512.webp"],
    additionalFiles: [
      "android-icon-512x512.png",
      "android-icon-512x512.webp",
    ],
    size: { width: 512, height: 512 }
  },
  msIcon144: {
    primaryFiles: ["ms-icon-144x144.png", "ms-icon-144x144.webp"],
    additionalFiles: [
      "mstile-150x150.png",
      "mstile-150x150.webp",
    ],
    size: { width: 144, height: 144 }
  },
};

interface ProcessResult {
  filename: string;
  success: boolean;
  error?: string;
}

export default async (data: { body: { logoType: string; file: string } }) => {
  const { body } = data;
  const { logoType, file } = body;

  if (!logoType || !file) {
    throw createError({
      statusCode: 400,
      message: "Logo type and file are required",
    });
  }

  const logoConfig = STRICT_LOGO_MAPPING[logoType];
  if (!logoConfig) {
    throw createError({
      statusCode: 400,
      message: `Invalid logo type: ${logoType}. Valid types: ${Object.keys(STRICT_LOGO_MAPPING).join(', ')}`,
    });
  }

  // Validate base64 file format
  if (!file.startsWith('data:')) {
    throw createError({
      statusCode: 400,
      message: "Invalid file format",
    });
  }

  try {
    console.log(`[LOGO-API-DEBUG] Processing logo upload for type: ${logoType}`);
    console.log(`[LOGO-API-DEBUG] File size: ${file.length} characters`);
    
    // Determine the correct path based on environment with better detection
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Enhanced path resolution with multiple fallbacks
    let logoDir: string;
    
    if (isProduction) {
      // In production, try multiple possible paths
      const possiblePaths = [
        path.join(process.cwd(), "frontend", "public", "img", "logo"),
        path.join(process.cwd(), "public", "img", "logo"),
        path.join(process.cwd(), "..", "frontend", "public", "img", "logo"),
        path.join(process.cwd(), "..", "public", "img", "logo"),
      ];
      
      // Find the first path that exists or can be created
      logoDir = possiblePaths[0]; // Default to first path
      
      for (const testPath of possiblePaths) {
        const parentDir = path.dirname(testPath);
        if (fsSync.existsSync(parentDir)) {
          logoDir = testPath;
          break;
        }
      }
      
      // Debug logging for production troubleshooting
      console.log(`[LOGO-DEBUG] Production mode detected`);
      console.log(`[LOGO-DEBUG] Current working directory: ${process.cwd()}`);
      console.log(`[LOGO-DEBUG] Selected logo directory: ${logoDir}`);
      console.log(`[LOGO-DEBUG] Logo directory exists: ${fsSync.existsSync(logoDir)}`);
      console.log(`[LOGO-DEBUG] Parent directory exists: ${fsSync.existsSync(path.dirname(logoDir))}`);
    } else {
      // Development path
      logoDir = path.join(process.cwd(), "..", "frontend", "public", "img", "logo");
    }
    
    // Extract base64 data
    const base64Data = file.split(",")[1];
    if (!base64Data) {
      throw createError({
        statusCode: 400,
        message: "Invalid file data",
      });
    }

    const buffer = Buffer.from(base64Data, "base64");
    console.log(`[LOGO-API-DEBUG] Buffer created, size: ${buffer.length} bytes`);
    
    // Try to ensure the directory exists, with fallback to alternative paths
    let finalLogoDir = logoDir;
    let directoryCreated = false;
    
    if (isProduction) {
      // In production, try multiple paths until one works
      const fallbackPaths = [
        logoDir,
        path.join(process.cwd(), "public", "img", "logo"),
        path.join(process.cwd(), "..", "frontend", "public", "img", "logo"),
        path.join(process.cwd(), "..", "public", "img", "logo"),
      ];
      
      for (const testPath of fallbackPaths) {
        try {
          if (!fsSync.existsSync(testPath)) {
            await fs.mkdir(testPath, { recursive: true });
            console.log(`[LOGO-DEBUG] Successfully created directory: ${testPath}`);
          }
          finalLogoDir = testPath;
          directoryCreated = true;
          break;
        } catch (error) {
          console.error(`[LOGO-DEBUG] Failed to create directory ${testPath}:`, error.message);
          continue;
        }
      }
      
      if (!directoryCreated) {
        throw createError({
          statusCode: 500,
          message: "Failed to create logo directory in any of the attempted paths",
        });
      }
    } else {
      // Development - use the original logic
      if (!fsSync.existsSync(finalLogoDir)) {
        try {
          await fs.mkdir(finalLogoDir, { recursive: true });
          console.log(`[LOGO-DEBUG] Created logo directory: ${finalLogoDir}`);
        } catch (mkdirError) {
          console.error(`[LOGO-DEBUG] Failed to create logo directory: ${finalLogoDir}`, mkdirError);
          throw createError({
            statusCode: 500,
            message: `Failed to create logo directory: ${mkdirError.message}`,
          });
        }
      }
    }
    
    console.log(`[LOGO-DEBUG] Using final logo directory: ${finalLogoDir}`);
    
    // Get all files to process for this logo type
    const allFilesToProcess = [...logoConfig.primaryFiles, ...logoConfig.additionalFiles];
    
    // Process the uploaded file and create all required formats
    const results: ProcessResult[] = [];
    
    for (const filename of allFilesToProcess) {
      const targetPath = path.join(finalLogoDir, filename);
      const isWebP = filename.endsWith('.webp');
      
      // Get size for this specific file (from filename or use default)
      const fileSize = getFileSizeFromFilename(filename) || logoConfig.size;
      
      try {
        // Process the image with sharp
        let processedImage = sharp(buffer);
        
        // Resize to the required dimensions
        processedImage = processedImage.resize(fileSize.width, fileSize.height, {
          fit: 'inside',
          withoutEnlargement: false
        });
        
        // Convert to the appropriate format
        if (isWebP) {
          processedImage = processedImage.webp({ quality: 90 });
        } else {
          // PNG doesn't use quality parameter the same way as JPEG
          processedImage = processedImage.png({ compressionLevel: 6 });
        }
        
        // Save the processed image
        await processedImage.toFile(targetPath);
        
        results.push({ filename, success: true });
      } catch (error) {
        console.error(`[LOGO-DEBUG] Failed to process file ${filename}:`, error.message);
        results.push({ filename, success: false, error: error.message });
      }
    }
    
    // Get the primary logo URL for response
    const logoUrl = `/img/logo/${logoConfig.primaryFiles[0]}`;
    
    // Check processing results
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    
    return {
      message: `Logo ${logoType} updated successfully. Processed ${successCount}/${results.length} files.`,
      logoUrl,
      results,
    };
    
  } catch (error: any) {
    console.error(`[LOGO-API-ERROR] Failed to update logo ${logoType}:`, error);
    console.error(`[LOGO-API-ERROR] Error message:`, error?.message);
    console.error(`[LOGO-API-ERROR] Error stack:`, error?.stack);
    
    throw createError({
      statusCode: 500,
      message: `Failed to update logo ${logoType}: ${error?.message || error}`,
    });
  }
};

// Helper function to extract size from filename
function getFileSizeFromFilename(filename: string): { width: number; height: number } | null {
  const sizeMatch = filename.match(/(\d+)x(\d+)/);
  if (sizeMatch) {
    return {
      width: parseInt(sizeMatch[1]),
      height: parseInt(sizeMatch[2]),
    };
  }
  return null;
} 