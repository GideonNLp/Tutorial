import { Component, type ReactNode } from 'react';
import { reportError } from '../app/errors';
import { strings } from '../i18n';

/**
 * Keeps a rendering failure contained: around a screen it leaves the tab bar usable,
 * around the whole app it replaces a blank page with a way to reload.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: unknown) {
    reportError('render', error);
  }
  override render() {
    if (!this.state.failed) return this.props.children;
    const e = strings().errors;
    return (
      <div className="screen stack error-screen" role="alert">
        <h1>{e.boundaryTitle}</h1>
        <p>{e.boundaryBody}</p>
        <div>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            {e.reload}
          </button>
        </div>
      </div>
    );
  }
}
