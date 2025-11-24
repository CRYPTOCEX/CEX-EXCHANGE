import Ajv from "ajv";
import addFormats from "ajv-formats";

class AjvSingleton {
  private static instance: Ajv;

  private constructor() {} // Prevent external instantiation

  static getInstance(): Ajv {
    if (!AjvSingleton.instance) {
      const ajv = new Ajv({
        allErrors: true,
        useDefaults: true,
        strict: "log", // Log strict mode errors as warnings instead of throwing them
        allowUnionTypes: true, // Allow union types in schema
        keywords: ["placeholder", "example", "expectedFormat"], // Declare custom keywords as annotations
      });
      addFormats(ajv);

      // UUID format
      ajv.addFormat("uuid", {
        type: "string",
        validate: (uuid: string): boolean =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            uuid
          ),
      });

      // URI format validation
      ajv.addFormat("uri", {
        type: "string",
        validate: (uri) => {
          // Check if the URI starts with /uploads/ or is a valid absolute URI
          return /^\/uploads\/.*/.test(uri) || isFullURI(uri);
        },
      });

      // Date format
      ajv.addFormat("date", {
        type: "string",
        validate: (date: string): boolean => !isNaN(Date.parse(date)),
      });

      AjvSingleton.instance = ajv;
    }
    return AjvSingleton.instance;
  }
}

function isFullURI(uri) {
  try {
    new URL(uri);
    return true;
  } catch (e) {
    return false;
  }
}

export default AjvSingleton;
