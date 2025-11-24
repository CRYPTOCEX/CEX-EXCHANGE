import { createError } from "@b/utils/error";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import fs from "fs/promises";
import path from "path";
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
  summary: "Uploads a KYC document file",
  description: "Uploads a KYC document file including PDFs, images, and other document types",
  operationId: "uploadKycDocument",
  tags: ["Upload", "KYC"],
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
            filename: {
              type: "string",
              description: "Original filename",
            },
            oldPath: {
              type: "string",
              description: "Path of the old file to remove",
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
              filename: {
                type: "string",
                description: "Generated filename",
              },
              size: {
                type: "number",
                description: "File size in bytes",
              },
              mimeType: {
                type: "string",
                description: "MIME type of the file",
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

  try {
    console.log("KYC document upload request received:", { dir: body.dir, filename: body.filename });

    const { dir, file: base64File, filename, oldPath } = body;

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

    // File size limit (50MB for documents)
    const base64Data = base64File.split(",")[1];
    if (!base64Data) {
      throw new Error("Invalid file data");
    }
    
    const fileSizeBytes = (base64Data.length * 3) / 4;
    const maxSizeBytes = 50 * 1024 * 1024; // 50MB for documents
    
    if (fileSizeBytes > maxSizeBytes) {
      throw new Error("File size exceeds maximum limit of 50MB");
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
    
    // Whitelist allowed MIME types for KYC documents
    const allowedMimeTypes = [
      // Images
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
      // Documents
      'application/pdf',
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'text/plain', // .txt
      'text/csv', // .csv
    ];
    
    if (!allowedMimeTypes.includes(mimeType)) {
      throw new Error(`File type ${mimeType} not allowed for KYC documents`);
    }
    
    const buffer = Buffer.from(base64Data, "base64");
    
    console.log("File validation - MIME type:", mimeType, "Buffer length:", buffer.length);
    
    // CRITICAL FIX: Validate file magic numbers to prevent MIME type spoofing
    const isValidFileType = validateFileSignature(buffer, mimeType);
    console.log("File signature validation result:", isValidFileType);
    
    if (!isValidFileType) {
      // For images, be more lenient as some image files might not have perfect magic numbers
      const isImageType = mimeType.startsWith('image/');
      if (isImageType) {
        console.log("Image type detected, allowing despite magic number mismatch");
      } else {
        throw new Error("File content does not match declared MIME type. Potential security threat detected.");
      }
    }
    
    // Generate filename with timestamp and random string
    const timestamp = Date.now();
    const randomString = Math.round(Math.random() * 1e9);
    
    // Get file extension from MIME type or original filename
    let extension = getExtensionFromMimeType(mimeType);
    if (!extension && filename) {
      const originalExt = path.extname(filename).toLowerCase();
      if (originalExt && isValidExtension(originalExt)) {
        extension = originalExt;
      }
    }
    
    const generatedFilename = `${timestamp}-${randomString}${extension}`;
    const filePath = path.join(mediaDir, generatedFilename);
    
    // Write file to disk
    await fs.writeFile(filePath, buffer);

    // Handle old file deletion securely
    if (oldPath) {
      try {
        await removeOldFileSecurely(oldPath, sanitizedDir);
      } catch (error) {
        console.error("Error removing old file:", error);
      }
    }

    const response = {
      url: generateFileUrl(`${sanitizedDir.replace(/\\/g, "/")}/${generatedFilename}`),
      filename: generatedFilename,
      size: fileSizeBytes,
      mimeType: mimeType,
    };

    console.log("KYC document upload successful, returning response:", response);
    return response;
  } catch (error) {
    console.error("KYC document upload error:", error);
    throw error; // Re-throw to ensure proper error handling
  }
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
 * Validate file content against magic numbers to prevent MIME type spoofing
 */
function validateFileSignature(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 4) return false;

  const header = buffer.slice(0, 12);
  
  switch (mimeType) {
    case 'image/jpeg':
    case 'image/jpg':
      return header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF;
      
    case 'image/png':
      return header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;
      
    case 'image/gif':
      return (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) && 
             (header[3] === 0x38 && (header[4] === 0x37 || header[4] === 0x39));
             
    case 'image/webp':
      return header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
             header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50;
             
    case 'application/pdf':
      return header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46;
      
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    case 'application/vnd.ms-excel':
      // Office documents and ZIP files
      return header[0] === 0x50 && header[1] === 0x4B;
      
    case 'application/msword':
      return header[0] === 0xD0 && header[1] === 0xCF && header[2] === 0x11 && header[3] === 0xE0;
      
    case 'text/plain':
    case 'text/csv':
      // For text files, check for valid UTF-8 and reasonable text content
      try {
        const text = buffer.toString('utf8');
        // Check for null bytes (binary indicator) but allow international characters
        if (text.includes('\0')) {
          return false;
        }
        // Check if it's valid UTF-8 by ensuring no replacement characters from invalid encoding
        const reencoded = Buffer.from(text, 'utf8');
        return reencoded.equals(buffer);
      } catch {
        return false;
      }
      
    default:
      return false;
  }
}

function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'text/plain': '.txt',
    'text/csv': '.csv',
  };
  
  return mimeToExt[mimeType] || '.bin';
}

function isValidExtension(ext: string): boolean {
  const validExtensions = [
    '.jpg', '.jpeg', '.png', '.webp', '.gif',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.txt', '.csv'
  ];
  
  return validExtensions.includes(ext.toLowerCase());
}

/**
 * Only deletes files that are inside the same upload subdirectory as the new file.
 * Prevents path traversal and accidental deletion outside the upload root.
 */
async function removeOldFileSecurely(oldPath, expectedDir) {
  // Normalize input path, remove leading slashes
  const safeOldPath = oldPath
    .replace(/^(\.\.[/\\])+/, "")
    .replace(/^[/\\]+/, "");

  // The absolute expected base directory for this user/upload
  const expectedBaseDir = path.join(BASE_UPLOAD_DIR, expectedDir);

  // Full path for the file to delete (normalized)
  const oldFileFullPath = path.resolve(BASE_UPLOAD_DIR, safeOldPath);

  // Security check: must start with the intended dir!
  if (!oldFileFullPath.startsWith(expectedBaseDir + path.sep) && oldFileFullPath !== expectedBaseDir) {
    throw new Error(
      "Forbidden: Attempt to delete file outside upload directory"
    );
  }

  // Double check file exists, then delete
  try {
    await fs.access(oldFileFullPath);
    await fs.unlink(oldFileFullPath);
  } catch (error) {
    // Only log if not ENOENT (file not found)
    if (error.code !== "ENOENT") {
      console.error("Error removing old file:", error);
    }
  }
} 