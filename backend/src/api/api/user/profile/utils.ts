import { models } from "@b/db";

export const getUserById = async (id: string) => {
  const user = await models.user.findOne({
    where: { id },
    include: [
      {
        model: models.role,
        as: "role",
        attributes: ["id", "name"],
        include: [
          {
            model: models.permission,
            as: "permissions",
            through: { attributes: [] },
            attributes: ["id", "name"],
          },
        ],
      },
      {
        model: models.twoFactor,
        as: "twoFactor",
        attributes: ["type", "enabled"],
      },
      {
        model: models.kycApplication,
        as: "kyc",
        attributes: ["status"],
        include: [
          {
            model: models.kycLevel,
            as: "level",
            attributes: ["id", "name", "level", "features"],
            paranoid: false, // kycLevel doesn't have soft deletes
          },
        ],
      },
      {
        model: models.author,
        as: "author",
        attributes: ["id", "status"],
      },
      {
        model: models.providerUser,
        as: "providers",
        attributes: ["provider", "providerUserId"],
      },
    ],
    attributes: { exclude: ["password"] },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Convert to plain object
  const plainUser = user.get({ plain: true });

  // Set the user's KYC level and parse KYC features
  let featureAccess: string[] = [];
  
  // Only process feature access if KYC is approved and has a valid level
  if (plainUser.kyc && plainUser.kyc.status === "APPROVED" && plainUser.kyc.level) {
    plainUser.kycLevel = plainUser.kyc.level.level;
    
    try {
      if (plainUser.kyc.level.features) {
        // Features field may be null or already an array (rare); handle both
        if (typeof plainUser.kyc.level.features === "string") {
          featureAccess = JSON.parse(plainUser.kyc.level.features);
        } else if (Array.isArray(plainUser.kyc.level.features)) {
          featureAccess = plainUser.kyc.level.features;
        }
        // Ensure we have a valid array
        if (!Array.isArray(featureAccess)) {
          featureAccess = [];
        }
      }
    } catch (err) {
      // Parsing failed or malformed; fallback to empty array
      console.error("Error parsing KYC level features:", err);
      featureAccess = [];
    }
  } else {
    // If KYC is not approved or missing level, no feature access
    plainUser.kycLevel = 0;
  }

  // Expose features as a top-level field for easy access
  plainUser.featureAccess = featureAccess;

  return plainUser;
};
