export interface FormData {
  name: string;
  symbol: string;
  icon: string | File | null;
  tokenType: string;
  blockchain: string;
  totalSupply: number;
  description: string;
  tokenDetails: {
    whitepaper: string;
    github: string;
    telegram: string;
    twitter: string;
    useOfFunds: string[];
  };
  teamMembers: {
    id: string;
    name: string;
    role: string;
    bio: string;
    avatar: string | File;
    linkedin: string;
    twitter: string;
    github: string;
    website: string;
  }[];
  roadmap: {
    id: string;
    title: string;
    description: string;
    date: Date | null;
    completed: boolean;
  }[];
  website: string;
  targetAmount: number;
  startDate: Date | null;
  phases: {
    id: string;
    name: string;
    tokenPrice: number;
    allocation: number;
    durationDays: number;
  }[];
  termsAccepted: boolean;
  selectedPlan: {
    id: string;
    name: string;
    price: number;
    maxTeamMembers: number;
    maxRoadmapItems: number;
    maxPhases: number;
    walletType: string;
    currency: string;
  } | null;
  paymentComplete: boolean;
}
