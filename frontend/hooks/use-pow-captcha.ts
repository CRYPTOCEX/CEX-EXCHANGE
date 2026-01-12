"use client";

import { useState, useCallback, useRef } from "react";
import { $fetch } from "@/lib/api";

interface PowChallenge {
  enabled: boolean;
  challenge?: string;
  difficulty?: number;
  timestamp?: number;
  expiresIn?: number;
}

interface PowSolution {
  challenge: string;
  nonce: number;
  hash: string;
}

type PowAction = "login" | "register" | "reset";

/**
 * Solve a proof-of-work challenge using Web Workers for non-blocking computation
 */
async function solveChallenge(
  challenge: string,
  difficulty: number
): Promise<PowSolution> {
  return new Promise((resolve, reject) => {
    // Use a Web Worker for computation to avoid blocking the main thread
    const workerCode = `
      async function sha256(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }

      function hexToBinary(hex) {
        return hex.split('').map(c => parseInt(c, 16).toString(2).padStart(4, '0')).join('');
      }

      function checkDifficulty(hash, difficulty) {
        const binary = hexToBinary(hash);
        const leadingZeros = binary.match(/^0*/)?.[0].length || 0;
        return leadingZeros >= difficulty;
      }

      self.onmessage = async function(e) {
        const { challenge, difficulty, startNonce, batchSize } = e.data;
        let nonce = startNonce;
        const maxIterations = batchSize;

        for (let i = 0; i < maxIterations; i++) {
          const data = challenge + ':' + nonce;
          const hash = await sha256(data);

          if (checkDifficulty(hash, difficulty)) {
            self.postMessage({ found: true, nonce, hash });
            return;
          }
          nonce++;

          // Report progress every 10000 iterations
          if (i % 10000 === 0) {
            self.postMessage({ found: false, progress: nonce });
          }
        }

        self.postMessage({ found: false, nonce });
      };
    `;

    const blob = new Blob([workerCode], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    let currentNonce = 0;
    const batchSize = 100000; // Process in batches to allow progress updates

    worker.onmessage = (e) => {
      const { found, nonce, hash, progress } = e.data;

      if (found) {
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        resolve({ challenge, nonce, hash });
      } else if (progress !== undefined) {
        // Progress update, continue searching
      } else {
        // Batch complete, start next batch
        currentNonce = nonce;
        worker.postMessage({
          challenge,
          difficulty,
          startNonce: currentNonce,
          batchSize,
        });
      }
    };

    worker.onerror = (error) => {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      reject(new Error(`Worker error: ${error.message}`));
    };

    // Start the worker
    worker.postMessage({
      challenge,
      difficulty,
      startNonce: currentNonce,
      batchSize,
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      reject(new Error("Challenge solving timed out"));
    }, 30000);
  });
}

/**
 * Fallback solver for environments without Web Worker support
 */
async function solveChallengeSync(
  challenge: string,
  difficulty: number
): Promise<PowSolution> {
  let nonce = 0;
  const maxIterations = 10000000;

  const hexToBinary = (hex: string): string =>
    hex
      .split("")
      .map((c) => parseInt(c, 16).toString(2).padStart(4, "0"))
      .join("");

  const checkDifficulty = (hash: string, diff: number): boolean => {
    const binary = hexToBinary(hash);
    const leadingZeros = binary.match(/^0*/)?.[0].length || 0;
    return leadingZeros >= diff;
  };

  for (let i = 0; i < maxIterations; i++) {
    const data = `${challenge}:${nonce}`;
    const msgBuffer = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    if (checkDifficulty(hash, difficulty)) {
      return { challenge, nonce, hash };
    }
    nonce++;

    // Yield to prevent blocking (every 1000 iterations)
    if (i % 1000 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  throw new Error("Failed to solve challenge within iteration limit");
}

/**
 * Hook for using proof-of-work captcha
 */
export function usePowCaptcha() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const challengeRef = useRef<PowChallenge | null>(null);

  /**
   * Get a challenge for the specified action
   */
  const getChallenge = useCallback(async (action: PowAction): Promise<PowChallenge | null> => {
    try {
      const { data, error: fetchError } = await $fetch({
        url: `/api/auth/pow/challenge?action=${action}`,
        method: "GET",
        silent: true,
      });

      if (fetchError || !data) {
        console.warn("Failed to get PoW challenge:", fetchError);
        return null;
      }

      challengeRef.current = data;
      return data;
    } catch (err) {
      console.warn("Error getting PoW challenge:", err);
      return null;
    }
  }, []);

  /**
   * Solve a challenge and return the solution
   */
  const solveAndGetSolution = useCallback(
    async (action: PowAction): Promise<PowSolution | null> => {
      setIsLoading(true);
      setError(null);

      try {
        // Get a fresh challenge
        const challenge = await getChallenge(action);

        if (!challenge) {
          // PoW might be disabled or unavailable
          return null;
        }

        if (!challenge.enabled) {
          // PoW is disabled, no solution needed
          return null;
        }

        if (!challenge.challenge || !challenge.difficulty) {
          throw new Error("Invalid challenge received");
        }

        // Solve the challenge
        let solution: PowSolution;

        // Try Web Worker first, fallback to sync
        if (typeof Worker !== "undefined") {
          solution = await solveChallenge(
            challenge.challenge,
            challenge.difficulty
          );
        } else {
          solution = await solveChallengeSync(
            challenge.challenge,
            challenge.difficulty
          );
        }

        return solution;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to solve captcha";
        setError(errorMessage);
        console.error("PoW captcha error:", err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [getChallenge]
  );

  /**
   * Check if PoW is enabled (without fetching a challenge)
   */
  const checkEnabled = useCallback(async (): Promise<boolean> => {
    const challenge = await getChallenge("login");
    return challenge?.enabled ?? false;
  }, [getChallenge]);

  return {
    solveAndGetSolution,
    isLoading,
    error,
    checkEnabled,
  };
}

export type { PowSolution, PowAction };
