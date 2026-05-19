// Common components (used by all page editors)
export { SectionCard } from './section-card';
export { FullScreenEditor } from './full-screen-editor';
export { LegalTemplateWizard } from './legal-template-wizard';

// Home page section editors (organized in /home folder)
export {
  HeroSectionEditor,
  FeaturesSectionEditor,
  GlobalSectionEditor,
  GettingStartedEditor,
  CTASectionEditor,
  MarketSectionEditor,
  TickerSectionEditor,
  MobileAppSectionEditor,
  ExtensionSectionsEditor,
} from './home';

// Type exports
export type { EditorProps, Feature, Stat, Step, HeroVariables, FeaturesVariables, GlobalVariables, GettingStartedVariables, CTAVariables } from './types'; 