"use client";

import { useState, useEffect, useRef } from "react";
import { animate, motion, useInView } from "framer-motion";

interface AnimatedCounterProps {
  from?: number;
  to: number;
  duration?: number;
  delay?: number;
  formatter?: (value: number) => string;
  className?: string;
}

export function AnimatedCounter({
  from = 0,
  to,
  duration = 2,
  delay = 0,
  formatter = (value: number) => value.toLocaleString(),
  className = "",
}: AnimatedCounterProps) {
  const [count, setCount] = useState(from);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  useEffect(() => {
    if (isInView) {
      const controls = animate(from, to, {
        duration,
        delay,
        onUpdate: (value) => setCount(value),
        ease: "easeOut",
      });

      return () => controls.stop();
    }
  }, [from, to, duration, delay, isInView]);

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
    >
      {formatter(Math.floor(count))}
    </motion.span>
  );
}

interface AnimatedPercentageProps {
  value: number;
  duration?: number;
  delay?: number;
  className?: string;
  positivePrefix?: string;
  negativePrefix?: string;
  suffix?: string;
  showSign?: boolean;
  decimalPlaces?: number;
}

export function AnimatedPercentage({
  value,
  duration = 1.5,
  delay = 0,
  className = "",
  positivePrefix = "+",
  negativePrefix = "",
  suffix = "%",
  showSign = true,
  decimalPlaces = 2,
}: AnimatedPercentageProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  useEffect(() => {
    if (isInView) {
      const controls = animate(0, value, {
        duration,
        delay,
        onUpdate: (val) => setDisplayValue(val),
        ease: "easeOut",
      });

      return () => controls.stop();
    }
  }, [value, duration, delay, isInView]);

  const formattedValue = displayValue.toFixed(decimalPlaces);
  const isPositive = value >= 0;
  const prefix = isPositive && showSign ? positivePrefix : negativePrefix;

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 5 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
    >
      {prefix}
      {formattedValue}
      {suffix}
    </motion.span>
  );
}
