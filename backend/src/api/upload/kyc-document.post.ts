import { createError } from "@b/utils/error";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import fs from "fs/promises";
import path from "path";
import { sanitizeUserPath } from "@b/utils/validation";
import { logger } from "@b/utils/console";

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
  logModule: "KYC",
  logTitle: "Upload KYC document",
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
  const { body, user, ctx } = data;
  if (!user) throw new Error("User not found");

  try {
    ctx?.step("Validating upload request");
    logger.debug("KYC", `Document upload request received: dir=${body.dir}, filename=${body.filename}`);

    const { dir, file: base64File, filename, oldPath } = body;

    if (!dir || !base64File) {
      ctx?.fail("Missing directory or file data");
      throw new Error("No directory specified or no file provided");
    }

    ctx?.step("Validating directory path security");
    if (typeof dir !== 'string' || dir.length > 100) {
      ctx?.fail("Invalid directory path format");
      throw new Error("Invalid directory path");
    }

    if (dir.includes('\0') || dir.includes('%00') || dir.includes('..')) {
      ctx?.fail("Directory path contains suspicious patterns");
      throw new Error("Invalid directory path");
    }

    ctx?.step("Validating file format and encoding");
    if (typeof base64File !== 'string' || !base64File.startsWith('data:')) {
      ctx?.fail("Invalid base64 file format");
      throw new Error("Invalid file format");
    }

    const base64Data = base64File.split(",")[1];
    if (!base64Data) {
      ctx?.fail("Missing base64 file data");
      throw new Error("Invalid file data");
    }

    ctx?.step("Checking file size limits");
    const fileSizeBytes = (base64Data.length * 3) / 4;
    const maxSizeBytes = 50 * 1024 * 1024; // 50MB for documents

    if (fileSizeBytes > maxSizeBytes) {
      ctx?.fail(`File size ${Math.round(fileSizeBytes / 1024 / 1024)}MB exceeds 50MB limit`);
      throw new Error("File size exceeds maximum limit of 50MB");
    }

    ctx?.step("Sanitizing upload directory path");
    const sanitizedDir = sanitizeUserPath(dir.replace(/-/g, "/"));
    const mediaDir = path.join(BASE_UPLOAD_DIR, sanitizedDir);

    const resolvedMediaDir = path.resolve(mediaDir);
    const resolvedBaseDir = path.resolve(BASE_UPLOAD_DIR);

    if (!resolvedMediaDir.startsWith(resolvedBaseDir + path.sep) && resolvedMediaDir !== resolvedBaseDir) {
      ctx?.fail("Upload directory outside allowed path");
      throw new Error("Invalid upload directory");
    }

    ctx?.step("Creating upload directory if needed");
    await ensureDirExists(mediaDir);

    ctx?.step("Validating MIME type");
    const mimeType = base64File.match(/^data:(.*);base64,/)?.[1] || "";

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
      ctx?.fail(`MIME type ${mimeType} not allowed`);
      throw new Error(`File type ${mimeType} not allowed for KYC documents`);
    }

    ctx?.step("Decoding file data");
    const buffer = Buffer.from(base64Data, "base64");
    logger.debug("KYC", `File validation - MIME type: ${mimeType}, Buffer length: ${buffer.length}`);

    ctx?.step("Validating file signature against MIME type");
    const isValidFileType = validateFileSignature(buffer, mimeType);
    logger.debug("KYC", `File signature validation result: ${isValidFileType}`);

    if (!isValidFileType) {
      const isImageType = mimeType.startsWith('image/');
      if (isImageType) {
        logger.debug("KYC", "Image type detected, allowing despite magic number mismatch");
      } else {
        ctx?.fail("File signature does not match MIME type");
        throw new Error("File content does not match declared MIME type. Potential security threat detected.");
      }
    }

    ctx?.step("Generating secure filename");
    const timestamp = Date.now();
    const randomString = Math.round(Math.random() * 1e9);

    let extension = getExtensionFromMimeType(mimeType);
    if (!extension && filename) {
      const originalExt = path.extname(filename).toLowerCase();
      if (originalExt && isValidExtension(originalExt)) {
        extension = originalExt;
      }
    }

    const generatedFilename = `${timestamp}-${randomString}${extension}`;
    const filePath = path.join(mediaDir, generatedFilename);

    ctx?.step("Writing file to disk");
    await fs.writeFile(filePath, buffer);

    if (oldPath) {
      ctx?.step("Removing old file");
      try {
        await removeOldFileSecurely(oldPath, sanitizedDir);
      } catch (error) {
        logger.error("KYC", "Error removing old file", error);
      }
    }

    const response = {
      url: generateFileUrl(`${sanitizedDir.replace(/\\/g, "/")}/${generatedFilename}`),
      filename: generatedFilename,
      size: fileSizeBytes,
      mimeType: mimeType,
    };

    ctx?.success(`Document uploaded successfully: ${generatedFilename}`);
    logger.debug("KYC", `Document upload successful: ${response.filename}`);
    return response;
  } catch (error) {
    ctx?.fail(`Document upload failed: ${error.message}`);
    logger.error("KYC", "Document upload error", error);
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
      logger.error("KYC", "Error removing old file", error);
    }
  }
} 