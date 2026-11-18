/**
 * Native feel on touch screens: a long press on the interface opens no browser menu (Copy, Open in new
 * tab, Save image...). Text fields, the recovery code and the privacy notice keep theirs, because there
 * the person does want to select and copy. A mouse keeps its right-click menu: only coarse pointers
 * (fingers) are affected. The stylesheet (base.css) takes care of selection and the iOS callout; this
 * covers Android, which shows its menu through the contextmenu event.
 */

/** What keeps the system menu: wherever text is typed, selected on purpose or copied. */
export const KEEPS_MENU = 'input, textarea, [contenteditable="true"], .selectable, .recovery-code';

export function allowsContextMenu(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(KEEPS_MENU) !== null;
}

let installed = false;

export function installNativeFeel(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  const touch = window.matchMedia?.('(pointer: coarse)');
  document.addEventListener('contextmenu', (event) => {
    if (touch?.matches && !allowsContextMenu(event.target)) event.preventDefault();
  });
}
