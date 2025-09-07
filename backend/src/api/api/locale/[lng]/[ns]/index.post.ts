import { taskQueue } from "@b/utils/task";
import { promises as fs } from "fs";
import { join, dirname } from "path";

export const metadata: OperationObject = {
  summary: "Adds missing translations for the specified language and namespace",
  operationId: "addTranslations",
  tags: ["Translations"],
  parameters: [
    {
      index: 0,
      name: "lng",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "Language code",
    },
    {
      index: 1,
      name: "ns",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "Namespace",
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          additionalProperties: true,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Translations added successfully",
    },
    500: {
      description: "Internal server error",
    },
  },
};

export default async (data: Handler) => {
  const { lng, ns } = data.params;
  const translations = data.body;

  return addMissingTranslations(lng, ns, translations);
};

async function ensureDirectoryExistence(filePath: string) {
  const dir = dirname(filePath);
  try {
    await fs.access(dir);
  } catch (error) {
    await fs.mkdir(dir, { recursive: true });
  }
}

function parseJSONSafe(jsonString: string) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return {};
  }
}

function sortObjectByKey(obj: Record<string, any>): Record<string, any> {
  return Object.keys(obj)
    .sort()
    .reduce((result: Record<string, any>, key: string) => {
      result[key] = obj[key];
      return result;
    }, {});
}

export async function addMissingTranslations(
  lng: string,
  ns: string,
  translations: Record<string, any>
) {
  const filePath = join(process.cwd(), "public", "locales", lng, `${ns}.json`);
  await ensureDirectoryExistence(filePath);

  return new Promise<void>((resolve, reject) => {
    taskQueue.add(async () => {
      try {
        const fileData = await fs.readFile(filePath, "utf8").catch(() => "{}");
        const existingTranslations = parseJSONSafe(fileData);

        // Merge existing translations with new translations, ensuring no duplicates
        const updatedTranslations = {
          ...existingTranslations,
          ...translations,
        };

        // Sort the merged translations alphabetically by key
        const sortedTranslations = sortObjectByKey(updatedTranslations);

        // Ensure the JSON is pretty printed
        const prettyJson = JSON.stringify(sortedTranslations, null, 2);

        // Save the updated translations back to the file
        await fs.writeFile(filePath, prettyJson, "utf8");

        resolve();
      } catch (error) {
        console.error("Error writing translation file:", error);
        reject(new Error("Error writing translation file"));
      }
    });
  });
}
