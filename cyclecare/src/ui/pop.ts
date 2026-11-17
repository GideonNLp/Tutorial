import { popChoice } from './motion';

/**
 * A choice that was just made pops: a chip, a point on a scale, a segment. One listener for the whole
 * document, so every present and future control of those kinds gets it. Only a choice being made
 * counts (a box ticked, a radio picked), not one cleared and not one that was there when the screen opened.
 */
const FACE = '.chip-face, .scale-face, .segmented-face';

let installed = false;

export function installChoicePop(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener(
    'change',
    (e) => {
      const input = e.target;
      if (!(input instanceof HTMLInputElement) || !input.checked) return;
      const face = input.closest('label')?.querySelector<HTMLElement>(FACE);
      if (face) popChoice(face);
    },
    { capture: true },
  );
}
