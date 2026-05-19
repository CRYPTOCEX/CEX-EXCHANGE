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

// Helper function to handle HEIC conversion using a server-side endpoint
const convertHeicFile = async (
  base64File: string,
  dir: string,
  mimeType: string
) => {
  try {
    const { data, error } = await $fetch({
      url: "/api/upload/heic", // Make sure this endpoint is properly defined
      method: "POST",
      body: { file: base64File, dir, mimeType },
    });

    if (data) {
      return data; // Return the converted file data
    } else {
      console.error("HEIC conversion failed:", error);
      throw new Error("HEIC conversion failed");
    }
  } catch (error) {
    console.error("Error converting HEIC file:", error);
    throw error;
  }
};

export const imageUploader = async ({
  file,
  dir,
  size = { maxWidth: 1024, maxHeight: 728 },
  oldPath = "",
}: {
  file: File;
  dir: string;
  size: {
    width?: number;
    height?: number;
    maxWidth: number;
    maxHeight: number;
  };
  oldPath?: string;
}) => {
  // Step 1: Convert the file to Base64 format
  const base64File = await fileToBase64(file);

  // Step 2: Ensure MIME type is correctly set
  let mimeType = file.type;

  // Check if MIME type is not set or empty (common for HEIC files)
  if (!mimeType || mimeType === "") {
    // Fallback logic to set MIME type based on file extension
    if (file.name.toLowerCase().endsWith(".heic")) {
      mimeType = "image/heic";
    } else if (file.name.toLowerCase().endsWith(".heif")) {
      mimeType = "image/heif";
    }
  }

  // Step 3: Check if the file is a HEIC file, and if so, convert it using the server API
  if (mimeType === "image/heic" || mimeType === "image/heif") {
    try {
      const convertedData = await convertHeicFile(base64File, dir, mimeType);
      return {
        success: true,
        ...convertedData, // Return the entire converted data object (e.g., URL, dimensions, etc.)
      };
    } catch (error) {
      console.error("Error converting HEIC/HEIF file:", error);
      return { success: false, error: "HEIC/HEIF file conversion failed" };
    }
  }

  // Step 4: Load image dimensions using JavaScript Image object
  const img = new Image();
  img.src = base64File;

  await new Promise<void>((resolve, reject) => {
    img.onload = () => {
      console.log(
        "Image loaded successfully:",
        img.naturalWidth,
        img.naturalHeight
      );
      resolve();
    };
    img.onerror = () => {
      console.error("Error loading image. Base64 might be invalid.");
      reject("Image loading failed");
    };
  });

  // Step 5: Prepare the payload for uploading
  const { width, height, maxWidth, maxHeight } = size;
  const filePayload = {
    file: base64File,
    dir,
    mimeType, // Pass the correct MIME type here
    width: Math.min(Number(width || img.naturalWidth), maxWidth),
    height: Math.min(Number(height || img.naturalHeight), maxHeight),
    oldPath,
  };

  // Step 6: Upload the file using the upload endpoint
  try {
    const { data, error } = await $fetch({
      url: "/api/upload",
      method: "POST",
      body: filePayload,
      silentSuccess: true,
    });

    if (error) {
      throw new Error("File upload failed");
    }

    return {
      success: true,
      url: data.url, // Return the uploaded file URL
    };
  } catch (error) {
    console.error("Error uploading file:", error);
    return { success: false, error: "File upload failed" };
  }
};
