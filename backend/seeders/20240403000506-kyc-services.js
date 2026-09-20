"use strict";

const VerificationServices = [
  {
    id: "sumsub-1",
    name: "SumSub",
    description: "Global identity verification platform",
    type: "SUMSUB",
    integrationDetails: JSON.stringify({
      features: [
        "ID_VERIFICATION",
        "FACE_MATCHING",
        "LIVENESS_CHECK",
        "AML_SCREENING",
      ],
    }),
  },
  {
    id: "deepseek-1",
    name: "DeepSeek",
    description: "AI-powered document verification",
    type: "DEEPSEEK",
    integrationDetails: JSON.stringify({
      features: ["DOCUMENT_VERIFICATION", "FRAUD_DETECTION", "TEXT_EXTRACTION"],
    }),
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini",
    description: "AI-powered document verification",
    type: "GEMINI",
    integrationDetails: JSON.stringify({
      features: ["DOCUMENT_VERIFICATION", "FRAUD_DETECTION", "TEXT_EXTRACTION"],
    }),
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      const now = new Date();

      // Fetch existing verification service IDs to compare against
      const existingServices = await queryInterface.sequelize.query(
        "SELECT id FROM kyc_verification_service",
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      const existingIds = new Set(
        existingServices.map((service) => service.id)
      );

      // Filter out services that already exist in the database by id
      const newServices = VerificationServices.filter(
        (service) => !existingIds.has(service.id)
      ).map((service) => ({
        ...service,
        createdAt: now,
        updatedAt: now,
      }));

      // Only insert new services that do not exist
      if (newServices.length > 0) {
        await queryInterface.bulkInsert(
          "kyc_verification_service",
          newServices
        );
      }
    } catch (error) {
      console.error("Bulk insert error for kyc_verification_service:", error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("kyc_verification_service", {
      id: VerificationServices.map((service) => service.id),
    });
  },
};
