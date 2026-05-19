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