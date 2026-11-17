import { AlertCircle, Minus, Plus } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { strings } from '../i18n';
import { haptic } from './haptics';

/**
 * Form controls. Every one is a native input underneath (radio, checkbox, number),
 * so keyboard behaviour and screen-reader semantics come from the browser.
 */

export interface Option<T extends string | number> {
  value: T;
  label: string;
  hint?: string;
  icon?: ReactNode;
}

interface GroupProps {
  legend: string;
  /** Keep the legend for screen readers only (when a visible heading already names the group). */
  hideLegend?: boolean;
  hint?: string;
}

function Legend({ legend, hideLegend, hint }: GroupProps) {
  return (
    <>
      <legend className={hideLegend ? 'sr-only' : 'field-label'}>{legend}</legend>
      {hint && (
        <p className="field-hint" style={{ marginBottom: 'var(--s2)' }}>
          {hint}
        </p>
      )}
    </>
  );
}

/** One choice out of a few, as chips. Choosing the selected chip again clears it when `clearable`. */
export function ChoiceChips<T extends string | number>(
  props: GroupProps & {
    options: Option<T>[];
    value: T | undefined;
    onChange: (value: T | undefined) => void;
    clearable?: boolean;
  },
) {
  const name = useId();
  const { options, value, onChange, clearable } = props;
  return (
    <fieldset>
      <Legend {...props} />
      <div className="chips">
        {options.map((o) => (
          <label className="chip" key={o.value}>
            <input
              type="radio"
              name={name}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              onClick={() => {
                if (clearable && value === o.value) onChange(undefined);
              }}
            />
            <span className="chip-face">
              {o.icon}
              <span>{o.label}</span>
              {o.hint && <small>{o.hint}</small>}
            </span>
          </label>
        ))}
      </div>
      {clearable && value !== undefined && <ClearButton onClick={() => onChange(undefined)} />}
    </fieldset>
  );
}

/** Any number of choices, as chips. */
export function MultiChips<T extends string>(
  props: GroupProps & { options: Option<T>[]; values: readonly T[]; onToggle: (value: T, selected: boolean) => void },
) {
  const { options, values, onToggle } = props;
  return (
    <fieldset>
      <Legend {...props} />
      <div className="chips">
        {options.map((o) => (
          <label className="chip" key={o.value}>
            <input type="checkbox" checked={values.includes(o.value)} onChange={(e) => onToggle(o.value, e.target.checked)} />
            <span className="chip-face">
              {o.icon}
              <span>{o.label}</span>
              {o.hint && <small>{o.hint}</small>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Five-step scale with an icon per step (mood, energy). */
export function Scale<T extends number>(
  props: GroupProps & { options: Option<T>[]; value: T | undefined; onChange: (value: T | undefined) => void },
) {
  const name = useId();
  const { options, value, onChange } = props;
  return (
    <fieldset>
      <Legend {...props} />
      <div className="scale">
        {options.map((o) => (
          <label key={o.value}>
            <input
              type="radio"
              name={name}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              onClick={() => {
                if (value === o.value) onChange(undefined);
              }}
            />
            <span className="scale-face">
              {o.icon}
              <span>{o.label}</span>
            </span>
          </label>
        ))}
      </div>
      {value !== undefined && <ClearButton onClick={() => onChange(undefined)} />}
    </fieldset>
  );
}

/** A compact either/or switcher that always has a value. */
export function Segmented<T extends string | number>(
  props: GroupProps & { options: Option<T>[]; value: T; onChange: (value: T) => void; small?: boolean },
) {
  const name = useId();
  const { options, value, onChange, small } = props;
  return (
    <fieldset>
      <Legend {...props} />
      <div className={small ? 'segmented small' : 'segmented'}>
        {options.map((o) => (
          <label key={o.value}>
            <input type="radio" name={name} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span className="segmented-face">{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ClearButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="btn btn-quiet btn-small" style={{ marginTop: 'var(--s1)' }} onClick={onClick}>
      {strings().common.clearChoice}
    </button>
  );
}

export function Switch(props: { label: string; hint?: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  const hintId = useId();
  return (
    <label className="switch-row">
      <span className="grow">
        <span className="strong">{props.label}</span>
        {props.hint && (
          <span className="field-hint" id={hintId}>
            {props.hint}
          </span>
        )}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={props.checked}
        disabled={props.disabled}
        aria-describedby={props.hint ? hintId : undefined}
        onChange={(e) => {
          haptic('light');
          props.onChange(e.target.checked);
        }}
      />
      <span className="switch-track" aria-hidden="true" />
    </label>
  );
}

/** Whole number with − / + buttons. The input stays editable for keyboards and assistive tech. */
export function Stepper(props: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  hideLabel?: boolean;
}) {
  const id = useId();
  const { value, min, max, onChange } = props;
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n)));
  const s = strings().common;
  return (
    <div className="field">
      <label className={props.hideLabel ? 'sr-only' : 'field-label'} htmlFor={id}>
        {props.label}
      </label>
      {props.hint && (
        <p className="field-hint" id={`${id}-hint`}>
          {props.hint}
        </p>
      )}
      <div className="stepper">
        <button
          type="button"
          className="icon-btn outlined"
          aria-label={s.decrease}
          disabled={value <= min}
          onClick={() => onChange(clamp(value - 1))}
        >
          <Minus size={20} aria-hidden="true" />
        </button>
        <input
          id={id}
          className="input"
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          aria-describedby={props.hint ? `${id}-hint` : undefined}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (e.target.value !== '' && Number.isFinite(n) && n >= min && n <= max) onChange(clamp(n));
          }}
          onBlur={(e) => {
            const n = Number(e.target.value);
            e.target.value = String(Number.isFinite(n) && e.target.value !== '' ? clamp(n) : value);
            if (Number.isFinite(n) && e.target.value !== '') onChange(clamp(n));
          }}
        />
        <button
          type="button"
          className="icon-btn outlined"
          aria-label={s.increase}
          disabled={value >= max}
          onClick={() => onChange(clamp(value + 1))}
        >
          <Plus size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function ErrorText({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p className="field-error" id={id} role="alert">
      <AlertCircle size={18} aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
