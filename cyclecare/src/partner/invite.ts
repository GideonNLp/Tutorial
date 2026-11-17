import { isPairingCode, normalizePairingCode } from './crypto';

/**
 * An invitation link ends in `#partener=K7Q2MX`. On first load the code is taken out of the
 * address (so it does not linger in the history) and kept for the first-run screen.
 */
let taken: string | undefined;
let read = false;

export function takeInviteCode(): string | undefined {
  if (read) return taken;
  read = true;
  try {
    const match = /^#partener=([A-Za-z0-9-]{6,8})$/.exec(window.location.hash);
    if (!match) return undefined;
    const code = normalizePairingCode(match[1]!);
    window.history.replaceState(null, '', '#azi');
    taken = isPairingCode(code) ? code : undefined;
  } catch {
    // no address bar here (sandboxed frame)
  }
  return taken;
}
