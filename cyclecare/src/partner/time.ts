import { todayISO } from '../domain/dates';
import { formatDate, strings } from '../i18n';

/** "acum", "acum 5 minute", "azi, 14:05", "15 nov., 09:30". */
export function relativeTime(at: number, now = Date.now()): string {
  const p = strings().partnerMode;
  const minutes = Math.floor((now - at) / 60_000);
  if (minutes < 1) return p.justNow;
  if (minutes < 60) return p.minutesAgo(minutes);
  const date = new Date(at);
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const day = todayISO(date);
  return day === todayISO(new Date(now)) ? p.todayAt(time) : `${formatDate(day, 'dayMonth')}, ${time}`;
}
