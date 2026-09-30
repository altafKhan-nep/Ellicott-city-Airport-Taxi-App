import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Phone,
  Mail,
  Bell,
  Car,
  ShieldCheck,
  ChevronRight,
  LogOut,
  FileText,
  HelpCircle,
  LogIn,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { vehicleLabel } from '../../data/vehicles.js';
import { Card, ScreenTitle, ListRow, RowDivider, PrimaryButton } from '../../components/mobile/MobileUI.jsx';

const chevron = <ChevronRight className="h-4 w-4 shrink-0 text-accent-300" />;

export default function MobileProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

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
      <div className="px-4 pt-5">
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
            <Link to="/login">
              <PrimaryButton>Sign in</PrimaryButton>
            </Link>
            <Link to="/register">
              <PrimaryButton variant="quiet">Create an account</PrimaryButton>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 pt-5">
      <ScreenTitle>Profile</ScreenTitle>

      {/* Identity */}
      <Card tone="brand" className="flex items-center gap-3.5 p-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-white/20 text-lg font-bold">
          {user.avatar ? (
            <img src={user.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            user.name?.[0] || '?'
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold">{user.name}</span>
          <span className="mt-0.5 block truncate text-xs capitalize text-gold-300">{user.role}</span>
        </span>
        <Link
          to="/profile"
          aria-label="Edit profile"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15"
        >
          <User className="h-4 w-4" />
        </Link>
      </Card>

      {/* Account */}
      <Card className="mt-4 overflow-hidden">
        <ListRow to="/profile" icon={User} title="Edit profile" sub="Name, phone, avatar, password" right={chevron} />
        <RowDivider />
        <ListRow icon={Mail} title="Email" sub={user.email} />
        <RowDivider />
        <ListRow icon={Phone} title="Phone" sub={user.phone || 'Not set'} />
        <RowDivider />
        <ListRow to="/profile" icon={Bell} title="Notifications" sub="Push alerts" right={chevron} />
        {user.driverDetails?.vehicleType && (
          <>
            <RowDivider />
            <ListRow
              icon={Car}
              title="Your vehicle"
              sub={vehicleLabel(user.driverDetails.vehicleType)}
            />
          </>
        )}
      </Card>

      {/* Role dashboards */}
      {(user.role === 'driver' || user.role === 'admin') && (
        <Card className="mt-4 overflow-hidden">
          {user.role === 'driver' && (
            <>
              <ListRow to="/driver" icon={Car} title="Driver dashboard" sub="Accept and run rides" right={chevron} />
              <RowDivider />
            </>
          )}
          {user.role === 'admin' && (
            <ListRow
              to="/admin"
              icon={ShieldCheck}
              title="Admin dashboard"
              sub="Rides, drivers, users, finance"
              right={chevron}
            />
          )}
        </Card>
      )}

      {/* Company */}
      <Card className="mt-4 overflow-hidden">
        <ListRow to="/fleet" icon={Car} title="Our fleet" right={chevron} />
        <RowDivider />
        <ListRow to="/services" icon={FileText} title="Services" right={chevron} />
        <RowDivider />
        <ListRow to="/contact" icon={HelpCircle} title="Contact & help" right={chevron} />
      </Card>

      <button
        type="button"
        onClick={doSignOut}
        disabled={signingOut}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-surface py-3.5 text-sm font-bold text-signal-700 ring-1 ring-signal-200 active:bg-signal-50 disabled:opacity-50"
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
    </div>
  );
}
