import { logger } from "@b/utils/console";

/**
 * CircuitBreaker - Emergency stop mechanism
 *
 * Provides emergency controls to immediately halt trading
 * when critical conditions are detected.
 */
export class CircuitBreaker {
  private tripped: boolean = false;
  private tripReason: string = "";
  private tripTime: Date | null = null;
  private cooldownPeriodMs: number = 30 * 60 * 1000; // 30 minutes default

  // Trip history
  private tripHistory: { reason: string; time: Date }[] = [];

  /**
   * Trip the circuit breaker
   */
  public trip(reason: string): void {
    if (this.tripped) {
      return; // Already tripped
    }

    this.tripped = true;
    this.tripReason = reason;
    this.tripTime = new Date();

    // Record in history
    this.tripHistory.push({
      reason,
      time: new Date(),
    });

    // Keep only last 10 trips
    if (this.tripHistory.length > 10) {
      this.tripHistory = this.tripHistory.slice(-10);
    }

    logger.error("AI_MM", `Circuit breaker TRIPPED: ${reason}`);
  }

  /**
   * Reset the circuit breaker
   */
  public reset(): void {
    this.tripped = false;
    this.tripReason = "";
    this.tripTime = null;

    logger.info("AI_MM", "Circuit breaker reset");
  }

  /**
   * Check if circuit breaker is tripped
   */
  public isTripped(): boolean {
    // Auto-reset after cooldown period
    if (this.tripped && this.tripTime) {
      const elapsed = Date.now() - this.tripTime.getTime();
      if (elapsed >= this.cooldownPeriodMs) {
        logger.info("AI_MM", "Circuit breaker auto-reset after cooldown");
        this.reset();
      }
    }

    return this.tripped;
  }

  /**
   * Get trip reason
   */
  public getTripReason(): string {
    return this.tripReason;
  }

  /**
   * Get trip time
   */
  public getTripTime(): Date | null {
    return this.tripTime;
  }

  /**
   * Get remaining cooldown time in milliseconds
   */
  public getRemainingCooldown(): number {
    if (!this.tripped || !this.tripTime) {
      return 0;
    }

    const elapsed = Date.now() - this.tripTime.getTime();
    const remaining = this.cooldownPeriodMs - elapsed;

    return Math.max(0, remaining);
  }

  /**
   * Set cooldown period
   */
  public setCooldownPeriod(ms: number): void {
    this.cooldownPeriodMs = ms;
  }

  /**
   * Get trip history
   */
  public getTripHistory(): { reason: string; time: Date }[] {
    return [...this.tripHistory];
  }

  /**
   * Get status
   */
  public getStatus(): {
    tripped: boolean;
    reason: string;
    tripTime: Date | null;
    remainingCooldown: number;
  } {
    return {
      tripped: this.tripped,
      reason: this.tripReason,
      tripTime: this.tripTime,
      remainingCooldown: this.getRemainingCooldown(),
    };
  }
}

export default CircuitBreaker;
