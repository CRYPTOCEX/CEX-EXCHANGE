/**
 * Tests for cleanup-utils.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  CleanupRegistry,
  createManagedInterval,
  createManagedTimeout,
  createDebouncedFn,
  createThrottledFn,
  SubscriptionManager,
  createMountedTracker,
} from "./cleanup-utils";

describe("CleanupRegistry", () => {
  let registry: CleanupRegistry;

  beforeEach(() => {
    registry = new CleanupRegistry();
    vi.useFakeTimers();
  });

  afterEach(() => {
    registry.cleanup();
    vi.useRealTimers();
  });

  describe("register", () => {
    it("should register a cleanup function", () => {
      const cleanup = vi.fn();
      registry.register(cleanup);
      expect(registry.size).toBe(1);
    });

    it("should return an unregister function", () => {
      const cleanup = vi.fn();
      const unregister = registry.register(cleanup);
      expect(registry.size).toBe(1);
      unregister();
      expect(registry.size).toBe(0);
    });

    it("should call cleanup function on cleanup", () => {
      const cleanup = vi.fn();
      registry.register(cleanup);
      registry.cleanup();
      expect(cleanup).toHaveBeenCalledTimes(1);
    });
  });

  describe("addInterval", () => {
    it("should create an interval", () => {
      const callback = vi.fn();
      registry.addInterval(callback, 100);

      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it("should clean up the interval on cleanup", () => {
      const callback = vi.fn();
      registry.addInterval(callback, 100);

      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(1);

      registry.cleanup();

      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(1); // Should not be called again
    });
  });

  describe("addTimeout", () => {
    it("should create a timeout", () => {
      const callback = vi.fn();
      registry.addTimeout(callback, 100);

      expect(callback).not.toHaveBeenCalled();
      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should clean up the timeout on cleanup", () => {
      const callback = vi.fn();
      registry.addTimeout(callback, 100);

      registry.cleanup();

      vi.advanceTimersByTime(100);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("cleanup", () => {
    it("should call all cleanup functions", () => {
      const cleanup1 = vi.fn();
      const cleanup2 = vi.fn();
      const cleanup3 = vi.fn();

      registry.register(cleanup1);
      registry.register(cleanup2);
      registry.register(cleanup3);

      registry.cleanup();

      expect(cleanup1).toHaveBeenCalledTimes(1);
      expect(cleanup2).toHaveBeenCalledTimes(1);
      expect(cleanup3).toHaveBeenCalledTimes(1);
    });

    it("should clear all registered functions after cleanup", () => {
      registry.register(vi.fn());
      registry.register(vi.fn());

      expect(registry.size).toBe(2);
      registry.cleanup();
      expect(registry.size).toBe(0);
    });

    it("should handle errors during cleanup gracefully", () => {
      const errorCleanup = vi.fn(() => {
        throw new Error("Test error");
      });
      const normalCleanup = vi.fn();

      registry.register(errorCleanup);
      registry.register(normalCleanup);

      // Should not throw
      expect(() => registry.cleanup()).not.toThrow();

      // Both should have been attempted
      expect(errorCleanup).toHaveBeenCalled();
      expect(normalCleanup).toHaveBeenCalled();
    });

    it("should prevent re-entry during cleanup", () => {
      let cleanupCallCount = 0;

      registry.register(() => {
        cleanupCallCount++;
        // Try to trigger another cleanup from within cleanup
        registry.cleanup();
      });

      registry.cleanup();

      // Should only be called once
      expect(cleanupCallCount).toBe(1);
    });
  });
});

describe("createManagedInterval", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should start and stop the interval", () => {
    const callback = vi.fn();
    const interval = createManagedInterval(callback, 100);

    expect(interval.isRunning()).toBe(false);

    interval.start();
    expect(interval.isRunning()).toBe(true);

    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(1);

    interval.stop();
    expect(interval.isRunning()).toBe(false);

    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(1); // No additional calls
  });

  it("should restart the interval", () => {
    const callback = vi.fn();
    const interval = createManagedInterval(callback, 100);

    interval.start();
    vi.advanceTimersByTime(50); // Advance halfway

    interval.restart();

    vi.advanceTimersByTime(50); // 50ms after restart
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50); // 100ms after restart
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("should not start twice", () => {
    const callback = vi.fn();
    const interval = createManagedInterval(callback, 100);

    interval.start();
    interval.start(); // Should be ignored

    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(1); // Only one interval running
  });
});

describe("createManagedTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should start and complete the timeout", () => {
    const callback = vi.fn();
    const timeout = createManagedTimeout(callback, 100);

    expect(timeout.isPending()).toBe(false);

    timeout.start();
    expect(timeout.isPending()).toBe(true);

    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(timeout.isPending()).toBe(false);
  });

  it("should cancel the timeout", () => {
    const callback = vi.fn();
    const timeout = createManagedTimeout(callback, 100);

    timeout.start();
    expect(timeout.isPending()).toBe(true);

    timeout.cancel();
    expect(timeout.isPending()).toBe(false);

    vi.advanceTimersByTime(100);
    expect(callback).not.toHaveBeenCalled();
  });

  it("should restart the timeout", () => {
    const callback = vi.fn();
    const timeout = createManagedTimeout(callback, 100);

    timeout.start();
    vi.advanceTimersByTime(50);

    timeout.restart();

    vi.advanceTimersByTime(50);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

describe("createDebouncedFn", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should debounce function calls", () => {
    const fn = vi.fn();
    const debounced = createDebouncedFn(fn, 100);

    debounced();
    debounced();
    debounced();

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should cancel pending calls", () => {
    const fn = vi.fn();
    const debounced = createDebouncedFn(fn, 100);

    debounced();
    debounced.cancel();

    vi.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();
  });

  it("should flush pending calls immediately", () => {
    const fn = vi.fn();
    const debounced = createDebouncedFn(fn, 100);

    debounced("arg1", "arg2");
    debounced.flush();

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("arg1", "arg2");

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1); // No additional calls
  });
});

describe("createThrottledFn", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should throttle function calls", () => {
    const fn = vi.fn();
    const throttled = createThrottledFn(fn, 100);

    throttled(); // Should execute immediately
    expect(fn).toHaveBeenCalledTimes(1);

    throttled(); // Should be throttled
    throttled(); // Should be throttled
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2); // Scheduled call executes
  });

  it("should cancel pending calls", () => {
    const fn = vi.fn();
    const throttled = createThrottledFn(fn, 100);

    throttled(); // Immediate
    throttled(); // Scheduled

    throttled.cancel();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1); // Only the immediate call
  });
});

describe("SubscriptionManager", () => {
  let manager: SubscriptionManager;

  beforeEach(() => {
    manager = new SubscriptionManager();
  });

  afterEach(() => {
    manager.cleanup();
  });

  it("should add subscriptions", () => {
    const unsubscribe = vi.fn();
    manager.subscribe("test", unsubscribe);
    expect(manager.size).toBe(1);
    expect(manager.has("test")).toBe(true);
  });

  it("should remove subscriptions", () => {
    const unsubscribe = vi.fn();
    manager.subscribe("test", unsubscribe);

    manager.unsubscribe("test");

    expect(manager.size).toBe(0);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("should replace existing subscription with same key", () => {
    const unsubscribe1 = vi.fn();
    const unsubscribe2 = vi.fn();

    manager.subscribe("test", unsubscribe1);
    manager.subscribe("test", unsubscribe2);

    expect(manager.size).toBe(1);
    expect(unsubscribe1).toHaveBeenCalledTimes(1); // Old one was cleaned up
    expect(unsubscribe2).not.toHaveBeenCalled();
  });

  it("should cleanup all subscriptions", () => {
    const unsub1 = vi.fn();
    const unsub2 = vi.fn();
    const unsub3 = vi.fn();

    manager.subscribe("a", unsub1);
    manager.subscribe("b", unsub2);
    manager.subscribe("c", unsub3);

    manager.cleanup();

    expect(unsub1).toHaveBeenCalledTimes(1);
    expect(unsub2).toHaveBeenCalledTimes(1);
    expect(unsub3).toHaveBeenCalledTimes(1);
    expect(manager.size).toBe(0);
  });

  it("should handle errors during cleanup gracefully", () => {
    const errorUnsub = vi.fn(() => {
      throw new Error("Test error");
    });
    const normalUnsub = vi.fn();

    manager.subscribe("error", errorUnsub);
    manager.subscribe("normal", normalUnsub);

    expect(() => manager.cleanup()).not.toThrow();
    expect(errorUnsub).toHaveBeenCalled();
    expect(normalUnsub).toHaveBeenCalled();
  });
});

describe("createMountedTracker", () => {
  it("should track mounted state", () => {
    const tracker = createMountedTracker();

    expect(tracker.isMounted()).toBe(false);

    tracker.setMounted(true);
    expect(tracker.isMounted()).toBe(true);

    tracker.setMounted(false);
    expect(tracker.isMounted()).toBe(false);
  });

  it("should reset on cleanup", () => {
    const tracker = createMountedTracker();

    tracker.setMounted(true);
    expect(tracker.isMounted()).toBe(true);

    tracker.cleanup();
    expect(tracker.isMounted()).toBe(false);
  });
});
