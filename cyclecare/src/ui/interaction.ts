/**
 * Whether the person has pressed, tapped or typed anything yet.
 * Until then focus stays where the browser put it, so the skip link is the first tab stop after a page load.
 */
let interacted = false;

if (typeof window !== 'undefined') {
  const mark = () => {
    interacted = true;
  };
  window.addEventListener('pointerdown', mark, { capture: true, once: true });
  window.addEventListener('keydown', mark, { capture: true, once: true });
}

export const hasInteracted = (): boolean => interacted;
