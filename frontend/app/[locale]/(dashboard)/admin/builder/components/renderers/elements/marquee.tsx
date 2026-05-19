"use client";

import { Icon } from "@iconify/react";
import React, { useEffect, useRef, type ReactNode, useState } from "react";

interface MarqueeProps {
  children: ReactNode;
  speed?: number; // pixels per second
  showGradients?: boolean;
  direction?: "ltr" | "rtl";
}

const Marquee: React.FC<MarqueeProps> = ({
  children,
  speed = 50,
  showGradients = true,
  direction = "rtl",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [hoveredSide, setHoveredSide] = useState<"left" | "right" | null>(null);
  const [currentPosition, setCurrentPosition] = useState(0);

  useEffect(() => {
    const updateAnimation = () => {
      if (containerRef.current && contentRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const contentWidth = contentRef.current.scrollWidth / 2;
        const duration = contentWidth / speed;

        containerRef.current.style.setProperty(
          "--animation-duration",
          `${duration}s`
        );
        containerRef.current.style.setProperty(
          "--content-width",
          `${contentWidth}px`
        );
      }
    };

    updateAnimation();
    window.addEventListener("resize", updateAnimation);
    return () => window.removeEventListener("resize", updateAnimation);
  }, [speed, children]);

  useEffect(() => {
    let animationFrame: number;
    let startTime: number;
    let previousTimestamp: number;

    const animate = (timestamp: number) => {
      if (hovered) return;

      if (!startTime) startTime = timestamp;
      if (!previousTimestamp) previousTimestamp = timestamp;

      const elapsed = timestamp - startTime;
      const delta = timestamp - previousTimestamp;

      const contentWidth =
        Number(
          containerRef.current?.style
            .getPropertyValue("--content-width")
            .replace("px", "")
        ) || 0;
      const duration =
        Number(
          containerRef.current?.style
            .getPropertyValue("--animation-duration")
            .replace("s", "")
        ) || 0;

      const pixelsPerMillisecond = contentWidth / (duration * 1000);
      let movement = pixelsPerMillisecond * delta * (hoveredSide ? 2 : 1);

      if (direction === "rtl") {
        movement = -movement;
      }

      setCurrentPosition((prevPosition) => {
        let newPosition = prevPosition + movement;
        if (newPosition <= -contentWidth) {
          newPosition += contentWidth;
        } else if (newPosition > 0) {
          newPosition -= contentWidth;
        }
        return newPosition;
      });

      previousTimestamp = timestamp;
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [hovered, hoveredSide, direction, speed]);

  const handleMouseEnter = () => {
    setHovered(true);
  };

  const handleMouseLeave = () => {
    setHovered(false);
  };

  const handleSideMouseEnter = (side: "left" | "right") => {
    setHoveredSide(side);
  };

  const handleSideMouseLeave = () => {
    setHoveredSide(null);
  };

  return (
    <div
      className="marquee-container relative overflow-hidden"
      ref={containerRef}
    >
      <style jsx>{`
        .marquee-content {
          display: flex;
          width: fit-content;
        }
        .marquee-item {
          transition: filter 0.3s ease;
        }
        .marquee-content:hover .marquee-item:not(:hover) {
          filter: blur(2px);
        }
      `}</style>
      <div
        className="marquee-content"
        ref={contentRef}
        style={{
          transform: `translateX(${currentPosition}px)`,
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {React.Children.map(children, (child, index) => (
          <div key={index} className="marquee-item">
            {child}
          </div>
        ))}
        {React.Children.map(children, (child, index) => (
          <div key={`dup-${index}`} className="marquee-item">
            {child}
          </div>
        ))}
      </div>
      {showGradients && (
        <>
          <div
            className="absolute top-0 bottom-0 left-0 w-40 z-50 flex items-center justify-center bg-linear-to-r from-white to-transparent dark:from-black dark:to-transparent pointer-events-auto"
            onMouseEnter={() => handleSideMouseEnter("left")}
            onMouseLeave={handleSideMouseLeave}
          >
            <Icon
              className={`text-black dark:text-white transition-opacity duration-300 ${
                hoveredSide === "left" ? "opacity-100" : "opacity-0"
              }`}
              icon="akar-icons:chevron-left"
              width="32"
              height="32"
            />
          </div>
          <div
            className="absolute top-0 bottom-0 right-0 w-40 z-50 flex items-center justify-center bg-linear-to-l from-white to-transparent dark:from-black dark:to-transparent pointer-events-auto"
            onMouseEnter={() => handleSideMouseEnter("right")}
            onMouseLeave={handleSideMouseLeave}
          >
            <Icon
              className={`text-black dark:text-white transition-opacity duration-300 ${
                hoveredSide === "right" ? "opacity-100" : "opacity-0"
              }`}
              icon="akar-icons:chevron-right"
              width="32"
              height="32"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default Marquee;
