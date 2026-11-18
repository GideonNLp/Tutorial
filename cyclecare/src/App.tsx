import { useEffect, type ReactNode } from 'react';
import { onUnexpectedError } from './app/errors';
import { startLifecycle } from './app/lifecycle';
import { warmUpHost } from './app/platform';
import { applyUpdate, registerServiceWorker, requestPersistentStorage, useUpdateReady } from './app/pwa';
import type { Route } from './app/router';
import { flush, initApp, usePrefs, useRole, useStatus, useStorageMode } from './app/store';
import { toast } from './app/ui';
import { strings } from './i18n';
import { CalendarScreen } from './screens/Calendar';
import { JournalScreen } from './screens/Journal';
import { BrokenVaultScreen, LockScreen } from './screens/Lock';
import { BrandMark, Onboarding } from './screens/Onboarding';
import { ProfileScreen } from './screens/Profile';
import { SettingsScreen } from './screens/Settings';
import { StatsScreen } from './screens/Stats';
import { TipsScreen } from './screens/Tips';
import { TodayScreen } from './screens/Today';
import { BackupSync } from './backup/BackupSync';
import { OwnerSync } from './partner/OwnerSync';
import { PartnerSync } from './partner/PartnerSync';
import { PARTNER_TABS, partnerRoutes } from './screens/PartnerScreens';
import { Navigator } from './ui/Navigator';
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
    case 'profil':
      return <ProfileScreen />;
    default:
      return <SettingsScreen route={route} />;
  }
}

export function App() {
  const status = useStatus();
  const storage = useStorageMode();
  const updateReady = useUpdateReady();
  const role = useRole();
  // Re-render everything when the language changes (strings are read at render time).
  const { locale } = usePrefs();

  useEffect(() => {
    if (started) return;
    started = true;
    // One calm message for whatever went wrong unexpectedly; screens that fail show their own.
    onUnexpectedError((source) => {
      if (source === 'render' || source === 'export') return;
      const e = strings().errors;
      toast(source === 'save' ? e.saveFailed : e.unexpected, { duration: 8000 });
    });
    if (__PREVIEW__) warmUpHost();
    registerServiceWorker(flush);
    void initApp();
    startLifecycle();
  }, []);

  // Once there is a journal on this device, ask the browser to keep it.
  useEffect(() => {
    if (status === 'ready' && storage === 'encrypted') void requestPersistentStorage();
  }, [status, storage]);

  useEffect(() => {
    if (!updateReady) return;
    const u = strings().settings.about.update;
    toast(u.ready, { action: { label: u.apply, run: applyUpdate }, duration: 15000 });
  }, [updateReady]);

  const s = strings();

  // Each state of the app is its own view; the key makes it fade in when it replaces another.
  if (status === 'loading') {
    return (
      <div className="app splash" role="status" key="loading">
        <BrandMark size={64} />
        <span className="sr-only">{s.common.loading}</span>
      </div>
    );
  }
  if (status === 'onboarding') {
    return (
      <div className="app no-tabbar view-enter" key={`onboarding-${locale}`}>
        <Onboarding />
        <Toaster />
      </div>
    );
  }
  if (status === 'locked' || status === 'broken') {
    return (
      <div className="app no-tabbar view-enter" key={`${status}-${locale}`}>
        <div className="stage">
          <div className="page" data-active="">
            {status === 'locked' ? <LockScreen /> : <BrokenVaultScreen />}
          </div>
        </div>
        <Toaster />
      </div>
    );
  }

  return (
    <div className="app with-tabbar view-enter" key={`ready-${locale}-${role}`}>
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
      {/* A partner's device shows the same app, read-only, built from what is shared with it. */}
      <Navigator render={role === 'partner' ? partnerRoutes : screenFor} />
      <TabBar tabs={role === 'partner' ? PARTNER_TABS : undefined} />
      {role === 'partner' ? (
        <PartnerSync />
      ) : (
        <>
          <OwnerSync />
          <BackupSync />
        </>
      )}
      <Toaster />
    </div>
  );
}
