"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

interface CountdownTimerProps {
  targetDate: Date;
}

export function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const t = useTranslations("ext");
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(targetDate));

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);

    return () => clearTimeout(timer);
  });

  if (timeLeft.total <= 0) {
    return (
      <span className="font-medium text-primary">{t("starting_now")}</span>
    );
  }

  return (
    <span className="font-medium">
      {timeLeft.days > 0 && `${timeLeft.days}d `}
      {timeLeft.hours}
      h
      {timeLeft.minutes}
      m
      {timeLeft.seconds}
      s
    </span>
  );
}

function calculateTimeLeft(targetDate: Date) {
  const difference = +targetDate - +new Date();
  let timeLeft = {
    total: difference,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  };

  if (difference > 0) {
    timeLeft = {
      total: difference,
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }

  return timeLeft;
}
