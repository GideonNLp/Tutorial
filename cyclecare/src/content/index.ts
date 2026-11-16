import { getLocale, type Locale } from '../i18n';
import * as roLegal from './ro/legal';
import * as roTips from './ro/tips';

/**
 * Long-form content (tips, legal texts) per locale. A new language adds a folder next to `ro/`
 * with the same two modules and one line here.
 */
const contents = {
  ro: { tips: roTips, legal: roLegal },
} satisfies Record<Locale, { tips: typeof roTips; legal: typeof roLegal }>;

export function content() {
  return contents[getLocale()];
}

export type { Tip, TipCategory } from './ro/tips';
export { TIP_CATEGORIES } from './ro/tips';
