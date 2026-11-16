/**
 * Build-time configuration. Every value comes from a `VITE_*` environment variable
 * (see `.env.example`) and has a default, so the app builds and runs with no configuration at all.
 * Nothing here is secret: these values end up in the files served to the browser.
 * (Each variable is read as `import.meta.env.VITE_…` in full, so the build can inline it.)
 */
const text = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

/** The product name shown everywhere in the interface, the manifest and the generated files. */
export const APP_NAME = text(import.meta.env.VITE_APP_NAME) ?? 'CycleCare';

/** The name as it can appear in a file name. */
export const APP_FILE_NAME = APP_NAME.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'app';

/** Who offers the app. Shown in the privacy statement; unset fields stay visible as blanks to fill in. */
export const OPERATOR = {
  name: text(import.meta.env.VITE_OPERATOR_NAME),
  address: text(import.meta.env.VITE_OPERATOR_ADDRESS),
  registration: text(import.meta.env.VITE_OPERATOR_REGISTRATION),
  email: text(import.meta.env.VITE_CONTACT_EMAIL),
  /** Contact details of the data protection officer, when one is appointed. */
  dpo: text(import.meta.env.VITE_DPO_CONTACT),
};

/** Set to `true` once a lawyer has approved the consent and privacy texts: it removes the "draft" notice. */
export const LEGAL_REVIEWED = import.meta.env.VITE_LEGAL_REVIEWED === 'true';
