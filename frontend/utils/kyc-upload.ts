import { $fetch } from "@/lib/api";

// Helper function to convert a file to Base64 format
const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject("Error reading file");
    reader.readAsDataURL(file);
  });
};

export const kycDocumentUploader = async ({
  file,
  dir,
  oldPath = "",
}: {
  file: File;
  dir: string;
  oldPath?: string;
}) => {
  try {
    // Step 1: Validate file type
    const allowedTypes = [
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

    if (!allowedTypes.includes(file.type)) {
              return { 
          success: false, 
          error: `File type ${file.type} is not allowed. Please upload images, PDFs, or document files. Archive files are not supported for security reasons.` 
        };
    }

    // Step 2: Validate file size (50MB limit)
    const maxSizeBytes = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSizeBytes) {
      return { 
        success: false, 
        error: "File size exceeds maximum limit of 50MB" 
      };
    }

    // Step 3: Convert the file to Base64 format
    const base64File = await fileToBase64(file);

    // Step 4: Prepare the payload for uploading
    const filePayload = {
      file: base64File,
      dir,
      filename: file.name,
      oldPath,
    };

    console.log("Starting KYC document upload:", { 
      filename: file.name, 
      size: file.size, 
      type: file.type, 
      dir 
    });

    // Step 5: Upload the file using the KYC document upload endpoint
    const result = await $fetch({
      url: "/api/upload/kyc-document",
      method: "POST",
      body: filePayload,
      silentSuccess: true,
    });

    console.log("KYC upload API result:", result);

    // Extract data and error from result
    const { data, error } = result;

    if (error) {
      console.error("KYC upload error:", error);
      throw new Error(error);
    }

    // Debug: Log the response to understand the format
    console.log("KYC upload response data:", data);

    // Handle different response formats more gracefully
    let responseData = data;
    
    // If data is null or undefined, but we don't have an error, something went wrong
    if (!responseData) {
      throw new Error("Upload completed but no response data received");
    }
    
    // If data is a string, try to parse it as JSON
    if (typeof responseData === 'string') {
      try {
        responseData = JSON.parse(responseData);
      } catch (e) {
        throw new Error("Invalid response format: Response is not valid JSON");
      }
    }
    
    // Validate the response format
    if (typeof responseData !== 'object') {
      throw new Error(`Invalid response format: Expected object, got ${typeof responseData}`);
    }

    if (!responseData.url) {
      throw new Error(`Invalid response format: Missing required 'url' field in response. Received: ${JSON.stringify(responseData)}`);
    }

    console.log("KYC upload successful:", responseData);

    return {
      success: true,
      url: responseData.url,
      filename: responseData.filename || file.name,
      size: responseData.size || file.size,
      mimeType: responseData.mimeType || file.type,
    };
  } catch (error) {
    console.error("Error uploading KYC document:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "File upload failed" 
    };
  }
};

// Helper function to get file type category
export const getFileTypeCategory = (mimeType: string): 'image' | 'document' => {
  if (mimeType.startsWith('image/')) {
    return 'image';
  } else {
    return 'document';
  }
};

// Helper function to get file icon based on type
export const getFileIcon = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) {
    return '🖼️';
  } else if (mimeType.includes('pdf')) {
    return '📄';
  } else if (mimeType.includes('word')) {
    return '📝';
  } else if (mimeType.includes('excel')) {
    return '📊';
  } else if (mimeType.includes('text')) {
    return '📋';
  }
  return '📎'; // default
}; 
/**
 * The URL prefix the KYC document store serves under.
 *
 * Documents used to be written into `frontend/public/uploads/` and addressed as
 * `/uploads/...`, which is served with no authentication at all — by the
 * backend's static handler AND by Next's own handling of `public/`. They are
 * now written to a backend-private store and come back through an API route
 * that checks owner-or-reviewer.
 */
export const KYC_DOCUMENT_URL_PREFIX = "/api/user/kyc/document/";

/** The prefix documents were stored under before that. */
export const LEGACY_KYC_UPLOAD_PREFIX = "/uploads/";

/**
 * Does this value in `kycApplication.data` name an uploaded document?
 *
 * `data` is a free-form blob keyed by whatever fields the operator put on the
 * KYC level, so there is no type on the value to read — the only way to tell a
 * document from a date of birth is to look at the string. Three copies of that
 * test lived in the user-facing application screen; this is the one.
 *
 * BOTH PREFIXES ARE ACCEPTED, AND THAT IS NOT TEMPORARY.
 * `backend/scripts/kyc-documents-private.mjs` rewrites the stored paths, but it
 * is run by the operator, on their own schedule, after the deploy. Between the
 * two an application carries legacy paths, and a screen that stopped
 * recognising them would tell the applicant their documents were never
 * submitted. The bare-name test is kept for the same reason: it is what matched
 * a path some older level definition stored without any prefix at all.
 *
 * THE BARE-NAME TEST USED TO BE FOUR `includes()` CALLS, AND IT WAS WRONG IN
 * BOTH DIRECTIONS.
 *   Too wide: `data` holds free-form TEXT answers, so an address reading
 *   "Flat 2, mydocs.png Street" contained ".png" and was classified as an
 *   uploaded document. Nothing carrying prose starts with the new prefix, so
 *   `isLegacyKycDocumentPath` agreed, and the applicant's typed answer became a
 *   document card telling them to run a migration — for ever.
 *   Too narrow: it knew four extensions of the twelve the store accepts
 *   (KYC_DOCUMENT_CONTENT_TYPES). A legacy bare-filename PDF was classified as
 *   NOT a document at all, so the upload field rendered "Uploaded successfully"
 *   beside a link that 404s — the failure nobody reports, because it reads as
 *   the platform being broken rather than as one unrun command.
 *
 * Anchored at both ends, so a filename must BE the whole value rather than
 * appear somewhere in it. A one-word answer that happens to read "photo.png" is
 * still ambiguous, and unavoidably so — that is exactly what a bare stored name
 * looks like — but prose no longer is.
 */
const BARE_DOCUMENT_NAME =
  /^[A-Za-z0-9][A-Za-z0-9._/-]*\.(jpe?g|png|webp|gif|pdf|docx?|xlsx?|txt|csv)$/i;

export const isKycDocumentValue = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  return (
    value.startsWith(KYC_DOCUMENT_URL_PREFIX) ||
    value.startsWith(LEGACY_KYC_UPLOAD_PREFIX) ||
    BARE_DOCUMENT_NAME.test(value)
  );
};

/**
 * Is this a document the KYC storage migration has not moved yet?
 *
 * 6.7.2 refuses the old `/uploads/kyc` path at BOTH doors — `PRIVATE_UPLOAD_PREFIXES`
 * in the backend's static handler, and a `beforeFiles` rewrite in `next.config.js`
 * that sends the frontend origin's copy to that same refusal. So a stored path
 * that is not under `KYC_DOCUMENT_URL_PREFIX` does not merely point somewhere
 * old: it 404s, for the applicant and for the reviewer alike.
 *
 * Rendering one as an `<img>` produces a broken image and nothing else, which is
 * the failure mode nobody reports — it reads as "KYC is broken on this platform"
 * rather than "one command has not been run yet". Ask this before rendering a
 * document and show the unavailable state instead.
 *
 * Deliberately derived from `isKycDocumentValue` rather than testing the legacy
 * prefix directly: the oldest level definitions stored a bare filename with no
 * prefix at all, and those are equally unreachable. The question is not "does it
 * start with /uploads/", it is "is this a document we cannot serve".
 *
 * Cleared per install by `pnpm db:migrate:6.7.3:apply`.
 */
export const isLegacyKycDocumentPath = (value: unknown): boolean =>
  isKycDocumentValue(value) && !value.startsWith(KYC_DOCUMENT_URL_PREFIX);
