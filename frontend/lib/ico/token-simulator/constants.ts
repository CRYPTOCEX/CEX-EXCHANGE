import { CHART_RAMP } from "@/components/ui/chart/tokens";
import type {
  TokenDistribution,
  VestingSchedule,
  SimulatorState,
} from "./types";

/**
 * Segment colours for the tokenomics donut.
 *
 * Reuses the shared categorical ramp rather than declaring a tenth private
 * palette — that ramp is the only place chart hues are defined, and it is
 * token-based, so these follow the theme instead of being pinned to the eight
 * Tailwind-default hexes that used to live here.
 *
 * The ramp has SIX slots and the default distribution has EIGHT segments, so
 * slots 7 and 8 repeat. That is acceptable here specifically because every
 * segment is directly labelled with its name and percentage — colour reinforces
 * identity rather than carrying it. A donut where colour were the only encoding
 * would have to fold the tail into "Other" instead.
 */
export const DISTRIBUTION_COLORS = Array.from(
  { length: 8 },
  (_, i) => CHART_RAMP[i % CHART_RAMP.length]
);

export const INITIAL_DISTRIBUTION: TokenDistribution[] = [
  { name: "Public Sale", value: 15, color: DISTRIBUTION_COLORS[0] },
  { name: "Private Sale", value: 10, color: DISTRIBUTION_COLORS[1] },
  { name: "Team", value: 20, color: DISTRIBUTION_COLORS[2] },
  { name: "Advisors", value: 5, color: DISTRIBUTION_COLORS[3] },
  { name: "Marketing", value: 10, color: DISTRIBUTION_COLORS[4] },
  { name: "Development", value: 15, color: DISTRIBUTION_COLORS[5] },
  { name: "Ecosystem", value: 15, color: DISTRIBUTION_COLORS[6] },
  { name: "Reserve", value: 10, color: DISTRIBUTION_COLORS[7] },
];

export const INITIAL_VESTING_SCHEDULES: VestingSchedule[] = [
  {
    id: "1",
    name: "Public Sale",
    allocation: 15,
    initialUnlock: 30,
    cliffMonths: 0,
    vestingMonths: 6,
    color: DISTRIBUTION_COLORS[0],
  },
  {
    id: "2",
    name: "Private Sale",
    allocation: 10,
    initialUnlock: 10,
    cliffMonths: 1,
    vestingMonths: 12,
    color: DISTRIBUTION_COLORS[1],
  },
  {
    id: "3",
    name: "Team",
    allocation: 20,
    initialUnlock: 0,
    cliffMonths: 6,
    vestingMonths: 24,
    color: DISTRIBUTION_COLORS[2],
  },
  {
    id: "4",
    name: "Advisors",
    allocation: 5,
    initialUnlock: 0,
    cliffMonths: 3,
    vestingMonths: 18,
    color: DISTRIBUTION_COLORS[3],
  },
  {
    id: "5",
    name: "Marketing",
    allocation: 10,
    initialUnlock: 20,
    cliffMonths: 0,
    vestingMonths: 12,
    color: DISTRIBUTION_COLORS[4],
  },
  {
    id: "6",
    name: "Development",
    allocation: 15,
    initialUnlock: 10,
    cliffMonths: 3,
    vestingMonths: 24,
    color: DISTRIBUTION_COLORS[5],
  },
  {
    id: "7",
    name: "Ecosystem",
    allocation: 15,
    initialUnlock: 5,
    cliffMonths: 1,
    vestingMonths: 36,
    color: DISTRIBUTION_COLORS[6],
  },
  {
    id: "8",
    name: "Reserve",
    allocation: 10,
    initialUnlock: 0,
    cliffMonths: 12,
    vestingMonths: 36,
    color: DISTRIBUTION_COLORS[7],
  },
];

export const INITIAL_STATE: SimulatorState = {
  totalSupply: 100000000,
  initialPrice: 0.05,
  distribution: INITIAL_DISTRIBUTION,
  vestingSchedules: INITIAL_VESTING_SCHEDULES,
  growthRate: 5, // Monthly growth rate in %
  volatility: 20, // Volatility factor
  projectionMonths: 36, // 3 years
};
