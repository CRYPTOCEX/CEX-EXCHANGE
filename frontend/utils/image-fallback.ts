/**
 * Utility function to handle image fallbacks consistently across the application.
 * Prevents infinite loops by using data attributes to track fallback attempts.
 */

// Generic crypto icon as base64 SVG data URI
export const GENERIC_CRYPTO_ICON = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGM0Y0RjYiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI4IiB5PSI4Ij4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIHN0cm9rZT0iIzY5NzA3QiIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxwYXRoIGQ9Im0xNSA5LTYgNiIgc3Ryb2tlPSIjNjk3MDdCIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJtOSA5IDYgNiIgc3Ryb2tlPSIjNjk3MDdCIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4KPC9zdmc+';

/**
 * Handle image error with fallback
 * @param event - The error event from img onError
 * @param fallbackUrl - Optional custom fallback URL
 */
export const handleImageError = (event: any, fallbackUrl?: string) => {
  const img = event.target;
  
  // Prevent infinite loops by checking if we already tried fallback
  if (img.dataset.fallbackAttempted) {
    return;
  }
  
  img.dataset.fallbackAttempted = 'true';
  
  if (fallbackUrl) {
    img.src = fallbackUrl;
  } else {
    img.src = GENERIC_CRYPTO_ICON;
  }
};

/**
 * Get the crypto image URL with proper fallback handling
 * @param currency - The currency code
 * @param size - Optional size for responsive images
 */
export const getCryptoImageUrl = (currency: string, size: 'sm' | 'md' | 'lg' = 'md') => {
  // Clean and validate currency input
  if (!currency || typeof currency !== 'string') {
    return '/img/crypto/generic.webp';
  }
  
  // Remove any slashes and clean the currency name
  const cleanCurrency = currency.toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric characters
    .trim();
    
  // Ensure we don't have empty string
  if (!cleanCurrency) {
    return '/img/crypto/generic.webp';
  }
  
  // Construct path without double slashes
  return `/img/crypto/${cleanCurrency}.webp`;
};

/**
 * Create a crypto image component with automatic fallback
 * @param currency - Currency code
 * @param alt - Alt text
 * @param className - CSS classes
 * @param size - Image size
 */
export const createCryptoImage = (
  currency: string, 
  alt?: string, 
  className?: string, 
  size: 'sm' | 'md' | 'lg' = 'md'
) => {
  const imageUrl = getCryptoImageUrl(currency, size);
  const altText = alt || currency || 'Cryptocurrency';
  
  return {
    src: imageUrl,
    alt: altText,
    className,
    onError: (e: any) => handleImageError(e, '/img/crypto/generic.webp')
  };
}; 