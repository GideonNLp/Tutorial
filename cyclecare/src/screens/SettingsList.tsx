import { Bell, ChevronRight, CircleDot, CircleHelp, Database, DatabaseBackup, Palette, ShieldCheck, Users, type LucideIcon } from 'lucide-react';
import { useId } from 'react';
import { navigate, type Route } from '../app/router';
import { strings } from '../i18n';

/** The sections of the settings: a list of links, shown on the profile screen. */
export function SettingsList() {
  const s = strings().settings;
  const headingId = useId();
  const rows: Array<{ route: Route; icon: LucideIcon; text: { title: string; hint: string } }> = [
    { route: 'setari-ciclu', icon: CircleDot, text: s.sections.cycle },
    { route: 'setari-memento', icon: Bell, text: s.sections.reminders },
    { route: 'setari-confidentialitate', icon: ShieldCheck, text: s.sections.privacy },
    { route: 'setari-date', icon: Database, text: s.sections.data },
    { route: 'setari-copie', icon: DatabaseBackup, text: s.sections.backup },
    { route: 'setari-partener', icon: Users, text: s.sections.partner },
    { route: 'setari-aspect', icon: Palette, text: s.sections.appearance },
    { route: 'setari-despre', icon: CircleHelp, text: s.sections.about },
  ];
  return (
    <section className="settings-group" aria-labelledby={headingId}>
      <h2 id={headingId}>{s.title}</h2>
      <ul className="list">
        {rows.map(({ route, icon: Icon, text }) => (
          <li key={route}>
            <a
              className="list-row"
              href={`#${route}`}
              onClick={(e) => {
                e.preventDefault();
                navigate(route);
              }}
            >
              <Icon size={22} aria-hidden="true" />
              <span className="grow">
                <span className="strong">{text.title}</span>
                <span className="caption">{text.hint}</span>
              </span>
              <ChevronRight size={20} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
