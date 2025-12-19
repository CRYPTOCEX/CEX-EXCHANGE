import fs from "fs";
import path from "path";
import { logger } from "@b/utils/console";

/**
 * Resolves the correct path for file uploads in different environments
 * @param relativePath - The relative path from the public directory (e.g., "img/logo", "uploads")
 * @param fallbackPaths - Additional fallback paths to try
 * @returns The resolved absolute path
 */
export function resolveUploadPath(relativePath: string, fallbackPaths: string[] = []): string {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Standard path patterns
  const standardPaths = [
    // Production patterns
    path.join(process.cwd(), "frontend", "public", relativePath),
    path.join(process.cwd(), "public", relativePath),
    // Development patterns
    path.join(process.cwd(), "..", "frontend", "public", relativePath),
    path.join(process.cwd(), "..", "public", relativePath),
  ];
  
  // Combine standard paths with custom fallbacks
  const allPaths = [...standardPaths, ...fallbackPaths];
  
  // Find the first path where the parent directory exists
  for (const testPath of allPaths) {
    const parentDir = path.dirname(testPath);
    if (fs.existsSync(parentDir)) {
      logger.debug("PATH", `Selected: ${testPath}`);
      return testPath;
    }
  }

  // If no parent directory exists, return the first standard path
  const defaultPath = standardPaths[0];
  logger.debug("PATH", `No existing parent found, using default: ${defaultPath}`);
  return defaultPath;
}

/**
 * Ensures a directory exists, creating it if necessary
 * @param dirPath - The directory path to ensure exists
 * @param recursive - Whether to create parent directories
 */
export async function ensureDirectoryExists(dirPath: string, recursive: boolean = true): Promise<void> {
  try {
    await fs.promises.access(dirPath);
    logger.debug("PATH", `Directory exists: ${dirPath}`);
  } catch (error) {
    if (error.code === "ENOENT") {
      try {
        logger.debug("PATH", `Creating directory: ${dirPath}`);
        await fs.promises.mkdir(dirPath, { recursive });
        logger.debug("PATH", `Directory created: ${dirPath}`);
      } catch (mkdirError) {
        logger.error("PATH", `Failed to create directory: ${dirPath}`, mkdirError);
        throw new Error(`Failed to create directory: ${mkdirError.message}`);
      }
    } else {
      logger.error("PATH", `Directory access error: ${dirPath}`, error);
      throw error;
    }
  }
}

/**
 * Tries multiple paths and returns the first one that can be created/accessed
 * @param paths - Array of paths to try
 * @returns The first successful path
 */
export async function tryMultiplePaths(paths: string[]): Promise<string> {
  for (const testPath of paths) {
    try {
      await ensureDirectoryExists(testPath);
      return testPath;
    } catch (error) {
      logger.debug("PATH", `Failed to use path ${testPath}: ${error.message}`);
      continue;
    }
  }

  throw new Error(`Failed to create directory in any of the attempted paths: ${paths.join(", ")}`);
} 