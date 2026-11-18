import { describe, expect, it } from 'vitest';
import { depthOf, initialNav, nextNav, parentOf, settleNav, type NavState } from '../src/app/router';

/** Walks a list of routes, settling after each step like the UI does when an animation ends. */
function walk(start: NavState, ...routes: Parameters<typeof nextNav>[1][]): NavState {
  return routes.reduce((state, to, i) => settleNav(nextNav(state, to, i + 1)), start);
}

describe('navigation stack', () => {
  it('knows how deep each page is and where back leads without history', () => {
    expect(depthOf('calendar')).toBe(0);
    expect(depthOf('setari')).toBe(1);
    expect(depthOf('setari-date')).toBe(2);
    expect(depthOf('politica')).toBe(3);
    expect(parentOf('azi')).toBeUndefined();
    expect(parentOf('setari')).toBe('azi');
    expect(parentOf('setari-memento')).toBe('profil');
    expect(parentOf('politica')).toBe('setari-confidentialitate');
  });

  it('pushes deeper pages and keeps what is underneath mounted', () => {
    const a = nextNav(initialNav('azi'), 'setari', 1);
    expect(a.transition).toMatchObject({ from: 'azi', to: 'setari', kind: 'push' });
    expect(a.stack).toEqual(['azi', 'setari']);
    const b = nextNav(a, 'setari-date', 2);
    expect(b.transition?.kind).toBe('push');
    expect(b.stack).toEqual(['azi', 'setari', 'setari-date']);
    expect(settleNav(b).alive).toEqual(['azi', 'setari', 'setari-date']);
  });

  it('pops back to a page that is still underneath and unmounts the one that left', () => {
    const deep = walk(initialNav('azi'), 'setari', 'setari-confidentialitate', 'politica');
    const back = nextNav(deep, 'setari-confidentialitate', 9);
    expect(back.transition).toMatchObject({ from: 'politica', to: 'setari-confidentialitate', kind: 'pop' });
    // The page being left stays mounted while it slides away…
    expect(back.alive).toContain('politica');
    // …and is dropped once the animation has ended.
    expect(settleNav(back).alive).toEqual(['azi', 'setari', 'setari-confidentialitate']);
    expect(settleNav(back).stack).toEqual(['azi', 'setari', 'setari-confidentialitate']);
  });

  it('cross-fades between tabs and keeps visited tabs alive', () => {
    const a = nextNav(initialNav('azi'), 'calendar', 1);
    expect(a.transition?.kind).toBe('fade');
    expect(a.stack).toEqual(['calendar']);
    const b = walk(initialNav('azi'), 'calendar', 'statistici', 'azi');
    expect(b.alive).toEqual(['azi', 'calendar', 'statistici']);
    expect(b.stack).toEqual(['azi']);
  });

  it('leaving Settings through a tab drops the Settings pages', () => {
    const inSettings = walk(initialNav('jurnal'), 'setari', 'setari-date');
    const out = nextNav(inSettings, 'statistici', 5);
    expect(out.transition?.kind).toBe('fade');
    expect(settleNav(out).alive).toEqual(['jurnal', 'statistici']);
    // Returning to the tab the stack started from is a pop.
    expect(nextNav(inSettings, 'jurnal', 6).transition?.kind).toBe('pop');
  });

  it('a page opened from a link pops to its parent', () => {
    const linked = initialNav('setari-aspect');
    const back = nextNav(linked, 'setari', 1);
    expect(back.transition?.kind).toBe('pop');
    expect(settleNav(back).stack).toEqual(['setari']);
  });

  it('going where we already are changes nothing, even in the middle of a transition', () => {
    const moving = nextNav(initialNav('azi'), 'setari', 1);
    expect(nextNav(moving, 'setari', 2)).toBe(moving);
    expect(moving.transition).not.toBeNull();
  });

  it('a new navigation during a transition starts from the settled state', () => {
    const moving = nextNav(initialNav('azi'), 'setari', 1);
    const next = nextNav(moving, 'setari-ciclu', 2);
    expect(next.transition).toMatchObject({ from: 'setari', to: 'setari-ciclu', kind: 'push', id: 2 });
    expect(next.stack).toEqual(['azi', 'setari', 'setari-ciclu']);
  });

  it('can be told not to animate (the swipe gesture has already shown the page)', () => {
    const inSettings = walk(initialNav('azi'), 'setari');
    expect(nextNav(inSettings, 'azi', 3, 'none').transition?.kind).toBe('none');
  });
});

describe('profile route', () => {
  it('is pushed over a tab and pops back to it', () => {
    const open = nextNav(initialNav('calendar'), 'profil', 1);
    expect(open.transition?.kind).toBe('push');
    expect(open.stack).toEqual(['calendar', 'profil']);
    expect(nextNav(settleNav(open), 'calendar', 2).transition?.kind).toBe('pop');
    expect(parentOf('profil')).toBe('azi');
  });
});
