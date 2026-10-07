import { Link } from 'react-router-dom';
import { Phone } from 'lucide-react';
import NotificationsBell from '../layout/NotificationsBell.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { CONTACT_PHONE, CONTACT_PHONE_HREF } from '../../data/site.js';

// Phones only: a slim brand bar instead of the full desktop Navbar, which is
// 64px tall and wastes a third of a phone screen.
export default function MobileAppBar() {
  const { user } = useAuth();

  return (
    <header className="safe-top app-bar-blur sticky top-0 z-[1050] bg-brand-gradient shadow-sm">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          {/* The real logo mark on a white plate — the artwork is a dark car on a
              light ground, so it needs the plate to read against the blue band. */}
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white px-1">
            <img src="/images/logo-mark.png" alt="" aria-hidden="true" className="h-5 w-auto" />
          </span>
          <span className="truncate text-[15px] font-bold tracking-tight text-white">
            Ellicott City <span className="text-gold-300">Airport Taxi</span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-1">
          <a
            href={`tel:${CONTACT_PHONE_HREF}`}
            aria-label={`Call ${CONTACT_PHONE}`}
            className="grid h-9 w-9 place-items-center rounded-full text-white/90 transition-colors active:bg-white/15"
          >
            <Phone className="h-5 w-5" />
          </a>
          {user && <NotificationsBell />}
        </div>
      </div>
    </header>
  );
}
