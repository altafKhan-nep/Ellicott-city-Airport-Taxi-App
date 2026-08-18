import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listRides } from '../../services/rideService.js';
import { vehicleLabel } from '../../data/vehicles.js';
import { Spinner } from '../../components/ui/Spinner.jsx';
import PaymentModal from '../../components/rides/PaymentModal.jsx';
import EditRideModal from '../../components/rides/EditRideModal.jsx';

const STATUS_STYLE = {
  pending: 'bg-accent-50 text-accent-700',
  accepted: 'bg-blue-50 text-blue-700',
  arriving: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-brand-50 text-brand-700',
  completed: 'bg-brand-50 text-brand-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

const PAY_STYLE = {
  paid: 'bg-green-50 text-green-700',
  cash: 'bg-gold-100 text-gold-700',
  refunded: 'bg-blue-50 text-blue-700',
  pending: 'bg-yellow-50 text-yellow-700',
};

export default function RideHistory() {
  const [rides, setRides] = useState(null);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = () =>
    listRides()
      .then(({ data }) => setRides(data.rides))
      .catch(() => setError('Could not load ride history'));

  useEffect(() => {
    load();
  }, []);

  if (error) return <p className="px-4 py-16 text-center text-muted">{error}</p>;
  if (!rides)
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner label="Loading rides…" />
      </div>
    );

  const patch = (id, fn) => setRides((prev) => prev.map((r) => (r._id === id ? fn(r) : r)));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Your rides</h1>
      <p className="mt-1 text-sm text-muted">Past and upcoming trips.</p>

      {rides.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-muted">No rides yet.</p>
          <Link
            to="/"
            className="mt-3 inline-block font-semibold text-brand-700 hover:underline"
          >
            Book your first ride
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {rides.map((r) => (
            <div
              key={r._id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${STATUS_STYLE[r.status]}`}>
                      {r.status.replace('_', ' ')}
                    </span>
                    {r.status === 'completed' && (
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${r.payment?.status === 'paid' && r.payment?.method === 'cash' ? PAY_STYLE.cash : PAY_STYLE[r.payment?.status] || PAY_STYLE.pending}`}>
                        {r.payment?.status === 'paid'
                          ? r.payment?.method === 'cash'
                            ? 'Cash'
                            : 'Paid'
                          : r.payment?.status === 'refunded'
                            ? 'Refunded'
                            : 'Unpaid'}
                      </span>
                    )}
                    <span className="text-xs text-muted">
                      {new Date(r.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-sm font-medium">{r.pickup.address}</p>
                  <p className="truncate text-sm text-muted">→ {r.dropoff.address}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="font-bold text-brand-700">
                    ${(r.status === 'completed' ? r.fare.final : r.fare.estimated || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted">{vehicleLabel(r.vehicleType)}</p>
                  <div className="flex gap-1.5">
                    {['pending', 'accepted', 'arriving', 'in_progress'].includes(r.status) && (
                      <Link
                        to={`/rides/track/${r._id}`}
                        className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                      >
                        Track
                      </Link>
                    )}
                    {r.status === 'pending' && (
                      <button
                        onClick={() => setEditing(r)}
                        className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"
                      >
                        Edit
                      </button>
                    )}
                    {r.status === 'completed' && r.payment?.status === 'pending' && (
                      <button
                        onClick={() => setPaying(r)}
                        className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                      >
                        Pay
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {paying && (
        <PaymentModal
          ride={paying}
          onClose={() => setPaying(null)}
          onPaid={(payment) => {
            patch(paying._id, (r) => ({
              ...r,
              payment: {
                ...r.payment,
                status: 'paid',
                method: payment.method,
                transactionId: payment.transactionId,
              },
            }));
          }}
        />
      )}

      {editing && (
        <EditRideModal
          ride={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => patch(editing._id, () => updated)}
        />
      )}
    </div>
  );
}
