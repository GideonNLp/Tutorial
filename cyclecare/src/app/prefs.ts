import { DEFAULT_LOCALE, dictionaries, setLocale, type Locale } from '../i18n';

/**
 * Display preferences. They are not health data and must be readable before the vault is
 * unlocked (the lock screen follows the chosen theme and text size), so they live outside it.
 */
export type ThemePref = 'system' | 'light' | 'dark';
export type TextSize = 'small' | 'normal' | 'large' | 'xlarge';
/** Minutes in the background before the app locks; `never` = only when asked. */
export type AutoLock = 0 | 1 | 5 | 'never';

export interface Prefs {
  theme: ThemePref;
  textSize: TextSize;
  autoLock: AutoLock;
  locale: Locale;
  /** The person answered "not now" to the install invitation on the home screen. */
  installHintDismissed: boolean;
}

export const DEFAULT_PREFS: Prefs = { theme: 'system', textSize: 'normal', autoLock: 1, locale: DEFAULT_LOCALE, installHintDismissed: false };
export const TEXT_SCALE: Record<TextSize, number> = { small: 0.9, normal: 1, large: 1.15, xlarge: 1.3 };

const KEY = 'cyclecare.prefs';

export function loadPrefs(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Prefs>;
    return {
      theme: raw.theme === 'light' || raw.theme === 'dark' ? raw.theme : 'system',
      textSize: raw.textSize && raw.textSize in TEXT_SCALE ? raw.textSize : 'normal',
      autoLock: raw.autoLock === 0 || raw.autoLock === 5 || raw.autoLock === 'never' ? raw.autoLock : 1,
      locale: raw.locale && raw.locale in dictionaries ? raw.locale : DEFAULT_LOCALE,
      installHintDismissed: raw.installHintDismissed === true,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Storage blocked: the preference simply lasts for this session.
  }
}

export function clearPrefs(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
}

// A host page may already have chosen a theme for us; "system" hands control back to it.
const hostTheme = typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : null;

export function applyPrefs(prefs: Prefs): void {
  const root = document.documentElement;
  const theme = prefs.theme === 'system' ? hostTheme : prefs.theme;
  if (theme) root.setAttribute('data-theme', theme);
  else root.removeAttribute('data-theme');
  // Percentages keep the person's browser / OS text size as the base.
  root.style.fontSize = `${TEXT_SCALE[prefs.textSize] * 100}%`;
  setLocale(prefs.locale);
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
  if (bg) document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', bg));
}
