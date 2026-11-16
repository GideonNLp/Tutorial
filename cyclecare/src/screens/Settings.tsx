import type { Route } from '../app/router';
import { ScreenHead } from '../ui/Shell';

export function SettingsScreen({ route }: { route: Route }) {
  return (
    <div className="screen">
      <ScreenHead title={route} back="azi" />
    </div>
  );
}
