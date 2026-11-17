import { X } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useRoute } from '../app/router';
import { strings } from '../i18n';
import { haptic } from './haptics';
import { EASE_NAV, EASE_SPRING, prefersReducedMotion } from './motion';

const OPEN_MS = 380;
const CLOSE_MS = 280;
/** Dragged further than this share of its height, the sheet closes when released. */
const DISMISS_AT = 0.28;
/** …or when flicked down faster than this (px per ms). */
const FLICK = 0.55;

const isBottomSheet = (): boolean => typeof matchMedia !== 'function' || !matchMedia('(min-width: 40rem)').matches;

/**
 * Modal sheet built on the native <dialog>: the browser traps focus, makes the page behind inert
 * and reports Escape. On phones it rises from the bottom edge and can be dragged down to close
 * (by its header, or by its content once that is scrolled to the top); on wide screens it is a
 * centred dialog that fades in. While it closes it keeps showing what it showed when it was open.
 */
export function Sheet(props: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const { open, onClose } = props;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const running = useRef<Animation[]>([]);
  const titleId = useId();
  const route = useRoute();

  // The content stays rendered until the closing animation has ended.
  const [present, setPresent] = useState(open);
  if (open && !present) setPresent(true);
  const shown = useRef({ title: props.title, children: props.children });
  if (open) shown.current = { title: props.title, children: props.children };

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  /** Moves panel and scrim from wherever they are now to open (1) or closed (0). */
  const animateTo = (target: 0 | 1, options: { spring?: boolean } = {}): Promise<void> => {
    const panel = panelRef.current;
    const scrim = scrimRef.current;
    if (!panel || !scrim || typeof panel.animate !== 'function') return Promise.resolve();
    const style = getComputedStyle(panel);
    const matrix = new DOMMatrix(style.transform === 'none' ? undefined : style.transform);
    const from = { y: matrix.m42, scale: matrix.a, opacity: Number(style.opacity), scrim: Number(getComputedStyle(scrim).opacity) };
    running.current.forEach((a) => a.cancel());
    panel.style.transform = '';
    panel.style.opacity = '';
    scrim.style.opacity = '';

    const duration = prefersReducedMotion() ? 0 : target === 1 ? OPEN_MS : CLOSE_MS;
    const timing: KeyframeAnimationOptions = { duration, easing: options.spring ? EASE_SPRING : EASE_NAV, fill: 'both' };
    const panelFrames = isBottomSheet()
      ? [{ transform: `translate3d(0, ${from.y}px, 0)` }, { transform: `translate3d(0, ${target === 1 ? 0 : panel.offsetHeight}px, 0)` }]
      : [
          { opacity: from.opacity, transform: `scale(${from.scale})` },
          { opacity: target, transform: `scale(${target === 1 ? 1 : 0.96})` },
        ];
    running.current = [
      panel.animate(panelFrames, timing),
      scrim.animate([{ opacity: from.scrim }, { opacity: target }], { ...timing, easing: 'ease-out' }),
    ];
    return Promise.all(running.current.map((a) => a.finished)).then(
      () => undefined,
      () => undefined, // replaced by a newer animation
    );
  };

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const panel = panelRef.current;
    const scrim = scrimRef.current;
    if (!dialog || !panel || !scrim) return;
    let stale = false;
    if (open) {
      if (!dialog.open) {
        running.current.forEach((a) => a.cancel());
        running.current = [];
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
        // Start from the closed position: below the edge on phones, transparent on wide screens.
        if (isBottomSheet()) panel.style.transform = `translate3d(0, ${panel.offsetHeight}px, 0)`;
        else {
          panel.style.opacity = '0';
          panel.style.transform = 'scale(0.96)';
        }
        scrim.style.opacity = '0';
      }
      void animateTo(1);
    } else if (dialog.open) {
      void animateTo(0).then(() => {
        if (stale) return; // reopened in the meantime
        if (dialog.open) dialog.close();
        setPresent(false);
      });
    }
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // The page under the sheet went away (navigation, lock): the sheet goes with it, at once.
  useEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      running.current.forEach((a) => a.cancel());
      if (dialog?.open) dialog.close();
    };
  }, []);
  const openedOn = useRef(route);
  useEffect(() => {
    if (open && route !== openedOn.current) onCloseRef.current();
    if (!open) openedOn.current = route;
  }, [open, route]);

  // Keep the sheet above the on-screen keyboard: the visual viewport says how much of the screen it covers.
  useEffect(() => {
    const dialog = dialogRef.current;
    const viewport = window.visualViewport;
    if (!open || !dialog || !viewport) return;
    const update = () => {
      const covered = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      dialog.style.setProperty('--keyboard-inset', `${Math.round(covered)}px`);
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      dialog.style.removeProperty('--keyboard-inset');
    };
  }, [open]);

  // ---- Drag to dismiss ------------------------------------------------------------------------
  useEffect(() => {
    const panel = panelRef.current;
    const scrim = scrimRef.current;
    const body = bodyRef.current;
    if (!open || !panel || !scrim || !body) return;

    let drag: { y0: number; trail: Array<{ y: number; t: number }>; height: number; dy: number } | null = null;

    const begin = (y: number, t: number) => {
      running.current.forEach((a) => a.cancel());
      drag = { y0: y, trail: [{ y, t }], height: panel.offsetHeight || 1, dy: 0 };
      panel.setAttribute('data-dragging', '');
    };
    const move = (y: number, t: number) => {
      if (!drag) return;
      // Upwards the sheet resists instead of following.
      const raw = y - drag.y0;
      drag.dy = raw >= 0 ? raw : -Math.sqrt(-raw) * 2;
      drag.trail.push({ y, t });
      if (drag.trail.length > 8) drag.trail.shift();
      panel.style.transform = `translate3d(0, ${drag.dy}px, 0)`;
      scrim.style.opacity = String(1 - 0.7 * Math.min(1, Math.max(0, drag.dy) / drag.height));
    };
    const end = (t: number) => {
      if (!drag) return;
      const { dy, height, trail } = drag;
      drag = null;
      panel.removeAttribute('data-dragging');
      const recent = trail.filter((p) => t - p.t <= 100);
      const first = recent[0];
      const last = recent[recent.length - 1];
      const velocity = first && last && last.t > first.t ? (last.y - first.y) / (last.t - first.t) : 0;
      if (velocity > -0.1 && (dy > height * DISMISS_AT || velocity > FLICK)) {
        haptic('light');
        onCloseRef.current(); // the closing animation continues from where the finger left it
      } else {
        void animateTo(1, { spring: true });
      }
    };

    // By the header (and the grabber): any pointer, at once.
    const head = panel.querySelector<HTMLElement>('.sheet-head');
    let pointer: number | undefined;
    const onPointerDown = (e: PointerEvent) => {
      if (!isBottomSheet() || !e.isPrimary || (e.target instanceof Element && e.target.closest('button'))) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      pointer = e.pointerId;
      begin(e.clientY, e.timeStamp);
      head?.setPointerCapture?.(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerId === pointer) move(e.clientY, e.timeStamp);
    };
    const onPointerEnd = (e: PointerEvent) => {
      if (e.pointerId !== pointer) return;
      pointer = undefined;
      end(e.timeStamp);
    };
    head?.addEventListener('pointerdown', onPointerDown);
    head?.addEventListener('pointermove', onPointerMove);
    head?.addEventListener('pointerup', onPointerEnd);
    head?.addEventListener('pointercancel', onPointerEnd);

    // By the content: a finger pulling down while the content is already at its top.
    let touch: { x: number; y: number; dragging: boolean } | null = null;
    const onTouchStart = (e: TouchEvent) => {
      const first = e.touches[0];
      touch = e.touches.length === 1 && first && isBottomSheet() ? { x: first.clientX, y: first.clientY, dragging: false } : null;
    };
    const onTouchMove = (e: TouchEvent) => {
      const point = e.touches[0];
      if (!touch || !point) return;
      if (!touch.dragging) {
        const dy = point.clientY - touch.y;
        const dx = point.clientX - touch.x;
        if (dy < 8 || Math.abs(dx) > dy || body.scrollTop > 0) return;
        // Leave sliders, text being selected and sideways-scrolling tables alone.
        if (e.target instanceof Element && e.target.closest('input, textarea, select, .table-scroll')) return;
        touch.dragging = true;
        begin(point.clientY, e.timeStamp);
      }
      if (e.cancelable) e.preventDefault();
      move(point.clientY, e.timeStamp);
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (touch?.dragging) end(e.timeStamp);
      touch = null;
    };
    body.addEventListener('touchstart', onTouchStart, { passive: true });
    body.addEventListener('touchmove', onTouchMove, { passive: false });
    body.addEventListener('touchend', onTouchEnd);
    body.addEventListener('touchcancel', onTouchEnd);

    return () => {
      head?.removeEventListener('pointerdown', onPointerDown);
      head?.removeEventListener('pointermove', onPointerMove);
      head?.removeEventListener('pointerup', onPointerEnd);
      head?.removeEventListener('pointercancel', onPointerEnd);
      body.removeEventListener('touchstart', onTouchStart);
      body.removeEventListener('touchmove', onTouchMove);
      body.removeEventListener('touchend', onTouchEnd);
      body.removeEventListener('touchcancel', onTouchEnd);
      panel.removeAttribute('data-dragging');
    };
  }, [open, present]);

  return (
    <dialog
      ref={dialogRef}
      className="sheet"
      aria-labelledby={titleId}
      // Escape: close through the owner, so the sheet animates out like any other close.
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // Closed by the browser itself (for example Escape pressed twice): keep the owner in step.
      onClose={() => {
        if (open) onClose();
      }}
    >
      <div className="sheet-scrim" ref={scrimRef} onClick={onClose} />
      <div className="sheet-panel" ref={panelRef}>
        {present && (
          <>
            <div className="sheet-head">
              <span className="sheet-grabber" aria-hidden="true" />
              <h2 id={titleId}>{shown.current.title}</h2>
              <button type="button" className="icon-btn" aria-label={strings().common.close} onClick={onClose}>
                <X size={22} aria-hidden="true" />
              </button>
            </div>
            <div className="sheet-body" ref={bodyRef}>
              {shown.current.children}
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}

/** Confirmation step for actions that cannot be undone. (Browser confirm() is not shown in some hosts.) */
export function ConfirmSheet(props: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Sheet open={props.open} onClose={props.onCancel} title={props.title}>
      <p>{props.body}</p>
      <div className="sheet-actions">
        <button type="button" className="btn btn-secondary" onClick={props.onCancel}>
          {props.cancelLabel ?? strings().common.cancel}
        </button>
        <button
          type="button"
          className={props.danger ? 'btn btn-danger' : 'btn btn-primary'}
          onClick={() => {
            haptic(props.danger ? 'warning' : 'medium');
            props.onConfirm();
          }}
        >
          {props.confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}
