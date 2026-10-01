import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Check,
  ChevronRight,
  Clock,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { useAuth } from '../../context/AuthContext.jsx';
import { updateProfile, setAvatar, changePassword, getDriverDetails } from '../../services/userService.js';
import { setAvailability } from '../../services/rideService.js';
import { vehicleLabel } from '../../data/vehicles.js';
import { Card, ScreenTitle, PrimaryButton } from '../../components/mobile/MobileUI.jsx';

const STATUS = {
  none: { label: 'Not submitted', tone: 'bg-accent-100 text-accent-700', icon: Clock },
  pending: { label: 'Awaiting review', tone: 'bg-gold-50 text-gold-700', icon: Clock },
  verified: { label: 'Verified', tone: 'bg-success-50 text-success-700', icon: Check },
  rejected: { label: 'Not approved', tone: 'bg-signal-50 text-signal-700', icon: X },
};

// Phones only. The driver profile: identity, vehicle, verification state, and
// the availability toggle. Shares the passenger's editing patterns but leads
// with the verification workflow, because that is what a driver checks first.
export default function MobileDriverProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [availBusy, setAvailBusy] = useState(false);
  const [availError, setAvailError] = useState('');
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwDone, setPwDone] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const load = () =>
    getDriverDetails()
      .then(({ data }) => setDetails(data.driver))
      .catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const verified = details?.verificationStatus === 'verified';
  const status = STATUS[details?.verificationStatus] || STATUS.none;
  const StatusIcon = status.icon;

  const pickAvatar = async () => {
    setAvatarBusy(true);
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
    } catch {
      /* cancelled */
    } finally {
      setAvatarBusy(false);
    }
  };

  const toggleAvailability = async () => {
    setAvailBusy(true);
    setAvailError('');
    try {
      await setAvailability(!user.driverDetails?.isAvailable);
      await load();
    } catch (e) {
      setAvailError(e.response?.data?.message || 'Could not update availability.');
    } finally {
      setAvailBusy(false);
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

  const doSignOut = async () => {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
      navigate('/');
    }
  };

  if (!user) {
    return (
      <div className="px-[var(--m-gutter)] pt-5">
        <ScreenTitle>Profile</ScreenTitle>
        <Card className="px-6 py-10 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-700">
            <LogOut className="h-6 w-6" />
          </span>
          <h3 className="mt-4 text-base font-bold text-ink">Sign in to your account</h3>
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
      <ScreenTitle>Driver profile</ScreenTitle>

      {/* Identity */}
      <Card tone="brand" className="flex flex-col items-center p-6 text-center">
        <button
          type="button"
          onClick={pickAvatar}
          disabled={avatarBusy}
          aria-label="Change profile photo"
          className="relative"
        >
          <span className="grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-white/20 text-3xl font-bold">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              user.name?.[0] || 'D'
            )}
          </span>
          <span className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-white text-brand-700 shadow-md">
            <Camera className="h-4 w-4" />
          </span>
        </button>
        <p className="mt-3 text-lg font-bold text-white">{user.name}</p>
        <p className="mt-0.5 text-xs capitalize text-gold-300">Driver</p>
      </Card>

      {/* Verification status — the first thing a driver checks */}
      <section className="mt-[var(--m-section)]">
        <h2 className="t-label mb-2 px-[var(--m-gutter)]">Verification</h2>
        <Card className="p-[var(--m-card-pad)]">
          <div className="flex items-center gap-3">
            <span className={`grid h-10 w-10 place-items-center rounded-full ${status.tone}`}>
              <StatusIcon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold text-ink">{status.label}</span>
              {details?.verificationNote && (
                <span className="mt-0.5 block text-xs text-signal-600">
                  {details.verificationNote}
                </span>
              )}
            </span>
          </div>

          {details && (
            <div className="mt-4 space-y-2 border-t border-accent-100 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Vehicle</span>
                <span className="font-semibold text-ink">
                  {vehicleLabel(details.vehicleType)}
                  {details.plateNumber ? ` · ${details.plateNumber}` : ''}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Documents</span>
                <span className="font-semibold text-ink">
                  {details.documents.length} uploaded
                </span>
              </div>
            </div>
          )}

          {!verified && (
            <div className="mt-4">
              <PrimaryButton
                variant={details?.verificationStatus === 'none' ? 'brand' : 'quiet'}
                onClick={() => navigate('/driver/onboarding')}
              >
                {details?.verificationStatus === 'none'
                  ? 'Submit vehicle & documents'
                  : 'View submission'}
              </PrimaryButton>
            </div>
          )}
        </Card>
      </section>

      {/* Availability — only meaningful once verified */}
      <section className="mt-[var(--m-section)]">
        <h2 className="t-label mb-2 px-[var(--m-gutter)]">Availability</h2>
        <Card className="flex items-center justify-between p-[var(--m-card-pad)]">
          <span className="flex items-center gap-3">
            <span
              className={`grid h-10 w-10 place-items-center rounded-full ${
                user.driverDetails?.isAvailable
                  ? 'bg-success-50 text-success-700'
                  : 'bg-accent-100 text-ink'
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  user.driverDetails?.isAvailable ? 'bg-success-500' : 'bg-accent-300'
                }`}
              />
            </span>
            <span>
              <span className="block text-[15px] font-semibold text-ink">
                {user.driverDetails?.isAvailable ? 'Online' : 'Offline'}
              </span>
              <span className="mt-0.5 block text-xs text-muted">
                {verified ? 'Accepting ride requests' : 'Verification required'}
              </span>
            </span>
          </span>
          <button
            type="button"
            onClick={toggleAvailability}
            disabled={!verified || availBusy}
            className={`relative h-8 w-14 rounded-full transition-colors ${
              user.driverDetails?.isAvailable ? 'bg-success-500' : 'bg-accent-200'
            } disabled:opacity-40`}
            aria-label="Toggle availability"
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${
                user.driverDetails?.isAvailable ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </Card>
        {availError && <p className="mt-2 text-xs text-signal-600">{availError}</p>}
      </section>

      {/* Account */}
      <section className="mt-[var(--m-section)]">
        <h2 className="t-label mb-2 px-[var(--m-gutter)]">Account</h2>
        <Card className="divide-y divide-accent-100">
          <div className="flex items-center gap-3 px-[var(--m-card-pad)] py-3.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-100 text-ink">
              <User className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="t-label">Name</span>
              <span className="mt-0.5 block truncate text-[15px] font-semibold text-ink">
                {user.name}
              </span>
            </span>
            <button
              type="button"
              onClick={async () => {
                const name = window.prompt('Full name', user.name);
                if (name && name.trim()) await updateProfile({ name: name.trim() });
              }}
              className="shrink-0 text-[13px] font-bold text-brand-700"
            >
              Edit
            </button>
          </div>
          <div className="flex items-center gap-3 px-[var(--m-card-pad)] py-3.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-100 text-ink">
              <Phone className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="t-label">Phone</span>
              <span className="mt-0.5 block truncate text-[15px] font-semibold text-ink">
                {user.phone || 'Not set'}
              </span>
            </span>
          </div>
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
              <p className="mt-3 rounded-xl bg-signal-50 px-4 py-2.5 text-sm text-signal-700">{pwError}</p>
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
