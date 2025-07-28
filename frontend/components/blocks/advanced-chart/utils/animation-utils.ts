// Animation utility functions
export function easeOutQuad(t: number): number {
  return t * (2 - t);
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function easeOutElastic(t: number): number {
  const p = 0.3;
  return Math.pow(2, -10 * t) * Math.sin(((t - p / 4) * (2 * Math.PI)) / p) + 1;
}

export function pulseAnimation(
  time: number,
  speed = 1,
  min = 0.6,
  max = 1
): number {
  // Creates a pulsing value between min and max
  const normalized = (Math.sin(time * speed) + 1) / 2;
  return min + normalized * (max - min);
}

export function flashAnimation(
  time: number,
  flashPoint: number,
  duration = 1000
): number {
  // Creates a flash effect that fades out over duration
  const elapsed = time - flashPoint;
  if (elapsed < 0 || elapsed > duration) return 0;
  return 1 - elapsed / duration;
}

export function countdownAnimation(remaining: number, total: number): number {
  // Animation intensity increases as countdown approaches zero
  const progress = remaining / total;
  return Math.max(0, 1 - Math.pow(progress, 2));
}
