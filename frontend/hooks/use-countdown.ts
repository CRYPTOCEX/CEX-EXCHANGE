import { useState, useEffect, useRef } from 'react';

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

const calculateTimeLeft = (endTime: string | Date): CountdownTime => {
  const difference = new Date(endTime).getTime() - new Date().getTime();
  
  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, total: difference };
};

export const useCountdown = (endTime: string | Date | null | undefined) => {
  const [timeLeft, setTimeLeft] = useState<CountdownTime>(() => 
    endTime ? calculateTimeLeft(endTime) : { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 }
  );
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!endTime) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });
      return;
    }

    // Update immediately
    setTimeLeft(calculateTimeLeft(endTime));

    // Set up interval for updates
    intervalRef.current = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(endTime);
      setTimeLeft(newTimeLeft);
      
      // Clear interval when countdown ends
      if (newTimeLeft.total <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, 1000);

    // Cleanup on unmount or when endTime changes
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [endTime]);

  const isExpired = timeLeft.total <= 0;
  const isUrgent = timeLeft.total > 0 && timeLeft.total <= 3600000; // Less than 1 hour
  const isCritical = timeLeft.total > 0 && timeLeft.total <= 900000; // Less than 15 minutes

  return {
    timeLeft,
    isExpired,
    isUrgent,
    isCritical,
    formatTime: () => {
      if (isExpired) return "Expired";
      
      if (timeLeft.days > 0) {
        return `${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m`;
      } else if (timeLeft.hours > 0) {
        return `${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s`;
      } else {
        return `${timeLeft.minutes}m ${timeLeft.seconds}s`;
      }
    }
  };
};