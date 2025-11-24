/**
 * Optimized mouse event handling for chart performance
 * Uses throttling, event pooling, and efficient calculations
 */

import MemoryManager from "../performance/memory-manager";

interface MouseEventData {
  x: number;
  y: number;
  button: number;
  timestamp: number;
  type: "move" | "down" | "up" | "wheel";
}

interface OptimizedMouseEventsConfig {
  onMouseMove?: (data: MouseEventData) => void;
  onMouseDown?: (data: MouseEventData) => void;
  onMouseUp?: (data: MouseEventData) => void;
  onWheel?: (data: MouseEventData & { deltaY: number }) => void;
  throttleInterval?: number;
  highPriorityThrottle?: number;
}

class OptimizedMouseEvents {
  private config: OptimizedMouseEventsConfig;
  private memoryManager: MemoryManager;
  private lastMouseMoveTime = 0;
  private lastWheelTime = 0;
  private isMouseDown = false;
  private animationFrame: number | null = null;
  private pendingMouseData: MouseEventData | null = null;

  // Throttle intervals (in milliseconds)
  private readonly MOUSE_MOVE_THROTTLE = 16; // ~60fps
  private readonly WHEEL_THROTTLE = 32; // ~30fps
  private readonly HIGH_PRIORITY_THROTTLE = 8; // ~120fps when dragging

  constructor(config: OptimizedMouseEventsConfig) {
    this.config = config;
    this.memoryManager = MemoryManager.getInstance();
  }

  /**
   * Handle mouse move events with intelligent throttling
   */
  handleMouseMove = (event: MouseEvent): void => {
    const now = performance.now();
    const throttleInterval = this.isMouseDown
      ? this.HIGH_PRIORITY_THROTTLE
      : this.config.throttleInterval || this.MOUSE_MOVE_THROTTLE;

    // Always update the pending mouse data
    this.pendingMouseData = {
      x: event.clientX,
      y: event.clientY,
      button: event.button,
      timestamp: now,
      type: "move",
    };

    // Throttle the actual handler execution
    if (now - this.lastMouseMoveTime >= throttleInterval) {
      this.executePendingMouseMove();
    } else if (!this.animationFrame) {
      // Schedule execution for the next frame if not already scheduled
      this.animationFrame = requestAnimationFrame(() => {
        this.executePendingMouseMove();
      });
    }
  };

  /**
   * Execute pending mouse move with latest data
   */
  private executePendingMouseMove(): void {
    if (this.pendingMouseData && this.config.onMouseMove) {
      this.config.onMouseMove(this.pendingMouseData);
      this.lastMouseMoveTime = performance.now();
      this.pendingMouseData = null;
    }

    if (this.animationFrame) {
      this.animationFrame = null;
    }
  }

  /**
   * Handle mouse down events
   */
  handleMouseDown = (event: MouseEvent): void => {
    this.isMouseDown = true;

    const data: MouseEventData = {
      x: event.clientX,
      y: event.clientY,
      button: event.button,
      timestamp: performance.now(),
      type: "down",
    };

    if (this.config.onMouseDown) {
      this.config.onMouseDown(data);
    }
  };

  /**
   * Handle mouse up events
   */
  handleMouseUp = (event: MouseEvent): void => {
    this.isMouseDown = false;

    const data: MouseEventData = {
      x: event.clientX,
      y: event.clientY,
      button: event.button,
      timestamp: performance.now(),
      type: "up",
    };

    if (this.config.onMouseUp) {
      this.config.onMouseUp(data);
    }
  };

  /**
   * Handle wheel events with throttling
   */
  handleWheel = (event: WheelEvent): void => {
    const now = performance.now();

    // Throttle wheel events to prevent overwhelming the system
    if (now - this.lastWheelTime < this.WHEEL_THROTTLE) {
      return;
    }

    this.lastWheelTime = now;

    const data = {
      x: event.clientX,
      y: event.clientY,
      button: 0,
      timestamp: now,
      type: "wheel" as const,
      deltaY: event.deltaY,
    };

    if (this.config.onWheel) {
      this.config.onWheel(data);
    }
  };

  /**
   * Attach optimized event listeners to an element
   */
  attachTo(element: HTMLElement): () => void {
    // Use passive listeners where possible for better performance
    element.addEventListener("mousemove", this.handleMouseMove, {
      passive: true,
    });
    element.addEventListener("mousedown", this.handleMouseDown, {
      passive: true,
    });
    element.addEventListener("mouseup", this.handleMouseUp, { passive: true });
    element.addEventListener("wheel", this.handleWheel, { passive: false }); // Not passive for wheel to allow preventDefault

    // Return cleanup function
    return () => {
      element.removeEventListener("mousemove", this.handleMouseMove);
      element.removeEventListener("mousedown", this.handleMouseDown);
      element.removeEventListener("mouseup", this.handleMouseUp);
      element.removeEventListener("wheel", this.handleWheel);
      this.cleanup();
    };
  }

  /**
   * Batch multiple mouse events together for efficiency
   */
  private batchEvents(events: MouseEventData[]): MouseEventData {
    // Return the latest event with combined information
    const latest = events[events.length - 1];
    return latest;
  }

  /**
   * Calculate relative coordinates efficiently
   */
  getRelativeCoordinates(
    event: MouseEvent,
    element: HTMLElement
  ): { x: number; y: number } {
    const rect = element.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  /**
   * Debounced helper for events that don't need immediate response
   */
  createDebouncedHandler<T extends (...args: any[]) => any>(
    handler: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    return this.memoryManager.debounce(handler, delay);
  }

  /**
   * Throttled helper for events that need regular updates
   */
  createThrottledHandler<T extends (...args: any[]) => any>(
    handler: T,
    interval: number
  ): (...args: Parameters<T>) => void {
    return this.memoryManager.throttle(handler, interval);
  }

  /**
   * Clean up resources and cancel pending operations
   */
  cleanup(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    this.pendingMouseData = null;
    this.isMouseDown = false;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<OptimizedMouseEventsConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    isMouseDown: boolean;
    hasPendingData: boolean;
    lastMouseMoveTime: number;
    lastWheelTime: number;
  } {
    return {
      isMouseDown: this.isMouseDown,
      hasPendingData: this.pendingMouseData !== null,
      lastMouseMoveTime: this.lastMouseMoveTime,
      lastWheelTime: this.lastWheelTime,
    };
  }
}

export default OptimizedMouseEvents;
export type { MouseEventData, OptimizedMouseEventsConfig };
