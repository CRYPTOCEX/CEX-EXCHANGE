export interface EditorProps {
  variables: any;
  getValue: (path: string) => any;
  updateVariable: (path: string, value: any) => void;
}

export interface Feature {
  title: string;
  description: string;
  icon: string;
  gradient: string;
  bg?: string;
}

export interface Stat {
  label: string;
  value: string;
}

export interface Step {
  step: string;
  title: string;
  description: string;
  icon: string;
  gradient: string;
}

export interface HeroVariables {
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  cta: string;
  features: string[];
}

export interface FeaturesVariables {
  featuresSection: {
    badge: string;
    title: string;
    subtitle: string;
    description: string;
  };
  features: Feature[];
}

export interface GlobalVariables {
  globalSection: {
    badge: string;
    title: string;
    subtitle: string;
    description: string;
    stats: Stat[];
    platformFeatures: {
      title: string;
      items: string[];
    };
  };
}

export interface GettingStartedVariables {
  gettingStarted: {
    badge: string;
    title: string;
    subtitle: string;
    steps: Step[];
  };
}

export interface CTAVariables {
  cta: {
    badge: string;
    title: string;
    description: string;
    button: string;
    buttonUser?: string;
    features: string[];
    featuresUser?: string[];
  };
} 