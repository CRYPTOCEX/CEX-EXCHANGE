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

export const logoUploader = async ({
  file,
  logoType = "logo",
}: {
  file: File;
  logoType?: "logo" | "logo-text";
}) => {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { success: false, error: "Only image files are allowed" };
    }

    // File size limit (5MB for logos)
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeBytes) {
      return { success: false, error: "File size exceeds maximum limit of 5MB" };
    }

    // Convert the file to Base64 format
    const base64File = await fileToBase64(file);

    // Prepare the payload for uploading
    const payload = {
      file: base64File,
      logoType,
    };

    // Upload the logo using the admin logo endpoint
    const { data, error } = await $fetch({
      url: "/api/admin/logo",
      method: "POST",
      body: payload,
      successMessage: `${logoType === "logo-text" ? "Logo with text" : "Logo"} updated successfully!`,
    });

    if (error) {
      throw new Error(error);
    }

    return {
      success: true,
      message: data.message,
      updatedFiles: data.updatedFiles,
    };
  } catch (error) {
    console.error("Error uploading logo:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Logo upload failed" 
    };
  }
};

// Helper function to get logo URLs (these are the hardcoded paths that will always work)
export const getLogoUrls = () => {
  return {
    // Main logos
    logo: "/img/logo/logo.webp",
    logoPng: "/img/logo/logo.png",
    logoText: "/img/logo/logo-text.webp",
    logoTextPng: "/img/logo/logo-text.png",
    
    // Favicons
    favicon16: "/img/logo/favicon-16x16.webp",
    favicon32: "/img/logo/favicon-32x32.webp",
    favicon96: "/img/logo/favicon-96x96.webp",
    
    // Apple touch icons
    appleTouchIcon: "/img/logo/apple-touch-icon.webp",
    appleIcon180: "/img/logo/apple-icon-180x180.webp",
    
    // Android chrome icons
    androidChrome192: "/img/logo/android-chrome-192x192.webp",
    androidChrome512: "/img/logo/android-chrome-512x512.webp",
    
    // Microsoft tiles
    msTile150: "/img/logo/mstile-150x150.webp",
    msTile310: "/img/logo/mstile-310x310.webp",
  };
};

// Helper function to get all available logo variants
export const getAvailableLogoVariants = () => {
  return [
    { name: "Main Logo", key: "logo", description: "Primary logo used throughout the platform" },
    { name: "Logo with Text", key: "logo-text", description: "Logo with text/brand name" },
  ];
}; 