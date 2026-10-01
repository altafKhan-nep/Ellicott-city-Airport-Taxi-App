import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Check,
  ChevronRight,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { useAuth } from '../../context/AuthContext.jsx';
import { updateProfile, setAvatar, changePassword } from '../../services/userService.js';
import { Card, ScreenTitle, PrimaryButton } from '../../components/mobile/MobileUI.jsx';

// Phones only. A native profile screen replacing the old list of links to the
// desktop /profile page, which rendered the site layout inside the app shell.

/** Inline-editable row. `renderEdit` is a render prop so the field can see the
    draft state — passing the input as children would evaluate it in the parent's
    scope, where draft/setDraft do not exist. */
function Editable({ label, value, icon: Icon, onSave, renderEdit, readOnly }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const start = () => {
    setDraft(value);
    setError('');
    setEditing(true);
  };
  const cancel = () => {
    setDraft(value);
    setError('');
    setEditing(false);
  };
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await onSave(draft);
      setEditing(false);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-[var(--m-card-pad)] py-3.5">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-100 text-ink">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="t-label">{label}</span>
          {editing ? (
            <span className="mt-1 block">{renderEdit({ draft, setDraft })}</span>
          ) : (
            <span className="mt-0.5 block truncate text-[15px] font-semibold text-ink">
              {value || <span className="font-normal text-muted">Not set</span>}
            </span>
          )}
        </span>
        {!readOnly &&
          (editing ? (
            <span className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={save}
                disabled={busy}
                aria-label="Save"
                className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-700 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={cancel}
                aria-label="Cancel"
                className="grid h-9 w-9 place-items-center rounded-full bg-accent-100 text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={start}
              aria-label={`Edit ${label}`}
              className="shrink-0 text-[13px] font-bold text-brand-700"
            >
              Edit
            </button>
          ))}
      </div>
      {editing && error && <p className="mt-2 text-xs text-signal-600">{error}</p>}
    </div>
  );
}

export default function MobileProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwDone, setPwDone] = useState(false);

  const doSignOut = async () => {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
      navigate('/');
    }
  };

  // Camera + gallery in one prompt. The plugin returns a data-URL, which is
  // exactly what POST /api/users/me/avatar expects.
  const pickAvatar = async () => {
    setAvatarBusy(true);
    setAvatarError('');
    try {
      const photo = await CapCamera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
        quality: 80,
        width: 512,
        height: 512,
        allowEditing: true,
      });
      if (photo.dataUrl) await setAvatar(photo.dataUrl);
    } catch (e) {
      if (e.message !== 'User cancelled photos app') {
        setAvatarError('Could not upload that photo. Try a different one.');
      }
    } finally {
      setAvatarBusy(false);
    }
  };

  const submitPassword = async () => {
    setPwBusy(true);
    setPwError('');
    setPwDone(false);
    try {
      await changePassword(pw);
      setPwDone(true);
      setPw({ currentPassword: '', newPassword: '' });
      window.setTimeout(() => setPwOpen(false), 1200);
    } catch (e) {
      setPwError(e.response?.data?.message || 'Could not change password.');
    } finally {
      setPwBusy(false);
    }
  };

  if (!user) {
    return (
      <div className="px-[var(--m-gutter)] pt-5">
        <ScreenTitle>Profile</ScreenTitle>
        <Card className="px-6 py-10 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-700">
            <LogIn className="h-6 w-6" />
          </span>
          <h3 className="mt-4 text-base font-bold text-ink">Sign in to your account</h3>
          <p className="mx-auto mt-1 max-w-64 text-sm leading-snug text-muted">
            Manage your details, save trips and pay without re-entering anything.
          </p>
          <div className="mt-5 space-y-2">
            <PrimaryButton onClick={() => navigate('/login')}>Sign in</PrimaryButton>
            <PrimaryButton variant="quiet" onClick={() => navigate('/register')}>
              Create an account
            </PrimaryButton>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-[var(--m-gutter)] pt-5">
      <ScreenTitle>Profile</ScreenTitle>

      {/* Identity — the avatar is the one control on the screen that changes how
          the account looks everywhere, so it gets the hero treatment. */}
      <Card tone="brand" className="flex flex-col items-center p-6 text-center">
        <button
          type="button"
          onClick={pickAvatar}
          disabled={avatarBusy}
          aria-label="Change profile photo"
          className="group relative"
        >
          <span className="grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-white/20 text-3xl font-bold">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              user.name?.[0] || '?'
            )}
          </span>
          <span className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-white text-brand-700 shadow-md">
            <Camera className="h-4 w-4" />
          </span>
        </button>
        <p className="mt-3 text-lg font-bold text-white">{user.name}</p>
        <p className="mt-0.5 text-xs capitalize text-gold-300">{user.role}</p>
        {avatarBusy && <p className="mt-2 text-xs text-white/70">Uploading…</p>}
        {avatarError && <p className="mt-2 text-xs text-signal-200">{avatarError}</p>}
      </Card>

      {/* Account */}
      <section className="mt-[var(--m-section)]">
        <h2 className="t-label mb-2 px-[var(--m-gutter)]">Account</h2>
        <Card className="divide-y divide-accent-100">
          <Editable
            label="Full name"
            value={user.name}
            icon={User}
            onSave={(v) => updateProfile({ name: v })}
            renderEdit={({ draft, setDraft }) => (
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="input-pill w-full border border-accent-200 bg-surface px-3.5 py-2.5 text-[15px] outline-none focus:border-brand-500"
              />
            )}
          />
          <Editable
            label="Phone"
            value={user.phone || ''}
            icon={Phone}
            onSave={(v) => updateProfile({ phone: v })}
            renderEdit={({ draft, setDraft }) => (
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                type="tel"
                className="input-pill w-full border border-accent-200 bg-surface px-3.5 py-2.5 text-[15px] outline-none focus:border-brand-500"
              />
            )}
          />
          <div className="flex items-center gap-3 px-[var(--m-card-pad)] py-3.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-100 text-ink">
              <Mail className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="t-label">Email</span>
              <span className="mt-0.5 block truncate text-[15px] font-semibold text-ink">
                {user.email}
              </span>
            </span>
            {!user.emailVerified && (
              <span className="shrink-0 rounded-full bg-gold-50 px-2 py-0.5 text-[10px] font-bold text-gold-700">
                Unverified
              </span>
            )}
          </div>
        </Card>
      </section>

      {/* Security */}
      <section className="mt-[var(--m-section)]">
        <h2 className="t-label mb-2 px-[var(--m-gutter)]">Security</h2>
        <Card className="divide-y divide-accent-100">
          <button
            type="button"
            onClick={() => setPwOpen(true)}
            className="flex w-full items-center gap-3 px-[var(--m-card-pad)] py-3.5 text-left active:bg-accent-50"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-100 text-ink">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-ink">Change password</span>
              <span className="mt-0.5 block text-xs text-muted">Keep your account secure</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-accent-300" />
          </button>
        </Card>
      </section>

      <button
        type="button"
        onClick={doSignOut}
        disabled={signingOut}
        className="mt-[var(--m-section)] flex w-full items-center justify-center gap-2 rounded-full bg-surface py-4 text-sm font-bold text-signal-700 shadow-[var(--m-shadow-card)] active:bg-signal-50 disabled:opacity-50"
      >
        <LogOut className="h-4 w-4" />
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>

      <p className="mt-5 text-center text-[11px] leading-relaxed text-muted">
        Ellicott City Airport Taxi
        <br />
        <a href="tel:4103655556" className="t-price font-semibold text-brand-700">
          (410) 365-5556
        </a>
      </p>

      {/* Change-password sheet */}
      {pwOpen && (
        <div
          className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/40"
          onClick={() => setPwOpen(false)}
        >
          <div
            className="safe-bottom w-full rounded-t-3xl bg-surface p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">Change password</h3>
              <button
                type="button"
                onClick={() => setPwOpen(false)}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full bg-accent-100 text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="password"
                value={pw.currentPassword}
                onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
                placeholder="Current password"
                autoComplete="current-password"
                className="input-pill w-full border border-accent-200 bg-surface px-4 py-3.5 text-[15px] outline-none focus:border-brand-500"
              />
              <input
                type="password"
                value={pw.newPassword}
                onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
                placeholder="New password (min 6 characters)"
                autoComplete="new-password"
                className="input-pill w-full border border-accent-200 bg-surface px-4 py-3.5 text-[15px] outline-none focus:border-brand-500"
              />
            </div>

            {pwError && (
              <p className="mt-3 rounded-xl bg-signal-50 px-4 py-2.5 text-sm text-signal-700">
                {pwError}
              </p>
            )}
            {pwDone && (
              <p className="mt-3 rounded-xl bg-success-50 px-4 py-2.5 text-sm text-success-700">
                Password updated.
              </p>
            )}

            <PrimaryButton
              onClick={submitPassword}
              disabled={pwBusy || !pw.currentPassword || pw.newPassword.length < 6}
              className="mt-4"
            >
              {pwBusy ? 'Updating…' : 'Update password'}
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
}
