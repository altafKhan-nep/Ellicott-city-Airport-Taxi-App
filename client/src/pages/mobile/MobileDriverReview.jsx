import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  ChevronDown,
  FileText,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { adminDrivers, adminVerifyDriver } from '../../services/adminService.js';
import { vehicleLabel } from '../../data/vehicles.js';
import { Card, ScreenTitle, StatusPill, ListSkeleton, EmptyState } from '../../components/mobile/MobileUI.jsx';

// Phones only. The admin's driver review queue: pending drivers, their vehicle
// and documents, with approve / reject. Rejection requires a note so the driver
// knows what to fix.

function DriverCard({ driver, onAction }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const d = driver.driverDetails || {};
  const docs = d.documents || [];

  const act = async (status) => {
    if (status === 'rejected' && !note.trim()) {
      setError('A note is required when rejecting.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await adminVerifyDriver(driver._id, { status, note: note.trim() });
      onAction(driver._id);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not update. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-[var(--m-card-pad)] text-left"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-gradient text-sm font-bold text-white">
          {driver.avatar ? (
            <img src={driver.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            driver.name?.[0] || 'D'
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold text-ink">{driver.name}</span>
          <span className="mt-0.5 block truncate text-xs text-muted">
            {vehicleLabel(d.vehicleType)}
            {d.plateNumber ? ` · ${d.plateNumber}` : ''}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-full bg-accent-100 px-2 py-1 text-[10px] font-bold text-ink">
            <FileText className="h-3 w-3" />
            {docs.length}
          </span>
          <ChevronDown className={`h-4 w-4 text-accent-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (
        <div className="border-t border-accent-100 px-[var(--m-card-pad)] pb-[var(--m-card-pad)] pt-3">
          {/* Documents */}
          <span className="t-label">Documents</span>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {docs.length === 0 && (
              <p className="col-span-3 text-sm text-muted">No documents uploaded.</p>
            )}
            {docs.map((doc) => (
              <div key={doc.kind} className="overflow-hidden rounded-[var(--m-radius-inner)] border border-accent-200">
                {doc.image ? (
                  <img src={doc.image} alt={doc.kind} className="h-20 w-full object-cover" />
                ) : (
                  <span className="grid h-20 w-full place-items-center bg-accent-50 text-muted">
                    <FileText className="h-5 w-5" />
                  </span>
                )}
                <span className="block bg-surface px-2 py-1.5 text-[10px] font-semibold capitalize text-ink">
                  {doc.kind}
                </span>
              </div>
            ))}
          </div>

          {/* License */}
          <div className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">License no.</span>
              <span className="font-semibold text-ink">{d.licenseNo || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Submitted</span>
              <span className="font-semibold text-ink">
                {d.verificationSubmittedAt
                  ? new Date(d.verificationSubmittedAt).toLocaleDateString()
                  : '—'}
              </span>
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-xl bg-signal-50 px-4 py-2.5 text-sm text-signal-700">{error}</p>
          )}

          {/* Reject note */}
          <label className="mt-4 block">
            <span className="t-label">Note (required to reject)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="What does the driver need to fix?"
              className="mt-1.5 w-full rounded-[var(--m-radius-inner)] border border-accent-200 bg-surface px-3.5 py-2.5 text-sm outline-none placeholder:text-accent-400 focus:border-brand-500"
            />
          </label>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => act('rejected')}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-signal-600 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Reject
            </button>
            <button
              type="button"
              onClick={() => act('verified')}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-brand-gradient py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              Approve
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function MobileDriverReview() {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    adminDrivers({ status: 'pending' })
      .then(({ data }) => setDrivers(data.drivers || []))
      .catch((e) => setError(e.response?.data?.message || 'Could not load the queue.'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = (id) => setDrivers((list) => list.filter((d) => d._id !== id));

  if (!user || user.role !== 'admin') {
    return (
      <div className="px-[var(--m-gutter)] pt-5">
        <ScreenTitle>Driver review</ScreenTitle>
        <EmptyState
          icon={ShieldCheck}
          title="Admins only"
          body="Sign in with an admin account to review driver applications."
        />
      </div>
    );
  }

  return (
    <div className="px-[var(--m-gutter)] pt-5">
      <ScreenTitle
        sub="Review driver applications and approve or reject them."
      >
        Driver review
      </ScreenTitle>

      {drivers === null ? (
        <ListSkeleton rows={3} />
      ) : error ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-signal-700">{error}</p>
          <button
            type="button"
            onClick={load}
            className="mt-4 rounded-full bg-brand-gradient px-6 py-3 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </Card>
      ) : drivers.length === 0 ? (
        <EmptyState
          icon={Check}
          title="All caught up"
          body="No drivers are waiting for review. New applications will appear here."
        />
      ) : (
        <>
          <div className="mb-3 flex items-center gap-2">
            <StatusPill tone="gold" pulse>
              {drivers.length} waiting
            </StatusPill>
          </div>
          <div className="space-y-2">
            {drivers.map((d) => (
              <DriverCard key={d._id} driver={d} onAction={remove} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
