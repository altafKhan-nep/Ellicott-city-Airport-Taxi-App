import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, ReceiptText, User, Car } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

const ico = (on) =>
  `h-[22px] w-[22px] transition-transform duration-200 ${on ? 'scale-110' : ''}`;

function Tab({ to, label, children }) {
  return (
    <NavLink to={to} aria-label={label} className="flex flex-1 flex-col items-center gap-1 py-1.5">
      {({ isActive }) => (
        <>
          <span
            className={`grid h-7 w-12 place-items-center rounded-full transition-colors duration-200 ${
              isActive ? 'bg-brand-50' : ''
            }`}
          >
            {children(isActive)}
          </span>
          <span
            className={`text-[10px] font-bold tracking-wide transition-colors duration-200 ${
              isActive ? 'text-brand-700' : 'text-muted'
            }`}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}

// Phones only. `md:` and up keeps the desktop Navbar, so this never renders on
// a tablet/desktop viewport.
export default function MobileTabBar() {
  const { user } = useAuth();
  const ref = useRef(null);

  // Publish our real height so the sticky booking CTA can sit on top of us.
  // The height varies with the device safe-area inset, so it is measured rather
  // than hardcoded (it was 68px, not the 60px originally assumed — an 8px
  // overlap that hid part of the button).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const publish = () =>
      document.documentElement.style.setProperty('--tabbar-h', `${el.offsetHeight}px`);
    publish();
    const ro = new window.ResizeObserver(publish);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <nav
      ref={ref}
      aria-label="Primary"
      className="safe-bottom fixed inset-x-0 bottom-0 z-[1050] border-t border-accent-200 bg-surface/95 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-md items-stretch px-1.5">
        <Tab to="/" label="Home">
          {(on) => <Home className={ico(on)} strokeWidth={on ? 2.4 : 1.9} />}
        </Tab>

        <Tab to={user ? '/rides/history' : '/login'} label="Trips">
          {(on) => <ReceiptText className={ico(on)} strokeWidth={on ? 2.4 : 1.9} />}
        </Tab>

        {/* Raised centre action — the one thing a rider opens the app to do. */}
        <div className="flex flex-1 items-start justify-center">
          <NavLink
            to="/reservations"
            aria-label="Book a ride"
            className="-mt-5 grid h-14 w-14 place-items-center rounded-full bg-brand-gradient text-white shadow-[var(--m-shadow-brand)] ring-4 ring-surface transition-transform duration-200 active:scale-90"
          >
            <Car className="h-6 w-6" strokeWidth={2.2} />
          </NavLink>
        </div>

        <Tab to={user ? '/profile' : '/login'} label="Profile">
          {(on) => <User className={ico(on)} strokeWidth={on ? 2.4 : 1.9} />}
        </Tab>
      </div>
    </nav>
  );
}
