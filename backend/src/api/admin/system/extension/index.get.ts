import {
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { models } from "@b/db";
import { Op } from "sequelize";
import { fetchAllProductsUpdates } from "@b/api/admin/system/utils";

export const metadata = {
  summary:
    "Lists all comments with pagination and optional filtering by user or post",
  operationId: "listComments",
  tags: ["Admin", "Content", "Comment"],
  responses: {
    200: {
      description: "List of comments with user and post details and pagination",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string", description: "ID of the extension" },
                productId: {
                  type: "string",
                  description: "Product ID of the extension",
                },
                name: { type: "string", description: "Name of the extension" },
                title: {
                  type: "string",
                  description: "Title of the extension",
                },
                description: {
                  type: "string",
                  description: "Description of the extension",
                },
                link: { type: "string", description: "Link to the extension" },
                status: {
                  type: "boolean",
                  description: "Status of the extension",
                },
                version: {
                  type: "string",
                  description: "Version of the extension",
                },
                image: {
                  type: "string",
                  description: "Image of the extension",
                },
                hasLicenseUpdate: {
                  type: "boolean",
                  description: "Whether the extension has an update available in the license system",
                },
                licenseVersion: {
                  type: "string",
                  description: "Latest version available in the license system",
                },
                licenseReleaseDate: {
                  type: "string",
                  description: "Release date of the latest version in the license system",
                },
                licenseSummary: {
                  type: "string",
                  description: "Summary of the latest version in the license system",
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Extensions"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.extension",
};



export default async (data: Handler) => {
  const extensions = await models.extension.findAll({
    where: { [Op.not]: { name: "swap" } },
    attributes: {
      exclude: ["createdAt", "updatedAt"],
    },
  });

  // Fetch license updates
  let licenseUpdates: any = { status: false, products: [] };
  try {
    licenseUpdates = await fetchAllProductsUpdates();
  } catch (error) {
    console.error('Failed to fetch license updates:', error);
  }

  // Map license updates to extensions
  const extensionsWithUpdates = extensions.map((extension) => {
    const extensionData = extension.toJSON();
    
    // Find corresponding license product
    const licenseProduct = licenseUpdates.products?.find(
      (product: any) => product.product_id === extension.productId
    );
    
    // Add update information
    extensionData.hasLicenseUpdate = false;
    extensionData.licenseVersion = null;
    extensionData.licenseReleaseDate = null;
    extensionData.licenseSummary = null;
    
    if (licenseProduct && licenseProduct.has_version) {
      extensionData.licenseVersion = licenseProduct.latest_version;
      extensionData.licenseReleaseDate = licenseProduct.release_date;
      extensionData.licenseSummary = licenseProduct.summary;
      
      // Check if there's a newer version available
      if (licenseProduct.latest_version && extension.version) {
        // Simple version comparison (you might want to use a proper semver library)
        const currentVersion = extension.version.split('.').map(Number);
        const latestVersion = licenseProduct.latest_version.split('.').map(Number);
        
        for (let i = 0; i < Math.max(currentVersion.length, latestVersion.length); i++) {
          const current = currentVersion[i] || 0;
          const latest = latestVersion[i] || 0;
          
          if (latest > current) {
            extensionData.hasLicenseUpdate = true;
            break;
          } else if (current > latest) {
            break;
          }
        }
      }
    }
    
    return extensionData;
  });

  return extensionsWithUpdates;
};
