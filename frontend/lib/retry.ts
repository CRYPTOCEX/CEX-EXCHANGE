interface RetryOptions {
  retries?: number;
  delay?: number;
  backoff?: number;
  maxDelay?: number;
  onRetry?: (error: Error, attempt: number) => void;
  shouldRetry?: (error: Error) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  retries: 3,
  delay: 1000,
  backoff: 2,
  maxDelay: 10000,
  onRetry: () => {},
  shouldRetry: (error: Error) => {
    // Retry on network errors, timeouts, and 5xx errors
    const retryableErrors = [
      'NetworkError',
      'TimeoutError',
      'fetch',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENETUNREACH',
    ];
    
    const errorMessage = error.message.toLowerCase();
    const isNetworkError = retryableErrors.some(err => 
      errorMessage.includes(err.toLowerCase())
    );
    
    // Check for HTTP status codes in error message
    const statusMatch = errorMessage.match(/status:?\s*(\d+)/);
    if (statusMatch) {
      const status = parseInt(statusMatch[1]);
      return status >= 500 || status === 408 || status === 429; // Server errors, timeout, rate limit
    }
    
    return isNetworkError;
  },
};

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on the last attempt
      if (attempt === opts.retries) {
        break;
      }

      // Check if we should retry this error
      if (!opts.shouldRetry(lastError)) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.delay * Math.pow(opts.backoff, attempt),
        opts.maxDelay
      );

      // Add some jitter to prevent thundering herd
      const jitter = Math.random() * 0.1 * delay;
      const finalDelay = delay + jitter;

      // Call retry callback
      opts.onRetry(lastError, attempt + 1);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, finalDelay));
    }
  }

  throw lastError!;
}

/**
 * Retry wrapper for API calls
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return ((...args: Parameters<T>) => {
    return retry(() => fn(...args), options);
  }) as T;
}

/**
 * React hook for retry functionality
 */
export function useRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [data, setData] = React.useState<T | null>(null);

  const execute = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await retry(fn, {
        ...options,
        onRetry: (error, attempt) => {
          console.log(`Retry attempt ${attempt} due to:`, error.message);
          options.onRetry?.(error, attempt);
        },
      });
      setData(result);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fn, options]);

  return {
    execute,
    loading,
    error,
    data,
    retry: execute,
  };
}

/**
 * Enhanced fetch with retry functionality
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  return retry(async () => {
    const response = await fetch(url, options);
    
    // Throw on HTTP errors to trigger retry
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  }, retryOptions);
}

/**
 * Circuit breaker pattern for API calls
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private options: {
      failureThreshold: number;
      timeoutDuration: number;
      resetTimeout: number;
    } = {
      failureThreshold: 5,
      timeoutDuration: 60000, // 1 minute
      resetTimeout: 30000, // 30 seconds
    }
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.options.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), this.options.timeoutDuration)
        ),
      ]);

      // Success - reset circuit breaker
      this.failures = 0;
      this.state = 'CLOSED';
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.options.failureThreshold) {
        this.state = 'OPEN';
      }

      throw error;
    }
  }

  getState() {
    return this.state;
  }

  reset() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
}

import React from 'react';