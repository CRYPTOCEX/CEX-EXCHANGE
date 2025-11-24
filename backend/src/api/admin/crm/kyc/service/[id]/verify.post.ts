import { models } from "@b/db";
import { createError } from "@b/utils/error";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { InlineDataPart, FileDataPart } from "@google/generative-ai";
import { RedisSingleton } from "@b/utils/redis";

// Metadata for the endpoint
export const metadata = {
  summary: "Verify KYC Application",
  description:
    "Submits a KYC application for verification using the specified verification service.",
  operationId: "verifyKycApplication",
  tags: ["KYC", "Verification Services", "Applications"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "Verification service ID",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            applicationId: {
              type: "string",
              description: "ID of the KYC application to verify",
            },
          },
          required: ["applicationId"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Verification process initiated successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              id: { type: "string", description: "Verification result ID" },
              applicationId: {
                type: "string",
                description: "KYC application ID",
              },
              serviceId: {
                type: "string",
                description: "Verification service ID",
              },
              serviceName: {
                type: "string",
                description: "Verification service name",
              },
              status: {
                type: "string",
                enum: ["VERIFIED", "FAILED", "PENDING", "NOT_STARTED"],
                description: "Verification status",
              },
              score: {
                type: "number",
                description: "Verification confidence score (percentage)",
                nullable: true,
              },
              checks: {
                type: "object",
                description:
                  "Structured verification checks (JSON object with keys such as summary, selfieMatch, documentAuthentic, confidenceScore, issues, and extractedInfo)",
                nullable: true,
              },
              documentVerifications: {
                type: "object",
                description:
                  "Document verification details including a human‐readable summary (aiResponse)",
                nullable: true,
              },
              createdAt: {
                type: "string",
                format: "date-time",
                description: "When the verification was initiated",
              },
            },
          },
        },
      },
    },
    400: { description: "Missing required fields." },
    404: { description: "Verification service or application not found." },
    500: { description: "Internal Server Error." },
  },
  permission: "edit.kyc.verification",
  requiresAuth: true,
};

export default async (data: {
  params: { id: string };
  body: any;
}): Promise<any> => {
  try {
    const { id } = data.params; // Verification service ID from path
    const { applicationId } = data.body;
    if (!applicationId) {
      throw createError({
        statusCode: 400,
        message: "Missing required field: applicationId",
      });
    }

    // Retrieve the application along with its associated level and nested verification service.
    const application = await models.kycApplication.findByPk(applicationId, {
      include: [
        {
          model: models.kycLevel,
          as: "level",
          paranoid: false, // kycLevel doesn't have soft deletes
          include: [
            {
              model: models.kycVerificationService,
              as: "verificationService",
            },
          ],
        },
      ],
    });
    if (!application) {
      throw createError({
        statusCode: 404,
        message: "KYC application not found",
      });
    }

    const level = application.level;
    if (!level) {
      throw createError({
        statusCode: 404,
        message: "KYC level not found for this application",
      });
    }

    // Use the verification service from the level.
    const service = level.verificationService;
    if (!service) {
      throw createError({
        statusCode: 404,
        message: "Verification service not found in KYC level configuration",
      });
    }

    let verificationResponse;
    if (service.type === "SUMSUB") {
      verificationResponse = await verifyWithSumSub(application, level);
    } else if (service.type === "GEMINI") {
      verificationResponse = await verifyWithGemini(application, level);
    } else {
      throw createError({
        statusCode: 400,
        message: `Unsupported verification service type: ${service.type}`,
      });
    }

    const verificationResult = await models.kycVerificationResult.create({
      applicationId,
      serviceId: service.id,
      status: verificationResponse.status,
      score: verificationResponse.score,
      // Save JSON objects directly (not stringified)
      checks: verificationResponse.checks,
      documentVerifications: verificationResponse.documentVerifications,
      createdAt: new Date(),
    });

    const newApplicationStatus =
      verificationResponse.status === "PENDING"
        ? "PENDING"
        : verificationResponse.status === "VERIFIED"
          ? "APPROVED"
          : verificationResponse.status === "FAILED"
            ? "REJECTED"
            : "PENDING";

    await application.update({
      status: newApplicationStatus,
      updatedAt: new Date(),
      reviewedAt: new Date(),
    });

    // Clear user cache if application was approved to ensure feature access updates immediately
    if (newApplicationStatus === "APPROVED") {
      try {
        const redis = RedisSingleton.getInstance();
        await redis.del(`user:${application.userId}:profile`);
      } catch (error) {
        console.error("Error clearing user cache after KYC approval:", error);
        // Don't fail the request if cache clearing fails
      }
    }

    return {
      id: verificationResult.id,
      applicationId,
      serviceId: service.id,
      serviceName: service.name,
      status: verificationResponse.status,
      score: verificationResponse.score,
      checks: verificationResponse.checks,
      documentVerifications: verificationResponse.documentVerifications,
      createdAt: verificationResult.createdAt,
    };
  } catch (error: any) {
    console.error("Error in verifyKycApplication:", error);
    if (error.response) {
      console.error("API Response Error:", {
        status: error.response.status,
        data: error.response.data,
      });
    }
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Failed to initiate verification process",
    });
  }
};

// ---------------------
// Gemini verification integration (updated to process IDENTITY fields and adjust score)
// ---------------------
async function verifyWithGemini(application: any, level: any) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API key not configured");
    }

    // Use submittedData if available; fallback to application.data.
    let submittedData = application.submittedData || application.data;
    if (!submittedData) {
      throw new Error("No submitted data found in application");
    }
    if (typeof submittedData === "string") {
      submittedData = JSON.parse(submittedData);
    }

    // Ensure level.fields is an array.
    const fields =
      typeof level.fields === "string"
        ? JSON.parse(level.fields)
        : level.fields;
    const processedData = processLevelFields(fields, submittedData);

    // If no documents found, attempt to extract from the IDENTITY field.
    if (Object.keys(processedData.documents).length === 0) {
      throw new Error("No documents found for verification");
    }

    // Import Gemini's SDK from @google/generative-ai.
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    // Select a Gemini vision-capable model variant.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    // Build the parts array.
    const parts: Array<string | InlineDataPart | FileDataPart> = [];
    // Build a dynamic prompt instructing Gemini to include a "summary" key.
    const verificationPrompt = createDynamicVerificationPrompt(processedData);
    parts.push(verificationPrompt);

    // For each document, if the URL starts with "http" then use FileDataPart; otherwise, inlineData.
    for (const [docKey, docUrl] of Object.entries(processedData.documents)) {
      try {
        const fieldDef = findFieldById(fields, docKey.split("-")[0]);
        const fieldLabel = fieldDef ? fieldDef.label : docKey;
        if (String(docUrl).startsWith("http")) {
          parts.push({
            fileData: {
              fileUri: String(docUrl),
              mimeType: "image/jpeg",
            },
          } as FileDataPart);
        } else {
          const docBase64 = await convertImageToBase64(String(docUrl));
          parts.push({
            inlineData: {
              data: docBase64,
              mimeType: "image/jpeg",
            },
          } as InlineDataPart);
        }
        // Optionally include a text part indicating the document type.
        parts.push(`This is the ${fieldLabel}.`);
      } catch (error) {
        console.warn(`Failed to process document ${docKey}: ${error}`);
      }
    }

    // Request Gemini to return a raw JSON object.
    const generatedContent = await model.generateContent(parts, {
      responseFormat: { type: "json_object" },
    } as any);

    // Clean and parse the AI response.
    const aiResponseRaw = generatedContent.response.text();
    const aiResponseClean = cleanJSONOutput(aiResponseRaw);
    let parsedResult: any = null;
    try {
      parsedResult = JSON.parse(aiResponseClean);
    } catch (e) {
      console.warn(
        "Failed to parse Gemini response as JSON, falling back to basic analysis"
      );
    }
    const finalResult = parsedResult || analyzeAIResponse(aiResponseClean);

    // Determine overall status based on the structured result.
    const overallStatus =
      finalResult.selfieMatch === true && finalResult.documentAuthentic === true
        ? "VERIFIED"
        : "FAILED";
    // Transform the confidence score: if it's a fraction (<= 1), multiply by 100.
    const rawConfidence = finalResult.confidenceScore ?? 0.6;
    const confidenceScore =
      rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence;

    const documentVerifications = {
      message: "Gemini verification completed",
      details: "Document verification has been completed by Gemini AI.",
      aiResponse: finalResult.summary ? finalResult.summary : aiResponseClean,
    };

    return {
      status: overallStatus,
      score: confidenceScore,
      checks: finalResult,
      documentVerifications,
    };
  } catch (error: any) {
    console.error("Gemini verification error:", error);
    let errorMessage = "An error occurred during Gemini verification";
    const errorDetails = error.message || "";
    if (error.status === 400) {
      errorMessage = "Invalid request format";
    } else if (error.status === 401) {
      errorMessage = "Authentication failed - invalid API key";
    } else if (error.status === 402) {
      errorMessage = "Insufficient balance in Gemini account";
    } else if (error.status === 422) {
      errorMessage = "Invalid parameters in request";
    } else if (error.status === 429) {
      errorMessage = "Rate limit reached - too many requests";
    } else if (error.status === 500) {
      errorMessage = "Gemini server error";
    } else if (error.status === 503) {
      errorMessage = "Gemini server overloaded";
    }
    return {
      status: "FAILED",
      score: null,
      checks: {
        message: "Gemini verification failed",
        details: errorMessage,
        error: errorDetails,
      },
      documentVerifications: null,
    };
  }
}

// ---------------------
// Helper: cleanJSONOutput
// ---------------------
function cleanJSONOutput(text: string): string {
  return text.replace(/```(json)?/g, "").trim();
}

// ---------------------
// Helper: convertImageToBase64
// ---------------------
async function convertImageToBase64(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith("data:image")) {
    return imageUrl.split(",")[1];
  }
  if (!imageUrl.startsWith("http")) {
    const BASE_UPLOAD_DIR = path.join(process.cwd(), "..", "frontend", "public");
    const filePath = path.join(BASE_UPLOAD_DIR, imageUrl);
    try {
      const data = await fs.readFile(filePath);
      return data.toString("base64");
    } catch (error) {
      console.error("Error reading local file:", error);
      throw new Error("Failed to process local image for verification");
    }
  }
  try {
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer).toString("base64");
  } catch (error) {
    console.error("Error converting image to base64:", error);
    throw new Error("Failed to process image for verification");
  }
}

// ---------------------
// Helpers: processLevelFields and related functions (updated to handle IDENTITY fields)
// ---------------------
function processLevelFields(fields, submittedData) {
  const result = {
    textFields: {},
    documents: {},
    personalInfo: {},
    addresses: [],
    hasSelfie: false,
  };
  processFields(fields, submittedData, result);
  return result;
}

function processFields(fields, submittedData, result, parentPath = "") {
  fields.forEach((field) => {
    const fieldId = field.id;
    const fieldValue = submittedData[fieldId];
    if (fieldValue === undefined || fieldValue === null) return;
    const fieldType = field.type;
    const fieldLabel = field.label ? field.label.toLowerCase() : "";

    if (fieldType === "FILE" || fieldType === "IMAGE") {
      result.documents[fieldId] = fieldValue;
      if (fieldLabel.includes("selfie")) {
        result.hasSelfie = true;
      }
    } else if (fieldType === "IDENTITY") {
      // Process identity fields: iterate through subfields (except "type")
      if (typeof fieldValue === "object") {
        for (const key in fieldValue) {
          if (key === "type") continue;
          if (
            typeof fieldValue[key] === "string" &&
            fieldValue[key].trim() !== ""
          ) {
            // Create a composite key for uniqueness.
            const compositeKey = `${fieldId}-${key}`;
            result.documents[compositeKey] = fieldValue[key];
            if (key.toLowerCase().includes("selfie")) {
              result.hasSelfie = true;
            }
          }
        }
      }
    } else if (fieldType === "SECTION" || fieldType === "SUBSECTION") {
      if (field.fields && Array.isArray(field.fields)) {
        processFields(
          field.fields,
          submittedData,
          result,
          `${parentPath}${fieldId}.`
        );
      }
    } else {
      result.textFields[fieldId] = {
        value: fieldValue,
        label: field.label,
        type: fieldType,
      };
      if (fieldType === "TEXT") {
        if (fieldLabel.includes("first name")) {
          result.personalInfo.firstName = fieldValue;
        } else if (fieldLabel.includes("last name")) {
          result.personalInfo.lastName = fieldValue;
        } else if (fieldLabel.includes("nationality")) {
          result.personalInfo.nationality = fieldValue;
        }
      } else if (fieldType === "EMAIL") {
        result.personalInfo.email = fieldValue;
      } else if (fieldType === "PHONE") {
        result.personalInfo.phone = fieldValue;
      } else if (fieldType === "DATE" && fieldLabel.includes("birth")) {
        result.personalInfo.dob = fieldValue;
      } else if (fieldType === "SELECT" && fieldLabel.includes("country")) {
        result.personalInfo.country = fieldValue;
      } else if (fieldType === "ADDRESS" && typeof fieldValue === "object") {
        result.addresses.push({
          country: fieldValue.country,
          postCode: fieldValue.postalCode,
          town: fieldValue.city,
          street: fieldValue.street,
          subStreet: fieldValue.apartment,
          state: fieldValue.state,
        });
      }
    }
  });
}

function findFieldById(fields, fieldId, parentPath = "") {
  for (const field of fields) {
    if (field.id === fieldId) return field;
    if (
      (field.type === "SECTION" || field.type === "SUBSECTION") &&
      field.fields &&
      Array.isArray(field.fields)
    ) {
      const nestedField = findFieldById(
        field.fields,
        fieldId,
        `${parentPath}${field.id}.`
      );
      if (nestedField) return nestedField;
    }
  }
  return null;
}

function createDynamicVerificationPrompt(processedData) {
  // Updated prompt instructs Gemini to include a "summary" key.
  const prompt = `
Please verify the following ID document(s) for authenticity and confirm whether the provided personal information matches the document. Use the data below to assess both the document and the selfie (if provided).

User Information:
${JSON.stringify(processedData.personalInfo, null, 2)}

Document Data:
${JSON.stringify(processedData.documents, null, 2)}

Verification Tasks:
1. Check if the document appears authentic.
2. Verify that the user information matches what is on the document.
3. If a selfie is provided, determine whether the selfie image matches the photo on the document.
4. Provide a human-readable summary of the verification outcome.

Please output your answer as a raw JSON object (without any markdown or code block formatting) with exactly the following keys:
{
  "summary": string,
  "selfieMatch": boolean,
  "documentAuthentic": boolean,
  "confidenceScore": number,
  "issues": string[],
  "extractedInfo": {}
}
`;
  return prompt;
}

function analyzeAIResponse(aiResponse: string) {
  // Fallback analysis if JSON parsing fails.
  const lower = aiResponse.toLowerCase();
  const isDocumentValid =
    !lower.includes("fake") &&
    !lower.includes("tampered") &&
    !lower.includes("manipulated") &&
    !lower.includes("fail");
  let confidenceScore = 60;
  const confidenceMatch = aiResponse.match(
    /confidence(?:\s+score)?(?:\s+of)?(?:\s+is)?[:\s]+(\d+)%?/i
  );
  if (confidenceMatch && confidenceMatch[1]) {
    confidenceScore = Number.parseInt(confidenceMatch[1], 10);
  } else {
    confidenceScore = lower.includes("high confidence")
      ? 90
      : lower.includes("medium confidence")
        ? 70
        : lower.includes("low confidence")
          ? 40
          : 60;
  }
  const detectedIssues: string[] = [];
  if (lower.includes("mismatch")) detectedIssues.push("Information mismatch");
  if (lower.includes("blur")) detectedIssues.push("Blurry image");
  if (lower.includes("expired")) detectedIssues.push("Expired document");
  if (lower.includes("damaged")) detectedIssues.push("Damaged document");
  if (lower.includes("photoshop")) detectedIssues.push("Signs of manipulation");
  if (
    lower.includes("selfie") &&
    lower.includes("match") &&
    lower.includes("not")
  )
    detectedIssues.push("Selfie does not match ID photo");
  const summary = aiResponse.split("\n\n")[0] || aiResponse.split(".")[0] + ".";
  const extractedInfo: any = {};
  const nameMatch = aiResponse.match(/name(?:\s+is)?[:\s]+([A-Za-z\s]+)/i);
  if (nameMatch && nameMatch[1]) {
    extractedInfo.name = nameMatch[1].trim();
  }
  const dobMatch = aiResponse.match(
    /(?:date of birth|dob|born)(?:\s+is)?[:\s]+([A-Za-z0-9\s,./-]+)/i
  );
  if (dobMatch && dobMatch[1]) {
    extractedInfo.dateOfBirth = dobMatch[1].trim();
  }
  const docNumberMatch = aiResponse.match(
    /(?:document|id|passport)(?:\s+number)(?:\s+is)?[:\s]+([A-Za-z0-9\s]+)/i
  );
  if (docNumberMatch && docNumberMatch[1]) {
    extractedInfo.documentNumber = docNumberMatch[1].trim();
  }
  return {
    summary,
    selfieMatch: lower.includes("selfie match") && !lower.includes("not"),
    documentAuthentic: isDocumentValid,
    confidenceScore,
    issues: detectedIssues,
    extractedInfo,
  };
}

// ---------------------
// SumSub verification integration (unchanged)
// ---------------------
async function verifyWithSumSub(application: any, level: any) {
  try {
    const apiKey = process.env.SUMSUB_API_KEY;
    const apiSecret = process.env.SUMSUB_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error("SumSub API credentials not configured");
    }

    const { userId, submittedData } = application;
    if (!submittedData) {
      throw new Error("No submitted data found in application");
    }

    const processedData = processLevelFields(level.fields, submittedData);
    const ts = Math.floor(Date.now() / 1000).toString();

    const requestBody = JSON.stringify({
      externalUserId: userId,
      info: {
        ...processedData.personalInfo,
        addresses:
          processedData.addresses.length > 0
            ? processedData.addresses
            : undefined,
      },
      requiredIdDocs: {
        docSets: [
          {
            idDocSetType: "IDENTITY",
            types: ["PASSPORT", "ID_CARD", "DRIVERS"],
            subTypes: ["FRONT_SIDE", "BACK_SIDE"],
          },
          ...(processedData.hasSelfie
            ? [
                {
                  idDocSetType: "SELFIE",
                  types: ["SELFIE"],
                  subTypes: [],
                },
              ]
            : []),
        ],
      },
    });

    const signature = crypto
      .createHmac("sha256", apiSecret)
      .update(ts + requestBody)
      .digest("hex");

    const response = await fetch(
      "https://api.sumsub.com/resources/applicants",
      {
        method: "POST",
        headers: {
          "X-App-Token": apiKey,
          "X-App-Access-Sig": signature,
          "X-App-Access-Ts": ts,
          "Content-Type": "application/json",
        },
        body: requestBody,
      }
    );

    if (!response.ok) {
      const errorData = (await response.json()) as { description?: string };
      throw new Error(
        `SumSub API error: ${errorData.description || response.statusText}`
      );
    }

    const responseData = (await response.json()) as {
      id: string;
      reviewStatus: string;
      externalUserId: string;
    };

    return {
      status: "PENDING",
      score: null,
      checks: {
        message: "SumSub verification initiated",
        details: "Your application has been sent to SumSub for verification.",
        applicantId: responseData.id,
        reviewStatus: responseData.reviewStatus,
        externalUserId: responseData.externalUserId,
        processedFields: Object.keys(submittedData).length,
      },
      documentVerifications: {
        message: "SumSub verification completed",
        details: "No further document analysis available for SumSub.",
      },
    };
  } catch (error: any) {
    console.error("SumSub verification error:", error);
    return {
      status: "FAILED",
      score: null,
      checks: {
        message: "SumSub verification failed",
        details:
          error.message || "An error occurred during SumSub verification",
        error: error.toString(),
      },
      documentVerifications: null,
    };
  }
}
