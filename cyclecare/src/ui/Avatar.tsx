import { UserRound } from 'lucide-react';
import { navigate } from '../app/router';
import { useUser } from '../app/store';
import { initials } from '../domain/user';
import type { UserProfile } from '../domain/types';
import { strings } from '../i18n';

/** The person's picture, or their initials, or a neutral figure. Decorative: whatever contains it names it. */
export function Avatar({ user, size }: { user: UserProfile | undefined; size: 'small' | 'large' }) {
  const className = `avatar avatar-${size}`;
  if (user?.photo) return <img className={className} src={user.photo} alt="" draggable={false} />;
  const letters = user?.nickname ? initials(user.nickname) : '';
  return (
    <span className={letters ? className : `${className} avatar-empty`} aria-hidden="true">
      {letters || <UserRound size={size === 'large' ? 44 : 20} />}
    </span>
  );
}

/** The small round picture in the top-right corner; opens the profile. */
export function ProfileButton() {
  const user = useUser();
  const p = strings().profile;
  return (
    <button type="button" className="avatar-btn" aria-label={p.open} onClick={() => navigate('profil')}>
      <Avatar user={user} size="small" />
    </button>
  );
}
