import { useEffect } from 'react';
import { currentPhase, type Timeline } from '../domain/prediction';
import type { Phase } from '../domain/types';
import { visiblePhase } from '../ui/summaries';
import { useData, useTimeline } from './store';

/**
 * The phase that tints the page background: the one the Today screen names. Nothing when there is no
 * phase to name (no cycle yet, estimates turned off, a period that is late), so the page stays neutral.
 */
export function phaseForTint(timeline: Timeline, showFertility: boolean): Phase | undefined {
  if (timeline.prediction.status === 'late') return undefined;
  return visiblePhase(currentPhase(timeline), showFertility);
}

/**
 * Puts the phase on <html> as data-phase, where depth.css picks it up. It is a component of its own,
 * drawing nothing, so a change of data redraws only this and not the pages under it.
 */
export function PhaseTint(): null {
  const timeline = useTimeline();
  const { showFertility } = useData().profile;
  const phase = phaseForTint(timeline, showFertility);
  useEffect(() => {
    const root = document.documentElement;
    if (phase) root.dataset.phase = phase;
    else delete root.dataset.phase;
    return () => {
      delete root.dataset.phase;
    };
  }, [phase]);
  return null;
}
