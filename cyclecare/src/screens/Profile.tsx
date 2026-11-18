import { Camera, ShieldCheck } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { preparePhoto, type PhotoError } from '../app/photo';
import { setUser, useData } from '../app/store';
import { toast } from '../app/ui';
import { NICKNAME_MAX } from '../domain/types';
import { normalizeNickname } from '../domain/user';
import { strings } from '../i18n';
import { Avatar } from '../ui/Avatar';
import { ErrorText } from '../ui/controls';
import { haptic } from '../ui/haptics';
import { Notice, Screen } from '../ui/Shell';
import { SettingsList } from './SettingsList';

/** Name and picture. Both optional, both kept encrypted on this device with the journal. */
export function ProfileScreen() {
  const s = strings();
  const p = s.profile;
  const { user } = useData();
  const nameId = useId();
  const fileId = useId();
  const [name, setName] = useState(user.nickname ?? '');
  const [nameError, setNameError] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<PhotoError | undefined>(undefined);
  const editing = useRef(false);

  // Follow changes made elsewhere (a restored backup) unless the person is typing.
  useEffect(() => {
    if (!editing.current) setName(user.nickname ?? '');
  }, [user.nickname]);

  const normalized = normalizeNickname(name);
  const changed = !normalized.ok || normalized.value !== user.nickname;

  const saveName = () => {
    const result = normalizeNickname(name);
    if (!result.ok) {
      setNameError(true);
      haptic('warning');
      return;
    }
    setUser({ nickname: result.value });
    setName(result.value ?? '');
    haptic('success');
    toast(result.value ? p.saved : p.nameRemoved);
  };

  const choosePhoto = async (file: File | undefined) => {
    setPhotoError(undefined);
    if (!file) return;
    setPhotoBusy(true);
    const result = await preparePhoto(file);
    setPhotoBusy(false);
    if (!result.ok) {
      setPhotoError(result.error);
      haptic('warning');
      return;
    }
    setUser({ photo: result.dataUrl });
    haptic('success');
    toast(p.photoSaved);
  };

  const removePhoto = () => {
    const before = user.photo;
    setUser({ photo: undefined });
    toast(p.photoRemoved, { action: { label: s.common.undo, run: () => setUser({ photo: before }) } });
  };

  return (
    <Screen title={p.title} back>
      <div className="stack stack-6">
        <section className="profile-head" aria-label={p.photoTitle}>
          <Avatar user={user} size="large" />
          <p className="profile-name">{user.nickname ?? p.noName}</p>
          <div className="row profile-photo-actions">
            <label className="btn btn-secondary btn-small" htmlFor={fileId} aria-disabled={photoBusy || undefined}>
              <Camera size={16} aria-hidden="true" />
              {user.photo ? p.photoChange : p.photoAdd}
            </label>
            <input
              id={fileId}
              className="sr-only"
              type="file"
              accept="image/*"
              disabled={photoBusy}
              aria-describedby={photoError ? `${fileId}-error` : undefined}
              onChange={(e) => {
                void choosePhoto(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            {user.photo && (
              <button type="button" className="btn btn-quiet btn-small" onClick={removePhoto}>
                {p.photoRemove}
              </button>
            )}
          </div>
          {photoBusy && (
            <p className="caption" role="status">
              {p.photoWorking}
            </p>
          )}
          {photoError && <ErrorText id={`${fileId}-error`}>{p.photoErrors[photoError]}</ErrorText>}
        </section>

        <form
          className="card card-flat tight stack stack-3"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            saveName();
          }}
        >
          <div className="field">
            <label className="field-label" htmlFor={nameId}>
              {p.nameLabel}
            </label>
            <p className="field-hint" id={`${nameId}-hint`}>
              {p.nameHint}
            </p>
            <input
              id={nameId}
              className="input"
              value={name}
              maxLength={NICKNAME_MAX}
              autoComplete="nickname"
              autoCapitalize="words"
              enterKeyHint="done"
              placeholder={p.namePlaceholder}
              aria-invalid={nameError || undefined}
              aria-describedby={`${nameId}-hint${nameError ? ` ${nameId}-error` : ''}`}
              onFocus={() => (editing.current = true)}
              onBlur={() => (editing.current = false)}
              onChange={(e) => {
                setName(e.target.value);
                setNameError(false);
              }}
            />
            {nameError && <ErrorText id={`${nameId}-error`}>{p.nameInvalid}</ErrorText>}
          </div>
          <div>
            <button type="submit" className="btn btn-primary btn-small" disabled={!changed}>
              {p.save}
            </button>
          </div>
        </form>

        <SettingsList />

        <Notice icon={<ShieldCheck size={20} aria-hidden="true" />}>
          <p>{p.privacy}</p>
        </Notice>
      </div>
    </Screen>
  );
}
