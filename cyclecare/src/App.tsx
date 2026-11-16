import { Component, useEffect, type ReactNode } from 'react';
import { startLifecycle } from './app/lifecycle';
import { registerServiceWorker, warmUpHost } from './app/platform';
import { useRoute, type Route } from './app/router';
import { initApp, useStatus } from './app/store';
import { strings } from './i18n';
import { CalendarScreen } from './screens/Calendar';
import { JournalScreen } from './screens/Journal';
import { BrokenVaultScreen, LockScreen } from './screens/Lock';
import { Onboarding } from './screens/Onboarding';
import { SettingsScreen } from './screens/Settings';
import { StatsScreen } from './screens/Stats';
import { TipsScreen } from './screens/Tips';
import { TodayScreen } from './screens/Today';
import { TabBar, Toaster } from './ui/Shell';

let started = false;

function screenFor(route: Route): ReactNode {
  switch (route) {
    case 'azi':
      return <TodayScreen />;
    case 'calendar':
      return <CalendarScreen />;
    case 'jurnal':
      return <JournalScreen />;
    case 'sfaturi':
      return <TipsScreen />;
    case 'statistici':
      return <StatsScreen />;
    default:
      return <SettingsScreen route={route} />;
  }
}

export function App() {
  const status = useStatus();
  const route = useRoute();

  useEffect(() => {
    if (started) return;
    started = true;
    warmUpHost();
    registerServiceWorker();
    void initApp();
    startLifecycle();
  }, []);

  const s = strings();
  if (status === 'loading') {
    return (
      <div className="splash" role="status">
        <span className="sr-only">{s.common.loading}</span>
      </div>
    );
  }
  if (status === 'onboarding') {
    return (
      <div className="app no-tabbar">
        <Onboarding />
        <Toaster />
      </div>
    );
  }
  if (status === 'locked' || status === 'broken') {
    return <div className="app no-tabbar">{status === 'locked' ? <LockScreen /> : <BrokenVaultScreen />}</div>;
  }

  return (
    <div className="app with-tabbar">
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        {s.common.skipToContent}
      </a>
      <main id="main" tabIndex={-1}>
        <ErrorBoundary key={route}>{screenFor(route)}</ErrorBoundary>
      </main>
      <TabBar />
      <Toaster />
    </div>
  );
}

/** Keeps one broken screen from taking the whole app (and the tab bar) down with it. */
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: unknown) {
    console.error('CycleCare: screen failed to render', error);
  }
  override render() {
    if (!this.state.failed) return this.props.children;
    const e = strings().errors;
    return (
      <div className="screen stack">
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
