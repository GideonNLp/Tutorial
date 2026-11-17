import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { installGlobalErrorHandlers, reportError } from './app/errors';
import './app/pwa'; // listens for the install prompt, which fires early
import { ErrorBoundary } from './ui/ErrorBoundary';
import { installChoicePop } from './ui/pop';
import { installPressFeedback } from './ui/press';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/screens.css';
import './styles/motion.css';

installGlobalErrorHandlers();
installPressFeedback();
installChoicePop();

createRoot(document.getElementById('root')!, {
  // Errors reach the app's own reporter instead of the console.
  onUncaughtError: (error) => reportError('react', error),
  onCaughtError: () => undefined, // already reported by the boundary that caught it
  onRecoverableError: () => undefined,
}).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
