"use client";
import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";

interface ScrollableSnapshotProps {
  src: string;
  alt: string;
  className?: string;
  scrollDuration?: number; // Duration in seconds for a full scroll
  fallbackSrc?: string; // Fallback image source if the main one fails
}

export function ScrollableSnapshot({
  src,
  alt,
  className = "",
  scrollDuration = 8, // Default to 8 seconds for full scroll
  fallbackSrc,
}: ScrollableSnapshotProps) {
  const t = useTranslations("dashboard");
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageHeight, setImageHeight] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Handle image load to get dimensions
  const handleImageLoad = () => {
    if (imageRef.current && containerRef.current) {
      setImageHeight(imageRef.current.naturalHeight);
      setContainerHeight(containerRef.current.clientHeight);
      setLoaded(true);
      setError(false);
    }
  };

  // Handle image error
  const handleImageError = () => {
    console.error("Failed to load image:", src);
    setError(true);
    setLoaded(false);
  };

  // Handle mouse enter/leave
  const handleMouseEnter = () => setIsHovering(true);
  const handleMouseLeave = () => setIsHovering(false);

  // Animation function for smooth scrolling
  const animateScroll = (timestamp: number) => {
    if (!imageRef.current || !containerRef.current) return;

    // Initialize start time on first animation frame
    if (startTimeRef.current === null) {
      startTimeRef.current = timestamp;
    }

    // Calculate elapsed time
    const elapsed = timestamp - startTimeRef.current;

    // Calculate total scrollable distance
    const scrollableHeight = imageHeight - containerHeight;

    // Don't scroll if image is shorter than container
    if (scrollableHeight <= 0) return;

    // Calculate scroll progress (0 to 1) based on elapsed time and duration
    const scrollDurationMs = scrollDuration * 1000;
    const progress = Math.min(elapsed / scrollDurationMs, 1);

    // Apply scroll position with easing
    const scrollTop = progress * scrollableHeight;
    imageRef.current.style.transform = `translateY(-${scrollTop}px)`;

    // Continue animation if not complete
    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animateScroll);
    }
  };

  // Start/stop animation based on hover state
  useEffect(() => {
    if (isHovering && imageHeight > containerHeight) {
      // Reset start time
      startTimeRef.current = null;

      // Start animation
      animationRef.current = requestAnimationFrame(animateScroll);
    } else if (imageRef.current) {
      // Cancel any ongoing animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      // Reset position to top
      imageRef.current.style.transform = "translateY(0)";
    }

    // Cleanup on unmount or when hover state changes
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isHovering, imageHeight, containerHeight]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="animate-pulse text-muted-foreground text-sm">
            {t("Loading")}.
          </div>
        </div>
      )}

      {error && fallbackSrc && (
        <img
          src={fallbackSrc || "/placeholder.svg"}
          alt={alt}
          className="w-full h-full object-cover"
        />
      )}

      {!error && (
        <img
          ref={imageRef}
          src={src || "/placeholder.svg"}
          alt={alt}
          className="w-full transition-transform duration-300"
          style={{
            objectFit: "cover",
            objectPosition: "top",
            height: "auto",
            maxWidth: "100%",
            display: error ? "none" : "block",
          }}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}

      {isHovering && imageHeight > containerHeight && !error && (
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {t("Auto-scrolling")}
        </div>
      )}
    </div>
  );
}
