// lib/api.ts
import { toast } from "sonner";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface FetchOptions<T> {
  url: string;
  method?: HttpMethod;
  body?: Record<string, any> | FormData | null;
  headers?: HeadersInit;
  params?: Record<string, string | number | boolean>;
  successMessage?: string | ((data: T) => string);
  errorMessage?: string;
  silent?: boolean;
  silentSuccess?: boolean;
}

interface FetchResponse<T> {
  data: T | null;
  error: string | null;
  validationErrors?: Record<string, any>;
}

interface ApiError {
  message: string;
}

// Helper function to get the correct API base URL
function getApiBaseUrl(): string {
  const isDev = process.env.NODE_ENV === "development";
  const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || 4000;

  if (typeof window !== "undefined") {
    // Client-side
    if (isDev) {
      return `http://localhost:${backendPort}`;
    }
    // In production, use the same domain without backend port (reverse proxy handles it)
    return process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
  }

  // Server-side
  if (isDev) {
    return `http://localhost:${backendPort}`;
  }
  // In production SSR, use the same domain without backend port (reverse proxy handles it)
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost";
}

export function fileToBase64(file: Blob): Promise<string | ArrayBuffer | null> {
  return new Promise((resolve, reject) => {
    if (!(file instanceof Blob)) {
      reject(new Error("The provided value is not a Blob or File."));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result);
    };
    reader.onerror = (error) => {
      reject(new Error(`FileReader error: ${error}`));
    };
    reader.readAsDataURL(file);
  });
}

export async function $fetch<T = any>({
  url,
  method = "GET",
  body = null,
  headers = {},
  params = {},
  successMessage = "Success",
  errorMessage = "Something went wrong",
  silent = false,
  silentSuccess = false,
}: FetchOptions<T>): Promise<FetchResponse<T>> {
  const toastId = !silent ? toast.loading("Loading...") : null;

  // Check if body is FormData
  const isFormData = body instanceof FormData;
  
  // Don't set Content-Type for FormData, let browser set it with boundary
  const defaultHeaders: HeadersInit = isFormData ? {
    ...headers,
  } : {
    "Content-Type": "application/json",
    ...headers,
  };

  let urlWithQuery = url;

  try {
    // Construct full URL with proper base URL
    const baseUrl = getApiBaseUrl();
    const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url}`;

    // Handle query parameters
    if (Object.keys(params).length > 0) {
      const urlObj = new URL(fullUrl);
      Object.entries(params).forEach(([key, value]) => {
        urlObj.searchParams.set(key, String(value));
      });
      urlWithQuery = urlObj.toString();
    } else {
      urlWithQuery = fullUrl;
    }

    const fetchOptions: RequestInit = {
      method,
      headers: defaultHeaders,
      credentials: "include",
      body: isFormData ? body : (body ? JSON.stringify(body) : null),
    };

    const response = await fetch(urlWithQuery, fetchOptions);
    if (!silent && toastId !== null) toast.dismiss(toastId);

    // Handle response parsing more safely
    let data: T | ApiError | null = null;
    try {
      const responseText = await response.text();
      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          // For non-JSON responses (like 404 "Not Found"), handle gracefully
          const isNotFoundError = responseText.includes("Not Found") || response.status === 404;
          if (isNotFoundError) {
            if (!silent && toastId !== null) toast.dismiss(toastId);
            return {
              data: null,
              error: "Resource not found",
            };
          }
          
          console.warn("Failed to parse response as JSON:", parseError);
          if (!silent && toastId !== null) toast.dismiss(toastId);
          if (!silent) toast.error(errorMessage);
          return {
            data: null,
            error: "Invalid response format",
          };
        }
      } else {
        // Handle empty response
        if (!response.ok) {
          if (!silent && toastId !== null) toast.dismiss(toastId);
          if (!silent) toast.error(errorMessage);
          return {
            data: null,
            error: `Request failed with status ${response.status}`,
          };
        }
        // Empty response but status is OK
        return { data: null, error: null };
      }
    } catch (parseError) {
      console.warn("Failed to read response:", parseError);
      if (!silent && toastId !== null) toast.dismiss(toastId);
      if (!silent) toast.error(errorMessage);
      return {
        data: null,
        error: "Failed to read response",
      };
    }

    if (response.ok) {
      // Check if the response data indicates an error even though status is 2xx
      if (data && typeof data === "object") {
        const d = data as any;
        
        // Debug logging for statusCode detection
        if (process.env.NODE_ENV === "development" && d.statusCode) {
          console.log("Response contains statusCode:", d.statusCode, "Type:", typeof d.statusCode, "Number:", Number(d.statusCode));
        }
        
        // Check for status code in response body (new error format)
        if (d.statusCode && Number(d.statusCode) >= 400) {
          console.log("Detected error statusCode in response body, calling handleBodyIndicatedError");
          return handleBodyIndicatedError(d, silent, errorMessage);
        }
        // Legacy error format check
        if (d.success === false || d.error || d.errors) {
          console.log("Detected legacy error format, calling handleBodyIndicatedError");
          return handleBodyIndicatedError(d, silent, errorMessage);
        }
      }

      // Otherwise treat as success
      handleSuccess(data as T, successMessage, silent, silentSuccess);
      return { data: data as T, error: null };
    } else {
      // Non-2xx status, standard error handling
      return await handleError<T>(response, data, silent, errorMessage);
    }
  } catch (error: any) {
    return handleNetworkError(error, silent, toastId);
  }
}

function handleSuccess<T>(
  data: T,
  successMessage: string | ((data: T) => string),
  silent: boolean,
  silentSuccess: boolean
) {
  if (silent || silentSuccess) return;
  let messageToShow = "Success";
  if (typeof successMessage === "function") {
    messageToShow = successMessage(data);
  } else {
    messageToShow = successMessage;
  }

  if (
    messageToShow === "Success" &&
    data &&
    typeof data === "object" &&
    (data as any).message
  ) {
    messageToShow = (data as any).message;
  }

  toast.success(messageToShow);
}

function handleBodyIndicatedError<T>(
  data: any,
  silent: boolean,
  errorMessage: string
): FetchResponse<T> {
  // Get message from data, prioritizing the message field
  const message = data.message || errorMessage;
  
  // Debug logging to help diagnose toast issues
  if (process.env.NODE_ENV === "development") {
    console.log("handleBodyIndicatedError called:", { data, silent, message });
  }
  
  // Check if the response already contains validationErrors
  if (data.validationErrors) {
    if (!silent) {
      console.log("Showing validation error toast");
      toast.error("Validation failed. Please check the required fields.");
    }
    return {
      data: null,
      error: message,
      validationErrors: data.validationErrors,
    };
  }
  
  const parsedValidation = attemptParseValidationErrors(message);
  if (parsedValidation) {
    if (!silent) {
      console.log("Showing validation error toast");
      toast.error("Validation error");
    }
    return {
      data: null,
      error: "Validation error",
      validationErrors: parsedValidation,
    };
  }

  if (!silent) {
    console.log("Showing error toast:", message);
    toast.error(message);
  }
  return { data: null, error: message };
}

async function handleError<T>(
  response: Response,
  data: any,
  silent: boolean,
  errorMessage: string
): Promise<FetchResponse<T>> {
  // First check if data contains a status code (new error format)
  if (data && typeof data === "object" && data.statusCode && Number(data.statusCode) >= 400) {
    const message = data.message || errorMessage;
    
    // Check if the response already contains validationErrors
    if (data.validationErrors) {
      if (!silent) toast.error("Validation failed. Please check the required fields.");
      return {
        data: null,
        error: message,
        validationErrors: data.validationErrors,
      };
    }
    
    const parsedValidation = attemptParseValidationErrors(message);
    if (parsedValidation) {
      if (!silent) toast.error("Validation error");
      return {
        data: null,
        error: "Validation error",
        validationErrors: parsedValidation,
      };
    }
    if (!silent) toast.error(message);
    return { data: null, error: message };
  }
  
  // Fallback to legacy error handling
  const message = (data && data.message) || response.statusText || errorMessage;
  const parsedValidation = attemptParseValidationErrors(message);
  if (parsedValidation) {
    if (!silent) toast.error("Validation error");
    return {
      data: null,
      error: "Validation error",
      validationErrors: parsedValidation,
    };
  }

  if (!silent) toast.error(message);
  return { data: null, error: message };
}

function attemptParseValidationErrors(
  message: string
): Record<string, any> | null {
  if (!message) return null;

  // Invalid request body scenario
  if (message.startsWith("Invalid request body:")) {
    const cleanMessage = message.replace("Invalid request body:", "").trim();
    try {
      const errorObjectRaw = JSON.parse(cleanMessage);
      return parseDotNotatedJsonToNestedObject(errorObjectRaw);
    } catch {
      return null;
    }
  }

  // Generic validation error lines
  if (message.includes("Validation error:")) {
    return parseValidationError(message);
  }

  return null;
}

function parseDotNotatedJsonToNestedObject(
  errorObjectRaw: Record<string, any>
) {
  const nestedErrors: Record<string, any> = {};

  Object.entries(errorObjectRaw).forEach(([key, value]) => {
    const path = key.split(".");
    path.reduce((acc, part, index) => {
      if (index === path.length - 1) {
        acc[part] = Array.isArray(value) ? value[0] : value;
      } else {
        acc[part] = acc[part] || {};
      }
      return acc[part];
    }, nestedErrors);
  });

  return nestedErrors;
}

function parseValidationError(errorMessage: string) {
  const errorLines = errorMessage.split("\n");
  const errors: Record<string, string> = {};

  errorLines.forEach((line) => {
    const cleanLine = line.replace("Validation error: ", "");
    const firstColonIndex = cleanLine.indexOf(":");
    if (firstColonIndex !== -1) {
      const key = cleanLine.substring(0, firstColonIndex).trim();
      const msg = cleanLine.substring(firstColonIndex + 1).trim();
      errors[key] = msg;
    }
  });

  return errors;
}

function handleNetworkError(
  error: any,
  silent: boolean,
  toastId: string | number | null
): FetchResponse<any> {
  console.error("Fetch error:", error);
  if (!silent) {
    if (toastId !== null) {
      toast.dismiss(toastId);
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    toast.error(`Network error: ${message}. Please try again later.`);
  }
  return {
    data: null,
    error: error instanceof Error ? error.message : "Unknown error",
  };
}

export async function $serverFetch<T = any>(
  context,
  { url, method = "GET", body = null, headers = {} }: FetchOptions<T>
): Promise<FetchResponse<T>> {
  // Use the same API base URL logic for server-side calls
  const baseUrl = getApiBaseUrl();
  const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url}`;

  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...headers,
  };

  const fetchOptions: RequestInit = {
    method,
    headers: defaultHeaders,
    body: body ? JSON.stringify(body) : null,
  };

  try {
    const response = await fetch(fullUrl, fetchOptions);

    // Handle response parsing more safely
    let data: T | null = null;
    try {
      const responseText = await response.text();
      if (responseText) {
        data = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.warn("Failed to parse server response as JSON:", parseError);
      return { data: null, error: "Invalid server response format" };
    }

    if (!response.ok) {
      const errorMessage =
        (data as any)?.message || response.statusText || "Server Error";
      return { data: null, error: errorMessage };
    }

    // Check for status code in response body (new error format)
    if (data && typeof data === "object") {
      const d = data as any;
      if (d.statusCode && Number(d.statusCode) >= 400) {
        const errorMessage = d.message || "Server Error";
        return { data: null, error: errorMessage };
      }
    }

    return { data, error: null };
  } catch (error) {
    console.error("Server-side Fetch error:", error);
    return { data: null, error: "Server Error" };
  }
}

export default $fetch;
