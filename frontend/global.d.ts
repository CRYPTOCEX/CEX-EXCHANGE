// Custom i18n type augmentation
import type { Namespace } from '@/i18n/types';

// SVG module declarations
declare module "*.svg" {
  import * as React from "react";
  const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}

// Global types
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }

  namespace JSX {
    interface IntrinsicElements {
      /**
       * The AppKit button web component. Registered globally by AppKit.
       */
      'appkit-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        disabled?: boolean;
        balance?: 'show' | 'hide';
        size?: 'md' | 'sm';
        label?: string;
        loadingLabel?: string;
        namespace?: 'eip155' | 'solana' | 'bip122';
      };
      'appkit-account-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        disabled?: boolean;
        balance?: 'show' | 'hide';
      };
      'appkit-connect-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        size?: 'md' | 'sm';
        label?: string;
        loadingLabel?: string;
      };
      'appkit-network-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        disabled?: boolean;
      };
    }
  }
}

export {};
