import { promises as fs, watch } from "fs";
import { join } from "path";
import sharp from "sharp";
import { logger } from "@b/utils/console";

// Operator map for filter operations
export const operatorMap: Record<string, (item: any, key: string, value: any) => boolean> = {
  equal: (item, key, value) => item[key] === value,
  notEqual: (item, key, value) => item[key] !== value,
  greaterThan: (item, key, value) => item[key] > value,
  greaterThanOrEqual: (item, key, value) => item[key] >= value,
  lessThan: (item, key, value) => item[key] < value,
  lessThanOrEqual: (item, key, value) => item[key] <= value,
  between: (item, key, value) => item[key] >= value[0] && item[key] <= value[1],
  notBetween: (item, key, value) =>
    item[key] < value[0] || item[key] > value[1],
  like: (item, key, value) => new RegExp(value, "i").test(item[key]),
  notLike: (item, key, value) => !new RegExp(value, "i").test(item[key]),
  startsWith: (item, key, value) => item[key]?.startsWith(value),
  endsWith: (item, key, value) => item[key]?.endsWith(value),
  substring: (item, key, value) => item[key]?.includes(value),
  regexp: (item, key, value) => new RegExp(value).test(item[key]),
  notRegexp: (item, key, value) => !new RegExp(value).test(item[key]),
};

export let mediaCache: MediaFile[] = [];
export let cacheInitialized = false;

// Determine the correct path based on environment
// Development: backend runs from /project/backend/, needs ".." to reach /project/frontend/
// Production: backend runs from /public_html/, frontend is at /public_html/frontend/
const isProduction = process.env.NODE_ENV === 'production';

export const mediaDirectory = isProduction
  ? join(process.cwd(), "frontend", "public", "uploads")
  : join(process.cwd(), "..", "frontend", "public", "uploads");

export const publicDirectory = isProduction
  ? join(process.cwd(), "frontend", "public")
  : join(process.cwd(), "..", "frontend", "public");

interface MediaFile {
  id: string;
  name: string;
  path: string;
  width?: number;
  height?: number;
  dateModified?: Date;
}

export function filterMediaCache(imagePath) {
  mediaCache = mediaCache.filter((file) => file.id !== imagePath);
}

async function updateMediaCache(directory: string) {
  const fileList: MediaFile[] = [];
  async function readMediaFiles(dir: string) {
    const files = await fs.readdir(dir, { withFileTypes: true });
    for (const file of files) {
      const filePath = join(dir, file.name);
      if (file.isDirectory()) {
        await readMediaFiles(filePath);
      } else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)) {
        // Only read dimensions for image files
        try {
          const { mtime } = await fs.stat(filePath);
          let webPath = filePath
            .substring(mediaDirectory.length)
            .replace(/\\/g, "/");
          if (!webPath.startsWith("/")) webPath = "/" + webPath;

          const image = sharp(filePath);
          const metadata = await image.metadata();

          fileList.push({
            id: "/uploads" + webPath.replace(/\//g, "_"),
            name: file.name,
            path: "/uploads" + webPath,
            width: metadata.width,
            height: metadata.height,
            dateModified: mtime,
          });
        } catch (error) {
          logger.error("MEDIA", `Error accessing file: ${filePath}`, error);
        }
      }
    }
  }
  await readMediaFiles(directory);
  mediaCache = fileList;
  cacheInitialized = true;
}

// Initialize cache and set up watcher
export async function initMediaWatcher() {
  await updateMediaCache(mediaDirectory);
  watch(mediaDirectory, { recursive: true }, async (eventType, filename) => {
    await updateMediaCache(mediaDirectory);
  });
}
