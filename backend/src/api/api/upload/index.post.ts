import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { sanitizeUserPath } from "@b/utils/validation";

/**
 * Generate a file URL for the uploaded file
 * Uses static URL since server.ts handles /uploads/ serving
 */
function generateFileUrl(filePath: string): string {
  return `/uploads/${filePath}`;
}

// Determine the correct path based on environment
// Development: backend runs from /project/backend/, needs ".." to reach /project/frontend/
// Production: backend runs from /public_html/, frontend is at /public_html/frontend/
const isProduction = process.env.NODE_ENV === 'production';
const BASE_UPLOAD_DIR = isProduction 
  ? path.join(process.cwd(), "frontend", "public", "uploads")
  : path.join(process.cwd(), "..", "frontend", "public", "uploads");

export const metadata: OperationObject = {
  summary: "Uploads a file to a specified directory",
  description: "Uploads a file to a specified directory",
  operationId: "uploadFile",
  tags: ["Upload"],
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
              description: "Directory to upload file to",
            },
            file: {
              type: "string",
              description: "Base64 encoded file data",
            },
            height: {
              type: "number",
              description: "Height of the image",
            },
            width: {
              type: "number",
              description: "Width of the image",
            },
            oldPath: {
              type: "string",
              description: "Path of the old image to remove",
            },
          },
          required: ["dir", "file"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "File uploaded successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              url: {
                type: "string",
                description: "URL of the uploaded file",
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Upload"),
    500: serverErrorResponse,
  },
};

export default async (data) => {
  const { body, user } = data;
  if (!user) throw new Error("User not found");

  const { dir, file: base64File, width, height, oldPath } = body;

  if (!dir || !base64File) {
    throw new Error("No directory specified or no file provided");
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

  // Sanitize and resolve the upload directory
  const sanitizedDir = sanitizeUserPath(dir.replace(/-/g, "/"));
  const mediaDir = path.join(BASE_UPLOAD_DIR, sanitizedDir);
  
  // Additional security check: ensure resolved path is within uploads
  const resolvedMediaDir = path.resolve(mediaDir);
  const resolvedBaseDir = path.resolve(BASE_UPLOAD_DIR);
  
  if (!resolvedMediaDir.startsWith(resolvedBaseDir + path.sep) && resolvedMediaDir !== resolvedBaseDir) {
    throw new Error("Invalid upload directory");
  }
  
  await ensureDirExists(mediaDir);

  const mimeType = base64File.match(/^data:(.*);base64,/)?.[1] || "";
  
  // Whitelist allowed MIME types
  const allowedMimeTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime'
  ];
  
  if (!allowedMimeTypes.includes(mimeType)) {
    throw new Error("File type not allowed");
  }
  
  const buffer = Buffer.from(base64Data, "base64");
  let filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  let processedImage: Buffer = buffer;

  if (mimeType.startsWith("image/") && !mimeType.includes("image/gif")) {
    processedImage = await sharp(buffer)
      .resize({ width, height, fit: "inside" })
      .webp({ quality: 80 })
      .toBuffer();
    filename += ".webp";
  } else if (mimeType.startsWith("video/")) {
    filename += "." + (mimeType.split("/")[1] || "mp4");
  } else if (mimeType.includes("image/gif")) {
    filename += ".gif";
  } else {
    throw new Error("Unsupported file format.");
  }

  const filePath = path.join(mediaDir, filename);
  await fs.writeFile(filePath, processedImage);

  // Handle old file deletion securely
  if (oldPath) {
    try {
      await removeOldImageSecurely(oldPath, sanitizedDir);
    } catch (error) {
      console.error("Error removing old image:", error);
    }
  }

  return {
    url: generateFileUrl(`${sanitizedDir.replace(/\\/g, "/")}/${filename}`),
  };
};

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

/**
 * Only deletes files that are inside the same upload subdirectory as the new file.
 * Prevents path traversal and accidental deletion outside the upload root.
 */
async function removeOldImageSecurely(oldPath, expectedDir) {
  // Normalize input path, remove leading slashes
  const safeOldPath = oldPath
    .replace(/^(\.\.[/\\])+/, "")
    .replace(/^[/\\]+/, "");

  // The absolute expected base directory for this user/upload
  const expectedBaseDir = path.join(BASE_UPLOAD_DIR, expectedDir);

  // Full path for the file to delete (normalized)
  const oldImageFullPath = path.resolve(BASE_UPLOAD_DIR, safeOldPath);

  // Security check: must start with the intended dir!
  if (!oldImageFullPath.startsWith(expectedBaseDir + path.sep)) {
    throw new Error(
      "Forbidden: Attempt to delete file outside upload directory"
    );
  }

  // Double check file exists, then delete
  try {
    await fs.access(oldImageFullPath);
    await fs.unlink(oldImageFullPath);
  } catch (error) {
    // Only log if not ENOENT (file not found)
    if (error.code !== "ENOENT") {
      console.error("Error removing old image:", error);
    }
  }
}
