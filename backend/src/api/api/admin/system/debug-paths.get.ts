import fs from "fs";
import path from "path";
import { resolveUploadPath } from "@b/utils/path";

export const metadata = {
  summary: "Debug path resolution for production troubleshooting",
  operationId: "debugPaths",
  tags: ["Admin", "Debug"],
  responses: {
    200: {
      description: "Path information retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              environment: { type: "string" },
              currentWorkingDirectory: { type: "string" },
              pathInfo: { type: "object" },
            },
          },
        },
      },
    },
  },
  permission: "access.system",
  requiresAuth: true,
};

export default async (data: any) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const cwd = process.cwd();
  
  // Test various path patterns
  const testPaths = {
    logo: {
      pattern1: path.join(cwd, "frontend", "public", "img", "logo"),
      pattern2: path.join(cwd, "public", "img", "logo"),
      pattern3: path.join(cwd, "..", "frontend", "public", "img", "logo"),
      pattern4: path.join(cwd, "..", "public", "img", "logo"),
      resolved: resolveUploadPath("img/logo"),
    },
    uploads: {
      pattern1: path.join(cwd, "frontend", "public", "uploads"),
      pattern2: path.join(cwd, "public", "uploads"),
      pattern3: path.join(cwd, "..", "frontend", "public", "uploads"),
      pattern4: path.join(cwd, "..", "public", "uploads"),
      resolved: resolveUploadPath("uploads"),
    },
  };
  
  // Check which paths exist
  const pathStatus = {};
  
  for (const [category, paths] of Object.entries(testPaths)) {
    pathStatus[category] = {};
    
    for (const [pattern, fullPath] of Object.entries(paths)) {
      const exists = fs.existsSync(fullPath);
      const parentExists = fs.existsSync(path.dirname(fullPath));
      
      pathStatus[category][pattern] = {
        path: fullPath,
        exists,
        parentExists,
        canCreate: parentExists && !exists,
      };
    }
  }
  
  // Additional system info
  const systemInfo = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    environment: isProduction ? 'production' : 'development',
    currentWorkingDirectory: cwd,
    __dirname: __dirname,
    processArgv: process.argv,
  };
  
  // Check if common directories exist
  const commonDirs = [
    path.join(cwd, "frontend"),
    path.join(cwd, "public"),
    path.join(cwd, "..", "frontend"),
    path.join(cwd, "..", "public"),
    path.join(cwd, "backend"),
    path.join(cwd, "src"),
  ];
  
  const directoryStatus = {};
  for (const dir of commonDirs) {
    directoryStatus[dir] = fs.existsSync(dir);
  }
  
  return {
    systemInfo,
    pathStatus,
    directoryStatus,
    message: "Path debugging information retrieved successfully",
  };
}; 