import { useId } from 'react';
import { ErrorText } from './controls';

export const PIN_PATTERN = /^\d{4,8}$/;

/** Which of the two inputs a validation message belongs to. */
export interface PinError {
  field: 'pin' | 'repeat';
  message: string;
}

/** Checks a new PIN and its repetition; returns what is wrong and where, or nothing. */
export function validateNewPin(pin: string, repeat: string, messages: { invalid: string; mismatch: string }): PinError | undefined {
  if (!PIN_PATTERN.test(pin)) return { field: 'pin', message: messages.invalid };
  if (pin !== repeat) return { field: 'repeat', message: messages.mismatch };
  return undefined;
}

/** Two masked numeric inputs for choosing a PIN. The message appears under the input it is about. */
export function PinFields(props: {
  label: string;
  repeatLabel: string;
  pin: string;
  repeat: string;
  onPin: (value: string) => void;
  onRepeat: (value: string) => void;
  error?: PinError;
}) {
  const id = useId();
  const digits = (value: string) => value.replace(/\D/g, '').slice(0, 8);
  const input = (field: PinError['field']) => {
    const wrong = props.error?.field === field;
    return {
      id: `${id}-${field}`,
      className: 'input input-short num',
      type: 'password',
      inputMode: 'numeric' as const,
      autoComplete: 'new-password',
      maxLength: 8,
      'aria-invalid': wrong ? true : undefined,
      'aria-describedby': wrong ? `${id}-error` : undefined,
    };
  };
  const message = (field: PinError['field']) =>
    props.error?.field === field ? <ErrorText id={`${id}-error`}>{props.error.message}</ErrorText> : null;
  return (
    <div className="stack stack-3">
      <div className="field">
        <label className="field-label" htmlFor={`${id}-pin`}>
          {props.label}
        </label>
        <input {...input('pin')} value={props.pin} onChange={(e) => props.onPin(digits(e.target.value))} />
        {message('pin')}
      </div>
      <div className="field">
        <label className="field-label" htmlFor={`${id}-repeat`}>
          {props.repeatLabel}
        </label>
        <input {...input('repeat')} value={props.repeat} onChange={(e) => props.onRepeat(digits(e.target.value))} />
        {message('repeat')}
      </div>
    </div>
  );
}
