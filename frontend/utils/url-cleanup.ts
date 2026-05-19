/**
 * Utility function to clean up authentication-related URL parameters
 * This helps prevent auth=false from persisting in the URL after successful authentication
 */
export function cleanupAuthParams(paramsToRemove: string[] = ['auth', 'return']) {
  if (typeof window === 'undefined') return; // Server-side safety check
  
  try {
    const url = new URL(window.location.href);
    let hasChanges = false;
    
    // Remove specified parameters
    paramsToRemove.forEach(param => {
      if (url.searchParams.has(param)) {
        url.searchParams.delete(param);
        hasChanges = true;
      }
    });
    
    // Only update the URL if there were changes
    if (hasChanges) {
      window.history.replaceState({}, '', url.toString());
    }
  } catch (error) {
    console.error('Error cleaning up URL parameters:', error);
  }
}

/**
 * Specifically cleans up the auth=false parameter and related parameters
 */
export function cleanupAuthFalseParam() {
  cleanupAuthParams(['auth', 'return']);
}

/**
 * Checks if the current URL has auth=false parameter
 */
export function hasAuthFalseParam(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const url = new URL(window.location.href);
    return url.searchParams.get('auth') === 'false';
  } catch (error) {
    console.error('Error checking auth parameter:', error);
    return false;
  }
} 