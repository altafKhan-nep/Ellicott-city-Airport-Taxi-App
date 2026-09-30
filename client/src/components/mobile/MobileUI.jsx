/**
 * Shared UI primitives for the phone layout.
 *
 * Every mobile screen builds from these so surfaces, radii, shadows and type
 * stay identical across the app. Screens must not re-declare their own card
 * padding or radius ladder — that is what made the seven original files drift.
 */

import { Link } from 'react-router-dom';

/* ---- Surfaces ------------------------------------------------------------ */

export function Card({ as: Tag = 'section', tone = 'plain', className = '', children, ...rest }) {
  const tones = {
    plain: 'bg-surface border border-accent-200',
    brand: 'bg-brand-gradient text-white',
    quiet: 'bg-accent-50 border border-accent-200',
  };
  return (
    <Tag className={`r-card ${tones[tone]} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export function SectionTitle({ children, action }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <h2 className="t-label">{children}</h2>
      {action}
    </div>
  );
}

export function ScreenTitle({ children, sub }) {
  return (
    <div className="mb-4">
      <h1 className="t-title">{children}</h1>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
    </div>
  );
}

/* ---- Status -------------------------------------------------------------- */

const TONES = {
  live: 'bg-signal-50 text-signal-700',
  wait: 'bg-accent-100 text-accent-700',
  done: 'bg-success-50 text-success-700',
  brand: 'bg-brand-50 text-brand-700',
  gold: 'bg-gold-50 text-gold-700',
};

export function StatusPill({ tone = 'wait', pulse = false, children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${TONES[tone]}`}>
      {pulse && <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-current" />}
      {children}
    </span>
  );
}

/* ---- Controls ------------------------------------------------------------ */

/** Count stepper. Replaces the native <select> a form would use. */
export function Stepper({ value, min = 0, max = 99, onChange, label, format = (n) => n }) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  const btn =
    'grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface text-ink shadow-sm ring-1 ring-accent-200 transition-transform active:scale-90 disabled:opacity-35';
  return (
    <div className="flex items-center justify-between gap-3">
      {label && <span className="t-label">{label}</span>}
      <div className="flex items-center gap-3">
        <button type="button" onClick={dec} disabled={value <= min} aria-label={`One fewer ${label || 'item'}`} className={btn}>
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <path d="M5 9h10v2H5z" />
          </svg>
        </button>
        <span className="t-price min-w-6 text-center text-base font-bold text-ink">{format(value)}</span>
        <button type="button" onClick={inc} disabled={value >= max} aria-label={`One more ${label || 'item'}`} className={btn}>
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <path d="M9 5h2v4h4v2h-4v4H9v-4H5V9h4z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/** Full-width primary action. One per screen, at most. */
export function PrimaryButton({ children, className = '', variant = 'brand', ...rest }) {
  const variants = {
    brand: 'bg-brand-gradient text-white shadow-[var(--m-shadow-brand)]',
    quiet: 'bg-accent-100 text-ink',
    danger: 'bg-signal-600 text-white',
  };
  return (
    <button
      className={`w-full rounded-full py-4 text-[15px] font-bold transition-transform active:scale-[0.99] disabled:opacity-50 ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ---- List rows ----------------------------------------------------------- */

export function ListRow({ icon: Icon, title, sub, to, onClick, right, tone = '' }) {
  const inner = (
    <>
      {Icon && (
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${tone || 'bg-accent-100 text-ink'}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        {sub && <span className="mt-0.5 block truncate text-xs text-muted">{sub}</span>}
      </span>
      {right}
    </>
  );
  const cls = 'flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-accent-50';
  if (to) {
    return (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

/** Divider that matches the card radius system. */
export function RowDivider() {
  return <div className="h-px bg-accent-100" />;
}

/* ---- States -------------------------------------------------------------- */

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-accent-100 ${className}`} />;
}

export function ListSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i} className="flex items-center gap-3 p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <Card className="px-6 py-10 text-center">
      {Icon && (
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-700">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <h3 className="mt-4 text-base font-bold text-ink">{title}</h3>
      {body && <p className="mx-auto mt-1 max-w-64 text-sm leading-snug text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}
