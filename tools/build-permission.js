const fs = require("fs");
const path = require("path");

const APP_DIR = path.resolve(process.cwd(), "frontend/app");
const OUTPUT_FILE = path.resolve(
  process.cwd(),
  "frontend/middlewares/permissions.json"
);

// Regex: export const permission = "...";
const permissionExportRegex =
  /export\s+const\s+permission\s*=\s*(['"`])(.+?)\1\s*;/m;

// Helper: Remove [locale] and any /(grouping)/ segment (like (blog), (dashboard))
function cleanPathSegments(segments) {
  return segments.filter(
    (seg) =>
      seg && seg !== "[locale]" && !seg.startsWith("(") && !seg.endsWith(")")
  );
}

function walk(dir, callback) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, callback);
    } else if (entry.isFile()) {
      callback(fullPath);
    }
  });
}

const permissions = [];

walk(APP_DIR, (filePath) => {
  if (filePath.endsWith("permission.ts")) {
    const content = fs.readFileSync(filePath, "utf8");
    const match = permissionExportRegex.exec(content);
    if (match) {
      // Calculate the relative path from APP_DIR
      let relative = path.relative(APP_DIR, path.dirname(filePath));
      let segments = relative.split(path.sep);

      // Clean segments: remove [locale], (group), empty
      let cleaned = cleanPathSegments(segments);

      // Join as route
      let route = "/" + cleaned.join("/");

      permissions.push({
        path: route,
        permission: match[2].trim(),
      });
    }
  }
});

// Sort by path (optional, for human-readability)
permissions.sort((a, b) => a.path.localeCompare(b.path));

// Ensure output directory exists
const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write the JSON file
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(permissions, null, 2), "utf8");

console.log(`Generated permissions.json with ${permissions.length} entries.`);
