import fs from "fs";
import path from "path";

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
      console.log(`[PATH-DEBUG] Selected path: ${testPath} (parent exists: ${parentDir})`);
      return testPath;
    }
  }
  
  // If no parent directory exists, return the first standard path
  const defaultPath = standardPaths[0];
  console.log(`[PATH-DEBUG] No existing parent found, using default: ${defaultPath}`);
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
    console.log(`[PATH-DEBUG] Directory exists: ${dirPath}`);
  } catch (error) {
    if (error.code === "ENOENT") {
      try {
        console.log(`[PATH-DEBUG] Creating directory: ${dirPath}`);
        await fs.promises.mkdir(dirPath, { recursive });
        console.log(`[PATH-DEBUG] Directory created successfully: ${dirPath}`);
      } catch (mkdirError) {
        console.error(`[PATH-DEBUG] Failed to create directory: ${dirPath}`, mkdirError);
        throw new Error(`Failed to create directory: ${mkdirError.message}`);
      }
    } else {
      console.error(`[PATH-DEBUG] Directory access error: ${dirPath}`, error);
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
      console.error(`[PATH-DEBUG] Failed to use path ${testPath}:`, error.message);
      continue;
    }
  }
  
  throw new Error(`Failed to create directory in any of the attempted paths: ${paths.join(", ")}`);
} 