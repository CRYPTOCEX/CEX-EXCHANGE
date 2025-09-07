import heicConvert from "heic-convert";
import fs from "fs/promises";
import path from "path";
import { sanitizeUserPath } from "@b/utils/validation";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

/**
 * Generate a file URL for the uploaded file
 * Uses static URL since server.ts handles /uploads/ serving
 */
function generateFileUrl(filePath: string): string {
  return `/uploads/${filePath}`;
}

export const metadata = {
  summary: "Converts a HEIC image to JPEG format",
  description: "Converts a HEIC image to JPEG format and returns the file URL",
  operationId: "convertHeicFile",
  tags: ["Conversion"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            dir: {
              type: "string",
              description: "Directory to save the converted file",
            },
            file: {
              type: "string",
              description: "Base64 encoded HEIC file data",
            },
            mimeType: { type: "string", description: "MIME type of the file" }, // Added mimeType
          },
          required: ["dir", "file", "mimeType"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "File converted successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              url: { type: "string", description: "URL of the converted file" },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Conversion"),
    500: serverErrorResponse,
  },
};

// Determine the correct path based on environment
// Development: backend runs from /project/backend/, needs ".." to reach /project/frontend/
// Production: backend runs from /public_html/, frontend is at /public_html/frontend/
const isProduction = process.env.NODE_ENV === 'production';
const BASE_CONVERT_DIR = isProduction 
  ? path.join(process.cwd(), "frontend", "public", "uploads")
  : path.join(process.cwd(), "..", "frontend", "public", "uploads");

export default async (data) => {
  const { body, user } = data;
  if (!user) throw new Error("User not found");

  const { dir, file: base64File, mimeType } = body;
  if (!dir || !base64File || !mimeType) {
    throw new Error("Missing required fields: dir, file, or mimeType");
  }

  // Security validation for directory
  if (typeof dir !== 'string' || dir.length > 100) {
    throw new Error("Invalid directory path");
  }

  // Check for suspicious patterns in directory
  if (dir.includes('\0') || dir.includes('%00') || dir.includes('..')) {
    throw new Error("Invalid directory path");
  }

  // Validate base64 file format
  if (typeof base64File !== 'string' || !base64File.startsWith('data:')) {
    throw new Error("Invalid file format");
  }

  // Validate MIME type
  if (typeof mimeType !== 'string' || (!mimeType.includes("heic") && !mimeType.includes("heif"))) {
    throw new Error("Unsupported file format. Only HEIC or HEIF files are allowed.");
  }

  // File size limit (10MB)
  const base64Data = base64File.split(",")[1];
  if (!base64Data) {
    throw new Error("Invalid file data");
  }
  
  const fileSizeBytes = (base64Data.length * 3) / 4;
  const maxSizeBytes = 10 * 1024 * 1024; // 10MB
  
  if (fileSizeBytes > maxSizeBytes) {
    throw new Error("File size exceeds maximum limit of 10MB");
  }

  const buffer = Buffer.from(base64Data, "base64");

  // Validate the directory path and create directories if necessary
  const sanitizedDir = sanitizeUserPath(dir.replace(/-/g, "/"));
  const mediaDir = path.join(BASE_CONVERT_DIR, sanitizedDir);
  
  // Additional security check: ensure resolved path is within uploads
  const resolvedMediaDir = path.resolve(mediaDir);
  const resolvedBaseDir = path.resolve(BASE_CONVERT_DIR);
  
  if (!resolvedMediaDir.startsWith(resolvedBaseDir + path.sep) && resolvedMediaDir !== resolvedBaseDir) {
    throw new Error("Invalid upload directory");
  }
  
  await ensureDirExists(mediaDir);

  // Define the output filename
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
  const outputPath = path.join(mediaDir, filename);

  // Convert HEIC to JPEG using `heic-convert`
  try {
    const jpegBuffer = await heicConvert({
      buffer, // Input buffer for HEIC data
      format: "JPEG", // Output format as JPEG
      quality: 0.8, // Quality scale: 0-1 (optional, defaults to 1)
    });

    // Write the converted JPEG file to the target directory
    await fs.writeFile(outputPath, jpegBuffer);

    // Return the file URL
    return { url: generateFileUrl(`${sanitizedDir}/${filename}`) };
  } catch (error) {
    console.error("Error converting HEIC to JPEG using `heic-convert`:", error);
    throw new Error("HEIC to JPEG conversion failed using `heic-convert`.");
  }
};

// Helper function to ensure the directory exists
async function ensureDirExists(dir) {
  try {
    await fs.access(dir);
  } catch (error) {
    if (error.code === "ENOENT") {
      await fs.mkdir(dir, { recursive: true });
    } else {
      throw error;
    }
  }
}
