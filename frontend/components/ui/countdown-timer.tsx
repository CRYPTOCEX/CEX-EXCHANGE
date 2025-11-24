import React from 'react';
import { Timer, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCountdown } from '@/hooks/use-countdown';

interface CountdownTimerProps {
  endTime: string | Date | null | undefined;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'urgent' | 'critical';
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  endTime,
  className,
  showIcon = true,
  size = 'md',
  variant = 'default'
}) => {
  const { timeLeft, isExpired, isUrgent, isCritical, formatTime } = useCountdown(endTime);

  if (!endTime) {
    return null;
  }

  // Determine variant based on time left if not explicitly set
  const effectiveVariant = variant === 'default' 
    ? (isCritical ? 'critical' : isUrgent ? 'urgent' : 'default')
    : variant;

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const variantClasses = {
    default: 'text-muted-foreground',
    urgent: 'text-orange-500',
    critical: 'text-red-500 animate-pulse'
  };

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  if (isExpired) {
    return (
      <div className={cn(
        'flex items-center gap-1 text-red-500 font-medium',
        sizeClasses[size],
        className
      )}>
        {showIcon && <AlertTriangle className={iconSizeClasses[size]} />}
        <span>Auction Ended</span>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-center gap-1 font-mono',
      sizeClasses[size],
      variantClasses[effectiveVariant],
      className
    )}>
      {showIcon && <Timer className={iconSizeClasses[size]} />}
      <span>{formatTime()}</span>
      {isCritical && (
        <span className="text-xs font-sans text-red-600">
          (ending soon!)
        </span>
      )}
    </div>
  );
};

export default CountdownTimer;