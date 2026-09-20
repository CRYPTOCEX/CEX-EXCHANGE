/**
 * How long a queued item may wait before it counts as late.
 *
 * MIRRORS `backend/src/utils/sla.ts`. Change one, change the other — the
 * dashboard health card and the row that caused its warning must agree, or the
 * badge is worse than no badge.
 *
 * These numbers were not invented here: they were already hardcoded inside
 * `api/admin/system/health/batch.get.ts`, where the only way to learn a
 * withdrawal had been pending for eight days was a single amber dot on the
 * dashboard. The queue itself said nothing.
 */
export const SLA_HOURS = {
  transaction: 72,
  withdrawal: 24 * 7,
  deposit: 72,
  transfer: 72,
  kyc: 24 * 7,
  support: 24,
  /** Addon queues — see the backend file for what each budget is measuring. */
  dispute: 24,
  order: 48,
  approval: 72,
} as const;

export type SlaKey = keyof typeof SLA_HOURS;

export type SlaLevel = "fresh" | "due" | "breached";

/**
 * Where an item sits against its SLA.
 *
 * `due` starts at half the budget rather than at some fixed hour count: a
 * 24-hour support SLA and a 7-day KYC SLA both want "getting on" to mean the
 * same fraction of the time available, not the same number of hours.
 */
export function slaLevel(
  createdAt: string | number | Date,
  key: SlaKey,
  now: number = Date.now()
): { level: SlaLevel; hours: number; budgetHours: number } {
  const budgetHours = SLA_HOURS[key];
  const started = new Date(createdAt).getTime();
  if (!Number.isFinite(started)) {
    return { level: "fresh", hours: 0, budgetHours };
  }
  const hours = Math.max(0, (now - started) / (1000 * 60 * 60));
  const level: SlaLevel =
    hours >= budgetHours ? "breached" : hours >= budgetHours / 2 ? "due" : "fresh";
  return { level, hours, budgetHours };
}

export function formatDuration(hours: number): string {
  if (hours < 1) {
    const minutes = Math.max(1, Math.round(hours * 60));
    return `${minutes}m`;
  }
  if (hours < 48) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}
