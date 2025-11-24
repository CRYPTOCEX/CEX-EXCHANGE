import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { validateEmail, validateFAQQuestion, sanitizeInput } from "@b/api/(ext)/faq/utils/faq-validation";
import { faqQuestionRateLimit } from "@b/handler/Middleware";

export const metadata = {
  summary: "Submit FAQ Question",
  description:
    "Allows a user to submit a question if they cannot find an answer in the FAQs.",
  operationId: "submitFAQQuestion",
  tags: ["FAQ"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            email: { type: "string", description: "User's email" },
            question: { type: "string", description: "The submitted question" },
          },
          required: ["email", "question"],
        },
      },
    },
  },
  responses: {
    200: { description: "Question submitted successfully" },
    400: { description: "Bad Request" },
    500: { description: "Internal Server Error" },
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  // Apply rate limiting
  await faqQuestionRateLimit(data);
  
  const { body, user } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { email, question } = body;
  if (!email || !question) {
    throw createError({ statusCode: 400, message: "Missing required fields" });
  }

  // Validate email
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    throw createError({ 
      statusCode: 400, 
      message: emailValidation.errors.join(', ') 
    });
  }

  // Validate question
  const questionValidation = validateFAQQuestion(question);
  if (!questionValidation.isValid) {
    throw createError({ 
      statusCode: 400, 
      message: questionValidation.errors.join(', ') 
    });
  }

  const userPk = await models.user.findByPk(user.id);
  if (!userPk) {
    throw createError({ statusCode: 400, message: "User not found" });
  }

  try {
    const newQuestion = await models.faqQuestion.create({
      userId: user.id,
      name: sanitizeInput(userPk.firstName + " " + userPk.lastName),
      email: email.trim().toLowerCase(),
      question: sanitizeInput(question),
      status: "PENDING",
    });
    return newQuestion;
  } catch (error) {
    console.error("Error submitting FAQ question:", error);
    throw createError({
      statusCode: 500,
      message:
        error instanceof Error ? error.message : "Failed to submit question",
    });
  }
};
