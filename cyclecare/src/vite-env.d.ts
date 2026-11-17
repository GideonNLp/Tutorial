/// <reference types="vite/client" />
declare const __APP_VERSION__: string;
declare const __PREVIEW__: boolean;
/** Where the partner relay answers; empty when Partner mode is not available in this build. */
declare const __PARTNER_SYNC_URL__: string;

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string;
  readonly VITE_OPERATOR_NAME?: string;
  readonly VITE_OPERATOR_ADDRESS?: string;
  readonly VITE_OPERATOR_REGISTRATION?: string;
  readonly VITE_CONTACT_EMAIL?: string;
  readonly VITE_DPO_CONTACT?: string;
  readonly VITE_LEGAL_REVIEWED?: string;
  readonly VITE_PARTNER_SYNC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
