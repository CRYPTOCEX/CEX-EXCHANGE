// utils.ts

export const featureKeys = [
  {
    key: "maxTeamMembers",
    name: "Team Members",
    description: "Maximum number of team members you can add to your project",
  },
  {
    key: "maxRoadmapItems",
    name: "Roadmap Items",
    description: "Maximum number of roadmap milestones you can create",
  },
  {
    key: "maxOfferingPhases",
    name: "Offering Phases",
    description: "Maximum number of token sale phases you can configure",
  },
  {
    key: "maxUpdatePosts",
    name: "Update Posts",
    description: "Maximum number of project updates you can publish per month",
  },
  {
    key: "supportLevel",
    name: "Support Level",
    description: "Level of customer support provided for your token launch",
  },
  {
    key: "marketingSupport",
    name: "Marketing Package",
    description: "Marketing assistance to promote your token offering",
  },
  {
    key: "auditIncluded",
    name: "Security Audit",
    description: "Professional review of your token's smart contract code",
  },
  {
    key: "customTokenomics",
    name: "Custom Tokenomics",
    description: "Customized token economics consultation and implementation",
  },
  {
    key: "priorityListing",
    name: "Priority Listing",
    description: "Featured placement on our platform for increased visibility",
  },
];

export const generateFeatureComparison = (launchPlans: any[]): any[] => {
  if (launchPlans.length === 0) return [];

  // Define unit labels for numerical features
  const unitMap: Record<string, string> = {
    maxTeamMembers: "members",
    maxRoadmapItems: "items",
    maxOfferingPhases: "phases",
    maxUpdatePosts: "posts",
  };

  return featureKeys.map((feature) => {
    const comparisonItem: any = {
      name: feature.name,
      description: feature.description,
    };

    // Process each plan's feature value
    launchPlans.forEach((plan) => {
      const planId = plan.id;

      // Ensure features is an object (parse if it's a JSON string)
      let features;
      try {
        features =
          typeof plan.features === "string"
            ? JSON.parse(plan.features)
            : plan.features;
      } catch (e) {
        console.error(`Error parsing features for plan ${planId}:`, e);
        features = {};
      }

      const featureValue = features[feature.key];

      let formattedValue = "N/A";

      // Format numerical values with units if available
      if (
        [
          "maxTeamMembers",
          "maxRoadmapItems",
          "maxOfferingPhases",
          "maxUpdatePosts",
        ].includes(feature.key)
      ) {
        if (typeof featureValue === "number") {
          formattedValue =
            featureValue === 999
              ? "Unlimited"
              : `${featureValue} ${unitMap[feature.key]}`;
        }
      } else if (feature.key === "supportLevel") {
        // Map support levels to human-readable text
        const supportLevelMap: Record<string, string> = {
          basic: "Standard",
          standard: "Priority",
          premium: "24/7 Dedicated",
        };
        formattedValue = supportLevelMap[featureValue] || featureValue || "N/A";
      } else {
        // For boolean or other features, display the value or a fallback
        formattedValue = featureValue !== undefined ? featureValue : "N/A";
      }

      comparisonItem[planId] = formattedValue;
    });

    return comparisonItem;
  });
};
