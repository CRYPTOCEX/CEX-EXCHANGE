import validator from 'validator';

export interface LogContext {
  step?: (message: string) => void;
  success?: (message: string) => void;
  fail?: (message: string) => void;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates email address
 */
export function validateEmail(email: string, ctx?: LogContext): ValidationResult {
  ctx?.step?.('Validating email address');
  const errors: string[] = [];

  if (!email || typeof email !== 'string') {
    errors.push('Email is required');
    ctx?.fail?.('Email validation failed: Email is required');
    return { isValid: false, errors };
  }

  const trimmedEmail = email.trim();

  if (!validator.isEmail(trimmedEmail)) {
    errors.push('Invalid email format');
  }

  if (trimmedEmail.length > 254) {
    errors.push('Email is too long');
  }

  if (errors.length > 0) {
    ctx?.fail?.(`Email validation failed: ${errors.join(', ')}`);
  } else {
    ctx?.success?.('Email validation successful');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates FAQ question
 */
export function validateFAQQuestion(question: string, ctx?: LogContext): ValidationResult {
  ctx?.step?.('Validating FAQ question');
  const errors: string[] = [];

  if (!question || typeof question !== 'string') {
    errors.push('Question is required');
    ctx?.fail?.('Question validation failed: Question is required');
    return { isValid: false, errors };
  }

  const trimmedQuestion = question.trim();

  if (trimmedQuestion.length < 10) {
    errors.push('Question must be at least 10 characters long');
  }

  if (trimmedQuestion.length > 500) {
    errors.push('Question must not exceed 500 characters');
  }

  if (errors.length > 0) {
    ctx?.fail?.(`Question validation failed: ${errors.join(', ')}`);
  } else {
    ctx?.success?.('Question validation successful');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates FAQ answer
 */
export function validateFAQAnswer(answer: string, ctx?: LogContext): ValidationResult {
  ctx?.step?.('Validating FAQ answer');
  const errors: string[] = [];

  if (!answer || typeof answer !== 'string') {
    errors.push('Answer is required');
    ctx?.fail?.('Answer validation failed: Answer is required');
    return { isValid: false, errors };
  }

  const trimmedAnswer = answer.trim();

  if (trimmedAnswer.length < 20) {
    errors.push('Answer must be at least 20 characters long');
  }

  if (trimmedAnswer.length > 10000) {
    errors.push('Answer must not exceed 10000 characters');
  }

  if (errors.length > 0) {
    ctx?.fail?.(`Answer validation failed: ${errors.join(', ')}`);
  } else {
    ctx?.success?.('Answer validation successful');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates category name
 */
export function validateCategory(category: string, ctx?: LogContext): ValidationResult {
  ctx?.step?.('Validating category name');
  const errors: string[] = [];

  if (!category || typeof category !== 'string') {
    errors.push('Category is required');
    ctx?.fail?.('Category validation failed: Category is required');
    return { isValid: false, errors };
  }

  const trimmedCategory = category.trim();

  if (trimmedCategory.length < 2) {
    errors.push('Category must be at least 2 characters long');
  }

  if (trimmedCategory.length > 50) {
    errors.push('Category must not exceed 50 characters');
  }

  if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmedCategory)) {
    errors.push('Category contains invalid characters');
  }

  if (errors.length > 0) {
    ctx?.fail?.(`Category validation failed: ${errors.join(', ')}`);
  } else {
    ctx?.success?.('Category validation successful');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates tags array
 */
export function validateTags(tags: any, ctx?: LogContext): ValidationResult {
  ctx?.step?.('Validating tags array');
  const errors: string[] = [];

  if (!Array.isArray(tags)) {
    errors.push('Tags must be an array');
    ctx?.fail?.('Tags validation failed: Tags must be an array');
    return { isValid: false, errors };
  }

  if (tags.length > 10) {
    errors.push('Maximum 10 tags allowed');
  }

  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    if (typeof tag !== 'string') {
      errors.push(`Tag at index ${i} must be a string`);
      continue;
    }

    const trimmedTag = tag.trim();
    if (trimmedTag.length < 2) {
      errors.push(`Tag "${tag}" must be at least 2 characters long`);
    }

    if (trimmedTag.length > 30) {
      errors.push(`Tag "${tag}" must not exceed 30 characters`);
    }

    if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmedTag)) {
      errors.push(`Tag "${tag}" contains invalid characters`);
    }
  }

  if (errors.length > 0) {
    ctx?.fail?.(`Tags validation failed: ${errors.join(', ')}`);
  } else {
    ctx?.success?.('Tags validation successful');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates feedback comment
 */
export function validateFeedbackComment(comment: string | undefined, ctx?: LogContext): ValidationResult {
  ctx?.step?.('Validating feedback comment');
  const errors: string[] = [];

  if (comment === undefined || comment === null) {
    ctx?.success?.('Feedback comment validation successful (optional field)');
    return { isValid: true, errors: [] };
  }

  if (typeof comment !== 'string') {
    errors.push('Comment must be a string');
    ctx?.fail?.('Comment validation failed: Comment must be a string');
    return { isValid: false, errors };
  }

  if (comment.length > 1000) {
    errors.push('Comment must not exceed 1000 characters');
  }

  if (errors.length > 0) {
    ctx?.fail?.(`Comment validation failed: ${errors.join(', ')}`);
  } else {
    ctx?.success?.('Comment validation successful');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates page path
 */
export function validatePagePath(pagePath: string, ctx?: LogContext): ValidationResult {
  ctx?.step?.('Validating page path');
  const errors: string[] = [];

  if (!pagePath || typeof pagePath !== 'string') {
    errors.push('Page path is required');
    ctx?.fail?.('Page path validation failed: Page path is required');
    return { isValid: false, errors };
  }

  const trimmedPath = pagePath.trim();

  if (!trimmedPath.startsWith('/')) {
    errors.push('Page path must start with /');
  }

  if (trimmedPath.length > 200) {
    errors.push('Page path must not exceed 200 characters');
  }

  if (!/^[a-zA-Z0-9\-_/]+$/.test(trimmedPath)) {
    errors.push('Page path contains invalid characters');
  }

  if (errors.length > 0) {
    ctx?.fail?.(`Page path validation failed: ${errors.join(', ')}`);
  } else {
    ctx?.success?.('Page path validation successful');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitizes input string to prevent XSS
 */
export function sanitizeInput(input: string, ctx?: LogContext): string {
  ctx?.step?.('Sanitizing input string');

  if (!input || typeof input !== 'string') {
    ctx?.success?.('Input sanitization complete (empty input)');
    return '';
  }

  // Remove any HTML tags for plain text fields
  const sanitized = validator.escape(input.trim());
  ctx?.success?.('Input sanitization successful');
  return sanitized;
}

/**
 * Validates and sanitizes FAQ data
 */
export function validateAndSanitizeFAQ(data: any, ctx?: LogContext): {
  isValid: boolean;
  errors: string[];
  sanitized?: any;
} {
  ctx?.step?.('Starting FAQ data validation and sanitization');
  const errors: string[] = [];

  // Validate question
  const questionValidation = validateFAQQuestion(data.question, ctx);
  if (!questionValidation.isValid) {
    errors.push(...questionValidation.errors);
  }

  // Validate answer
  const answerValidation = validateFAQAnswer(data.answer, ctx);
  if (!answerValidation.isValid) {
    errors.push(...answerValidation.errors);
  }

  // Validate category
  const categoryValidation = validateCategory(data.category, ctx);
  if (!categoryValidation.isValid) {
    errors.push(...categoryValidation.errors);
  }

  // Validate tags if provided
  if (data.tags !== undefined) {
    const tagsValidation = validateTags(data.tags, ctx);
    if (!tagsValidation.isValid) {
      errors.push(...tagsValidation.errors);
    }
  }

  // Validate page path
  const pagePathValidation = validatePagePath(data.pagePath, ctx);
  if (!pagePathValidation.isValid) {
    errors.push(...pagePathValidation.errors);
  }

  if (errors.length > 0) {
    ctx?.fail?.(`FAQ validation failed with ${errors.length} error(s)`);
    return { isValid: false, errors };
  }

  ctx?.step?.('Sanitizing FAQ data');
  // Sanitize data
  const sanitized = {
    question: sanitizeInput(data.question, ctx),
    answer: data.answer, // HTML content, will be sanitized on frontend
    category: sanitizeInput(data.category, ctx),
    tags: data.tags ? data.tags.map((tag: string) => sanitizeInput(tag, ctx)) : [],
    pagePath: sanitizeInput(data.pagePath, ctx),
    status: typeof data.status === 'boolean' ? data.status : true,
    order: typeof data.order === 'number' ? data.order : 0,
    image: data.image ? sanitizeInput(data.image, ctx) : undefined
  };

  ctx?.success?.('FAQ validation and sanitization completed successfully');

  return {
    isValid: true,
    errors: [],
    sanitized
  };
}
