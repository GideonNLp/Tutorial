/**
 * Short vibration for actions that matter (a toggle, a saved period day, a wrong PIN).
 *
 * Android browsers have the Vibration API. iOS Safari does not, but toggling a native switch
 * gives the system's own tick, so a hidden one is toggled instead. Where neither exists nothing
 * happens. The device's own "vibration off" / "system haptics off" settings still apply.
 */
export type Haptic = 'light' | 'medium' | 'success' | 'warning';

const PATTERNS: Record<Haptic, number | number[]> = {
  light: 8,
  medium: 16,
  success: [10, 70, 14],
  warning: [22, 60, 22],
};

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function switchTick(): void {
  const label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  label.style.display = 'none';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  label.append(input);
  document.head.append(label);
  label.click();
  label.remove();
}

export function haptic(kind: Haptic = 'light'): void {
  try {
    if (typeof navigator === 'undefined') return;
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(PATTERNS[kind]);
    } else if (isIOS()) {
      switchTick();
      if (kind === 'success' || kind === 'warning') setTimeout(switchTick, 110);
    }
  } catch {
    // Not allowed here (no user gesture yet, or blocked): feedback is optional.
  }
}
