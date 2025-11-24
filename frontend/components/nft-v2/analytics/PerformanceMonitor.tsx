"use client";

import { useEffect } from "react";

interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
}

export default function PerformanceMonitor() {
  useEffect(() => {
    if (typeof window === "undefined" || !window.performance) return;

    const metrics: PerformanceMetrics = {};

    // Measure First Contentful Paint (FCP)
    const measureFCP = () => {
      const perfEntries = performance.getEntriesByName("first-contentful-paint");
      if (perfEntries.length > 0) {
        metrics.fcp = perfEntries[0].startTime;
        console.log(`[Performance] FCP: ${metrics.fcp.toFixed(2)}ms`);
      }
    };

    // Measure Largest Contentful Paint (LCP)
    const measureLCP = () => {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          metrics.lcp = lastEntry.renderTime || lastEntry.loadTime;
          console.log(`[Performance] LCP: ${metrics.lcp.toFixed(2)}ms`);

          // Good: < 2.5s, Needs improvement: 2.5-4s, Poor: > 4s
          if (metrics.lcp < 2500) {
            console.log("[Performance] ✅ LCP is Good");
          } else if (metrics.lcp < 4000) {
            console.log("[Performance] ⚠️ LCP needs improvement");
          } else {
            console.log("[Performance] ❌ LCP is Poor");
          }
        });

        observer.observe({ type: "largest-contentful-paint", buffered: true });
      } catch (error) {
        console.log("[Performance] LCP observation not supported");
      }
    };

    // Measure First Input Delay (FID)
    const measureFID = () => {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries() as any[];
          entries.forEach((entry) => {
            metrics.fid = entry.processingStart - entry.startTime;
            console.log(`[Performance] FID: ${metrics.fid.toFixed(2)}ms`);

            // Good: < 100ms, Needs improvement: 100-300ms, Poor: > 300ms
            if (metrics.fid < 100) {
              console.log("[Performance] ✅ FID is Good");
            } else if (metrics.fid < 300) {
              console.log("[Performance] ⚠️ FID needs improvement");
            } else {
              console.log("[Performance] ❌ FID is Poor");
            }
          });
        });

        observer.observe({ type: "first-input", buffered: true });
      } catch (error) {
        console.log("[Performance] FID observation not supported");
      }
    };

    // Measure Cumulative Layout Shift (CLS)
    const measureCLS = () => {
      try {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries() as any[];
          entries.forEach((entry) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          metrics.cls = clsValue;
          console.log(`[Performance] CLS: ${metrics.cls.toFixed(4)}`);

          // Good: < 0.1, Needs improvement: 0.1-0.25, Poor: > 0.25
          if (metrics.cls < 0.1) {
            console.log("[Performance] ✅ CLS is Good");
          } else if (metrics.cls < 0.25) {
            console.log("[Performance] ⚠️ CLS needs improvement");
          } else {
            console.log("[Performance] ❌ CLS is Poor");
          }
        });

        observer.observe({ type: "layout-shift", buffered: true });
      } catch (error) {
        console.log("[Performance] CLS observation not supported");
      }
    };

    // Measure Time to First Byte (TTFB)
    const measureTTFB = () => {
      const navTiming = performance.getEntriesByType("navigation")[0] as any;
      if (navTiming) {
        metrics.ttfb = navTiming.responseStart - navTiming.requestStart;
        console.log(`[Performance] TTFB: ${metrics.ttfb.toFixed(2)}ms`);

        // Good: < 800ms, Needs improvement: 800-1800ms, Poor: > 1800ms
        if (metrics.ttfb < 800) {
          console.log("[Performance] ✅ TTFB is Good");
        } else if (metrics.ttfb < 1800) {
          console.log("[Performance] ⚠️ TTFB needs improvement");
        } else {
          console.log("[Performance] ❌ TTFB is Poor");
        }
      }
    };

    // Measure page load time
    const measurePageLoad = () => {
      const navTiming = performance.getEntriesByType("navigation")[0] as any;
      if (navTiming) {
        const pageLoadTime = navTiming.loadEventEnd - navTiming.fetchStart;
        console.log(`[Performance] Page Load Time: ${pageLoadTime.toFixed(2)}ms`);

        // Report all metrics
        console.log("[Performance] Summary:", metrics);
      }
    };

    // Wait for page to be fully loaded
    if (document.readyState === "complete") {
      measureFCP();
      measureTTFB();
      measurePageLoad();
    } else {
      window.addEventListener("load", () => {
        measureFCP();
        measureTTFB();
        measurePageLoad();
      });
    }

    // Start observers
    measureLCP();
    measureFID();
    measureCLS();

    // Optional: Send metrics to analytics service
    const sendMetrics = () => {
      // You can send metrics to your analytics service here
      // Example: analytics.track('performance', metrics);
      if (process.env.NODE_ENV === "production") {
        // Send to analytics service
        console.log("[Performance] Sending metrics to analytics...");
      }
    };

    // Send metrics after 5 seconds
    const timeout = setTimeout(sendMetrics, 5000);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  return null; // This component doesn't render anything
}
