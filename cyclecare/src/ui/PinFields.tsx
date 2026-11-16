import { useId } from 'react';
import { ErrorText } from './controls';

export const PIN_PATTERN = /^\d{4,8}$/;

/** Two masked numeric inputs for choosing a PIN. Validation messages are supplied by the caller. */
export function PinFields(props: {
  label: string;
  repeatLabel: string;
  pin: string;
  repeat: string;
  onPin: (value: string) => void;
  onRepeat: (value: string) => void;
  error?: string;
}) {
  const id = useId();
  const digits = (value: string) => value.replace(/\D/g, '').slice(0, 8);
  const common = {
    className: 'input input-short num',
    type: 'password',
    inputMode: 'numeric' as const,
    autoComplete: 'new-password',
    maxLength: 8,
    'aria-invalid': props.error ? true : undefined,
    'aria-describedby': props.error ? `${id}-error` : undefined,
  };
  return (
    <div className="stack stack-3">
      <div className="field">
        <label className="field-label" htmlFor={`${id}-pin`}>
          {props.label}
        </label>
        <input id={`${id}-pin`} {...common} value={props.pin} onChange={(e) => props.onPin(digits(e.target.value))} />
      </div>
      <div className="field">
        <label className="field-label" htmlFor={`${id}-repeat`}>
          {props.repeatLabel}
        </label>
        <input id={`${id}-repeat`} {...common} value={props.repeat} onChange={(e) => props.onRepeat(digits(e.target.value))} />
      </div>
      {props.error && <ErrorText id={`${id}-error`}>{props.error}</ErrorText>}
    </div>
  );
}
