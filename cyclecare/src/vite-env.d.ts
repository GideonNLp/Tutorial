/// <reference types="vite/client" />
declare const __APP_VERSION__: string;
declare const __PREVIEW__: boolean;

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string;
  readonly VITE_OPERATOR_NAME?: string;
  readonly VITE_OPERATOR_ADDRESS?: string;
  readonly VITE_OPERATOR_REGISTRATION?: string;
  readonly VITE_CONTACT_EMAIL?: string;
  readonly VITE_DPO_CONTACT?: string;
  readonly VITE_LEGAL_REVIEWED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
